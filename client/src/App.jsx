import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getProfile, isLoggedIn, setToken } from './api';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AuthorWords from './pages/AuthorWords';
import MatchResult from './pages/MatchResult';
import Chat from './pages/Chat';
import ChatList from './pages/ChatList';
import Soul from './pages/Soul';

const SKIP_SPLASH_KEY = 'relationship_match_skip_splash';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem(SKIP_SPLASH_KEY));

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }
    getProfile()
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const onLogin = (data) => {
    setToken(data.token);
    setUser({
      id: data.userId,
      email: data.email,
      nickname: data.nickname,
      profile: data.needOnboarding ? null : undefined,
    });
    if (!data.needOnboarding) {
      getProfile().then(setUser).catch(() => setToken(null));
    }
  };

  const onRegister = (data) => {
    setToken(data.token);
    setUser({
      id: data.userId,
      email: data.email,
      nickname: data.nickname,
      profile: null,
    });
  };

  const onLogout = () => {
    setToken(null);
    setUser(null);
  };

  const refreshUser = () => {
    if (!isLoggedIn()) return;
    getProfile().then(setUser).catch(() => setToken(null));
  };

  if (showSplash) {
    return (
      <Splash
        onFinish={() => {
          setShowSplash(false);
        }}
        onSkipForever={() => {
          localStorage.setItem(SKIP_SPLASH_KEY, '1');
          setShowSplash(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d', color: '#a0a0a0' }}>
        加载中…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={onLogin} />} />
        <Route path="/register" element={user ? <Navigate to="/onboarding" replace /> : <Register onRegister={onRegister} />} />
        <Route path="/onboarding" element={user && !user.profile ? <Onboarding user={user} onDone={refreshUser} /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />
        <Route path="/" element={user ? <Home user={user} onLogout={onLogout} refreshUser={refreshUser} /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={user?.profile ? <Profile user={user} onLogout={onLogout} refreshUser={refreshUser} /> : user ? <Navigate to="/onboarding" replace /> : <Navigate to="/login" replace />} />
        <Route path="/author" element={<AuthorWords />} />
        <Route path="/match/:partnerId" element={user?.profile ? <MatchResult user={user} /> : user ? <Navigate to="/onboarding" replace /> : <Navigate to="/login" replace />} />
        <Route path="/chats" element={user?.profile ? <ChatList user={user} onLogout={onLogout} /> : user ? <Navigate to="/onboarding" replace /> : <Navigate to="/login" replace />} />
        <Route path="/soul" element={user?.profile ? <Soul /> : user ? <Navigate to="/onboarding" replace /> : <Navigate to="/login" replace />} />
        <Route path="/chat/:partnerId" element={user?.profile ? <Chat user={user} /> : user ? <Navigate to="/onboarding" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
