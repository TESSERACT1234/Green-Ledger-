import React from 'react';
import Sidebar from './Sidebar';

export default function AppLayout({ children, title }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content content-with-sidebar">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{title}</h1>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="page-wrapper">{children}</main>
      </div>
    </div>
  );
}
