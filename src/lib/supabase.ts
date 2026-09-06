import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables safely
const supabaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 10
);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export const supabase = isSupabaseConfigured ? getSupabase() : null;

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
