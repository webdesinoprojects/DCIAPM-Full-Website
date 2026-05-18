import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin', icon: 'dashboard' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Elections', to: '/admin/elections', icon: 'how_to_vote' },
      { label: 'Create Election', to: '/admin/elections/new', icon: 'add_circle' },
      { label: 'Vote Monitor', to: '/admin/monitor', icon: 'bar_chart' },
      { label: 'Turnout', to: '/admin/turnout', icon: 'donut_large' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Membership Apps', to: '/admin/membership', icon: 'card_membership' },
      { label: 'Members', to: '/admin/members', icon: 'groups' },
      { label: 'Events', to: '/admin/events', icon: 'event' },
      { label: 'Cases', to: '/admin/cases', icon: 'biotech' },
      { label: 'Publications', to: '/admin/publications', icon: 'article' },
      { label: 'Governing Body', to: '/admin/governing-body', icon: 'badge' },
      { label: 'Gallery', to: '/admin/gallery', icon: 'photo_library' },
      { label: 'Messages', to: '/admin/messages', icon: 'mail' },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

// An item is active for its own path and any deeper path it owns, but not when
// a more specific sibling (e.g. Create Election) exactly matches the path.
function isNavItemActive(item, activePath) {
  if (activePath === item.to) return true;
  if (item.to === '/admin') return false;
  if (!activePath.startsWith(`${item.to}/`)) return false;
  return !navItems.some((other) => other.to !== item.to && other.to === activePath);
}

const AdminShell = ({ children, title, description, action }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (
    window.localStorage.getItem('admin-sidebar-collapsed') === 'true'
  ));

  const activePath = location.pathname;
  const initials = useMemo(() => {
    const source = profile?.full_name || profile?.email || 'Admin';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [profile]);

  useEffect(() => {
    window.localStorage.setItem('admin-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const closeMobileSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-gray-900">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white transition-[width,transform] duration-200 lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex h-20 items-center border-b border-gray-100 px-4 ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <Link to="/admin" className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-DEFAULT">DC-IAPM</p>
            <p className="mt-1 truncate text-lg font-bold text-primary">Admin Panel</p>
          </Link>

          <Link
            to="/admin"
            className={`hidden h-11 w-11 place-items-center rounded-lg bg-primary text-sm font-bold text-white ${sidebarCollapsed ? 'lg:grid' : ''}`}
            aria-label="Admin dashboard"
          >
            DC
          </Link>

          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'lg:absolute lg:right-[-18px] lg:top-24' : ''}`}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="hidden h-10 w-10 place-items-center rounded-lg border border-gray-200 bg-white text-primary shadow-sm transition hover:bg-gray-50 lg:grid"
              aria-label={sidebarCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="material-icons-outlined text-[20px]">
                {sidebarCollapsed ? 'keyboard_double_arrow_right' : 'close'}
              </span>
            </button>
            <button
              type="button"
              onClick={closeMobileSidebar}
              className="grid h-10 w-10 place-items-center rounded-lg border border-gray-200 text-primary lg:hidden"
              aria-label="Close admin navigation"
            >
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
        </div>

        <nav className={`admin-sidebar-nav min-h-0 flex-1 overflow-y-auto py-5 ${sidebarCollapsed ? 'lg:px-3' : 'px-4'}`}>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className={`px-2 text-xs font-bold uppercase tracking-wide text-gray-500 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{group.label}</p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const active = isNavItemActive(item, activePath);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={closeMobileSidebar}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''} ${
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-gray-600 hover:bg-[#f1f5f9] hover:text-primary'
                      }`}
                    >
                      <span className="material-icons-outlined w-6 shrink-0 overflow-hidden text-center text-[20px] leading-none">{item.icon}</span>
                      <span className={`min-w-0 truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`border-t border-gray-100 p-4 ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
          <div className={`flex items-center gap-3 rounded-lg bg-[#f7f9fc] p-3 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">
              {initials}
            </div>
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-bold text-primary">{profile?.email}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{profile?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-40 bg-primary/30 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-gray-200 text-primary lg:hidden"
            aria-label="Open admin navigation"
          >
            <span className="material-icons-outlined">menu</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-primary">{title}</h1>
            {description && <p className="mt-1 hidden text-sm text-gray-600 md:block">{description}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {action}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
            >
              <span className="material-icons-outlined mr-1 text-base">logout</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-8">
          {children}
        </div>
      </div>

      <style>{`
        .admin-sidebar-nav {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .admin-sidebar-nav::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `}</style>
    </main>
  );
};

export default AdminShell;