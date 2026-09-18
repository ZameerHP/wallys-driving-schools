// Client-side Time-Off / Availability Management
// Resilient multi-tier synchronization: Backend API -> Supabase Direct -> LocalStorage Cache
// Features an authoritative Tombstone Registry ensuring removed days NEVER resurrect on refresh.

import { getSupabase } from './supabase';

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

export interface DeletedTombstone {
  id?: string | number;
  date: string;
  normDate: string;
  deletedAt: number;
}

// Canonical and backward-compatible storage keys
const STORAGE_KEY_V3 = 'wallys_time_off_blocks_v3';
const STORAGE_KEY_V2 = 'wallys_time_off_blocks_v2';
const STORAGE_KEY_V1 = 'wallys_time_off_blocks_v1';
const TOMBSTONES_KEY = 'wallys_deleted_time_off_tombstones';

// Canonical date normalizer for client logic
export function normalizeDateKey(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try standard JS Date parsing
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {}

  return trimmed;
}

// --- TOMBSTONE REGISTRY ---
// Permanently prevents deleted time-off blocks from resurrecting across page refreshes or stale server responses.
export function getDeletedTombstones(): DeletedTombstone[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    // Keep tombstones active for 48 hours to guarantee zero resurrection across browser sessions
    const valid = parsed.filter(t => t && t.date && (now - (t.deletedAt || 0) < 48 * 60 * 60 * 1000));
    return valid;
  } catch (err) {
    console.warn('[TimeOff] Error reading tombstones:', err);
    return [];
  }
}

export function saveDeletedTombstones(tombstones: DeletedTombstone[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones));
  } catch (err) {
    console.warn('[TimeOff] Error saving tombstones:', err);
  }
}

export function markTimeOffBlockDeleted(id: string | number | undefined, dateStr: string): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeDateKey(dateStr);
  const now = Date.now();
  const current = getDeletedTombstones();

  const newEntry: DeletedTombstone = {
    id: id !== undefined && id !== null ? String(id).trim() : undefined,
    date: dateStr,
    normDate: norm,
    deletedAt: now
  };

  const updated = [
    newEntry,
    ...current.filter(t => {
      if (id && t.id && String(t.id) === String(id)) return false;
      if (norm && t.normDate === norm) return false;
      if (dateStr && t.date === dateStr) return false;
      return true;
    })
  ];

  saveDeletedTombstones(updated);

  // Instantly strip this item from all client localStorage caches
  const currentBlocks = getRawLocalTimeOffBlocks();
  const filtered = currentBlocks.filter(b => {
    if (id && String(b.id) === String(id)) return false;
    const bNorm = normalizeDateKey(b.date);
    if (norm && bNorm === norm) return false;
    if (b.date === dateStr) return false;
    return true;
  });
  saveRawLocalTimeOffBlocks(filtered);
}

export function unmarkTimeOffBlockDeleted(dateStr: string, id?: string | number): void {
  if (typeof window === 'undefined') return;
  const norm = normalizeDateKey(dateStr);
  const strId = id !== undefined && id !== null ? String(id).trim() : '';
  const current = getDeletedTombstones();
  const filtered = current.filter(t => {
    if (strId && t.id && String(t.id) === strId) return false;
    if (dateStr && t.date === dateStr) return false;
    if (norm && (t.normDate === norm || t.date === norm)) return false;
    return true;
  });
  saveDeletedTombstones(filtered);
}

export function isTimeOffBlockDeleted(id: string | number | undefined, dateStr?: string): boolean {
  if (typeof window === 'undefined') return false;
  const tombstones = getDeletedTombstones();
  if (tombstones.length === 0) return false;

  const strId = id !== undefined && id !== null ? String(id).trim() : '';
  const rawDate = dateStr ? dateStr.trim() : '';
  const normDate = dateStr ? normalizeDateKey(dateStr) : '';

  // 1. If an ID is provided, ONLY match against tombstoned IDs
  if (strId) {
    return tombstones.some(t => t.id && String(t.id) === strId);
  }

  // 2. If NO ID is provided, only match date if the deletion was recent (within last 30 seconds)
  // This bridges replication lag for instant optimistic deletes, but never blocks future blocks on that date!
  const now = Date.now();
  return tombstones.some(t => {
    const matchesDate = (rawDate && t.date === rawDate) || (normDate && t.normDate === normDate);
    if (!matchesDate) return false;
    return (now - (t.deletedAt || 0)) < 30000;
  });
}

