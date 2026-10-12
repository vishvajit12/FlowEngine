// Single source of truth for every node type in the builder.
// NodeLibrary, FlowNode (the React Flow custom node renderer), and
// ConfigPanel all read from this instead of each hardcoding node
// shapes -- the frontend equivalent of the backend's Factory/Strategy
// pattern: one generic renderer driven by `type`, not N hardcoded
// components.

export const NODE_TYPES = {
  webhook: {
    label: 'Webhook',
    category: 'Events',
    icon: '⚡',
    chip: 'bg-sage text-ink',
    fields: [{ key: 'path', label: 'Path', type: 'text', placeholder: '/webhook/lead-created' }],
    summary: (v) => v.path || 'Not configured',
  },
  schedule: {
    label: 'Schedule',
    category: 'Events',
    icon: '◷',
    chip: 'bg-sage text-ink',
    fields: [
      { key: 'cron', label: 'Cron Expression', type: 'text', placeholder: '0 9 * * *' },
      { key: 'desc', label: 'Description', type: 'text', placeholder: 'Runs daily at 9:00 AM' },
    ],
    summary: (v) => v.desc || (v.cron ? `Cron: ${v.cron}` : 'Not configured'),
  },
  aitask: {
    label: 'AI Task',
    category: 'AI Task',
    icon: '◈',
    chip: 'bg-teal text-white',
    fields: [
      { key: 'model', label: 'Model', type: 'select', options: ['GPT-4o (OpenAI)', 'gemini-3.6-flash', 'Claude Sonnet'] },
      { key: 'credentialId', label: 'Credential', type: 'credential', provider: null }, // populated from live vault
      { key: 'prompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are an expert data analyst...' },
    ],
    summary: (v) => v.model || 'Not configured',
  },
  classifier: {
    label: 'Classifier',
    category: 'AI Model',
    icon: '◎',
    chip: 'bg-teal text-white',
    fields: [
      { key: 'model', label: 'Model', type: 'select', options: ['GPT-4o (OpenAI)', 'gemini-3.6-flash', 'Claude Sonnet'] },
      { key: 'labels', label: 'Labels', type: 'text', placeholder: 'urgent, normal, spam' },
    ],
    summary: (v) => v.model || 'Not configured',
  },
  http: {
    label: 'HTTP Request',
    category: 'Integration',
    icon: '⇄',
    chip: 'bg-coral-bg text-coral-hover',
    fields: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/...' },
      { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
    ],
    summary: (v) => `${v.method || 'GET'} ${v.url || ''}`,
  },
  email: {
    label: 'Send Email',
    category: 'Integration',
    icon: '✉',
    chip: 'bg-coral-bg text-coral-hover',
    fields: [
      { key: 'to', label: 'To', type: 'text', placeholder: '{{user_email}}' },
      { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Your report is ready' },
    ],
    summary: (v) => (v.to ? `To: ${v.to}` : 'Not configured'),
  },
  github: {
    label: 'GitHub Repo',
    category: 'Integration',
    icon: '⌥',
    chip: 'bg-coral-bg text-coral-hover',
    fields: [{ key: 'repo', label: 'Repository URL', type: 'text', placeholder: 'https://github.com/user/repo' }],
    summary: (v) => v.repo || 'Not configured',
  },
  pdf: {
    label: 'Generate PDF',
    category: 'Document',
    icon: '▤',
    chip: 'bg-ink/10 text-ink/70',
    fields: [{ key: 'template', label: 'Template', type: 'select', options: ['Architecture Summary', 'Resume'] }],
    summary: (v) => v.template || 'Not configured',
  },
};

export const NODE_CATEGORIES = ['Events', 'AI Models', 'Integration', 'Documents'];

// Groups node types for the library panel sidebar. Kept separate
// from NODE_TYPES.category (used for the config panel header) since
// "AI Task" and "Classifier" share a library section ("AI Models")
// but have distinct config-panel category labels.
export const LIBRARY_GROUPS = [
  { title: 'Events', types: ['webhook', 'schedule'] },
  { title: 'AI Models', types: ['aitask', 'classifier'] },
  { title: 'Integration', types: ['http', 'email', 'github'] },
  { title: 'Documents', types: ['pdf'] },
];
