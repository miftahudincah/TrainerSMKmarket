import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner } from 'react-bootstrap';
import { supabase, BUCKET, getPublicUrl } from '../config/supabase';
import Toast from './Toast';

const Gallery = ({ refresh }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [deleting, setDeleting] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const loadImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list();
      if (error) throw error;
      
      // Sort by newest first
      const sorted = data ? [...data].sort((a, b) => {
        return (b.updated_at || 0) - (a.updated_at || 0);
      }) : [];
      
      setImages(sorted || []);
    } catch (err) {
      showToast('Gagal load galeri: ' + err.message, 'error');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [refresh]);

  const handleDelete = async (filename) => {
    if (!window.confirm(`Yakin hapus "${filename}" ?`)) return;

    setDeleting(true);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([filename]);
      if (error) throw error;
      
      showToast(`🗑 ${filename} berhasil dihapus`, 'success');
      await loadImages();
    } catch (err) {
      showToast('❌ Gagal hapus: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card bg="dark" text="light" className="p-4" style={{ minHeight: '300px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="warning" />
          <p className="mt-2 text-muted">Loading galeri...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'info' })} 
      />
      
      <Card bg="dark" text="light" className="p-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">
              📂 Galeri
              <span className="badge bg-secondary ms-2">
                {images.length} {images.length === 1 ? 'file' : 'file'}
              </span>
            </Card.Title>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={loadImages}
              disabled={loading}
            >
              ⟳ Refresh
            </Button>
          </div>

          {images.length === 0 ? (
            <div className="text-center text-muted py-5">
              <div style={{ fontSize: '64px' }}>📭</div>
              <h5 className="mt-3">Belum ada gambar</h5>
              <p className="mb-0">Upload gambar pertama Anda!</p>
            </div>
          ) : (
            <Row xs={2} sm={3} md={4} lg={5} className="g-3">
              {images.map((item) => (
                <Col key={item.id || item.name}>
                  <Card 
                    className="h-100 border-secondary" 
                    style={{ 
                      background: '#111a24', 
                      borderColor: '#202c3c',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <div style={{ position: 'relative', paddingTop: '100%' }}>
                      <Card.Img
                        variant="top"
                        src={getPublicUrl(item.name)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23111a24" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%233f5a7a" font-size="12"%3Eerror%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        className="position-absolute top-0 end-0 m-1"
                        style={{ 
                          opacity: 0.85,
                          zIndex: 2,
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={() => handleDelete(item.name)}
                        disabled={deleting}
                      >
                        ✕
                      </Button>
                    </div>
                    <Card.Footer style={{ 
                      padding: '6px 8px',
                      background: 'transparent',
                      borderTop: '1px solid #202c3c'
                    }}>
                      <small 
                        className="text-muted" 
                        style={{ 
                          fontSize: '10px', 
                          display: 'block', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </small>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default Gallery;