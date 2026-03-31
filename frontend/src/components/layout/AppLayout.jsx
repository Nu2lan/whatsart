import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Send, MessageSquare, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import API_BASE from '../../config/api';

export default function AppLayout({ children, waInfo, setIsWhatsAppReady, setIsDisconnecting, setWaInfo }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setIsDisconnecting(true);
    try {
      await axios.post(`${API_BASE}/api/whatsapp/logout`);
    } catch (e) { console.error(e); }
    setIsWhatsAppReady(false);
    setWaInfo({ phoneNumber: '', userName: '' });
    setIsDisconnecting(false);
  };

  return (
    <div className="app-container">
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'var(--accent)', width: '36px', height: '36px',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px var(--accent-glow)', flexShrink: 0
            }}>
              <MessageSquare color="white" size={20} />
            </div>
            <h1 style={{
              fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.05em', margin: 0,
              whiteSpace: 'nowrap', opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease',
              pointerEvents: isCollapsed ? 'none' : 'auto'
            }}>WhatsArt</h1>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Böyüt' : 'Kiçilt'}
          style={{
            position: 'absolute', right: '-14px', top: '32px',
            background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: '50%', width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)', zIndex: 150,
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)', transition: 'var(--transition)'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          {[
            { to: '/', icon: LayoutDashboard, label: 'İdarə Paneli', end: true },
            { to: '/logs', icon: MessageSquare, label: 'Mesajlar' },
            { to: '/campaigns', icon: Send, label: 'Anonslar' }
          ].map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title={label}>
              <Icon size={20} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease', pointerEvents: isCollapsed ? 'none' : 'auto' }}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* User Info + Logout */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0
              }}>
                {(waInfo.userName || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease', pointerEvents: isCollapsed ? 'none' : 'auto' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {waInfo.userName || 'İstifadəçi'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {waInfo.phoneNumber ? `+${waInfo.phoneNumber.replace('@c.us', '')}` : ''}
                </div>
              </div>
            </div>

            <button onClick={() => setShowLogoutModal(true)} title="Çıxış"
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 8px',
                borderRadius: '8px', background: 'transparent', border: 'none', color: '#ef4444',
                cursor: 'pointer', transition: 'var(--transition)', width: '100%', justifyContent: 'flex-start'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <LogOut size={20} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease', pointerEvents: isCollapsed ? 'none' : 'auto' }}>
                Çıxış
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}
          onClick={() => setShowLogoutModal(false)}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>WhatsApp-dan Çıxış</h3>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', margin: 0 }}>
              WhatsApp sessiyasından çıxmaq istəyirsiniz?
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button onClick={handleLogout} className="btn btn-danger" style={{ flex: 1 }}>Bəli</button>
              <button onClick={() => setShowLogoutModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Xeyr</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
