import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable retrieval with fallbacks for local and Vercel environments
const supabaseUrl = 
  process.env.SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  '';

const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_KEY || 
  '';

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl.startsWith('http') && 
  supabaseKey.length > 10
);

let serverClientInstance: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseServerConfigured) {
    return null;
  }

  if (!serverClientInstance) {
    try {
      serverClientInstance = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log(`[Supabase Server] Connected to ${supabaseUrl}`);
    } catch (err: any) {
      console.warn('[Supabase Server] Failed to initialize Supabase server client:', err?.message || err);
      return null;
    }
  }

  return serverClientInstance;
}

export interface SupabaseServerStatus {
  configured: boolean;
  url: string;
  hasServiceRoleKey: boolean;
  hasAnonKey: boolean;
  connected: boolean;
  tables: {
    bookings: boolean;
    students: boolean;
    instructors: boolean;
  };
}

export async function checkSupabaseConnection(): Promise<SupabaseServerStatus> {
  const status: SupabaseServerStatus = {
    configured: isSupabaseServerConfigured,
    url: supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co' : '',
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    connected: false,
    tables: {
      bookings: false,
      students: false,
      instructors: false,
    }
  };

  const client = getSupabaseServerClient();
  if (!client) {
    return status;
  }

  try {
    const [bRes, sRes, iRes] = await Promise.all([
      client.from('bookings').select('id').limit(1),
      client.from('students').select('id').limit(1),
      client.from('instructors').select('id').limit(1),
    ]);

    status.tables.bookings = !bRes.error;
    status.tables.students = !sRes.error;
    status.tables.instructors = !iRes.error;
    status.connected = !bRes.error || !sRes.error || !iRes.error;
  } catch (err) {
    status.connected = false;
  }

  return status;
}
