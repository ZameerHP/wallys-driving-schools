import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable retrieval with fallbacks for local and Vercel environments
const getSupabaseUrl = () => 
  process.env.SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  '';

const getSupabaseKey = () => 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_KEY || 
  '';

export const isSupabaseServerConfigured = Boolean(
  getSupabaseUrl() && 
  getSupabaseKey() && 
  getSupabaseUrl().startsWith('http') && 
  getSupabaseKey().length > 10
);

let serverClientInstance: SupabaseClient | null = null;
let currentKey = '';
let currentUrl = '';

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key || !url.startsWith('http') || key.length <= 10) {
    return null;
  }

  if (!serverClientInstance || currentKey !== key || currentUrl !== url) {
    try {
      currentKey = key;
      currentUrl = url;
      serverClientInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log(`[Supabase Server] Initialized for ${url} (hasServiceRoleKey: ${hasServiceRole})`);
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
  canWrite: boolean;
  writeMessage?: string | null;
  counts: {
    bookings: number;
    students: number;
    instructors: number;
  };
  tables: {
    bookings: boolean;
    students: boolean;
    instructors: boolean;
  };
}

export async function checkSupabaseConnection(): Promise<SupabaseServerStatus> {
  const url = getSupabaseUrl();
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAnon = Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

  const status: SupabaseServerStatus = {
    configured: Boolean(url && (hasServiceRole || hasAnon)),
    url: url ? url.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co' : '',
    hasServiceRoleKey: hasServiceRole,
    hasAnonKey: hasAnon,
    connected: false,
    canWrite: false,
    writeMessage: null,
    counts: {
      bookings: 0,
      students: 0,
      instructors: 0,
    },
    tables: {
      bookings: false,
      students: false,
      instructors: false,
    }
  };

  const client = getSupabaseServerClient();
  if (!client) {
    status.writeMessage = "Supabase URL or API Key is missing in environment variables.";
    return status;
  }

  try {
    const [bRes, sRes, iRes] = await Promise.all([
      client.from('bookings').select('id', { count: 'exact' }).limit(1),
      client.from('students').select('id', { count: 'exact' }).limit(1),
      client.from('instructors').select('id', { count: 'exact' }).limit(1),
    ]);

    status.tables.bookings = !bRes.error;
    status.tables.students = !sRes.error;
    status.tables.instructors = !iRes.error;
    status.connected = !bRes.error || !sRes.error || !iRes.error;

    if (bRes.count !== null && bRes.count !== undefined) status.counts.bookings = bRes.count;
    if (sRes.count !== null && sRes.count !== undefined) status.counts.students = sRes.count;
    if (iRes.count !== null && iRes.count !== undefined) status.counts.instructors = iRes.count;

    // Test write permissions
    if (hasServiceRole) {
      status.canWrite = true;
      status.writeMessage = "Full write access enabled via SUPABASE_SERVICE_ROLE_KEY.";
    } else {
      // Test if anon role is permitted to write or if blocked by RLS
      const testPing = await client.from('students').insert({
        full_name: '__HEALTHCHECK_PING__',
        email: 'healthcheck_probe@test.internal',
        phone: '0400000000'
      }).select('id');

      if (!testPing.error && testPing.data && testPing.data[0]) {
        status.canWrite = true;
        status.writeMessage = "Write access verified (Public/Anon RLS policy enabled).";
        // Clean up test probe
        await client.from('students').delete().eq('id', testPing.data[0].id);
      } else if (testPing.error?.code === '42501') {
        status.canWrite = false;
        status.writeMessage = "Supabase Row-Level Security (RLS) is active. Add SUPABASE_SERVICE_ROLE_KEY in Settings or run the RLS setup SQL in Supabase SQL Editor.";
      } else {
        status.canWrite = false;
        status.writeMessage = testPing.error?.message || "Write test failed.";
      }
    }
  } catch (err: any) {
    status.connected = false;
    status.canWrite = false;
    status.writeMessage = err?.message || "Failed to query Supabase.";
  }

  return status;
}
