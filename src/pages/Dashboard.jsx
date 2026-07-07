// FORCE UPDATE - 2026-07-07 20:15 WIB
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Image, Spinner, Carousel } from 'react-bootstrap';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import ProductDetail from './ProductDetail';
import Profile from './Profile';
import Settings from './Settings';
import Products from './Products';
import Cart from './Cart';
import Checkout from './Checkout';
import OrdersSent from './OrdersSent';
import OrdersCompleted from './OrdersCompleted';
import OrdersManagement from './OrdersManagement';
import Messages from './Messages';
import Toast from '../components/Toast';
import { hasPermission } from '../utils/roles';
import { 
  ShoppingCart, 
  Star, 
  Heart, 
  Package, 
  Sparkles,
  Award,
  Flame,
  RefreshCw,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  Truck,
  Zap,
  MessageSquare
} from 'lucide-react';

const Dashboard = () => {
  const { user, userRole, cart, saveCart, refreshRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [productStats, setProductStats] = useState({});

  // Fungsi showToast
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  // Load data
  useEffect(() => {
    loadDashboardData();
    loadWishlist();

    const handleSearchCleared = () => {
      setSearchResults(null);
      setIsSearching(false);
      setSearchQuery('');
      loadDashboardData();
    };
    window.addEventListener('searchCleared', handleSearchCleared);

    const handleShowLogin = () => {
      if (!user) {
        window.dispatchEvent(new CustomEvent('requireLogin'));
      }
    };
    window.addEventListener('showLogin', handleShowLogin);

    const handleUserLoggedIn = () => {
      loadDashboardData();
      loadWishlist();
    };
    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    return () => {
      window.removeEventListener('searchCleared', handleSearchCleared);
      window.removeEventListener('showLogin', handleShowLogin);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  const loadWishlist = () => {
    const saved = localStorage.getItem('wishlist');
    if (saved) setWishlist(JSON.parse(saved));
  };

  const loadProductStats = async (productIds) => {
    try {
      const { data, error } = await supabase
        .from('product_comments')
        .select('product_id, rating')
        .in('product_id', productIds);

      if (error) throw error;

      const stats = {};
      productIds.forEach(id => {
        const productComments = data.filter(c => c.product_id === id);
        if (productComments.length > 0) {
          const totalRating = productComments.reduce((sum, c) => sum + c.rating, 0);
          stats[id] = {
            count: productComments.length,
            average: totalRating / productComments.length
          };
        } else {
          stats[id] = { count: 0, average: 0 };
        }
      });
      setProductStats(stats);
    } catch (err) {
      console.error('Error loading product stats:', err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);

      if (productsError) throw productsError;
      setProducts(productsData || []);

      if (productsData && productsData.length > 0) {
        const productIds = productsData.map(p => p.id);
        await loadProductStats(productIds);

        const shuffled = [...productsData].sort(() => Math.random() - 0.5);
        setFeaturedProducts(shuffled.slice(0, 5));
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (product) => {
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

  const toggleWishlist = (product, e) => {
    e.stopPropagation();
    const exists = wishlist.find(item => item.id === product.id);
    let newWishlist;
    if (exists) {
      newWishlist = wishlist.filter(item => item.id !== product.id);
      showToast('❤️ Dihapus dari wishlist', 'info');
    } else {
      newWishlist = [...wishlist, product];
      showToast('❤️ Ditambahkan ke wishlist!', 'success');
    }
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
  };

  const addToCart = async (product, e) => {
    if (e) e.stopPropagation();
    
    if (!user) {
      showToast('⚠️ Silakan login terlebih dahulu untuk menambahkan ke keranjang!', 'warning');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }

    if (product.stock === 0) {
      showToast('⚠️ Stok produk habis!', 'error');
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
    await saveCart(newCart);
    showToast('🛒 Ditambahkan ke keranjang!', 'success');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMainImage = (product) => {
    if (product.image_urls && product.image_urls.length > 0) {
      return product.image_urls[0];
    }
    return product.image_url || 'https://via.placeholder.com/400x300/ff9100/fff?text=Product';
  };

  const handleRefreshRole = async () => {
    setRefreshing(true);
    try {
      const newRole = await refreshRole();
      console.log('✅ Role refreshed:', newRole);
      showToast(`Role updated: ${newRole}`, 'success');
    } catch (err) {
      console.error('Error refreshing role:', err);
      showToast('Error refreshing role. Check console.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchResults = (results, query) => {
    if (results === null) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchQuery('');
      loadDashboardData();
    } else {
      setSearchResults(results);
      setIsSearching(true);
      if (query) setSearchQuery(query);
    }
  };

  // Render Product Detail
  if (showDetail && selectedProduct) {
    return (
      <Layout 
        activeMenu={activeMenu} 
        onMenuChange={setActiveMenu}
        onSearchResults={handleSearchResults}
      >
        <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
          <ProductDetail 
            product={selectedProduct} 
            onClose={handleCloseDetail}
            onAddToCart={addToCart}
            onMenuChange={setActiveMenu}
          />
        </Container>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout 
        activeMenu={activeMenu} 
        onMenuChange={setActiveMenu}
        onSearchResults={handleSearchResults}
      >
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="warning" size="lg" />
        </div>
      </Layout>
    );
  }

  const displayProducts = searchResults !== null ? searchResults : products;
  const isSearchMode = searchResults !== null && isSearching;

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <>
            <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

            {user && (
              <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <Badge bg={userRole === 'developer' ? 'danger' : userRole === 'owner' ? 'warning' : 'info'} className="me-2" style={{ fontSize: '14px' }}>
                  👤 Role: {userRole || 'Loading...'}
                </Badge>
                <Badge bg="secondary" className="me-2">
                  📧 {user?.email || 'Loading...'}
                </Badge>
                {userRole === 'developer' && (
                  <Badge bg="danger" className="ms-2" style={{ fontSize: '12px' }}>
                    ⭐ Developer Access
                  </Badge>
                )}
                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  className="ms-2"
                  onClick={handleRefreshRole}
                  disabled={refreshing}
                >
                  {refreshing ? '⏳' : '🔄 Refresh Role'}
                </Button>
              </div>
            )}

            {/* FEATURED PRODUCTS CAROUSEL */}
            {featuredProducts.length > 0 && !isSearchMode && (
              <Row className="mb-4">
                <Col>
                  <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                    <Sparkles size={20} className="text-warning" />
                    <h5 className="text-light fw-bold mb-0">✨ Produk Unggulan</h5>
                    <Badge bg="warning" className="text-dark ms-2">HOT</Badge>
                  </div>
                  
                  <Card className="border-0" style={{ 
                    background: 'linear-gradient(135deg, #141a24, #1a2233)', 
                    borderRadius: '16px',
                    overflow: 'hidden'
                  }}>
                    <Card.Body className="p-0">
                      <Carousel 
                        interval={4000}
                        indicators={true}
                        controls={true}
                        pause="hover"
                        className="featured-carousel"
                      >
                        {featuredProducts.map((product) => {
                          const stats = productStats[product.id] || { count: 0, average: 0 };
                          return (
                            <Carousel.Item 
                              key={product.id}
                              onClick={() => handleCardClick(product)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="position-relative" style={{ height: '300px', background: '#0b0e14' }}>
                                <Image 
                                  src={getMainImage(product)}
                                  fluid
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    opacity: 0.8
                                  }}
                                />
                                <div 
                                  className="position-absolute bottom-0 start-0 end-0 p-4"
                                  style={{
                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))'
                                  }}
                                >
                                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div>
                                      <Badge bg="warning" className="text-dark mb-2">
                                        <Flame size={12} className="me-1" />
                                        Featured
                                      </Badge>
                                      <h4 className="text-light fw-bold" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
                                        {product.name}
                                      </h4>
                                      <p className="text-warning fw-bold h5">
                                        {formatCurrency(product.price)}
                                      </p>
                                      <div className="d-flex gap-2 flex-wrap">
                                        <Star size={16} className="text-warning" fill="#ff9100" />
                                        <span className="text-light">{stats.average > 0 ? stats.average.toFixed(1) : 'Belum'}</span>
                                        <span className="text-muted">| {stats.count} ulasan</span>
                                        <span className="text-muted">| 123 terjual</span>
                                      </div>
                                    </div>
                                    <Button 
                                      variant="warning" 
                                      className="rounded-circle p-2 p-sm-3"
                                      style={{ width: 'clamp(40px, 5vw, 56px)', height: 'clamp(40px, 5vw, 56px)' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(product, e);
                                      }}
                                    >
                                      <ShoppingCart size={20} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              <Carousel.Caption className="d-none d-md-block">
                                <h5 className="text-warning">{product.name}</h5>
                                <p className="text-light">{product.description?.substring(0, 80) || ''}...</p>
                              </Carousel.Caption>
                            </Carousel.Item>
                          );
                        })}
                      </Carousel>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* PRODUCT GRID - 2 Cards per row */}
            <Row>
              <Col>
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <Package size={20} className="text-warning" />
                    <h5 className="text-light fw-bold mb-0" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                      {isSearchMode ? '🔍 Hasil Pencarian' : '📦 Produk Terbaru'}
                    </h5>
                    <Badge bg="secondary" className="ms-2" style={{ fontSize: 'clamp(10px, 1.2vw, 13px)' }}>
                      {displayProducts.length} produk
                    </Badge>
                    {isSearchMode && (
                      <Badge bg="info" className="ms-1" style={{ fontSize: 'clamp(10px, 1.2vw, 13px)' }}>
                        "{searchQuery}"
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={loadDashboardData}
                    className="btn-sm-mobile"
                    style={{ fontSize: 'clamp(11px, 1.2vw, 13px)' }}
                  >
                    <RefreshCw size={14} className="me-1" />
                    <span className="d-none d-sm-inline">Refresh</span>
                    <span className="d-sm-none">🔄</span>
                  </Button>
                </div>
              </Col>
            </Row>

            {/* 2 Cards per row - Responsive */}
            <Row className="g-2 g-sm-3">
              {displayProducts.length === 0 ? (
                <Col xs={12}>
                  <div className="text-center py-5">
                    <Package size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">
                      {isSearchMode ? 'Tidak ada produk ditemukan' : 'Belum ada produk'}
                    </h5>
                    <p className="text-muted small">
                      {isSearchMode 
                        ? `Pencarian untuk "${searchQuery}" tidak menghasilkan produk. Coba kata kunci lain.`
                        : 'Silakan tambahkan produk melalui menu Produk'}
                    </p>
                  </div>
                </Col>
              ) : (
                displayProducts.map((product, index) => {
                  const stats = productStats[product.id] || { count: 0, average: 0 };
                  const isInWishlist = wishlist.find(item => item.id === product.id);
                  
                  return (
                    <Col key={product.id} xs={6} sm={6} md={4} lg={3} xl={2}>
                      <Card 
                        className="border-0 h-100 product-card"
                        style={{ 
                          background: '#141a24', 
                          borderRadius: '14px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          animation: `fadeInUp 0.4s ease ${index * 0.05}s both`
                        }}
                        onClick={() => handleCardClick(product)}
                      >
                        {/* Image */}
                        <div className="position-relative" style={{ 
                          height: 'clamp(120px, 20vw, 180px)', 
                          overflow: 'hidden' 
                        }}>
                          <Image 
                            src={getMainImage(product)}
                            fluid
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover',
                              transition: 'transform 0.4s ease'
                            }}
                            className="product-img"
                          />
                          
                          {/* Badges */}
                          <div className="position-absolute top-0 start-0 p-1 d-flex flex-wrap gap-1">
                            {product.stock < 5 && product.stock > 0 && (
                              <Badge bg="warning" className="text-dark" style={{ fontSize: 'clamp(6px, 0.8vw, 9px)' }}>
                                <Flame size={10} className="me-1 d-none d-sm-inline" />
                                <span className="d-none d-sm-inline">Stok Terbatas</span>
                                <span className="d-sm-none">🔥</span>
                              </Badge>
                            )}
                            {product.stock === 0 && (
                              <Badge bg="danger" style={{ fontSize: 'clamp(6px, 0.8vw, 9px)' }}>
                                <span className="d-none d-sm-inline">Habis</span>
                                <span className="d-sm-none">❌</span>
                              </Badge>
                            )}
                            {index < 3 && !isSearchMode && (
                              <Badge bg="success" style={{ fontSize: 'clamp(6px, 0.8vw, 9px)' }}>
                                <Award size={10} className="me-1 d-none d-sm-inline" />
                                <span className="d-none d-sm-inline">Terlaris</span>
                                <span className="d-sm-none">🏆</span>
                              </Badge>
                            )}
                            {stats.count > 0 && (
                              <Badge bg="info" className="text-dark" style={{ fontSize: 'clamp(6px, 0.8vw, 9px)' }}>
                                <MessageSquare size={8} className="me-1 d-none d-sm-inline" />
                                <span className="d-none d-sm-inline">{stats.count} ulasan</span>
                                <span className="d-sm-none">💬{stats.count}</span>
                              </Badge>
                            )}
                          </div>

                          {/* Wishlist Button */}
                          <Button
                            size="sm"
                            variant="dark"
                            className="position-absolute top-0 end-0 m-1 rounded-circle p-0"
                            style={{ 
                              width: 'clamp(22px, 3vw, 28px)', 
                              height: 'clamp(22px, 3vw, 28px)', 
                              border: '1px solid #2a3444',
                              minWidth: '22px',
                              minHeight: '22px'
                            }}
                            onClick={(e) => toggleWishlist(product, e)}
                          >
                            <Heart 
                              size={14} 
                              fill={isInWishlist ? '#ff4444' : 'none'}
                              color={isInWishlist ? '#ff4444' : '#fff'}
                            />
                          </Button>

                          {/* Rating Badge */}
                          {stats.count > 0 && (
                            <Badge 
                              bg="dark" 
                              className="position-absolute bottom-0 end-0 m-1 d-flex align-items-center gap-1"
                              style={{ 
                                opacity: 0.9, 
                                fontSize: 'clamp(6px, 0.8vw, 9px)',
                                padding: '2px 5px',
                                border: '1px solid #ff9100'
                              }}
                            >
                              <Star size={10} className="text-warning" fill="#ff9100" />
                              <span className="text-warning fw-bold">{stats.average.toFixed(1)}</span>
                            </Badge>
                          )}

                          {/* Category Badge */}
                          {product.category && (
                            <Badge 
                              bg="dark" 
                              className="position-absolute bottom-0 start-0 m-1"
                              style={{ opacity: 0.9, fontSize: 'clamp(6px, 0.8vw, 9px)' }}
                            >
                              {product.category.length > 12 ? product.category.substring(0, 10) + '...' : product.category}
                            </Badge>
                          )}
                        </div>

                        {/* Body */}
                        <Card.Body className="p-2">
                          <Card.Title className="text-light fw-bold mb-1" style={{ 
                            fontSize: 'clamp(11px, 1.3vw, 14px)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: 'clamp(28px, 3vw, 36px)',
                            lineHeight: 1.3
                          }}>
                            {product.name}
                          </Card.Title>
                          
                          <div className="d-flex align-items-center gap-1 mb-1 flex-wrap">
                            <div className="text-warning fw-bold" style={{ fontSize: 'clamp(13px, 1.5vw, 16px)' }}>
                              {formatCurrency(product.price)}
                            </div>
                            <span className="text-muted d-none d-sm-inline" style={{ textDecoration: 'line-through', fontSize: 'clamp(8px, 0.8vw, 10px)' }}>
                              {formatCurrency(product.price * 1.2)}
                            </span>
                            <Badge bg="danger" style={{ fontSize: 'clamp(6px, 0.6vw, 8px)', padding: '1px 4px' }}>20%</Badge>
                          </div>

                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <div className="d-flex align-items-center gap-1">
                              <Star size={12} className="text-warning" fill="#ff9100" />
                              <span className="text-light small fw-bold" style={{ fontSize: 'clamp(9px, 0.9vw, 11px)' }}>
                                {stats.average > 0 ? stats.average.toFixed(1) : 'Belum'}
                              </span>
                            </div>
                            {stats.count > 0 && (
                              <span className="text-muted small" style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}>
                                <MessageSquare size={8} className="me-1 d-none d-sm-inline" />
                                {stats.count}
                              </span>
                            )}
                          </div>
                        </Card.Body>

                        {/* Footer */}
                        <Card.Footer className="border-0 bg-transparent p-2 pt-0">
                          <div className="d-flex gap-1">
                            <Button 
                              variant="warning" 
                              className="flex-grow-1 fw-bold"
                              size="sm"
                              style={{ fontSize: 'clamp(9px, 1vw, 12px)', padding: 'clamp(4px, 0.6vw, 6px)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, e);
                              }}
                              disabled={product.stock === 0}
                            >
                              <ShoppingCart size={14} className="me-1" />
                              <span className="d-none d-sm-inline">Beli</span>
                              <span className="d-sm-none">🛒</span>
                            </Button>
                            <Button 
                              variant="outline-light" 
                              size="sm"
                              className="px-1"
                              style={{ fontSize: 'clamp(9px, 1vw, 12px)', padding: 'clamp(4px, 0.6vw, 6px)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(product);
                              }}
                            >
                              <span className="d-none d-sm-inline">Detail</span>
                              <span className="d-sm-none">📄</span>
                            </Button>
                          </div>
                        </Card.Footer>
                      </Card>
                    </Col>
                  );
                })
              )}
            </Row>

            <style>
              {`
                @keyframes fadeInUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }

                .product-card:hover {
                  transform: translateY(-4px);
                  box-shadow: 0 8px 25px rgba(255, 145, 0, 0.12) !important;
                }

                .product-card:hover .product-img {
                  transform: scale(1.05);
                }

                .product-card {
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .featured-carousel .carousel-control-prev,
                .featured-carousel .carousel-control-next {
                  background: rgba(0,0,0,0.3);
                  width: 36px;
                  height: 36px;
                  top: 50%;
                  transform: translateY(-50%);
                  border-radius: 50%;
                  margin: 0 8px;
                }

                .featured-carousel .carousel-control-prev {
                  left: 8px;
                }

                .featured-carousel .carousel-control-next {
                  right: 8px;
                }

                .featured-carousel .carousel-indicators {
                  bottom: 8px;
                }

                .featured-carousel .carousel-indicators button {
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  margin: 0 4px;
                  background: rgba(255,255,255,0.3);
                }

                .featured-carousel .carousel-indicators button.active {
                  background: #ff9100;
                }

                .featured-carousel .carousel-item {
                  transition: transform 0.6s ease-in-out;
                }

                @media (max-width: 576px) {
                  .product-card {
                    animation: none !important;
                    border-radius: 10px !important;
                  }
                  .featured-carousel .carousel-item {
                    height: 180px !important;
                  }
                  .featured-carousel .carousel-control-prev,
                  .featured-carousel .carousel-control-next {
                    width: 24px;
                    height: 24px;
                    margin: 0 4px;
                  }
                  .featured-carousel .carousel-control-prev-icon,
                  .featured-carousel .carousel-control-next-icon {
                    width: 12px;
                    height: 12px;
                  }
                  .featured-carousel .carousel-indicators button {
                    width: 5px;
                    height: 5px;
                  }
                  .btn-sm-mobile {
                    padding: 4px 8px !important;
                    font-size: 11px !important;
                  }
                }

                @media (max-width: 400px) {
                  .featured-carousel .carousel-item {
                    height: 150px !important;
                  }
                  .featured-carousel .carousel-control-prev,
                  .featured-carousel .carousel-control-next {
                    width: 20px;
                    height: 20px;
                  }
                }
              `}
            </style>
          </>
        );

      case 'products':
        return <Products onMenuChange={setActiveMenu} />;

      case 'cart':
        return <Cart onMenuChange={setActiveMenu} />;

      case 'checkout':
        return <Checkout onMenuChange={setActiveMenu} />;

      case 'orders-sent':
        return <OrdersSent onMenuChange={setActiveMenu} />;

      case 'orders-completed':
        return <OrdersCompleted onMenuChange={setActiveMenu} />;

      case 'orders-management':
        return <OrdersManagement onMenuChange={setActiveMenu} />;

      case 'messages':
        return <Messages onMenuChange={setActiveMenu} />;

      case 'profile':
        return <Profile />;

      case 'settings':
        return <Settings />;

      case 'users':
        if (!hasPermission(userRole, 'canManageUsers')) {
          return <div className="text-light">Access Denied</div>;
        }
        return (
          <div>
            <h3 className="mb-4 text-light">👥 Kelola User</h3>
            <div className="bg-dark p-4 rounded">
              <div className="table-responsive">
                <table className="table table-dark table-hover">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>admin@email.com</td>
                      <td><Badge bg="warning">Owner</Badge></td>
                      <td><Badge bg="success">Active</Badge></td>
                      <td>
                        <Button size="sm" variant="primary" className="me-1">Edit</Button>
                        <Button size="sm" variant="danger">Delete</Button>
                      </td>
                    </tr>
                    <tr>
                      <td>user@email.com</td>
                      <td><Badge bg="info">User</Badge></td>
                      <td><Badge bg="success">Active</Badge></td>
                      <td>
                        <Button size="sm" variant="primary" className="me-1">Edit</Button>
                        <Button size="sm" variant="danger">Delete</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        if (!hasPermission(userRole, 'canViewAnalytics')) {
          return <div className="text-light">Access Denied</div>;
        }
        return (
          <div>
            <h3 className="mb-4 text-light">📈 Analytics</h3>
            <Row>
              <Col md={6}>
                <div className="bg-dark p-4 rounded mb-3">
                  <h5 className="text-muted">Pengunjung Hari Ini</h5>
                  <h2 className="text-info">1,234</h2>
                </div>
              </Col>
              <Col md={6}>
                <div className="bg-dark p-4 rounded mb-3">
                  <h5 className="text-muted">Pendapatan Bulan Ini</h5>
                  <h2 className="text-success">Rp 12.345.000</h2>
                </div>
              </Col>
            </Row>
          </div>
        );

      case 'developer':
        if (!hasPermission(userRole, 'canAccessDeveloperTools')) {
          return <div className="text-light">Access Denied</div>;
        }
        return (
          <div>
            <h3 className="mb-4 text-light">💻 Developer Tools</h3>
            <div className="bg-dark p-4 rounded">
              <h5 className="text-warning">System Information</h5>
              <pre className="text-light" style={{ background: '#0b0e14', padding: '15px', borderRadius: '8px' }}>
                {`{
  "app": "Toko App",
  "version": "1.0.0",
  "environment": "development",
  "firebase": "connected",
  "supabase": "connected",
  "user": "${user?.email || 'Not logged in'}",
  "role": "${userRole || 'None'}"
}`}
              </pre>
              <Button variant="warning" className="mt-2" onClick={handleRefreshRole} disabled={refreshing}>
                {refreshing ? '⏳' : '🔄 Refresh Role'}
              </Button>
              <Button variant="info" className="mt-2 ms-2" onClick={() => window.location.reload()}>
                🔄 Reload Page
              </Button>
            </div>
          </div>
        );

      case 'logs':
        if (!hasPermission(userRole, 'canAccessDeveloperTools')) {
          return <div className="text-light">Access Denied</div>;
        }
        return (
          <div>
            <h3 className="mb-4 text-light">📋 System Logs</h3>
            <div className="bg-dark p-4 rounded">
              <pre className="text-light" style={{ background: '#0b0e14', padding: '15px', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {`[2026-07-05 20:15:23] INFO: User logged in: ${user?.email || 'user@email.com'}
[2026-07-05 20:14:10] INFO: Image uploaded: product_001.jpg
[2026-07-05 20:12:45] WARN: Slow query detected
[2026-07-05 20:10:30] INFO: Order created: #ORD-001
[2026-07-05 20:08:15] INFO: User registered: newuser@email.com
[2026-07-05 20:05:22] ERROR: Failed to upload image: timeout`}
              </pre>
            </div>
          </div>
        );

      default:
        return <div className="text-light">Halaman tidak ditemukan</div>;
    }
  };

  return (
    <Layout 
      activeMenu={activeMenu} 
      onMenuChange={setActiveMenu}
      onSearchResults={handleSearchResults}
    >
      {renderContent()}
    </Layout>
  );
};

export default Dashboard;