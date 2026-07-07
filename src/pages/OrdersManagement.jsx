import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Image, Spinner, Alert, Tab, Nav
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase, getPublicUrl } from '../config/supabase';
import Toast from '../components/Toast';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User,
  Calendar,
  Eye,
  XCircle,
  Check,
  AlertCircle,
  Store,
  RefreshCw
} from 'lucide-react';

const OrdersManagement = ({ onMenuChange }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);

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
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fungsi untuk mendapatkan URL publik dari Supabase Storage
  const getPaymentProofUrl = (path) => {
    if (!path) return null;
    
    // Jika sudah URL lengkap, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Jika path adalah nama file saja, construct URL
    try {
      // Coba gunakan getPublicUrl dari config
      const publicUrl = getPublicUrl(path);
      return publicUrl;
    } catch (err) {
      console.error('Error getting public URL:', err);
      // Fallback: construct manual
      const { data } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(path);
      return data?.publicUrl || path;
    }
  };

  // Load orders untuk penjual
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) {
      console.warn('⚠️ User not logged in');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Loading orders for seller:', user.uid);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📦 Orders found:', data?.length || 0);
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      showToast('Gagal load order: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh orders
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    showToast('🔄 Order refreshed!', 'info');
  };

  // Konfirmasi order (penjual menerima)
  const handleConfirmOrder = async (orderId) => {
    if (!window.confirm('Konfirmasi order ini dan kirim ke pembeli?')) return;

    setProcessingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      showToast('✅ Order dikonfirmasi dan dikirim!', 'success');
      await loadOrders();
    } catch (err) {
      console.error('Error confirming order:', err);
      showToast('❌ Gagal konfirmasi order: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject order (penjual menolak)
  const handleRejectOrder = async (orderId) => {
    if (!window.confirm('Yakin menolak order ini?')) return;

    setProcessingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      showToast('❌ Order ditolak', 'info');
      await loadOrders();
    } catch (err) {
      console.error('Error rejecting order:', err);
      showToast('❌ Gagal tolak order: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { variant: 'warning', icon: <Clock size={14} />, label: 'Menunggu Konfirmasi' },
      'paid': { variant: 'info', icon: <CheckCircle size={14} />, label: 'Dibayar' },
      'sent': { variant: 'primary', icon: <Truck size={14} />, label: 'Dikirim' },
      'completed': { variant: 'success', icon: <CheckCircle size={14} />, label: 'Selesai' },
      'cancelled': { variant: 'danger', icon: <XCircle size={14} />, label: 'Dibatalkan' },
      'rejected': { variant: 'danger', icon: <XCircle size={14} />, label: 'Ditolak' }
    };
    return statusMap[status] || { variant: 'secondary', icon: <Clock size={14} />, label: status };
  };

  // Filter orders by status
  const getFilteredOrders = () => {
    if (activeTab === 'pending') {
      return orders.filter(o => o.status === 'pending' || o.status === 'paid');
    }
    return orders.filter(o => o.status === activeTab);
  };

  const filteredOrders = getFilteredOrders();

  // Handle order click
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedOrder(null);
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

  // Detail Order View
  if (showDetail && selectedOrder) {
    const status = getStatusBadge(selectedOrder.status);
    const isPending = selectedOrder.status === 'pending' || selectedOrder.status === 'paid';
    const isProcessing = processingId === selectedOrder.id;
    const paymentProofUrl = getPaymentProofUrl(selectedOrder.payment_proof);

    return (
      <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
        
        <Button 
          variant="outline-secondary" 
          className="mb-3"
          onClick={handleCloseDetail}
          size="sm"
        >
          ← Kembali ke Daftar Order
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
                <div className="text-muted small mt-1">
                  Pembeli: {selectedOrder.user_email}
                </div>
              </div>
              <Badge bg={status.variant} className="d-flex align-items-center gap-1 px-3 py-2">
                {status.icon}
                {status.label}
              </Badge>
            </div>

            <hr className="border-secondary" />

            {/* Action Buttons for Pending Orders */}
            {isPending && (
              <div className="d-flex gap-2 mb-3">
                <Button 
                  variant="success" 
                  className="flex-grow-1 fw-bold"
                  onClick={() => handleConfirmOrder(selectedOrder.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <><Spinner animation="border" size="sm" className="me-2" /> Memproses...</>
                  ) : (
                    <><Check size={18} className="me-2" /> Konfirmasi & Kirim</>
                  )}
                </Button>
                <Button 
                  variant="danger" 
                  className="flex-grow-1"
                  onClick={() => handleRejectOrder(selectedOrder.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <><Spinner animation="border" size="sm" className="me-2" /> Memproses...</>
                  ) : (
                    <><XCircle size={18} className="me-2" /> Tolak</>
                  )}
                </Button>
              </div>
            )}

            <Row className="g-3">
              <Col md={6}>
                <h6 className="text-light fw-bold mb-2">👤 Data Pembeli</h6>
                <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                  <div><strong className="text-light">Nama:</strong> <span className="text-muted">{selectedOrder.full_name}</span></div>
                  <div><strong className="text-light">Email:</strong> <span className="text-muted">{selectedOrder.user_email}</span></div>
                  <div><strong className="text-light">Telepon:</strong> <span className="text-muted">{selectedOrder.phone}</span></div>
                </div>
              </Col>
              <Col md={6}>
                <h6 className="text-light fw-bold mb-2">📍 Alamat Pengiriman</h6>
                <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                  <div className="d-flex align-items-center gap-2">
                    <MapPin size={16} className="text-warning" />
                    <span className="text-light small">{selectedOrder.address}</span>
                  </div>
                  <div className="text-muted small mt-1">
                    {selectedOrder.city && `${selectedOrder.city}, `}
                    {selectedOrder.province && `${selectedOrder.province} `}
                    {selectedOrder.postal_code && `- ${selectedOrder.postal_code}`}
                  </div>
                </div>
              </Col>
            </Row>

            <hr className="border-secondary" />

            <h6 className="text-light fw-bold mb-2">📦 Detail Pesanan</h6>
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
              <div className="d-flex justify-content-end mt-2 pt-2 border-top border-secondary">
                <div className="text-end">
                  <div className="text-muted small">Total: <span className="text-warning fw-bold">{formatCurrency(selectedOrder.total_price + (selectedOrder.shipping_cost || 0))}</span></div>
                </div>
              </div>
            </div>

            {/* Payment Proof - FIXED */}
            {paymentProofUrl && (
              <>
                <hr className="border-secondary" />
                <h6 className="text-light fw-bold mb-2">💳 Bukti Pembayaran</h6>
                <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                  <div className="text-center">
                    <Image 
                      src={paymentProofUrl}
                      fluid 
                      style={{ 
                        maxHeight: '300px', 
                        objectFit: 'contain', 
                        borderRadius: '8px',
                        border: '1px solid #2a3444'
                      }}
                      onError={(e) => {
                        // Jika gambar gagal load, tampilkan placeholder
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/400x300/ff9100/fff?text=Bukti+Pembayaran';
                      }}
                    />
                    <div className="text-muted small mt-2">
                      <a 
                        href={paymentProofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-warning"
                        style={{ textDecoration: 'none' }}
                      >
                        🔗 Buka gambar di tab baru
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedOrder.notes && (
              <>
                <hr className="border-secondary" />
                <h6 className="text-light fw-bold mb-2">📝 Catatan Pembeli</h6>
                <div className="bg-dark p-3 rounded" style={{ background: '#0f161e' }}>
                  <p className="text-muted small mb-0">{selectedOrder.notes}</p>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Main Orders List
  return (
    <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="text-light fw-bold mb-0">🏪 Kelola Order</h4>
          <p className="text-muted small mb-0">
            {orders.filter(o => o.status === 'pending' || o.status === 'paid').length} order menunggu konfirmasi
          </p>
        </div>
        <Button 
          variant="outline-light" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <><Spinner animation="border" size="sm" className="me-1" /> Memuat...</>
          ) : (
            <><RefreshCw size={14} className="me-1" /> Refresh</>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Nav variant="tabs" className="mb-3 border-secondary" style={{ borderBottom: '1px solid #2a3444' }}>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'pending'} 
            onClick={() => setActiveTab('pending')}
            className="text-light"
          >
            ⏳ Menunggu ({orders.filter(o => o.status === 'pending' || o.status === 'paid').length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'sent'} 
            onClick={() => setActiveTab('sent')}
            className="text-light"
          >
            📦 Dikirim ({orders.filter(o => o.status === 'sent').length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'completed'} 
            onClick={() => setActiveTab('completed')}
            className="text-light"
          >
            ✅ Selesai ({orders.filter(o => o.status === 'completed').length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'rejected'} 
            onClick={() => setActiveTab('rejected')}
            className="text-light"
          >
            ❌ Ditolak ({orders.filter(o => o.status === 'rejected').length})
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="border-0 shadow text-center py-4 py-sm-5" style={{ background: '#141a24', borderRadius: '16px' }}>
          <Card.Body>
            <div style={{ fontSize: 'clamp(48px, 10vw, 80px)' }}>📭</div>
            <h4 className="text-light mt-3">Tidak Ada Order</h4>
            <p className="text-muted small">Belum ada order di tab ini</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {filteredOrders.map((order) => {
            const status = getStatusBadge(order.status);
            const isPending = order.status === 'pending' || order.status === 'paid';
            const hasPaymentProof = order.payment_proof ? true : false;
            
            return (
              <Col key={order.id} xs={12}>
                <Card 
                  className="border-0 shadow cursor-pointer"
                  style={{ 
                    background: '#141a24', 
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    borderLeft: isPending ? '4px solid #ff9100' : '4px solid transparent'
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
                          <span className="text-light fw-bold">#{order.id?.slice(0, 8)}</span>
                          <Badge bg={status.variant} className="d-flex align-items-center gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                          {isPending && (
                            <Badge bg="danger" className="animate-pulse">⚠️ Perlu Konfirmasi</Badge>
                          )}
                          {hasPaymentProof && (
                            <Badge bg="success" className="d-flex align-items-center gap-1">
                              💳 Sudah Bayar
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted small mt-1">
                          <User size={14} className="me-1" />
                          {order.user_email} • {formatDate(order.created_at)}
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
                        <MapPin size={16} className="text-warning" />
                        <span className="text-light small">{order.address?.slice(0, 50)}...</span>
                      </div>
                      <Button variant="outline-light" size="sm" className="ms-auto">
                        <Eye size={14} className="me-1" />
                        Detail
                      </Button>
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
          .animate-pulse {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
          .last\\:border-0:last-child {
            border-bottom: none !important;
          }
        `}
      </style>
    </Container>
  );
};

export default OrdersManagement;