import React, { useState, useEffect } from 'react';
import { Container, Navbar, Button, Offcanvas, Form, Image } from 'react-bootstrap';
import { Menu, Search, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { auth } from '../config/firebase';
import { getSettings } from '../config/settings';
import { supabase, getPublicUrl } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

// Daftar tagline untuk ditampilkan bergantian di header
const HEADER_TAGLINES = [
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

const Layout = ({ children, activeMenu, onMenuChange, onSearchResults }) => {
  const { user } = useAuth();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeName, setStoreName] = useState('Toko App');
  const [storeLogo, setStoreLogo] = useState('');
  const [storeTagline, setStoreTagline] = useState('Admin Panel');
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isTaglineHovered, setIsTaglineHovered] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isNameHovered, setIsNameHovered] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [userName, setUserName] = useState('');

  // Load store settings dan user profile
  useEffect(() => {
    loadSettings();
    loadUserProfile();

    const handleSettingsUpdate = () => {
      loadSettings();
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    // Listen untuk profile updated
    const handleProfileUpdated = () => {
      loadUserProfile();
    };
    window.addEventListener('profileUpdated', handleProfileUpdated);

    // Listen untuk userLoggedIn - refresh profile setelah login
    const handleUserLoggedIn = () => {
      loadUserProfile();
      loadSettings();
    };
    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdated);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, [user]);

  // Effect untuk looping tagline di header
  useEffect(() => {
    if (isTaglineHovered) return;

    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % HEADER_TAGLINES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isTaglineHovered]);

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      setStoreName(settings.store_name || 'Toko App');
      setStoreLogo(settings.store_logo || '');
      setStoreTagline(settings.store_tagline || 'Admin Panel');
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const loadUserProfile = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserName(data.name || user.displayName || user.email?.split('@')[0] || 'User');
        
        if (data.avatar_url) {
          // Coba dapatkan URL publik
          try {
            const publicUrl = getPublicUrl(data.avatar_url);
            setUserAvatar(publicUrl);
          } catch (err) {
            // Fallback: coba langsung dari storage
            try {
              const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(data.avatar_url);
              setUserAvatar(urlData?.publicUrl || null);
            } catch (e) {
              setUserAvatar(null);
            }
          }
        } else {
          setUserAvatar(null);
        }
      } else {
        // Jika user belum ada di database, gunakan default
        setUserName(user.displayName || user.email?.split('@')[0] || 'User');
        setUserAvatar(null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      // Fallback ke default
      setUserName(user?.displayName || user?.email?.split('@')[0] || 'User');
      setUserAvatar(null);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Dispatch event untuk refresh state
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setShowResults(false);
      setSearchResults([]);
      if (onSearchResults) {
        onSearchResults([]);
      }
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const query = searchQuery.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSearchResults(data || []);
      
      if (onSearchResults) {
        onSearchResults(data || []);
      }

    } catch (err) {
      console.error('Error searching products:', err);
      setSearchResults([]);
      if (onSearchResults) {
        onSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    if (onSearchResults) {
      onSearchResults(null);
    }
    window.dispatchEvent(new CustomEvent('searchCleared'));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (!value.trim()) {
      setShowResults(false);
      setSearchResults([]);
      if (onSearchResults) {
        onSearchResults(null);
      }
    }
  };

  // Navigasi ke profile ketika avatar diklik
  const goToProfile = () => {
    if (!user) {
      // Jika belum login, tampilkan login
      window.dispatchEvent(new CustomEvent('showLogin'));
      return;
    }
    if (onMenuChange) {
      onMenuChange('profile');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ========== HEADER (Fixed Top) - Mobile Friendly ========== */}
      <Navbar 
        bg="dark" 
        variant="dark" 
        className="px-2 px-sm-3"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1050,
          borderBottom: '1px solid #2a3444',
          minHeight: '60px',
          paddingTop: '4px',
          paddingBottom: '4px'
        }}
      >
        <Container fluid className="d-flex align-items-center justify-content-between gap-1 gap-sm-2">
          
          {/* ===== LEFT - Logo & Mobile Toggle ===== */}
          <div className="d-flex align-items-center flex-shrink-0">
            <Button
              variant="link"
              className="d-md-none text-light p-0 me-1 me-sm-2"
              onClick={() => setShowMobileSidebar(true)}
              style={{ minWidth: '30px' }}
            >
              <Menu size={22} />
            </Button>
            
            <div 
              className="d-flex flex-column"
              onMouseEnter={() => {
                setIsTaglineHovered(true);
                setIsNameHovered(true);
              }}
              onMouseLeave={() => {
                setIsTaglineHovered(false);
                setIsNameHovered(false);
              }}
              style={{ cursor: 'pointer', minWidth: '0', overflow: 'hidden' }}
              onClick={() => {
                if (onMenuChange) {
                  onMenuChange('dashboard');
                }
              }}
            >
              <div className="d-flex align-items-center">
                {storeLogo ? (
                  <Image 
                    src={storeLogo} 
                    style={{ 
                      height: 'clamp(24px, 4vw, 32px)', 
                      width: 'auto', 
                      maxWidth: 'clamp(60px, 15vw, 100px)',
                      objectFit: 'contain',
                      filter: 'brightness(1)',
                      transition: 'all 0.3s ease'
                    }} 
                    className={isTaglineHovered ? 'animate-pulse' : ''}
                  />
                ) : (
                  <span style={{ 
                    color: '#ff9100', 
                    fontSize: 'clamp(18px, 4vw, 24px)',
                    transition: 'all 0.3s ease',
                    transform: isTaglineHovered ? 'scale(1.2) rotate(15deg)' : 'scale(1) rotate(0deg)'
                  }}>
                    🛒
                  </span>
                )}
                
                {/* Nama Toko dengan efek berjalan (marquee) */}
                <div 
                  style={{ 
                    overflow: 'hidden',
                    maxWidth: 'clamp(80px, 25vw, 180px)',
                    marginLeft: '4px'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      animation: isNameHovered ? 'none' : 'marqueeName 8s linear infinite',
                      color: '#ff9100',
                      fontSize: 'clamp(14px, 3vw, 20px)',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      textShadow: isTaglineHovered ? '0 0 20px rgba(255,145,0,0.3)' : 'none'
                    }}
                  >
                    {storeName}
                    <span style={{ marginLeft: '40px' }}>{storeName}</span>
                  </div>
                </div>
              </div>
              
              {/* Tagline di bawah */}
              <div 
                className="d-none d-sm-block"
                style={{
                  marginTop: '1px',
                  marginLeft: storeLogo ? 'clamp(28px, 5vw, 40px)' : 'clamp(22px, 4vw, 32px)',
                  paddingLeft: '4px',
                  transition: 'all 0.3s ease',
                  opacity: isTaglineHovered ? 1 : 0.7
                }}
              >
                <span
                  style={{
                    animation: 'slideTagline 3s ease-in-out infinite',
                    display: 'inline-block',
                    color: '#8892a8',
                    fontSize: 'clamp(9px, 1.2vw, 13px)',
                    fontWeight: '400',
                    letterSpacing: '0.2px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {HEADER_TAGLINES[taglineIndex]}
                </span>
              </div>
            </div>
          </div>

          {/* ===== CENTER - Search Bar ===== */}
          <Form onSubmit={handleSearch} className="d-flex flex-grow-1 mx-1 mx-sm-3" style={{ maxWidth: '500px' }}>
            <div className="w-100 position-relative">
              <Search 
                className="position-absolute top-50 start-0 translate-middle-y ms-2 ms-sm-3 text-muted" 
                size={16}
              />
              <Form.Control
                type="text"
                placeholder={window.innerWidth < 576 ? "Cari..." : "Cari produk, deskripsi, kategori..."}
                value={searchQuery}
                onChange={handleSearchChange}
                className="bg-dark text-light border-secondary"
                style={{ 
                  paddingLeft: 'clamp(28px, 5vw, 40px)', 
                  paddingRight: searchQuery ? 'clamp(28px, 5vw, 35px)' : 'clamp(28px, 5vw, 40px)',
                  borderRadius: '20px',
                  height: 'clamp(32px, 5vw, 38px)',
                  transition: 'all 0.3s ease',
                  fontSize: 'clamp(12px, 1.5vw, 14px)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff9100';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255,145,0,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e);
                  }
                  if (e.key === 'Escape') {
                    clearSearch();
                  }
                }}
              />
              {searchQuery && (
                <Button
                  variant="link"
                  className="position-absolute top-50 end-0 translate-middle-y p-0 text-muted"
                  style={{ 
                    right: '6px',
                    zIndex: 5,
                    textDecoration: 'none'
                  }}
                  onClick={clearSearch}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
            <Button 
              type="submit" 
              variant="outline-secondary" 
              className="ms-1 ms-sm-2 d-none d-sm-block"
              size="sm"
              disabled={isSearching}
              style={{
                transition: 'all 0.3s ease',
                borderColor: '#2a3444',
                color: '#8892a8',
                fontSize: 'clamp(11px, 1.2vw, 14px)',
                padding: 'clamp(4px, 0.8vw, 8px) clamp(8px, 1.5vw, 16px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#ff9100';
                e.target.style.color = '#ff9100';
                e.target.style.background = 'rgba(255,145,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#2a3444';
                e.target.style.color = '#8892a8';
                e.target.style.background = 'transparent';
              }}
            >
              {isSearching ? '⏳' : 'Cari'}
            </Button>
          </Form>

          {/* ===== RIGHT - User Avatar (Sync dengan Profile) ===== */}
          <div 
            style={{ 
              width: 'clamp(28px, 5vw, 40px)', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer'
            }}
            onClick={goToProfile}
            title={user ? "Klik untuk ke Profil" : "Klik untuk Login"}
          >
            {user ? (
              userAvatar ? (
                <Image
                  src={userAvatar}
                  roundedCircle
                  style={{
                    width: 'clamp(28px, 4vw, 32px)',
                    height: 'clamp(28px, 4vw, 32px)',
                    objectFit: 'cover',
                    border: '2px solid #ff9100',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(255,145,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                  onError={(e) => {
                    // Jika gambar gagal load, gunakan fallback
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    // Tampilkan fallback
                    const parent = e.target.parentElement;
                    const fallback = document.createElement('div');
                    fallback.style.cssText = `
                      width: clamp(28px, 4vw, 32px);
                      height: clamp(28px, 4vw, 32px);
                      border-radius: 50%;
                      background: linear-gradient(135deg, #ff9100, #ff6b00);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: #fff;
                      font-size: clamp(11px, 1.5vw, 14px);
                      font-weight: bold;
                      transition: all 0.3s ease;
                    `;
                    fallback.textContent = (userName || 'U').charAt(0).toUpperCase();
                    parent.appendChild(fallback);
                  }}
                />
              ) : (
                <div 
                  style={{
                    width: 'clamp(28px, 4vw, 32px)',
                    height: 'clamp(28px, 4vw, 32px)',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff9100, #ff6b00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 'clamp(11px, 1.5vw, 14px)',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(255,145,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {(userName || 'U').charAt(0).toUpperCase()}
                </div>
              )
            ) : (
              // Jika belum login, tampilkan ikon login
              <div 
                style={{
                  width: 'clamp(28px, 4vw, 32px)',
                  height: 'clamp(28px, 4vw, 32px)',
                  borderRadius: '50%',
                  background: '#2a3444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8892a8',
                  fontSize: 'clamp(14px, 2vw, 18px)',
                  transition: 'all 0.3s ease',
                  border: '2px solid #2a3444'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#ff9100';
                  e.target.style.color = '#ff9100';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#2a3444';
                  e.target.style.color = '#8892a8';
                }}
              >
                🔑
              </div>
            )}
          </div>
        </Container>
      </Navbar>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes slideTagline {
            0% {
              opacity: 0;
              transform: translateY(-6px);
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
              transform: translateY(6px);
            }
          }

          @keyframes marqueeName {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }

          .animate-pulse {
            animation: pulse 2s ease-in-out infinite;
          }

          ::-webkit-scrollbar {
            width: 6px;
          }

          ::-webkit-scrollbar-track {
            background: #0b0e14;
          }

          ::-webkit-scrollbar-thumb {
            background: #2a3444;
            border-radius: 3px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: #3a4454;
          }

          .d-none.d-md-block::-webkit-scrollbar {
            width: 4px;
          }

          .d-none.d-md-block::-webkit-scrollbar-track {
            background: #141a24;
          }

          .d-none.d-md-block::-webkit-scrollbar-thumb {
            background: #2a3444;
            border-radius: 2px;
          }

          .d-none.d-md-block::-webkit-scrollbar-thumb:hover {
            background: #3a4454;
          }

          /* Mobile Responsive */
          @media (max-width: 576px) {
            .navbar {
              min-height: 56px !important;
              padding-top: 2px !important;
              padding-bottom: 2px !important;
            }
            
            .navbar .container-fluid {
              padding-left: 4px !important;
              padding-right: 4px !important;
            }
          }

          @media (max-width: 400px) {
            .navbar .container-fluid {
              gap: 2px !important;
            }
          }
        `}
      </style>

      {/* ========== BODY ========== */}
      <div style={{ 
        display: 'flex', 
        marginTop: '60px',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}>
        {/* Sidebar Desktop - Fixed */}
        <div 
          className="d-none d-md-block" 
          style={{ 
            width: '280px', 
            flexShrink: 0,
            height: 'calc(100vh - 60px)',
            position: 'sticky',
            top: '60px',
            overflowY: 'auto',
            borderRight: '1px solid #2a3444',
            background: '#141a24'
          }}
        >
          <Sidebar 
            activeMenu={activeMenu} 
            onMenuChange={onMenuChange} 
            onLogout={handleLogout}
            storeName={storeName}
            storeLogo={storeLogo}
          />
        </div>

        {/* Content - Scrollable */}
        <div style={{ 
          flex: 1, 
          background: '#0b0e14',
          overflowY: 'auto',
          padding: 'clamp(10px, 2vw, 20px)',
          height: 'calc(100vh - 60px)'
        }}>
          {/* Tampilkan hasil pencarian atau children */}
          {showResults && searchResults.length > 0 ? (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <h5 className="text-light fw-bold" style={{ fontSize: 'clamp(14px, 2vw, 20px)' }}>
                    🔍 Hasil Pencarian: "{searchQuery}"
                  </h5>
                  <p className="text-muted small" style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}>
                    Ditemukan {searchResults.length} produk
                  </p>
                </div>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={clearSearch}
                  style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}
                >
                  ✕ Tutup
                </Button>
              </div>
              {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child, { 
                    searchResults: searchResults,
                    isSearching: true,
                    searchQuery: searchQuery
                  });
                }
                return child;
              })}
            </div>
          ) : showResults && searchResults.length === 0 && searchQuery ? (
            <div className="text-center py-5">
              <Search size={40} className="text-muted mb-3" />
              <h5 className="text-light" style={{ fontSize: 'clamp(14px, 2vw, 20px)' }}>
                Tidak ada produk ditemukan
              </h5>
              <p className="text-muted" style={{ fontSize: 'clamp(12px, 1.5vw, 16px)' }}>
                Pencarian untuk "<strong>{searchQuery}</strong>" tidak menghasilkan produk.
                <br />
                Coba kata kunci lain atau reset pencarian.
              </p>
              <Button 
                variant="outline-warning" 
                size="sm"
                onClick={clearSearch}
              >
                Reset Pencarian
              </Button>
            </div>
          ) : (
            children
          )}
        </div>
      </div>

      {/* ========== MOBILE SIDEBAR (Offcanvas) ========== */}
      <Offcanvas 
        show={showMobileSidebar} 
        onHide={() => setShowMobileSidebar(false)}
        placement="start"
        style={{ background: '#141a24', width: '280px' }}
      >
        <Offcanvas.Header 
          closeButton 
          closeVariant="white"
          style={{
            borderBottom: '1px solid #2a3444',
            padding: '12px 16px'
          }}
        >
          <Offcanvas.Title 
            style={{ 
              color: '#ff9100',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px'
            }}
          >
            {storeLogo ? (
              <Image 
                src={storeLogo} 
                style={{ 
                  height: '28px', 
                  width: 'auto', 
                  objectFit: 'contain'
                }} 
              />
            ) : (
              <span style={{ fontSize: '24px' }}>🛒</span>
            )}
            <span style={{ fontWeight: 'bold' }}>{storeName}</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <Sidebar 
            activeMenu={activeMenu} 
            onMenuChange={(menu) => {
              onMenuChange(menu);
              setShowMobileSidebar(false);
            }}
            onLogout={handleLogout}
            storeName={storeName}
            storeLogo={storeLogo}
          />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
};

export default Layout;