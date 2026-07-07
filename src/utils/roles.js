export const ROLES = {
  USER: 'user',
  OWNER: 'owner',
  DEVELOPER: 'developer'
};

export const ROLE_LABELS = {
  [ROLES.USER]: '👤 User',
  [ROLES.OWNER]: '👑 Owner',
  [ROLES.DEVELOPER]: '💻 Developer'
};

// List email developer
export const DEVELOPER_EMAILS = [
  'zaki5go@gmail.com',
  'zaki5go2@gmail.com',
  'zaki9go@gmail.com',
  'admin@email.com'
];

// List email owner
export const OWNER_EMAILS = [
  'admin@email.com',
  'owner@email.com'
];

export const isDeveloperEmail = (email) => {
  return DEVELOPER_EMAILS.includes(email);
};

export const isOwnerEmail = (email) => {
  return OWNER_EMAILS.includes(email);
};

export const getRoleByEmail = (email) => {
  if (DEVELOPER_EMAILS.includes(email)) return ROLES.DEVELOPER;
  if (OWNER_EMAILS.includes(email)) return ROLES.OWNER;
  return ROLES.USER;
};

export const ROLE_PERMISSIONS = {
  [ROLES.USER]: {
    canViewDashboard: true,
    canViewProducts: true,
    canViewCart: true,
    canViewOrders: true,
    canViewProfile: true,
    canEditProfile: true,
    canCreateOrder: true,
    canCancelOrder: true,
    canUploadImage: false,
    canManageProducts: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canAccessAdminPanel: false,
    canAccessDeveloperTools: false,
    canDeleteImages: false,
    canViewSettings: false,
    canCheckout: true,
    canAddToCart: true,
    canManageOrders: false,
    canViewMessages: true,
    canSendMessages: true,
    canManageMessages: false,
    canDeleteMessages: false
  },
  [ROLES.OWNER]: {
    canViewDashboard: true,
    canViewProducts: true,
    canViewCart: false,
    canViewOrders: true,
    canViewProfile: true,
    canEditProfile: true,
    canCreateOrder: false,
    canCancelOrder: false,
    canUploadImage: true,
    canManageProducts: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canAccessAdminPanel: true,
    canAccessDeveloperTools: false,
    canDeleteImages: true,
    canViewSettings: false,
    canCheckout: false,
    canAddToCart: false,
    canManageOrders: true,
    canViewMessages: true,
    canSendMessages: true,
    canManageMessages: true,
    canDeleteMessages: true
  },
  [ROLES.DEVELOPER]: {
    canViewDashboard: true,
    canViewProducts: true,
    canViewCart: false,
    canViewOrders: true,
    canViewProfile: true,
    canEditProfile: true,
    canCreateOrder: false,
    canCancelOrder: false,
    canUploadImage: true,
    canManageProducts: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canAccessAdminPanel: true,
    canAccessDeveloperTools: true,
    canDeleteImages: true,
    canViewSettings: true,
    canCheckout: false,
    canAddToCart: false,
    canManageOrders: true,
    canViewMessages: true,
    canSendMessages: true,
    canManageMessages: true,
    canDeleteMessages: true
  }
};

export const hasPermission = (userRole, permission) => {
  if (!userRole) return false;
  if (!ROLE_PERMISSIONS[userRole]) return false;
  return ROLE_PERMISSIONS[userRole][permission] || false;
};

