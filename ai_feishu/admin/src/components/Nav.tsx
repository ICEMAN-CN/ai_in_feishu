import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Bot, Database, Key } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/models', label: 'Models', icon: Bot },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: Database },
  { to: '/mcp-auth', label: 'MCP Auth', icon: Key },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Nav() {
  return (
    <nav className="w-56 bg-white border-r border-gray-200 p-4">
      <h1 className="text-lg font-semibold mb-6 px-2">AI Feishu Admin</h1>
      <ul className="space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
