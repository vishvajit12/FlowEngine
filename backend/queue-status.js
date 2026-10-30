require('./config/env');
const connectDB = require('./config/database');
const q = require('./queues/stepQueue');
const WorkflowExecution = require('./models/WorkflowExecution');

(async () => {
  await connectDB();
  console.log('Workers attached to queue:', (await q.getWorkers()).length);
  console.log('Counts:', await q.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed'));

  const ex = await WorkflowExecution.findOne().sort({ _id: -1 }).select('status currentNodeId events');
  console.log('Latest execution:', ex?._id.toString(), ex?.status, 'current node:', ex?.currentNodeId);
  (ex?.events || []).forEach((e) => console.log('  event:', e.type, e.nodeId || ''));

  if (ex?.currentNodeId) {
    const jobId = `${ex._id}_${ex.currentNodeId}`;
    const job = await q.getJob(jobId);
    console.log('Current node job:', jobId, '->', job ? await job.getState() : 'NOT IN QUEUE');
  }
  process.exit(0);
})().catch((e) => { console.error('DIAG ERROR:', e.message); process.exit(1); });