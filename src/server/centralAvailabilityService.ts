import fs from 'node:fs';
import path from 'node:path';
import { 
  DayKey, 
  DaySchedule, 
  WeeklyOperatingHours, 
  InstructorSettings, 
  TimePeriod, 
  DateOverride, 
  ExternalCalendarEvent 
} from '../types/availability';
import { getBookings, getInstructorSettingsDb, getTimeOffBlocks } from '../db/queries';
import { getInstructorSettings, getDateOverrides, getExternalEvents } from './instructorAvailabilityService';

export type AvailabilityReason = 
  | "AVAILABLE" 
  | "SCHOOL_CLOSED" 
  | "OUTSIDE_OPERATING_HOURS" 
  | "INSTRUCTOR_DAY_OFF" 
  | "FULLY_BOOKED" 
  | "SLOT_ALREADY_BOOKED" 
  | "INVALID_DATE";

export interface DayAvailabilityResult {
  date: string; // YYYY-MM-DD
  day: number;
  dayKey: DayKey;
  dayLabel: string;
  isOperatingDay: boolean;
  isAvailable: boolean; // has at least one open bookable slot
  isDayOff: boolean;    // full day off
  isFullyBooked: boolean;
  reason: AvailabilityReason;
  displayReason: string;
  operatingPeriods: TimePeriod[];
  availableSlotsCount: number;
  totalSlotsCount: number;
  availableSlots: string[];
  bookedSlots: Array<{ time: string; reason?: string; isFullDay?: boolean }>;
  timeOffBlocks: Array<{ id: string | number; isFullDay: boolean; startTime?: string | null; endTime?: string | null; reason?: string | null }>;
}

export interface SlotAvailabilityResult {
  available: boolean;
  date: string;
  requestedTime?: string;
  reason: AvailabilityReason;
  message: string;
  isClosed?: boolean;
  isDayOff?: boolean;
  isFullyBooked?: boolean;
  operatingPeriods: TimePeriod[];
  availableSlots: string[];
  bookedSlots: Array<{ time: string; reason?: string; isFullDay?: boolean }>;
  timeOffBlocks: Array<{ id: string | number; isFullDay: boolean; startTime?: string | null; endTime?: string | null; reason?: string | null }>;
}

export interface MonthAvailabilityResult {
  year: number;
  month: number; // 1-12
  instructorId: string;
  days: Record<string, DayAvailabilityResult>;
}

/**
 * Normalise any date string strictly to YYYY-MM-DD without timezone conversion.
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
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

  // ISO timestamp or Date string
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return trimmed;
}

/**
 * Convert YYYY-MM-DD into UTC day index (0=Sun .. 6=Sat) and DayKey
 * Using UTC ensures identical behavior regardless of server or browser timezone.
 */
export function getDayKeyAndIndexFromDateStr(dateStr: string): { dayIndex: number; dayKey: DayKey; dayLabel: string } {
  const norm = normalizeDate(dateStr);
  const parts = norm.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return { dayIndex: 1, dayKey: 'monday', dayLabel: 'Monday' };
  }
  const [y, m, d] = parts;
  const dayIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const dayKeys: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayKey = dayKeys[dayIdx] || 'monday';
  const dayLabel = dayLabels[dayIdx] || 'Monday';
  return { dayIndex: dayIdx, dayKey, dayLabel };
}

/**
 * Parse time string to minutes from midnight (0 - 1439)
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  }
  const m12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = m12[2] ? parseInt(m12[2], 10) : 0;
    const ampm = (m12[3] || '').toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}

/**
 * Format minutes from midnight to "08:00 AM"
 */
