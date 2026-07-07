import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Image, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase, BUCKET, getPublicUrl } from '../config/supabase';
import { auth } from '../config/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import Toast from '../components/Toast';
import { validateImage } from '../utils/helpers';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Trash2, 
  Save, 
  Key, 
  Lock,
  Pencil,
  LogOut,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Profile = () => {
  const { user, userRole, refreshRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    avatar_url: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Load profile data
  useEffect(() => {
    if (user?.email) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          role: data.role || '',
          avatar_url: data.avatar_url || ''
        });
        if (data.avatar_url) {
          setAvatarPreview(getPublicUrl(data.avatar_url));
        }
      } else {
        setProfile({
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: '',
          address: '',
          role: 'user',
          avatar_url: ''
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      showToast('Gagal load profil: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImage(file);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      e.target.value = '';
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Upload avatar to Supabase
  const uploadAvatar = async (oldAvatarUrl) => {
    if (!avatarFile) return null;

    const timestamp = Date.now();
    const ext = avatarFile.name.split('.').pop();
    const filename = `avatar_${user.uid}_${timestamp}.${ext}`;

    if (oldAvatarUrl) {
      try {
        const oldFilename = oldAvatarUrl.split('/').pop();
        await supabase.storage.from(BUCKET).remove([oldFilename]);
      } catch (err) {
        console.error('Error deleting old avatar:', err);
      }
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, avatarFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return filename;
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      showToast('Nama wajib diisi!', 'error');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    
    try {
      let avatarFilename = profile.avatar_url;

      if (avatarFile) {
        avatarFilename = await uploadAvatar(profile.avatar_url);
      }

      const updateData = {
        name: profile.name.trim(),
        phone: profile.phone || null,
        address: profile.address || null,
        avatar_url: avatarFilename || null,
        updated_at: new Date().toISOString()
      };

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      let result;
      
      if (existingUser) {
        const { data, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('email', user.email)
          .select();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('users')
          .insert([
            {
              email: user.email,
              uid: user.uid,
              name: profile.name.trim(),
              phone: profile.phone || null,
              address: profile.address || null,
              role: 'user',
              avatar_url: avatarFilename || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select();

        if (error) throw error;
        result = data;
      }

      if (result && result.length > 0) {
        const updatedProfile = result[0];
        setProfile({
          ...profile,
          name: updatedProfile.name || profile.name,
          phone: updatedProfile.phone || '',
          address: updatedProfile.address || '',
          avatar_url: updatedProfile.avatar_url || ''
        });
        
        if (updatedProfile.avatar_url) {
          setAvatarPreview(getPublicUrl(updatedProfile.avatar_url));
        }
      }

      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setSaveSuccess(true);
      showToast('✅ Profil berhasil diupdate!', 'success');
      await refreshRole();
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('❌ Gagal update profil: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Semua field password wajib diisi!', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password baru minimal 6 karakter!', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Password baru tidak cocok!', 'error');
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
      showToast('✅ Password berhasil diubah!', 'success');
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        showToast('❌ Password saat ini salah!', 'error');
      } else if (err.code === 'auth/too-many-requests') {
        showToast('⏳ Terlalu banyak percobaan. Tunggu beberapa menit.', 'warning');
      } else {
        showToast('❌ Gagal ubah password: ' + err.message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    if (!profile.avatar_url) return;

    if (!window.confirm('Yakin ingin menghapus foto profil?')) return;

    setSaving(true);
    try {
      const filename = profile.avatar_url.split('/').pop();
      const { error } = await supabase.storage.from(BUCKET).remove([filename]);
      if (error) throw error;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: '' });
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('🗑 Foto profil dihapus', 'success');
    } catch (err) {
      console.error('Error removing avatar:', err);
      showToast('❌ Gagal hapus foto: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="warning" size="lg" />
          <p className="mt-3 text-muted">Loading profil...</p>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="px-3 px-md-4">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h3 className="text-light fw-bold mb-0">👤 Profil Saya</h3>
          <p className="text-muted small mb-0">Kelola informasi akun Anda</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {saveSuccess && (
            <div className="text-success d-flex align-items-center">
              <CheckCircle size={20} className="me-1" />
              <small className="fw-bold">Tersimpan!</small>
            </div>
          )}
          <Badge 
            bg={userRole === 'developer' ? 'danger' : userRole === 'owner' ? 'warning' : 'info'} 
            className="px-3 py-2"
            style={{ fontSize: '12px' }}
          >
            {userRole?.toUpperCase() || 'USER'}
          </Badge>
        </div>
      </div>

      <Row className="g-4">
        {/* Avatar Section */}
        <Col lg={4}>
          <Card className="border-0 shadow-lg" style={{ background: '#141a24', borderRadius: '20px', overflow: 'hidden' }}>
            <div className="position-relative" style={{ height: '6px', background: 'linear-gradient(90deg, #ff9100, #ff6b00)' }} />
            <Card.Body className="p-4 text-center">
              <div 
                className="position-relative d-inline-block mx-auto"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="position-relative">
                  <Image
                    src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=ff9100&color=fff&size=128&bold=true`}
                    roundedCircle
                    style={{
                      width: '150px',
                      height: '150px',
                      objectFit: 'cover',
                      border: '4px solid #ff9100',
                      transition: 'all 0.3s ease',
                      filter: isHovering ? 'brightness(0.7)' : 'brightness(1)'
                    }}
                  />
                  {isHovering && !saving && (
                    <div 
                      className="position-absolute top-50 start-50 translate-middle text-white"
                      style={{ cursor: 'pointer' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={32} />
                      <small className="d-block">Ganti Foto</small>
                    </div>
                  )}
                </div>
              </div>
              
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="d-none"
                disabled={saving}
              />

              <h4 className="mt-3 text-light fw-bold">{profile.name || 'User'}</h4>
              <p className="text-muted mb-2">{profile.email}</p>
              <Badge 
                bg={profile.role === 'developer' ? 'danger' : profile.role === 'owner' ? 'warning' : 'info'}
                className="px-3 py-2"
              >
                {profile.role?.toUpperCase() || 'USER'}
              </Badge>

              {avatarPreview && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="mt-3 w-100"
                  onClick={handleRemoveAvatar}
                  disabled={saving}
                >
                  <Trash2 size={16} className="me-2" />
                  Hapus Foto
                </Button>
              )}

              <hr className="my-3" style={{ borderColor: '#2a3444' }} />

              <div className="text-start">
                <div className="d-flex align-items-center mb-2 p-2 rounded" style={{ background: '#0b0e14' }}>
                  <User size={16} className="text-warning me-2" />
                  <span className="text-light small">{profile.name || 'Belum diisi'}</span>
                </div>
                <div className="d-flex align-items-center mb-2 p-2 rounded" style={{ background: '#0b0e14' }}>
                  <Mail size={16} className="text-warning me-2" />
                  <span className="text-light small">{profile.email}</span>
                </div>
                <div className="d-flex align-items-center mb-2 p-2 rounded" style={{ background: '#0b0e14' }}>
                  <Phone size={16} className="text-warning me-2" />
                  <span className="text-light small">{profile.phone || 'Belum diisi'}</span>
                </div>
                <div className="d-flex align-items-center p-2 rounded" style={{ background: '#0b0e14' }}>
                  <MapPin size={16} className="text-warning me-2" />
                  <span className="text-light small">{profile.address || 'Belum diisi'}</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Profile Form */}
        <Col lg={8}>
          <Card className="border-0 shadow-lg" style={{ background: '#141a24', borderRadius: '20px', overflow: 'hidden' }}>
            <div className="position-relative" style={{ height: '6px', background: 'linear-gradient(90deg, #ff9100, #ff6b00)' }} />
            <Card.Body className="p-4">
              <h5 className="text-light fw-bold mb-4">
                <Pencil size={18} className="me-2 text-warning" />
                Edit Profil
              </h5>

              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-light fw-semibold">
                        <User size={16} className="me-1 text-warning" />
                        Nama Lengkap
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="bg-dark text-light border-secondary"
                        placeholder="Masukkan nama lengkap"
                        disabled={saving}
                        style={{ borderRadius: '12px', padding: '12px 16px' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-light fw-semibold">
                        <Mail size={16} className="me-1 text-warning" />
                        Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-dark text-muted border-secondary"
                        style={{ borderRadius: '12px', padding: '12px 16px' }}
                      />
                      <small className="text-muted">Email tidak dapat diubah</small>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-light fw-semibold">
                        <Phone size={16} className="me-1 text-warning" />
                        Nomor HP
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="bg-dark text-light border-secondary"
                        placeholder="0812-3456-7890"
                        disabled={saving}
                        style={{ borderRadius: '12px', padding: '12px 16px' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="text-light fw-semibold">
                        <MapPin size={16} className="me-1 text-warning" />
                        Alamat
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={profile.address || ''}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="bg-dark text-light border-secondary"
                        placeholder="Jl. Contoh No. 123"
                        disabled={saving}
                        style={{ borderRadius: '12px', padding: '12px 16px' }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Button
                  variant="warning"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-100 mt-2 fw-bold"
                  style={{ borderRadius: '12px', padding: '14px' }}
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="me-2" />
                      Simpan Profil
                    </>
                  )}
                </Button>
              </Form>

              <hr className="my-4" style={{ borderColor: '#2a3444' }} />

              {/* Change Password */}
              <div>
                <Button
                  variant="outline-info"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="w-100 mb-3 fw-bold"
                  style={{ borderRadius: '12px', padding: '12px' }}
                >
                  {showPasswordForm ? (
                    <>
                      <Lock size={18} className="me-2" />
                      Tutup Form Password
                    </>
                  ) : (
                    <>
                      <Key size={18} className="me-2" />
                      Ubah Password
                    </>
                  )}
                </Button>

                {showPasswordForm && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label className="text-light fw-semibold">Password Saat Ini</Form.Label>
                        <Form.Control
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="bg-dark text-light border-secondary"
                          placeholder="Masukkan password saat ini"
                          disabled={saving}
                          style={{ borderRadius: '12px', padding: '12px 16px' }}
                        />
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="text-light fw-semibold">Password Baru</Form.Label>
                            <Form.Control
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className="bg-dark text-light border-secondary"
                              placeholder="Minimal 6 karakter"
                              disabled={saving}
                              style={{ borderRadius: '12px', padding: '12px 16px' }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="text-light fw-semibold">Konfirmasi Password</Form.Label>
                            <Form.Control
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="bg-dark text-light border-secondary"
                              placeholder="Ulangi password baru"
                              disabled={saving}
                              style={{ borderRadius: '12px', padding: '12px 16px' }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Button
                        variant="warning"
                        onClick={handleChangePassword}
                        disabled={saving}
                        className="w-100 fw-bold"
                        style={{ borderRadius: '12px', padding: '14px' }}
                      >
                        {saving ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <Key size={18} className="me-2" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </Form>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </Container>
  );
};

export default Profile;