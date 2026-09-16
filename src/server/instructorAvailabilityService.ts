import fs from 'node:fs';
import path from 'node:path';
import { 
  DayKey, 
  DaySchedule, 
  WeeklyOperatingHours, 
  InstructorSettings, 
  TimePeriod, 
  DateOverride, 
  ExternalCalendarEvent, 
  CalendarConnectionConfig 
} from '../types/availability';
import { getBookings } from '../db/queries';
import { getTimeOffBlocks, normalizeDate } from './instructorTimeOffService';

const DATA_DIR = path.join(process.cwd(), 'data');
const OPERATING_HOURS_FILE = path.join(DATA_DIR, 'instructor-operating-hours.json');
const EXTERNAL_EVENTS_FILE = path.join(DATA_DIR, 'external-calendar-events.json');
const CALENDAR_CONN_FILE = path.join(DATA_DIR, 'calendar-connection.json');
const DATE_OVERRIDES_FILE = path.join(DATA_DIR, 'date-overrides.json');

// Parse a time string like "08:00 AM", "8:30 AM", "5:00 PM" into minutes from midnight (0 - 1439)
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

// Format minutes from midnight to "08:00 AM"
export function formatMinutesToTimeStr(minutes: number): string {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  const mPadded = String(m).padStart(2, '0');
  return `${String(displayH).padStart(2, '0')}:${mPadded} ${ampm}`;
}

// Parse standard interval string e.g. "10:00 AM – 11:30 AM" or "10:00 AM" into start & end minutes
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

// Given a date string YYYY-MM-DD, returns the DayKey ('monday'..'sunday') using UTC to avoid client timezone distortion
export function getDayKeyFromDateStr(dateStr: string): DayKey {
  const norm = normalizeDate(dateStr);
  const parts = norm.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return 'monday';
  }
  const [y, m, d] = parts;
  const dayIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const mapping: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return mapping[dayIdx] || 'monday';
}

// Convert DayKey to day-of-week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
export function dayKeyToDayIndex(day: DayKey): number {
  const mapping: Record<DayKey, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  return mapping[day];
}

// Default initial schedule for Wally Driving School
const DEFAULT_WEEKLY_HOURS: WeeklyOperatingHours = {
  monday: {
    day: 'monday',
    label: 'Monday',
    enabled: true,
    periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }]
  },
  tuesday: {
    day: 'tuesday',
    label: 'Tuesday',
    enabled: true,
    periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }]
  },
  wednesday: {
    day: 'wednesday',
    label: 'Wednesday',
    enabled: true,
    periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }]
  },
  thursday: {
    day: 'thursday',
    label: 'Thursday',
    enabled: true,
    periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }]
  },
  friday: {
    day: 'friday',
    label: 'Friday',
    enabled: true,
    periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }]
  },
  saturday: {
    day: 'saturday',
    label: 'Saturday',
    enabled: true,
    periods: [{ start: '08:00 AM', end: '05:00 PM', startMinutes: 480, endMinutes: 1020 }]
  },
  sunday: {
    day: 'sunday',
    label: 'Sunday',
    enabled: true,
    periods: [{ start: '08:00 AM', end: '05:00 PM', startMinutes: 480, endMinutes: 1020 }]
  }
};

const DEFAULT_SETTINGS: InstructorSettings = {
  instructorId: 'wally',
  instructorName: 'Wally',
  timezone: 'Australia/Sydney',
  bufferMinutes: 15,
  minNoticeHours: 2,
  maxAdvanceDays: 60,
  operatingHours: DEFAULT_WEEKLY_HOURS,
  updatedAt: '1970-01-01T00:00:00.000Z'
};

// In-memory cache for high-throughput responses
let cachedSettings: InstructorSettings = { ...DEFAULT_SETTINGS };
let cachedExternalEvents: ExternalCalendarEvent[] = [];
let cachedCalendarConn: CalendarConnectionConfig = {
  instructorId: 'wally',
  provider: 'google',
  isConnected: false,
  eventsCount: 0
};
let cachedDateOverrides: DateOverride[] = [];
let isInitialized = false;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[AvailabilityService] Warning creating data dir:', err);
  }
}

