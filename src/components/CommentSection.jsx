// components/CommentSection.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, Alert, Spinner, Image } from 'react-bootstrap';
import { supabase, getPublicUrl, BUCKET } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Star, User, Trash2, Clock, MessageSquare, Edit2 } from 'lucide-react';
import RatingSummary from './RatingSummary';

const CommentSection = ({ productId, onCommentUpdate }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    console.log('Current user in CommentSection:', user);
    console.log('User ID:', user?.id);
    console.log('User Email:', user?.email);
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (productId) {
      loadComments();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [productId]);

  const loadComments = async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .from('product_comments')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        // Ambil semua user_id yang unik
        const userIds = [...new Set(data.map(c => c.user_id))];
        
        // Ambil data user dari tabel users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .in('id', userIds);

        if (usersError) {
          console.error('Error loading users:', usersError);
        }

        // Buat map untuk akses cepat
        const userMap = {};
        if (usersData) {
          usersData.forEach(u => {
            userMap[u.id] = u;
          });
        }

        // Gabungkan data komentar dengan data user - menggunakan cara yang sama dengan Layout
        const commentsWithProfiles = data.map(comment => {
          const userData = userMap[comment.user_id];
          
          // Dapatkan URL avatar - cara yang sama dengan Layout
          let avatarUrl = null;
          if (userData?.avatar_url) {
            try {
              // Cara 1: Gunakan getPublicUrl
              avatarUrl = getPublicUrl(userData.avatar_url);
            } catch (err) {
              console.error('Error with getPublicUrl:', err);
              // Cara 2: Fallback langsung dari storage
              try {
                const { data: urlData } = supabase.storage
                  .from(BUCKET || 'avatars')
                  .getPublicUrl(userData.avatar_url);
                avatarUrl = urlData?.publicUrl || null;
              } catch (e) {
                console.error('Error getting public URL:', e);
                avatarUrl = null;
              }
            }
          }
          
          return {
            ...comment,
            user: {
              name: userData?.name || userData?.email?.split('@')[0] || comment.user_email?.split('@')[0] || 'Pengguna',
              email: userData?.email || comment.user_email || 'Pengguna',
              avatar_url: avatarUrl
            }
          };
        });

        if (isMountedRef.current) {
          setComments(commentsWithProfiles);
        }
      } else {
        if (isMountedRef.current) {
          setComments([]);
        }
      }
    } catch (err) {
      console.error('Error loading comments:', err);
      if (isMountedRef.current) {
        setError('Gagal memuat komentar: ' + (err.message || 'Unknown error'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isLoadingRef.current = false;
    }
  };

  const getUserId = () => {
    if (!user) return null;
    return user.id || user.user_id || user.uid || user.sub || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Silakan login terlebih dahulu untuk berkomentar');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }

    const userId = getUserId();
    console.log('User ID for comment:', userId);
    console.log('User email:', user.email);

    if (!userId) {
      setError('User ID tidak ditemukan. Silakan logout dan login kembali.');
      return;
    }

    if (!commentText.trim()) {
      setError('Komentar tidak boleh kosong');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const commentData = {
        product_id: productId,
        user_id: userId,
        user_email: user.email || userId,
        comment: commentText.trim(),
        rating: rating,
      };

      console.log('Mengirim komentar:', commentData);

      const { data, error } = await supabase
        .from('product_comments')
        .insert([commentData])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        
        if (error.message.includes('foreign key constraint')) {
          setError('Error: User ID tidak valid di database. Silakan logout dan login kembali.');
          return;
        }
        
        if (error.message.includes('row-level security policy')) {
          setError('Izin ditolak. Pastikan Anda sudah login dengan benar.');
          return;
        }
        
        throw error;
      }

      setSuccess('Komentar berhasil ditambahkan! 🎉');
      setCommentText('');
      setRating(5);
      
      await loadComments();
      if (onCommentUpdate) onCommentUpdate();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError('Gagal menambahkan komentar: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Yakin ingin menghapus komentar ini?')) return;

    const userId = getUserId();
    if (!userId) {
      setError('User ID tidak ditemukan. Silakan logout dan login kembali.');
      return;
    }

    try {
      const { error } = await supabase
        .from('product_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) throw error;
      
      setSuccess('Komentar berhasil dihapus');
      await loadComments();
      if (onCommentUpdate) onCommentUpdate();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Gagal menghapus komentar: ' + err.message);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.comment);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editText.trim()) {
      setError('Komentar tidak boleh kosong');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setError('User ID tidak ditemukan. Silakan logout dan login kembali.');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('product_comments')
        .update({ 
          comment: editText.trim(),
          updated_at: new Date()
        })
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) throw error;

      setEditingCommentId(null);
      setSuccess('Komentar berhasil diupdate');
      await loadComments();
      if (onCommentUpdate) onCommentUpdate();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Gagal mengupdate komentar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Baru saja';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days < 7) return `${days} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderStars = (rating, interactive = false, onHover = null, onClick = null) => {
    return (
      <div className="d-flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={interactive ? 28 : 16}
            className={interactive ? 'cursor-pointer' : ''}
            fill={(interactive ? (hoverRating || rating) : rating) >= star ? '#ff9100' : 'none'}
            color={(interactive ? (hoverRating || rating) : rating) >= star ? '#ff9100' : '#6c757d'}
            onMouseEnter={() => interactive && onHover && onHover(star)}
            onMouseLeave={() => interactive && onHover && onHover(0)}
            onClick={() => interactive && onClick && onClick(star)}
            style={{ transition: 'all 0.2s ease' }}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="warning" />
        <p className="text-muted mt-2">Memuat komentar...</p>
      </div>
    );
  }

  return (
    <div className="comment-section">
      <RatingSummary comments={comments} />

      <hr className="border-secondary" />

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {user ? (
        <div className="bg-dark p-3 rounded mb-4" style={{ background: '#0f161e' }}>
          <h6 className="text-light fw-bold mb-3">
            <MessageSquare size={16} className="me-2" />
            Berikan Komentar & Rating
          </h6>
          <Form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="text-light mb-2 d-block">Rating:</label>
              {renderStars(rating, true, setHoverRating, setRating)}
            </div>
            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Tulis komentar Anda tentang produk ini..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={submitting}
                style={{ 
                  background: '#1a1f2e', 
                  border: '1px solid #2a3444',
                  color: '#fff',
                  borderRadius: '12px'
                }}
                className="text-light"
              />
            </Form.Group>
            <Button 
              type="submit" 
              variant="warning" 
              disabled={submitting || !commentText.trim()}
              className="fw-bold"
            >
              {submitting ? (
                <><Spinner animation="border" size="sm" className="me-2" /> Mengirim...</>
              ) : (
                'Kirim Komentar'
              )}
            </Button>
          </Form>
        </div>
      ) : (
        <Alert variant="info" className="mb-4">
          <span>Silakan <Button variant="link" className="p-0 text-warning" onClick={() => window.dispatchEvent(new CustomEvent('showLogin'))}>login</Button> untuk memberikan komentar dan rating.</span>
        </Alert>
      )}

      <div className="comments-list">
        <h6 className="text-light fw-bold mb-3">
          Semua Komentar ({comments.length})
        </h6>
        
        {comments.length === 0 ? (
          <div className="text-center py-4">
            <MessageSquare size={48} className="text-muted mb-2" />
            <p className="text-muted">Belum ada komentar untuk produk ini.</p>
            <p className="text-muted small">Jadilah yang pertama memberikan komentar!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const avatarUrl = comment.user?.avatar_url;
            const userName = comment.user?.name || 'Pengguna';
            
            return (
              <div 
                key={comment.id} 
                className="bg-dark p-3 rounded mb-3" 
                style={{ background: '#0f161e', borderLeft: '3px solid #ff9100' }}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    {avatarUrl ? (
                      <Image 
                        src={avatarUrl} 
                        width={32} 
                        height={32} 
                        roundedCircle
                        style={{ 
                          objectFit: 'cover',
                          border: '2px solid #ff9100'
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=ff9100&color=fff&size=32&bold=true`;
                        }}
                      />
                    ) : (
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center" 
                        style={{ 
                          width: '32px', 
                          height: '32px',
                          background: 'linear-gradient(135deg, #ff9100, #ff6b00)',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          border: '2px solid #ff9100'
                        }}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="text-light fw-bold">
                        {userName}
                      </span>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {renderStars(comment.rating)}
                        <span className="text-muted small">• {formatDate(comment.created_at)}</span>
                        {comment.updated_at && comment.updated_at !== comment.created_at && (
                          <span className="text-muted small">(diedit)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {user && user.id === comment.user_id && (
                    <div className="d-flex gap-1">
                      {editingCommentId === comment.id ? (
                        <>
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={() => handleUpdateComment(comment.id)}
                            disabled={submitting}
                          >
                            Simpan
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => setEditingCommentId(null)}
                          >
                            Batal
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => handleEditComment(comment)}
                            className="d-flex align-items-center gap-1"
                          >
                            <Edit2 size={12} />
                            <span className="d-none d-sm-inline">Edit</span>
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="d-flex align-items-center gap-1"
                          >
                            <Trash2 size={14} />
                            <span className="d-none d-sm-inline">Hapus</span>
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {editingCommentId === comment.id ? (
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ 
                      background: '#1a1f2e', 
                      border: '1px solid #ff9100',
                      color: '#fff',
                      borderRadius: '8px',
                      paddingLeft: '40px'
                    }}
                    className="text-light"
                  />
                ) : (
                  <p className="text-light mb-0" style={{ paddingLeft: '40px' }}>
                    {comment.comment}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>
        {`
          .comment-section {
            max-height: 600px;
            overflow-y: auto;
            padding-right: 4px;
          }
          .comment-section::-webkit-scrollbar {
            width: 6px;
          }
          .comment-section::-webkit-scrollbar-track {
            background: #0f161e;
            border-radius: 10px;
          }
          .comment-section::-webkit-scrollbar-thumb {
            background: #ff9100;
            border-radius: 10px;
          }
          .comment-section::-webkit-scrollbar-thumb:hover {
            background: #e07e00;
          }
          .cursor-pointer {
            cursor: pointer;
          }
          .cursor-pointer:hover {
            transform: scale(1.1);
          }
          .rating-summary {
            padding: 10px 0;
          }
        `}
      </style>
    </div>
  );
};

export default CommentSection;