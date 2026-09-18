import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { broadcastAvailabilityChange } from '../lib/timeOff';

export interface TimePeriod {
  start: string;
  end: string;
  startMinutes?: number;
  endMinutes?: number;
}

export interface DayOperatingHours {
  enabled: boolean;
  label: string;
  periods: TimePeriod[];
}

export interface WeeklyOperatingHours {
  monday: DayOperatingHours;
  tuesday: DayOperatingHours;
  wednesday: DayOperatingHours;
  thursday: DayOperatingHours;
  friday: DayOperatingHours;
  saturday: DayOperatingHours;
  sunday: DayOperatingHours;
}

const COMMON_START_TIMES = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  '07:00 PM', '07:30 PM', '08:00 PM'
];

const COMMON_END_TIMES = [
  '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM'
];

const BUFFER_OPTIONS = [0, 15, 30, 45, 60];

const DAYS_ORDER: (keyof WeeklyOperatingHours)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const DEFAULT_INITIAL_HOURS: WeeklyOperatingHours = {
  monday: { enabled: true, label: 'Monday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  tuesday: { enabled: true, label: 'Tuesday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  wednesday: { enabled: true, label: 'Wednesday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  thursday: { enabled: true, label: 'Thursday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  friday: { enabled: true, label: 'Friday', periods: [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }] },
  saturday: { enabled: true, label: 'Saturday', periods: [{ start: '08:00 AM', end: '05:00 PM', startMinutes: 480, endMinutes: 1020 }] },
  sunday: { enabled: true, label: 'Sunday', periods: [{ start: '08:00 AM', end: '05:00 PM', startMinutes: 480, endMinutes: 1020 }] }
};

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function computeDisabledDays(hours: WeeklyOperatingHours): number[] {
  const dayKeys: (keyof WeeklyOperatingHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const res: number[] = [];
  dayKeys.forEach((key, idx) => {
    const d = hours[key];
    if (!d || !d.enabled || !d.periods || d.periods.length === 0) {
      res.push(idx);
    }
  });
  return res;
}

function getInitialOperatingState(): { hours: WeeklyOperatingHours; buffer: number; tz: string; hasCache: boolean } {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('wallys_operating_settings') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const hours = parsed.operatingHours || parsed.settings?.operatingHours;
      const buffer = typeof parsed.bufferMinutes === 'number' ? parsed.bufferMinutes : (parsed.settings?.bufferMinutes ?? 15);
      const tz = parsed.timezone || parsed.settings?.timezone || 'Australia/Sydney';
      if (hours && typeof hours === 'object' && hours.monday) {
        return { hours, buffer, tz, hasCache: true };
      }
    }
  } catch {}
  return { hours: DEFAULT_INITIAL_HOURS, buffer: 15, tz: 'Australia/Sydney', hasCache: false };
}

