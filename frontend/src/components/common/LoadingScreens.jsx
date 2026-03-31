import React from 'react';
import { MessageSquare, Wifi, WifiOff } from 'lucide-react';

const ringKeyframes = `
@keyframes loadRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes fadeInUp {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
`;

function BouncingDots({ color = 'rgba(255,255,255,0.7)' }) {
  return (
    <span style={{ display: 'inline-flex', gap: '4px', marginLeft: '4px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: '5px', height: '5px', borderRadius: '50%', background: color, display: 'inline-block',
          animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`
        }} />
      ))}
    </span>
  );
}

/** Splash screen shown during initial status check */
export function SplashScreen() {
  return (
    <>
      <style>{ringKeyframes}</style>
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0b1120',
        backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
        overflow: 'hidden', position: 'relative'
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)',
          filter: 'blur(40px)', animation: 'glowPulse 3s ease-in-out infinite'
        }} />

        {/* Spinning ring */}
        <div style={{ position: 'relative', width: '96px', height: '96px', animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid rgba(59, 130, 246, 0.1)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#3b82f6', borderRightColor: 'rgba(59,130,246,0.4)',
            animation: 'loadRing 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
          }} />
          {/* Icon center */}
          <div style={{
            position: 'absolute', inset: '12px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MessageSquare size={28} color="#60a5fa" strokeWidth={2} />
          </div>
        </div>

        {/* Text */}
        <div style={{ marginTop: '2rem', textAlign: 'center', animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>
          <h2 style={{
            fontSize: '1.35rem', fontWeight: 700, color: 'white', margin: 0,
            letterSpacing: '-0.02em'
          }}>
            WhatsArt
          </h2>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', marginTop: '0.75rem',
            color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.9rem'
          }}>
            <Wifi size={15} />
            <span>Bağlantı yoxlanılır</span>
            <BouncingDots color="rgba(148, 163, 184, 0.6)" />
          </div>
        </div>
      </div>
    </>
  );
}

/** Disconnecting overlay shown during WhatsApp logout */
export function DisconnectingScreen() {
  return (
    <>
      <style>{ringKeyframes}</style>
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0b1120',
        backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(239, 68, 68, 0.06) 0%, transparent 60%)',
        overflow: 'hidden', position: 'relative'
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.1), transparent 70%)',
          filter: 'blur(40px)', animation: 'glowPulse 2s ease-in-out infinite'
        }} />

        {/* Spinning ring */}
        <div style={{ position: 'relative', width: '96px', height: '96px', animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid rgba(239, 68, 68, 0.1)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#ef4444', borderRightColor: 'rgba(239,68,68,0.4)',
            animation: 'loadRing 1s cubic-bezier(0.5, 0, 0.5, 1) infinite',
          }} />
          {/* Icon center */}
          <div style={{
            position: 'absolute', inset: '12px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.1))',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <WifiOff size={28} color="#f87171" strokeWidth={2} />
          </div>
        </div>

        {/* Text */}
        <div style={{ marginTop: '2rem', textAlign: 'center', animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>
          <h2 style={{
            fontSize: '1.35rem', fontWeight: 700, color: 'white', margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Əlaqə Kəsilir
          </h2>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', marginTop: '0.75rem',
            color: 'rgba(248, 113, 113, 0.7)', fontSize: '0.9rem'
          }}>
            <span>WhatsApp sessiyası bağlanır</span>
            <BouncingDots color="rgba(248, 113, 113, 0.6)" />
          </div>
        </div>
      </div>
    </>
  );
}
