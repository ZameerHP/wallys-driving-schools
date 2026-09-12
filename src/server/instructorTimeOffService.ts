import fs from 'fs';
import path from 'path';
import { getBookings } from '../db/queries';

export interface TimeOffBlock {
  id: string;
  instructorId: string;
  date: string; // YYYY-MM-DD
  isFullDay: boolean;
  startTime: string | null; // e.g. "09:00 AM"
  endTime: string | null;   // e.g. "01:00 PM"
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictingBooking {
  id: number | string;
  bookingRef: string;
  studentName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  packageTitle?: string;
  status: string;
  suburb?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'instructor-time-off.json');

// In-memory cache for ultra-fast, zero-latency queries
let cachedBlocks: TimeOffBlock[] = [];
let isInitialized = false;

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[TimeOffService] Warning: Could not ensure data directory:', err);
  }
}

function loadBlocksFromDisk(): TimeOffBlock[] {
  try {
    ensureDataFile();
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[TimeOffService] Error reading time off blocks from disk:', err);
  }
  return [];
}

function saveBlocksToDisk(blocks: TimeOffBlock[]) {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(blocks, null, 2), 'utf-8');
  } catch (err) {
    console.error('[TimeOffService] Error persisting time off blocks to disk:', err);
  }
}

function initIfNeeded() {
  if (!isInitialized) {
    cachedBlocks = loadBlocksFromDisk();
    isInitialized = true;
  }
}

/**
 * Normalise any date string to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return trimmed;
}

/**
 * Parse a time string (e.g. "09:00 AM", "2:30 PM") into minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Parse an interval string like "10:00 AM – 12:00 PM" or "10:00 AM" into start & end minutes
 */
export function parseTimeInterval(timeStr: string, defaultDuration = 60): { start: number; end: number } | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace(/\s+/g, ' ');

  const rangeMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (rangeMatch) {
    const parsePart = (hStr: string, mStr?: string, ampmStr?: string) => {
      let h = parseInt(hStr, 10);
      const m = mStr ? parseInt(mStr, 10) : 0;
      const ampm = (ampmStr || '').toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    let start = parsePart(rangeMatch[1], rangeMatch[2], rangeMatch[3] || rangeMatch[6]);
    let end = parsePart(rangeMatch[4], rangeMatch[5], rangeMatch[6] || rangeMatch[3]);
    if (end <= start) end += 720; // 12hr wrap
    return { start, end };
  }

  const singleMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (singleMatch) {
    let h = parseInt(singleMatch[1], 10);
    const m = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    const ampm = (singleMatch[3] || 'AM').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const start = h * 60 + m;
    return { start, end: start + defaultDuration };
  }

  return null;
}

/**
 * Get all configured time off blocks for an instructor
 */
