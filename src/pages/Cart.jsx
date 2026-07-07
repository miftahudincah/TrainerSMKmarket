import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Image, Alert, Spinner
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import ProductDetail from './ProductDetail';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  ArrowLeft,
  ShoppingBag,
  Eye,
  CheckCircle,
  Circle
} from 'lucide-react';

const Cart = ({ onMenuChange }) => {
  const { user, cart, saveCart, loadCart } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Show toast with auto clear
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  // Load cart from AuthContext
  useEffect(() => {
    if (user) {
      loadCartFromContext();
    }
  }, [user, cart]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      if (user) {
        loadCartFromContext();
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);

    // Listen untuk userLoggedIn - refresh data setelah login
    const handleUserLoggedIn = () => {
      if (user) {
        loadCartFromContext();
      }
    };
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, [user]);

  const loadCartFromContext = () => {
    console.log('📦 Loading cart from context:', cart);
    if (cart && cart.length > 0) {
      setSelectedItems(cart.map(item => item.id));
      setSelectAll(true);
    } else {
      setSelectedItems([]);
      setSelectAll(false);
    }
  };

  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) {
      await removeFromCart(id);
      return;
    }
    const updated = cart.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    await saveCart(updated);
  };

  const removeFromCart = async (id) => {
    if (!window.confirm('Yakin hapus produk ini dari keranjang?')) return;
    const updated = cart.filter(item => item.id !== id);
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    await saveCart(updated);
    showToast('🗑 Produk dihapus dari keranjang', 'info');
  };

  const clearCart = async () => {
    if (!window.confirm('Yakin kosongkan keranjang?')) return;
    setSelectedItems([]);
    setSelectAll(false);
    await saveCart([]);
    showToast('🛒 Keranjang dikosongkan', 'info');
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(cart.map(item => item.id));
      setSelectAll(true);
    }
  };

  useEffect(() => {
    if (cart.length > 0 && selectedItems.length === cart.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedItems, cart]);

  const getSelectedTotalPrice = () => {
    return cart
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getSelectedTotalItems = () => {
    return cart
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // === GO TO CHECKOUT - DENGAN VALIDASI LOGIN ===
  const goToCheckout = () => {
    // CEK APAKAH USER SUDAH LOGIN
    if (!user) {
      showToast('⚠️ Silakan login terlebih dahulu untuk checkout!', 'warning');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }

    const selectedCart = cart.filter(item => selectedItems.includes(item.id));
    console.log('🛒 Selected items for checkout:', selectedCart);
    
    if (selectedCart.length === 0) {
      showToast('Pilih minimal 1 produk untuk checkout!', 'error');
      return;
    }
    
    // Simpan selected items ke localStorage untuk halaman checkout
    localStorage.setItem('checkoutItems', JSON.stringify(selectedCart));
    console.log('✅ Checkout items saved to localStorage:', selectedCart);
    
    if (onMenuChange && typeof onMenuChange === 'function') {
      onMenuChange('checkout');
    } else {
      console.warn('⚠️ onMenuChange tidak tersedia!');
    }
  };

  const getMainImage = (product) => {
    if (product.image_urls && product.image_urls.length > 0) {
      return product.image_urls[0];
    }
    return product.image_url || 'https://via.placeholder.com/100/ff9100/fff?text=Product';
  };

  const goBackToProducts = () => {
    if (onMenuChange && typeof onMenuChange === 'function') {
      onMenuChange('products');
    }
  };

  // === HANDLE PRODUCT CLICK - DENGAN VALIDASI LOGIN ===
  const handleProductClick = (product) => {
    // CEK APAKAH USER SUDAH LOGIN
    if (!user) {
      showToast('⚠️ Silakan login terlebih dahulu untuk melihat detail produk!', 'warning');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }
    setSelectedProduct(product);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedProduct(null);
  };

  // === Tampilkan ProductDetail jika ada produk yang dipilih ===
  if (showDetail && selectedProduct) {
    return (
      <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
        <ProductDetail 
          product={selectedProduct} 
          onClose={handleCloseDetail}
          onAddToCart={async (product) => {
            // CEK APAKAH USER SUDAH LOGIN
            if (!user) {
              showToast('⚠️ Silakan login terlebih dahulu!', 'warning');
              window.dispatchEvent(new CustomEvent('showLogin'));
              return;
            }
            const existing = cart.find(item => item.id === product.id);
            let newCart;
            if (existing) {
              newCart = cart.map(item => 
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              );
            } else {
              newCart = [...cart, { ...product, quantity: 1 }];
            }
            setSelectedItems(prev => [...prev, product.id]);
            await saveCart(newCart);
            showToast('🛒 Produk ditambahkan ke keranjang!', 'success');
          }}
          onMenuChange={onMenuChange}
        />
      </Container>
    );
  }

  const isItemSelected = (id) => selectedItems.includes(id);

  // Jika user belum login, tampilkan pesan dengan tombol login
  if (!user) {
    return (
      <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
        <Card className="border-0 shadow text-center py-5" style={{ background: '#141a24', borderRadius: '16px' }}>
          <Card.Body>
            <div style={{ fontSize: '64px' }}>🔒</div>
            <h4 className="text-light mt-3">Silakan Login</h4>
            <p className="text-muted">Login untuk melihat keranjang Anda</p>
            <Button 
              variant="warning" 
              className="mt-2"
              onClick={() => {
                showToast('⚠️ Silakan login terlebih dahulu!', 'warning');
                window.dispatchEvent(new CustomEvent('showLogin'));
              }}
              size="sm"
            >
              🔑 Login Sekarang
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={goBackToProducts}
            className="px-2 px-sm-3"
          >
            <ArrowLeft size={16} className="me-1" />
            <span>Kembali ke Produk</span>
          </Button>
          <div>
            <h4 className="text-light fw-bold mb-0" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)' }}>
              🛒 Keranjang
            </h4>
            <p className="text-muted small mb-0">
              {getTotalItems()} item • {formatCurrency(getTotalPrice())}
            </p>
          </div>
        </div>
        <div className="d-flex gap-1 gap-sm-2">
          {cart.length > 0 && (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={clearCart}
              className="px-2 px-sm-3"
            >
              <Trash2 size={14} className="me-1" />
              <span className="d-none d-sm-inline">Kosongkan</span>
            </Button>
          )}
          <Button 
            variant="outline-light" 
            size="sm"
            onClick={() => {
              if (user) {
                loadCart(user.uid);
              }
            }}
            className="px-2 px-sm-3"
          >
            ⟳ <span className="d-none d-sm-inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Cart Content */}
      {cart.length === 0 ? (
        <Card className="border-0 shadow text-center py-4 py-sm-5" style={{ background: '#141a24', borderRadius: '16px' }}>
          <Card.Body>
            <div style={{ fontSize: 'clamp(48px, 10vw, 80px)' }}>🛒</div>
            <h4 className="text-light mt-3">Keranjang Kosong</h4>
            <p className="text-muted small">Belum ada produk di keranjang Anda</p>
            <Button 
              variant="warning" 
              className="mt-2"
              onClick={goBackToProducts}
              size="sm"
            >
              <ShoppingBag size={16} className="me-2" />
              Belanja Sekarang
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3 g-md-4">
          {/* Cart Items */}
          <Col xs={12} lg={8}>
            <Card className="border-0 shadow" style={{ background: '#141a24', borderRadius: '16px' }}>
              <Card.Body className="p-2 p-sm-3 p-md-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="text-light fw-bold">
                    <ShoppingCart size={16} className="me-2 text-warning" />
                    Produk dalam keranjang ({getTotalItems()})
                  </h6>
                  {cart.length > 0 && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={toggleSelectAll}
                      className="d-flex align-items-center gap-1"
                    >
                      {selectAll ? (
                        <CheckCircle size={16} className="text-success" />
                      ) : (
                        <Circle size={16} className="text-muted" />
                      )}
                      <span>{selectAll ? 'Batalkan' : 'Pilih Semua'}</span>
                    </Button>
                  )}
                </div>

                {cart.map((item) => (
                  <div 
                    key={item.id} 
                    className="d-flex flex-wrap align-items-center gap-2 p-2 p-sm-3 mb-2 rounded cart-item"
                    style={{ 
                      background: '#0f161e',
                      border: isItemSelected(item.id) ? '1px solid #ff9100' : '1px solid #1f2836',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div 
                      className="cursor-pointer d-flex align-items-center"
                      onClick={() => toggleSelectItem(item.id)}
                      style={{ padding: '4px' }}
                    >
                      {isItemSelected(item.id) ? (
                        <CheckCircle size={20} className="text-warning" />
                      ) : (
                        <Circle size={20} className="text-muted" />
                      )}
                    </div>

                    <div 
                      className="position-relative"
                      style={{ 
                        width: 'clamp(60px, 10vw, 80px)', 
                        height: 'clamp(60px, 10vw, 80px)',
                        flexShrink: 0,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleProductClick(item)}
                    >
                      <Image 
                        src={getMainImage(item)} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          borderRadius: '8px',
                          transition: 'transform 0.2s ease'
                        }}
                        className="cart-item-img"
                      />
                      <div 
                        className="position-absolute top-0 end-0 bg-dark rounded-circle p-1"
                        style={{ 
                          opacity: 0.8,
                          transform: 'translate(25%, -25%)',
                          border: '1px solid #2a3444'
                        }}
                      >
                        <Eye size={10} className="text-light" />
                      </div>
                    </div>
                    
                    <div 
                      className="flex-grow-1 cursor-pointer"
                      style={{ minWidth: '80px', cursor: 'pointer' }}
                      onClick={() => handleProductClick(item)}
                    >
                      <div className="text-light fw-bold" style={{ fontSize: 'clamp(13px, 1.2vw, 16px)' }}>
                        {item.name}
                      </div>
                      <div className="text-warning fw-bold" style={{ fontSize: 'clamp(14px, 1.3vw, 18px)' }}>
                        {formatCurrency(item.price)}
                      </div>
                      {item.category && (
                        <Badge bg="secondary" className="mt-1" style={{ fontSize: '8px' }}>
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    <div className="d-flex align-items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="outline-secondary"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{ 
                          width: 'clamp(28px, 4vw, 32px)', 
                          height: 'clamp(28px, 4vw, 32px)', 
                          padding: 0, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: 'clamp(12px, 1vw, 14px)'
                        }}
                      >
                        <Minus size={12} />
                      </Button>
                      <span className="text-light fw-bold" style={{ minWidth: '24px', textAlign: 'center', fontSize: 'clamp(14px, 1.2vw, 16px)' }}>
                        {item.quantity}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline-secondary"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ 
                          width: 'clamp(28px, 4vw, 32px)', 
                          height: 'clamp(28px, 4vw, 32px)', 
                          padding: 0, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: 'clamp(12px, 1vw, 14px)'
                        }}
                      >
                        <Plus size={12} />
                      </Button>
                    </div>

                    <div className="text-end" style={{ minWidth: 'clamp(70px, 12vw, 100px)' }}>
                      <div className="text-light fw-bold" style={{ fontSize: 'clamp(13px, 1.2vw, 16px)' }}>
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        className="mt-1"
                        onClick={() => removeFromCart(item.id)}
                        style={{ padding: '2px 6px', fontSize: 'clamp(10px, 0.8vw, 12px)' }}
                      >
                        <Trash2 size={12} className="me-1" /> 
                        <span className="d-none d-sm-inline">Hapus</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>

          {/* Summary */}
          <Col xs={12} lg={4}>
            <Card className="border-0 shadow sticky-top" style={{ background: '#141a24', borderRadius: '16px', top: 'clamp(70px, 10vh, 80px)' }}>
              <Card.Body className="p-3 p-sm-4">
                <h6 className="text-light fw-bold mb-3">Ringkasan Belanja</h6>
                
                <div className="d-flex justify-content-between py-1 py-sm-2">
                  <span className="text-muted small">Total Item</span>
                  <span className="text-light small">
                    {getSelectedTotalItems()} dari {getTotalItems()} item
                  </span>
                </div>
                
                <div className="d-flex justify-content-between py-1 py-sm-2 border-bottom border-secondary">
                  <span className="text-muted small">Total Harga</span>
                  <span className="text-warning fw-bold small">
                    {formatCurrency(getSelectedTotalPrice())}
                  </span>
                </div>

                <div className="d-flex justify-content-between py-1 py-sm-2">
                  <span className="text-muted small">Ongkos Kirim</span>
                  <span className="text-success small">Gratis</span>
                </div>

                <hr className="border-secondary my-2" />

                <div className="d-flex justify-content-between py-1 py-sm-2">
                  <span className="text-light fw-bold small">Total</span>
                  <span className="text-warning fw-bold" style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}>
                    {formatCurrency(getSelectedTotalPrice())}
                  </span>
                </div>

                {selectedItems.length === 0 && (
                  <Alert variant="warning" className="mt-2 py-2 text-center small">
                    Pilih minimal 1 produk
                  </Alert>
                )}

                <Button 
                  variant="success" 
                  className="w-100 mt-2 mt-sm-3 fw-bold"
                  onClick={goToCheckout}
                  disabled={loading || selectedItems.length === 0}
                  style={{ padding: 'clamp(10px, 1.5vh, 14px)', borderRadius: '12px', fontSize: 'clamp(14px, 1.2vw, 16px)' }}
                >
                  <CreditCard size={16} className="me-2" /> 
                  Checkout ({selectedItems.length} item)
                </Button>

                <div className="text-center mt-2">
                  <small className="text-muted" style={{ fontSize: 'clamp(10px, 0.8vw, 12px)' }}>
                    <span className="text-success">✓</span> Gratis ongkir
                  </small>
                  {' • '}
                  <small className="text-muted" style={{ fontSize: 'clamp(10px, 0.8vw, 12px)' }}>
                    <span className="text-success">✓</span> Garansi 6 bulan
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <style>
        {`
          .cart-item:hover {
            border-color: #ff9100 !important;
            box-shadow: 0 0 20px rgba(255, 145, 0, 0.05);
          }

          .cart-item-img:hover {
            transform: scale(1.05);
          }

          .cursor-pointer {
            cursor: pointer;
          }

          @media (max-width: 576px) {
            .cart-item {
              flex-direction: row !important;
              flex-wrap: wrap !important;
            }
            .cart-item .flex-grow-1 {
              min-width: 100px !important;
            }
          }
        `}
      </style>
    </Container>
  );
};

export default Cart;