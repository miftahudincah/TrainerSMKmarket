import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);

  // === FORCE DEVELOPER ===
  const FORCE_DEVELOPER_EMAILS = [
    'zaki5go@gmail.com',
    'zaki5go2@gmail.com',
    'zaki9go@gmail.com'
  ];

  // === CART FUNCTIONS ===
  const loadCart = async (userId) => {
    if (!userId) {
      setCart([]);
      return;
    }

    setCartLoading(true);
    try {
      const { data, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading cart:', error);
        // Fallback ke localStorage
        const saved = localStorage.getItem('cart');
        if (saved) {
          try {
            setCart(JSON.parse(saved));
          } catch (e) {
            setCart([]);
          }
        }
        return;
      }

      if (data) {
        setCart(data.items || []);
      } else {
        // Buat cart baru jika belum ada
        const { error: insertError } = await supabase
          .from('carts')
          .insert([{ user_id: userId, items: [] }]);

        if (insertError) {
          console.error('Error creating cart:', insertError);
          setCart([]);
        } else {
          setCart([]);
        }
      }
    } catch (err) {
      console.error('Error in loadCart:', err);
      // Fallback ke localStorage
      const saved = localStorage.getItem('cart');
      if (saved) {
        try {
          setCart(JSON.parse(saved));
        } catch (e) {
          setCart([]);
        }
      }
    } finally {
      setCartLoading(false);
    }
  };

  const saveCart = async (userId, items) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('carts')
        .update({ 
          items: items, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error saving cart:', error);
        // Fallback ke localStorage
        localStorage.setItem('cart', JSON.stringify(items));
        setCart(items);
        return;
      }

      setCart(items);
      // Trigger event untuk component lain
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Error in saveCart:', err);
      localStorage.setItem('cart', JSON.stringify(items));
      setCart(items);
    }
  };

  const clearCart = async (userId) => {
    if (!userId) return;
    await saveCart(userId, []);
  };

  const getUserRole = async (firebaseUser) => {
    if (!firebaseUser) return null;

    const email = firebaseUser.email;
    console.log('🔍 Getting role for:', email);
    
    const isForceDeveloper = FORCE_DEVELOPER_EMAILS.includes(email);
    console.log('📧 Force developer?', isForceDeveloper);

    try {
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      console.log('📊 Supabase data:', data);
      console.log('❌ Supabase error:', error);

      if (error || !data) {
        console.log('⚠️ User not found, creating with force role...');
        
        const role = isForceDeveloper ? 'developer' : 'user';
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            { 
              email: email, 
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || email?.split('@')[0],
              role: role,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .maybeSingle();

        console.log('✅ New user created with role:', role);
        console.log('📊 New user:', newUser);

        if (insertError) {
          console.error('Error creating user:', insertError);
          return isForceDeveloper ? 'developer' : 'user';
        }
        return newUser?.role || role;
      }

      let currentRole = data.role;
      console.log('📊 Current role in DB:', currentRole);

      if (isForceDeveloper && currentRole !== 'developer') {
        console.log('🔄 FORCE UPDATE: Changing role to developer...');
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            role: 'developer',
            name: 'Zaki Developer',
            uid: firebaseUser.uid,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
          .select()
          .maybeSingle();

        console.log('✅ Updated user:', updatedUser);
        console.log('❌ Update error:', updateError);

        if (updateError) {
          console.error('Error updating user:', updateError);
          return 'developer';
        }
        return updatedUser?.role || 'developer';
      }

      if (isForceDeveloper) {
        return 'developer';
      }

      return currentRole;

    } catch (err) {
      console.error('❌ Error in getUserRole:', err);
      if (FORCE_DEVELOPER_EMAILS.includes(email)) {
        return 'developer';
      }
      return 'user';
    }
  };

  // === LISTENER UNTUK CART UPDATE ===
  useEffect(() => {
    const handleCartUpdate = () => {
      if (user) {
        console.log('🔄 Cart updated event received, reloading cart...');
        loadCart(user.uid);
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [user]);

  // === AUTH STATE CHANGE ===
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser?.email || 'No user');
      setLoading(true);

      if (firebaseUser) {
        const role = await getUserRole(firebaseUser);
        console.log('🎯 FINAL ROLE:', role);
        setUser(firebaseUser);
        setUserRole(role);
        
        // Load cart setelah user login
        await loadCart(firebaseUser.uid);
      } else {
        setUser(null);
        setUserRole(null);
        setCart([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userRole,
    loading,
    cart,
    cartLoading,
    isAuthenticated: !!user,
    isDeveloper: userRole === 'developer',
    isOwner: userRole === 'owner',
    isUser: userRole === 'user',
    hasRole: (roles) => {
      if (!userRole) return false;
      return roles.includes(userRole);
    },
    refreshRole: async () => {
      if (auth.currentUser) {
        const role = await getUserRole(auth.currentUser);
        setUserRole(role);
        return role;
      }
      return null;
    },
    // Cart functions
    loadCart: async () => {
      if (user) {
        await loadCart(user.uid);
      }
    },
    saveCart: async (items) => {
      if (user) {
        await saveCart(user.uid, items);
      }
    },
    clearCart: async () => {
      if (user) {
        await clearCart(user.uid);
      }
    },
    getCartTotal: () => {
      return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    getCartItems: () => {
      return cart.reduce((total, item) => total + item.quantity, 0);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};