export function formatMinutesToTimeString(minutes: number): string {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Parse time range string like "09:00 AM – 10:00 AM" or "9:00 AM"
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
    if (end <= start) end += 720; // 12-hour wrap defensive
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
 * Check if two time intervals overlap (including buffer time)
 */
export function isTimeSlotConflicting(
  slot1: { start: number; end: number },
  slot2: { start: number; end: number },
  bufferMinutes = 15
): boolean {
  return slot1.start < (slot2.end + bufferMinutes) && slot1.end > (slot2.start - bufferMinutes);
}

/**
 * Format a slot label given start minutes and duration in minutes
 */
export function formatSlotLabel(startMinutes: number, durationMinutes: number): string {
  const startStr = formatMinutesToTimeString(startMinutes);
  const endStr = formatMinutesToTimeString(startMinutes + durationMinutes);
  return `${startStr} – ${endStr}`;
}

/**
 * Retrieve effective settings for instructor
 */
export async function getEffectiveInstructorSettings(instructorId = 'wally'): Promise<InstructorSettings> {
  try {
    const dbSettings = await getInstructorSettingsDb(instructorId);
    if (dbSettings && dbSettings.operatingHours) {
      return dbSettings;
    }
  } catch (err) {
    console.warn('[centralAvailability] Error fetching settings from DB:', err);
  }
  return getInstructorSettings(instructorId);
}

/**
 * Generate candidate slot start times for given operating periods and duration
 */
export function generateCandidateSlots(
  periods: TimePeriod[],
  durationMinutes = 60,
  stepMinutes = 30
): Array<{ label: string; start: number; end: number }> {
  const candidateSlots: Array<{ label: string; start: number; end: number }> = [];

  for (const period of periods) {
    const pStart = period.startMinutes ?? (period.start ? parseTimeToMinutes(period.start) : null);
    const pEnd = period.endMinutes ?? (period.end ? parseTimeToMinutes(period.end) : null);
    if (pStart === null || pEnd === null || (pEnd - pStart) < durationMinutes) {
      continue;
    }

    for (let sMin = pStart; sMin + durationMinutes <= pEnd; sMin += stepMinutes) {
      candidateSlots.push({
        label: formatSlotLabel(sMin, durationMinutes),
        start: sMin,
        end: sMin + durationMinutes
      });
    }
  }

  // Deduplicate by label
  const seen = new Set<string>();
  return candidateSlots.filter(s => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });
}

/**
 * THE SINGLE SOURCE OF TRUTH:
 * Evaluates full availability for a single date and optional requested time.
 */
export async function getAvailability(options: {
  date: string;
  instructorId?: string;
  requestedTime?: string;
  durationMinutes?: number;
  excludeBookingRef?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<SlotAvailabilityResult> {
  const normDate = normalizeDate(options.date);
  const instructorId = options.instructorId || 'wally';
  const durationMinutes = options.durationMinutes || 60;
  const requestedTime = options.requestedTime?.trim();

  if (!normDate || normDate.length !== 10) {
    return {
      available: false,
      date: options.date,
      reason: "INVALID_DATE",
      message: "Please specify a valid date in YYYY-MM-DD format.",
      operatingPeriods: [],
      availableSlots: [],
      bookedSlots: [],
      timeOffBlocks: []
    };
  }

  // 1. Get instructor settings (operating hours, buffer, timezone)
  const settings = await getEffectiveInstructorSettings(instructorId);
  const bufferMinutes = typeof settings.bufferMinutes === 'number' ? settings.bufferMinutes : 15;
  const { dayIndex, dayKey, dayLabel } = getDayKeyAndIndexFromDateStr(normDate);

  // 2. Check school-wide closures and date overrides
  const dateOverrides = getDateOverrides(instructorId);
  const dateOverride = dateOverrides.find(ov => normalizeDate(ov.date) === normDate);

  if (dateOverride) {
    if (dateOverride.type === 'unavailable' || dateOverride.isFullDay) {
      return {
        available: false,
        date: normDate,
        reason: "SCHOOL_CLOSED",
        message: dateOverride.reason || "School is closed on this date (Date Override).",
        isClosed: true,
        operatingPeriods: [],
        availableSlots: [],
        bookedSlots: [{ time: 'FULL_DAY', reason: dateOverride.reason || 'Closed', isFullDay: true }],
        timeOffBlocks: []
      };
    }
  }

  // 3. Check weekly operating hours for this weekday
  let daySchedule: DaySchedule | undefined = settings.operatingHours?.[dayKey];
  let effectivePeriods: TimePeriod[] = [];

  if (dateOverride && dateOverride.type === 'custom_hours' && Array.isArray(dateOverride.periods) && dateOverride.periods.length > 0) {
    effectivePeriods = dateOverride.periods;
  } else if (daySchedule && daySchedule.enabled && Array.isArray(daySchedule.periods) && daySchedule.periods.length > 0) {
    effectivePeriods = daySchedule.periods;
  }

  // If day is disabled in disabledDays or weeklyDaysOff:
  const isDisabledDay = 
    (Array.isArray((settings as any).disabledDays) && (settings as any).disabledDays.includes(dayIndex)) ||
    (settings.weeklyDaysOff && (settings.weeklyDaysOff as any)[dayKey] === false) ||
    (Array.isArray((settings as any).disabledWeekdays) && (settings as any).disabledWeekdays.includes(dayKey));

  if (isDisabledDay) {
    return {
      available: false,
      date: normDate,
      reason: "INSTRUCTOR_DAY_OFF",
      message: `Instructor Day Off: Instructor does not take lessons on ${dayLabel}s.`,
      isClosed: true,
      operatingPeriods: [],
      availableSlots: [],
      bookedSlots: [],
      timeOffBlocks: []
    };
  }

  if (!daySchedule || !daySchedule.enabled || effectivePeriods.length === 0) {
    return {
      available: false,
      date: normDate,
      reason: "OUTSIDE_OPERATING_HOURS",
      message: `The driving school does not operate on ${dayLabel}s.`,
      isClosed: true,
      operatingPeriods: [],
      availableSlots: [],
      bookedSlots: [],
      timeOffBlocks: []
    };
  }

  // 4. Check Instructor Days Off (Time Off blocks)
  const allTimeOff = await getTimeOffBlocks(instructorId);
  const dateBlocks = allTimeOff.filter(b => {
    if (normalizeDate(b.date) !== normDate) return false;
    if (instructorId && b.instructorId && b.instructorId.toLowerCase() !== instructorId.toLowerCase()) {
      return false;
    }
    return true;
  });

  const fullDayOff = dateBlocks.find(b => Boolean(b.isFullDay));
  if (fullDayOff) {
    return {
      available: false,
      date: normDate,
      reason: "INSTRUCTOR_DAY_OFF",
      message: fullDayOff.reason || "Instructor is off on this date.",
      isClosed: true,
      isDayOff: true,
      operatingPeriods: effectivePeriods,
      availableSlots: [],
      bookedSlots: [{ time: 'FULL_DAY', reason: fullDayOff.reason || 'Instructor Day Off', isFullDay: true }],
      timeOffBlocks: dateBlocks.map(b => ({
        id: b.id,
        isFullDay: Boolean(b.isFullDay),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason
      }))
    };
  }

  // 5. Gather existing bookings for this date
  const cleanEmail = options.customerEmail?.trim().toLowerCase();
  const cleanPhone = options.customerPhone?.replace(/\D/g, '');
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1000;

  const currentBookings = await getBookings({ includeUnpaid: true });
  const dayBookings = currentBookings.filter(b => {
    if (b.status === 'Cancelled') return false;
    if (options.excludeBookingRef && b.bookingRef && b.bookingRef.toUpperCase() === options.excludeBookingRef.toUpperCase()) {
      return false;
    }
    if (normalizeDate(b.date) !== normDate) {
      return false;
    }

    // Pending timeout check
    if (b.status === 'Pending' || b.paymentStatus === 'unpaid') {
      if (cleanEmail && b.email && b.email.toLowerCase() === cleanEmail) {
        return false; // same student checkout
      }
      if (cleanPhone && b.phone && b.phone.replace(/\D/g, '') === cleanPhone) {
        return false; // same student checkout
      }
      const createdAtMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdAtMs > 0 && (now - createdAtMs) > PENDING_TIMEOUT_MS) {
        return false;
      }
    }

    return true;
  });

  // Map booked slots for return
  const bookedSlotsList: Array<{ time: string; reason?: string; isFullDay?: boolean }> = dayBookings.map(b => ({
    time: b.time,
    reason: 'Booked'
  }));

  // 6. Gather external calendar events
  const externalEvents = getExternalEvents(normDate, instructorId);

  // 7. Generate all candidate slots and filter against blocks and bookings
  const candidateSlots = generateCandidateSlots(effectivePeriods, durationMinutes, 30);
  const availableSlots: string[] = [];

  for (const candidate of candidateSlots) {
    const candidateInterval = { start: candidate.start, end: candidate.end };

    // Check partial time-off blocks
    let blockedByTimeOff = false;
    for (const b of dateBlocks) {
      let bStart = b.startMinutes ?? (b.startTime ? parseTimeToMinutes(b.startTime) : null);
      let bEnd = b.endMinutes ?? (b.endTime ? parseTimeToMinutes(b.endTime) : null);
      if (bStart !== null && bEnd !== null) {
        if (candidate.start < bEnd && candidate.end > bStart) {
          blockedByTimeOff = true;
          break;
        }
      }
    }
    if (blockedByTimeOff) continue;

    // Check external calendar events
    let blockedByExt = false;
    for (const ev of externalEvents) {
      const evStartWithBuffer = Math.max(0, ev.startMinutes - bufferMinutes);
      const evEndWithBuffer = ev.endMinutes + bufferMinutes;
      if (candidate.start < evEndWithBuffer && candidate.end > evStartWithBuffer) {
        blockedByExt = true;
        break;
      }
    }
    if (blockedByExt) continue;

    // Check existing bookings
    let bookedConflict = false;
    for (const b of dayBookings) {
      const bInterval = parseTimeInterval(b.time);
      if (bInterval) {
        if (isTimeSlotConflicting(candidateInterval, bInterval, bufferMinutes)) {
          bookedConflict = true;
          break;
        }
      } else {
        const cleanT1 = candidate.label.replace(/\s+/g, ' ').toLowerCase();
        const cleanT2 = (b.time || '').replace(/\s+/g, ' ').toLowerCase();
        if (cleanT1 === cleanT2) {
          bookedConflict = true;
          break;
        }
      }
    }
    if (bookedConflict) continue;

    availableSlots.push(candidate.label);
  }

  // 8. If requestedTime is provided, test it specifically
  if (requestedTime) {
    const reqInterval = parseTimeInterval(requestedTime, durationMinutes);
    if (!reqInterval) {
      return {
        available: false,
        date: normDate,
        requestedTime,
        reason: "OUTSIDE_OPERATING_HOURS",
        message: "Invalid time format.",
        operatingPeriods: effectivePeriods,
        availableSlots,
        bookedSlots: bookedSlotsList,
        timeOffBlocks: dateBlocks.map(b => ({
          id: b.id,
          isFullDay: Boolean(b.isFullDay),
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason
        }))
      };
    }

    // Check if within operating periods
    const fitsOperatingPeriod = effectivePeriods.some(p => {
      const pStart = p.startMinutes ?? (p.start ? parseTimeToMinutes(p.start) : null);
      const pEnd = p.endMinutes ?? (p.end ? parseTimeToMinutes(p.end) : null);
      return pStart !== null && pEnd !== null && reqInterval.start >= pStart && reqInterval.end <= pEnd;
    });

    if (!fitsOperatingPeriod) {
      return {
        available: false,
        date: normDate,
        requestedTime,
        reason: "OUTSIDE_OPERATING_HOURS",
        message: `Requested time ${requestedTime} is outside operating hours for ${dayLabel}.`,
        operatingPeriods: effectivePeriods,
        availableSlots,
        bookedSlots: bookedSlotsList,
        timeOffBlocks: dateBlocks.map(b => ({
          id: b.id,
          isFullDay: Boolean(b.isFullDay),
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason
        }))
      };
    }

    // Check partial time off
    for (const b of dateBlocks) {
      const bStart = b.startMinutes ?? (b.startTime ? parseTimeToMinutes(b.startTime) : null);
      const bEnd = b.endMinutes ?? (b.endTime ? parseTimeToMinutes(b.endTime) : null);
      if (bStart !== null && bEnd !== null && reqInterval.start < bEnd && reqInterval.end > bStart) {
        return {
          available: false,
          date: normDate,
          requestedTime,
          reason: "INSTRUCTOR_DAY_OFF",
          message: b.reason || "Instructor is off during this time window.",
          isDayOff: true,
          operatingPeriods: effectivePeriods,
          availableSlots,
          bookedSlots: bookedSlotsList,
          timeOffBlocks: dateBlocks.map(blk => ({
            id: blk.id,
            isFullDay: Boolean(blk.isFullDay),
            startTime: blk.startTime,
            endTime: blk.endTime,
            reason: blk.reason
          }))
        };
      }
    }

    // Check existing booking conflict
    for (const b of dayBookings) {
      const bInterval = parseTimeInterval(b.time);
      let conflicts = false;
      if (bInterval) {
        conflicts = isTimeSlotConflicting(reqInterval, bInterval, bufferMinutes);
      } else {
        conflicts = requestedTime.toLowerCase() === (b.time || '').toLowerCase();
      }

      if (conflicts) {
        return {
          available: false,
          date: normDate,
          requestedTime,
          reason: "SLOT_ALREADY_BOOKED",
          message: "This time slot is no longer available. Please choose another time.",
          operatingPeriods: effectivePeriods,
          availableSlots,
          bookedSlots: bookedSlotsList,
          timeOffBlocks: dateBlocks.map(blk => ({
            id: blk.id,
            isFullDay: Boolean(blk.isFullDay),
            startTime: blk.startTime,
            endTime: blk.endTime,
            reason: blk.reason
          }))
        };
      }
    }

    return {
      available: true,
      date: normDate,
      requestedTime,
      reason: "AVAILABLE",
      message: "Time slot is available.",
      operatingPeriods: effectivePeriods,
      availableSlots,
      bookedSlots: bookedSlotsList,
      timeOffBlocks: dateBlocks.map(b => ({
        id: b.id,
        isFullDay: Boolean(b.isFullDay),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason
      }))
    };
  }

  // 9. Day-level evaluation (no specific requestedTime)
  const isFullyBooked = candidateSlots.length > 0 && availableSlots.length === 0;
  if (isFullyBooked) {
    return {
      available: false,
      date: normDate,
      reason: "FULLY_BOOKED",
      message: "All time slots for this date are fully booked.",
      isFullyBooked: true,
      operatingPeriods: effectivePeriods,
      availableSlots: [],
      bookedSlots: bookedSlotsList,
      timeOffBlocks: dateBlocks.map(b => ({
        id: b.id,
        isFullDay: Boolean(b.isFullDay),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason
      }))
    };
  }

  return {
    available: availableSlots.length > 0,
    date: normDate,
    reason: availableSlots.length > 0 ? "AVAILABLE" : "OUTSIDE_OPERATING_HOURS",
    message: availableSlots.length > 0 ? "Date is available for booking." : "No bookable slots found.",
    operatingPeriods: effectivePeriods,
    availableSlots,
    bookedSlots: bookedSlotsList,
    timeOffBlocks: dateBlocks.map(b => ({
      id: b.id,
      isFullDay: Boolean(b.isFullDay),
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason
    }))
  };
}

/**
 * Calculate full availability for every calendar day in a month (1-12)
 * Handles February (28/29 leap year), 30/31 day months, and year changes.
 */
export async function getMonthAvailability(options: {
  year: number;
  month: number; // 1-12
  instructorId?: string;
  durationMinutes?: number;
}): Promise<MonthAvailabilityResult> {
  const { year, month } = options;
  const instructorId = options.instructorId || 'wally';
  const durationMinutes = options.durationMinutes || 60;

  // Exact number of days in month using UTC (prevents timezone shifts)
  // Note: Date.UTC(year, month, 0) uses 1-indexed month parameter to get the last day of that month!
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const days: Record<string, DayAvailabilityResult> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayCheck = await getAvailability({
      date: dateStr,
      instructorId,
      durationMinutes
    });

    const { dayIndex, dayKey, dayLabel } = getDayKeyAndIndexFromDateStr(dateStr);

    let displayReason = '';
    if (dayCheck.reason === 'INSTRUCTOR_DAY_OFF') {
      displayReason = dayCheck.message || 'Instructor Day Off';
    } else if (dayCheck.reason === 'SCHOOL_CLOSED') {
      displayReason = dayCheck.message || 'School Closed';
    } else if (dayCheck.reason === 'OUTSIDE_OPERATING_HOURS') {
      displayReason = `Closed on ${dayLabel}s`;
    } else if (dayCheck.reason === 'FULLY_BOOKED') {
      displayReason = 'Fully Booked';
    } else {
      displayReason = 'Available';
    }

    days[dateStr] = {
      date: dateStr,
      day: d,
      dayKey,
      dayLabel,
      isOperatingDay: !dayCheck.isClosed && dayCheck.reason !== 'OUTSIDE_OPERATING_HOURS' && dayCheck.reason !== 'SCHOOL_CLOSED',
      isAvailable: dayCheck.available,
      isDayOff: Boolean(dayCheck.isDayOff),
      isFullyBooked: Boolean(dayCheck.isFullyBooked),
      reason: dayCheck.reason,
      displayReason,
      operatingPeriods: dayCheck.operatingPeriods,
      availableSlotsCount: dayCheck.availableSlots.length,
      totalSlotsCount: dayCheck.availableSlots.length + dayCheck.bookedSlots.length,
      availableSlots: dayCheck.availableSlots,
      bookedSlots: dayCheck.bookedSlots,
      timeOffBlocks: dayCheck.timeOffBlocks
    };
  }

  return {
    year,
    month,
    instructorId,
    days
  };
}
