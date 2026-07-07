import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Image, Alert, Spinner, Form
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import Toast from '../components/Toast';
import { 
  ArrowLeft, 
  CreditCard, 
  Banknote, 
  MapPin, 
  Upload, 
  CheckCircle,
  Store,
  User,
  FileText,
  Package,
  Truck,
  Shield
} from 'lucide-react';

const Checkout = ({ onMenuChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [cart, setCart] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    notes: ''
  });
  
  // Payment proof
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Seller info (dari produk pertama)
  const [sellerInfo, setSellerInfo] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Load cart from localStorage
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    console.log('🔍 Loading checkout items...');
    
    const checkoutSaved = localStorage.getItem('checkoutItems');
    console.log('📦 checkoutItems:', checkoutSaved);
    
    if (checkoutSaved) {
      try {
        const items = JSON.parse(checkoutSaved);
        console.log('✅ Items dari checkoutItems:', items);
        setSelectedItems(items);
        
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
        setTotalPrice(total);
        setTotalItems(totalQty);
        
        if (items.length > 0) {
          const firstProduct = items[0];
          console.log('📦 First product:', firstProduct);
          console.log('🆔 Seller ID:', firstProduct.user_id);
          console.log('📧 Seller Email:', firstProduct.user_email);
          
          setSellerInfo({
            seller_id: firstProduct.user_id || 'unknown',
            seller_email: firstProduct.user_email || 'unknown@email.com',
            bank_name: firstProduct.bank_name || 'BCA',
            bank_account: firstProduct.bank_account || '1234567890',
            bank_owner: firstProduct.bank_owner || 'PT Toko App',
            store_name: firstProduct.user_email?.split('@')[0] || 'Toko App',
            shipping_cost: firstProduct.shipping_cost || 0
          });
        }
        return;
      } catch (e) {
        console.error('Error parsing checkoutItems:', e);
      }
    }
    
    const saved = localStorage.getItem('cart');
    console.log('📦 cart (fallback):', saved);
    if (saved) {
      try {
        const parsedCart = JSON.parse(saved);
        const selected = parsedCart.filter(item => item.checked !== false);
        setCart(parsedCart);
        setSelectedItems(selected);
        
        const total = selected.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setTotalPrice(total);
        setTotalItems(selected.reduce((sum, item) => sum + item.quantity, 0));
        
        if (selected.length > 0) {
          const firstProduct = selected[0];
          setSellerInfo({
            seller_id: firstProduct.user_id || 'unknown',
            seller_email: firstProduct.user_email || 'unknown@email.com',
            bank_name: firstProduct.bank_name || 'BCA',
            bank_account: firstProduct.bank_account || '1234567890',
            bank_owner: firstProduct.bank_owner || 'PT Toko App',
            store_name: firstProduct.user_email?.split('@')[0] || 'Toko App',
            shipping_cost: firstProduct.shipping_cost || 0
          });
        }
      } catch (e) {
        console.error('Error parsing cart:', e);
        setCart([]);
        setSelectedItems([]);
      }
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePaymentProof = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Format file tidak didukung! Gunakan JPG, PNG, atau WEBP.', 'error');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran file maksimal 2MB!', 'error');
      return;
    }
    
    setPaymentProof(file);
    const reader = new FileReader();
    reader.onload = (e) => setPaymentPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removePaymentProof = () => {
    setPaymentProof(null);
    setPaymentPreview(null);
  };

  // Submit checkout
  const handleSubmit = async () => {
    // Validasi form
    if (!formData.fullName.trim()) {
      showToast('Nama lengkap wajib diisi!', 'error');
      return;
    }
    if (!formData.phone.trim()) {
      showToast('Nomor HP wajib diisi!', 'error');
      return;
    }
    if (!formData.address.trim()) {
      showToast('Alamat wajib diisi!', 'error');
      return;
    }
    if (!paymentProof) {
      showToast('Upload bukti transfer!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      console.log('📦 Seller Info:', sellerInfo);
      
      // Upload bukti transfer
      let proofUrl = '';
      if (paymentProof) {
        const timestamp = Date.now();
        const ext = paymentProof.name.split('.').pop();
        const filename = `payment_${user.uid}_${timestamp}.${ext}`;
        
        const { data, error } = await supabase.storage
          .from('images')
          .upload(`payments/${filename}`, paymentProof, {
            cacheControl: '3600'
          });
          
        if (error) throw error;
        proofUrl = data?.path || '';
      }

      // Simpan order dengan seller_id dan seller_email
      const orderData = {
        user_id: user.uid,
        user_email: user.email,
        seller_id: sellerInfo?.seller_id || 'unknown',
        seller_email: sellerInfo?.seller_email || 'unknown@email.com',
        items: selectedItems,
        total_price: totalPrice,
        total_items: totalItems,
        shipping_cost: sellerInfo?.shipping_cost || 0,
        full_name: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        notes: formData.notes,
        payment_proof: proofUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      console.log('📦 Order Data:', orderData);

      // Simpan ke Supabase
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData]);

      if (error) throw error;

      console.log('✅ Order created:', data);

      // Hapus item dari cart
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const cart = JSON.parse(savedCart);
          const remainingCart = cart.filter(item => 
            !selectedItems.some(selected => selected.id === item.id)
          );
          localStorage.setItem('cart', JSON.stringify(remainingCart));
          window.dispatchEvent(new Event('cartUpdated'));
        } catch (e) {
          console.error('Error removing checked out items:', e);
        }
      }

      localStorage.removeItem('checkoutItems');

      showToast('✅ Pesanan berhasil dibuat! Menunggu konfirmasi penjual.', 'success');
      
      // Redirect ke order
      setTimeout(() => {
        if (onMenuChange && typeof onMenuChange === 'function') {
          onMenuChange('orders-sent');
        }
      }, 1500);
      
    } catch (err) {
      console.error('❌ Error submitting order:', err);
      showToast('❌ Gagal checkout: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (onMenuChange) {
      onMenuChange('cart');
    }
  };

  if (selectedItems.length === 0) {
    return (
      <Container fluid className="px-3 px-md-4 py-3">
        <Card className="border-0 shadow text-center py-5" style={{ background: '#141a24', borderRadius: '16px' }}>
          <Card.Body>
            <div style={{ fontSize: '64px' }}>🛒</div>
            <h4 className="text-light mt-3">Tidak ada produk yang dipilih</h4>
            <p className="text-muted">Silakan pilih produk di keranjang terlebih dahulu</p>
            <Button variant="warning" onClick={goBack}>
              <ArrowLeft size={16} className="me-2" />
              Kembali ke Keranjang
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
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button variant="outline-secondary" size="sm" onClick={goBack}>
          <ArrowLeft size={16} className="me-1" />
          Kembali
        </Button>
        <div>
          <h4 className="text-light fw-bold mb-0">📋 Checkout</h4>
          <p className="text-muted small mb-0">Konfirmasi pesanan Anda</p>
        </div>
      </div>

      <Row className="g-4">
        {/* Left Column - Order Summary & Form */}
        <Col lg={7}>
          {/* Order Summary */}
          <Card className="border-0 shadow mb-4" style={{ background: '#141a24', borderRadius: '16px' }}>
            <Card.Body className="p-3 p-sm-4">
              <h6 className="text-light fw-bold mb-3">
                <Package size={16} className="me-2 text-warning" />
                Ringkasan Pesanan ({totalItems} item)
              </h6>
              
              {selectedItems.map((item) => (
                <div key={item.id} className="d-flex gap-3 p-2 mb-2 rounded" style={{ background: '#0f161e' }}>
                  <Image 
                    src={item.image_urls?.[0] || item.image_url || 'https://via.placeholder.com/60'} 
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <div className="flex-grow-1">
                    <div className="text-light fw-bold small">{item.name}</div>
                    <div className="text-warning small">{formatCurrency(item.price)}</div>
                    <div className="text-muted small">x{item.quantity}</div>
                  </div>
                  <div className="text-light fw-bold small">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
              
              <hr className="border-secondary" />
              
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted small">Subtotal</span>
                <span className="text-light small">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted small">Ongkos Kirim</span>
                <span className="text-light small">{formatCurrency(sellerInfo?.shipping_cost || 0)}</span>
              </div>
              <div className="d-flex justify-content-between py-2 border-top border-secondary">
                <span className="text-light fw-bold">Total</span>
                <span className="text-warning fw-bold" style={{ fontSize: '1.2rem' }}>
                  {formatCurrency(totalPrice + (sellerInfo?.shipping_cost || 0))}
                </span>
              </div>
            </Card.Body>
          </Card>

          {/* Shipping Form */}
          <Card className="border-0 shadow" style={{ background: '#141a24', borderRadius: '16px' }}>
            <Card.Body className="p-3 p-sm-4">
              <h6 className="text-light fw-bold mb-3">
                <MapPin size={16} className="me-2 text-warning" />
                Alamat Pengiriman
              </h6>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-light small">Nama Lengkap *</Form.Label>
                    <Form.Control
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Nama lengkap penerima"
                      className="bg-dark text-light border-secondary"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-light small">Nomor HP *</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0812-3456-7890"
                      className="bg-dark text-light border-secondary"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="text-light small">Alamat Lengkap *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan"
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-light small">Kota</Form.Label>
                    <Form.Control
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Kota"
                      className="bg-dark text-light border-secondary"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-light small">Provinsi</Form.Label>
                    <Form.Control
                      type="text"
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      placeholder="Provinsi"
                      className="bg-dark text-light border-secondary"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="text-light small">Kode Pos</Form.Label>
                    <Form.Control
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="Kode Pos"
                      className="bg-dark text-light border-secondary"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-0">
                <Form.Label className="text-light small">Catatan (Opsional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={1}
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Catatan untuk penjual"
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Payment & Seller Info */}
        <Col lg={5}>
          {/* Seller Info */}
          <Card className="border-0 shadow mb-4" style={{ background: '#141a24', borderRadius: '16px' }}>
            <Card.Body className="p-3 p-sm-4">
              <h6 className="text-light fw-bold mb-3">
                <Store size={16} className="me-2 text-warning" />
                Informasi Penjual
              </h6>
              
              <div className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: '#0f161e' }}>
                <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                  <Store size={24} className="text-light" />
                </div>
                <div>
                  <div className="text-light fw-bold">{sellerInfo?.store_name || 'Toko App'}</div>
                  <div className="text-muted small">⭐ 4.9 (2.832 rating)</div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Payment Info */}
          <Card className="border-0 shadow mb-4" style={{ background: '#141a24', borderRadius: '16px' }}>
            <Card.Body className="p-3 p-sm-4">
              <h6 className="text-light fw-bold mb-3">
                <CreditCard size={16} className="me-2 text-warning" />
                Pembayaran Transfer Bank
              </h6>
              
              <div className="p-3 rounded" style={{ background: '#0f161e', border: '1px solid #2a3444' }}>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted small">Bank</span>
                  <span className="text-light fw-bold">{sellerInfo?.bank_name || 'BCA'}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted small">No Rekening</span>
                  <span className="text-light fw-bold">{sellerInfo?.bank_account || '1234567890'}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-top border-secondary pt-2">
                  <span className="text-muted small">Nama Pemilik</span>
                  <span className="text-light fw-bold">{sellerInfo?.bank_owner || 'PT Toko App'}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted small">Total yang harus dibayar</span>
                  <span className="text-warning fw-bold" style={{ fontSize: '1.1rem' }}>
                    {formatCurrency(totalPrice + (sellerInfo?.shipping_cost || 0))}
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Upload Bukti Transfer */}
          <Card className="border-0 shadow mb-4" style={{ background: '#141a24', borderRadius: '16px' }}>
            <Card.Body className="p-3 p-sm-4">
              <h6 className="text-light fw-bold mb-3">
                <Upload size={16} className="me-2 text-warning" />
                Upload Bukti Transfer *
              </h6>
              
              {paymentPreview ? (
                <div className="position-relative text-center">
                  <Image 
                    src={paymentPreview} 
                    style={{ 
                      maxHeight: '200px', 
                      maxWidth: '100%', 
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }} 
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    className="position-absolute top-0 end-0 rounded-circle"
                    style={{ width: '28px', height: '28px', padding: 0 }}
                    onClick={removePaymentProof}
                  >
                    ✕
                  </Button>
                  <div className="mt-2">
                    <span className="text-success small">✓ Bukti terupload</span>
                  </div>
                </div>
              ) : (
                <div 
                  className="border border-secondary border-dashed rounded p-4 text-center"
                  style={{ cursor: 'pointer', borderStyle: 'dashed' }}
                  onClick={() => document.getElementById('paymentProofInput').click()}
                >
                  <Upload size={32} className="text-muted mb-2" />
                  <p className="text-muted small mb-0">
                    Klik untuk upload bukti transfer<br />
                    <span className="text-muted" style={{ fontSize: '10px' }}>JPG, PNG, WEBP (max 2MB)</span>
                  </p>
                  <Form.Control
                    id="paymentProofInput"
                    type="file"
                    accept="image/*"
                    onChange={handlePaymentProof}
                    className="d-none"
                  />
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Submit Button */}
          <Button 
            variant="success" 
            className="w-100 fw-bold"
            onClick={handleSubmit}
            disabled={submitting || !paymentProof}
            style={{ padding: '14px', borderRadius: '12px' }}
          >
            {submitting ? (
              <><Spinner animation="border" size="sm" className="me-2" /> Memproses...</>
            ) : (
              <><CheckCircle size={18} className="me-2" /> Konfirmasi Pesanan</>
            )}
          </Button>
          
          <div className="text-center mt-2">
            <small className="text-muted">
              <Shield size={12} className="me-1 text-success" />
              Pesanan akan dikonfirmasi oleh penjual
            </small>
          </div>
        </Col>
      </Row>

      <style>
        {`
          .border-dashed {
            border-style: dashed !important;
          }
          .border-dashed:hover {
            border-color: #ff9100 !important;
            background: #0f161e;
          }
        `}
      </style>
    </Container>
  );
};

export default Checkout;