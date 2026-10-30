const { QueueEvents, Job } = require('bullmq');
const connection = require('../config/redis');
const stepQueue = require('../queues/stepQueue');
const WorkflowExecution = require('../models/WorkflowExecution');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const eventStore = require('./eventStore');
const { getEntryNode, getNextNode } = require('./dagUtils');
const { getIO } = require('../sockets');


/**
 * This module runs in the API process (required once from index.js),
 * NOT in the worker process. That split matters:
 *
 *   worker.js  -- dumb executor. Knows Factory/Strategy. Does not know
 *                 the DAG, does not decide what runs next.
 *   index.js   -- owns orchestration. Listens for job completion via
 *                 QueueEvents (Redis pub/sub, works across processes),
 *                 and reacts by writing events + deciding + queuing
 *                 the next node.
 *
 * "Workers execute one workflow node at a time. After each node: store
 * event, update execution state, queue next node" (spec) -- that
 * storing/updating/queuing is what this file does, driven by the
 * worker's completions rather than doing any of it itself.
 */

const queueEvents = new QueueEvents('step-execution', { connection });

class RuntimeEngine {
  async startExecution(workflowDefinitionId, userId) {
    const definition = await WorkflowDefinition.findOne({ _id: workflowDefinitionId, userId });
    if (!definition) {
      throw new Error('Workflow definition not found');
    }

    const entryNode = getEntryNode(definition.nodes, definition.edges);
    if (!entryNode) {
      throw new Error('Workflow has no entry node (every node has an incoming edge)');
    }

    const execution = await WorkflowExecution.create({
      workflowDefinitionId,
      userId,
      status: 'RUNNING',
      currentNodeId: entryNode.id,
      startedAt: new Date(),
    });

    await eventStore.append(execution._id, 'WorkflowStarted', { workflowDefinitionId: workflowDefinitionId.toString() });
    getIO().to(execution._id.toString()).emit('execution:started', { executionId: execution._id, entryNodeId: entryNode.id });
    await this.queueNode(execution._id, userId, entryNode);

    return execution;
  }

  async queueNode(executionId, userId, node, upstreamOutput = null) {
    await eventStore.append(executionId, 'NodeQueued', { nodeType: node.data.nodeType }, node.id);

    // upstreamOutput carries the immediately-preceding node's result
    // forward -- e.g. the AI Task node's analysis needs to reach the
    // PDF node, and the PDF needs to reach the Email node. Only the
    // immediately-preceding node's output, not the full history of
    // every earlier node: this matches dagUtils' own "linear chains
    // only" scope. A node that doesn't need it just ignores the key.
    //
    // userId travels in job.data too, not just executionId/nodeId --
    // AITaskStrategy/GithubStrategy need it to scope their Credential
    // lookups to the right user. The worker never queries
    // WorkflowExecution to find this out; it's handed everything it
    // needs up front, keeping the worker fully decoupled from the
    // execution/definition collections.
    await stepQueue.add(
      'execute-node',
      {
        executionId: executionId.toString(),
        userId: userId.toString(),
        nodeId: node.id,
        nodeType: node.data.nodeType,
        input: { ...(node.data.values || {}), upstreamOutput },
      },
      {
        jobId: `${executionId}_${node.id}`,
        // Automatic retry for transient failures (a flaky API call, a
        // momentary rate limit -- confirmed directly this phase that
        // unauthenticated GitHub calls DO hit rate limits in practice).
        // Verified in Phase 6: QueueEvents' 'failed' only fires once,
        // after all attempts are exhausted, not per intermediate
        // attempt -- so handleNodeFailed below only ever sees
        // genuinely final failures.
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      }
    );
  }

