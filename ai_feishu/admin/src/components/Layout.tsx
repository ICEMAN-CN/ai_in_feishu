import { Outlet } from 'react-router-dom';
import { Nav } from './Nav';

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Nav />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
