import React, { useState } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import { auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Toast from '../components/Toast';
import { getErrorMessage } from '../utils/helpers';

const ForgotPassword = ({ switchToLogin }) => {
  const [email, setEmail] = useState('');
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

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`📧 Link reset password dikirim ke ${email}`, 'success');
      setTimeout(() => switchToLogin(), 2000);
    } catch (err) {
      showToast(getErrorMessage(err.code), 'error');
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
            <h2>📧 Lupa Password</h2>
            <div className="text-muted small">Reset password Anda</div>
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

            <Button 
              variant="warning" 
              type="submit" 
              className="w-100"
              disabled={loading}
            >
              {loading ? '⏳ Memproses...' : '📧 Kirim Reset Password'}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <Button 
              variant="link" 
              className="text-info p-0"
              onClick={switchToLogin}
            >
              Kembali ke Login
            </Button>
          </div>

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

export default ForgotPassword;