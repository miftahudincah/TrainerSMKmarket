// Settings.jsx - Menggunakan RPC Function

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Spinner, Image } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase, BUCKET, getPublicUrl } from '../config/supabase';
import { getSettings, updateSetting } from '../config/settings';
import Toast from '../components/Toast';
import { Upload, Trash2, Image as ImageIcon, Users, Info, Store } from 'lucide-react';

const Settings = () => {
  const { user, userRole, refreshRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Store settings
  const [storeName, setStoreName] = useState('Toko App');
  const [storeLogo, setStoreLogo] = useState('');
  const [storeLogoFile, setStoreLogoFile] = useState(null);
  const [storeLogoPreview, setStoreLogoPreview] = useState('');
  const [storeTagline, setStoreTagline] = useState('Admin Panel');
  
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  // Load settings
  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    try {
      const storeSettings = await getSettings();
      setStoreName(storeSettings.store_name || 'Toko App');
      setStoreLogo(storeSettings.store_logo || '');
      setStoreLogoPreview(storeSettings.store_logo || '');
      setStoreTagline(storeSettings.store_tagline || 'Admin Panel');
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  // Load users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log('🔄 Loading users...');
      
      // Coba query biasa dulu
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        showToast('Gagal load users: ' + error.message, 'error');
        setUsers([]);
      } else {
        console.log('✅ Users loaded:', data?.length || 0);
        setUsers(data || []);
      }
      
    } catch (err) {
      console.error('Error loading users:', err);
      showToast('Gagal load users: ' + err.message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showToast('Format file tidak didukung! Gunakan JPG, PNG, WEBP, GIF, atau SVG.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran file maksimal 2MB!', 'error');
      return;
    }

    setStoreLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setStoreLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setStoreLogoFile(null);
    setStoreLogoPreview('');
    setStoreLogo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload logo to Supabase
  const uploadLogo = async () => {
    if (!storeLogoFile) return null;

    setUploadingLogo(true);
    try {
      const timestamp = Date.now();
      const ext = storeLogoFile.name.split('.').pop();
      const filename = `logo_${timestamp}.${ext}`;

      // Delete old logo if exists
      if (storeLogo) {
        const oldFilename = storeLogo.split('/').pop();
        await supabase.storage.from(BUCKET).remove([`settings/${oldFilename}`]);
      }

      // Upload new logo
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(`settings/${filename}`, storeLogoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const publicUrl = getPublicUrl(`settings/${filename}`);
      return publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      showToast('❌ Gagal upload logo: ' + err.message, 'error');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle save store settings
  const handleSaveStoreSettings = async () => {
    setSaving(true);
    try {
      let logoUrl = storeLogo;

      if (storeLogoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      await updateSetting('store_name', storeName);
      await updateSetting('store_logo', logoUrl);
      await updateSetting('store_tagline', storeTagline);
      
      setStoreLogo(logoUrl);
      setStoreLogoPreview(logoUrl);
      setStoreLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      showToast('✅ Pengaturan toko berhasil disimpan!', 'success');
      window.dispatchEvent(new Event('settingsUpdated'));
    } catch (err) {
      console.error('Error saving store settings:', err);
      showToast('❌ Gagal simpan pengaturan toko: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // PERBAIKAN: Menggunakan RPC Function
  // ============================================
  const handleUpdateUserRole = async (userId, newRole) => {
    if (!window.confirm(`Yakin ubah role user ini menjadi ${newRole}?`)) return;

    setUpdatingUserId(userId);
    try {
      console.log(`🔄 Updating user ${userId} to role: ${newRole}`);
      
      // === PAKAI RPC FUNCTION ===
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        user_id: userId,
        new_role: newRole
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('✅ RPC Response:', data);
      showToast(`✅ Role user berhasil diupdate menjadi ${newRole}!`, 'success');
      
      // Reload users untuk menampilkan perubahan
      await loadUsers();
      
      // Refresh role user yang sedang login jika dia yang diupdate
      if (user?.uid === userId) {
        await refreshRole();
      }
      
    } catch (err) {
      console.error('Error updating user role:', err);
      showToast('❌ Gagal update role: ' + err.message, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Delete user - Juga bisa pakai RPC atau query biasa
  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Yakin hapus user "${userEmail}"?`)) return;

    setUpdatingUserId(userId);
    try {
      console.log(`🗑 Deleting user: ${userEmail} (${userId})`);

      // Hapus user dari tabel users
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      showToast(`🗑 User "${userEmail}" berhasil dihapus!`, 'success');
      await loadUsers();
      
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('❌ Gagal hapus user: ' + err.message, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Cek akses
  if (userRole !== 'developer') {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div style={{ fontSize: '64px' }}>🚫</div>
          <h4 className="text-light mt-3">Access Denied</h4>
          <p className="text-muted">Anda tidak memiliki akses ke halaman ini.</p>
          <Badge bg="danger">Requires: Developer Role</Badge>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      
      <h3 className="mb-4 text-light">⚙️ Settings</h3>

      <Row>
        {/* Store Settings */}
        <Col lg={6}>
          <Card bg="dark" text="light" className="p-4 mb-4">
            <Card.Body>
              <Card.Title className="mb-3">
                <Store size={20} className="me-2 text-warning" />
                Pengaturan Toko
              </Card.Title>
              <p className="text-muted small mb-3">Pengaturan ini akan tampil di seluruh halaman</p>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Nama Toko</Form.Label>
                  <Form.Control
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="bg-dark text-light border-secondary"
                    placeholder="Masukkan nama toko"
                  />
                  <small className="text-muted">Nama toko akan tampil di header dan sidebar</small>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Logo Toko</Form.Label>
                  <div className="d-flex align-items-center gap-3">
                    {storeLogoPreview ? (
                      <div className="position-relative">
                        <Image 
                          src={storeLogoPreview} 
                          style={{ 
                            width: '60px', 
                            height: '60px', 
                            objectFit: 'contain',
                            borderRadius: '8px',
                            border: '1px solid #2a3444',
                            background: '#0b0e14'
                          }} 
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0 rounded-circle"
                          style={{ width: '20px', height: '20px', padding: 0, fontSize: '10px' }}
                          onClick={removeLogo}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="d-flex align-items-center justify-content-center rounded"
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          border: '2px dashed #2a3444',
                          borderRadius: '8px',
                          background: '#0b0e14'
                        }}
                      >
                        <ImageIcon size={24} className="text-muted" />
                      </div>
                    )}
                    <div>
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        size="sm"
                      >
                        {uploadingLogo ? (
                          <><Spinner animation="border" size="sm" className="me-1" /> Uploading...</>
                        ) : (
                          <><Upload size={16} className="me-1" /> Upload Logo</>
                        )}
                      </Button>
                      <Form.Control
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="d-none"
                      />
                      <small className="text-muted d-block mt-1">JPG, PNG, WEBP, GIF, SVG (max 2MB)</small>
                    </div>
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Tagline</Form.Label>
                  <Form.Control
                    type="text"
                    value={storeTagline}
                    onChange={(e) => setStoreTagline(e.target.value)}
                    className="bg-dark text-light border-secondary"
                    placeholder="Admin Panel"
                  />
                  <small className="text-muted">Tagline akan tampil di header</small>
                </Form.Group>

                <Button variant="warning" onClick={handleSaveStoreSettings} disabled={saving || uploadingLogo} className="w-100">
                  {saving || uploadingLogo ? '⏳ Saving...' : '💾 Simpan Pengaturan Toko'}
                </Button>
              </Form>

              <hr className="border-secondary my-4" />

              {/* Preview */}
              <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                <h6 className="text-light mb-2">Preview</h6>
                <div className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: '#0b0e14' }}>
                  {storeLogoPreview ? (
                    <Image 
                      src={storeLogoPreview} 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        objectFit: 'contain',
                        borderRadius: '4px'
                      }} 
                    />
                  ) : (
                    <span style={{ fontSize: '32px', color: '#ff9100' }}>🛒</span>
                  )}
                  <div>
                    <div style={{ color: '#ff9100', fontWeight: 'bold', fontSize: '18px' }}>
                      {storeName || 'Toko App'}
                    </div>
                    <div className="text-muted small">{storeTagline || 'Admin Panel'}</div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* User Management */}
        <Col lg={6}>
          <Card bg="dark" text="light" className="p-4 mb-4">
            <Card.Body>
              <Card.Title className="mb-3">
                <Users size={20} className="me-2 text-warning" />
                User Management
                <Badge bg="secondary" className="ms-2">{users.length} users</Badge>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="ms-2"
                  onClick={loadUsers}
                  disabled={loadingUsers}
                >
                  {loadingUsers ? '⏳' : '⟳ Refresh'}
                </Button>
              </Card.Title>

              {loadingUsers ? (
                <div className="text-center py-3">
                  <Spinner animation="border" variant="warning" size="sm" />
                  <span className="ms-2 text-muted">Loading users...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-muted">Tidak ada user ditemukan</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-dark table-hover table-sm">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isUpdating = updatingUserId === u.id;
                        const isCurrentUser = u.email === user?.email;
                        
                        return (
                          <tr key={u.id}>
                            <td style={{ fontSize: '13px' }}>
                              {u.email}
                              {isCurrentUser && (
                                <Badge bg="warning" className="ms-1" style={{ fontSize: '8px' }}>
                                  YOU
                                </Badge>
                              )}
                            </td>
                            <td>
                              <Badge bg={u.role === 'developer' ? 'danger' : u.role === 'owner' ? 'warning' : 'info'}>
                                {u.role || 'user'}
                              </Badge>
                            </td>
                            <td>
                              <Form.Select
                                size="sm"
                                className="bg-dark text-light border-secondary d-inline-block"
                                style={{ width: 'auto', display: 'inline-block' }}
                                value={u.role || 'user'}
                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                disabled={isUpdating || isCurrentUser}
                              >
                                <option value="user">User</option>
                                <option value="owner">Owner</option>
                                <option value="developer">Developer</option>
                              </Form.Select>
                              {isUpdating && (
                                <Spinner animation="border" size="sm" className="ms-1" />
                              )}
                              {!isCurrentUser && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="ms-1"
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  disabled={isUpdating}
                                >
                                  ✕
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* System Info */}
      <Row>
        <Col lg={12}>
          <Card bg="dark" text="light" className="p-4">
            <Card.Body>
              <Card.Title className="mb-3">
                <Info size={20} className="me-2 text-warning" />
                System Information
              </Card.Title>
              <Row>
                <Col md={4}>
                  <div className="p-2 bg-secondary bg-opacity-25 rounded">
                    <small className="text-muted">App Version</small>
                    <p className="mb-0">1.0.0</p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-2 bg-secondary bg-opacity-25 rounded">
                    <small className="text-muted">Environment</small>
                    <p className="mb-0">Development</p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-2 bg-secondary bg-opacity-25 rounded">
                    <small className="text-muted">Logged in as</small>
                    <p className="mb-0">{user?.email} ({userRole})</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings;