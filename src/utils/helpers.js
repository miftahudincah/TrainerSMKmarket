export const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export const validateImage = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  
  if (!validExtensions.includes(ext)) {
    return { valid: false, message: 'Format tidak didukung (JPG/PNG/WEBP/GIF)' };
  }
  
  if (file.size > 5 * 1048576) {
    return { valid: false, message: 'Maksimal 5MB' };
  }
  
  return { valid: true };
};

export const getErrorMessage = (errorCode) => {
  const messages = {
    'auth/user-not-found': 'Email tidak terdaftar!',
    'auth/wrong-password': 'Password salah!',
    'auth/email-already-in-use': 'Email sudah terdaftar!',
    'auth/too-many-requests': 'Terlalu banyak permintaan. Tunggu beberapa menit.',
    'auth/invalid-email': 'Email tidak valid!',
    'auth/weak-password': 'Password minimal 6 karakter!',
    'auth/network-request-failed': 'Koneksi internet bermasalah!'
  };
  
  return messages[errorCode] || 'Terjadi kesalahan. Silakan coba lagi.';
};