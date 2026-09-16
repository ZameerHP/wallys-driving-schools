// Client-side Time-Off / Availability Management
// Resilient multi-tier synchronization: Backend API -> Supabase Direct -> LocalStorage Cache
// Ensures 100% reliability across Vercel (serverless/ephemeral), Hostinger (static/Node.js), and local development.

import { getSupabase, isSupabaseReady } from './supabase';

export interface TimeOffItem {
  id: string | number;
  instructorId?: string;
  instructorName?: string;
  date: string;
  isFullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  startMinutes?: number | null;
  endMinutes?: number | null;
  displayStartTime?: string | null;
  displayEndTime?: string | null;
  reason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'wallys_time_off_blocks_v2';

// Retrieve cached blocks from localStorage
export function getLocalTimeOffBlocks(): TimeOffItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[TimeOff] Failed reading local time off cache:', err);
    return [];
  }
}

// Persist blocks to localStorage
export function saveLocalTimeOffBlocks(blocks: TimeOffItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  } catch (err) {
    console.warn('[TimeOff] Failed saving local time off cache:', err);
  }
}

// Helper to broadcast availability change across components and tabs
export function broadcastAvailabilityChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallys-availability-updated'));
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('wallys-availability-channel');
        channel.postMessage({ type: 'AVAILABILITY_CHANGED', timestamp: Date.now() });
        channel.close();
      }
    } catch {}
    try {
      localStorage.setItem('wallys_availability_ping', Date.now().toString());
    } catch {}
  }
}

