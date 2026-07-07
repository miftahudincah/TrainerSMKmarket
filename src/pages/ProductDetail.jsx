import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Image, Spinner, Alert, Nav, Tab, ProgressBar
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase, getPublicUrl } from '../config/supabase';
import Toast from '../components/Toast';
import CommentSection from '../components/CommentSection';
import RatingSummary from '../components/RatingSummary';
import { 
  ShoppingCart, 
  CreditCard, 
  MessageCircle, 
  Star, 
  Heart,
  Truck,
  Banknote,
  Store,
  Clock,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  MessageSquare,
  Share2,
  Copy,
  Check
} from 'lucide-react';

const ProductDetail = ({ product, onClose, onAddToCart, onMenuChange }) => {
  const { user, userRole, saveCart, cart } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [isWishlist, setIsWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('detail');
  const [shopProducts, setShopProducts] = useState([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  
  // State untuk slide foto
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product?.image_urls || [];
  const allImages = images.length > 0 ? images : [product?.image_url || 'https://via.placeholder.com/600x400/ff9100/fff?text=Product'];

  // Cek apakah user adalah admin (developer atau owner)
  const isAdmin = userRole === 'developer' || userRole === 'owner';
  
  // Cek apakah user adalah customer (bukan admin)
  const isCustomer = !isAdmin && userRole !== 'admin';

  // Show toast with auto clear
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Load other products from same shop
  useEffect(() => {
    if (product?.user_email) {
      loadShopProducts();
      loadCommentStats();
    }
    // Check wishlist
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      const wishlist = JSON.parse(saved);
      setIsWishlist(wishlist.some(item => item.id === product?.id));
    }
    // Reset current image index when product changes
    setCurrentImageIndex(0);
    setQuantity(1);
  }, [product]);

  // Load comment statistics
  const loadCommentStats = async () => {
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select('rating')
        .eq('product_id', product.id);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCommentCount(data.length);
        const total = data.reduce((sum, c) => sum + c.rating, 0);
        setAverageRating(total / data.length);
      } else {
        setCommentCount(0);
        setAverageRating(0);
      }
    } catch (err) {
      console.error('Error loading comment stats:', err);
    }
  };

  // Listen untuk userLoggedIn - refresh data setelah login
  useEffect(() => {
    const handleUserLoggedIn = () => {
      // Refresh wishlist
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        const wishlist = JSON.parse(saved);
        setIsWishlist(wishlist.some(item => item.id === product?.id));
      }
    };
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, [product]);

  const loadShopProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_email', product.user_email)
        .neq('id', product.id)
        .limit(4);

      if (error) throw error;
      setShopProducts(data || []);
    } catch (err) {
      console.error('Error loading shop products:', err);
    }
  };

  const toggleWishlist = () => {
    const saved = localStorage.getItem('wishlist');
    let wishlist = saved ? JSON.parse(saved) : [];
    
    if (isWishlist) {
      wishlist = wishlist.filter(item => item.id !== product.id);
      showToast('❤️ Dihapus dari wishlist', 'info');
    } else {
      wishlist.push(product);
      showToast('❤️ Ditambahkan ke wishlist!', 'success');
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    setIsWishlist(!isWishlist);
  };

  // Share product link
  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out this product: ${product.name} - ${formatCurrency(product.price)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: text,
          url: url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      showToast('🔗 Link produk disalin!', 'success');
      setTimeout(() => setIsCopied(false), 3000);
    }).catch(() => {
      showToast('Gagal menyalin link', 'error');
    });
  };

  // === FUNGSI CHAT PENJUAL ===
  const handleChatSeller = () => {
    if (!user) {
      showToast('⚠️ Silakan login terlebih dahulu untuk chat penjual!', 'warning');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }

    if (!product?.user_email) {
      showToast('⚠️ Penjual tidak ditemukan!', 'error');
      return;
    }

    const chatData = {
      sellerId: product.user_id || 'unknown',
      sellerEmail: product.user_email,
      productId: product.id,
      productName: product.name,
      productImage: product.image_urls?.[0] || product.image_url || ''
    };
    
    localStorage.setItem('chatSeller', JSON.stringify(chatData));
    console.log('💬 Chat data saved from ProductDetail:', chatData);
    
    showToast(`💬 Membuka chat dengan ${product.user_email?.split('@')[0]}...`, 'success');
    
    if (onMenuChange && typeof onMenuChange === 'function') {
      setTimeout(() => {
        onMenuChange('messages');
      }, 400);
    } else {
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    }
  };

  // === FUNGSI TAMBAH KE KERANJANG ===
  const handleAddToCart = async () => {
    if (!user) {
      showToast('⚠️ Silakan login terlebih dahulu untuk menambahkan ke keranjang!', 'warning');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }
    
    if (product.stock === 0) {
      showToast('⚠️ Stok produk habis!', 'error');
      return;
    }

    setIsAddingToCart(true);
    try {
      const existing = cart.find(item => item.id === product.id);
      let newCart;
      if (existing) {
        newCart = cart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        newCart = [...cart, { ...product, quantity: quantity }];
      }
      await saveCart(newCart);
      showToast(`✅ ${quantity} x "${product.name}" ditambahkan ke keranjang!`, 'success');
    } catch (err) {
      console.error('Error adding to cart:', err);
      showToast('❌ Gagal menambahkan ke keranjang', 'error');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // === FUNGSI BELI LANGSUNG ===
  const handleBuyNow = async () => {
    if (!user) {
      showToast('⚠️ Silakan login terlebih dahulu untuk membeli produk!', 'warning');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }
    
    if (product.stock === 0) {
      showToast('⚠️ Stok produk habis!', 'error');
      return;
    }

    setIsBuyingNow(true);
    try {
      const checkoutItem = { ...product, quantity: quantity };
      localStorage.setItem('checkoutItems', JSON.stringify([checkoutItem]));
      
      showToast(`🛒 ${quantity} x "${product.name}" siap checkout!`, 'success');
      
      if (onMenuChange && typeof onMenuChange === 'function') {
        setTimeout(() => {
          onMenuChange('checkout');
        }, 800);
      } else {
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Error buying now:', err);
      showToast('❌ Gagal proses pembelian', 'error');
    } finally {
      setIsBuyingNow(false);
    }
  };

  // Fungsi untuk navigasi gambar
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  // Handle refresh komentar
  const handleCommentUpdate = () => {
    loadCommentStats();
  };

  if (!product) {
    return (
      <Container className="text-center py-5">
        <Alert variant="secondary">Produk tidak ditemukan</Alert>
      </Container>
    );
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      
      {/* Back Button - Mobile Friendly */}
      <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4 flex-wrap gap-2">
        <Button 
          variant="outline-secondary" 
          onClick={onClose}
          className="d-flex align-items-center gap-2"
          style={{ 
            fontSize: 'clamp(14px, 1.8vw, 16px)', 
            padding: 'clamp(8px, 1.2vw, 12px) clamp(16px, 2.5vw, 24px)',
            borderRadius: '10px'
          }}
        >
          <ChevronLeft size={20} />
          <span className="d-none d-sm-inline">Kembali ke Produk</span>
          <span className="d-sm-none">Kembali</span>
        </Button>
        
        <div className="d-flex gap-2">
          <Button
            variant="outline-light"
            onClick={toggleWishlist}
            className="d-flex align-items-center justify-content-center"
            style={{ 
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: '50%',
              border: '1px solid #2a3444'
            }}
          >
            <Heart 
              size={20} 
              fill={isWishlist ? '#ff4444' : 'none'}
              color={isWishlist ? '#ff4444' : '#fff'}
            />
          </Button>
          <Button
            variant="outline-light"
            onClick={handleShare}
            className="d-flex align-items-center justify-content-center"
            style={{ 
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: '50%',
              border: '1px solid #2a3444'
            }}
          >
            {isCopied ? <Check size={20} color="#4caf50" /> : <Share2 size={20} />}
          </Button>
        </div>
      </div>

      <Row className="g-3 g-md-4">
        {/* Left - Images with Carousel - Mobile Friendly */}
        <Col lg={5}>
          <Card className="border-0 shadow" style={{ background: '#141a24', borderRadius: '16px', overflow: 'hidden' }}>
            <Card.Body className="p-0">
              <div className="position-relative" style={{ background: '#0b0e14' }}>
                <Image 
                  src={allImages[currentImageIndex]} 
                  fluid 
                  style={{ 
                    width: '100%', 
                    height: '350px',
                    objectFit: 'contain',
                    borderRadius: '16px 16px 0 0'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/600x400/ff9100/fff?text=No+Image';
                  }}
                />
                
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="dark"
                      className="position-absolute top-50 start-0 translate-middle-y rounded-circle p-0"
                      style={{ 
                        width: '40px',
                        height: '40px',
                        opacity: 0.8,
                        marginLeft: '8px',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #2a3444'
                      }}
                      onClick={prevImage}
                    >
                      <ChevronLeft size={24} />
                    </Button>
                    <Button
                      variant="dark"
                      className="position-absolute top-50 end-0 translate-middle-y rounded-circle p-0"
                      style={{ 
                        width: '40px',
                        height: '40px',
                        opacity: 0.8,
                        marginRight: '8px',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #2a3444'
                      }}
                      onClick={nextImage}
                    >
                      <ChevronRight size={24} />
                    </Button>
                  </>
                )}

                {allImages.length > 1 && (
                  <Badge 
                    bg="dark" 
                    className="position-absolute bottom-0 start-50 translate-middle-x mb-3"
                    style={{ 
                      opacity: 0.85, 
                      fontSize: '13px', 
                      padding: '4px 16px',
                      borderRadius: '20px'
                    }}
                  >
                    {currentImageIndex + 1} / {allImages.length}
                  </Badge>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="d-flex gap-2 p-3 overflow-auto" style={{ maxHeight: '100px', background: '#0b0e14' }}>
                  {allImages.map((url, idx) => (
                    <Image 
                      key={idx}
                      src={url} 
                      style={{ 
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover', 
                        borderRadius: '8px',
                        border: idx === currentImageIndex ? '3px solid #ff9100' : '1px solid #2a3444',
                        cursor: 'pointer',
                        opacity: idx === currentImageIndex ? 1 : 0.6,
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                      onClick={() => goToImage(idx)}
                      onMouseEnter={(e) => e.target.style.opacity = 1}
                      onMouseLeave={(e) => e.target.style.opacity = idx === currentImageIndex ? 1 : 0.6}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/80x80/ff9100/fff?text=No+Image';
                      }}
                    />
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right - Product Info - Mobile Friendly */}
        <Col lg={7}>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {product.category && (
              <Badge bg="secondary" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px' }}>
                {product.category}
              </Badge>
            )}
            {product.stock < 5 && product.stock > 0 && (
              <Badge bg="warning" className="text-dark" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px' }}>
                🔥 Stok Terbatas
              </Badge>
            )}
            {product.stock === 0 && (
              <Badge bg="danger" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px' }}>
                Habis
              </Badge>
            )}
            {averageRating > 0 && (
              <Badge bg="success" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px' }}>
                ⭐ {averageRating.toFixed(1)}
              </Badge>
            )}
            {commentCount > 0 && (
              <Badge bg="info" className="text-dark" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px' }}>
                💬 {commentCount}
              </Badge>
            )}
          </div>

          <h2 className="text-light fw-bold" style={{ 
            fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
            lineHeight: 1.3,
            marginBottom: '12px'
          }}>
            {product.name}
          </h2>

          <div className="mb-3">
            <div className="text-warning fw-bold" style={{ 
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)' 
            }}>
              {formatCurrency(product.price)}
            </div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="text-muted" style={{ textDecoration: 'line-through', fontSize: '16px' }}>
                {formatCurrency(product.price * 1.3)}
              </span>
              <Badge bg="danger" style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '8px' }}>
                Diskon 30%
              </Badge>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <Star size={20} className="text-warning" fill="#ff9100" />
              <span className="text-light fw-bold" style={{ fontSize: '16px' }}>
                {averageRating > 0 ? averageRating.toFixed(1) : 'Belum'}
              </span>
              <span className="text-muted" style={{ fontSize: '14px' }}>
                ({commentCount} rating)
              </span>
            </div>
            <span className="text-muted" style={{ fontSize: '16px' }}>|</span>
            <span className="text-muted" style={{ fontSize: '15px' }}>171 Terjual</span>
            <span className="text-muted d-none d-sm-inline">|</span>
            <span 
              className="text-muted d-none d-sm-inline" 
              style={{ cursor: 'pointer', fontSize: '15px' }} 
              onClick={() => setActiveTab('komentar')}
            >
              {commentCount > 0 ? `${commentCount} Komentar` : 'Belum ada komentar'}
            </span>
          </div>

          {/* Action Buttons - Mobile Friendly */}
          {isCustomer ? (
            <>
              <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                <span className="text-light fw-bold" style={{ fontSize: '16px' }}>Jumlah:</span>
                <div className="d-flex align-items-center gap-2">
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    style={{ 
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      borderRadius: '8px'
                    }}
                  >
                    -
                  </Button>
                  <span className="text-light fw-bold" style={{ 
                    minWidth: '40px', 
                    textAlign: 'center',
                    fontSize: '18px'
                  }}>
                    {quantity}
                  </span>
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={product.stock > 0 && quantity >= product.stock}
                    style={{ 
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      borderRadius: '8px'
                    }}
                  >
                    +
                  </Button>
                  {product.stock > 0 && (
                    <span className="text-muted" style={{ fontSize: '14px' }}>
                      Stok: {product.stock}
                    </span>
                  )}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <Button 
                  variant="warning" 
                  className="flex-grow-1 fw-bold"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || isAddingToCart}
                  style={{ 
                    padding: '14px 20px',
                    fontSize: '16px',
                    borderRadius: '10px',
                    minHeight: '52px'
                  }}
                >
                  {isAddingToCart ? (
                    <><Spinner animation="border" size="sm" className="me-2" /> Menambahkan...</>
                  ) : (
                    <><ShoppingCart size={20} className="me-2" /> + Keranjang</>
                  )}
                </Button>
                
                <Button 
                  variant="success" 
                  className="flex-grow-1 fw-bold"
                  onClick={handleBuyNow}
                  disabled={product.stock === 0 || isBuyingNow}
                  style={{ 
                    padding: '14px 20px',
                    fontSize: '16px',
                    borderRadius: '10px',
                    minHeight: '52px'
                  }}
                >
                  {isBuyingNow ? (
                    <><Spinner animation="border" size="sm" className="me-2" /> Memproses...</>
                  ) : (
                    <><CreditCard size={20} className="me-2" /> Beli Langsung</>
                  )}
                </Button>
                
                <Button 
                  variant="primary" 
                  className="d-flex align-items-center justify-content-center"
                  onClick={handleChatSeller}
                  style={{ 
                    width: '52px',
                    height: '52px',
                    padding: 0,
                    borderRadius: '10px',
                    flexShrink: 0
                  }}
                  title="Chat Penjual"
                >
                  <MessageCircle size={24} />
                </Button>
              </div>
            </>
          ) : (
            <div className="d-flex flex-wrap gap-2 mb-4">
              <Button 
                variant="primary" 
                className="fw-bold"
                onClick={handleChatSeller}
                style={{ 
                  padding: '14px 24px',
                  fontSize: '16px',
                  borderRadius: '10px',
                  minHeight: '52px'
                }}
              >
                <MessageCircle size={20} className="me-2" />
                Chat Penjual
              </Button>
            </div>
          )}

          {product.bank_name && (
            <div className="bg-dark p-3 rounded mb-3" style={{ background: '#0f161e', borderRadius: '10px' }}>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Banknote size={18} className="text-warning" />
                <span className="text-light" style={{ fontSize: '14px' }}>
                  Pembayaran via {product.bank_name} - {product.bank_account}
                </span>
              </div>
            </div>
          )}

          <div className="bg-dark p-3 rounded" style={{ background: '#0f161e', borderRadius: '10px' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ 
                width: '56px',
                height: '56px'
              }}>
                <Store size={28} className="text-light" />
              </div>
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="text-light fw-bold" style={{ fontSize: '16px' }}>
                  {product.user_email?.split('@')[0] || 'Toko'}
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <Star size={16} className="text-warning" fill="#ff9100" />
                  <span className="text-muted" style={{ fontSize: '13px' }}>4.9 (252,8 rb)</span>
                  <span className="text-muted d-none d-sm-inline">|</span>
                  <span className="text-muted d-none d-sm-inline" style={{ fontSize: '13px' }}>2.832 total barang</span>
                </div>
              </div>
              <Button 
                variant="outline-primary" 
                onClick={handleChatSeller}
                className="d-flex align-items-center gap-2 flex-shrink-0"
                style={{ 
                  fontSize: '13px',
                  padding: '8px 16px',
                  borderRadius: '8px'
                }}
              >
                <MessageCircle size={16} />
                <span className="d-none d-sm-inline">Chat</span>
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Tabs: Detail, Ulasan, Komentar, Rekomendasi - Mobile Friendly dengan ukuran lebih besar */}
      <Row className="mt-4 mt-md-5">
        <Col>
          <Card className="border-0 shadow" style={{ background: '#141a24', borderRadius: '16px' }}>
            <Card.Body className="p-3 p-md-4">
              <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                <Nav variant="tabs" className="border-secondary" style={{ 
                  borderBottom: '2px solid #2a3444',
                  gap: '4px',
                  flexWrap: 'nowrap',
                  overflowX: 'auto'
                }}>
                  <Nav.Item>
                    <Nav.Link eventKey="detail" className="text-light fw-semibold" style={{ 
                      fontSize: 'clamp(15px, 1.8vw, 18px)',
                      padding: 'clamp(12px, 1.5vw, 16px) clamp(20px, 2.5vw, 32px)',
                      whiteSpace: 'nowrap',
                      borderBottom: '3px solid transparent',
                      transition: 'all 0.3s ease'
                    }}>
                      📋 Detail
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="ulasan" className="text-light fw-semibold" style={{ 
                      fontSize: 'clamp(15px, 1.8vw, 18px)',
                      padding: 'clamp(12px, 1.5vw, 16px) clamp(20px, 2.5vw, 32px)',
                      whiteSpace: 'nowrap',
                      borderBottom: '3px solid transparent',
                      transition: 'all 0.3s ease'
                    }}>
                      ⭐ Ulasan
                      {commentCount > 0 && (
                        <Badge bg="warning" className="ms-2 text-dark" style={{ 
                          fontSize: 'clamp(11px, 1.2vw, 13px)',
                          padding: '4px 10px',
                          borderRadius: '20px'
                        }}>
                          {commentCount}
                        </Badge>
                      )}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="komentar" className="text-light fw-semibold" style={{ 
                      fontSize: 'clamp(15px, 1.8vw, 18px)',
                      padding: 'clamp(12px, 1.5vw, 16px) clamp(20px, 2.5vw, 32px)',
                      whiteSpace: 'nowrap',
                      borderBottom: '3px solid transparent',
                      transition: 'all 0.3s ease'
                    }}>
                      💬 Komentar
                      {commentCount > 0 && (
                        <Badge bg="info" className="ms-2 text-dark" style={{ 
                          fontSize: 'clamp(11px, 1.2vw, 13px)',
                          padding: '4px 10px',
                          borderRadius: '20px'
                        }}>
                          {commentCount}
                        </Badge>
                      )}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="rekomendasi" className="text-light fw-semibold" style={{ 
                      fontSize: 'clamp(15px, 1.8vw, 18px)',
                      padding: 'clamp(12px, 1.5vw, 16px) clamp(20px, 2.5vw, 32px)',
                      whiteSpace: 'nowrap',
                      borderBottom: '3px solid transparent',
                      transition: 'all 0.3s ease'
                    }}>
                      🛍️ Rekomendasi
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                <Tab.Content className="pt-3 pt-md-4">
                  {/* Tab Detail */}
                  <Tab.Pane eventKey="detail">
                    <div className="text-light">
                      <h5 className="fw-bold mb-3" style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}>
                        Deskripsi Produk
                      </h5>
                      <p className="text-muted" style={{ fontSize: 'clamp(15px, 1.5vw, 16px)', lineHeight: 1.8 }}>
                        {product.description || 'Tidak ada deskripsi'}
                      </p>
                      <hr className="border-secondary" />
                      <h5 className="fw-bold mb-3" style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}>
                        Spesifikasi
                      </h5>
                      <Row>
                        <Col md={6}>
                          <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                            <span className="text-muted" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Kondisi</span>
                            <span className="text-light" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Baru</span>
                          </div>
                          <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                            <span className="text-muted" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Kategori</span>
                            <span className="text-light" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>{product.category || '-'}</span>
                          </div>
                          <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                            <span className="text-muted" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Stok</span>
                            <span className="text-light" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>{product.stock || 'Tidak terbatas'}</span>
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                            <span className="text-muted" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Berat</span>
                            <span className="text-light" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>-</span>
                          </div>
                          <div className="d-flex justify-content-between py-2 border-bottom border-secondary border-opacity-25">
                            <span className="text-muted" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Dikirim dari</span>
                            <span className="text-light" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Indonesia</span>
                          </div>
                          <div className="d-flex justify-content-between py-2">
                            <span className="text-muted" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>Garansi</span>
                            <span className="text-light" style={{ fontSize: 'clamp(14px, 1.3vw, 15px)' }}>6 bulan</span>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Tab.Pane>

                  {/* Tab Ulasan dengan Rating Summary */}
                  <Tab.Pane eventKey="ulasan">
                    <CommentSection 
                      productId={product.id} 
                      onCommentUpdate={handleCommentUpdate}
                    />
                  </Tab.Pane>

                  {/* Tab Komentar */}
                  <Tab.Pane eventKey="komentar">
                    <CommentSection 
                      productId={product.id} 
                      onCommentUpdate={handleCommentUpdate}
                    />
                  </Tab.Pane>

                  {/* Tab Rekomendasi */}
                  <Tab.Pane eventKey="rekomendasi">
                    <h5 className="text-light fw-bold mb-3" style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}>
                      Lainnya di toko ini
                    </h5>
                    {shopProducts.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: 'clamp(15px, 1.5vw, 16px)' }}>
                        Belum ada produk lain di toko ini
                      </p>
                    ) : (
                      <Row className="g-3">
                        {shopProducts.map((item) => (
                          <Col key={item.id} xs={6} sm={4} md={3}>
                            <Card 
                              className="border-0" 
                              style={{ 
                                background: '#0f161e', 
                                borderRadius: '12px', 
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onClick={() => {
                                if (onClose) {
                                  onClose();
                                }
                                if (onMenuChange) {
                                  localStorage.setItem('selectedProduct', JSON.stringify(item));
                                  onMenuChange('products');
                                }
                              }}
                            >
                              <Card.Img 
                                src={item.image_urls?.[0] || item.image_url || 'https://via.placeholder.com/150'} 
                                style={{ 
                                  height: '140px', 
                                  objectFit: 'cover',
                                  borderRadius: '12px 12px 0 0'
                                }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/150/ff9100/fff?text=No+Image';
                                }}
                              />
                              <Card.Body className="p-2">
                                <div className="text-light small fw-bold text-truncate" style={{ fontSize: '13px' }}>
                                  {item.name}
                                </div>
                                <div className="text-warning small fw-bold" style={{ fontSize: '14px' }}>
                                  {formatCurrency(item.price)}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Mobile Floating Action Buttons */}
      {isCustomer && (
        <div 
          className="d-md-none position-fixed bottom-0 start-0 end-0 p-3"
          style={{
            background: 'rgba(11, 14, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid #2a3444',
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom, 16px)'
          }}
        >
          <div className="d-flex gap-2">
            <Button 
              variant="warning" 
              className="flex-grow-1 fw-bold"
              onClick={handleAddToCart}
              disabled={product.stock === 0 || isAddingToCart}
              style={{ 
                padding: '14px 16px',
                fontSize: '16px',
                borderRadius: '12px'
              }}
            >
              {isAddingToCart ? (
                <><Spinner animation="border" size="sm" className="me-2" /> Menambahkan...</>
              ) : (
                <><ShoppingCart size={20} className="me-2" /> Keranjang</>
              )}
            </Button>
            <Button 
              variant="success" 
              className="flex-grow-1 fw-bold"
              onClick={handleBuyNow}
              disabled={product.stock === 0 || isBuyingNow}
              style={{ 
                padding: '14px 16px',
                fontSize: '16px',
                borderRadius: '12px'
              }}
            >
              {isBuyingNow ? (
                <><Spinner animation="border" size="sm" className="me-2" /> Memproses...</>
              ) : (
                <><CreditCard size={20} className="me-2" /> Beli</>
              )}
            </Button>
          </div>
        </div>
      )}

      <style>
        {`
          .nav-tabs .nav-link {
            color: #8892a8;
            border: none;
            background: transparent;
            transition: all 0.3s ease;
            position: relative;
          }
          .nav-tabs .nav-link:hover {
            color: #ff9100;
            background: rgba(255, 145, 0, 0.05);
            border-radius: 8px 8px 0 0;
          }
          .nav-tabs .nav-link.active {
            color: #ff9100 !important;
            background: rgba(255, 145, 0, 0.08) !important;
            border-bottom: 3px solid #ff9100 !important;
            border-radius: 8px 8px 0 0;
          }
          .nav-tabs .nav-link:focus {
            outline: none;
          }
          .nav-tabs {
            border-bottom: 2px solid #2a3444 !important;
          }
          .nav-tabs .nav-link .badge {
            font-size: 12px;
            padding: 3px 10px;
          }

          /* Mobile Responsive */
          @media (max-width: 768px) {
            .nav-tabs .nav-link {
              padding: 10px 14px !important;
              font-size: 14px !important;
            }
            .nav-tabs .nav-link .badge {
              font-size: 10px !important;
              padding: 2px 8px !important;
            }
            .card-body {
              padding: 12px !important;
            }
          }

          @media (max-width: 576px) {
            .nav-tabs .nav-link {
              padding: 8px 12px !important;
              font-size: 13px !important;
            }
            .nav-tabs .nav-link .badge {
              font-size: 9px !important;
              padding: 2px 6px !important;
            }
            .card-body {
              padding: 8px !important;
            }
          }
        `}
      </style>
    </>
  );
};

export default ProductDetail;