export async function getTimeOffBlocks(instructorId = 'wally'): Promise<TimeOffBlock[]> {
  initIfNeeded();
  return cachedBlocks
    .filter(b => !instructorId || b.instructorId.toLowerCase() === instructorId.toLowerCase())
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Check for booking conflicts before creating or updating a time-off block.
 * Returns any confirmed/pending student bookings that would clash with this block.
 */
export async function findConflictingBookings(
  dateStr: string,
  isFullDay: boolean,
  startTime?: string | null,
  endTime?: string | null,
  instructorId = 'wally'
): Promise<ConflictingBooking[]> {
  const normDate = normalizeDate(dateStr);
  if (!normDate) return [];

  const allBookings = await getBookings({ includeUnpaid: true });
  const dayBookings = allBookings.filter(b => {
    if (b.status === 'Cancelled') return false;
    return normalizeDate(b.date) === normDate;
  });

  if (isFullDay) {
    // Every active booking on that day conflicts with a Full Day Off
    return dayBookings.map(b => ({
      id: b.id,
      bookingRef: b.bookingRef,
      studentName: b.studentName,
      phone: b.phone,
      email: b.email,
      date: b.date,
      time: b.time,
      packageTitle: b.packageTitle,
      status: b.status,
      suburb: b.suburb
    }));
  }

  // Partial day: check time window overlap
  if (!startTime || !endTime) return [];
  const blockStart = parseTimeToMinutes(startTime);
  const blockEnd = parseTimeToMinutes(endTime);

  const conflicts: ConflictingBooking[] = [];

  for (const b of dayBookings) {
    const bookingInterval = parseTimeInterval(b.time);
    if (!bookingInterval) {
      // If we cannot parse interval, match defensively
      conflicts.push({
        id: b.id,
        bookingRef: b.bookingRef,
        studentName: b.studentName,
        phone: b.phone,
        email: b.email,
        date: b.date,
        time: b.time,
        packageTitle: b.packageTitle,
        status: b.status,
        suburb: b.suburb
      });
      continue;
    }

    // Overlap condition between [blockStart, blockEnd] and [bookingInterval.start, bookingInterval.end]
    const overlaps = Math.max(blockStart, bookingInterval.start) < Math.min(blockEnd, bookingInterval.end);
    if (overlaps) {
      conflicts.push({
        id: b.id,
        bookingRef: b.bookingRef,
        studentName: b.studentName,
        phone: b.phone,
        email: b.email,
        date: b.date,
        time: b.time,
        packageTitle: b.packageTitle,
        status: b.status,
        suburb: b.suburb
      });
    }
  }

  return conflicts;
}

/**
 * Add a new time-off block after validating conflicts
 */
export async function addTimeOffBlock(data: {
  date: string;
  isFullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  instructorId?: string;
}): Promise<{ success: boolean; block?: TimeOffBlock; conflicts?: ConflictingBooking[]; message?: string }> {
  initIfNeeded();
  const instructorId = data.instructorId || 'wally';
  const normDate = normalizeDate(data.date);

  if (!normDate) {
    return { success: false, message: 'Invalid or missing date.' };
  }

  if (!data.isFullDay) {
    if (!data.startTime || !data.endTime) {
      return { success: false, message: 'Start time and end time are required for partial day blocks.' };
    }
    const s = parseTimeToMinutes(data.startTime);
    const e = parseTimeToMinutes(data.endTime);
    if (e <= s) {
      return { success: false, message: 'Start time must be strictly before end time.' };
    }
  }

  // Conflict Check: Prevent double-booking / silent cancellation of students
  const conflicts = await findConflictingBookings(
    normDate,
    data.isFullDay,
    data.startTime,
    data.endTime,
    instructorId
  );

  if (conflicts.length > 0) {
    return {
      success: false,
      conflicts,
      message: `Cannot block: There are ${conflicts.length} active student booking(s) during this time. Please reschedule them first.`
    };
  }

  const newBlock: TimeOffBlock = {
    id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    instructorId,
    date: normDate,
    isFullDay: data.isFullDay,
    startTime: data.isFullDay ? null : data.startTime || null,
    endTime: data.isFullDay ? null : data.endTime || null,
    reason: data.reason?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  cachedBlocks.push(newBlock);
  saveBlocksToDisk(cachedBlocks);

  return { success: true, block: newBlock };
}

/**
 * Update an existing time-off block
 */
export async function updateTimeOffBlock(
  id: string | number,
  data: {
    date: string;
    isFullDay: boolean;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
    instructorId?: string;
  }
): Promise<{ success: boolean; block?: TimeOffBlock; conflicts?: ConflictingBooking[]; message?: string }> {
  initIfNeeded();
  const blockIndex = cachedBlocks.findIndex(b => String(b.id) === String(id));
  if (blockIndex === -1) {
    return { success: false, message: 'Time-off block not found.' };
  }

  const normDate = normalizeDate(data.date);
  const instructorId = data.instructorId || cachedBlocks[blockIndex].instructorId;

  // Conflict check
  const conflicts = await findConflictingBookings(
    normDate,
    data.isFullDay,
    data.startTime,
    data.endTime,
    instructorId
  );

  if (conflicts.length > 0) {
    return {
      success: false,
      conflicts,
      message: `Cannot update block: There are ${conflicts.length} active student booking(s) during this time.`
    };
  }

  const updated: TimeOffBlock = {
    ...cachedBlocks[blockIndex],
    date: normDate,
    isFullDay: data.isFullDay,
    startTime: data.isFullDay ? null : data.startTime || null,
    endTime: data.isFullDay ? null : data.endTime || null,
    reason: data.reason?.trim() || null,
    updatedAt: new Date().toISOString()
  };

  cachedBlocks[blockIndex] = updated;
  saveBlocksToDisk(cachedBlocks);

  return { success: true, block: updated };
}

/**
 * Delete a time-off block by ID
 */
export async function deleteTimeOffBlock(id: string | number): Promise<boolean> {
  initIfNeeded();
  const initialLen = cachedBlocks.length;
  cachedBlocks = cachedBlocks.filter(b => String(b.id) !== String(id));
  if (cachedBlocks.length !== initialLen) {
    saveBlocksToDisk(cachedBlocks);
    return true;
  }
  return false;
}

/**
 * Check if a candidate slot on a date is blocked by any instructor time-off block
 */
export function isSlotBlockedByTimeOff(dateStr: string, timeStr: string, instructorId = 'wally'): {
  isBlocked: boolean;
  isFullDay?: boolean;
  reason?: string;
  block?: TimeOffBlock;
} {
  initIfNeeded();
  const normDate = normalizeDate(dateStr);
  if (!normDate) return { isBlocked: false };

  const candidateInterval = parseTimeInterval(timeStr);

  for (const block of cachedBlocks) {
    if (block.instructorId && block.instructorId.toLowerCase() !== instructorId.toLowerCase()) {
      continue;
    }

    if (block.date !== normDate) {
      continue;
    }

    // 1. Full Day Off
    if (block.isFullDay) {
      return {
        isBlocked: true,
        isFullDay: true,
        reason: block.reason || 'Full Day Off scheduled by instructor',
        block
      };
    }

    // 2. Partial Day Off
    if (block.startTime && block.endTime) {
      const blockStart = parseTimeToMinutes(block.startTime);
      const blockEnd = parseTimeToMinutes(block.endTime);

      if (candidateInterval) {
        // Any overlap blocks the candidate slot
        if (Math.max(candidateInterval.start, blockStart) < Math.min(candidateInterval.end, blockEnd)) {
          return {
            isBlocked: true,
            isFullDay: false,
            reason: block.reason || `Blocked period (${block.startTime} – ${block.endTime})`,
            block
          };
        }
      } else {
        // Fallback: exact match or single point
        const candidatePoint = parseTimeToMinutes(timeStr);
        if (candidatePoint >= blockStart && candidatePoint < blockEnd) {
          return {
            isBlocked: true,
            isFullDay: false,
            reason: block.reason || `Blocked period (${block.startTime} – ${block.endTime})`,
            block
          };
        }
      }
    }
  }

  return { isBlocked: false };
}

/**
 * Standard operating start slots for synthesizing availability blocks
 */
const OPERATING_TIMES = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM'
];

/**
 * Returns formatted blocked slots for public /api/availability consumption
 */
export function getAvailabilityBlockedSlots(targetDate?: string): {
  date: string;
  time: string;
  status: string;
  isFullDay?: boolean;
  reason?: string;
}[] {
  initIfNeeded();
  const normTarget = targetDate ? normalizeDate(targetDate) : undefined;
  const results: { date: string; time: string; status: string; isFullDay?: boolean; reason?: string }[] = [];

  for (const block of cachedBlocks) {
    if (normTarget && block.date !== normTarget) {
      continue;
    }

    if (block.isFullDay) {
      // 1. Explicit Full Day Off entry
      results.push({
        date: block.date,
        time: 'Full Day Off',
        status: 'Blocked',
        isFullDay: true,
        reason: block.reason || 'Instructor Day Off'
      });

      // 2. Synthesize each operating slot as blocked so standard slot checkers mark it unavailable
      for (const time of OPERATING_TIMES) {
        results.push({
          date: block.date,
          time,
          status: 'Blocked',
          isFullDay: true,
          reason: block.reason || 'Instructor Day Off'
        });
      }
    } else if (block.startTime && block.endTime) {
      // 1. Range slot entry
      results.push({
        date: block.date,
        time: `${block.startTime} – ${block.endTime}`,
        status: 'Blocked',
        isFullDay: false,
        reason: block.reason || 'Blocked Period'
      });

      // 2. Any operating slot overlapping this window
      const blockStart = parseTimeToMinutes(block.startTime);
      const blockEnd = parseTimeToMinutes(block.endTime);
      for (const time of OPERATING_TIMES) {
        const tMinutes = parseTimeToMinutes(time);
        // If within the blocked window
        if (tMinutes >= blockStart && tMinutes < blockEnd) {
          results.push({
            date: block.date,
            time,
            status: 'Blocked',
            isFullDay: false,
            reason: block.reason || 'Blocked Period'
          });
        }
      }
    }
  }

  return results;
}
