import React, { useRef, useState } from 'react';
import { Card, Button, Form, Row, Col, Image, ProgressBar } from 'react-bootstrap';
import { supabase, BUCKET } from '../config/supabase';
import Toast from './Toast';
import { formatSize, validateImage } from '../utils/helpers';

const UploadZone = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validation = validateImage(selectedFile);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      showToast('Pilih file dulu!', 'error');
      return;
    }

    setLoading(true);
    setUploadProgress(10);
    
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const filename = `${timestamp}_${sanitizedName}`;

    try {
      setUploadProgress(30);
      
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      setUploadProgress(80);

      if (error) throw error;

      setUploadProgress(100);
      showToast(`✅ Upload berhasil: ${filename}`, 'success');
      
      // Reset form
      setFile(null);
      setPreview(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Trigger refresh
      if (onUploadSuccess) {
        setTimeout(() => onUploadSuccess(), 500);
      }
      
    } catch (err) {
      showToast('❌ Gagal upload: ' + err.message, 'error');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#ff9100';
    e.currentTarget.style.background = '#1a2636';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#2a3444';
    e.currentTarget.style.background = '#10171f';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#2a3444';
    e.currentTarget.style.background = '#10171f';
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validasi file
      const validation = validateImage(droppedFile);
      if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
      }
      
      // Set file manually
      setFile(droppedFile);
      setUploadProgress(0);
      
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(droppedFile);
      
      // Trigger change event for validation
      const event = { target: { files: [droppedFile] } };
      handleFileChange(event);
    }
  };

  const isImageFile = file && file.type?.startsWith('image/');

  return (
    <>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />
      
      <Card bg="dark" text="light" className="p-3" style={{ borderColor: '#2a3444' }}>
        <Card.Body>
          <Card.Title className="mb-3">
            📤 Upload Gambar
            <span className="badge bg-secondary ms-2" style={{ fontSize: '10px' }}>
              max 5MB
            </span>
          </Card.Title>
          
          {/* Drop Zone */}
          <div
            className="border rounded p-4 text-center"
            style={{ 
              borderStyle: 'dashed !important', 
              cursor: 'pointer',
              borderColor: '#2a3444',
              background: '#10171f',
              transition: 'all 0.3s ease'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            <div style={{ fontSize: '48px', opacity: loading ? 0.5 : 1 }}>
              {loading ? '⏳' : '🖼️'}
            </div>
            <p className="mb-1">
              <strong>{loading ? 'Uploading...' : 'Klik atau seret'}</strong> 
              {!loading && ' gambar ke sini'}
            </p>
            <small className="text-muted">
              JPG · PNG · WEBP · GIF (max 5MB)
            </small>
            <Form.Control
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="d-none"
              disabled={loading}
            />
          </div>

          {/* Progress Bar */}
          {loading && uploadProgress > 0 && (
            <div className="mt-3">
              <ProgressBar 
                now={uploadProgress} 
                label={`${uploadProgress}%`} 
                variant="warning"
                striped
                animated
                style={{ height: '20px' }}
              />
            </div>
          )}

          {/* Preview */}
          {preview && !loading && (
            <Row className="mt-3">
              <Col xs={12}>
                <div className="d-flex align-items-center gap-3 p-2" style={{ background: '#0f161e', borderRadius: '12px' }}>
                  <Image 
                    src={preview} 
                    thumbnail 
                    style={{ 
                      maxHeight: '80px', 
                      width: 'auto',
                      maxWidth: '100px',
                      objectFit: 'contain'
                    }} 
                  />
                  <div className="flex-grow-1">
                    <p className="mb-0 text-truncate" style={{ maxWidth: '200px' }}>
                      {file?.name}
                    </p>
                    <small className="text-muted">
                      {formatSize(file?.size)} • {isImageFile ? '✅ Image' : '📄 File'}
                    </small>
                  </div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    ✕
                  </Button>
                </div>
              </Col>
            </Row>
          )}

          {/* Actions */}
          <div className="d-flex gap-2 mt-3">
            <Button
              variant="warning"
              className="flex-grow-1"
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                '⬆ Upload ke Supabase'
              )}
            </Button>
            
            {file && !loading && (
              <Button
                variant="outline-secondary"
                onClick={handleReset}
                disabled={loading}
              >
                Batal
              </Button>
            )}
          </div>

          {/* Info */}
          {!file && !loading && (
            <div className="text-center mt-2">
              <small className="text-muted">
                💡 File akan disimpan di bucket <code className="text-warning">{BUCKET}</code>
              </small>
            </div>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default UploadZone;