import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { UserPlus, Phone, X, Search, Edit2, Trash2 } from 'lucide-react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('az');

  const fetchContacts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/whatsapp/contacts`);
      setContacts(res.data);
    } catch (err) {
      console.error('Error fetching contacts', err);
    }
  };

  useEffect(() => {
    fetchContacts();
    
    // Auto-refresh contacts every 4 seconds dynamically
    const interval = setInterval(() => {
        // We only want to poll quietly without triggering a full page reload spinner
        axios.get(`${API_BASE}/api/whatsapp/contacts`)
            .then(res => setContacts(res.data))
            .catch(() => {});
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (editingId) {
          await axios.put(`${API_BASE}/api/whatsapp/contacts/${editingId}`, { name, phone });
      } else {
          await axios.post(`${API_BASE}/api/whatsapp/contacts`, { name, phone });
      }
      setName('');
      setPhone('');
      setEditingId(null);
      fetchContacts();
      setIsModalOpen(false); // Close modal on success
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Xəta yarandı, əməliyyat baş tutmadı.');
      console.error('Error adding/editing contact', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
      if (!window.confirm("Bu kontaktı silməyə əminsiniz?")) return;
      try {
          await axios.delete(`${API_BASE}/api/whatsapp/contacts/${id}`);
          fetchContacts();
      } catch (err) {
          console.error("Silərkən xəta", err);
          alert("Kontakt silinmədi.");
      }
  };

  const openEditModal = (contact) => {
      setEditingId(contact._id);
      setName(contact.name);
      setPhone(contact.phone);
      setErrorMsg('');
      setIsModalOpen(true);
  };
  
  const openAddModal = () => {
      setEditingId(null);
      setName('');
      setPhone('');
      setErrorMsg('');
      setIsModalOpen(true);
  };

  const processedContacts = [...contacts]
    .filter(c => {
      // Axtarış filtri
      return c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             c.phone.includes(searchQuery);
    })
    .sort((a, b) => {
      if (sortOrder === 'az') return a.name.localeCompare(b.name);
      if (sortOrder === 'za') return b.name.localeCompare(a.name);
      if (sortOrder === 'newest') return b._id.localeCompare(a._id);
      return 0;
    });

  const groupedContactsMap = new Map();
  processedContacts.forEach(c => {
    const nameStr = c.name ? c.name.trim() : 'Adsız';
    if (!groupedContactsMap.has(nameStr)) {
      groupedContactsMap.set(nameStr, { id: c._id || c.phone, name: nameStr, phones: [c] });
    } else {
      // Səhvən eyni nömrə iki dəfə gələrsə önləmək üçün
      const existing = groupedContactsMap.get(nameStr);
      if (!existing.phones.find(p => p.phone === c.phone)) {
          existing.phones.push(c);
      }
    }
  });
  const groupedContacts = Array.from(groupedContactsMap.values());

  return (
    <div style={{ margin: '-3rem', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="glass-panel" style={{ height: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 0, borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderRight: 'none', borderLeft: 'none' }}>
        
        {/* Full-width Inner Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Kontaktlar ({processedContacts.length})</h3>
          
          <div style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                 type="text" 
                 className="input" 
                 placeholder="Ad və ya nömrə axtarın..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 style={{ paddingLeft: '2.5rem', width: '100%', background: 'rgba(255,255,255,0.02)' }}
              />
            </div>
            
            <select 
               className="input" 
               value={sortOrder} 
               onChange={(e) => setSortOrder(e.target.value)}
               style={{ background: 'rgba(255,255,255,0.02)', cursor: 'pointer', maxWidth: '140px' }}
            >
               <option value="az" style={{ background: '#1e293b', color: '#f8fafc' }}>A-Z</option>
               <option value="za" style={{ background: '#1e293b', color: '#f8fafc' }}>Z-A</option>
               <option value="newest" style={{ background: '#1e293b', color: '#f8fafc' }}>Ən Yenilər</option>
            </select>

            <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
               <UserPlus size={18} /> Yeni Kontakt
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {contacts.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
                <p>Heç bir kontakt tapılmadı.</p>
            </div>
          ) : processedContacts.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
                <p>Axtarışa uyğun nəticə tapılmadı.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {groupedContacts.map((group) => (
                <div key={group.id} style={{ 
                  display: 'flex', flexDirection: 'column', gap: '1rem',
                  padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid var(--glass-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}>
                  <h4 style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{group.name}</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {group.phones.map(p => (
                      <div key={p.phone} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.85rem', borderRadius: '8px'
                      }}>
                        <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: 0 }}>
                          <Phone size={14} /> +{p.phone}
                        </p>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => openEditModal(p)} className="btn" style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                <Edit2 size={14} color="var(--text-secondary)" />
                            </button>
                            <button onClick={() => handleDelete(p._id)} className="btn" style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                                <Trash2 size={14} color="var(--danger)" />
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div style={{
           position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
           background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           zIndex: 50, padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                   <UserPlus size={20} color="var(--accent)" /> {editingId ? 'Kontaktı Redaktə Et' : 'Kontakt Əlavəsi'}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
                       <X size={20} />
                    </button>
                </div>
            </div>

          {errorMsg && (
             <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem' }}>
               {errorMsg}
             </div>
          )}

            <form onSubmit={handleAddOrEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ad</label>
                <input 
                  className="input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ad və Soyad" 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nömrə (ölkə kodu ilə)</label>
                <input 
                  className="input" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="994501234567" 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', width: '100%' }}>
                {loading ? 'Əlavə edilir...' : 'Yadda Saxla'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
