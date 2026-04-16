import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Models } from './pages/Models';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { MCPAuth } from './pages/MCPAuth';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="models" element={<Models />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="mcp-auth" element={<MCPAuth />} />
      </Route>
    </Routes>
  );
}
