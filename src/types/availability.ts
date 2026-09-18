// Instructor Availability, Operating Hours, Calendar Integration Types

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimePeriod {
  start: string; // e.g. "08:00 AM"
  end: string;   // e.g. "06:00 PM"
  startMinutes: number; // e.g. 480
  endMinutes: number;   // e.g. 1080
}

export interface DaySchedule {
  day: DayKey;
  label: string; // e.g. "Monday"
  enabled: boolean;
  periods: TimePeriod[]; // Multiple periods support breaks (e.g. 8-12, 1-6)
}

export interface WeeklyOperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface InstructorSettings {
  instructorId: string;
  instructorName: string;
  timezone: string; // Default: 'Australia/Sydney'
  bufferMinutes: number; // Default: 15 (e.g. 0, 15, 30, 45)
  minNoticeHours: number; // Default: 2 hours notice
  maxAdvanceDays: number; // Default: 60 days in advance
  operatingHours: WeeklyOperatingHours;
  updatedAt: string;
}

export interface DateOverride {
  id: string;
  instructorId: string;
  date: string; // YYYY-MM-DD
  type: 'unavailable' | 'custom_hours';
  isFullDay: boolean;
  periods?: TimePeriod[];
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalCalendarEvent {
  id: string;
  instructorId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "02:00 PM"
  endTime: string;   // e.g. "03:30 PM"
  startMinutes: number;
  endMinutes: number;
  source: 'google' | 'outlook' | 'ical' | 'manual';
  externalId?: string;
  createdAt: string;
}

export interface CalendarConnectionConfig {
  instructorId: string;
  provider: 'google' | 'outlook' | 'ical';
  feedUrl?: string;
  isConnected: boolean;
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
  lastSyncMessage?: string;
  eventsCount: number;
}

export interface AvailabilityPayload {
  operatingHours: WeeklyOperatingHours;
  bufferMinutes: number;
  timezone: string;
  disabledDaysOfWeek: number[]; // 0 for Sunday, 1 for Monday, etc.
  dateOverrides: DateOverride[];
  externalEvents: ExternalCalendarEvent[];
  calendarConnection: CalendarConnectionConfig;
}

export function computeDisabledDays(hours?: WeeklyOperatingHours | Record<string, any>): number[] {
  if (!hours) return [];
  const daysMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  const disabled: number[] = [];
  Object.entries(hours).forEach(([key, val]: [string, any]) => {
    if (!val || !val.enabled || !val.periods || val.periods.length === 0) {
      if (typeof daysMap[key] === 'number') {
        disabled.push(daysMap[key]);
      }
    }
  });
  return disabled;
}
