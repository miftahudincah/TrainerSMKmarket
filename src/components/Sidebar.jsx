import React, { useState, useEffect } from 'react';
import { Nav, Button, Badge, Image } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getMenuItemsByRole, ROLE_LABELS } from '../utils/roles';
import { supabase } from '../config/supabase';
import { getSettings } from '../config/settings';

// Daftar slogan/tagline untuk ditampilkan bergantian
const STORE_SLOGANS = [
  '✨ Belanja Mudah & Aman',
  '🔥 Diskon Setiap Hari',
  '🎉 Promo Spesial untuk Anda',
  '💎 Kualitas Terbaik',
  '🚀 Cepat & Terpercaya',
  '⭐ Pelayanan Ramah',
  '🛍️ Belanja Jadi Menyenangkan',
  '💯 100% Original',
  '🎯 Tepat Sasaran',
  '🌟 Pilihan Tepat'
];

const STORE_EMOJIS = ['🛒', '🛍️', '🎁', '✨', '⭐', '🔥', '💎', '🚀', '🎯', '🌟'];

const Sidebar = ({ activeMenu, onMenuChange, onLogout, storeName: propStoreName, storeLogo: propStoreLogo }) => {
  const { userRole, user } = useAuth();
  const [orderOpen, setOrderOpen] = useState(false);
  const [sloganIndex, setSloganIndex] = useState(0);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [storeName, setStoreName] = useState(propStoreName || 'Toko App');
  const [storeLogo, setStoreLogo] = useState(propStoreLogo || '');
  const [nameIndex, setNameIndex] = useState(0);
  const [isNameHovered, setIsNameHovered] = useState(false);
  const [badges, setBadges] = useState({
    cart: 0,
    ordersManagement: 0,
    messages: 0,
    ordersSent: 0,
    ordersCancelled: 0,
    ordersCompleted: 0
  });

  // Load settings dari database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (settings.store_name) {
          setStoreName(settings.store_name);
        }
        if (settings.store_logo) {
          setStoreLogo(settings.store_logo);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };

    loadSettings();
  }, []);

  // Listen untuk update settings
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const loadSettings = async () => {
        try {
          const settings = await getSettings();
          if (settings.store_name) {
            setStoreName(settings.store_name);
          }
          if (settings.store_logo) {
            setStoreLogo(settings.store_logo);
          }
        } catch (err) {
          console.error('Error loading settings:', err);
        }
      };
      loadSettings();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // Efek untuk looping slogan dan emoji
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered) {
        setSloganIndex((prev) => (prev + 1) % STORE_SLOGANS.length);
        setEmojiIndex((prev) => (prev + 1) % STORE_EMOJIS.length);
      }
    }, 3000); // Ganti setiap 3 detik

    return () => clearInterval(interval);
  }, [isHovered]);

  // Efek untuk looping nama toko dengan efek karakter berjalan
  useEffect(() => {
    if (isNameHovered) return;

    const interval = setInterval(() => {
      setNameIndex((prev) => {
        // Jika nama toko kosong, gunakan default
        const name = storeName || 'Toko App';
        // Reset jika sudah mencapai akhir
        if (prev >= name.length) {
          return 0;
        }
        return prev + 1;
      });
    }, 200); // 200ms per karakter

    return () => clearInterval(interval);
  }, [storeName, isNameHovered]);

  // Load badges dari database
  useEffect(() => {
    if (user) {
      loadBadges();
    }
  }, [user]);

  const loadBadges = async () => {
    try {
      // 1. Cart count
      const { data: cartData } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.uid)
        .maybeSingle();
      
      const cartItems = cartData?.items || [];
      const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

      // 2. Orders count untuk user (pembeli)
      const { data: userOrders } = await supabase
        .from('orders')
        .select('status')
        .eq('user_id', user.uid);

      const sentCount = userOrders?.filter(o => o.status === 'sent').length || 0;
      const cancelledCount = userOrders?.filter(o => o.status === 'cancelled').length || 0;
      const completedCount = userOrders?.filter(o => o.status === 'completed').length || 0;

      // 3. Orders management count (penjual) - untuk Owner & Developer
      const { data: sellerOrders } = await supabase
        .from('orders')
        .select('status')
        .eq('seller_id', user.uid)
        .in('status', ['pending', 'paid']);

      const pendingOrders = sellerOrders?.length || 0;

      // 4. Messages count - pesan belum dibaca
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.uid)
        .eq('is_read', false);

      const messagesCount = unreadMessages?.length || 0;

      setBadges({
        cart: cartCount,
        ordersManagement: pendingOrders,
        messages: messagesCount,
        ordersSent: sentCount,
        ordersCancelled: cancelledCount,
        ordersCompleted: completedCount
      });

    } catch (err) {
      console.error('Error loading badges:', err);
    }
  };

  // Listen for cart updates, order updates, message updates
  useEffect(() => {
    const handleUpdate = () => {
      if (user) {
        loadBadges();
      }
    };
    
    window.addEventListener('cartUpdated', handleUpdate);
    window.addEventListener('orderUpdated', handleUpdate);
    window.addEventListener('messageUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleUpdate);
      window.removeEventListener('orderUpdated', handleUpdate);
      window.removeEventListener('messageUpdated', handleUpdate);
    };
  }, [user]);

  // Get menu items dengan badges
  const menuItems = getMenuItemsByRole(userRole, badges);

  const getIcon = (id) => {
    const icons = {
      'dashboard': '📊',
      'products': '📦',
      'cart': '🛒',
      'orders': '📋',
      'messages': '💬',
      'profile': '👤',
      'orders-management': '📋',
      'users': '👥',
      'analytics': '📈',
      'developer': '💻',
      'logs': '📋',
      'settings': '⚙️'
    };
    return icons[id] || '📄';
  };

  const handleMenuClick = (menuId) => {
    if (menuId === 'orders') {
      setOrderOpen(!orderOpen);
    } else {
      onMenuChange(menuId);
    }
  };

  const handleSubMenuClick = (subId) => {
    onMenuChange(subId);
  };

  const isActive = (menuId) => {
    if (menuId === activeMenu) return true;
    if (menuId === 'orders' && ['orders-sent', 'orders-cancelled', 'orders-completed'].includes(activeMenu)) {
      return true;
    }
    return false;
  };

  const isSubActive = (subId) => {
    return activeMenu === subId;
  };

  const hasSubItems = (item) => {
    return item.id === 'orders' && item.subItems && item.subItems.length > 0;
  };

  const getSubItems = (item) => {
    if (item.id === 'orders' && item.subItems) {
      return item.subItems;
    }
    return [];
  };

  // Fungsi untuk menampilkan nama toko dengan efek mengetik
  const getDisplayName = () => {
    const name = storeName || 'Toko App';
    if (isNameHovered) {
      return name;
    }
    return name.substring(0, Math.min(nameIndex + 1, name.length));
  };

  // Fungsi untuk menampilkan kursor berkedip
  const getCursor = () => {
    const name = storeName || 'Toko App';
    if (isNameHovered) return '';
    if (nameIndex < name.length) {
      return <span className="cursor-blink">|</span>;
    }
    // Setelah selesai, tampilkan kursor berkedip lambat
    return <span className="cursor-blink-slow">|</span>;
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#141a24',
      padding: '20px 0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Logo dengan nama toko dinamis dan animasi */}
      <div 
        className="text-center mb-4 px-3"
        onMouseEnter={() => {
          setIsHovered(true);
          setIsNameHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsNameHovered(false);
          // Reset name index saat mouse leave
          setNameIndex(0);
        }}
        style={{
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)'
        }}
      >
        {storeLogo ? (
          <Image 
            src={storeLogo} 
            style={{ 
              height: '60px', 
              width: 'auto', 
              maxWidth: '100%',
              objectFit: 'contain',
              marginBottom: '8px',
              transition: 'all 0.3s ease',
              filter: isHovered ? 'brightness(1.2)' : 'brightness(1)'
            }} 
          />
        ) : (
          <div style={{ 
            fontSize: '50px', 
            color: '#ff9100',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'scale(1.1) rotate(10deg)' : 'scale(1) rotate(0deg)'
          }}>
            {STORE_EMOJIS[emojiIndex]}
          </div>
        )}
        
        {/* Nama Toko dengan efek typing */}
        <h4 
          style={{ 
            color: '#ff9100', 
            fontWeight: 'bold',
            background: isHovered ? 'linear-gradient(90deg, #ff9100, #ff6b00)' : 'none',
            WebkitBackgroundClip: isHovered ? 'text' : 'none',
            WebkitTextFillColor: isHovered ? 'transparent' : '#ff9100',
            transition: 'all 0.5s ease',
            textShadow: isHovered ? '0 0 20px rgba(255,145,0,0.3)' : 'none',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px'
          }}
        >
          <span>{getDisplayName()}</span>
          {getCursor()}
        </h4>
        
        {/* Slogan berjalan (looping) */}
        <div style={{
          height: '24px',
          overflow: 'hidden',
          marginTop: '4px'
        }}>
          <div
            style={{
              animation: 'slideSlogan 3s ease-in-out infinite',
              color: '#8892a8',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            {STORE_SLOGANS[sloganIndex]}
          </div>
        </div>

        {/* Role user */}
        <small className="text-muted mt-1" style={{ display: 'block', fontSize: '11px' }}>
          {userRole ? ROLE_LABELS[userRole] : 'Loading...'}
        </small>

        {/* CSS Animation untuk slogan dan cursor */}
        <style>
          {`
            @keyframes slideSlogan {
              0% {
                opacity: 0;
                transform: translateY(-10px);
              }
              10% {
                opacity: 1;
                transform: translateY(0);
              }
              90% {
                opacity: 1;
                transform: translateY(0);
              }
              100% {
                opacity: 0;
                transform: translateY(10px);
              }
            }

            @keyframes blink {
              0%, 50% {
                opacity: 1;
              }
              51%, 100% {
                opacity: 0;
              }
            }

            @keyframes blinkSlow {
              0%, 49% {
                opacity: 1;
              }
              50%, 100% {
                opacity: 0;
              }
            }

            .cursor-blink {
              animation: blink 0.7s ease-in-out infinite;
              color: #ff9100;
              font-weight: bold;
            }

            .cursor-blink-slow {
              animation: blinkSlow 1.5s ease-in-out infinite;
              color: #ff9100;
              font-weight: bold;
            }
          `}
        </style>
      </div>

      {/* Menu Items */}
      <Nav className="flex-column px-2" style={{ flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <div key={item.id}>
            {hasSubItems(item) ? (
              <div>
                <Button
                  variant="link"
                  className="w-100 text-start text-light text-decoration-none p-2"
                  style={{
                    background: isActive(item.id) ? '#1f6fb0' : 'transparent',
                    borderRadius: '8px',
                    color: isActive(item.id) ? '#fff' : '#b0bed6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 'none',
                    transition: 'all 0.2s',
                    fontSize: '14px'
                  }}
                  onClick={() => handleMenuClick(item.id)}
                >
                  <span>
                    <span className="me-2">{getIcon(item.id)}</span>
                    {item.label}
                  </span>
                  <span>
                    {item.badge > 0 && (
                      <Badge bg="danger" className="me-2">{item.badge}</Badge>
                    )}
                    {orderOpen ? '▼' : '▶'}
                  </span>
                </Button>

                {orderOpen && (
                  <div className="ms-3 mt-1">
                    {getSubItems(item).map((sub) => (
                      <Button
                        key={sub.id}
                        variant="link"
                        className="w-100 text-start text-decoration-none p-2"
                        style={{
                          background: isSubActive(sub.id) ? '#1f6fb0' : 'transparent',
                          borderRadius: '8px',
                          color: isSubActive(sub.id) ? '#fff' : '#8892a8',
                          fontSize: '13px',
                          border: 'none',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleSubMenuClick(sub.id)}
                      >
                        <span>
                          {sub.label}
                          {sub.badge > 0 && (
                            <Badge bg="danger" className="ms-2">{sub.badge}</Badge>
                          )}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="link"
                className="w-100 text-start text-light text-decoration-none p-2"
                style={{
                  background: isActive(item.id) ? '#1f6fb0' : 'transparent',
                  borderRadius: '8px',
                  color: isActive(item.id) ? '#fff' : '#b0bed6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: 'none',
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  position: 'relative'
                }}
                onClick={() => handleMenuClick(item.id)}
              >
                <span>
                  <span className="me-2">{getIcon(item.id)}</span>
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <Badge 
                    bg="danger" 
                    style={{
                      animation: item.badge > 0 ? 'pulseBadge 1.5s ease-in-out infinite' : 'none'
                    }}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        ))}
      </Nav>

      {/* CSS Animation untuk badge */}
      <style>
        {`
          @keyframes pulseBadge {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
            }
          }
        `}
      </style>

      {/* Footer dengan Logout */}
      <div className="px-2 mt-auto" style={{ borderTop: '1px solid #2a3444', paddingTop: '12px' }}>
        <Button
          variant="danger"
          className="w-100 text-start d-flex align-items-center"
          style={{
            borderRadius: '8px',
            padding: '10px 16px',
            border: 'none',
            transition: 'all 0.3s ease'
          }}
          onClick={onLogout}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.02)';
            e.target.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }}
        >
          🚪 Logout
        </Button>
        <div className="text-center mt-2" style={{ color: '#5d7494', fontSize: '10px' }}>
          {user?.email && (
            <span className="text-muted" style={{
              transition: 'all 0.3s ease',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user.email}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;