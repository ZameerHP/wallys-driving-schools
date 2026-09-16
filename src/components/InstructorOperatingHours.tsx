import React, { useState, useEffect, useCallback } from 'react';
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

export function InstructorOperatingHours() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [operatingHours, setOperatingHours] = useState<WeeklyOperatingHours>({
    monday: { enabled: true, label: 'Monday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
    tuesday: { enabled: true, label: 'Tuesday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
    wednesday: { enabled: true, label: 'Wednesday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
    thursday: { enabled: true, label: 'Thursday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
    friday: { enabled: true, label: 'Friday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
    saturday: { enabled: true, label: 'Saturday', periods: [{ start: '08:00 AM', end: '05:00 PM' }] },
    sunday: { enabled: false, label: 'Sunday', periods: [] }
  });
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [timezone, setTimezone] = useState('Australia/Sydney');

  const loadSettings = useCallback(async () => {
    try {
      const cached = localStorage.getItem('wallys_operating_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        const hours = parsed.operatingHours || parsed.settings?.operatingHours;
        if (hours) setOperatingHours(hours);
        const buf = typeof parsed.bufferMinutes === 'number' ? parsed.bufferMinutes : parsed.settings?.bufferMinutes;
        if (typeof buf === 'number') setBufferMinutes(buf);
        const tz = parsed.timezone || parsed.settings?.timezone;
        if (tz) setTimezone(tz);
      }
    } catch {}

    setIsLoading(true);
    try {
      const headers = { 'x-instructor-token': 'wally_owner_session' };
      const res = await fetch(`/api/instructor/operating-hours?_t=${Date.now()}`, {
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data;
        if (settings) {
          if (settings.operatingHours) setOperatingHours(settings.operatingHours);
          if (typeof settings.bufferMinutes === 'number') setBufferMinutes(settings.bufferMinutes);
          if (settings.timezone) setTimezone(settings.timezone);

          try {
            localStorage.setItem('wallys_operating_settings', JSON.stringify(settings));
          } catch {}
        }
      }
    } catch (err) {
      console.error('[OperatingHours] Failed to load settings:', err);
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
    // 1. Immediately write to localStorage so refresh is 100% instant & never loses state
    try {
      localStorage.setItem('wallys_operating_settings', JSON.stringify({
        operatingHours: hoursToSave,
        bufferMinutes: bufferToSave,
        timezone: tzToSave,
        updatedAt: new Date().toISOString()
      }));
    } catch {}

    broadcastAvailabilityChange();

    // 2. Persist to server API
    try {
      const res = await fetch('/api/instructor/operating-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-instructor-token': 'wally_owner_session'
        },
        body: JSON.stringify({
          operatingHours: hoursToSave,
          bufferMinutes: bufferToSave,
          timezone: tzToSave
        })
      });

      if (res.ok) {
        broadcastAvailabilityChange();
        if (successMsg) {
          setFeedback({ type: 'success', message: successMsg });
          setTimeout(() => setFeedback(null), 3000);
        }
      }
    } catch (err: any) {
      console.warn('[OperatingHours] Save background error:', err);
    }
  };

  const handleToggleDay = (day: keyof WeeklyOperatingHours) => {
    const current = operatingHours[day];
    const willBeEnabled = !current.enabled;
    const nextHours: WeeklyOperatingHours = {
      ...operatingHours,
      [day]: {
        ...current,
        enabled: willBeEnabled,
        periods: willBeEnabled && current.periods.length === 0
          ? [{ start: '08:00 AM', end: '06:00 PM' }]
          : current.periods
      }
    };
    setOperatingHours(nextHours);

    // Auto-save immediately so refreshing the page never turns it back on!
    persistSettings(
      nextHours,
      bufferMinutes,
      timezone,
      `${nextHours[day].label} is now ${willBeEnabled ? 'open' : 'closed'}. Saved automatically.`
    );
  };

  const handleBufferChange = (mins: number) => {
    setBufferMinutes(mins);
    persistSettings(
      operatingHours,
      mins,
      timezone,
      `Buffer time set to ${mins === 0 ? 'none' : `${mins} min`}. Saved automatically.`
    );
  };

  const handleUpdatePeriod = (
    day: keyof WeeklyOperatingHours,
    periodIndex: number,
    field: 'start' | 'end',
    val: string
  ) => {
    const dayData = operatingHours[day];
    const updatedPeriods = [...dayData.periods];
    updatedPeriods[periodIndex] = {
      ...updatedPeriods[periodIndex],
      [field]: val
    };
    const nextHours: WeeklyOperatingHours = {
      ...operatingHours,
      [day]: { ...dayData, periods: updatedPeriods }
    };
    setOperatingHours(nextHours);
    persistSettings(nextHours, bufferMinutes, timezone);
  };

  const handleAddPeriod = (day: keyof WeeklyOperatingHours) => {
    const dayData = operatingHours[day];
    const lastPeriod = dayData.periods[dayData.periods.length - 1];
    const newStart = lastPeriod ? lastPeriod.end : '01:00 PM';
    const newEnd = '06:00 PM';

    const nextHours: WeeklyOperatingHours = {
      ...operatingHours,
      [day]: {
        ...dayData,
        enabled: true,
        periods: [...dayData.periods, { start: newStart, end: newEnd }]
      }
    };
    setOperatingHours(nextHours);
    persistSettings(nextHours, bufferMinutes, timezone, `Added shift for ${dayData.label}. Saved automatically.`);
  };

  const handleDeletePeriod = (day: keyof WeeklyOperatingHours, periodIndex: number) => {
    const dayData = operatingHours[day];
    const updatedPeriods = dayData.periods.filter((_, idx) => idx !== periodIndex);
    const nextHours: WeeklyOperatingHours = {
      ...operatingHours,
      [day]: {
        ...dayData,
        enabled: updatedPeriods.length > 0 ? dayData.enabled : false,
        periods: updatedPeriods
      }
    };
    setOperatingHours(nextHours);
    persistSettings(nextHours, bufferMinutes, timezone, `Removed shift for ${dayData.label}. Saved automatically.`);
  };

  const handleCopyMondayToWeekdays = () => {
    const mondayPeriods = [...operatingHours.monday.periods];
    const mondayEnabled = operatingHours.monday.enabled;

    const nextHours: WeeklyOperatingHours = {
      ...operatingHours,
      tuesday: { ...operatingHours.tuesday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) },
      wednesday: { ...operatingHours.wednesday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) },
      thursday: { ...operatingHours.thursday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) },
      friday: { ...operatingHours.friday, enabled: mondayEnabled, periods: JSON.parse(JSON.stringify(mondayPeriods)) }
    };

    setOperatingHours(nextHours);
    persistSettings(nextHours, bufferMinutes, timezone, 'Monday hours copied to Tuesday through Friday & saved automatically.');
  };

  const handleSaveHours = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await persistSettings(operatingHours, bufferMinutes, timezone, 'All operating hours saved successfully.');
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
