// Each template returns { name, nodes, edges } in React Flow's shape.
// `nodes[].data.nodeType` is what FlowNode/ConfigPanel key off of;
// `nodes[].data.values` are that node's configured field values.

function node(id, nodeType, x, y, label, values = {}) {
  return { id, type: 'flowNode', position: { x, y }, data: { nodeType, label, values } };
}

export const TEMPLATES = {
  scratch: () => ({
    name: 'FlowEngine Onboarding',
    nodes: [
      node('n1', 'schedule', 60, 90, undefined, { desc: 'Runs daily at 9:00 AM' }),
      node('n2', 'aitask', 420, 150, 'Analyze Lead Data', {
        model: 'GPT-4o (OpenAI)',
        prompt: 'You are an expert data analyst...',
      }),
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
  }),

  github: () => ({
    name: 'GitHub Repository Analyzer',
    nodes: [
      node('n1', 'github', 40, 60, 'Validate Repository', { repo: 'github.com/sudeshkarande73/filegate ' }),
      node('n2', 'http', 320, 60, 'Fetch Metadata', { url: 'api.github.com/repos/sudeshkarande73/filegate', method: 'GET' }),
      node('n3', 'http', 600, 60, 'Read README', { url: 'raw.githubusercontent.com/sudeshkarande73/filegate/main/README.md', method: 'GET' }),
      node('n4', 'aitask', 320, 260, 'AI Analysis', {
        model: 'gemini-3.6-flash',
        prompt: "Analyze this repository's architecture...",
      }),
      node('n5', 'pdf', 600, 260, 'Generate PDF', { template: 'Architecture Summary' }),
      node('n6', 'email', 880, 260, 'Send Email', { to: 'vishvajit6264@gmail.com', subject: 'Your repository analysis is ready' }),
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' },
    ],
  }),

  resume: () => ({
    name: 'Resume Builder',
    nodes: [
      node('n1', 'webhook', 40, 120, 'Resume Input', { path: '/resume/upload' }),
      node('n2', 'aitask', 320, 120, 'AI Improvement', {
        model: 'GPT-4o (OpenAI)',
        prompt: 'Improve and format this resume...',
      }),
      node('n3', 'pdf', 600, 120, 'Generate PDF', { template: 'Resume' }),
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  }),
};
