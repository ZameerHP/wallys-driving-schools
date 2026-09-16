import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables safely across browser and server contexts with explicit literal access
function resolveInitialUrl(): string {
  // 1. Literal Vite env vars
  try {
    if (import.meta.env?.VITE_SUPABASE_URL) return import.meta.env.VITE_SUPABASE_URL;
    if (import.meta.env?.SUPABASE_URL) return import.meta.env.SUPABASE_URL;
  } catch {}

  // 2. LocalStorage cache (persisted from previous API discovery or user settings)
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('wallys_supabase_url');
      if (cached && cached.startsWith('http')) return cached;
    } catch {}
  }

  // 3. Node process.env (for SSR or serverless)
  try {
    if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
    if (typeof process !== 'undefined' && process.env?.SUPABASE_URL) return process.env.SUPABASE_URL;
  } catch {}

  return '';
}

function resolveInitialKey(): string {
  // 1. Literal Vite env vars
  try {
    if (import.meta.env?.VITE_SUPABASE_ANON_KEY) return import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (import.meta.env?.SUPABASE_ANON_KEY) return import.meta.env.SUPABASE_ANON_KEY;
    if (import.meta.env?.SUPABASE_KEY) return import.meta.env.SUPABASE_KEY;
  } catch {}

  // 2. LocalStorage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('wallys_supabase_anon_key');
      if (cached && cached.length > 10) return cached;
    } catch {}
  }

  // 3. Node process.env
  try {
    if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) return process.env.VITE_SUPABASE_ANON_KEY;
    if (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
    if (typeof process !== 'undefined' && process.env?.SUPABASE_KEY) return process.env.SUPABASE_KEY;
  } catch {}

  return '';
}

let activeUrl = resolveInitialUrl();
let activeAnonKey = resolveInitialKey();
let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseReady(): boolean {
  return Boolean(activeUrl && activeAnonKey && activeUrl.startsWith('http') && activeAnonKey.length > 10);
}

export const isSupabaseConfigured = isSupabaseReady();

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseReady()) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(activeUrl, activeAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      console.log('[Supabase Client] Successfully initialized client with URL:', activeUrl);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  if (!url || !anonKey) return;
  activeUrl = url.trim();
  activeAnonKey = anonKey.trim();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('wallys_supabase_url', activeUrl);
      localStorage.setItem('wallys_supabase_anon_key', activeAnonKey);
    } catch {}
  }
  supabaseInstance = null; // Rebuild client
  getSupabase();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallys-supabase-configured'));
  }
}

// Auto-discover credentials from backend /api/supabase/config if not already present
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const res = await fetch('/api/supabase/config').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.supabaseUrl && data.supabaseAnonKey) {
          if (data.supabaseUrl !== activeUrl || data.supabaseAnonKey !== activeAnonKey) {
            setSupabaseConfig(data.supabaseUrl, data.supabaseAnonKey);
          }
        }
      }
    } catch {}
  }, 100);
}

export const supabase = getSupabase();

// Database schema representation for Supabase
export interface SupabaseBookingRow {
  id?: number | string;
  booking_ref: string;
  user_id?: string | null;
  student_name: string;
  phone: string;
  email: string;
  suburb: string;
  pickup_address?: string | null;
  package_title: string;
  package_price: number;
  date: string;
  time: string;
  status: string;
  notes?: string | null;
  payment_status?: string;
  stripe_session_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseContactMessage {
  id?: number | string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  created_at?: string;
}
