import React, { useState } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import { auth } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { supabase } from '../config/supabase';
import Toast from '../components/Toast';

const Register = ({ switchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // FORCE DEVELOPER
  const FORCE_DEVELOPER_EMAILS = [
    'zaki5go@gmail.com',
    'zaki5go2@gmail.com',
    'zaki9go@gmail.com'
  ];

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast('Email dan password wajib diisi!', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password minimal 6 karakter!', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Password tidak cocok!', 'error');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // FORCE ROLE
      const isDeveloper = FORCE_DEVELOPER_EMAILS.includes(email);
      const role = isDeveloper ? 'developer' : 'user';
      
      // Simpan user ke Supabase dengan FORCE ROLE
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          { 
            email: email, 
            uid: userCredential.user.uid,
            name: isDeveloper ? 'Zaki Developer' : email.split('@')[0],
            role: role, // <-- FORCE
            created_at: new Date().toISOString()
          }
        ]);
        
      if (insertError) {
        console.error('Error saving user:', insertError);
        showToast(`✅ Register berhasil! Tapi role: ${role}`, 'success');
      } else {
        showToast(`✅ Register berhasil! Role: ${role.toUpperCase()}`, 'success');
      }
      
      setTimeout(() => switchToLogin(), 1500);
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Email sudah terdaftar!',
        'auth/too-many-requests': 'Terlalu banyak permintaan. Tunggu beberapa menit.',
        'auth/invalid-email': 'Email tidak valid!'
      };
      showToast(messages[err.code] || err.message, 'error');
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
            <h2>📝 Register</h2>
            <div className="text-muted small">Buat akun baru</div>
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
              {FORCE_DEVELOPER_EMAILS.includes(email) && (
                <small className="text-warning">⭐ Akan jadi DEVELOPER!</small>
              )}
            </Form.Group>

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

            <Form.Group className="mb-3">
              <Form.Label>Konfirmasi Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-dark text-light border-secondary"
                required
              />
            </Form.Group>

            <Button 
              variant="success" 
              type="submit" 
              className="w-100"
              disabled={loading}
            >
              {loading ? '⏳ Memproses...' : '📝 Register'}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Button variant="link" className="text-warning p-0" onClick={switchToLogin}>
              Sudah punya akun? Login
            </Button>
          </div>

          <div className="text-center mt-3">
            <span className="badge bg-warning text-dark">⚡ Mode Testing</span>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Register;