import React from 'react';
import axios from 'axios';
import API_BASE from '../../config/api';
import { MessageSquare } from 'lucide-react';

export default function ChatSidebar({ chats, contacts, selectedChat, setSelectedChat, setChats, fetchDeviceMessages }) {
  return (
    <div style={{ borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)', fontWeight: 600 }}>
        Aktiv Söhbətlər
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {chats.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '4rem' }}>
            <MessageSquare size={48} color="var(--glass-border)" />
            <p style={{ color: 'var(--text-secondary)' }}>Aktiv söhbət tapılmadı.</p>
          </div>
        ) : chats.map((chat) => {
          const partner = chat.id;
          const knownContact = contacts.find(c => c.phone === partner);
          const isSelected = selectedChat === partner;
          const displayTitle = knownContact?.name || chat.name || partner?.replace('@c.us', '');
          const unreadCount = chat.unreadCount;

          return (
            <div
              key={partner}
              onClick={() => {
                setSelectedChat(partner);
                fetchDeviceMessages(partner);
                if (unreadCount > 0) {
                  axios.put(`${API_BASE}/api/whatsapp/messages/${partner}/read`).catch(console.error);
                  setChats(prev => prev.map(c => c.id === partner ? { ...c, unreadCount: 0 } : c));
                }
              }}
              style={{
                padding: '1.25rem',
                borderBottom: '1px solid var(--glass-border)',
                cursor: 'pointer',
                background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                transition: '0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                  {displayTitle}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  fontSize: '0.85rem', color: unreadCount > 0 ? 'white' : 'var(--text-secondary)', fontWeight: unreadCount > 0 ? '600' : 'normal',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, paddingRight: '0.5rem'
                }}>
                  {chat.lastSenderClient ? '🤖 ' : '👤 '}{chat.lastMessage}
                </div>
                {unreadCount > 0 && (
                  <div style={{
                    background: 'var(--success)', color: 'white',
                    fontSize: '0.75rem', fontWeight: 600,
                    borderRadius: '50%', minWidth: '22px', height: '22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0,
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
                  }}>
                    {unreadCount}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
