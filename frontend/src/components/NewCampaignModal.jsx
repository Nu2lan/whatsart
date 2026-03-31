import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { X, Sparkles, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import ContactPickerModal from './campaign/ContactPickerModal';

const API = `${API_BASE}/api/whatsapp`;

export default function NewCampaignModal({ isOpen, onClose, onCampaignCreated, editCampaign }) {
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [name, setName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortType, setSortType] = useState('A-Z');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);

  const fileInputRef = useRef(null);
  const attachmentMenuRef = useRef(null);

  // Click outside for attachment menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachmentMenu]);

  // Initialize form on open
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      if (editCampaign) {
        setName(editCampaign.name || '');
        setMessageBody(editCampaign.messageBody || '');
        const d = new Date(editCampaign.scheduledAt);
        setDateInput(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`);
        setTimeInput(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
        setSelectedContacts(editCampaign.audience || []);
        setSelectedFile(null);
        setRemoveExistingMedia(false);
      } else {
        setName(''); setMessageBody('');
        const now = new Date();
        setDateInput(now.toLocaleDateString('en-GB'));
        setTimeInput(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        setSelectedContacts([]); setSelectedFile(null); setRemoveExistingMedia(false);
      }
    }
  }, [isOpen, editCampaign]);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await axios.get(`${API}/contacts?includeMessages=true`);
      setContacts(res.data);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleEnhanceMessage = async () => {
    if (!messageBody.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await axios.post(`${API}/enhance-message`, { text: messageBody.trim() });
      if (res.data.success && res.data.text) setMessageBody(res.data.text);
    } catch (err) {
      alert(err.response?.data?.error || 'Süni intellekt hazırda mətni təhlil edə bilmir.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const filteredContacts = [...contacts]
    .filter(c => {
      const query = searchQuery.toLowerCase();
      return String(c.name || '').toLowerCase().includes(query) || String(c.phone || '').toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (sortType === 'A-Z') return (a.name || a.phone).toLowerCase().localeCompare((b.name || b.phone).toLowerCase());
      if (sortType === 'Z-A') return (b.name || b.phone).toLowerCase().localeCompare((a.name || a.phone).toLowerCase());
      const timeA = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !messageBody || !dateInput || !timeInput || selectedContacts.length === 0) {
      alert('Zəhmət olmasa bütün mütləq xanaları doldurun.');
      return;
    }
    if (dateInput.length !== 10 || timeInput.length !== 5) {
      alert('Tarix (GG/AA/İİİİ) və vaxt (SS:dd) formatını düzgün daxil edin.');
      return;
    }
    const [day, month, year] = dateInput.split('/');
    const [hours, minutes] = timeInput.split(':');
    const scheduledAtObj = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(scheduledAtObj.getTime())) { alert('Tarix və ya saat düzgün deyil.'); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('messageBody', messageBody);
      formData.append('scheduledAt', scheduledAtObj.toISOString());
      formData.append('audience', JSON.stringify(selectedContacts));
      if (selectedFile) formData.append('file', selectedFile);
      if (removeExistingMedia) formData.append('removeMedia', 'true');

      if (editCampaign) {
        await axios.put(`${API_BASE}/api/campaigns/${editCampaign._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API_BASE}/api/campaigns`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onCampaignCreated();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Kampaniya yaradılarkən xəta baş verdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{editCampaign ? 'Anonsu Redaktə Et' : 'Yeni Anons'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          <form id="campaignForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Kampaniyanın Adı *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Məs: Qış Endirimi 2026" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tarix *</label>
                  <input type="text" className="input" placeholder="31/12/2026" value={dateInput}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 8) val = val.slice(0, 8);
                      if (val.length > 4) val = `${val.slice(0,2)}/${val.slice(2,4)}/${val.slice(4)}`;
                      else if (val.length > 2) val = `${val.slice(0,2)}/${val.slice(2)}`;
                      setDateInput(val);
                    }} required />
                </div>
                <div style={{ width: '120px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Saat *</label>
                  <input type="text" className="input" placeholder="18:30" value={timeInput}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 4) val = val.slice(0, 4);
                      if (val.length > 2) val = `${val.slice(0,2)}:${val.slice(2)}`;
                      setTimeInput(val);
                    }} required />
                </div>
              </div>
            </div>

            {/* Message Body + AI */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Mesaj Mətni *</label>
                <button type="button" onClick={() => setShowContactsModal(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  + Kontakt əlavə et {selectedContacts.length > 0 && `(${selectedContacts.length} seçilib)`}
                </button>
              </div>

              <div className="input" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)}
                  onPaste={e => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (const item of items) {
                      if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                          const ext = file.type.split('/')[1] || 'png';
                          setSelectedFile(new File([file], `screenshot_${Date.now()}.${ext}`, { type: file.type }));
                        }
                        break;
                      }
                    }
                  }}
                  placeholder="Müştərilərə göndəriləcək mesajı buraya yazın..."
                  style={{ flex: 1, border: 'none', background: 'transparent', resize: 'none', outline: 'none', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', minHeight: '180px' }}
                  required />

                <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files[0])} style={{ display: 'none' }}
                  accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />

                {/* Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.5rem', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ position: 'relative' }} ref={attachmentMenuRef}>
                      {showAttachmentMenu && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '0', background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50, minWidth: '200px' }}>
                          <button type="button" onClick={() => { fileInputRef.current.accept = '*/*'; fileInputRef.current.click(); setShowAttachmentMenu(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.95rem', width: '100%', borderRadius: '12px' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <FileText size={20} color="var(--accent)" /> Sənəd
                          </button>
                          <button type="button" onClick={() => { fileInputRef.current.accept = 'image/*,video/*'; fileInputRef.current.click(); setShowAttachmentMenu(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.95rem', width: '100%', borderRadius: '12px' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <ImageIcon size={20} color="#3b82f6" /> Şəkil & Video
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', transform: showAttachmentMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>+</span>
                      </button>
                    </div>

                    {/* Attached file display */}
                    {selectedFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                        <ImageIcon size={14} color="var(--accent)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                          {selectedFile.name?.length > 15 ? selectedFile.name.substring(0, 15) + '...' : selectedFile.name}
                          <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                        </span>
                        <button type="button" onClick={() => setSelectedFile(null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : editCampaign?.hasMedia && editCampaign?.mediaOriginalName && !removeExistingMedia ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                        <ImageIcon size={14} color="#22c55e" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                          {editCampaign.mediaOriginalName.length > 20 ? editCampaign.mediaOriginalName.substring(0, 20) + '...' : editCampaign.mediaOriginalName}
                        </span>
                        <button type="button" onClick={() => setRemoveExistingMedia(true)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* AI Enhance */}
                  <button type="button" onClick={handleEnhanceMessage} disabled={!messageBody.trim() || isEnhancing}
                    title="Yazını Süni İntellekt ilə Təkmilləşdir"
                    style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))', border: '1px solid rgba(168,85,247,0.4)', color: (!messageBody.trim() || isEnhancing) ? 'rgba(192, 132, 252, 0.5)' : '#c084fc', padding: '0.5rem', borderRadius: '50%', cursor: (!messageBody.trim() || isEnhancing) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                    {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '1rem' }}>
          <button type="submit" form="campaignForm" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editCampaign ? 'Yenilə' : 'Yadda Saxla')}
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting} style={{ flex: 1 }}>Ləğv et</button>
        </div>
      </div>

      {/* Contact Picker — extracted to separate component */}
      <ContactPickerModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={contacts}
        loadingContacts={loadingContacts}
        selectedContacts={selectedContacts}
        setSelectedContacts={setSelectedContacts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortType={sortType}
        setSortType={setSortType}
        isSortOpen={isSortOpen}
        setIsSortOpen={setIsSortOpen}
        filteredContacts={filteredContacts}
      />
    </div>
  );
}
