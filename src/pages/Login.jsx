import React, { useState } from 'react';
import { Container, Card, Form, Button, InputGroup } from 'react-bootstrap';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { Eye, EyeOff } from 'lucide-react';

const Login = ({ onLogin, switchToRegister, switchToForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const { refreshAuth } = useAuth();

  // List email developer
  const DEVELOPER_EMAILS = [
    'zaki5go@gmail.com',
    'zaki5go2@gmail.com',
    'zaki9go@gmail.com'
  ];

  // Show toast with auto clear
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast('Email dan password wajib diisi!', 'error');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Cek apakah email termasuk developer
      const isDeveloper = DEVELOPER_EMAILS.includes(email);
      
      if (isDeveloper) {
        // Update role menjadi developer di Supabase
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            role: 'developer',
            uid: userCredential.user.uid,
            updated_at: new Date().toISOString()
          })
          .eq('email', email);

        if (updateError) {
          console.error('Error updating user role:', updateError);
        } else {
          console.log('✅ Role updated to developer for:', email);
          // Refresh role setelah update
          await refreshAuth();
        }
      }
      
      showToast('✅ Login berhasil!', 'success');
      
      // Dispatch event untuk menutup overlay dan refresh data
      window.dispatchEvent(new CustomEvent('closeAuth'));
      window.dispatchEvent(new CustomEvent('userLoggedIn'));
      
      // Panggil onLogin untuk navigasi
      setTimeout(() => {
        if (onLogin && typeof onLogin === 'function') {
          onLogin();
        }
      }, 500);
      
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'Email tidak terdaftar!',
        'auth/wrong-password': 'Password salah!',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa menit.',
        'auth/invalid-email': 'Email tidak valid!',
        'auth/network-request-failed': 'Koneksi internet bermasalah!'
      };
      showToast(messages[err.code] || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key submit
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Toggle show password
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      
      <Card bg="dark" text="light" className="p-4" style={{ maxWidth: '420px', width: '100%', borderRadius: '16px', border: '1px solid #2a3444' }}>
        <Card.Body>
          <Card.Title className="text-center mb-3">
            <h2 style={{ color: '#ff9100' }}>🔐 Login</h2>
            <div className="text-muted small">Masuk ke Toko App</div>
          </Card.Title>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-dark text-light border-secondary"
                style={{ borderRadius: '12px', padding: '12px 16px' }}
                required
                autoFocus
              />
              {DEVELOPER_EMAILS.includes(email) && (
                <small className="text-warning d-block mt-1">⭐ Developer Account</small>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="bg-dark text-light border-secondary"
                  style={{ borderRadius: '12px 0 0 12px', padding: '12px 16px' }}
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={toggleShowPassword}
                  className="border-secondary"
                  style={{ 
                    borderRadius: '0 12px 12px 0', 
                    background: 'transparent',
                    borderColor: '#2a3444',
                    color: '#8892a8',
                    padding: '0 16px'
                  }}
                  type="button"
                  onMouseEnter={(e) => {
                    e.target.style.color = '#ff9100';
                    e.target.style.borderColor = '#ff9100';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#8892a8';
                    e.target.style.borderColor = '#2a3444';
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Button 
              variant="warning" 
              type="submit" 
              className="w-100 fw-bold"
              disabled={loading}
              style={{ borderRadius: '12px', padding: '14px', fontSize: '16px' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Memproses...
                </>
              ) : (
                '🔑 Login'
              )}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Button 
              variant="link" 
              className="text-warning p-0" 
              onClick={switchToRegister}
              style={{ textDecoration: 'none' }}
            >
              Belum punya akun? <strong>Daftar</strong>
            </Button>
          </div>

          <div className="text-center mt-2">
            <Button 
              variant="link" 
              className="text-info p-0" 
              onClick={switchToForgot}
              style={{ textDecoration: 'none', fontSize: '14px' }}
            >
              Lupa password?
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;