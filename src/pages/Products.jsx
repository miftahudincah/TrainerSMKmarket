import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Modal, Form, Image, Spinner, Alert, InputGroup
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase, BUCKET, getPublicUrl } from '../config/supabase';
import Toast from '../components/Toast';
import ProductDetail from './ProductDetail';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  MessageCircle, 
  Star, 
  Heart,
  Truck,
  Banknote,
  X,
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  Grid,
  List,
  ChevronDown
} from 'lucide-react';

// Import supabaseAdmin dengan try-catch untuk menghindari error
let supabaseAdmin = null;
try {
  const adminModule = require('../config/supabaseAdmin');
  supabaseAdmin = adminModule.supabaseAdmin;
} catch (err) {
  console.warn('supabaseAdmin not available, using regular client');
}

const Products = ({ onMenuChange }) => {
  const { user, userRole, cart, saveCart, loadCart } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('terbaru'); // 'terbaru' | 'termurah' | 'termahal' | 'terlaris'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  // Kategori SMK
  const categories = [
    'Semua',
    'Otomotif (TKR)',
    'Teknik Komputer (TKJ)',
    'Teknik Sepeda Motor (TSM)',
    'Teknik Elektronika (TEL)',
    'Teknik Mesin (TPM)',
    'Teknik Gambar (DPIB)',
    'Multimedia (MM)',
    'Teknik Instalasi (TITL)',
    'Teknik Kendaraan Ringan (TKR)',
    'Lainnya'
  ];

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    category: '',
    shipping_cost: '',
    bank_name: '',
    bank_account: '',
    bank_owner: ''
  });

  // Image upload state
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const MAX_IMAGES = 5;

  // Cek apakah user adalah admin (developer atau owner)
  const isAdmin = userRole === 'developer' || userRole === 'owner';
  
  // Cek apakah user adalah customer (bukan admin)
  const isCustomer = !isAdmin && userRole !== 'admin';

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  // Load products
  useEffect(() => {
    loadProducts();
    loadWishlist();

    const handleUserLoggedIn = () => {
      loadProducts();
      loadWishlist();
    };
    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    const handleShowLogin = () => {
      if (!user) {
        window.dispatchEvent(new CustomEvent('requireLogin'));
      }
    };
    window.addEventListener('showLogin', handleShowLogin);

    // Click outside filter dropdown
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('showLogin', handleShowLogin);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter products when search or category changes
  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products, sortBy]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (err) {
      console.error('Error loading products:', err);
      showToast('Gagal load produk: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'Semua') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'termurah':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'termahal':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'terlaris':
        // Asumsi ada field sold_count, fallback ke created_at
        filtered.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
        break;
      case 'terbaru':
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    setFilteredProducts(filtered);
  };

  const loadWishlist = () => {
    const saved = localStorage.getItem('wishlist');
    if (saved) setWishlist(JSON.parse(saved));
  };

  const saveWishlist = (newWishlist) => {
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
  };

  // Image upload functions
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const remaining = MAX_IMAGES - images.length;
    const selectedFiles = files.slice(0, remaining);

    if (selectedFiles.length === 0) {
      showToast(`Maksimal ${MAX_IMAGES} foto!`, 'warning');
      return;
    }

    const newImages = [...images, ...selectedFiles];
    const newPreviews = [...imagePreviews];

    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target.result);
        if (newPreviews.length === newImages.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });

    setImages(newImages);
    e.target.value = '';
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (productId) => {
    if (images.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of images) {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const filename = `product_${productId}_${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(`products/${filename}`, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;
        uploadedUrls.push(getPublicUrl(`products/${filename}`));
      }

      return uploadedUrls;
    } catch (err) {
      console.error('Error uploading images:', err);
      showToast('❌ Gagal upload foto: ' + err.message, 'error');
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const deleteOldImages = async (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return;

    try {
      for (const url of imageUrls) {
        const filename = url.split('/').pop();
        if (filename) {
          const { error } = await supabase.storage
            .from(BUCKET)
            .remove([`products/${filename}`]);
          if (error) {
            console.warn('Gagal hapus gambar:', error.message);
          }
        }
      }
    } catch (err) {
      console.error('Error deleting old images:', err);
    }
  };

  // CRUD Operations
  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      showToast('Nama dan harga wajib diisi!', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        shipping_cost: parseFloat(formData.shipping_cost) || 0,
        stock: parseInt(formData.stock) || 0,
        user_id: user.uid,
        user_email: user.email
      };

      let savedProduct;

      if (editingProduct) {
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
          showToast('⚠️ Produk tidak ditemukan!', 'warning');
          return;
        }
        
        savedProduct = data[0];

        if (images.length > 0) {
          await deleteOldImages(editingProduct.image_urls || []);
        }
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
          showToast('⚠️ Gagal menambahkan produk!', 'warning');
          return;
        }
        
        savedProduct = data[0];
      }

      let uploadedUrls = [];
      if (images.length > 0) {
        uploadedUrls = await uploadImages(savedProduct.id);
      }

      const allImages = [...(editingProduct?.image_urls || []), ...uploadedUrls];
      if (images.length > 0) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_urls: allImages })
          .eq('id', savedProduct.id);

        if (updateError) throw updateError;
      }

      showToast(editingProduct ? '✅ Produk berhasil diupdate!' : '✅ Produk berhasil ditambahkan!', 'success');

      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      await loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      showToast('❌ Gagal simpan produk: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // DELETE PRODUCT
  const handleDeleteProduct = async (id) => {
    if (userRole !== 'developer' && userRole !== 'owner') {
      showToast('⛔ Hanya Developer atau Owner yang bisa menghapus produk!', 'error');
      return;
    }

    if (!window.confirm('⚠️ Yakin ingin menghapus produk ini? Tindakan ini tidak bisa dibatalkan!')) {
      return;
    }

    setDeletingId(id);
    try {
      const { data: product, error: getError } = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', id)
        .maybeSingle();

      if (getError) {
        console.warn('Gagal ambil data produk:', getError.message);
      }

      if (product?.image_urls && product.image_urls.length > 0) {
        await deleteOldImages(product.image_urls);
      }

      let deleteError = null;
      
      const { error: regularError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      deleteError = regularError;

      if (deleteError && (deleteError.message?.includes('permission') || deleteError.message?.includes('policy') || deleteError.message?.includes('row-level security'))) {
        console.warn('RLS error, mencoba dengan admin client...');
        if (supabaseAdmin) {
          const { error: adminError } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', id);
          deleteError = adminError;
        } else {
          showToast('⚠️ Tidak ada akses admin. Hubungi developer untuk menambahkan SERVICE_ROLE_KEY', 'warning');
          setDeletingId(null);
          return;
        }
      }

      if (deleteError) throw deleteError;

      showToast('🗑️ Produk berhasil dihapus oleh ' + (userRole === 'developer' ? 'Developer' : 'Owner'), 'success');
      await loadProducts();
      
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast('❌ Gagal hapus produk: ' + err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      stock: '',
      category: '',
      shipping_cost: '',
      bank_name: '',
      bank_account: '',
      bank_owner: ''
    });
    setImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      description: product.description || '',
      stock: product.stock || '',
      category: product.category || '',
      shipping_cost: product.shipping_cost || '',
      bank_name: product.bank_name || '',
      bank_account: product.bank_account || '',
      bank_owner: product.bank_owner || ''
    });
    setExistingImages(product.image_urls || []);
    setImages([]);
    setImagePreviews([]);
    setShowModal(true);
  };

  const goToCart = () => {
    if (onMenuChange && typeof onMenuChange === 'function') {
      onMenuChange('cart');
    } else {
      window.location.reload();
    }
  };

  // === ADD TO CART ===
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

  // Wishlist
  const toggleWishlist = (product, e) => {
    if (e) e.stopPropagation();
    
    const exists = wishlist.find(item => item.id === product.id);
    if (exists) {
      const updated = wishlist.filter(item => item.id !== product.id);
      saveWishlist(updated);
      showToast('❤️ Dihapus dari wishlist', 'info');
    } else {
      saveWishlist([...wishlist, product]);
      showToast('❤️ Ditambahkan ke wishlist!', 'success');
    }
  };

  // === FUNGSI CHAT DARI PRODUCT CARD ===
  const handleChatFromCard = (product, e) => {
    if (e) e.stopPropagation();
    
    if (!user) {
      showToast('⚠️ Silakan login terlebih dahulu untuk chat!', 'warning');
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }

    if (!product?.user_email) {
      showToast('💬 Penjual tidak ditemukan!', 'warning');
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
    console.log('💬 Chat data saved from Products card:', chatData);
    
    if (onMenuChange) {
      onMenuChange('messages');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get main image for display
  const getMainImage = (product) => {
    if (product.image_urls && product.image_urls.length > 0) {
      return product.image_urls[0];
    }
    return product.image_url || 'https://via.placeholder.com/300x200/ff9100/fff?text=Product';
  };

  // === HANDLE CARD CLICK ===
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

  // Render Product Card (Grid View)
  const renderProductCard = (product, index) => {
    const isWishlisted = wishlist.find(item => item.id === product.id);
    
    return (
      <Col 
        key={product.id} 
        xs={6} 
        sm={6} 
        md={4} 
        lg={4} 
        xl={3}
        className="product-col"
      >
        <Card 
          className="h-100 border-0 product-card"
          onClick={() => handleCardClick(product)}
        >
          {/* Image Container */}
          <div className="product-image-container">
            <Card.Img 
              variant="top" 
              src={getMainImage(product)} 
              className="product-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/300x200/ff9100/fff?text=No+Image';
              }}
            />
            
            {/* Stock Badge */}
            {product.stock < 5 && product.stock > 0 && (
              <div className="stock-badge limited">
                🔥 Stok Terbatas
              </div>
            )}
            {product.stock === 0 && (
              <div className="stock-badge sold-out">
                ❌ Habis
              </div>
            )}

            {/* Image Counter */}
            {product.image_urls && product.image_urls.length > 1 && (
              <div className="image-counter">
                +{product.image_urls.length}
              </div>
            )}

            {/* Admin Actions */}
            {(userRole === 'developer' || userRole === 'owner') && (
              <div className="admin-actions">
                <Button 
                  size="sm" 
                  variant="warning" 
                  className="admin-btn edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(product);
                  }}
                  disabled={deletingId === product.id}
                  title="Edit produk"
                >
                  <Edit size={14} />
                </Button>
                <Button 
                  size="sm" 
                  variant="danger" 
                  className="admin-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(product.id);
                  }}
                  disabled={deletingId === product.id}
                  title="Hapus produk"
                >
                  {deletingId === product.id ? (
                    <Spinner animation="border" size="sm" style={{ width: '12px', height: '12px' }} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </Button>
              </div>
            )}

            {/* Wishlist Button */}
            <button 
              className="wishlist-btn"
              onClick={(e) => toggleWishlist(product, e)}
            >
              <Heart 
                size={16} 
                fill={isWishlisted ? '#ff4444' : 'none'}
                color={isWishlisted ? '#ff4444' : '#fff'}
              />
            </button>

            {/* Category Badge */}
            {product.category && (
              <div className="category-badge">
                {product.category}
              </div>
            )}
          </div>

          <Card.Body className="product-body">
            <Card.Title className="product-title">
              {product.name}
            </Card.Title>
            
            <div className="product-price-section">
              <span className="price-current">
                {formatCurrency(product.price)}
              </span>
              <span className="price-original">
                {formatCurrency(product.price * 1.3)}
              </span>
              <span className="discount-badge">20%</span>
            </div>

            <div className="product-rating">
              <span className="stars">★★★★★</span>
              <span className="rating-count">4.9 (123)</span>
            </div>

            <div className="product-description">
              {product.description || 'Tidak ada deskripsi'}
            </div>

            <div className="product-tags">
              {product.shipping_cost > 0 && (
                <span className="tag tag-shipping">
                  <Truck size={10} />
                  {formatCurrency(product.shipping_cost)}
                </span>
              )}
              {product.bank_name && (
                <span className="tag tag-bank">
                  <Banknote size={10} />
                  {product.bank_name}
                </span>
              )}
            </div>
          </Card.Body>

          <Card.Footer className="product-footer">
            <div className="product-actions">
              {user ? (
                <>
                  {isCustomer && (
                    <Button 
                      variant="warning" 
                      className="btn-buy"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product, e);
                      }}
                      disabled={product.stock === 0}
                    >
                      <ShoppingCart size={14} className="me-1" />
                      Beli
                    </Button>
                  )}
                  <Button 
                    variant="outline-primary" 
                    className="btn-chat"
                    onClick={(e) => handleChatFromCard(product, e)}
                    title="Chat Penjual"
                  >
                    <MessageCircle size={14} />
                    <span className="chat-text">Chat</span>
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline-warning" 
                  className="w-100 btn-login"
                  onClick={(e) => {
                    e.stopPropagation();
                    showToast('⚠️ Silakan login terlebih dahulu!', 'warning');
                    window.dispatchEvent(new CustomEvent('showLogin'));
                  }}
                >
                  Login untuk Beli
                </Button>
              )}
            </div>
          </Card.Footer>
        </Card>
      </Col>
    );
  };

  // Render Product List (List View)
  const renderProductList = (product) => {
    const isWishlisted = wishlist.find(item => item.id === product.id);
    
    return (
      <Card 
        key={product.id} 
        className="product-list-card"
        onClick={() => handleCardClick(product)}
      >
        <div className="list-card-content">
          <div className="list-image-container">
            <Image 
              src={getMainImage(product)} 
              className="list-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/300x200/ff9100/fff?text=No+Image';
              }}
            />
            {product.stock === 0 && (
              <div className="list-stock-badge sold-out">Habis</div>
            )}
            {product.stock < 5 && product.stock > 0 && (
              <div className="list-stock-badge limited">Stok Terbatas</div>
            )}
          </div>

          <div className="list-info">
            <div className="list-header">
              <div>
                <h5 className="list-title">{product.name}</h5>
                {product.category && (
                  <span className="list-category">{product.category}</span>
                )}
              </div>
              <button 
                className="list-wishlist-btn"
                onClick={(e) => toggleWishlist(product, e)}
              >
                <Heart 
                  size={18} 
                  fill={isWishlisted ? '#ff4444' : 'none'}
                  color={isWishlisted ? '#ff4444' : '#fff'}
                />
              </button>
            </div>

            <div className="list-price-section">
              <span className="list-price-current">{formatCurrency(product.price)}</span>
              <span className="list-price-original">{formatCurrency(product.price * 1.3)}</span>
              <span className="list-discount">20%</span>
            </div>

            <div className="list-rating">
              <span className="stars">★★★★★</span>
              <span className="rating-count">4.9 (123 terjual)</span>
            </div>

            <div className="list-description">
              {product.description || 'Tidak ada deskripsi'}
            </div>

            <div className="list-actions">
              {user ? (
                <>
                  {isCustomer && (
                    <Button 
                      variant="warning" 
                      className="list-btn-buy"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product, e);
                      }}
                      disabled={product.stock === 0}
                    >
                      <ShoppingCart size={16} className="me-2" />
                      Beli
                    </Button>
                  )}
                  <Button 
                    variant="outline-primary" 
                    className="list-btn-chat"
                    onClick={(e) => handleChatFromCard(product, e)}
                  >
                    <MessageCircle size={16} className="me-2" />
                    Chat
                  </Button>
                  {(userRole === 'developer' || userRole === 'owner') && (
                    <>
                      <Button 
                        variant="outline-warning" 
                        className="list-btn-edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(product);
                        }}
                      >
                        <Edit size={16} className="me-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        className="list-btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                        disabled={deletingId === product.id}
                      >
                        {deletingId === product.id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Button 
                  variant="outline-warning" 
                  className="list-btn-login"
                  onClick={(e) => {
                    e.stopPropagation();
                    showToast('⚠️ Silakan login terlebih dahulu!', 'warning');
                    window.dispatchEvent(new CustomEvent('showLogin'));
                  }}
                >
                  Login untuk Beli
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner animation="border" variant="warning" size="lg" />
        <p className="loading-text">Memuat produk...</p>
      </div>
    );
  }

  // === Tampilkan ProductDetail jika ada produk yang dipilih ===
  if (showDetail && selectedProduct) {
    return (
      <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
        <ProductDetail 
          product={selectedProduct} 
          onClose={handleCloseDetail}
          onAddToCart={addToCart}
          onMenuChange={onMenuChange}
        />
      </Container>
    );
  }

  return (
    <Container fluid className="products-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      {/* ===== HEADER ===== */}
      <div className="products-header">
        <div>
          <h3 className="products-title">📦 Produk</h3>
          <p className="products-subtitle">Temukan produk terbaik kami</p>
        </div>
        <div className="products-actions">
          {isAdmin && (
            <Button 
              variant="warning" 
              className="btn-add-product"
              onClick={() => {
                setEditingProduct(null);
                resetForm();
                setShowModal(true);
              }}
            >
              <Plus size={18} className="me-1" />
              <span className="btn-add-text">Tambah Produk</span>
            </Button>
          )}
          {isCustomer && (
            <Button 
              variant="outline-light" 
              className="btn-cart"
              onClick={goToCart}
            >
              <ShoppingCart size={18} />
              {cart && cart.length > 0 && (
                <span className="cart-badge">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ===== SEARCH & FILTER ===== */}
      <div className="search-filter-section">
        <div className="search-wrapper">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari produk, kategori, deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="filter-controls">
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="sort-filter" ref={filterRef}>
            <button 
              className="sort-btn"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} />
              <span>Urutkan</span>
              <ChevronDown size={14} />
            </button>
            
            {showFilterDropdown && (
              <div className="sort-dropdown">
                <button 
                  className={`sort-option ${sortBy === 'terbaru' ? 'active' : ''}`}
                  onClick={() => { setSortBy('terbaru'); setShowFilterDropdown(false); }}
                >
                  Terbaru
                </button>
                <button 
                  className={`sort-option ${sortBy === 'termurah' ? 'active' : ''}`}
                  onClick={() => { setSortBy('termurah'); setShowFilterDropdown(false); }}
                >
                  Termurah
                </button>
                <button 
                  className={`sort-option ${sortBy === 'termahal' ? 'active' : ''}`}
                  onClick={() => { setSortBy('termahal'); setShowFilterDropdown(false); }}
                >
                  Termahal
                </button>
                <button 
                  className={`sort-option ${sortBy === 'terlaris' ? 'active' : ''}`}
                  onClick={() => { setSortBy('terlaris'); setShowFilterDropdown(false); }}
                >
                  Terlaris
                </button>
              </div>
            )}
          </div>

          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== RESULT COUNT ===== */}
      {filteredProducts.length > 0 && (
        <div className="result-count">
          Menampilkan <strong>{filteredProducts.length}</strong> produk
          {searchQuery && ` untuk "${searchQuery}"`}
          {selectedCategory !== 'Semua' && ` di kategori ${selectedCategory}`}
        </div>
      )}

      {/* ===== PRODUCTS GRID / LIST ===== */}
      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <Search size={48} className="empty-icon" />
          <h5 className="empty-title">Produk tidak ditemukan</h5>
          <p className="empty-text">
            {searchQuery ? `Tidak ada produk dengan kata "${searchQuery}"` : 'Belum ada produk di kategori ini'}
          </p>
          <Button 
            variant="outline-warning" 
            size="sm" 
            className="empty-btn"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Semua');
            }}
          >
            Reset Filter
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <Row className="products-grid">
          {filteredProducts.map((product, index) => renderProductCard(product, index))}
        </Row>
      ) : (
        <div className="products-list">
          {filteredProducts.map((product) => renderProductList(product))}
        </div>
      )}

      {/* ===== ADD/EDIT PRODUCT MODAL ===== */}
      <Modal 
        show={showModal} 
        onHide={() => {
          setShowModal(false);
          setEditingProduct(null);
          resetForm();
        }}
        size="lg"
        centered
        contentClassName="product-modal"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>
            {editingProduct ? '✏️ Edit Produk' : '📦 Tambah Produk'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nama Produk *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Masukkan nama produk"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-control-dark"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Harga *</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Masukkan harga"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="form-control-dark"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Stok</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Jumlah stok"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="form-control-dark"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Kategori</Form.Label>
                  <Form.Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-control-dark"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.filter(c => c !== 'Semua').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Deskripsi</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Deskripsi produk"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-control-dark"
              />
            </Form.Group>

            {/* Image Upload */}
            <Form.Group className="mb-3">
              <Form.Label className="image-upload-label">
                <ImageIcon size={16} className="me-1" />
                Foto Produk (Maks {MAX_IMAGES} foto)
              </Form.Label>
              
              {existingImages.length > 0 && (
                <div className="existing-images">
                  <small className="text-muted">Foto yang sudah ada:</small>
                  <div className="image-preview-grid">
                    {existingImages.map((url, idx) => (
                      <div key={idx} className="image-preview-item">
                        <Image 
                          src={url} 
                          className="preview-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/80/ff9100/fff?text=No+Image';
                          }}
                        />
                        <button
                          className="remove-image-btn"
                          onClick={() => {
                            const newExisting = existingImages.filter((_, i) => i !== idx);
                            setExistingImages(newExisting);
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className="new-images">
                  <small className="text-muted">Foto baru:</small>
                  <div className="image-preview-grid">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="image-preview-item">
                        <Image 
                          src={preview} 
                          className="preview-image"
                        />
                        <button
                          className="remove-image-btn"
                          onClick={() => removeImage(idx)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imagePreviews.length + existingImages.length < MAX_IMAGES && (
                <div 
                  className="upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={24} className="upload-icon" />
                  <p className="upload-text">
                    Klik untuk upload foto 
                    <span className="upload-hint">
                      (max {MAX_IMAGES - imagePreviews.length - existingImages.length} foto tersisa)
                    </span>
                  </p>
                  <Form.Control
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="d-none"
                  />
                </div>
              )}
            </Form.Group>

            <hr className="form-divider" />
            <h6 className="payment-title">💳 Informasi Pembayaran</h6>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Ongkos Kirim</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0"
                    value={formData.shipping_cost}
                    onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                    className="form-control-dark"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Bank</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="BCA, Mandiri, dll"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="form-control-dark"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>No Rekening</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nomor rekening"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    className="form-control-dark"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Nama Pemilik Rekening</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nama pemilik rekening"
                value={formData.bank_owner}
                onChange={(e) => setFormData({ ...formData, bank_owner: e.target.value })}
                className="form-control-dark"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="modal-footer-custom">
          <Button variant="secondary" className="btn-cancel" onClick={() => {
            setShowModal(false);
            setEditingProduct(null);
            resetForm();
          }}>
            Batal
          </Button>
          <Button 
            variant="warning" 
            className="btn-save" 
            onClick={handleSaveProduct}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              editingProduct ? 'Update Produk' : 'Tambah Produk'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== STYLES ===== */}
      <style>{`
        /* ===== CONTAINER ===== */
        .products-container {
          padding: 0 8px;
        }

        /* ===== LOADING ===== */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
        }
        .loading-text {
          color: #6c757d;
          font-size: 14px;
        }

        /* ===== HEADER ===== */
        .products-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }
        .products-title {
          color: #fff;
          font-weight: 700;
          font-size: clamp(1.2rem, 2.5vw, 1.8rem);
          margin: 0;
        }
        .products-subtitle {
          color: #6c757d;
          font-size: 14px;
          margin: 0;
        }
        .products-actions {
          display: flex;
          gap: 8px;
        }
        .btn-add-product {
          font-weight: 700;
          border-radius: 12px;
          padding: 8px 16px;
        }
        .btn-add-text {
          display: inline;
        }
        .btn-cart {
          position: relative;
          border-radius: 12px;
          padding: 8px 14px;
          border-color: #2a3444;
          color: #fff;
        }
        .btn-cart:hover {
          border-color: #ff9100;
          color: #ff9100;
        }
        .cart-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #dc3545;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 50%;
          min-width: 18px;
          text-align: center;
        }

        /* ===== SEARCH & FILTER ===== */
        .search-filter-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (min-width: 768px) {
          .search-filter-section {
            flex-direction: row;
            align-items: center;
          }
        }
        .search-wrapper {
          flex: 1;
          min-width: 200px;
        }
        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: #0f161e;
          border: 1px solid #2a3444;
          border-radius: 12px;
          padding: 0 12px;
          transition: border-color 0.2s ease;
        }
        .search-input-wrapper:focus-within {
          border-color: #ff9100;
          box-shadow: 0 0 0 3px rgba(255, 145, 0, 0.15);
        }
        .search-icon {
          color: #6c757d;
          flex-shrink: 0;
        }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          padding: 10px 12px;
          outline: none;
          font-size: 14px;
        }
        .search-input::placeholder {
          color: #6c757d;
        }
        .search-clear {
          background: transparent;
          border: none;
          color: #6c757d;
          padding: 4px;
          cursor: pointer;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .search-clear:hover {
          color: #fff;
          background: #2a3444;
        }

        .filter-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .category-select {
          background: #0f161e;
          color: #fff;
          border: 1px solid #2a3444;
          border-radius: 12px;
          padding: 9px 14px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          min-width: 140px;
        }
        .category-select:focus {
          border-color: #ff9100;
        }
        .category-select option {
          background: #141a24;
          color: #fff;
        }

        .sort-filter {
          position: relative;
        }
        .sort-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0f161e;
          color: #fff;
          border: 1px solid #2a3444;
          border-radius: 12px;
          padding: 9px 14px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sort-btn:hover {
          border-color: #ff9100;
          color: #ff9100;
        }
        .sort-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: #141a24;
          border: 1px solid #2a3444;
          border-radius: 12px;
          padding: 6px;
          min-width: 140px;
          z-index: 100;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .sort-option {
          display: block;
          width: 100%;
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: #8892a8;
          font-size: 13px;
          text-align: left;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sort-option:hover {
          background: #1f2836;
          color: #fff;
        }
        .sort-option.active {
          color: #ff9100;
          background: rgba(255, 145, 0, 0.1);
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          background: #0f161e;
          border: 1px solid #2a3444;
          border-radius: 12px;
          padding: 4px;
        }
        .view-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .view-btn:hover {
          color: #fff;
        }
        .view-btn.active {
          background: #ff9100;
          color: #000;
        }

        /* ===== RESULT COUNT ===== */
        .result-count {
          color: #6c757d;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .result-count strong {
          color: #fff;
        }

        /* ===== PRODUCT CARD ===== */
        .products-grid {
          margin: 0 -6px;
        }
        .product-col {
          padding: 6px;
        }
        .product-card {
          background: #141a24;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
          cursor: pointer;
          height: 100%;
        }
        .product-card:hover {
          transform: translateY(-6px);
          border-color: #ff9100;
          box-shadow: 0 12px 40px rgba(255, 145, 0, 0.12);
        }

        /* Image Container */
        .product-image-container {
          position: relative;
          height: 180px;
          overflow: hidden;
          background: #0b0e14;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .product-card:hover .product-image {
          transform: scale(1.06);
        }

        .stock-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          z-index: 2;
        }
        .stock-badge.limited {
          background: #ff9100;
          color: #000;
        }
        .stock-badge.sold-out {
          background: #dc3545;
          color: #fff;
        }

        .image-counter {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 10px;
          z-index: 2;
        }

        .admin-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 4px;
          z-index: 3;
        }
        .admin-btn {
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        .admin-btn:hover {
          transform: scale(1.1);
        }
        .edit-btn {
          background: #ff9100;
          color: #000;
        }
        .edit-btn:hover {
          background: #ffa726;
        }
        .delete-btn {
          background: #dc3545;
          color: #fff;
        }
        .delete-btn:hover {
          background: #e74c5e;
        }

        .wishlist-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          border: 1px solid #2a3444;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 2;
        }
        .wishlist-btn:hover {
          transform: scale(1.15);
          background: rgba(255, 68, 68, 0.2);
          border-color: #ff4444;
        }

        .category-badge {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          color: #fff;
          padding: 2px 12px;
          border-radius: 12px;
          font-size: 9px;
          z-index: 2;
          backdrop-filter: blur(4px);
        }

        /* Card Body */
        .product-body {
          padding: 12px 14px 8px;
        }
        .product-title {
          color: #fff;
          font-weight: 700;
          font-size: clamp(12px, 1.1vw, 14px);
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 36px;
        }
        .product-price-section {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 4px;
        }
        .price-current {
          color: #ff9100;
          font-weight: 700;
          font-size: clamp(13px, 1.3vw, 16px);
        }
        .price-original {
          color: #6c757d;
          text-decoration: line-through;
          font-size: 11px;
        }
        .discount-badge {
          background: #dc3545;
          color: #fff;
          padding: 1px 8px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: 700;
        }

        .product-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
        }
        .stars {
          color: #ffc107;
          font-size: 10px;
          letter-spacing: 1px;
        }
        .rating-count {
          color: #6c757d;
          font-size: 10px;
        }

        .product-description {
          color: #6c757d;
          font-size: 10px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 16px;
          margin-bottom: 6px;
        }

        .product-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .tag {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 1px 8px;
          border-radius: 10px;
          font-size: 8px;
          font-weight: 500;
        }
        .tag-shipping {
          background: rgba(13, 202, 240, 0.15);
          color: #0dcaf0;
        }
        .tag-bank {
          background: rgba(25, 135, 84, 0.15);
          color: #198754;
        }

        /* Card Footer */
        .product-footer {
          background: transparent;
          border: none;
          padding: 4px 14px 12px;
        }
        .product-actions {
          display: flex;
          gap: 6px;
        }
        .btn-buy {
          flex: 1;
          font-weight: 700;
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-chat {
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          border-color: #0d6efd;
          color: #0d6efd;
        }
        .btn-chat:hover {
          background: #0d6efd;
          color: #fff;
        }
        .chat-text {
          display: none;
        }
        @media (min-width: 576px) {
          .chat-text {
            display: inline;
          }
        }
        .btn-login {
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 8px;
        }

        /* ===== LIST VIEW ===== */
        .products-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .product-list-card {
          background: #141a24;
          border: 1px solid #1f2836;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .product-list-card:hover {
          border-color: #ff9100;
          transform: translateX(4px);
          box-shadow: 0 4px 20px rgba(255, 145, 0, 0.08);
        }
        .list-card-content {
          display: flex;
          flex-direction: column;
          padding: 16px;
        }
        @media (min-width: 576px) {
          .list-card-content {
            flex-direction: row;
            gap: 20px;
          }
        }
        .list-image-container {
          position: relative;
          flex-shrink: 0;
          width: 100%;
          max-width: 200px;
          height: 140px;
          border-radius: 12px;
          overflow: hidden;
          background: #0b0e14;
        }
        @media (min-width: 576px) {
          .list-image-container {
            width: 180px;
            height: 140px;
          }
        }
        .list-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .list-stock-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: 700;
        }
        .list-stock-badge.sold-out {
          background: #dc3545;
          color: #fff;
        }
        .list-stock-badge.limited {
          background: #ff9100;
          color: #000;
        }

        .list-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .list-title {
          color: #fff;
          font-weight: 700;
          font-size: 16px;
          margin: 0;
        }
        .list-category {
          color: #6c757d;
          font-size: 12px;
        }
        .list-wishlist-btn {
          background: transparent;
          border: none;
          color: #fff;
          padding: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .list-wishlist-btn:hover {
          transform: scale(1.15);
        }

        .list-price-section {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .list-price-current {
          color: #ff9100;
          font-weight: 700;
          font-size: 18px;
        }
        .list-price-original {
          color: #6c757d;
          text-decoration: line-through;
          font-size: 13px;
        }
        .list-discount {
          background: #dc3545;
          color: #fff;
          padding: 1px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
        }

        .list-rating {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .list-rating .stars {
          font-size: 12px;
        }
        .list-rating .rating-count {
          font-size: 12px;
        }

        .list-description {
          color: #6c757d;
          font-size: 13px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .list-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .list-btn-buy,
        .list-btn-chat,
        .list-btn-edit,
        .list-btn-delete,
        .list-btn-login {
          font-size: 12px;
          padding: 6px 16px;
          border-radius: 10px;
          font-weight: 600;
        }
        .list-btn-buy {
          background: #ff9100;
          border: none;
          color: #000;
        }
        .list-btn-buy:hover {
          background: #ffa726;
        }
        .list-btn-buy:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .list-btn-chat {
          border-color: #0d6efd;
          color: #0d6efd;
        }
        .list-btn-chat:hover {
          background: #0d6efd;
          color: #fff;
        }
        .list-btn-edit {
          border-color: #ff9100;
          color: #ff9100;
        }
        .list-btn-edit:hover {
          background: #ff9100;
          color: #000;
        }
        .list-btn-delete {
          border-color: #dc3545;
          color: #dc3545;
        }
        .list-btn-delete:hover {
          background: #dc3545;
          color: #fff;
        }
        .list-btn-login {
          border-color: #ff9100;
          color: #ff9100;
        }
        .list-btn-login:hover {
          background: #ff9100;
          color: #000;
        }

        /* ===== EMPTY STATE ===== */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        .empty-icon {
          color: #6c757d;
          margin-bottom: 16px;
        }
        .empty-title {
          color: #6c757d;
          margin-bottom: 8px;
        }
        .empty-text {
          color: #6c757d;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .empty-btn {
          border-radius: 12px;
        }

        /* ===== MODAL ===== */
        .product-modal {
          background: #141a24 !important;
          border: 1px solid #2a3444;
          border-radius: 20px;
        }
        .product-modal .modal-header {
          border-bottom: 1px solid #2a3444;
          padding: 20px 24px;
        }
        .product-modal .modal-header .modal-title {
          color: #fff;
          font-weight: 700;
        }
        .product-modal .modal-body {
          padding: 24px;
        }
        .product-modal .modal-footer {
          border-top: 1px solid #2a3444;
          padding: 16px 24px;
        }

        .form-control-dark {
          background: #0f161e !important;
          border: 1px solid #2a3444 !important;
          color: #fff !important;
          border-radius: 10px !important;
          padding: 10px 14px !important;
          transition: border-color 0.2s ease !important;
        }
        .form-control-dark:focus {
          border-color: #ff9100 !important;
          box-shadow: 0 0 0 3px rgba(255, 145, 0, 0.15) !important;
        }
        .form-control-dark::placeholder {
          color: #6c757d;
        }
        .form-control-dark option {
          background: #141a24;
        }

        .image-upload-label {
          color: #fff;
          font-weight: 600;
        }
        .existing-images,
        .new-images {
          margin-bottom: 12px;
        }
        .image-preview-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .image-preview-item {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #2a3444;
        }
        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .remove-image-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(220, 53, 69, 0.9);
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 10px;
          padding: 0;
        }
        .remove-image-btn:hover {
          transform: scale(1.1);
          background: #dc3545;
        }

        .upload-area {
          border: 2px dashed #2a3444;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .upload-area:hover {
          border-color: #ff9100;
          background: rgba(255, 145, 0, 0.05);
        }
        .upload-icon {
          color: #6c757d;
          margin-bottom: 8px;
        }
        .upload-text {
          color: #6c757d;
          font-size: 13px;
          margin: 0;
        }
        .upload-hint {
          display: block;
          font-size: 11px;
          color: #6c757d;
        }

        .form-divider {
          border-color: #2a3444;
          margin: 20px 0;
        }
        .payment-title {
          color: #fff;
          margin-bottom: 16px;
        }

        .btn-cancel {
          background: #1f2836;
          border: none;
          color: #8892a8;
          border-radius: 10px;
          padding: 10px 24px;
          font-weight: 600;
        }
        .btn-cancel:hover {
          background: #2a3444;
          color: #fff;
        }
        .btn-save {
          background: #ff9100;
          border: none;
          color: #000;
          border-radius: 10px;
          padding: 10px 24px;
          font-weight: 700;
        }
        .btn-save:hover {
          background: #ffa726;
          color: #000;
        }
        .btn-save:disabled {
          opacity: 0.6;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 576px) {
          .products-container {
            padding: 0 4px;
          }
          .product-image-container {
            height: 140px;
          }
          .btn-add-text {
            display: none;
          }
          .btn-add-product {
            padding: 8px 12px;
          }
          .category-select {
            min-width: 100px;
            font-size: 11px;
            padding: 7px 10px;
          }
          .sort-btn {
            font-size: 11px;
            padding: 7px 10px;
          }
          .product-card:hover {
            transform: none;
          }
          .product-card:hover .product-image {
            transform: none;
          }
          .list-image-container {
            max-width: 100%;
            height: 120px;
          }
          .list-title {
            font-size: 14px;
          }
          .list-price-current {
            font-size: 15px;
          }
          .list-actions {
            flex-wrap: wrap;
          }
          .list-btn-buy,
          .list-btn-chat,
          .list-btn-edit,
          .list-btn-delete {
            font-size: 11px;
            padding: 4px 12px;
          }
        }

        @media (max-width: 400px) {
          .product-image-container {
            height: 120px;
          }
          .product-title {
            font-size: 11px;
            min-height: 30px;
          }
          .price-current {
            font-size: 12px;
          }
          .price-original {
            font-size: 9px;
          }
          .discount-badge {
            font-size: 7px;
            padding: 1px 6px;
          }
          .product-body {
            padding: 8px 10px 4px;
          }
          .product-footer {
            padding: 2px 10px 8px;
          }
          .btn-buy {
            font-size: 9px;
            padding: 3px 6px;
          }
          .btn-chat {
            font-size: 9px;
            padding: 3px 6px;
          }
        }
      `}</style>
    </Container>
  );
};

export default Products;