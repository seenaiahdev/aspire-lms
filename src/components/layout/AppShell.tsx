import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { CommandPalette } from './CommandPalette';
import { NotificationsDrawer } from './NotificationsDrawer';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <NotificationsDrawer />
    </div>
  );
}