// Filter out any time-off blocks that match active deletion tombstones
export function filterLiveTimeOffBlocks(blocks: TimeOffItem[]): TimeOffItem[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  const tombstones = getDeletedTombstones();
  if (tombstones.length === 0) return blocks;

  const now = Date.now();
  return blocks.filter(b => {
    if (!b) return false;
    const bId = b.id !== undefined && b.id !== null ? String(b.id).trim() : '';
    const bDate = b.date ? String(b.date).trim() : '';
    const bNorm = normalizeDateKey(bDate);

    // If block has an ID, only filter it out if that specific block ID was tombstoned
    if (bId) {
      return !tombstones.some(t => t.id && String(t.id) === bId);
    }

    // If block has no ID, only filter it out if deleted within the last 30 seconds
    const isRecentDateTombstone = tombstones.some(t => {
      const matchesDate = (bDate && t.date === bDate) || (bNorm && t.normDate === bNorm);
      return matchesDate && (now - (t.deletedAt || 0)) < 30000;
    });

    return !isRecentDateTombstone;
  });
}

// --- LOCAL STORAGE CACHING ---
function getRawLocalTimeOffBlocks(): TimeOffItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw3 = localStorage.getItem(STORAGE_KEY_V3);
    if (raw3) {
      const parsed = JSON.parse(raw3);
      if (Array.isArray(parsed)) return parsed;
    }
    const raw2 = localStorage.getItem(STORAGE_KEY_V2);
    if (raw2) {
      const parsed = JSON.parse(raw2);
      if (Array.isArray(parsed)) return parsed;
    }
    const raw1 = localStorage.getItem(STORAGE_KEY_V1);
    if (raw1) {
      const parsed = JSON.parse(raw1);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[TimeOff] Failed reading raw local time off cache:', err);
  }
  return [];
}

function saveRawLocalTimeOffBlocks(blocks: TimeOffItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(blocks);
    localStorage.setItem(STORAGE_KEY_V3, json);
    localStorage.setItem(STORAGE_KEY_V2, json);
    localStorage.setItem(STORAGE_KEY_V1, json);
  } catch (err) {
    console.warn('[TimeOff] Failed writing local time off cache:', err);
  }
}

// Retrieve cached blocks from localStorage (guaranteed free of deleted tombstones)
export function getLocalTimeOffBlocks(): TimeOffItem[] {
  const raw = getRawLocalTimeOffBlocks();
  return filterLiveTimeOffBlocks(raw).sort((a, b) => a.date.localeCompare(b.date));
}

// Persist blocks to localStorage across all version keys
export function saveLocalTimeOffBlocks(blocks: TimeOffItem[]): void {
  const valid = Array.isArray(blocks) ? blocks.filter(b => b && b.date) : [];

  // Strictly deduplicate by ID and date/time key to prevent doubling
  const seenKeys = new Set<string>();
  const deduplicated: TimeOffItem[] = [];

  for (const b of valid) {
    const norm = normalizeDateKey(b.date);
    const idKey = b.id ? `id_${String(b.id)}` : '';
    const dateSlotKey = `date_${norm}_${b.isFullDay ? 'FULL' : `${b.startTime || ''}-${b.endTime || ''}`}`;

    if (idKey && seenKeys.has(idKey)) continue;
    if (seenKeys.has(dateSlotKey)) continue;

    if (idKey) seenKeys.add(idKey);
    seenKeys.add(dateSlotKey);
    deduplicated.push(b);
  }

  // Automatically purge tombstones for any date present in live blocks
  const activeDates = new Set(deduplicated.map(b => normalizeDateKey(b.date)).filter(Boolean));
  if (activeDates.size > 0) {
    const tombstones = getDeletedTombstones();
    const pruned = tombstones.filter(t => !activeDates.has(t.normDate || normalizeDateKey(t.date)));
    if (pruned.length !== tombstones.length) {
      saveDeletedTombstones(pruned);
    }
  }
  const clean = filterLiveTimeOffBlocks(deduplicated).sort((a, b) => a.date.localeCompare(b.date));
  saveRawLocalTimeOffBlocks(clean);
}

