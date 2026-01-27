import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300 ease-in-out">
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
