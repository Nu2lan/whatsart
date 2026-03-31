import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { MessageSquare, Send, CheckCircle, Activity, Smartphone } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
    <div style={{
      background: `linear-gradient(135deg, ${color}33, ${color}11)`,
      padding: '1rem',
      borderRadius: '12px',
      border: `1px solid ${color}44`
    }}>
      <Icon color={color} size={28} />
    </div>
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{title}</p>
      <h3 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</h3>
    </div>
  </div>
);

export default function Dashboard({ waInfo }) {
  const userName = waInfo?.userName ? waInfo.userName.split(' ')[0] : 'İstifadəçi';
  const [stats, setStats] = useState({ receivedMessages: 0, campaigns: 0 });
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'message', 'campaign'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/whatsapp/stats`),
          axios.get(`${API_BASE}/api/whatsapp/activities`)
        ]);
        setStats(statsRes.data);
        setActivities(activitiesRes.data);
      } catch (err) {
        // Silently ignore poll errors
      } finally {
        setLoadingActivities(false);
      }
    };
    fetchData();
    
    // Auto-refresh stats every 8 seconds
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredActivities = activities.filter(act => 
    activeTab === 'all' || act.type === activeTab
  );

  return (
    <div>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 className="page-title" style={{ margin: 0 }}>Xoş gəlmisiniz, {userName}</h2>
          <span style={{ fontSize: '2rem' }}>👋</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>WhatsArt kampaniyalarınızda bu gün baş verənlər.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <StatCard title="Gələn mesajlar" value={stats.receivedMessages} icon={MessageSquare} color="#3b82f6" />
        <StatCard title="Göndərilən Kampaniyalar" value={stats.campaigns} icon={Send} color="#10b981" />
        <StatCard title="AI İnteqrasiyası" value="Aktiv" icon={Activity} color="#c084fc" />
        <StatCard title="WhatsApp Status" value="Qoşulub" icon={Smartphone} color="#10b981" />
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Son Fəaliyyətlər</h3>
          
          <div style={{ 
            display: 'flex', 
            background: 'rgba(0,0,0,0.2)', 
            padding: '4px', 
            borderRadius: '10px',
            border: '1px solid var(--glass-border)'
          }}>
            {[
              { id: 'all', label: 'Bütün' },
              { id: 'message', label: 'Mesajlar' },
              { id: 'campaign', label: 'Kampaniyalar' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {loadingActivities ? (
          <p style={{ color: 'var(--text-secondary)' }}>Yüklənir...</p>
        ) : filteredActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
            <p>Seçilmiş tab üzrə heç bir son fəaliyyət yoxdur.</p>
          </div>
        ) : (
          <div className="custom-scrollbar" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '0.5rem'
          }}>
            {filteredActivities.map((act) => (
              <div key={act.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '0.75rem', 
                borderRadius: '10px', 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.2s, background 0.2s',
                cursor: 'default',
                flexShrink: 0
              }} onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }} onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}>
                <div style={{ 
                  color: act.type === 'message' ? 'var(--accent)' : 'var(--success)',
                  background: act.type === 'message' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                  padding: '10px',
                  borderRadius: '10px'
                }}>
                  {act.type === 'message' ? <MessageSquare size={18} /> : <Send size={18} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{act.title}</div>
                    {act.status && (
                      <span className={`badge ${
                        act.status === 'completed' ? 'badge-success' : 
                        act.status === 'processing' ? 'badge-ai' : 
                        'badge-pending'
                      }`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.6rem' }}>
                        {act.status === 'completed' ? 'Bitdi' : 
                         act.status === 'processing' ? 'Göndərilir' : 
                         act.status === 'pending' ? 'Gözləyir' : act.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{act.description}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