function initService() {
  if (isInitialized) return;
  ensureDataDir();

  // 1. Operating Hours
  try {
    if (fs.existsSync(OPERATING_HOURS_FILE)) {
      const raw = fs.readFileSync(OPERATING_HOURS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.operatingHours) {
        cachedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          operatingHours: {
            ...DEFAULT_WEEKLY_HOURS,
            ...parsed.operatingHours
          }
        };
      }
    } else {
      fs.writeFileSync(OPERATING_HOURS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[AvailabilityService] Error loading operating hours:', err);
  }

  // 2. External Calendar Events
  try {
    if (fs.existsSync(EXTERNAL_EVENTS_FILE)) {
      const raw = fs.readFileSync(EXTERNAL_EVENTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) cachedExternalEvents = parsed;
    } else {
      fs.writeFileSync(EXTERNAL_EVENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[AvailabilityService] Error loading external events:', err);
  }

  // 3. Calendar Connection
  try {
    if (fs.existsSync(CALENDAR_CONN_FILE)) {
      const raw = fs.readFileSync(CALENDAR_CONN_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed) cachedCalendarConn = parsed;
    } else {
      fs.writeFileSync(CALENDAR_CONN_FILE, JSON.stringify(cachedCalendarConn, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[AvailabilityService] Error loading calendar connection:', err);
  }

  // 4. Date Overrides
  try {
    if (fs.existsSync(DATE_OVERRIDES_FILE)) {
      const raw = fs.readFileSync(DATE_OVERRIDES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) cachedDateOverrides = parsed;
    } else {
      fs.writeFileSync(DATE_OVERRIDES_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[AvailabilityService] Error loading date overrides:', err);
  }

  isInitialized = true;
}

// -------------------------------------------------------------
// OPERATING HOURS API METHODS
// -------------------------------------------------------------

export function getInstructorSettings(instructorId = 'wally'): InstructorSettings {
  initService();
  return cachedSettings;
}

export function saveInstructorSettings(newSettings: Partial<InstructorSettings>): InstructorSettings {
  initService();

  // Normalize operating hours periods to guarantee startMinutes and endMinutes exist
  let updatedOperatingHours = { ...cachedSettings.operatingHours };
  if (newSettings.operatingHours) {
    const keys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const key of keys) {
      const dayData = newSettings.operatingHours[key];
      if (dayData) {
        const normalizedPeriods: TimePeriod[] = (dayData.periods || []).map(p => {
          const sMin = p.startMinutes ?? parseTimeToMinutes(p.start);
          const eMin = p.endMinutes ?? parseTimeToMinutes(p.end);
          return {
            start: p.start || formatMinutesToTimeStr(sMin),
            end: p.end || formatMinutesToTimeStr(eMin),
            startMinutes: sMin,
            endMinutes: eMin
          };
        }).filter(p => p.endMinutes > p.startMinutes);

        // If enabled and no periods, provide standard default
        if (dayData.enabled && normalizedPeriods.length === 0) {
          const def = DEFAULT_WEEKLY_HOURS[key].periods[0];
          normalizedPeriods.push(def);
        }

        updatedOperatingHours[key] = {
          day: key,
          label: dayData.label || DEFAULT_WEEKLY_HOURS[key].label,
          enabled: Boolean(dayData.enabled),
          periods: normalizedPeriods
        };
      }
    }
  }

  cachedSettings = {
    ...cachedSettings,
    ...newSettings,
    bufferMinutes: typeof newSettings.bufferMinutes === 'number' ? newSettings.bufferMinutes : cachedSettings.bufferMinutes,
    timezone: newSettings.timezone || cachedSettings.timezone || 'Australia/Sydney',
    operatingHours: updatedOperatingHours,
    updatedAt: new Date().toISOString()
  };

  try {
    ensureDataDir();
    fs.writeFileSync(OPERATING_HOURS_FILE, JSON.stringify(cachedSettings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AvailabilityService] Error saving settings to disk:', err);
  }

  return cachedSettings;
}

// Return list of day of week numbers (0-6) that are completely disabled
export function getDisabledDaysOfWeek(instructorId = 'wally'): number[] {
  initService();
  const disabled: number[] = [];
  const keys: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  keys.forEach((key, idx) => {
    const daySched = cachedSettings.operatingHours[key];
    if (!daySched || !daySched.enabled || daySched.periods.length === 0) {
      disabled.push(idx);
    }
  });
  return disabled;
}

// -------------------------------------------------------------
// DATE OVERRIDES & EXCEPTIONS
// -------------------------------------------------------------

export function getDateOverrides(instructorId = 'wally'): DateOverride[] {
  initService();
  return cachedDateOverrides;
}

export function addDateOverride(override: Omit<DateOverride, 'id' | 'createdAt' | 'updatedAt'>): DateOverride {
  initService();
  const normDate = normalizeDate(override.date);
  const newOverride: DateOverride = {
    ...override,
    id: `override_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: normDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Replace any existing override for the same date
  cachedDateOverrides = cachedDateOverrides.filter(o => o.date !== normDate);
  cachedDateOverrides.push(newOverride);

  try {
    ensureDataDir();
    fs.writeFileSync(DATE_OVERRIDES_FILE, JSON.stringify(cachedDateOverrides, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AvailabilityService] Error saving date overrides:', err);
  }

  return newOverride;
}

export function deleteDateOverride(idOrDate: string): boolean {
  initService();
  const norm = normalizeDate(idOrDate);
  const beforeLen = cachedDateOverrides.length;
  cachedDateOverrides = cachedDateOverrides.filter(o => o.id !== idOrDate && o.date !== norm);

  if (cachedDateOverrides.length !== beforeLen) {
    try {
      ensureDataDir();
      fs.writeFileSync(DATE_OVERRIDES_FILE, JSON.stringify(cachedDateOverrides, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AvailabilityService] Error saving date overrides:', err);
    }
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// EXTERNAL CALENDAR SYNC & EVENTS
// -------------------------------------------------------------

export function getCalendarConnection(instructorId = 'wally'): CalendarConnectionConfig {
  initService();
  return {
    ...cachedCalendarConn,
    eventsCount: cachedExternalEvents.length
  };
}

export function updateCalendarConnection(updates: Partial<CalendarConnectionConfig>): CalendarConnectionConfig {
  initService();
  cachedCalendarConn = {
    ...cachedCalendarConn,
    ...updates,
    eventsCount: cachedExternalEvents.length
  };

  try {
    ensureDataDir();
    fs.writeFileSync(CALENDAR_CONN_FILE, JSON.stringify(cachedCalendarConn, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AvailabilityService] Error saving calendar connection:', err);
  }

  return cachedCalendarConn;
}

export function getExternalEvents(dateFilter?: string, instructorId = 'wally'): ExternalCalendarEvent[] {
  initService();
  if (dateFilter) {
    const norm = normalizeDate(dateFilter);
    return cachedExternalEvents.filter(e => e.date === norm);
  }
  return cachedExternalEvents;
}

export function addExternalEvent(event: Omit<ExternalCalendarEvent, 'id' | 'createdAt'>): ExternalCalendarEvent {
  initService();
  const normDate = normalizeDate(event.date);
  const sMin = event.startMinutes ?? parseTimeToMinutes(event.startTime);
  const eMin = event.endMinutes ?? parseTimeToMinutes(event.endTime);

  const newEvent: ExternalCalendarEvent = {
    ...event,
    id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: normDate,
    startTime: event.startTime || formatMinutesToTimeStr(sMin),
    endTime: event.endTime || formatMinutesToTimeStr(eMin),
    startMinutes: sMin,
    endMinutes: eMin,
    createdAt: new Date().toISOString()
  };

  cachedExternalEvents.push(newEvent);

  try {
    ensureDataDir();
    fs.writeFileSync(EXTERNAL_EVENTS_FILE, JSON.stringify(cachedExternalEvents, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AvailabilityService] Error saving external events:', err);
  }

  return newEvent;
}

export function deleteExternalEvent(id: string): boolean {
  initService();
  const beforeLen = cachedExternalEvents.length;
  cachedExternalEvents = cachedExternalEvents.filter(e => e.id !== id);

  if (cachedExternalEvents.length !== beforeLen) {
    try {
      ensureDataDir();
      fs.writeFileSync(EXTERNAL_EVENTS_FILE, JSON.stringify(cachedExternalEvents, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AvailabilityService] Error saving external events:', err);
    }
    return true;
  }
  return false;
}

/**
 * Pure TypeScript RFC 5545 iCalendar (ICS) feed parser
 * Parses recurring or single events from Google Calendar / Outlook secret iCal URLs
 */
export async function syncIcalFeed(feedUrl: string, instructorId = 'wally'): Promise<{ success: boolean; eventsCount: number; message: string }> {
  initService();

  if (!feedUrl || !/^https?:\/\//i.test(feedUrl.trim())) {
    return { success: false, eventsCount: 0, message: 'Invalid calendar URL. Must start with http:// or https://' };
  }

  try {
    // Normalise webcal:// to https://
    const fetchUrl = feedUrl.trim().replace(/^webcal:\/\//i, 'https://');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WallysDrivingSchool-CalendarSync/1.0',
        'Accept': 'text/calendar, text/plain, */*'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Calendar feed returned HTTP status ${response.status} ${response.statusText}`);
    }

    const icsText = await response.text();
    const parsedEvents: ExternalCalendarEvent[] = [];

    // Simple robust regex parsing of VEVENT blocks
    const veventBlocks = icsText.split(/BEGIN:VEVENT/i).slice(1);

    for (const block of veventBlocks) {
      const summaryMatch = block.match(/SUMMARY(?::|;[^:]*:)(.*)/i);
      const dtstartMatch = block.match(/DTSTART(?::|;[^:]*:)(.*)/i);
      const dtendMatch = block.match(/DTEND(?::|;[^:]*:)(.*)/i);
      const uidMatch = block.match(/UID(?::|;[^:]*:)(.*)/i);

      if (!dtstartMatch) continue;

      const rawStart = dtstartMatch[1].trim();
      const rawEnd = dtendMatch ? dtendMatch[1].trim() : rawStart;
      const title = summaryMatch ? summaryMatch[1].trim().replace(/\\,/g, ',') : 'Busy';
      const uid = uidMatch ? uidMatch[1].trim() : undefined;

      // Parse date: format YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
      const parseIcalDate = (dStr: string) => {
        const clean = dStr.replace(/[^0-9TZ]/g, '');
        if (clean.length >= 8) {
          const y = parseInt(clean.substring(0, 4), 10);
          const m = parseInt(clean.substring(4, 6), 10);
          const d = parseInt(clean.substring(6, 8), 10);
          let hours = 0;
          let mins = 0;
          if (clean.includes('T') && clean.length >= 13) {
            const tIdx = clean.indexOf('T');
            hours = parseInt(clean.substring(tIdx + 1, tIdx + 3), 10);
            mins = parseInt(clean.substring(tIdx + 3, tIdx + 5), 10);
          }
          return { y, m, d, hours, mins, isAllDay: !clean.includes('T') };
        }
        return null;
      };

      const parsedStart = parseIcalDate(rawStart);
      const parsedEnd = parseIcalDate(rawEnd);

      if (parsedStart) {
        const dateStr = `${parsedStart.y}-${String(parsedStart.m).padStart(2, '0')}-${String(parsedStart.d).padStart(2, '0')}`;
        let sMin = parsedStart.hours * 60 + parsedStart.mins;
        let eMin = parsedEnd ? (parsedEnd.hours * 60 + parsedEnd.mins) : (sMin + 60);

        if (parsedStart.isAllDay) {
          sMin = 480; // 8:00 AM
          eMin = 1080; // 6:00 PM
        }

        if (eMin <= sMin) eMin = sMin + 60;

        parsedEvents.push({
          id: `ext_ical_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          instructorId,
          title,
          date: dateStr,
          startTime: formatMinutesToTimeStr(sMin),
          endTime: formatMinutesToTimeStr(eMin),
          startMinutes: sMin,
          endMinutes: eMin,
          source: 'ical',
          externalId: uid,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Keep manual events and replace previous ical events
    const manualEvents = cachedExternalEvents.filter(e => e.source === 'manual');
    cachedExternalEvents = [...manualEvents, ...parsedEvents];

    try {
      ensureDataDir();
      fs.writeFileSync(EXTERNAL_EVENTS_FILE, JSON.stringify(cachedExternalEvents, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AvailabilityService] Error saving external events:', err);
    }

    updateCalendarConnection({
      feedUrl,
      isConnected: true,
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: 'success',
      lastSyncMessage: `Synchronized ${parsedEvents.length} calendar events successfully.`
    });

    return {
      success: true,
      eventsCount: parsedEvents.length,
      message: `Successfully synchronized ${parsedEvents.length} external calendar events.`
    };
  } catch (err: any) {
    console.error('[AvailabilityService] iCal sync error:', err);
    updateCalendarConnection({
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: 'failed',
      lastSyncMessage: err?.message || 'Failed to fetch calendar feed.'
    });
    return { success: false, eventsCount: 0, message: `Sync failed: ${err.message || err}` };
  }
}

// -------------------------------------------------------------
// CORE AVAILABILITY ENGINE
// -------------------------------------------------------------

export interface SlotAvailabilityValidation {
  available: boolean;
  code?: string;
  reason?: string;
  isTimeOff?: boolean;
  isFullDay?: boolean;
  isOutsideHours?: boolean;
  isExternalConflict?: boolean;
}

/**
 * Returns active working periods for a given date.
 * Takes into account:
 * 1. Date Overrides (full day off -> empty; custom hours -> override periods)
 * 2. Full Day Time-Off blocks (from existing instructorTimeOff table) -> empty
 * 3. Weekly Operating Hours for the date's day of week (if enabled)
 */
export async function getWorkingPeriodsForDate(
  dateStr: string,
  instructorId = 'wally'
): Promise<{
  isAvailable: boolean;
  periods: TimePeriod[];
  unavailableReason?: string;
  isOverride?: boolean;
}> {
  initService();
  const normDate = normalizeDate(dateStr);
  if (!normDate) {
    return { isAvailable: false, periods: [], unavailableReason: 'Invalid date.' };
  }

  // 1. Check Date Overrides
  const override = cachedDateOverrides.find(o => o.date === normDate && (!o.instructorId || o.instructorId === instructorId));
  if (override) {
    if (override.type === 'unavailable' || override.isFullDay) {
      return {
        isAvailable: false,
        periods: [],
        unavailableReason: override.reason || 'Instructor is unavailable on this date (Date Override).',
        isOverride: true
      };
    }
    if (override.type === 'custom_hours' && override.periods && override.periods.length > 0) {
      return {
        isAvailable: true,
        periods: override.periods,
        isOverride: true
      };
    }
  }

  // 2. Check Time Off Blocks (legacy & current Full Day blocks)
  const timeOffBlocks = await getTimeOffBlocks(instructorId);
  const matchingTimeOff = timeOffBlocks.find(b => normalizeDate(b.date) === normDate && b.isFullDay);
  if (matchingTimeOff) {
    return {
      isAvailable: false,
      periods: [],
      unavailableReason: matchingTimeOff.reason || 'Instructor Day Off scheduled.',
      isOverride: true
    };
  }

  // 3. Weekly Operating Hours
  const dayKey = getDayKeyFromDateStr(normDate);
  const daySchedule = cachedSettings.operatingHours[dayKey];

  if (!daySchedule || !daySchedule.enabled || daySchedule.periods.length === 0) {
    return {
      isAvailable: false,
      periods: [],
      unavailableReason: `Instructor does not operate on ${daySchedule?.label || dayKey}s.`
    };
  }

  return {
    isAvailable: true,
    periods: daySchedule.periods
  };
}

/**
 * Validates whether a specific lesson time slot can be booked.
 * Checks:
 * - Operating hours & active periods (must fit completely without crossing breaks)
 * - Existing confirmed/pending student bookings (+ buffer)
 * - External calendar events (+ buffer)
 * - Partial time off blocks
 */
export async function validateLessonSlot(params: {
  date: string;
  time: string;
  durationMinutes?: number;
  customerEmail?: string;
  customerPhone?: string;
  excludeRef?: string;
  instructorId?: string;
}): Promise<SlotAvailabilityValidation> {
  initService();
  const { date, time, durationMinutes = 60, customerEmail, customerPhone, excludeRef, instructorId = 'wally' } = params;

  const normDate = normalizeDate(date);
  if (!normDate) {
    return { available: false, code: 'INVALID_DATE', reason: 'Invalid or missing date.' };
  }

  // Parse candidate slot interval
  const interval = parseTimeInterval(time, durationMinutes);
  if (!interval) {
    return { available: false, code: 'INVALID_TIME', reason: 'Invalid time format.' };
  }

  const slotStart = interval.start;
  const slotEnd = interval.end;
  const buffer = cachedSettings.bufferMinutes ?? 15;

  // 1. Check Working Periods (Day Operating Hours / Overrides / Breaks)
  const workingSchedule = await getWorkingPeriodsForDate(normDate, instructorId);
  if (!workingSchedule.isAvailable || workingSchedule.periods.length === 0) {
    return {
      available: false,
      isTimeOff: true,
      isFullDay: true,
      code: 'DAY_UNAVAILABLE',
      reason: workingSchedule.unavailableReason || 'Instructor is unavailable on this date.'
    };
  }

  // Slot must fit completely inside at least one continuous working period
  const fitsInPeriod = workingSchedule.periods.some(period => {
    return slotStart >= period.startMinutes && slotEnd <= period.endMinutes;
  });

  if (!fitsInPeriod) {
    const periodDescriptions = workingSchedule.periods.map(p => `${p.start} – ${p.end}`).join(', ');
    return {
      available: false,
      isOutsideHours: true,
      code: 'OUTSIDE_OPERATING_HOURS',
      reason: `This lesson time (${time}) falls outside instructor operating hours for this day (${periodDescriptions}).`
    };
  }

  // 2. Check Partial Time-Off Blocks
  const timeOffBlocks = await getTimeOffBlocks(instructorId);
  const dayTimeOff = timeOffBlocks.filter(b => normalizeDate(b.date) === normDate && !b.isFullDay);
  for (const block of dayTimeOff) {
    const bStart = block.startTime ? parseTimeToMinutes(block.startTime) : null;
    const bEnd = block.endTime ? parseTimeToMinutes(block.endTime) : null;

    if (bStart !== null && bEnd !== null) {
      // Overlap: slotStart < bEnd && slotEnd > bStart
      if (slotStart < bEnd && slotEnd > bStart) {
        return {
          available: false,
          isTimeOff: true,
          code: 'INSTRUCTOR_TIME_OFF',
          reason: block.reason || `Blocked period by instructor (${block.startTime} – ${block.endTime}).`
        };
      }
    }
  }

  // 3. Check External Calendar Events (+ buffer)
  const dayExternalEvents = cachedExternalEvents.filter(e => e.date === normDate);
  for (const event of dayExternalEvents) {
    // Intersect check with buffer
    const eventStartWithBuffer = Math.max(0, event.startMinutes - buffer);
    const eventEndWithBuffer = event.endMinutes + buffer;

    if (slotStart < eventEndWithBuffer && slotEnd > eventStartWithBuffer) {
      return {
        available: false,
        isExternalConflict: true,
        code: 'CALENDAR_EVENT_CONFLICT',
        reason: `Conflicts with instructor's external calendar appointment (${event.startTime} – ${event.endTime}).`
      };
    }
  }

  // 4. Check Existing Student Bookings (+ buffer)
  const allBookings = await getBookings({ includeUnpaid: true });
  const cleanEmail = customerEmail?.trim().toLowerCase();
  const cleanPhone = customerPhone?.replace(/\D/g, '');
  const now = Date.now();
  const PENDING_TIMEOUT_MS = 20 * 60 * 1000;

  for (const b of allBookings) {
    if (b.status === 'Cancelled') continue;
    if (excludeRef && b.bookingRef && b.bookingRef.toUpperCase() === excludeRef.toUpperCase()) continue;
    if (normalizeDate(b.date) !== normDate) continue;

    const bInterval = parseTimeInterval(b.time);
    if (!bInterval) continue;

    // Buffer-aware conflict
    const bStartWithBuffer = Math.max(0, bInterval.start - buffer);
    const bEndWithBuffer = bInterval.end + buffer;

    const overlaps = slotStart < bEndWithBuffer && slotEnd > bStartWithBuffer;
    if (!overlaps) continue;

    // If booking is confirmed or paid, unconditionally block
    if (b.status === 'Confirmed' || b.paymentStatus === 'paid') {
      return {
        available: false,
        code: 'SLOT_ALREADY_BOOKED',
        reason: 'Sorry, this time slot was just booked. Please choose another time.'
      };
    }

    // If pending, allow only if same customer is resuming within timeout
    if (b.status === 'Pending' || b.paymentStatus === 'unpaid') {
      if (cleanEmail && b.email && b.email.toLowerCase() === cleanEmail) continue;
      if (cleanPhone && b.phone && b.phone.replace(/\D/g, '') === cleanPhone) continue;

      const createdMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdMs > 0 && (now - createdMs) > PENDING_TIMEOUT_MS) continue;

      return {
        available: false,
        code: 'SLOT_ALREADY_BOOKED',
        reason: 'Sorry, this time slot was just booked. Please choose another time.'
      };
    }
  }

  return { available: true };
}