// Menu items dengan badge support
export const getMenuItemsByRole = (role, badges = {}) => {
  // Menu untuk Role Developer
  if (role === ROLES.DEVELOPER) {
    return [
      { 
        id: 'dashboard', 
        icon: '📊', 
        label: 'Dashboard',
        badge: badges.dashboard || 0,
        path: '/dashboard'
      },
      { 
        id: 'products', 
        icon: '📦', 
        label: 'Product',
        badge: badges.products || 0,
        path: '/products'
      },
      { 
        id: 'messages', 
        icon: '💬', 
        label: 'Pesan',
        badge: badges.messages || 0,
        path: '/messages'
      },
      { 
        id: 'profile', 
        icon: '👤', 
        label: 'Profil Saya',
        badge: 0,
        path: '/profile'
      },
      { 
        id: 'orders-management', 
        icon: '📋', 
        label: 'Kelola Pesanan',
        badge: badges.ordersManagement || 0,
        path: '/orders-management'
      },
      { 
        id: 'settings', 
        icon: '⚙️', 
        label: 'Settings',
        badge: 0,
        path: '/settings'
      }
    ];
  }

  // Menu untuk Role Owner
  if (role === ROLES.OWNER) {
    return [
      { 
        id: 'dashboard', 
        icon: '📊', 
        label: 'Dashboard',
        badge: badges.dashboard || 0,
        path: '/dashboard'
      },
      { 
        id: 'products', 
        icon: '📦', 
        label: 'Product',
        badge: badges.products || 0,
        path: '/products'
      },
      { 
        id: 'messages', 
        icon: '💬', 
        label: 'Pesan',
        badge: badges.messages || 0,
        path: '/messages'
      },
      { 
        id: 'profile', 
        icon: '👤', 
        label: 'Profil Saya',
        badge: 0,
        path: '/profile'
      },
      { 
        id: 'orders-management', 
        icon: '📋', 
        label: 'Kelola Pesanan',
        badge: badges.ordersManagement || 0,
        path: '/orders-management'
      }
    ];
  }

  // Menu untuk Role User - HAPUS SUBMENU DIBATALKAN
  if (role === ROLES.USER) {
    return [
      { 
        id: 'dashboard', 
        icon: '📊', 
        label: 'Dashboard',
        badge: badges.dashboard || 0,
        path: '/dashboard'
      },
      { 
        id: 'products', 
        icon: '📦', 
        label: 'Product',
        badge: badges.products || 0,
        path: '/products'
      },
      { 
        id: 'cart', 
        icon: '🛒', 
        label: 'Keranjang',
        badge: badges.cart || 0,
        path: '/cart'
      },
      { 
        id: 'orders', 
        icon: '📋', 
        label: 'Pesanan Saya',
        subItems: [
          { 
            id: 'orders-sent', 
            label: '📦 Dikirim', 
            badge: badges.ordersSent || 0,
            path: '/orders/sent'
          },
          { 
            id: 'orders-completed', 
            label: '✅ Selesai', 
            badge: badges.ordersCompleted || 0,
            path: '/orders/completed'
          }
        ],
        badge: badges.orders || 0,
        path: '/orders'
      },
      { 
        id: 'messages', 
        icon: '💬', 
        label: 'Pesan',
        badge: badges.messages || 0,
        path: '/messages'
      },
      { 
        id: 'profile', 
        icon: '👤', 
        label: 'Profil Saya',
        badge: 0,
        path: '/profile'
      }
    ];
  }

  // Default (jika role tidak dikenali)
  return [];
};

// Helper untuk mendapatkan icon berdasarkan menu id
export const getMenuIcon = (menuId) => {
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
  return icons[menuId] || '📄';
};

// Helper untuk mendapatkan label menu
export const getMenuLabel = (menuId) => {
  const labels = {
    'dashboard': 'Dashboard',
    'products': 'Product',
    'cart': 'Keranjang',
    'orders': 'Pesanan Saya',
    'messages': 'Pesan',
    'profile': 'Profil Saya',
    'orders-management': 'Kelola Pesanan',
    'users': 'Kelola User',
    'analytics': 'Analytics',
    'developer': 'Developer Tools',
    'logs': 'System Logs',
    'settings': 'Settings'
  };
  return labels[menuId] || menuId;
};

// Helper untuk mendapatkan path menu
export const getMenuPath = (menuId) => {
  const paths = {
    'dashboard': '/dashboard',
    'products': '/products',
    'cart': '/cart',
    'orders': '/orders',
    'messages': '/messages',
    'profile': '/profile',
    'orders-management': '/orders-management',
    'users': '/users',
    'analytics': '/analytics',
    'developer': '/developer',
    'logs': '/logs',
    'settings': '/settings'
  };
  return paths[menuId] || `/${menuId}`;
};

// Helper untuk cek apakah menu visible untuk role tertentu
export const isMenuVisible = (menuId, role) => {
  const menus = getMenuItemsByRole(role);
  return menus.some(item => item.id === menuId);
};

// Helper untuk get all menu items dengan label
export const getAllMenuItems = () => {
  return [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/dashboard' },
    { id: 'products', icon: '📦', label: 'Product', path: '/products' },
    { id: 'cart', icon: '🛒', label: 'Keranjang', path: '/cart' },
    { 
      id: 'orders', 
      icon: '📋', 
      label: 'Pesanan Saya',
      path: '/orders',
      subItems: [
        { id: 'orders-sent', label: '📦 Dikirim', path: '/orders/sent' },
        { id: 'orders-completed', label: '✅ Selesai', path: '/orders/completed' }
      ]
    },
    { id: 'messages', icon: '💬', label: 'Pesan', path: '/messages' },
    { id: 'profile', icon: '👤', label: 'Profil Saya', path: '/profile' },
    { id: 'orders-management', icon: '📋', label: 'Kelola Pesanan', path: '/orders-management' },
    { id: 'users', icon: '👥', label: 'Kelola User', path: '/users' },
    { id: 'analytics', icon: '📈', label: 'Analytics', path: '/analytics' },
    { id: 'developer', icon: '💻', label: 'Developer Tools', path: '/developer' },
    { id: 'logs', icon: '📋', label: 'System Logs', path: '/logs' },
    { id: 'settings', icon: '⚙️', label: 'Settings', path: '/settings' }
  ];
};

