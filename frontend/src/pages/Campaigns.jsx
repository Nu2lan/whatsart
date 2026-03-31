import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { Plus, Trash2, Calendar, FileText, Loader2, Users, Pencil } from 'lucide-react';
import NewCampaignModal from '../components/NewCampaignModal';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);

  useEffect(() => {
    fetchCampaigns();

    // Listen for real-time updates
    const eventSource = new EventSource(`${API_BASE}/api/whatsapp/status-stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'campaign' && data.campaign) {
          setCampaigns(prev => prev.map(c => 
            c._id === data.campaign._id ? data.campaign : c
          ));
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/campaigns`);
      setCampaigns(res.data);
    } catch (error) {
      console.error('Anonsları yükləmək mümkün olmadı', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Bu anonsu silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API_BASE}/api/campaigns/${id}`);
      setCampaigns(campaigns.filter(c => c._id !== id));
    } catch (err) {
      alert('Silinmə xətası: ' + err.message);
    }
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Anonslar (Toplu Mesajlar)</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Yeni toplu mesaj
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
             <Loader2 size={32} className="animate-spin text-accent" />
           </div>
        ) : campaigns.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
            <p>Hələ heç bir anons yaradılmayıb.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                <tr>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Ad</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Status</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Tarix</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>Auditoriya</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>İcra</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'right' }}>Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(camp => (
                  <tr key={camp._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{camp.name}</div>
                        {camp.hasMedia && <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)', marginTop: '0.25rem', display: 'inline-block' }}>📎 Media</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${
                          camp.status === 'completed' ? 'badge-success' : 
                          camp.status === 'processing' ? 'badge-ai' : 
                          camp.status === 'failed' ? 'badge-pending' : 
                          'badge-pending'
                      }`} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {camp.status === 'pending' ? 'Gözləyir' : camp.status === 'processing' ? 'Göndərilir' : camp.status === 'completed' ? 'Bitdi' : camp.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <Calendar size={14} />
                            {(() => { const d = new Date(camp.scheduledAt); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()}
                        </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                            <Users size={16} /> {camp.progress?.total || camp.audience?.length || 0} nəfər
                        </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                        {camp.status === 'completed' ? (
                          (camp.progress?.failed || 0) === 0 
                            ? <span className="badge badge-success" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>Uğurlu</span>
                            : <span className="badge badge-pending" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', textTransform: 'uppercase', fontSize: '0.65rem' }}>Xətalı</span>
                        ) : camp.status === 'processing' ? (
                          <span className="badge badge-ai" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>Göndərilir...</span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>—</span>
                        )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {camp.status === 'pending' && (
                          <button onClick={() => { setEditCampaign(camp); setIsModalOpen(true); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px', transition: 'background 0.2s' }} title="Redaktə et">
                            <Pencil size={18} />
                          </button>
                        )}
                        <button onClick={() => deleteCampaign(camp._id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px', transition: 'background 0.2s' }} title="Sil">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewCampaignModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditCampaign(null); }} 
        onCampaignCreated={fetchCampaigns}
        editCampaign={editCampaign}
      />
    </div>
  );
}
