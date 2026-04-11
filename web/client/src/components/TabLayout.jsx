import { NavLink, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getQueueByStatus } from '../utils/offlineDb';

const ACTIVE_COLOR = '#F97316';

function useQueueBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function check() {
      const pending = await getQueueByStatus('pending');
      const completed = await getQueueByStatus('completed');
      const failed = await getQueueByStatus('failed');
      setCount(pending.length + completed.length + failed.length);
    }
    check();
    const interval = setInterval(check, 3000); // poll every 3s
    return () => clearInterval(interval);
  }, []);

  return count;
}

const tabs = [
  {
    to: '/weld',
    label: 'Weld',
    hasBadge: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    to: '/troubleshoot',
    label: 'Fix',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    to: '/reference',
    label: 'Ref',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function TabLayout() {
  const badgeCount = useQueueBadge();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #2A2A2E',
          background: '#0D0D0F',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <img src="/logo.png" alt="WeldPal" style={{ height: 64, width: 'auto' }} />
      </header>
      <div className="tab-content">
        <Outlet />
      </div>
      <nav className="tab-bar" aria-label="Main navigation">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
            style={{ position: 'relative' }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.hasBadge && badgeCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -8,
                backgroundColor: '#EF4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