// Helper untuk mendapatkan menu berdasarkan id
export const getMenuById = (menuId) => {
  const allMenus = getAllMenuItems();
  return allMenus.find(item => item.id === menuId);
};

// Helper untuk mendapatkan sub menu berdasarkan id
export const getSubMenuItems = (menuId) => {
  const menu = getMenuById(menuId);
  return menu?.subItems || [];
};

// Helper untuk mengecek apakah menu memiliki sub menu
export const hasSubMenu = (menuId) => {
  const menu = getMenuById(menuId);
  return menu?.subItems && menu.subItems.length > 0;
};

// Helper untuk mendapatkan parent menu dari sub menu
export const getParentMenu = (subMenuId) => {
  const allMenus = getAllMenuItems();
  for (const menu of allMenus) {
    if (menu.subItems) {
      const found = menu.subItems.find(item => item.id === subMenuId);
      if (found) return menu.id;
    }
  }
  return null;
};

// Helper untuk mendapatkan menu admin
export const getAdminMenus = () => {
  return [
    { id: 'orders-management', icon: '📋', label: 'Kelola Pesanan', path: '/orders-management' },
    { id: 'users', icon: '👥', label: 'Kelola User', path: '/users' },
    { id: 'analytics', icon: '📈', label: 'Analytics', path: '/analytics' }
  ];
};

// Helper untuk mendapatkan menu developer only
export const getDeveloperMenus = () => {
  return [
    { id: 'developer', icon: '💻', label: 'Developer Tools', path: '/developer' },
    { id: 'logs', icon: '📋', label: 'System Logs', path: '/logs' },
    { id: 'settings', icon: '⚙️', label: 'Settings', path: '/settings' }
  ];
};

// Helper untuk mendapatkan menu user
export const getUserMenus = () => {
  return [
    { id: 'products', icon: '📦', label: 'Product', path: '/products' },
    { id: 'cart', icon: '🛒', label: 'Keranjang', path: '/cart' },
    { 
      id: 'orders', 
      icon: '📋', 
      label: 'Pesanan Saya',
      path: '/orders',
      subItems: [
        { id: 'orders-sent', label: '📦 Dikirim', path: '/orders/sent' },
        { id: 'orders-completed', label: '✅ Selesai', path: '/orders/completed' }
      ]
    },
    { id: 'messages', icon: '💬', label: 'Pesan', path: '/messages' },
    { id: 'profile', icon: '👤', label: 'Profil Saya', path: '/profile' }
  ];
};

// Helper untuk mendapatkan menu berdasarkan role dengan label
export const getMenusByRole = (role) => {
  return getMenuItemsByRole(role);
};

// Helper untuk mengecek apakah user memiliki akses ke menu
export const hasMenuAccess = (menuId, role) => {
  const menus = getMenuItemsByRole(role);
  return menus.some(item => item.id === menuId);
};

// Helper untuk mendapatkan badge count untuk menu
export const getMenuBadge = (menuId, badges = {}) => {
  return badges[menuId] || 0;
};

// Helper untuk mendapatkan menu dengan badge
export const getMenusWithBadges = (role, badges = {}) => {
  return getMenuItemsByRole(role, badges);
};

// Helper untuk mendapatkan menu dengan path
export const getMenuWithPath = (menuId) => {
  const menu = getMenuById(menuId);
  if (menu) {
    return {
      ...menu,
      path: menu.path || `/${menuId}`
    };
  }
  return null;
};

// Helper untuk mendapatkan sub menu dengan path
export const getSubMenuWithPath = (subMenuId) => {
  const allMenus = getAllMenuItems();
  for (const menu of allMenus) {
    if (menu.subItems) {
      const found = menu.subItems.find(item => item.id === subMenuId);
      if (found) {
        return {
          ...found,
          path: found.path || `/${subMenuId}`
        };
      }
    }
  }
  return null;
};

// Helper untuk mendapatkan semua menu dengan path
export const getAllMenusWithPath = () => {
  const allMenus = getAllMenuItems();
  return allMenus.map(menu => ({
    ...menu,
    path: menu.path || `/${menu.id}`,
    subItems: menu.subItems?.map(sub => ({
      ...sub,
      path: sub.path || `/${sub.id}`
    }))
  }));
};