import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { QRCode } from 'react-qr-code';
import { Smartphone, MessageSquare, CheckCircle, Shield, Zap } from 'lucide-react';

export default function WhatsAppConnect({ setWhatsAppReady, setWaInfo }) {
  const [waStatus, setWaStatus] = useState('INITIALIZING');
  const [qrCode, setQrCode] = useState('');
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    let prevStatus = '';

    const handleStatus = (data) => {
      const { status, qr, phoneNumber, userName } = data;
      setQrCode(qr || '');

      // Detect scan: was WAITING_FOR_SCAN, now AUTHENTICATING
      if (prevStatus === 'WAITING_FOR_SCAN' && status === 'AUTHENTICATING') {
        setScanned(true);
      }

      // Reset scanned when going back to INITIALIZING/DISCONNECTED (server restart)
      if (status === 'INITIALIZING' || status === 'DISCONNECTED') {
        setScanned(false);
      }

      prevStatus = status;
      setWaStatus(status);

      if (status === 'READY' && phoneNumber) {
        setWaInfo({ phoneNumber, userName });
        setWhatsAppReady(true);
      }
    };

    // Use SSE for instant updates
    const es = new EventSource(`${API_BASE}/api/whatsapp/status-stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStatus(data);
      } catch (e) {}
    };
    es.onerror = () => {
      // SSE failed, will auto-reconnect
    };

    return () => es.close();
  }, [setWhatsAppReady, setWaInfo]);

  // Full-screen loading only after a fresh QR scan
  if (scanned) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', gap: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            background: 'var(--accent)',
            width: '52px', height: '52px',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--accent-glow)'
          }}>
            <MessageSquare color="white" size={28} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.05em', margin: 0 }}>WhatsArt</h1>
        </div>

        <div className="animate-spin" style={{
          width: '64px', height: '64px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: '#10b981',
          borderRadius: '50%'
        }}></div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            WhatsApp sinxronizasiya edilir...
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Zəhmət olmasa gözləyin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>

       <div className="glass-panel" style={{ 
         width: '100%', maxWidth: '900px', padding: 0, overflow: 'hidden',
         display: 'flex', flexDirection: 'row', minHeight: '500px'
       }}>
          
          {/* Left Side - Text */}
          <div style={{ 
            flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  background: 'var(--accent)',
                  width: '44px', height: '44px',
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 15px var(--accent-glow)'
                }}>
                  <MessageSquare color="white" size={24} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.05em', margin: 0 }}>WhatsArt</h1>
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.3 }}>
                WhatsApp-ı Bağlayın
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                Sistemə davam etmək üçün telefonunuzda WhatsApp-ı açın və QR Kodu skan edin.
              </p>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { icon: <Smartphone size={18} color="#10b981" />, text: 'Telefonunuzda WhatsApp tətbiqini açın' },
                { icon: <Shield size={18} color="#3b82f6" />, text: '"Bağlanmış cihazlar" (Linked Devices) seçin' },
                { icon: <Zap size={18} color="#f59e0b" />, text: 'QR kodu telefonunuz ilə skan edin' },
              ].map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - QR Code */}
          <div style={{ 
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.15)', borderLeft: '1px solid var(--glass-border)',
            padding: '3rem'
          }}>
            <div style={{ 
              background: 'white', padding: '1.5rem', borderRadius: '20px', 
              boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: '280px', minHeight: '280px'
            }}>
               {waStatus === 'INITIALIZING' || waStatus === 'DISCONNECTED' ? (
                  <div style={{ color: '#444', textAlign: 'center' }}>
                      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>Sistem hazırlanır...</div>
                  </div>
               ) : qrCode && waStatus === 'WAITING_FOR_SCAN' ? (
                  <QRCode value={qrCode} size={250} />
               ) : waStatus === 'READY' ? (
                  <div style={{ textAlign: 'center' }}>
                    <CheckCircle size={56} color="#10b981" style={{ marginBottom: '0.75rem' }} />
                    <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.3rem' }}>Bağlanıldı!</div>
                  </div>
               ) : (
                  <div style={{ color: '#444', textAlign: 'center' }}>
                    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#f59e0b', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>Yüklənir...</div>
                  </div>
               )}
            </div>
          </div>

       </div>
    </div>
  );
}
