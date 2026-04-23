'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 64 : 224;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left .2s cubic-bezier(.4,0,.2,1)',
        }}
        className="main-content"
      >
        <MobileHeader onMenuOpen={() => setSidebarOpen(true)} />
        <div style={{ flex: 1 }}>{children}</div>
      </div>
      <style>{`
        @media (min-width: 640px) {
          .sidebar-overlay { position: fixed !important; transform: translateX(0) !important; }
          .main-content { margin-left: ${sidebarWidth}px !important; }
        }
      `}</style>
    </div>
  );
}