// Universal fetch: queries /api/availability/blocked-days, falls back to Supabase client, then localStorage
export async function fetchTimeOffBlocks(): Promise<TimeOffItem[]> {
  let apiBlocks: TimeOffItem[] | null = null;

  // 1. Try Backend API
  try {
    const res = await fetch(`/api/availability/blocked-days?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.blocks)) {
        apiBlocks = data.blocks;
      }
    }
  } catch (err) {
    console.warn('[TimeOff] Backend API unavailable, falling back to cloud/local storage:', err);
  }

  if (apiBlocks !== null && Array.isArray(apiBlocks)) {
    // If API responded, sync to local cache and return immediately
    saveLocalTimeOffBlocks(apiBlocks);
    return apiBlocks;
  }

  // 2. Direct Supabase Fallback (Crucial for static hosting where /api returns 404)
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('instructor_time_off')
        .select('*')
        .order('date', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mapped: TimeOffItem[] = data.map(r => ({
          id: r.id,
          instructorId: r.instructor_id || 'wally',
          instructorName: r.instructor_name || 'Wally',
          date: r.date,
          isFullDay: Boolean(r.is_full_day),
          startTime: r.start_time,
          endTime: r.end_time,
          startMinutes: r.start_minutes,
          endMinutes: r.end_minutes,
          displayStartTime: r.start_time,
          displayEndTime: r.end_time,
          reason: r.reason,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
        saveLocalTimeOffBlocks(mapped);
        return mapped;
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Direct Supabase query error:', sbErr);
    }
  }

  // 3. Return local storage cache if network/backend is completely offline
  return getLocalTimeOffBlocks();
}

// Universal create/update: Saves optimistically to local cache, sends to /api, and direct-syncs to Supabase
export async function createClientTimeOffBlock(block: {
  id?: string | number;
  date: string;
  isFullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string;
  instructorId?: string;
  instructorName?: string;
}): Promise<TimeOffItem> {
  const tempId = block.id || `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const optimisticItem: TimeOffItem = {
    id: tempId,
    instructorId: block.instructorId || 'wally',
    instructorName: block.instructorName || 'Wally',
    date: block.date,
    isFullDay: block.isFullDay,
    startTime: block.isFullDay ? null : block.startTime,
    endTime: block.isFullDay ? null : block.endTime,
    displayStartTime: block.isFullDay ? null : block.startTime,
    displayEndTime: block.isFullDay ? null : block.endTime,
    reason: block.reason?.trim() || 'Instructor Time Off',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Immediately save to localStorage
  const current = getLocalTimeOffBlocks();
  const updated = [optimisticItem, ...current.filter(b => b.date !== block.date && String(b.id) !== String(block.id))].sort((a, b) => a.date.localeCompare(b.date));
  saveLocalTimeOffBlocks(updated);
  broadcastAvailabilityChange();

  // 2. Send to backend /api/instructor/time-off
  let savedItem: TimeOffItem = optimisticItem;
  try {
    const url = block.id ? `/api/instructor/time-off/${encodeURIComponent(String(block.id))}` : '/api/instructor/time-off';
    const method = block.id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-instructor-token': 'wally_owner_session'
      },
      body: JSON.stringify({
        id: block.id,
        date: block.date,
        isFullDay: block.isFullDay,
        startTime: block.isFullDay ? null : block.startTime,
        endTime: block.isFullDay ? null : block.endTime,
        reason: block.reason?.trim() || 'Instructor Time Off',
        instructorId: block.instructorId || 'wally',
        instructorName: block.instructorName || 'Wally'
      })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.block) {
        savedItem = data.block;
        // Update localStorage with confirmed server item
        const synced = updated.map(b => (b.date === block.date || String(b.id) === String(block.id)) ? savedItem : b);
        saveLocalTimeOffBlocks(synced);
      }
    }
  } catch (apiErr) {
    console.warn('[TimeOff] Failed syncing block to /api/instructor/time-off:', apiErr);
  }

  // 3. Direct Supabase Sync (Guarantees persistence even if backend is 100% static hosting on Hostinger)
  const client = getSupabase();
  if (client) {
    try {
      if (block.id && !isNaN(Number(block.id))) {
        await client.from('instructor_time_off').delete().eq('id', Number(block.id));
      }
      if (block.date) {
        await client.from('instructor_time_off').delete().eq('date', block.date);
      }

      const { data, error } = await client.from('instructor_time_off').insert([{
        instructor_id: block.instructorId || 'wally',
        instructor_name: block.instructorName || 'Wally',
        date: block.date,
        is_full_day: block.isFullDay,
        start_time: block.isFullDay ? null : block.startTime,
        end_time: block.isFullDay ? null : block.endTime,
        reason: block.reason?.trim() || 'Instructor Time Off',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]).select('*');

      if (!error && data && data[0]) {
        savedItem = {
          id: data[0].id,
          instructorId: data[0].instructor_id,
          instructorName: data[0].instructor_name,
          date: data[0].date,
          isFullDay: Boolean(data[0].is_full_day),
          startTime: data[0].start_time,
          endTime: data[0].end_time,
          displayStartTime: data[0].start_time,
          displayEndTime: data[0].end_time,
          reason: data[0].reason,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at
        };
        const synced = updated.map(b => (b.date === block.date || String(b.id) === String(block.id)) ? savedItem : b);
        saveLocalTimeOffBlocks(synced);
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Direct Supabase save error:', sbErr);
    }
  }

  broadcastAvailabilityChange();
  return savedItem;
}

// Universal delete: Removes from local storage, calls /api, and deletes from Supabase
export async function deleteClientTimeOffBlock(id: string | number, date: string): Promise<boolean> {
  // 1. Instantly remove from local storage
  const current = getLocalTimeOffBlocks();
  const filtered = current.filter(b => String(b.id) !== String(id) && b.date !== date);
  saveLocalTimeOffBlocks(filtered);
  broadcastAvailabilityChange();

  // 2. Call backend /api/instructor/time-off/:id
  try {
    const safeId = id ? String(id).trim() : '0';
    let res = await fetch(`/api/instructor/time-off/${encodeURIComponent(safeId)}?date=${encodeURIComponent(date)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-instructor-token': 'wally_owner_session'
      },
      body: JSON.stringify({ id, date })
    }).catch(() => null);

    if (!res || !res.ok) {
      await fetch('/api/instructor/time-off/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-instructor-token': 'wally_owner_session'
        },
        body: JSON.stringify({ id, date })
      }).catch(() => null);
    }
  } catch (apiErr) {
    console.warn('[TimeOff] Failed deleting block via API:', apiErr);
  }

  // 3. Direct Supabase deletion
  const client = getSupabase();
  if (client) {
    try {
      if (id && !isNaN(Number(id))) {
        await client.from('instructor_time_off').delete().eq('id', Number(id));
      }
      if (date) {
        await client.from('instructor_time_off').delete().eq('date', date);
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Direct Supabase delete error:', sbErr);
    }
  }

  broadcastAvailabilityChange();
  return true;
}
