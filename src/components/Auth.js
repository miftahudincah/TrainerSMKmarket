import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import Toast from './Toast';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      showToast('Email wajib diisi!', 'error');
      return;
    }

    if (!isForgot && !password) {
      showToast('Password wajib diisi!', 'error');
      return;
    }

    if (!isForgot && password.length < 6) {
      showToast('Password minimal 6 karakter!', 'error');
      return;
    }

    setLoading(true);

    try {
      if (isForgot) {
        await sendPasswordResetEmail(auth, email);
        showToast(`📧 Link reset password dikirim ke ${email}`, 'success');
        setIsForgot(false);
        setIsLogin(true);
        setPassword('');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('✅ Login berhasil!', 'success');
        onLogin();
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('✅ Register berhasil!', 'success');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        showToast('❌ Email tidak terdaftar!', 'error');
      } else if (err.code === 'auth/wrong-password') {
        showToast('❌ Password salah!', 'error');
      } else if (err.code === 'auth/email-already-in-use') {
        showToast('❌ Email sudah terdaftar!', 'error');
      } else if (err.code === 'auth/too-many-requests') {
        showToast('⏳ Terlalu banyak permintaan. Tunggu beberapa menit.', 'warning');
      } else {
        showToast('❌ ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      
      <Card bg="dark" text="light" className="p-4" style={{ maxWidth: '420px', width: '100%' }}>
        <Card.Body>
          <Card.Title className="text-center mb-3">
            <h2>🔐 Toko App</h2>
            <div className="text-muted small">
              {isForgot ? 'Reset Password' : isLogin ? 'Login' : 'Register'}
            </div>
          </Card.Title>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-dark text-light border-secondary"
                required
              />
            </Form.Group>

            {!isForgot && (
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-dark text-light border-secondary"
                  required
                />
              </Form.Group>
            )}

            <Button 
              variant={isForgot ? 'warning' : isLogin ? 'primary' : 'success'} 
              type="submit" 
              className="w-100"
              disabled={loading}
            >
              {loading ? '⏳ Memproses...' : 
                isForgot ? '📧 Kirim Reset Password' : 
                isLogin ? '🔑 Login' : '📝 Register'}
            </Button>
          </Form>

          <div className="text-center mt-3">
            {!isForgot && (
              <Button 
                variant="link" 
                className="text-warning p-0"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword('');
                }}
              >
                {isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
              </Button>
            )}
          </div>

          {isLogin && !isForgot && (
            <div className="text-center mt-2">
              <Button 
                variant="link" 
                className="text-info p-0"
                onClick={() => {
                  setIsForgot(true);
                  setPassword('');
                }}
              >
                Lupa password?
              </Button>
            </div>
          )}

          {isForgot && (
            <div className="text-center mt-2">
              <Button 
                variant="link" 
                className="text-info p-0"
                onClick={() => {
                  setIsForgot(false);
                  setIsLogin(true);
                }}
              >
                Kembali ke Login
              </Button>
            </div>
          )}

          <div className="text-center mt-3">
            <span className="badge bg-warning text-dark">
              ⚡ Mode Testing
            </span>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Auth;