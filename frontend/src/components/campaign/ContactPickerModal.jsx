import React, { useRef } from 'react';
import { X, ChevronDown, Image as ImageIcon } from 'lucide-react';

export default function ContactPickerModal({
  isOpen, onClose,
  contacts, loadingContacts,
  selectedContacts, setSelectedContacts,
  searchQuery, setSearchQuery,
  sortType, setSortType,
  isSortOpen, setIsSortOpen,
  filteredContacts
}) {
  const sortDropdownRef = useRef(null);

  if (!isOpen) return null;

  const handleSelectAll = (e) => {
    const filteredPhones = filteredContacts.map(c => c.phone);
    if (e.target.checked) {
      setSelectedContacts(Array.from(new Set([...selectedContacts, ...filteredPhones])));
    } else {
      setSelectedContacts(selectedContacts.filter(p => !filteredPhones.includes(p)));
    }
  };

  const handleCheckboxChange = (phone) => {
    if (selectedContacts.includes(phone)) {
      setSelectedContacts(prev => prev.filter(p => p !== phone));
    } else {
      setSelectedContacts(prev => [...prev, phone]);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Kontaktları Seç</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Sort Dropdown */}
            <div style={{ position: 'relative' }} ref={sortDropdownRef}>
              <button type="button" onClick={() => setIsSortOpen(!isSortOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <span>{sortType === 'Newest' ? 'Ən Yeni' : sortType}</span>
                <ChevronDown size={14} style={{ transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {isSortOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.4rem', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.4rem 0', minWidth: '130px', zIndex: 50, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
                  {['Newest', 'A-Z', 'Z-A'].map(opt => (
                    <div key={opt} onClick={() => { setSortType(opt); setIsSortOpen(false); }}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: sortType === opt ? 'var(--accent)' : 'var(--text-primary)', cursor: 'pointer', background: sortType === opt ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = sortType === opt ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}>
                      {opt === 'Newest' ? 'Ən Yeni' : opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        {!loadingContacts && contacts.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="input" placeholder="Ad və ya nömrə ilə axtar..." style={{ width: '100%' }} />
          </div>
        )}

        {/* List */}
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {loadingContacts ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Kontaktlar yüklənir...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredContacts.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={filteredContacts.every(c => selectedContacts.includes(c.phone))} onChange={handleSelectAll} />
                  <strong>Bütün kontaktları seç ({filteredContacts.length} nəfər)</strong>
                </label>
              )}
              {filteredContacts.map(c => (
                <label key={c.phone} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <input type="checkbox" checked={selectedContacts.includes(c.phone)} onChange={() => handleCheckboxChange(c.phone)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 500 }}>{c.name || `+${c.phone}`}</span>
                      {c.isFromMessages && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}>Mesaj</span>}
                      {c.isNewsletter && <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>Newsletter</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>+{c.phone}</div>
                  </div>
                </label>
              ))}
              {filteredContacts.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>Uyğun kontakt tapılmadı</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '1rem' }}>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            Təsdiqlə ({selectedContacts.length})
          </button>
          <button type="button" className="btn btn-outline" style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--danger)' }} onClick={() => setSelectedContacts([])}>
            Hamısını Təmizlə
          </button>
        </div>
      </div>
    </div>
  );
}
