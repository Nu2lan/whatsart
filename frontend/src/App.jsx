import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config/api';

// Layout
import AppLayout from './components/layout/AppLayout';
import { SplashScreen, DisconnectingScreen } from './components/common/LoadingScreens';

// Pages
import Campaigns from './pages/Campaigns';
import ChatLogs from './pages/ChatLogs';
import Dashboard from './pages/Dashboard';
import WhatsAppConnect from './pages/WhatsAppConnect';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isWhatsAppReady, setIsWhatsAppReady] = useState(false);
  const [waInfo, setWaInfo] = useState({ phoneNumber: '', userName: '' });
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Initial status check to prevent QR flash on reload
  useEffect(() => {
    axios.get(`${API_BASE}/api/whatsapp/status`)
      .then(res => {
        if (res.data.status === 'READY' && res.data.phoneNumber) {
          setWaInfo({ phoneNumber: res.data.phoneNumber, userName: res.data.userName });
          setIsWhatsAppReady(true);
        }
      })
      .finally(() => {
        setTimeout(() => setIsInitializing(false), 300);
      });
  }, []);

  // SSE-based disconnect detection — stays active while ready
  useEffect(() => {
    if (!isWhatsAppReady) return;
    let disconnected = false;

    const triggerDisconnect = () => {
      if (disconnected) return;
      disconnected = true;
      setIsDisconnecting(true);
      setTimeout(() => {
        setIsWhatsAppReady(false);
        setWaInfo({ phoneNumber: '', userName: '' });
        setIsDisconnecting(false);
      }, 3000);
    };

    const es = new EventSource(`${API_BASE}/api/whatsapp/status-stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'DISCONNECTED') {
          es.close();
          triggerDisconnect();
        }
      } catch (e) {}
    };
    es.onerror = () => {
      es.close();
      axios.get(`${API_BASE}/api/whatsapp/status`)
        .then(res => {
          if (res.data.status === 'DISCONNECTED') triggerDisconnect();
        })
        .catch(() => triggerDisconnect());
    };

    return () => es.close();
  }, [isWhatsAppReady]);

  const layoutProps = { waInfo, setIsWhatsAppReady, setIsDisconnecting, setWaInfo };

  return (
    <Router>
      {isInitializing && <SplashScreen />}
      {!isInitializing && isDisconnecting && <DisconnectingScreen />}
      {!isInitializing && !isDisconnecting && !isWhatsAppReady && (
        <>
          <Navigate to="/" replace />
          <WhatsAppConnect setWhatsAppReady={setIsWhatsAppReady} setWaInfo={setWaInfo} />
        </>
      )}
      {!isInitializing && !isDisconnecting && isWhatsAppReady && (
        <Routes>
          <Route path="/" element={<AppLayout {...layoutProps}><Dashboard waInfo={waInfo} /></AppLayout>} />
          <Route path="/campaigns" element={<AppLayout {...layoutProps}><Campaigns /></AppLayout>} />
          <Route path="/logs" element={<AppLayout {...layoutProps}><ChatLogs /></AppLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
