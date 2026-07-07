import { supabase } from './supabase';

// Cache settings
let settingsCache = null;
let settingsCacheTime = 0;
const CACHE_DURATION = 60000; // 1 menit

export const getSettings = async () => {
  // Cek cache
  const now = Date.now();
  if (settingsCache && (now - settingsCacheTime) < CACHE_DURATION) {
    return settingsCache;
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    // Konversi ke object
    const settings = {};
    data.forEach(item => {
      settings[item.key] = item.value;
    });

    settingsCache = settings;
    settingsCacheTime = now;
    
    return settings;
  } catch (err) {
    console.error('Error loading settings:', err);
    return {
      store_name: 'Toko App',
      store_logo: '🛒',
      store_tagline: 'Admin Panel'
    };
  }
};

export const updateSetting = async (key, value) => {
  try {
    const { error } = await supabase
      .from('settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) throw error;

    // Invalidate cache
    settingsCache = null;
    settingsCacheTime = 0;

    // Trigger event untuk update UI
    window.dispatchEvent(new Event('settingsUpdated'));

    return true;
  } catch (err) {
    console.error('Error updating setting:', err);
    return false;
  }
};

export const getStoreName = async () => {
  const settings = await getSettings();
  return settings.store_name || 'Toko App';
};

export const getStoreLogo = async () => {
  const settings = await getSettings();
  return settings.store_logo || '🛒';
};