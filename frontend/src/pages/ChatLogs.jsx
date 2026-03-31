import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { MessageSquare, Trash2, X, AlertTriangle, User, Loader2, Download } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import ChatSidebar from '../components/chat/ChatSidebar';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';

const API = `${API_BASE}/api/whatsapp`;

export default function ChatLogs() {
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [whatsappStatus, setWhatsappStatus] = useState('READY');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [messageLimit, setMessageLimit] = useState(50);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabled = useRef(true);

  // ── Scroll ──────────────────────────────────────────────
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });

  useLayoutEffect(() => {
    if (isAutoScrollEnabled.current) scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    isAutoScrollEnabled.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  // ── Data Fetching ────────────────────────────────────────
  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API}/device-chats`);
      setChats(res.data);
    } catch (err) {
      console.error('Error fetching chats', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceMessages = async (phone, limit = messageLimit) => {
    setLoadingMessages(true);
    try {
      const res = await axios.get(`${API}/device-messages/${phone}?limit=${limit}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API}/status`);
      setWhatsappStatus(res.data.status);
    } catch (err) {}
  };

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => {
    isAutoScrollEnabled.current = true;
    setProfilePicUrl('');
    if (selectedChat) {
      axios.get(`${API}/profile-pic/${selectedChat}`)
        .then(res => setProfilePicUrl(res.data.url))
        .catch(() => {});
    }
  }, [selectedChat]);

  useEffect(() => {
    checkStatus();
    fetchChats();
    axios.get(`${API}/contacts`).then(res => setContacts(res.data)).catch(() => {});
    const interval = setInterval(() => {
      fetchChats();
      if (selectedChat) fetchDeviceMessages(selectedChat);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  useEffect(() => {
    if (selectedChat) {
      const hasUnreads = chats.find(c => c.id === selectedChat && c.unreadCount > 0);
      if (hasUnreads) {
        axios.put(`${API}/messages/${selectedChat}/read`).catch(console.error);
        setChats(prev => prev.map(c => c.id === selectedChat ? { ...c, unreadCount: 0 } : c));
      }
    }
  }, [chats, selectedChat]);

  // ── Actions ──────────────────────────────────────────────
  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      await axios.delete(`${API}/messages/${chatToDelete}`);
      if (selectedChat === chatToDelete) { setSelectedChat(null); setMessages([]); }
      setChatToDelete(null);
      fetchChats();
    } catch (err) {
      alert('Söhbəti silmək mümkün olmadı.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedChat) return;
    setIsSending(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (newMessage.trim()) formData.append('caption', newMessage.trim());
        if (replyingTo) formData.append('replyToId', replyingTo._id);
        await axios.post(`${API}/device-messages/${selectedChat}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSelectedFile(null);
      } else {
        await axios.post(`${API}/device-messages/${selectedChat}`, { text: newMessage.trim(), replyToId: replyingTo?._id });
      }
      setNewMessage('');
      setReplyingTo(null);
      fetchDeviceMessages(selectedChat);
      fetchChats();
    } catch (err) {
      alert('Mesaj göndərilmədi.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEnhanceMessage = async () => {
    if (!newMessage.trim() || isEnhancing || isSending) return;
    setIsEnhancing(true);
    try {
      const res = await axios.post(`${API}/enhance-message`, { text: newMessage.trim() });
      if (res.data.success && res.data.text) setNewMessage(res.data.text);
    } catch (err) {
      alert(err.response?.data?.error || 'Süni intellekt hazırda mətni təhlil edə bilmir.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleLoadMore = () => {
    const newLimit = messageLimit + 50;
    setMessageLimit(newLimit);
    fetchDeviceMessages(selectedChat, newLimit);
  };

  // ── Guard: redirect if not connected ────────────────────
  if (whatsappStatus !== 'READY') return <Navigate to="/" replace />;

  // ── Resolved names ───────────────────────────────────────
  const resolvedName = contacts.find(c => c.phone === selectedChat)?.name
    || chats.find(c => c.id === selectedChat)?.name
    || (selectedChat ? `+${selectedChat.replace('@c.us', '')}` : '');

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ margin: '-3rem', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="glass-panel" style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(320px, 25%) 1fr', overflow: 'hidden', margin: 0, borderRadius: 0, border: 'none' }}>

        {/* Chat Sidebar */}
        {loading && chats.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="animate-pulse" style={{ color: 'var(--text-secondary)' }}>Çatlar sinxronizasiya olunur...</div>
          </div>
        ) : (
          <>
            <ChatSidebar
              chats={chats} contacts={contacts}
              selectedChat={selectedChat} setSelectedChat={setSelectedChat}
              setChats={setChats} fetchDeviceMessages={fetchDeviceMessages}
            />

            {/* Right Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              {!selectedChat ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <MessageSquare size={48} color="var(--glass-border)" style={{ marginBottom: '1rem' }} />
                  Məzmunu görmək üçün sol paneldən söhbət seçin
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30, 41, 59, 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {profilePicUrl ? <img src={profilePicUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="white" />}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{resolvedName}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>+{selectedChat?.replace('@c.us', '')}</span>
                      </div>
                    </div>
                    <button onClick={() => setChatToDelete(selectedChat)} className="btn"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Trash2 size={16} /> Söhbəti Sil
                    </button>
                  </div>

                  {/* Messages */}
                  <div ref={messagesContainerRef} onScroll={handleScroll}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'rgba(15, 23, 42, 0.3)', position: 'relative' }}>

                    {loadingMessages && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <Loader2 className="animate-spin" size={24} /> Mesajlar yüklənir...
                        </div>
                      </div>
                    )}

                    {/* Load More Button */}
                    {messages.length >= messageLimit && (
                      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '0.5rem' }}>
                        <button onClick={handleLoadMore} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                          Daha çox yüklə (+50)
                        </button>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg._id} msg={msg}
                        hoveredMessageId={hoveredMessageId}
                        setHoveredMessageId={setHoveredMessageId}
                        setReplyingTo={setReplyingTo}
                        setFullscreenImage={setFullscreenImage}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Bar */}
                  <ChatInput
                    selectedChat={selectedChat} contacts={contacts}
                    newMessage={newMessage} setNewMessage={setNewMessage}
                    selectedFile={selectedFile} setSelectedFile={setSelectedFile}
                    replyingTo={replyingTo} setReplyingTo={setReplyingTo}
                    isSending={isSending} isEnhancing={isEnhancing}
                    showAttachmentMenu={showAttachmentMenu} setShowAttachmentMenu={setShowAttachmentMenu}
                    onSend={handleSendMessage} onEnhance={handleEnhanceMessage}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {chatToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '2rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
              <button onClick={() => setChatToDelete(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '1.5rem' }}>
              <AlertTriangle size={32} color="var(--danger)" />
            </div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Əminsiniz?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
              <strong style={{ color: 'white' }}>+{chatToDelete?.replace('@c.us', '')}</strong> nömrəli istifadəçi ilə olan bütün yazışma tarixçəsi dərhal silinəcək.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white', border: 'none' }} onClick={handleDeleteChat}>Bəli, Sil</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setChatToDelete(null)}>Ləğv et</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setFullscreenImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={fullscreenImage} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }} alt="Full screen preview" onClick={e => e.stopPropagation()} />
            <div style={{ position: 'absolute', top: '1rem', right: '-4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button onClick={e => { e.stopPropagation(); setFullscreenImage(null); }}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--danger)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                title="Bağla"><X size={24} /></button>
              <button onClick={async e => {
                e.stopPropagation();
                const res = await fetch(fullscreenImage); const blob = await res.blob();
                const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
                a.href = url; a.download = `whatsart_image_${Date.now()}.jpg`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
              }}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--accent)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                title="Sənədi Yüklə"><Download size={24} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
