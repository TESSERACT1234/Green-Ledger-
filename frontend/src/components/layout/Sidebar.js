import React from 'react';
import logo from '../../assets/logo.js';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, Truck, Package,
  FileText, ShoppingCart, CreditCard, BookMarked,
  Landmark, Receipt, BarChart3, FolderOpen,
  Settings, LogOut, ArrowUpDown, Shield, Briefcase, Factory, FlaskConical
} from 'lucide-react';

const navItems = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
    ]
  },
  {
    section: 'Accounting',
    items: [
      { to: '/accounts',   label: 'Chart of Accounts', icon: BookOpen },
      { to: '/journal',    label: 'Journal Entries',   icon: BookMarked },
      { to: '/bank',       label: 'Bank Accounts',     icon: Landmark },
    ]
  },
  {
    section: 'Parties',
    items: [
      { to: '/customers',  label: 'Customers',        icon: Users },
      { to: '/vendors',    label: 'Vendors',          icon: Truck },
      { to: '/parties',    label: 'People & Expenses', icon: Briefcase },
    ]
  },
  {
    section: 'Transactions',
    items: [
      { to: '/invoices',   label: 'Sales Invoices',   icon: FileText },
      { to: '/purchases',  label: 'Purchase Bills',   icon: ShoppingCart },
      { to: '/payments',   label: 'Payments',         icon: CreditCard },
    ]
  },
  {
    section: 'Inventory',
    items: [
      { to: '/items',        label: 'Products',         icon: Package },
      { to: '/production',   label: 'Production',       icon: FlaskConical },
    ]
  },
  {
    section: 'Finance',
    items: [
      { to: '/gst',        label: 'GST',              icon: Receipt },
      { to: '/reports',    label: 'Reports',          icon: BarChart3 },
      { to: '/documents',  label: 'Documents',        icon: FolderOpen },
      { to: '/import-export', label: 'Import / Export', icon: ArrowUpDown },
    ]
  },
];

const adminItems = [
  { to: '/users',    label: 'Users',    icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div style={{ background:'#f8fdf9', borderBottom:'2px solid #16a34a22', padding:'16px 20px 12px' }}>
        <NavLink to="/dashboard" style={{ textDecoration:'none', display:'block' }}>
          <img src={logo} alt="Tesseract Flex Fuel"
            style={{ width:'160px', display:'block', maxWidth:'100%' }}/>
          <div style={{ fontSize:'9px', fontWeight:700, color:'#16a34a',
            letterSpacing:'0.14em', textTransform:'uppercase', marginTop:'4px', paddingLeft:'2px' }}>GreenLedger · Accounting</div>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        {isAdmin && (
          <div>
            <div className="nav-section-label">Admin</div>
            {adminItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-icon" size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button onClick={handleLogout} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)', padding:'4px' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}