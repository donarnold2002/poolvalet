import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

function NavItem({ icon, label, path, badge, onClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = path && location.pathname === path;
  return (
    <button className={`nav-item ${active ? 'active' : ''}`}
      onClick={() => onClick ? onClick() : navigate(path)}>
      <span className="nav-icon">{icon}</span>
      {label}
      {badge > 0 && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('pv_token');
    if (!token) return;
    fetch('/api/messages/unread/count', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {});
    const int = setInterval(() => {
      fetch('/api/messages/unread/count', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(int);
  }, []);

  const homeownerNav = [
    { icon: '🏠', label: 'Dashboard', path: '/homeowner' },
    { icon: '📋', label: 'My Jobs', path: '/homeowner/jobs' },
    { icon: '➕', label: 'Request Quotes', path: '/homeowner/submit' },
  ];

  const companyNav = [
    { icon: '📊', label: 'Dashboard', path: '/company' },
    { icon: '🔍', label: 'Browse Jobs', path: '/company/browse' },
    { icon: '💼', label: 'My Bids', path: '/company/bids' },
  ];

  const adminNav = [
    { icon: '📊', label: 'Dashboard', path: '/admin' },
    { icon: '👥', label: 'Users', path: '/admin/users' },
    { icon: '📋', label: 'Jobs', path: '/admin/jobs' },
    { icon: '🏢', label: 'Companies', path: '/admin/companies' },
  ];

  const navItems = user?.role === 'homeowner' ? homeownerNav :
                   user?.role === 'company'   ? companyNav   : adminNav;

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="sidebar-logo-icon">🏊</div>
          <div className="sidebar-logo-text">Pool<span>Valet</span></div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Navigation</div>
          {navItems.map(item => (
            <NavItem key={item.path} {...item} badge={item.label === 'Messages' ? unread : 0} />
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button className="sidebar-logout" title="Log out" onClick={() => { logout(); navigate('/login'); }}>⏻</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
