import React, { useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Plus, FileText, Image as ImageIcon, X, Sparkles, Loader2 } from 'lucide-react';

export default function ChatInput({
  selectedChat, contacts, newMessage, setNewMessage,
  selectedFile, setSelectedFile, replyingTo, setReplyingTo,
  isSending, isEnhancing, showAttachmentMenu, setShowAttachmentMenu,
  onSend, onEnhance
}) {
  const fileInputRef = useRef(null);
  const attachmentMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachmentMenu, setShowAttachmentMenu]);

  return (
    <div style={{ padding: '1rem 1.5rem', background: 'rgba(30, 41, 59, 0.4)', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      {/* Reply Preview */}
      {replyingTo && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderLeft: '4px solid var(--accent)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
              {replyingTo.isBotReply ? 'Siz' : (contacts.find(c => c.phone === selectedChat)?.name || `+${selectedChat?.replace('@c.us', '')}`)}
            </span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyingTo.text || (replyingTo.hasMedia ? '📷 Şəkil / Media' : 'Mesaj')}
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }} title="Ləğv et">
            <X size={18} />
          </button>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', width: 'fit-content' }}>
          <FileText size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '0.85rem', color: 'white', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={onSend} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
        />

        {/* Attachment Button */}
        <div style={{ position: 'relative' }} ref={attachmentMenuRef}>
          {showAttachmentMenu && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '0', background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50, minWidth: '200px' }}>
              <button type="button" onClick={() => { fileInputRef.current.accept = '*/*'; fileInputRef.current.click(); setShowAttachmentMenu(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem', width: '100%', borderRadius: '12px', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <FileText size={20} color="var(--accent)" /> Sənəd
              </button>
              <button type="button" onClick={() => { fileInputRef.current.accept = 'image/*,video/*'; fileInputRef.current.click(); setShowAttachmentMenu(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem', width: '100%', borderRadius: '12px', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <ImageIcon size={20} color="#3b82f6" /> Şəkil & Video
              </button>
            </div>
          )}
          <button type="button" onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.6rem', borderRadius: '50%', background: 'transparent', color: '#8696A0', border: 'none', cursor: 'pointer', transform: showAttachmentMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s', position: 'relative', zIndex: 60 }}
            title="Media Göndər">
            <Plus size={28} />
          </button>
        </div>

        {/* Text Input with AI Enhance */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder={selectedFile ? 'Şəkil üçün açıqlama yazın...' : 'Mesajınızı bura yazın...'}
            style={{ flex: 1, padding: '0.8rem 3rem 0.8rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', fontSize: '0.95rem' }}
            disabled={isSending || isEnhancing}
          />
          <button type="button" onClick={onEnhance} disabled={!newMessage.trim() || isEnhancing || isSending}
            style={{ position: 'absolute', right: '0.4rem', background: newMessage.trim() ? 'linear-gradient(135deg, #a855f7, #3b82f6)' : 'transparent', border: 'none', color: newMessage.trim() ? 'white' : 'var(--text-secondary)', borderRadius: '6px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!newMessage.trim() || isEnhancing || isSending) ? 'not-allowed' : 'pointer', opacity: (!newMessage.trim() || isSending) ? 0.5 : 1, transition: 'all 0.2s', boxShadow: newMessage.trim() ? '0 0 10px rgba(168,85,247,0.3)' : 'none' }}
            title="Mətni Süni İntellektlə Təkmilləşdir">
            {isEnhancing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          </button>
        </div>

        {/* Send Button */}
        <button type="submit" disabled={(!newMessage.trim() && !selectedFile) || isSending} className="btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8rem', borderRadius: '8px', minWidth: '48px', background: ((!newMessage.trim() && !selectedFile) || isSending) ? 'var(--glass-border)' : 'linear-gradient(135deg, #a855f7, #3b82f6)', color: 'white', border: 'none', cursor: ((!newMessage.trim() && !selectedFile) || isSending) ? 'not-allowed' : 'pointer', opacity: isSending ? 0.7 : 1 }}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
