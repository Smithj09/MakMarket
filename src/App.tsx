import React, { useState, useEffect } from 'react';
import { ShoppingCart, User as UserIcon, LogOut, Package, Plus, Trash2, Edit, Check, X, ChevronRight, ChevronLeft, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, User, Order, CartItem } from './types';
import { supabase } from './supabaseClient';

// API Helper
const api = {
  get: async (url: string, token?: string) => {
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (url: string, data: any, token?: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  put: async (url: string, data: any, token?: string) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  patch: async (url: string, data: any, token?: string) => {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  delete: async (url: string, token?: string) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'shop' | 'admin' | 'orders' | 'auth'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  // Initialize auth and fetch user session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
          if (data) {
            setUser({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'User',
              role: data.role || 'user'
            });
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
    fetchProducts();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const { data, error } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
          if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile } = await supabase.from('user_profiles').insert({
              id: session.user.id,
              role: 'user'
            }).select().single();
            setUser({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'User',
              role: newProfile?.role || 'user'
            });
          } else if (data) {
            setUser({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'User',
              role: data.role || 'user'
            });
          }
        } catch (err) {
          console.error('Profile fetch error:', err);
        }
      } else {
        setUser(null);
        setCart([]);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'orders' && user) {
      const fetchOrders = async () => {
        try {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (token) {
            const orders = await api.get('/api/orders/my', token);
            setUserOrders(orders);
          }
        } catch (err) {
          console.error('Failed to fetch orders:', err);
        }
      };
      fetchOrders();
    }
  }, [view, user]);

  const fetchProducts = async () => {
    try {
      const data = await api.get('/api/products');
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('username') as string;
    const password = formData.get('password') as string;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setView('shop');
    } catch (err: any) {
      alert(err.message || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('username') as string;
    const password = formData.get('password') as string;
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        // Check if this is the first user
        const { count } = await supabase.from('user_profiles').select('*', { count: 'exact' });
        const isFirstUser = count === 0;
        
        // Create user profile, make first user admin
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          role: isFirstUser ? 'admin' : 'user'
        });
      }
      alert('Registration successful! ' + (data.user ? 'You are an admin.' : 'Please check your email to confirm, then login.'));
      setAuthMode('login');
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCart([]);
    setView('shop');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const submitOrder = async () => {
    if (!user) {
      setView('auth');
      return;
    }
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const total_price = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      await api.post('/api/orders', { items: cart, total_price }, token);
      alert("Order placed successfully!");
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      alert("Failed to place order");
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('shop')}>
              <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
              <span className="text-xl font-bold tracking-tight">Adorly Market</span>
            </div>

            <div className="flex items-center gap-4">
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setView(view === 'admin' ? 'shop' : 'admin')}
                  className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors"
                >
                  <Package size={18} />
                  Dashboard
                </button>
              )}
              
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="hidden sm:inline text-sm text-black/60">Hi, {user.username}</span>
                  <button
                    onClick={() => setView('orders')}
                    className="text-gray-600 hover:text-pink-600 transition-colors text-sm hidden sm:inline"
                  >
                    Orders
                  </button>
                  <button onClick={handleLogout} className="text-gray-600 hover:text-red-600 transition-colors">
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setView('auth')} className="text-gray-600 hover:text-pink-600 transition-colors">
                  <UserIcon size={20} />
                </button>
              )}

              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 bg-pink-50 text-pink-700 rounded-full hover:bg-pink-100 transition-colors"
              >
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'shop' && (
          <div className="space-y-8">
            {/* Hero banner */}
            <section className="w-full py-12 bg-gradient-to-r from-pink-400 to-pink-600 text-white text-center rounded-xl">
              <h1 className="text-4xl font-black">Welcome to Pink Adorly Market</h1>
              <p className="mt-2">Shop everything you need in style â€“ pink, white, and black everywhere!</p>
            </section>

            {/* Hero / Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? 'bg-pink-600 text-white shadow-md shadow-pink-200' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredProducts.map(product => (
                <motion.div 
                  layout
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all group cursor-pointer"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100 relative">
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-pink-50/90 backdrop-blur rounded-md text-[8px] font-bold uppercase tracking-wider text-pink-700">
                      {product.category}
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div>
                      <h3 className="font-bold text-sm text-black leading-tight truncate">{product.name}</h3>
                      <p className="text-black/60 text-[10px] line-clamp-1 mt-0.5">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-black text-pink-700">${product.price.toFixed(2)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="p-1.5 bg-black text-white rounded-lg hover:bg-pink-600 transition-colors active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full text-gray-400 mb-4">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-bold text-black">No products found</h3>
                <p className="text-black/60">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}

        {view === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-black mb-4">My Orders</h2>
            {userOrders.length === 0 ? (
              <p className="text-black/60">You haven't placed any orders yet.</p>
            ) : (
              <div className="space-y-4">
                {userOrders.map(o => (
                  <div key={o.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                    <div className="flex justify-between">
                      <span className="font-bold">Order #{o.id}</span>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        o.status === 'Completed' ? 'bg-pink-100 text-pink-700' :
                        o.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-black/60">
                      <span>{new Date(o.created_at).toLocaleDateString()}</span> â€¢ <span>${o.total_price.toFixed(2)}</span>
                    </div>
                    {o.items && o.items.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm">
                        {o.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}Ã— {item.name}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'auth' && (
          <div className="max-w-md mx-auto py-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50"
            >
              <h2 className="text-3xl font-black text-black mb-2">
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-black/60 mb-8">
                {authMode === 'login' ? 'Login to access your shop and orders' : 'Join our market today'}
              </p>
              
              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Email</label>
                  <input 
                    name="username"
                    type="email"
                    placeholder="you@example.com"
                    required 
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Password</label>
                  <input 
                    type="password" 
                    name="password" 
                    required 
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                  />
                </div>
                <button className="w-full py-4 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 shadow-lg shadow-pink-200 transition-all active:scale-[0.98] mt-4">
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>
              </form>
              
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm font-medium text-pink-600 hover:underline"
                >
                  {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {view === 'admin' && user?.role === 'admin' && (
          <AdminDashboard onUpdate={fetchProducts} />
        )}
      </main>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-black">Your Cart</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-300">
                      <ShoppingCart size={40} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">Your cart is empty</h3>
                      <p className="text-black/60">Add some fresh products to get started!</p>
                    </div>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="px-6 py-2 bg-black text-white font-bold rounded-xl hover:bg-pink-600 transition-colors"
                    >
                      Browse Shop
                    </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-black truncate">{item.name}</h4>
                          <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-pink-700 font-bold mt-1">${item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-white"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-white"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-white/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-black/60 font-medium">Subtotal</span>
                    <span className="text-2xl font-black text-black">
                      ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    onClick={submitOrder}
                    className="w-full py-4 bg-pink-600 text-white font-bold rounded-2xl hover:bg-pink-700 shadow-lg shadow-pink-200 transition-all active:scale-[0.98]"
                  >
                    Place Order
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-0 bottom-0 sm:inset-0 sm:m-auto w-full sm:max-w-2xl max-h-screen sm:max-h-[90vh] bg-white z-50 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-white/80 backdrop-blur rounded-full text-black hover:bg-white z-10 shadow-sm focus:outline-none"
              >
                <X size={20} />
              </button>
              
              <div className="w-full sm:w-1/2 h-48 sm:h-auto sm:aspect-auto bg-gray-100">
                <img 
                  src={selectedProduct.image_url} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="w-full sm:w-1/2 p-4 sm:p-8 flex flex-col overflow-y-auto">
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {selectedProduct.category}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-black mt-4 leading-tight">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-sm sm:text-base text-black/60 mt-4 leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-100 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Price</span>
                      <span className="text-3xl font-black text-pink-700">${selectedProduct.price.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-black text-white font-bold rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-gray-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
                <span className="text-xl font-bold tracking-tight">Adorly Market</span>
              </div>
              <p className="text-sm text-black/60 leading-relaxed mb-4">
                Your one-stop shop for all things adorable. We curate the cutest products just for you.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-pink-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-pink-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-pink-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-pink-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-black mb-4 uppercase tracking-wider text-sm">Shop</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">All Products</a></li>
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">New Arrivals</a></li>
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">Best Sellers</a></li>
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">On Sale</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-black mb-4 uppercase tracking-wider text-sm">Customer Service</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">Shipping Policy</a></li>
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">Return Policy</a></li>
                <li><a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-black mb-4 uppercase tracking-wider text-sm">Stay Updated</h3>
              <p className="text-sm text-black/60 mb-4">Subscribe to our newsletter for the latest updates and offers.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                />
                <button className="px-4 py-2 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-black/60 mb-4 md:mb-0">© 2026 Adorly Market. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">Privacy Policy</a>
              <a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">Terms of Service</a>
              <a href="#" className="text-sm text-black/60 hover:text-pink-600 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AdminDashboard({ onUpdate }: { onUpdate: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (tab === 'products') {
        const data = await api.get('/api/products');
        setProducts(data);
      } else {
        if (token) {
          const data = await api.get('/api/orders', token);
          setOrders(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      if (editingProduct?.id) {
        await api.put(`/api/products/${editingProduct.id}`, data, token);
      } else {
        await api.post('/api/products', data, token);
      }
      setEditingProduct(null);
      fetchData();
      onUpdate();
    } catch (err) {
      alert("Failed to save product");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      await api.delete(`/api/products/${id}`, token);
      fetchData();
      onUpdate();
    } catch (err) {
      alert("Failed to delete product");
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      await api.patch(`/api/orders/${id}/status`, { status }, token);
      fetchData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-black">Admin Dashboard</h2>
        <div className="flex bg-white p-1 rounded-xl border border-gray-200">
          <button 
            onClick={() => setTab('products')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'products' ? 'bg-black text-white' : 'text-black/60 hover:text-black'}`}
          >
            Products
          </button>
          <button 
            onClick={() => setTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'orders' ? 'bg-black text-white' : 'text-black/60 hover:text-black'}`}
          >
            Orders
          </button>
        </div>
      </div>

      {tab === 'products' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setEditingProduct({})}
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 shadow-lg shadow-pink-200 transition-all"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/30">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Product</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Category</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Price</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-bold text-black">{p.name}</p>
                          <p className="text-xs text-black/60 truncate max-w-[200px]">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">{p.category}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-black">${p.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingProduct(p)} className="p-2 text-gray-400 hover:text-pink-600 transition-colors">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-200/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Total</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-white/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-black/60">#{o.id}</td>
                  <td className="px-6 py-4 font-bold text-black">{o.username}</td>
                  <td className="px-6 py-4 text-sm text-black/60">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-pink-700">${o.total_price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      o.status === 'Completed' ? 'bg-pink-100 text-pink-700' :
                      o.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select 
                      value={o.status}
                      onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                      className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-pink-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-lg h-fit bg-white z-50 rounded-3xl shadow-2xl p-8"
            >
              <h3 className="text-2xl font-black text-black mb-6">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Name</label>
                    <input name="name" defaultValue={editingProduct.name} required className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Price</label>
                    <input name="price" type="number" step="0.01" defaultValue={editingProduct.price} required className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Category</label>
                    <input name="category" defaultValue={editingProduct.category} required className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Image URL</label>
                    <input name="image_url" defaultValue={editingProduct.image_url} required className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Description</label>
                    <textarea name="description" defaultValue={editingProduct.description} required className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 h-24" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 shadow-lg shadow-pink-200 transition-all">
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-gray-900 to-black text-gray-300 py-16 mt-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-1">
              <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <ShoppingCart className="text-pink-500" size={24} />
                Adorly
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Your trusted marketplace for quality products and seamless shopping experience.
              </p>
            </div>

            {/* Shop */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Shop</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">All Products</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">New Arrivals</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Best Sellers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Sale</a></li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">FAQ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Shipping Info</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Returns</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Terms & Conditions</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Cookie Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-pink-400 transition-colors text-sm">Accessibility</a></li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 my-8"></div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Adorly Market. All rights reserved.
            </p>
            <div className="flex gap-6 mt-6 md:mt-0">
              <a href="#" title="Facebook" className="text-gray-400 hover:text-pink-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" title="Twitter" className="text-gray-400 hover:text-pink-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
              </a>
              <a href="#" title="Instagram" className="text-gray-400 hover:text-pink-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}