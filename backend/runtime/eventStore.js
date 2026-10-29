const WorkflowExecution = require('../models/WorkflowExecution');

/**
 * The only place in the codebase that writes to WorkflowExecution.events.
 * Everything else (Runtime Engine, Replay Engine) goes through this module
 * rather than pushing to the array directly.
 *
 * Uses an atomic $push via findByIdAndUpdate rather than the "fetch execution,
 * push to array in JS, .save()" pattern, which has a race: two events appended
 * close together can overwrite each other. $push is a single atomic Mongo
 * operation, so that can't happen.
 */
async function append(executionId, type, payload = {}, nodeId = null) {
  const event = { type, nodeId, payload, timestamp: new Date() };

  const updated = await WorkflowExecution.findByIdAndUpdate(
    executionId,
    { $push: { events: event } },
    { new: true }
  );

  if (!updated) {
    throw new Error(`Cannot append event: WorkflowExecution ${executionId} not found`);
  }

  return event;
}

/**
 * Appends only if no event of this type exists yet for this node. Atomic, so two
 * API processes (or Replay racing QueueEvents) can't both record the same completion.
 * Returns the event, or null if it was already recorded.
 */
async function appendOnce(executionId, type, payload = {}, nodeId = null) {
  const event = { type, nodeId, payload, timestamp: new Date() };

  const updated = await WorkflowExecution.findOneAndUpdate(
    { _id: executionId, events: { $not: { $elemMatch: { type, nodeId } } } },
    { $push: { events: event } },
    { new: true }
  );

  return updated ? event : null;
}

async function getEvents(executionId) {
  const execution = await WorkflowExecution.findById(executionId).select('events');
  if (!execution) {
    throw new Error(`WorkflowExecution ${executionId} not found`);
  }
  return execution.events;
}

module.exports = { append, appendOnce, getEvents };