export function InstructorOperatingHours() {
  const initial = useMemo(() => getInitialOperatingState(), []);
  const [operatingHours, setOperatingHours] = useState<WeeklyOperatingHours>(initial.hours);
  const [bufferMinutes, setBufferMinutes] = useState<number>(initial.buffer);
  const [timezone, setTimezone] = useState<string>(initial.tz);
  const [isLoading, setIsLoading] = useState<boolean>(!initial.hasCache);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronous references to eliminate stale closures and fast click race-conditions
  const operatingHoursRef = useRef<WeeklyOperatingHours>(initial.hours);
  const bufferMinutesRef = useRef<number>(initial.buffer);
  const timezoneRef = useRef<string>(initial.tz);
  // 0 means no edits made in this component instance yet, allowing server data to load on refresh
  const lastSavedTimestampRef = useRef<number>(0);

  useEffect(() => {
    operatingHoursRef.current = operatingHours;
  }, [operatingHours]);

  useEffect(() => {
    bufferMinutesRef.current = bufferMinutes;
  }, [bufferMinutes]);

  useEffect(() => {
    timezoneRef.current = timezone;
  }, [timezone]);

  // Load from server in background, smoothly merging if server has newer data
  const loadSettings = useCallback(async () => {
    try {
      const token = (typeof window !== 'undefined' && localStorage.getItem('instructor_token')) || 'wally_owner_session';
      const res = await fetch(`/api/instructor/operating-hours?_t=${Date.now()}`, {
        headers: {
          'x-instructor-token': token,
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        if (settings && settings.operatingHours) {
          const serverTime = settings.updatedAt ? new Date(settings.updatedAt).getTime() : 0;
          if (lastSavedTimestampRef.current === 0 || serverTime >= lastSavedTimestampRef.current) {
            setOperatingHours(settings.operatingHours);
            operatingHoursRef.current = settings.operatingHours;
            if (typeof settings.bufferMinutes === 'number') {
              setBufferMinutes(settings.bufferMinutes);
              bufferMinutesRef.current = settings.bufferMinutes;
            }
            if (settings.timezone) {
              setTimezone(settings.timezone);
              timezoneRef.current = settings.timezone;
            }

            try {
              const disabledDays = data.disabledDays || computeDisabledDays(settings.operatingHours);
              const syncedCache = {
                ...settings,
                disabledDays,
                operatingSettings: {
                  ...settings,
                  disabledDays
                }
              };
              localStorage.setItem('wallys_operating_settings', JSON.stringify(syncedCache));
              window.dispatchEvent(new CustomEvent('wallys-operating-hours-updated', { detail: syncedCache }));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn('[OperatingHours] Background load warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Persist settings immediately to both local storage and server backend
  const persistSettings = async (
    hoursToSave: WeeklyOperatingHours,
    bufferToSave: number,
    tzToSave: string,
    successMsg?: string
  ) => {
    operatingHoursRef.current = hoursToSave;
    bufferMinutesRef.current = bufferToSave;
    timezoneRef.current = tzToSave;
    const nowTs = Date.now();
    lastSavedTimestampRef.current = nowTs;
    const disabledDays = computeDisabledDays(hoursToSave);

    // 1. Immediately write to localStorage so refresh or browser close is 100% sticky & instant
    const cacheObj = {
      operatingHours: hoursToSave,
      disabledDays,
      bufferMinutes: bufferToSave,
      timezone: tzToSave,
      updatedAt: new Date(nowTs).toISOString(),
      operatingSettings: {
        operatingHours: hoursToSave,
        disabledDays,
        bufferMinutes: bufferToSave,
        timezone: tzToSave
      }
    };

    try {
      localStorage.setItem('wallys_operating_settings', JSON.stringify(cacheObj));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('wallys-operating-hours-updated', { detail: cacheObj }));
    } catch {}

    broadcastAvailabilityChange({ 
      action: 'updated', 
      operatingSettings: cacheObj,
      operatingHours: hoursToSave,
      disabledDays
    });

    if (successMsg) {
      setFeedback({ type: 'success', message: successMsg });
      setTimeout(() => setFeedback(null), 3200);
    }

    // 2. Persist to server API
    try {
      const token = (typeof window !== 'undefined' && localStorage.getItem('instructor_token')) || 'wally_owner_session';
      const res = await fetch('/api/instructor/operating-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-instructor-token': token,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          operatingHours: hoursToSave,
          bufferMinutes: bufferToSave,
          timezone: tzToSave
        })
      });

      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        if (lastSavedTimestampRef.current <= nowTs && settings && settings.operatingHours) {
          setOperatingHours(settings.operatingHours);
          operatingHoursRef.current = settings.operatingHours;
          try {
            localStorage.setItem('wallys_operating_settings', JSON.stringify({
              ...cacheObj,
              ...settings,
              disabledDays: data.disabledDays || disabledDays
            }));
          } catch {}
        }
        broadcastAvailabilityChange({ action: 'updated', operatingSettings: cacheObj });
      } else {
        console.warn('[OperatingHours] Server save warning status:', res.status);
      }
    } catch (err: any) {
      console.warn('[OperatingHours] Background sync warning:', err);
    }
  };

  const handleToggleDay = (day: keyof WeeklyOperatingHours) => {
    const currentHours = operatingHoursRef.current;
    const currentDay = currentHours[day];
    const willBeEnabled = !currentDay.enabled;

    // Standard working hours when toggling a day back ON
    const defaultPeriods: TimePeriod[] = (day === 'saturday' || day === 'sunday')
      ? [{ start: '08:00 AM', end: '05:00 PM', startMinutes: 480, endMinutes: 1020 }]
      : [{ start: '08:00 AM', end: '06:00 PM', startMinutes: 480, endMinutes: 1080 }];

    let validPeriods = (currentDay.periods || []).filter(p => p && p.start && p.end);
    if (willBeEnabled && validPeriods.length === 0) {
      validPeriods = defaultPeriods;
    }

    const nextHours: WeeklyOperatingHours = {
      ...currentHours,
      [day]: {
        ...currentDay,
        enabled: willBeEnabled,
        periods: validPeriods
      }
    };

    setOperatingHours(nextHours);
    operatingHoursRef.current = nextHours;

    const shiftDesc = validPeriods.map(p => `${p.start} – ${p.end}`).join(', ');
    const msg = willBeEnabled
      ? `${currentDay.label} is now OPEN (${shiftDesc}). Calendar synced.`
      : `${currentDay.label} is now CLOSED. Calendar synced.`;

    // Auto-save immediately to database, localStorage, and trigger calendar sync
    persistSettings(
      nextHours,
      bufferMinutesRef.current,
      timezoneRef.current,
      msg
    );
  };

  const handleBufferChange = (mins: number) => {
    setBufferMinutes(mins);
    bufferMinutesRef.current = mins;
    persistSettings(
      operatingHoursRef.current,
      mins,
      timezoneRef.current,
      `Buffer time set to ${mins === 0 ? 'none' : `${mins} min`}. Saved automatically.`
    );
  };

  const handleUpdatePeriod = (
    day: keyof WeeklyOperatingHours,
    periodIndex: number,
    field: 'start' | 'end',
    val: string
  ) => {
    const currentHours = operatingHoursRef.current;
    const dayData = currentHours[day];
    const updatedPeriods = [...dayData.periods];
    const target = { ...updatedPeriods[periodIndex], [field]: val };
    target.startMinutes = parseTimeToMinutes(target.start);
    target.endMinutes = parseTimeToMinutes(target.end);
    updatedPeriods[periodIndex] = target;

    const nextHours: WeeklyOperatingHours = {
      ...currentHours,
      [day]: { ...dayData, periods: updatedPeriods }
    };
    setOperatingHours(nextHours);
    operatingHoursRef.current = nextHours;
    persistSettings(nextHours, bufferMinutesRef.current, timezoneRef.current);
  };

  const handleAddPeriod = (day: keyof WeeklyOperatingHours) => {
    const currentHours = operatingHoursRef.current;
    const dayData = currentHours[day];
    const lastPeriod = dayData.periods[dayData.periods.length - 1];
    const newStart = lastPeriod ? lastPeriod.end : '01:00 PM';
    const newEnd = '06:00 PM';

    const nextHours: WeeklyOperatingHours = {
      ...currentHours,
      [day]: {
        ...dayData,
        enabled: true,
        periods: [
          ...dayData.periods,
          {
            start: newStart,
            end: newEnd,
            startMinutes: parseTimeToMinutes(newStart),
            endMinutes: parseTimeToMinutes(newEnd)
          }
        ]
      }
    };
    setOperatingHours(nextHours);
    operatingHoursRef.current = nextHours;
    persistSettings(nextHours, bufferMinutesRef.current, timezoneRef.current, `Added shift for ${dayData.label}. Saved automatically.`);
  };

  const handleDeletePeriod = (day: keyof WeeklyOperatingHours, periodIndex: number) => {
    const currentHours = operatingHoursRef.current;
    const dayData = currentHours[day];
    const updatedPeriods = dayData.periods.filter((_, idx) => idx !== periodIndex);
    const nextHours: WeeklyOperatingHours = {
      ...currentHours,
      [day]: {
        ...dayData,
        enabled: updatedPeriods.length > 0 ? dayData.enabled : false,
        periods: updatedPeriods
      }
    };
    setOperatingHours(nextHours);
    operatingHoursRef.current = nextHours;
    persistSettings(nextHours, bufferMinutesRef.current, timezoneRef.current, `Removed shift for ${dayData.label}. Saved automatically.`);
  };

  const handleCopyMondayToWeekdays = () => {
    const currentHours = operatingHoursRef.current;
    const mondayPeriods = [...currentHours.monday.periods];
    const mondayEnabled = currentHours.monday.enabled;

    const nextHours: WeeklyOperatingHours = {
      ...currentHours,
      tuesday: { ...currentHours.tuesday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) },
      wednesday: { ...currentHours.wednesday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) },
      thursday: { ...currentHours.thursday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) },
      friday: { ...currentHours.friday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) }
    };

    setOperatingHours(nextHours);
    operatingHoursRef.current = nextHours;
    persistSettings(nextHours, bufferMinutesRef.current, timezoneRef.current, 'Monday hours copied to Tuesday through Friday & saved automatically.');
  };

  const handleSaveHours = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await persistSettings(operatingHoursRef.current, bufferMinutesRef.current, timezoneRef.current, 'All operating hours saved successfully.');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center text-neutral-400 border border-neutral-200/80">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-red" />
        <p className="text-sm font-medium">Loading operating hours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-neutral-900 tracking-tight">
            Operating Hours
          </h2>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">
            Set your weekly working hours and lesson buffer time.
          </p>
        </div>

        <button
          onClick={handleSaveHours}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-brand-red text-white font-bold text-sm hover:bg-neutral-900 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Feedback Alert */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "p-3.5 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border shadow-xs",
              feedback.type === 'success'
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            )}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="text-xs sm:text-sm">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buffer Time */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-sm font-bold text-neutral-900">Buffer time between lessons</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {BUFFER_OPTIONS.map(mins => (
            <button
              key={mins}
              onClick={() => handleBufferChange(mins)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                bufferMinutes === mins
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
              )}
            >
              {mins === 0 ? 'None' : `${mins} min`}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Action: Copy Monday */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Weekly Schedule
        </span>
        <button
          onClick={handleCopyMondayToWeekdays}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-neutral-200/60 transition-colors"
        >
          <Copy className="w-3.5 h-3.5 text-neutral-400" />
          <span>Copy Monday to Weekdays</span>
        </button>
      </div>

      {/* Days List */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs divide-y divide-neutral-100 overflow-hidden">
        {DAYS_ORDER.map(dayKey => {
          const day = operatingHours[dayKey];
          const isClosed = !day.enabled || day.periods.length === 0;

          return (
            <div
              key={dayKey}
              className={cn(
                "p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4",
                isClosed ? "bg-neutral-50/50" : "bg-white"
              )}
            >
              {/* Day & Toggle */}
              <div className="flex items-center gap-3 min-w-[150px]">
                <button
                  type="button"
                  onClick={() => handleToggleDay(dayKey)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    day.enabled ? "bg-brand-red" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                      day.enabled ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>

                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-neutral-900">
                    {day.label}
                  </span>
                  {isClosed && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-500">
                      Closed
                    </span>
                  )}
                </div>
              </div>

              {/* Time Periods */}
              <div className="flex-1 flex flex-col gap-2">
                {isClosed ? (
                  <span className="text-xs text-neutral-400">Closed</span>
                ) : (
                  day.periods.map((period, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <select
                          value={period.start}
                          onChange={e => handleUpdatePeriod(dayKey, pIdx, 'start', e.target.value)}
                          className="bg-transparent text-xs font-semibold text-neutral-800 focus:outline-none cursor-pointer"
                        >
                          {COMMON_START_TIMES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>

                        <span className="text-neutral-400 text-xs">to</span>

                        <select
                          value={period.end}
                          onChange={e => handleUpdatePeriod(dayKey, pIdx, 'end', e.target.value)}
                          className="bg-transparent text-xs font-semibold text-neutral-800 focus:outline-none cursor-pointer"
                        >
                          {COMMON_END_TIMES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Remove Period (if multiple) */}
                      {day.periods.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePeriod(dayKey, pIdx)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="Remove period"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Minimal + button to add extra period if open */}
              {!isClosed && (
                <div className="shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleAddPeriod(dayKey)}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                    title="Add another time interval"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
