// App.js - dengan Dashboard di background
import React, { useState, useEffect } from 'react';
import { Container, Modal } from 'react-bootstrap';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Toast from './components/Toast';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('login');
  const [showAuthOverlay, setShowAuthOverlay] = useState(false); // FALSE default - dashboard terlihat dulu
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Fungsi showToast
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Jika user login, tutup overlay auth
      if (user) {
        setShowAuthOverlay(false);
      }
      // Jika user logout, TIDAK otomatis tampilkan overlay
      // Biarkan user melihat dashboard dulu
    });
    return () => unsubscribe();
  }, []);

  // === LISTENER UNTUK SHOW LOGIN DARI KOMPONEN LAIN ===
  useEffect(() => {
    const handleShowLogin = () => {
      if (!user) {
        setShowAuthOverlay(true);
        setPage('login');
        showToast('⚠️ Silakan login terlebih dahulu!', 'warning');
      }
    };

    const handleRequireLogin = () => {
      if (!user) {
        setShowAuthOverlay(true);
        setPage('login');
        showToast('⚠️ Silakan login untuk melanjutkan!', 'warning');
      }
    };

    // Event untuk menutup overlay dari dalam (misal setelah login sukses)
    const handleCloseAuth = () => {
      if (user) {
        setShowAuthOverlay(false);
      }
    };

    // Event untuk membuka overlay dari tombol login di dashboard
    const handleOpenLogin = () => {
      if (!user) {
        setShowAuthOverlay(true);
        setPage('login');
      }
    };

    window.addEventListener('showLogin', handleShowLogin);
    window.addEventListener('requireLogin', handleRequireLogin);
    window.addEventListener('closeAuth', handleCloseAuth);
    window.addEventListener('openLogin', handleOpenLogin);

    return () => {
      window.removeEventListener('showLogin', handleShowLogin);
      window.removeEventListener('requireLogin', handleRequireLogin);
      window.removeEventListener('closeAuth', handleCloseAuth);
      window.removeEventListener('openLogin', handleOpenLogin);
    };
  }, [user]);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center text-light">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Memuat aplikasi...</p>
        </div>
      </Container>
    );
  }

  const renderAuthPage = () => {
    switch (page) {
      case 'register':
        return <Register switchToLogin={() => setPage('login')} />;
      case 'forgot':
        return <ForgotPassword switchToLogin={() => setPage('login')} />;
      default:
        return (
          <Login 
            onLogin={() => {
              setShowAuthOverlay(false);
              // Trigger event untuk refresh data setelah login
              window.dispatchEvent(new CustomEvent('userLoggedIn'));
            }} 
            switchToRegister={() => setPage('register')}
            switchToForgot={() => setPage('forgot')}
          />
        );
    }
  };

  // Selalu tampilkan Dashboard, dengan overlay auth di atasnya jika diperlukan
  return (
    <div className="App" style={{ position: 'relative' }}>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />
      
      {/* Dashboard selalu dirender */}
      <Dashboard />
      
      {/* Overlay Auth - muncul hanya jika showAuthOverlay true */}
      {!user && showAuthOverlay && (
        <div 
          className="auth-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(11, 14, 20, 0.92)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeInOverlay 0.4s ease'
          }}
        >
          <div style={{ maxWidth: '450px', width: '100%' }}>
            {renderAuthPage()}
          </div>
        </div>
      )}
      
      {/* CSS untuk animasi */}
      <style>
        {`
          @keyframes fadeInOverlay {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;