  /**
   * Re-queues a node OUTSIDE the normal forward-progression jobId
   * scheme -- used by both retryExecution and replayNode below, since
   * re-adding a job under a jobId that already exists (e.g. the
   * original failed attempt) silently no-ops in BullMQ: no error, but
   * nothing happens either (verified directly). A fresh, timestamped
   * jobId sidesteps that entirely.
   */
  async requeueNode(executionId, userId, node, { isReplay = false, upstreamOutput = null } = {}) {
    const jobId = `${executionId}_${node.id}_${isReplay ? 'replay' : 'retry'}_${Date.now()}`;
    await stepQueue.add(
      'execute-node',
      {
        executionId: executionId.toString(),
        userId: userId.toString(),
        nodeId: node.id,
        nodeType: node.data.nodeType,
        input: { ...(node.data.values || {}), upstreamOutput },
        isReplay,
      },
      { jobId, attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
    );
  }

  async handleNodeCompleted(jobId, result) {
    const job = await Job.fromId(stepQueue, jobId);
    if (!job) return; // job data already cleaned up -- nothing to correlate against
    const { executionId, nodeId, isReplay } = job.data;

    if (isReplay) {
      // Isolated node replay: appends a fresh event, never touches the chain.
      await eventStore.append(executionId, 'NodeCompleted', result, nodeId);
      console.log(`[RuntimeEngine] Execution ${executionId}: node ${nodeId} replayed (isolated, chain unaffected).`);
      getIO().to(executionId).emit('node:completed', { executionId, nodeId, result, isReplay: true });
      return;
    }

    // Idempotent: a second API instance or Replay may have recorded this already.
    const recorded = await eventStore.appendOnce(executionId, 'NodeCompleted', result, nodeId);
    if (recorded) getIO().to(executionId).emit('node:completed', { executionId, nodeId, result });

    await this.advanceFrom(executionId, nodeId, result);
  }

  /**
   * Moves the chain forward once nodeId's completion is on record. Each step
   * is an atomic "claim" (the update only matches while the execution is still
   * RUNNING on nodeId), so concurrent handlers can't both advance it.
   */
  async advanceFrom(executionId, nodeId, result) {
    const execution = await WorkflowExecution.findById(executionId).populate('workflowDefinitionId');
    if (!execution || execution.status !== 'RUNNING' || execution.currentNodeId !== nodeId) return;

    const definition = execution.workflowDefinitionId;
    const nextNode = getNextNode(definition.nodes, definition.edges, nodeId);
    const claim = { _id: executionId, status: 'RUNNING', currentNodeId: nodeId };

    if (!nextNode) {
      const finished = await WorkflowExecution.findOneAndUpdate(claim, {
        status: 'COMPLETED',
        completedAt: new Date(),
        currentNodeId: null,
      });
      if (!finished) return; // another handler already completed it
      await eventStore.append(executionId, 'WorkflowCompleted', {});
      getIO().to(executionId).emit('execution:completed', { executionId });
      console.log(`[RuntimeEngine] Execution ${executionId} completed.`);
      return;
    }

    const claimed = await WorkflowExecution.findOneAndUpdate(claim, { currentNodeId: nextNode.id });
    if (!claimed) return; // another handler already advanced it
    await this.queueNode(executionId, execution.userId, nextNode, result);
  }


  async handleNodeFailed(jobId, reason) {
    const job = await Job.fromId(stepQueue, jobId);
    if (!job) return;
    const { executionId, nodeId, isReplay } = job.data;

    await eventStore.append(executionId, 'NodeFailed', { reason }, nodeId);

    if (isReplay) {
      // Same isolation principle as the completed path: a failed
      // replay attempt doesn't fail the whole execution, since the
      // execution wasn't actually depending on this attempt to
      // proceed. It's already sitting in whatever state it was in.
      console.log(`[RuntimeEngine] Execution ${executionId}: replay of node ${nodeId} failed: ${reason}`);
      getIO().to(executionId).emit('node:failed', { executionId, nodeId, reason, isReplay: true });
      return;
    }

    await WorkflowExecution.findByIdAndUpdate(executionId, { status: 'FAILED' });
    await eventStore.append(executionId, 'WorkflowFailed', { failedNodeId: nodeId, reason });
    getIO().to(executionId).emit('node:failed', { executionId, nodeId, reason });
    getIO().to(executionId).emit('execution:failed', { executionId, failedNodeId: nodeId, reason });

    console.log(`[RuntimeEngine] Execution ${executionId} failed at node ${nodeId}: ${reason}`);
  }


  /**
   * Manual retry (POST /executions/:id/retry): only valid for an
   * execution that's actually FAILED. Re-queues the SAME node that
   * failed and resumes normal forward progression from there on
   * success -- this is execution-level recovery, distinct from
   * replayNode's isolated re-run of an arbitrary already-completed node.
   */
  async retryExecution(executionId, userId) {
    const execution = await WorkflowExecution.findOne({ _id: executionId, userId }).populate('workflowDefinitionId');
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'FAILED') {
      throw new Error(`Cannot retry an execution with status "${execution.status}" -- only FAILED executions can be retried`);
    }

    const definition = execution.workflowDefinitionId;
    const node = definition.nodes.find((n) => n.id === execution.currentNodeId);
    if (!node) throw new Error(`Node ${execution.currentNodeId} no longer exists in this workflow's definition`);

    execution.status = 'RUNNING';
    await execution.save();
    await eventStore.append(executionId, 'NodeQueued', { nodeType: node.data.nodeType, retry: true }, node.id);
    await this.requeueNode(executionId, userId, node, { isReplay: false });

    return execution;
  }

  /**
   * Node Replay (POST /executions/:id/replay): re-runs one specific
   * node in isolation, regardless of whether it's the execution's
   * current node. Does not require the execution to be FAILED --
   * replaying a node from a COMPLETED execution to compare outputs is
   * exactly the use case this is for.
   */
  async replayNode(executionId, nodeId, userId) {
    const execution = await WorkflowExecution.findOne({ _id: executionId, userId }).populate('workflowDefinitionId');
    if (!execution) throw new Error('Execution not found');

    const definition = execution.workflowDefinitionId;
    const node = definition.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found in this workflow's definition`);

    await eventStore.append(executionId, 'NodeQueued', { nodeType: node.data.nodeType, replay: true }, node.id);
    await this.requeueNode(executionId, userId, node, { isReplay: true });

    return execution;
  }

}

const runtimeEngine = new RuntimeEngine();

// 'active' fires when BullMQ actually hands a job to a worker -- a more
// accurate moment for "node:started" than queue-time, and it fires again
// on every automatic retry attempt too, which is how node:retrying is
// derived below with no extra infrastructure: attemptsMade > 0 on an
// 'active' event means this is a retry, not the first try.
queueEvents.on('active', async ({ jobId }) => {
  try {
    const job = await Job.fromId(stepQueue, jobId);
    if (!job) return;
    const { executionId, nodeId } = job.data;
    if (job.attemptsMade > 0) {
      getIO().to(executionId).emit('node:retrying', { executionId, nodeId, attempt: job.attemptsMade + 1 });
    } else {
      getIO().to(executionId).emit('node:started', { executionId, nodeId });
    }
  } catch (err) {
    console.error('[RuntimeEngine] Error handling node active event:', err);
  }
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  runtimeEngine.handleNodeCompleted(jobId, returnvalue).catch((err) => {
    console.error('[RuntimeEngine] Error handling node completion:', err);
  });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  runtimeEngine.handleNodeFailed(jobId, failedReason).catch((err) => {
    console.error('[RuntimeEngine] Error handling node failure:', err);
  });
});

module.exports = runtimeEngine;

