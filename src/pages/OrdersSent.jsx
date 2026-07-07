import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Image, Spinner, Alert, Nav
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import Toast from '../components/Toast';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User,
  Calendar,
  ChevronRight,
  ShoppingBag,
  Eye,
  MessageCircle,
  Check,
  XCircle
} from 'lucide-react';

const OrdersSent = ({ onMenuChange }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load orders
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.uid)
        .eq('status', 'sent')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      showToast('Gagal load order: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { variant: 'warning', icon: <Clock size={14} />, label: 'Menunggu Konfirmasi' },
      'paid': { variant: 'info', icon: <CheckCircle size={14} />, label: 'Pembayaran Dikonfirmasi' },
      'sent': { variant: 'primary', icon: <Truck size={14} />, label: 'Dikirim' },
      'completed': { variant: 'success', icon: <CheckCircle size={14} />, label: 'Selesai' },
      'cancelled': { variant: 'danger', icon: <XCircle size={14} />, label: 'Dibatalkan' }
    };
    return statusMap[status] || { variant: 'secondary', icon: <Clock size={14} />, label: status };
  };

  // Handle order click to show detail
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedOrder(null);
  };

  // Fungsi untuk menandai order sebagai selesai
  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm('Apakah Anda sudah menerima pesanan ini? Tandai sebagai selesai?')) return;

    setProcessingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      showToast('✅ Order telah selesai! Terima kasih telah berbelanja.', 'success');
      await loadOrders();
      
      // Jika detail terbuka, tutup
      if (showDetail) {
        setShowDetail(false);
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error completing order:', err);
      showToast('❌ Gagal menyelesaikan order: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Go back to products
  const goBackToProducts = () => {
    if (onMenuChange) {
      onMenuChange('products');
    }
  };

  if (loading) {
    return (
      <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" variant="warning" size="lg" />
        </div>
      </Container>
    );
  }

  // Tampilkan detail order jika ada
  if (showDetail && selectedOrder) {
    const status = getStatusBadge(selectedOrder.status);
    const isProcessing = processingId === selectedOrder.id;

    return (
      <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
        
        <Button 
          variant="outline-secondary" 
          className="mb-3"
          onClick={handleCloseDetail}
          size="sm"
        >
          ← Kembali ke Order
        </Button>

        <Card className="border-0 shadow" style={{ background: '#141a24', borderRadius: '16px' }}>
          <Card.Body className="p-3 p-sm-4">
            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
              <div>
                <h4 className="text-light fw-bold">Order #{selectedOrder.id?.slice(0, 8)}</h4>
                <div className="d-flex align-items-center gap-2">
                  <Calendar size={14} className="text-muted" />
                  <span className="text-muted small">{formatDate(selectedOrder.created_at)}</span>
                </div>
              </div>
              <Badge bg={status.variant} className="d-flex align-items-center gap-1 px-3 py-2">
                {status.icon}
                {status.label}
              </Badge>
            </div>

            {/* Tombol Selesai */}
            <Button 
              variant="success" 
              className="w-100 mb-3 fw-bold"
              onClick={() => handleCompleteOrder(selectedOrder.id)}
              disabled={isProcessing}
              style={{ padding: '12px', borderRadius: '12px' }}
            >
              {isProcessing ? (
                <><Spinner animation="border" size="sm" className="me-2" /> Memproses...</>
              ) : (
                <><Check size={18} className="me-2" /> Tandai Order Selesai</>
              )}
            </Button>

            <hr className="border-secondary" />

            <Row className="g-3">
              <Col md={6}>
                <h6 className="text-light fw-bold mb-2">Alamat Pengiriman</h6>
                <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                  <div className="d-flex align-items-center gap-2">
                    <User size={16} className="text-warning" />
                    <span className="text-light">{selectedOrder.full_name}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <MapPin size={16} className="text-warning" />
                    <span className="text-light small">{selectedOrder.address}</span>
                  </div>
                  <div className="text-muted small mt-1">
                    {selectedOrder.city && `${selectedOrder.city}, `}
                    {selectedOrder.province && `${selectedOrder.province} `}
                    {selectedOrder.postal_code && `- ${selectedOrder.postal_code}`}
                  </div>
                  <div className="text-muted small mt-1">📱 {selectedOrder.phone}</div>
                </div>
              </Col>

              <Col md={6}>
                <h6 className="text-light fw-bold mb-2">Pembayaran</h6>
                <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">Total</span>
                    <span className="text-warning fw-bold">{formatCurrency(selectedOrder.total_price + (selectedOrder.shipping_cost || 0))}</span>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted small">Ongkos Kirim</span>
                    <span className="text-light small">{formatCurrency(selectedOrder.shipping_cost || 0)}</span>
                  </div>
                  {selectedOrder.payment_proof && (
                    <div className="mt-2">
                      <span className="text-success small">✓ Bukti pembayaran terupload</span>
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            <hr className="border-secondary" />

            <h6 className="text-light fw-bold mb-3">Produk yang dipesan</h6>
            <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
              {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                <div key={idx} className="d-flex align-items-center gap-3 p-2 border-bottom border-secondary last:border-0">
                  <Image 
                    src={item.image_urls?.[0] || item.image_url || 'https://via.placeholder.com/60'} 
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <div className="flex-grow-1">
                    <div className="text-light fw-bold small">{item.name}</div>
                    <div className="text-warning small">{formatCurrency(item.price)}</div>
                  </div>
                  <div className="text-muted small">x{item.quantity}</div>
                  <div className="text-light fw-bold small">{formatCurrency(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            {selectedOrder.notes && (
              <>
                <hr className="border-secondary" />
                <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                  <h6 className="text-light fw-bold small">Catatan</h6>
                  <p className="text-muted small mb-0">{selectedOrder.notes}</p>
                </div>
              </>
            )}
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
            ← Kembali
          </Button>
          <div>
            <h4 className="text-light fw-bold mb-0" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)' }}>
              📦 Order Dikirim
            </h4>
            <p className="text-muted small mb-0">
              {orders.length} order sedang dalam pengiriman
            </p>
          </div>
        </div>
        <Button 
          variant="outline-light" 
          size="sm"
          onClick={loadOrders}
        >
          ⟳ Refresh
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="border-0 shadow text-center py-4 py-sm-5" style={{ background: '#141a24', borderRadius: '16px' }}>
          <Card.Body>
            <div style={{ fontSize: 'clamp(48px, 10vw, 80px)' }}>🚚</div>
            <h4 className="text-light mt-3">Belum Ada Order Dikirim</h4>
            <p className="text-muted small">Order Anda akan muncul di sini setelah dikirim</p>
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
        <Row className="g-3">
          {orders.map((order) => {
            const status = getStatusBadge(order.status);
            const isProcessing = processingId === order.id;
            
            return (
              <Col key={order.id} xs={12}>
                <Card 
                  className="border-0 shadow cursor-pointer"
                  style={{ 
                    background: '#141a24', 
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    borderLeft: '4px solid #0d6efd'
                  }}
                  onClick={() => handleOrderClick(order)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 145, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Card.Body className="p-3 p-sm-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="text-light fw-bold">Order #{order.id?.slice(0, 8)}</span>
                          <Badge bg={status.variant} className="d-flex align-items-center gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-muted small mt-1">
                          <Calendar size={14} className="me-1" />
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-warning fw-bold">{formatCurrency(order.total_price + (order.shipping_cost || 0))}</div>
                        <div className="text-muted small">{order.total_items} item</div>
                      </div>
                    </div>

                    <hr className="border-secondary" />

                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div className="d-flex align-items-center gap-2 flex-grow-1">
                        <Truck size={16} className="text-warning" />
                        <span className="text-light small">Dikirim ke: {order.address?.slice(0, 50)}...</span>
                      </div>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="success" 
                          size="sm"
                          className="px-2 px-sm-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteOrder(order.id);
                          }}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            <>
                              <Check size={14} className="me-1" />
                              <span className="d-none d-sm-inline">Selesai</span>
                              <span className="d-sm-none">✓</span>
                            </>
                          )}
                        </Button>
                        <Button variant="outline-light" size="sm" className="px-2">
                          <Eye size={14} className="me-1 d-none d-sm-inline" />
                          <span className="d-none d-sm-inline">Detail</span>
                          <span className="d-sm-none">👁️</span>
                          <ChevronRight size={14} className="ms-1 d-none d-sm-inline" />
                        </Button>
                      </div>
                    </div>

                    {/* Product preview */}
                    <div className="d-flex gap-2 mt-2 overflow-auto" style={{ maxWidth: '100%' }}>
                      {order.items && order.items.slice(0, 3).map((item, idx) => (
                        <Image 
                          key={idx}
                          src={item.image_urls?.[0] || item.image_url || 'https://via.placeholder.com/40'} 
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      ))}
                      {order.items && order.items.length > 3 && (
                        <div className="d-flex align-items-center justify-content-center bg-dark rounded" style={{ width: '40px', height: '40px' }}>
                          <span className="text-muted small">+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <style>
        {`
          .cursor-pointer {
            cursor: pointer;
          }
          .border-bottom:last-child {
            border-bottom: none !important;
          }
          .last\\:border-0:last-child {
            border-bottom: none !important;
          }
        `}
      </style>
    </Container>
  );
};

export default OrdersSent;