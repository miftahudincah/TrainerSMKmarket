import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zssqpqeatzechlodngom.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzc3FwcWVhdHplY2hsb2RuZ29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTE4NTQsImV4cCI6MjA5ODgyNzg1NH0.Kwt256rqae9OeR4HdfBjpu9RSIIz83-iOosYwL6qDTE';
const bucketName = process.env.REACT_APP_SUPABASE_BUCKET || 'images';

// Inisialisasi Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export bucket name
export const BUCKET = bucketName;

// Function untuk mendapatkan public URL
export const getPublicUrl = (filename) => {
  if (!filename) return null;
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filename}`;
};

// Function untuk upload file ke bucket
export const uploadFile = async (file, folder = '') => {
  if (!file) throw new Error('File tidak ditemukan!');
  
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const filePath = folder ? `${folder}/${timestamp}_${sanitizedName}` : `${timestamp}_${sanitizedName}`;
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
    
  if (error) throw error;
  return data;
};

// Function untuk delete file dari bucket
export const deleteFile = async (filename) => {
  if (!filename) throw new Error('Filename tidak ditemukan!');
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove([filename]);
    
  if (error) throw error;
  return data;
};

// Function untuk list file di bucket
export const listFiles = async (folder = '') => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(folder);
    
  if (error) throw error;
  return data || [];
};

// Function untuk download file
export const downloadFile = async (filename) => {
  if (!filename) throw new Error('Filename tidak ditemukan!');
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(filename);
    
  if (error) throw error;
  return data;
};

// Function untuk update file (re-upload)
export const updateFile = async (oldFilename, newFile) => {
  if (!oldFilename) throw new Error('Old filename tidak ditemukan!');
  if (!newFile) throw new Error('New file tidak ditemukan!');
  
  // Delete old file
  await deleteFile(oldFilename);
  
  // Upload new file
  return await uploadFile(newFile);
};

// Function untuk generate signed URL (untuk private bucket)
export const getSignedUrl = async (filename, expiresIn = 60) => {
  if (!filename) throw new Error('Filename tidak ditemukan!');
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filename, expiresIn);
    
  if (error) throw error;
  return data?.signedUrl || null;
};

// Function untuk check file exist
export const fileExists = async (filename) => {
  if (!filename) return false;
  
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', { search: filename });
      
    if (error) throw error;
    return data && data.length > 0;
  } catch {
    return false;
  }
};

// Function untuk get file info
export const getFileInfo = async (filename) => {
  if (!filename) throw new Error('Filename tidak ditemukan!');
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list('', { search: filename });
    
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
};

// Helper untuk extract filename dari public URL
export const extractFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
};

// Helper untuk cek apakah file adalah image
export const isImageFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
};

// Helper untuk cek tipe file
export const getFileType = (filename) => {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop().toLowerCase();
  
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoTypes = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const audioTypes = ['mp3', 'wav', 'ogg', 'flac'];
  const documentTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
  
  if (imageTypes.includes(ext)) return 'image';
  if (videoTypes.includes(ext)) return 'video';
  if (audioTypes.includes(ext)) return 'audio';
  if (documentTypes.includes(ext)) return 'document';
  return 'other';
};

// Export default untuk kemudahan import
export default {
  supabase,
  BUCKET: bucketName,
  getPublicUrl,
  uploadFile,
  deleteFile,
  listFiles,
  downloadFile,
  updateFile,
  getSignedUrl,
  fileExists,
  getFileInfo,
  extractFilenameFromUrl,
  isImageFile,
  getFileType
};