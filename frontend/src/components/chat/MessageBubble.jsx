import React from 'react';
import API_BASE from '../../config/api';
import { Bot, User, Reply, Download } from 'lucide-react';

export default function MessageBubble({ msg, hoveredMessageId, setHoveredMessageId, setReplyingTo, setFullscreenImage }) {
  const handleDownloadImage = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `whatsart_image_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Şəkli yükləmək mümkün olmadı');
    }
  };

  const isHovered = hoveredMessageId === msg._id;

  return (
    <div
      onMouseEnter={() => setHoveredMessageId(msg._id)}
      onMouseLeave={() => setHoveredMessageId(null)}
      style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: msg.isBotReply ? 'flex-end' : 'flex-start' }}
    >
      {/* Reply button for bot messages (appears left of bubble) */}
      {msg.isBotReply && isHovered && (
        <button onClick={() => setReplyingTo(msg)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'} title="Cavabla">
          <Reply size={18} />
        </button>
      )}

      {/* User avatar for incoming messages */}
      {!msg.isBotReply && (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <User size={16} color="var(--text-secondary)" />
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '70%', padding: '1rem 1.25rem', borderRadius: '12px',
        background: msg.isBotReply ? 'var(--accent)' : 'var(--glass-panel)',
        boxShadow: msg.isBotReply ? '0 4px 15px rgba(59, 130, 246, 0.2)' : '0 2px 10px rgba(0,0,0,0.1)',
        border: msg.isBotReply ? 'none' : '1px solid var(--glass-border)'
      }}>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'white', fontSize: '0.95rem' }}>
          {msg.hasMedia ? (
            <div>
              {msg.type === 'image' && (
                <img
                  src={`${API_BASE}/api/whatsapp/media/${msg._id}`}
                  style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', minHeight: '100px', cursor: 'pointer', transition: 'transform 0.2s' }}
                  alt="Şəkil yüklənə bilmədi" loading="lazy" title="Böyütmək üçün klikləyin"
                  onClick={() => setFullscreenImage(`${API_BASE}/api/whatsapp/media/${msg._id}`)}
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML += '<div style="color:var(--danger);font-size:0.8rem">⚠️ Şəkil WhatsApp serverindən silinib</div>'; }}
                />
              )}
              {msg.type === 'video' && <video src={`${API_BASE}/api/whatsapp/media/${msg._id}`} style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '300px', background: 'black' }} controls preload="metadata" />}
              {(msg.type === 'ptt' || msg.type === 'audio') && <audio src={`${API_BASE}/api/whatsapp/media/${msg._id}`} controls style={{ maxWidth: '100%', height: '40px' }} />}
              {msg.type === 'document' && <a href={`${API_BASE}/api/whatsapp/media/${msg._id}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>📄 Sənədi yüklə</a>}
              {!['image', 'video', 'ptt', 'audio', 'document'].includes(msg.type) && <span style={{ color: 'var(--text-secondary)' }}>📄 Dəstəklənməyən media ({msg.type})</span>}
              {msg.text && !msg.text.includes('[Media]') && <div style={{ marginTop: '0.5rem' }}>{msg.text}</div>}
            </div>
          ) : msg.text}
        </div>
        <div style={{ fontSize: '0.7rem', marginTop: '0.4rem', textAlign: 'right', color: msg.isBotReply ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>

      {/* Bot avatar for outgoing messages */}
      {msg.isBotReply && (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(168,85,247,0.4)', flexShrink: 0 }}>
          <Bot size={16} color="white" />
        </div>
      )}

      {/* Reply button for incoming messages (appears right of bubble) */}
      {!msg.isBotReply && isHovered && (
        <button onClick={() => setReplyingTo(msg)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'} title="Cavabla">
          <Reply size={18} />
        </button>
      )}
    </div>
  );
}
