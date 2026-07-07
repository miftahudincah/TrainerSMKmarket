import React, { useState, useEffect } from 'react';
import { Navbar as BootstrapNavbar, Container, Nav, Button, Badge } from 'react-bootstrap';
import { ShoppingCart } from 'lucide-react';

const Navbar = ({ user, onLogout, onMenuChange }) => {
  const [cartCount, setCartCount] = useState(0);

  // Get cart count from localStorage
  const getCartCount = () => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        const cart = JSON.parse(saved);
        return cart.reduce((total, item) => total + item.quantity, 0);
      } catch (e) {
        return 0;
      }
    }
    return 0;
  };

  // Update cart count when localStorage changes
  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(getCartCount());
    };

    // Initial load
    updateCartCount();

    // Listen for storage changes (from other tabs)
    window.addEventListener('storage', updateCartCount);

    // Custom event for cart changes within the same tab
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  // Helper function to trigger cart update
  const triggerCartUpdate = () => {
    window.dispatchEvent(new Event('cartUpdated'));
  };

  // Handle menu change with cart update
  const handleMenuChange = (menu) => {
    if (menu === 'cart') {
      triggerCartUpdate();
    }
    if (onMenuChange) {
      onMenuChange(menu);
    }
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" className="mb-4" expand="lg" style={{ borderBottom: '1px solid #2a3444' }}>
      <Container>
        <BootstrapNavbar.Brand 
          href="#" 
          onClick={() => handleMenuChange('dashboard')} 
          style={{ cursor: 'pointer' }}
        >
          <span style={{ color: '#ff9100' }}>🛒</span> Toko App
          <span style={{ fontSize: '12px', color: '#8892a8', marginLeft: '8px' }}>
            Firebase + Supabase
          </span>
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {user && (
              <>
                <Nav.Item className="text-light d-flex align-items-center me-3">
                  👤 {user.email}
                </Nav.Item>
                
                {/* Cart Button with Badge */}
                <Button 
                  variant="outline-light" 
                  size="sm" 
                  className="me-2 position-relative"
                  onClick={() => handleMenuChange('cart')}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderColor: '#2a3444'
                  }}
                >
                  <ShoppingCart size={18} />
                  {cartCount > 0 && (
                    <Badge 
                      bg="danger" 
                      className="position-absolute top-0 start-100 translate-middle rounded-pill"
                      style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px',
                        marginTop: '-4px',
                        marginLeft: '-6px'
                      }}
                    >
                      {cartCount}
                    </Badge>
                  )}
                  <span style={{ fontSize: '12px', marginLeft: '2px' }}>Keranjang</span>
                </Button>

                {/* Logout Button */}
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={onLogout}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🚪 Logout
                </Button>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;