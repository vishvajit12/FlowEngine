import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/workflows/new', label: 'Workflow Builder' },
  { to: '/executions', label: 'Executions' },
  { to: '/credentials', label: 'Credential Vault' },
];

export default function AppShell({ children, contentClassName = 'p-9' }) {
  return (
    <div className="grid grid-cols-[222px_1fr] min-h-screen">
      <aside className="bg-sidebar border-r border-white/[0.07] p-3 flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5 px-2 pt-1 pb-5">
  <img src="/logo-navbar.png" alt="" className="h-10 w-auto object-contain shrink-0" />
  <div>
    <div className="text-white font-display font-bold text-[17px] leading-tight">FlowEngine</div>
    <div className="text-teal text-[10px] font-mono uppercase tracking-wide opacity-90">Automation Engine</div>
  </div>
</div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                isActive ? 'bg-teal/25 text-white font-semibold' : 'text-white/65 hover:bg-white/[0.07] hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}

        <div className="flex-1" />
        <button className="text-left text-[12.5px] text-white/40 hover:text-white/75 px-3 py-2">⚙ Settings</button>
        <button className="text-left text-[12.5px] text-white/40 hover:text-white/75 px-3 py-2">? Support</button>
      </aside>

      <div className={contentClassName}>{children}</div>
    </div>
  );
}