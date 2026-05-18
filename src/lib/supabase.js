import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const AUTH_SESSION_DAYS = 30;

const AUTH_STORAGE_KEY = 'sgihpbp-auth-session';
const AUTH_SESSION_TTL_MS = AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000;
const AUTH_STORAGE_WRAPPER = 'sgihpbp-expiring-auth-storage-v1';
const memoryStorage = new Map();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
}

function getLocalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function createExpiringAuthStorage() {
  const read = (key) => {
    const storage = getLocalStorage();
    if (!storage) return memoryStorage.get(key) || null;

    try {
      return storage.getItem(key);
    } catch {
      return memoryStorage.get(key) || null;
    }
  };

  const write = (key, value) => {
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch {
        // Fall through to in-memory storage if the browser blocks localStorage.
      }
    }
    memoryStorage.set(key, value);
  };

  const remove = (key) => {
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        // The fallback map is cleared below either way.
      }
    }
    memoryStorage.delete(key);
  };

  const storageAdapter = {
    getItem(key) {
      const raw = read(key);
      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw);
        if (parsed?.type === AUTH_STORAGE_WRAPPER) {
          if (Date.now() > parsed.expiresAt) {
            remove(key);
            return null;
          }
          return typeof parsed.value === 'string' ? parsed.value : null;
        }
      } catch {
        // Legacy raw Supabase values are handled below and wrapped on first read.
      }

      storageAdapter.setItem(key, raw);
      return raw;
    },
    setItem(key, value) {
      write(key, JSON.stringify({
        type: AUTH_STORAGE_WRAPPER,
        expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
        value,
      }));
    },
    removeItem: remove,
  };

  return storageAdapter;
}

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
      storage: createExpiringAuthStorage(),
      storageKey: AUTH_STORAGE_KEY,
    },
  },
);
