// Authoritative Operating Hours Management
// Multi-tier resilience: Backend API -> Direct Supabase -> LocalStorage Cache -> Standard 7-Day Default

import { WeeklyOperatingHours, computeDisabledDays } from '../types/availability';
import { apiUrl } from './api';
import { getSupabase } from './supabase';

export interface OperatingHoursSettings {
  operatingHours: WeeklyOperatingHours;
  disabledDays: number[];
  bufferMinutes: number;
  timezone: string;
  minNoticeHours?: number;
  maxAdvanceDays?: number;
  updatedAt?: string;
}

export const STORAGE_KEY_OPERATING_SETTINGS = 'wallys_operating_settings';

export const DEFAULT_OPERATING_HOURS: WeeklyOperatingHours = {
  monday: { day: 'monday', enabled: true, label: 'Monday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  tuesday: { day: 'tuesday', enabled: true, label: 'Tuesday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  wednesday: { day: 'wednesday', enabled: true, label: 'Wednesday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  thursday: { day: 'thursday', enabled: true, label: 'Thursday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  friday: { day: 'friday', enabled: true, label: 'Friday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  saturday: { day: 'saturday', enabled: true, label: 'Saturday', periods: [{ start: '08:00 AM', end: '05:00 PM', startMinutes: 480, endMinutes: 1020 }] },
  sunday: { day: 'sunday', enabled: true, label: 'Sunday', periods: [{ start: '08:00 AM', end: '05:00 PM', startMinutes: 480, endMinutes: 1020 }] }
};

export const DEFAULT_OPERATING_SETTINGS: OperatingHoursSettings = {
  operatingHours: DEFAULT_OPERATING_HOURS,
  disabledDays: [],
  bufferMinutes: 15,
  timezone: 'Australia/Sydney',
  minNoticeHours: 2,
  maxAdvanceDays: 90
};

// Retrieve cached operating settings from localStorage
export function getLocalOperatingSettings(): OperatingHoursSettings {
  if (typeof window === 'undefined') return DEFAULT_OPERATING_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPERATING_SETTINGS);
    if (!raw) return DEFAULT_OPERATING_SETTINGS;
    const parsed = JSON.parse(raw);
    const settings = parsed?.operatingHours ? parsed : (parsed?.settings || parsed?.operatingSettings);
    if (settings && settings.operatingHours) {
      const disabledDays = Array.isArray(settings.disabledDays)
        ? settings.disabledDays
        : computeDisabledDays(settings.operatingHours);

      return {
        operatingHours: settings.operatingHours,
        disabledDays,
        bufferMinutes: typeof settings.bufferMinutes === 'number' ? settings.bufferMinutes : 15,
        timezone: settings.timezone || 'Australia/Sydney',
        minNoticeHours: typeof settings.minNoticeHours === 'number' ? settings.minNoticeHours : 2,
        maxAdvanceDays: typeof settings.maxAdvanceDays === 'number' ? settings.maxAdvanceDays : 90,
        updatedAt: settings.updatedAt
      };
    }
  } catch (err) {
    console.warn('[OperatingHours] Error reading local settings:', err);
  }
  return DEFAULT_OPERATING_SETTINGS;
}

// Persist operating settings to localStorage and notify all components
export function saveLocalOperatingSettings(settings: OperatingHoursSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const disabledDays = computeDisabledDays(settings.operatingHours);
    const payload = {
      ...settings,
      disabledDays,
      updatedAt: settings.updatedAt || new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_OPERATING_SETTINGS, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('wallys-operating-hours-updated', { detail: payload }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('[OperatingHours] Error saving local settings:', err);
  }
}

// Fetch operating settings with complete 3-tier fallback
export async function fetchOperatingSettings(instructorId = 'wally'): Promise<OperatingHoursSettings> {
  // 1. Try Backend API
  try {
    const url = apiUrl(`/api/availability/operating-hours?instructorId=${encodeURIComponent(instructorId)}&_t=${Date.now()}`);
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const settings = data.settings || data;
      if (settings && settings.operatingHours) {
        const disabledDays = Array.isArray(data.disabledDays)
          ? data.disabledDays
          : computeDisabledDays(settings.operatingHours);

        const fullSettings: OperatingHoursSettings = {
          operatingHours: settings.operatingHours,
          disabledDays,
          bufferMinutes: typeof settings.bufferMinutes === 'number' ? settings.bufferMinutes : 15,
          timezone: settings.timezone || 'Australia/Sydney',
          minNoticeHours: typeof settings.minNoticeHours === 'number' ? settings.minNoticeHours : 2,
          maxAdvanceDays: typeof settings.maxAdvanceDays === 'number' ? settings.maxAdvanceDays : 90,
          updatedAt: settings.updatedAt
        };

        saveLocalOperatingSettings(fullSettings);
        return fullSettings;
      }
    }
  } catch (err) {
    console.warn('[OperatingHours] Backend API request failed, checking Supabase/LocalStorage:', err);
  }

  // 2. Direct Supabase Fallback (Crucial for static hosting on Hostinger or serverless cold starts)
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('instructor_settings')
        .select('*')
        .eq('instructor_id', instructorId)
        .maybeSingle();

      if (!error && data) {
        const rawJson = data.settings_json;
        const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        if (parsed && parsed.operatingHours) {
          const disabledDays = Array.isArray(parsed.disabledDays)
            ? parsed.disabledDays
            : computeDisabledDays(parsed.operatingHours);

          const sbSettings: OperatingHoursSettings = {
            operatingHours: parsed.operatingHours,
            disabledDays,
            bufferMinutes: typeof parsed.bufferMinutes === 'number' ? parsed.bufferMinutes : 15,
            timezone: parsed.timezone || 'Australia/Sydney',
            minNoticeHours: typeof parsed.minNoticeHours === 'number' ? parsed.minNoticeHours : 2,
            maxAdvanceDays: typeof parsed.maxAdvanceDays === 'number' ? parsed.maxAdvanceDays : 90,
            updatedAt: parsed.updatedAt || data.updated_at
          };

          saveLocalOperatingSettings(sbSettings);
          return sbSettings;
        }
      }
    } catch (sbErr) {
      console.warn('[OperatingHours] Supabase query error:', sbErr);
    }
  }

  // 3. Fallback to LocalStorage cache or default
  return getLocalOperatingSettings();
}

// Persist instructor settings across API, Supabase, and LocalStorage
export async function persistOperatingSettings(
  settings: OperatingHoursSettings,
  instructorId = 'wally'
): Promise<boolean> {
  const disabledDays = computeDisabledDays(settings.operatingHours);
  const nowIso = new Date().toISOString();
  const fullSettings: OperatingHoursSettings = {
    ...settings,
    disabledDays,
    updatedAt: nowIso
  };

  // 1. Instant local persistence
  saveLocalOperatingSettings(fullSettings);

  // 2. Save via Backend API
  let apiSuccess = false;
  try {
    const token = (typeof window !== 'undefined' && localStorage.getItem('instructor_token')) || 'wally_owner_session';
    const res = await fetch(apiUrl('/api/instructor/operating-hours'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-instructor-token': token,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        instructorId,
        operatingHours: fullSettings.operatingHours,
        bufferMinutes: fullSettings.bufferMinutes,
        timezone: fullSettings.timezone,
        minNoticeHours: fullSettings.minNoticeHours,
        maxAdvanceDays: fullSettings.maxAdvanceDays
      })
    });
    if (res.ok) {
      apiSuccess = true;
    }
  } catch (err) {
    console.warn('[OperatingHours] Backend API save failed:', err);
  }

  // 3. Direct Supabase Sync
  const client = getSupabase();
  if (client) {
    try {
      await client
        .from('instructor_settings')
        .upsert({
          instructor_id: instructorId,
          settings_json: fullSettings,
          updated_at: nowIso
        }, { onConflict: 'instructor_id' });
    } catch (sbErr) {
      console.warn('[OperatingHours] Supabase direct sync error:', sbErr);
    }
  }

  return apiSuccess;
}

// Complete data reset: Clears all operating time, day off blocks, and restores pristine 7-day schedule
export async function clearAllAvailabilityData(instructorId = 'wally'): Promise<OperatingHoursSettings> {
  if (typeof window !== 'undefined') {
    // 1. Wipe client localStorage caches
    localStorage.removeItem('wallys_time_off_blocks_v3');
    localStorage.removeItem('wallys_time_off_blocks_v2');
    localStorage.removeItem('wallys_time_off_blocks_v1');
    localStorage.removeItem('wallys_deleted_time_off_tombstones');
    saveLocalOperatingSettings(DEFAULT_OPERATING_SETTINGS);
  }

  // 2. Call backend reset endpoint
  try {
    const token = (typeof window !== 'undefined' && localStorage.getItem('instructor_token')) || 'wally_owner_session';
    await fetch(apiUrl('/api/instructor/reset-all-availability-data'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-instructor-token': token,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ instructorId })
    });
  } catch (err) {
    console.warn('[OperatingHours] Backend reset error:', err);
  }

  // 3. Clear direct Supabase tables if connected
  const client = getSupabase();
  if (client) {
    try {
      await client.from('instructor_time_off').delete().neq('id', 0);
      await client.from('instructor_settings').upsert({
        instructor_id: instructorId,
        settings_json: DEFAULT_OPERATING_SETTINGS,
        updated_at: new Date().toISOString()
      }, { onConflict: 'instructor_id' });
    } catch (sbErr) {
      console.warn('[OperatingHours] Supabase clear error:', sbErr);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallys-availability-reset'));
    window.dispatchEvent(new CustomEvent('wallys-operating-hours-updated', { detail: DEFAULT_OPERATING_SETTINGS }));
    window.dispatchEvent(new Event('storage'));
  }

  return DEFAULT_OPERATING_SETTINGS;
}