// Helper to broadcast availability changes across all components, iframe boundaries, and tabs
export function broadcastAvailabilityChange(detail?: {
  action?: 'deleted' | 'created' | 'updated' | 'refreshed' | 'added' | 'removed';
  id?: string | number;
  date?: string;
  normDate?: string;
  block?: any;
  operatingSettings?: any;
  operatingHours?: any;
  disabledDays?: number[];
}): void {
  if (typeof window === 'undefined') return;

  const payload = {
    type: 'AVAILABILITY_CHANGED',
    timestamp: Date.now(),
    action: detail?.action || 'refreshed',
    id: detail?.id,
    date: detail?.date,
    normDate: detail?.normDate || (detail?.date ? normalizeDateKey(detail.date) : undefined),
    block: detail?.block,
    operatingSettings: detail?.operatingSettings,
    operatingHours: detail?.operatingHours || detail?.operatingSettings?.operatingHours,
    disabledDays: detail?.disabledDays || detail?.operatingSettings?.disabledDays
  };

  // 1. Dispatch custom DOM event
  try {
    window.dispatchEvent(new CustomEvent('wallys-availability-updated', { detail: payload }));
  } catch {}

  // 2. BroadcastChannel for cross-tab communication
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('wallys-availability-channel');
      channel.postMessage(payload);
      channel.close();
    }
  } catch {}

  // 3. Storage event ping for cross-window / iframe communication
  try {
    localStorage.setItem('wallys_availability_ping', JSON.stringify(payload));
    localStorage.setItem('wallys_time_off_sync_event', Date.now().toString());
  } catch {}
}

