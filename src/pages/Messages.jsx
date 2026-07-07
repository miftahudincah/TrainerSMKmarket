import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, 
  Image, Spinner, Form, Alert
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import Toast from '../components/Toast';
import { 
  MessageCircle, 
  Send, 
  Store,
  Check,
  ChevronLeft,
  Search,
  Package
} from 'lucide-react';

const Messages = ({ onMenuChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [autoChatData, setAutoChatData] = useState(null);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [autoChatProcessed, setAutoChatProcessed] = useState(false);
  const [isProcessingAutoChat, setIsProcessingAutoChat] = useState(false);
  const messagesEndRef = useRef(null);
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);
  const isAutoScrollEnabled = useRef(true);
  const chatDataCheckInterval = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 5000);
  };

  // Format date
  const formatDate = (date) => {
    const now = new Date();
    const msgDate = new Date(date);
    const diff = now - msgDate;
    
    if (diff < 60000) return 'Baru saja';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' hari lalu';
    return msgDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // === CEK CHAT DARI PRODUCT DETAIL ===
  useEffect(() => {
    const chatData = localStorage.getItem('chatSeller');
    if (chatData) {
      try {
        const data = JSON.parse(chatData);
        console.log('💬 Chat data from localStorage on mount:', data);
        setAutoChatData(data);
        localStorage.removeItem('chatSeller');
        setAutoChatProcessed(false);
      } catch (e) {
        console.error('Error parsing chat data:', e);
      }
    }
  }, []);

  // === INTERVAL UNTUK MENDETEKSI CHAT DATA BARU ===
  useEffect(() => {
    // Cek localStorage setiap 300ms untuk menangkap data chat dari komponen lain
    chatDataCheckInterval.current = setInterval(() => {
      const chatData = localStorage.getItem('chatSeller');
      if (chatData && !autoChatProcessed && !isProcessingAutoChat) {
        try {
          const data = JSON.parse(chatData);
          console.log('💬 New chat data detected via interval:', data);
          setAutoChatData(data);
          localStorage.removeItem('chatSeller');
          setAutoChatProcessed(false);
        } catch (e) {
          console.error('Error parsing chat data:', e);
        }
      }
    }, 300);
    
    return () => {
      if (chatDataCheckInterval.current) {
        clearInterval(chatDataCheckInterval.current);
      }
    };
  }, [autoChatProcessed, isProcessingAutoChat]);

  // Load conversations - ONLY ONCE on mount
  useEffect(() => {
    if (user && !selectedConversation) {
      loadConversations();
    }
  }, [user]);

  // === AUTO OPEN CHAT - FIXED ===
  useEffect(() => {
    if (autoChatData && conversations.length >= 0 && !autoChatProcessed && !selectedConversation && !isProcessingAutoChat) {
      console.log('🔄 Auto opening chat with:', autoChatData.sellerEmail);
      setIsProcessingAutoChat(true);
      setAutoChatProcessed(true);
      
      const found = conversations.find(c => c.partnerEmail === autoChatData.sellerEmail);
      
      if (found) {
        console.log('✅ Found existing conversation:', found);
        setSelectedConversation(found);
        loadMessages(found);
      } else {
        console.log('🆕 Creating new conversation');
        const newConv = {
          partnerId: autoChatData.sellerId || 'unknown',
          partnerEmail: autoChatData.sellerEmail,
          lastMessage: 'Mulai chat tentang produk...',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          productName: autoChatData.productName,
          productImage: autoChatData.productImage,
          isNewChat: true
        };
        
        setSelectedConversation(newConv);
        setMessages([]);
        setLoading(false);
        
        // Kirim pesan otomatis setelah delay
        setTimeout(() => {
          const productName = autoChatData.productName || 'produk';
          const autoMessage = `Halo, saya tertarik dengan "${productName}". Apakah masih tersedia?`;
          setNewMessage(autoMessage);
          
          // Kirim pesan setelah state update
          setTimeout(() => {
            if (!isAutoSending && isMounted.current && selectedConversation) {
              sendMessageDirect(autoMessage, autoChatData);
            }
            setIsProcessingAutoChat(false);
          }, 500);
        }, 500);
      }
      
      // Clear autoChatData setelah diproses
      setAutoChatData(null);
    }
  }, [conversations, autoChatData, autoChatProcessed, selectedConversation, isProcessingAutoChat]);

  // === TAMBAHAN: Auto focus ke input chat saat selectedConversation berubah ===
  useEffect(() => {
    if (selectedConversation) {
      isAutoScrollEnabled.current = true;
      setTimeout(() => {
        const textarea = document.querySelector('textarea[placeholder*="pesan"]');
        if (textarea) {
          textarea.focus();
        }
      }, 400);
    }
  }, [selectedConversation]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.partnerId !== 'unknown' && !selectedConversation.isNewChat) {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        loadMessages(selectedConversation);
      } else {
        loadMessages(selectedConversation);
      }
    }
  }, [selectedConversation?.partnerId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0 && isAutoScrollEnabled.current) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [messages.length]);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (chatDataCheckInterval.current) {
        clearInterval(chatDataCheckInterval.current);
      }
    };
  }, []);

  // Real-time subscription untuk pesan baru
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.uid}`
        },
        (payload) => {
          console.log('📩 New message received:', payload);
          
          if (payload.new && payload.new.sender_id !== user.uid) {
            if (selectedConversation && payload.new.sender_id === selectedConversation.partnerId) {
              setMessages(prev => [...prev, payload.new]);
              isAutoScrollEnabled.current = true;
              setTimeout(() => {
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }, 200);
            } else {
              loadConversations();
              showToast('📩 Pesan baru diterima!', 'info');
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, selectedConversation]);

  const loadConversations = async () => {
    if (!user || !isMounted.current) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.uid},receiver_id.eq.${user.uid}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversationsMap = {};
      data.forEach(msg => {
        const partnerId = msg.sender_id === user.uid ? msg.receiver_id : msg.sender_id;
        const partnerEmail = msg.sender_id === user.uid ? msg.receiver_email : msg.sender_email;
        const key = partnerId;

        if (!conversationsMap[key]) {
          conversationsMap[key] = {
            partnerId: partnerId,
            partnerEmail: partnerEmail,
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            unreadCount: msg.receiver_id === user.uid && !msg.is_read ? 1 : 0,
            messages: []
          };
        } else {
          if (msg.receiver_id === user.uid && !msg.is_read) {
            conversationsMap[key].unreadCount += 1;
          }
        }
      });

      const conversations = Object.values(conversationsMap)
        .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

      if (isMounted.current) {
        setConversations(conversations);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      if (isMounted.current) {
        showToast('Gagal load percakapan: ' + err.message, 'error');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const loadMessages = async (conversation) => {
    if (!conversation || conversation.partnerId === 'unknown' || conversation.isNewChat || !isMounted.current) {
      setLoadingMessages(false);
      return;
    }

    isAutoScrollEnabled.current = false;
    setLoadingMessages(true);
    
    try {
      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', conversation.partnerId)
        .eq('receiver_id', user.uid)
        .eq('is_read', false);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.uid},receiver_id.eq.${conversation.partnerId}),` +
          `and(sender_id.eq.${conversation.partnerId},receiver_id.eq.${user.uid})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (isMounted.current) {
        setMessages(data || []);
        setSelectedConversation(prev => ({
          ...(prev || conversation),
          unreadCount: 0,
          isNewChat: false
        }));
        
        setTimeout(() => {
          isAutoScrollEnabled.current = true;
          if (messagesEndRef.current && data && data.length > 0) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      if (isMounted.current) {
        showToast('Gagal load pesan: ' + err.message, 'error');
      }
    } finally {
      if (isMounted.current) {
        setLoadingMessages(false);
      }
    }
  };

  // === SEND MESSAGE DIRECT (untuk auto chat) ===
  const sendMessageDirect = async (message, chatData) => {
    if (!message.trim() || !selectedConversation || isAutoSending || !isMounted.current) return;

    setIsAutoSending(true);
    setSending(true);
    
    try {
      let receiverId = selectedConversation.partnerId;
      const receiverEmail = selectedConversation.partnerEmail || chatData?.sellerEmail;

      if (receiverId === 'unknown' || !receiverId) {
        const { data: userData } = await supabase
          .from('users')
          .select('uid')
          .eq('email', receiverEmail)
          .maybeSingle();
        
        if (userData) {
          receiverId = userData.uid;
          setSelectedConversation(prev => ({
            ...prev,
            partnerId: receiverId,
            isNewChat: false
          }));
        } else {
          showToast('❌ Penjual tidak ditemukan!', 'error');
          setIsAutoSending(false);
          setSending(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.uid,
            sender_email: user.email,
            receiver_id: receiverId,
            receiver_email: receiverEmail,
            message: message.trim(),
            is_read: false,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      setNewMessage('');
      
      if (data && data.length > 0 && isMounted.current) {
        setMessages(prev => [...prev, data[0]]);
        isAutoScrollEnabled.current = true;
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 200);
      }

      if (isMounted.current) {
        setSelectedConversation(prev => ({
          ...prev,
          partnerId: receiverId,
          lastMessage: message.trim(),
          lastMessageTime: new Date().toISOString(),
          isNewChat: false
        }));
      }

      // Update conversations tanpa reload
      if (isMounted.current) {
        setConversations(prev => {
          const existing = prev.find(c => c.partnerId === receiverId);
          if (existing) {
            return prev.map(c => 
              c.partnerId === receiverId 
                ? { ...c, lastMessage: message.trim(), lastMessageTime: new Date().toISOString() }
                : c
            );
          }
          return [
            {
              partnerId: receiverId,
              partnerEmail: receiverEmail,
              lastMessage: message.trim(),
              lastMessageTime: new Date().toISOString(),
              unreadCount: 0,
              productName: chatData?.productName
            },
            ...prev
          ];
        });
      }

      showToast('💬 Pesan terkirim!', 'success');

    } catch (err) {
      console.error('Error sending message:', err);
      if (isMounted.current) {
        showToast('❌ Gagal kirim pesan: ' + err.message, 'error');
      }
    } finally {
      if (isMounted.current) {
        setIsAutoSending(false);
        setSending(false);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending || !isMounted.current) return;

    setSending(true);
    try {
      let receiverId = selectedConversation.partnerId;
      const receiverEmail = selectedConversation.partnerEmail;

      if (receiverId === 'unknown') {
        const { data: userData } = await supabase
          .from('users')
          .select('uid')
          .eq('email', receiverEmail)
          .maybeSingle();
        
        if (userData) {
          receiverId = userData.uid;
          setSelectedConversation(prev => ({
            ...prev,
            partnerId: receiverId,
            isNewChat: false
          }));
        } else {
          showToast('❌ Penjual tidak ditemukan!', 'error');
          setSending(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.uid,
            sender_email: user.email,
            receiver_id: receiverId,
            receiver_email: receiverEmail,
            message: newMessage.trim(),
            is_read: false,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      const sentMessage = newMessage.trim();
      setNewMessage('');
      
      if (data && data.length > 0 && isMounted.current) {
        setMessages(prev => [...prev, data[0]]);
        isAutoScrollEnabled.current = true;
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 200);
      }

      if (isMounted.current) {
        setSelectedConversation(prev => ({
          ...prev,
          partnerId: receiverId,
          lastMessage: sentMessage,
          lastMessageTime: new Date().toISOString(),
          isNewChat: false
        }));
      }

    } catch (err) {
      console.error('Error sending message:', err);
      if (isMounted.current) {
        showToast('❌ Gagal kirim pesan: ' + err.message, 'error');
      }
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const goToProducts = () => {
    if (onMenuChange) {
      onMenuChange('products');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.partnerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // === CHAT DETAIL VIEW ===
  if (selectedConversation) {
    const isNewChat = selectedConversation.isNewChat;
    const productName = selectedConversation.productName || 'produk';
    
    return (
      <Container fluid className="px-0 px-sm-3 px-md-4 py-3" style={{ height: 'calc(100vh - 120px)' }}>
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
        
        <Card className="border-0 shadow mb-2" style={{ background: '#141a24', borderRadius: '12px' }}>
          <Card.Body className="p-2 p-sm-3">
            <div className="d-flex align-items-center gap-2">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => {
                  setSelectedConversation(null);
                  setMessages([]);
                  isInitialLoad.current = true;
                  isAutoScrollEnabled.current = true;
                  loadConversations();
                }}
              >
                <ChevronLeft size={18} />
              </Button>
              <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                <Store size={18} className="text-light" />
              </div>
              <div className="flex-grow-1">
                <div className="text-light fw-bold small">
                  {selectedConversation.partnerEmail?.split('@')[0] || 'Penjual'}
                </div>
                <div className="text-muted small">
                  {isNewChat && <Badge bg="warning" className="me-1">Chat Baru</Badge>}
                  {selectedConversation.unreadCount > 0 && (
                    <Badge bg="danger">{selectedConversation.unreadCount} baru</Badge>
                  )}
                  {selectedConversation.productName && (
                    <span className="text-muted small ms-1">• {selectedConversation.productName}</span>
                  )}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="border-0 shadow flex-grow-1" style={{ 
          background: '#141a24', 
          borderRadius: '12px',
          height: 'calc(100% - 100px)',
          overflow: 'hidden'
        }}>
          <Card.Body className="p-3" style={{ overflowY: 'auto', height: '100%' }}>
            {loadingMessages ? (
              <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" variant="warning" size="sm" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-5">
                <MessageCircle size={48} className="text-muted mb-3" />
                <p className="text-light">Belum ada pesan</p>
                <p className="text-muted small">Kirim pesan pertama Anda</p>
                {isNewChat && (
                  <Alert variant="info" className="mt-3 bg-dark border-warning">
                    <Package size={16} className="me-2 text-warning" />
                    Anda sedang chat tentang <strong className="text-warning">"{productName}"</strong>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {messages.map((msg, idx) => {
                  const isMine = msg.sender_id === user.uid;
                  const showDate = idx === 0 || 
                    new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString();

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-2">
                          <small className="text-muted" style={{ fontSize: '10px' }}>
                            {new Date(msg.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </small>
                        </div>
                      )}
                      <div className={`d-flex ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                        <div 
                          className={`p-2 rounded-3 ${isMine ? 'bg-warning text-dark' : 'bg-secondary text-light'}`}
                          style={{ maxWidth: '80%', wordWrap: 'break-word' }}
                        >
                          <div style={{ fontSize: '14px' }}>{msg.message}</div>
                          <div className={`small mt-1 ${isMine ? 'text-dark-50' : 'text-muted'}`} style={{ fontSize: '10px' }}>
                            {formatDate(msg.created_at)}
                            {isMine && msg.is_read && <Check size={12} className="ms-1" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </Card.Body>
        </Card>

        {/* === FORM CHAT - ALWAYS VISIBLE === */}
        <div className="mt-2">
          <Form.Group className="d-flex gap-2">
            <Form.Control
              as="textarea"
              rows={1}
              placeholder={isNewChat ? "Tulis pesan pertama Anda..." : "Ketik pesan..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-dark text-light border-secondary flex-grow-1"
              style={{ borderRadius: '20px', resize: 'none', height: '45px' }}
              disabled={sending}
              autoFocus={!!selectedConversation}
            />
            <Button 
              variant="warning" 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-3"
              style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0 }}
            >
              {sending ? <Spinner animation="border" size="sm" /> : <Send size={18} />}
            </Button>
          </Form.Group>
          {isNewChat && (
            <div className="text-muted small mt-1 ms-2">
              💡 Kirim pesan pertama untuk memulai chat
            </div>
          )}
        </div>
      </Container>
    );
  }

  // === MAIN INBOX VIEW ===
  return (
    <Container fluid className="px-2 px-sm-3 px-md-4 py-3">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="text-light fw-bold mb-0" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)' }}>
            💬 Pesan
          </h4>
          <p className="text-muted small mb-0">
            {conversations.reduce((total, conv) => total + conv.unreadCount, 0)} pesan belum dibaca
          </p>
        </div>
        <Button variant="outline-light" size="sm" onClick={loadConversations}>
          ⟳ Refresh
        </Button>
      </div>

      <Form.Group className="mb-3">
        <div className="position-relative">
          <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <Form.Control
            type="text"
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-dark text-light border-secondary"
            style={{ paddingLeft: '40px', borderRadius: '12px' }}
          />
        </div>
      </Form.Group>

      {filteredConversations.length === 0 ? (
        <Card className="border-0 shadow text-center py-4 py-sm-5" style={{ background: '#141a24', borderRadius: '16px' }}>
          <Card.Body>
            <div style={{ fontSize: 'clamp(48px, 10vw, 80px)' }}>💬</div>
            <h4 className="text-light mt-3">
              {searchQuery ? 'Tidak ada percakapan' : 'Belum Ada Pesan'}
            </h4>
            <p className="text-muted small">
              {searchQuery ? 'Coba cari dengan kata kunci lain' : 'Mulai percakapan dengan mengklik Chat di produk'}
            </p>
            {!searchQuery && (
              <Button variant="warning" className="mt-2" onClick={goToProducts} size="sm">
                <Package size={16} className="me-2" />
                Lihat Produk
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-2">
          {filteredConversations.map((conv) => (
            <Card 
              key={conv.partnerId}
              className="border-0 shadow cursor-pointer"
              style={{ 
                background: '#141a24', 
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                borderLeft: conv.unreadCount > 0 ? '4px solid #ff9100' : '4px solid transparent'
              }}
              onClick={() => {
                setSelectedConversation(conv);
                setMessages([]);
                isInitialLoad.current = true;
                isAutoScrollEnabled.current = false;
                if (conv.partnerId !== 'unknown') {
                  loadMessages(conv);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 145, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Card.Body className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '48px', height: '48px' }}>
                    <Store size={24} className="text-light" />
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-light fw-bold text-truncate">
                        {conv.partnerEmail?.split('@')[0] || 'Penjual'}
                      </div>
                      <div className="text-muted small flex-shrink-0" style={{ fontSize: '10px' }}>
                        {formatDate(conv.lastMessageTime)}
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-muted small text-truncate" style={{ maxWidth: '70%' }}>
                        {conv.lastMessage}
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge bg="danger" className="flex-shrink-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      <style>
        {`
          .cursor-pointer { cursor: pointer; }
          .text-dark-50 { color: rgba(0, 0, 0, 0.5) !important; }
        `}
      </style>
    </Container>
  );
};

export default Messages;