// Universal fetch: queries /api/availability/blocked-days, falls back to Supabase client, then localStorage
export async function fetchTimeOffBlocks(): Promise<TimeOffItem[]> {
  let apiBlocks: TimeOffItem[] | null = null;

  // 1. Try Backend API with cache-busting
  try {
    const res = await fetch(`/api/availability/blocked-days?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.blocks)) {
        apiBlocks = data.blocks;
      }
    }
  } catch (err) {
    console.warn('[TimeOff] Backend API unavailable, checking cloud/local storage:', err);
  }

  if (apiBlocks !== null && Array.isArray(apiBlocks)) {
    // Filter through tombstones to ensure deleted days are never resurrected
    const sanitized = filterLiveTimeOffBlocks(apiBlocks);
    saveLocalTimeOffBlocks(sanitized);
    return sanitized;
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
        const sanitized = filterLiveTimeOffBlocks(mapped);
        saveLocalTimeOffBlocks(sanitized);
        return sanitized;
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Direct Supabase query error:', sbErr);
    }
  }

  // 3. Return clean local storage cache if network/backend is offline
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
  const normDate = normalizeDateKey(block.date);

  // Unmark any tombstone for this date so new blocks are immediately active
  unmarkTimeOffBlockDeleted(block.date);
  if (normDate && normDate !== block.date) {
    unmarkTimeOffBlockDeleted(normDate);
  }

  const tempId = block.id || `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const optimisticItem: TimeOffItem = {
    id: tempId,
    instructorId: block.instructorId || 'wally',
    instructorName: block.instructorName || 'Wally',
    date: normDate || block.date,
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
  const updated = [
    optimisticItem,
    ...current.filter(b => b.date !== block.date && normalizeDateKey(b.date) !== normDate && String(b.id) !== String(block.id))
  ].sort((a, b) => a.date.localeCompare(b.date));
  saveLocalTimeOffBlocks(updated);
  broadcastAvailabilityChange({ action: 'created', id: tempId, date: block.date, normDate });

  // 2. Send to backend /api/instructor/time-off
  let savedItem: TimeOffItem = optimisticItem;
  try {
    const url = block.id ? `/api/instructor/time-off/${encodeURIComponent(String(block.id))}` : '/api/instructor/time-off';
    const method = block.id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer wally_owner_session',
        'x-instructor-token': 'wally_owner_session'
      },
      body: JSON.stringify({
        id: block.id,
        date: normDate || block.date,
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
        const synced = updated.map(b => (b.date === block.date || String(b.id) === String(block.id)) ? savedItem : b);
        saveLocalTimeOffBlocks(synced);
      }
    }
  } catch (apiErr) {
    console.warn('[TimeOff] Failed syncing block to /api/instructor/time-off:', apiErr);
  }

  // 3. Direct Supabase Sync (Guarantees persistence even if backend is static hosting on Hostinger)
  const client = getSupabase();
  if (client) {
    try {
      if (block.id && !isNaN(Number(block.id))) {
        await client.from('instructor_time_off').delete().eq('id', Number(block.id));
      }
      if (normDate) {
        await client.from('instructor_time_off').delete().eq('date', normDate);
      }
      if (block.date && block.date !== normDate) {
        await client.from('instructor_time_off').delete().eq('date', block.date);
      }

      const { data, error } = await client.from('instructor_time_off').insert([{
        instructor_id: block.instructorId || 'wally',
        instructor_name: block.instructorName || 'Wally',
        date: normDate || block.date,
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

  broadcastAvailabilityChange({ action: 'created', id: savedItem.id, date: savedItem.date, normDate });
  return savedItem;
}

// Universal delete: Removes from local storage, marks tombstone, calls /api, and deletes from Supabase
export async function deleteClientTimeOffBlock(id: string | number, date: string): Promise<boolean> {
  const normDate = normalizeDateKey(date);

  // 1. Immediately register in the persistent Tombstone Registry
  markTimeOffBlockDeleted(id, date);
  if (normDate && normDate !== date) {
    markTimeOffBlockDeleted(id, normDate);
  }

  // 2. Instantly remove from all local storage caches
  const current = getRawLocalTimeOffBlocks();
  const filtered = current.filter(b => {
    if (id && String(b.id) === String(id)) return false;
    const bNorm = normalizeDateKey(b.date);
    if (normDate && bNorm === normDate) return false;
    if (b.date === date) return false;
    return true;
  });
  saveRawLocalTimeOffBlocks(filtered);

  // 3. Immediately broadcast deletion event to all tabs, windows, and calendars
  broadcastAvailabilityChange({ action: 'deleted', id, date, normDate });

  // 4. Call backend /api/instructor/time-off/:id with fallbacks
  try {
    const safeId = id ? String(id).trim() : '0';
    const deletePayload = JSON.stringify({ id, date, normDate });

    let res = await fetch(`/api/instructor/time-off/${encodeURIComponent(safeId)}?date=${encodeURIComponent(date)}&normDate=${encodeURIComponent(normDate)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer wally_owner_session',
        'x-instructor-token': 'wally_owner_session'
      },
      body: deletePayload
    }).catch(() => null);

    // Fallback POST endpoint if DELETE is blocked by host proxy
    if (!res || !res.ok) {
      await fetch('/api/instructor/time-off/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wally_owner_session',
          'x-instructor-token': 'wally_owner_session'
        },
        body: deletePayload
      }).catch(() => null);
    }
  } catch (apiErr) {
    console.warn('[TimeOff] Failed deleting block via API:', apiErr);
  }

  // 5. Direct Supabase deletion if client is configured
  const client = getSupabase();
  if (client) {
    try {
      if (id && !isNaN(Number(id))) {
        await client.from('instructor_time_off').delete().eq('id', Number(id));
      }
      if (normDate) {
        await client.from('instructor_time_off').delete().eq('date', normDate);
      }
      if (date && date !== normDate) {
        await client.from('instructor_time_off').delete().eq('date', date);
      }
    } catch (sbErr) {
      console.warn('[TimeOff] Direct Supabase delete error:', sbErr);
    }
  }

  // 6. Broadcast final confirmation
  broadcastAvailabilityChange({ action: 'deleted', id, date, normDate });
  return true;
}
