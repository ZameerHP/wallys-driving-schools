import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  CalendarOff, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Info, 
  Sparkles,
  Shield,
  User,
  Power
} from 'lucide-react';
import { INSTRUCTORS } from '../lib/content';
import { WeekdayKey, InstructorWeeklyDaysOff } from '../types/availability';

interface InstructorDayOffProps {
  currentInstructorId?: string;
}

interface WeekdayConfig {
  key: WeekdayKey;
  label: string;
  shortLabel: string;
  dayIndex: number; // 0 = Sunday, 1 = Monday, etc.
}

const WEEKDAYS: WeekdayConfig[] = [
  { key: 'monday', label: 'Monday', shortLabel: 'Mon', dayIndex: 1 },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue', dayIndex: 2 },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed', dayIndex: 3 },
  { key: 'thursday', label: 'Thursday', shortLabel: 'Thu', dayIndex: 4 },
  { key: 'friday', label: 'Friday', shortLabel: 'Fri', dayIndex: 5 },
  { key: 'saturday', label: 'Saturday', shortLabel: 'Sat', dayIndex: 6 },
  { key: 'sunday', label: 'Sunday', shortLabel: 'Sun', dayIndex: 0 },
];

const DEFAULT_DAYS_OFF: InstructorWeeklyDaysOff = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: true,
};

export function InstructorDayOff({ currentInstructorId = 'wally' }: InstructorDayOffProps) {
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(currentInstructorId || 'wally');
  const [weeklyDaysOff, setWeeklyDaysOff] = useState<InstructorWeeklyDaysOff>(() => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('wallys_instructor_weekly_days_off') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_DAYS_OFF, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_DAYS_OFF;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [savingDay, setSavingDay] = useState<WeekdayKey | 'all' | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Find instructor metadata
  const currentInstructor = INSTRUCTORS.find(i => i.id === selectedInstructorId) || {
    id: selectedInstructorId,
    name: selectedInstructorId.charAt(0).toUpperCase() + selectedInstructorId.slice(1),
    role: 'Driving Instructor',
    image: '/instructor.jpg'
  };

  // Broadcast sync events so customer calendar updates immediately
  const broadcastSync = useCallback((updatedDaysOff: InstructorWeeklyDaysOff) => {
    const disabledWeekdays = (Object.keys(updatedDaysOff) as WeekdayKey[]).filter(k => updatedDaysOff[k] === false);
    const detail = {
      instructorId: selectedInstructorId,
      weeklyDaysOff: updatedDaysOff,
      disabledWeekdays,
      timestamp: Date.now()
    };

    try {
      window.dispatchEvent(new CustomEvent('wallys-instructor-day-off-updated', { detail }));
      window.dispatchEvent(new CustomEvent('wallys-availability-updated', { detail }));
    } catch {}

    try {
      localStorage.setItem('wallys_instructor_day_off_ping', JSON.stringify(detail));
      localStorage.setItem('wallys_availability_ping', JSON.stringify(detail));
      localStorage.setItem('wallys_instructor_weekly_days_off', JSON.stringify(updatedDaysOff));
      localStorage.setItem('wallys_instructor_disabled_weekdays', JSON.stringify(disabledWeekdays));
    } catch {}

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc1 = new BroadcastChannel('wallys_availability_channel');
        bc1.postMessage({ type: 'INSTRUCTOR_DAY_OFF_UPDATE', ...detail });
        bc1.close();
        const bc2 = new BroadcastChannel('wallys-availability-channel');
        bc2.postMessage({ type: 'INSTRUCTOR_DAY_OFF_UPDATE', ...detail });
        bc2.close();
      }
    } catch {}
  }, [selectedInstructorId]);

  // Load instructor settings from database
  const loadDaysOff = useCallback(async (instructorId: string) => {
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/instructor/day-off?instructorId=${encodeURIComponent(instructorId)}&_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        throw new Error(`Failed to load days off (Status: ${res.status})`);
      }
      const data = await res.json();
      if (data && data.weeklyDaysOff) {
        const syncedDaysOff = {
          ...DEFAULT_DAYS_OFF,
          ...data.weeklyDaysOff
        };
        setWeeklyDaysOff(syncedDaysOff);
        try {
          localStorage.setItem('wallys_instructor_weekly_days_off', JSON.stringify(syncedDaysOff));
          const disabledWeekdays = (Object.keys(syncedDaysOff) as WeekdayKey[]).filter(k => syncedDaysOff[k] === false);
          localStorage.setItem('wallys_instructor_disabled_weekdays', JSON.stringify(disabledWeekdays));
        } catch {}

        if (data.updatedAt) {
          const date = new Date(data.updatedAt);
          setLastSavedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err: any) {
      console.error('[InstructorDayOff] Load error:', err);
      setErrorMessage(err.message || 'Could not load instructor settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDaysOff(selectedInstructorId);
  }, [selectedInstructorId, loadDaysOff]);

  // Sync across browser tabs or windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wallys_instructor_weekly_days_off' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setWeeklyDaysOff(prev => ({ ...prev, ...parsed }));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Handle toggling a single weekday ON or OFF
  const handleToggleWeekday = async (weekday: WeekdayKey) => {
    const currentStatus = weeklyDaysOff[weekday];
    const newStatus = !currentStatus; // true = ON (available), false = OFF (day off)

    // Optimistic UI update
    const nextDaysOff = {
      ...weeklyDaysOff,
      [weekday]: newStatus
    };
    setWeeklyDaysOff(nextDaysOff);
    setSavingDay(weekday);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/instructor/day-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId: selectedInstructorId,
          weekday,
          status: newStatus
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${res.status}`);
      }

      const result = await res.json();
      if (result.data?.weeklyDaysOff) {
        setWeeklyDaysOff(result.data.weeklyDaysOff);
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(nowStr);

      const dayConfig = WEEKDAYS.find(w => w.key === weekday);
      const actionText = newStatus 
        ? `${dayConfig?.label} switched ON (Available)` 
        : `${dayConfig?.label} switched OFF (Day Off)`;
      
      setSuccessToast(`${actionText} and synced with customer calendar.`);
      setTimeout(() => setSuccessToast(null), 4000);

      // Instantly sync calendar
      const finalDaysOff = result?.data?.weeklyDaysOff || nextDaysOff;
      broadcastSync(finalDaysOff);
    } catch (err: any) {
      console.error('[InstructorDayOff] Toggle error:', err);
      // Revert optimistic update
      setWeeklyDaysOff(prev => ({
        ...prev,
        [weekday]: currentStatus
      }));
      setErrorMessage(err.message || 'Failed to save day off setting to database.');
    } finally {
      setSavingDay(null);
    }
  };

  // Bulk update all days to ON
  const handleSetAllOn = async () => {
    setSavingDay('all');
    setErrorMessage(null);
    const allOnDays: InstructorWeeklyDaysOff = {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    };

    try {
      const res = await fetch('/api/instructor/day-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId: selectedInstructorId,
          weeklyDaysOff: allOnDays
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update all weekdays');
      }

      setWeeklyDaysOff(allOnDays);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(nowStr);
      setSuccessToast('All weekdays set to ON (Available) and saved to database.');
      setTimeout(() => setSuccessToast(null), 4000);
      broadcastSync(allOnDays);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update weekdays');
    } finally {
      setSavingDay(null);
    }
  };

  // Quick set weekends OFF
  const handleSetWeekendsOff = async () => {
    setSavingDay('all');
    setErrorMessage(null);
    const weekendOffDays: InstructorWeeklyDaysOff = {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    };

    try {
      const res = await fetch('/api/instructor/day-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId: selectedInstructorId,
          weeklyDaysOff: weekendOffDays
        })
      });

      if (!res.ok) {
        throw new Error('Failed to set weekends off');
      }

      setWeeklyDaysOff(weekendOffDays);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(nowStr);
      setSuccessToast('Saturday & Sunday switched to OFF (Days Off) and saved to database.');
      setTimeout(() => setSuccessToast(null), 4000);
      broadcastSync(weekendOffDays);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update weekdays');
    } finally {
      setSavingDay(null);
    }
  };

  const activeDaysCount = Object.values(weeklyDaysOff).filter(Boolean).length;
  const offDaysCount = 7 - activeDaysCount;

  return (
    <div id="instructor-day-off-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <CalendarOff className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Instructor Day Off</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                Database Synced
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl">
              Turn any weekday <strong>ON</strong> or <strong>OFF</strong>. When a weekday is switched to OFF, 
              you are permanently unavailable every week, month, and year on that day. Customers cannot book that weekday until you switch it back to ON.
            </p>
          </div>

          {/* Instructor Badge & Stats */}
          <div className="flex flex-wrap items-center gap-3">
            {INSTRUCTORS.length > 1 ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <User className="w-4 h-4 text-slate-500" />
                <label htmlFor="instructor-select" className="text-xs font-medium text-slate-600">Instructor:</label>
                <select
                  id="instructor-select"
                  value={selectedInstructorId}
                  onChange={(e) => setSelectedInstructorId(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {INSTRUCTORS.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentInstructor.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{currentInstructor.name}</div>
                  <div className="text-[11px] text-slate-500">Instructor Roster</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <strong>{activeDaysCount}</strong> Working
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <strong>{offDaysCount}</strong> Days Off
              </span>
            </div>
          </div>
        </div>

        {/* Live sync & database indicator */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Applies strictly to <strong>{currentInstructor.name}</strong>. Other instructors are not affected.</span>
          </div>
          {lastSavedTime && (
            <div className="flex items-center gap-1 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Database updated at {lastSavedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button 
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => loadDaysOff(selectedInstructorId)}
            className="text-red-700 hover:text-red-900 text-xs font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Weekday Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
        {WEEKDAYS.map((weekday) => {
          const isAvailable = weeklyDaysOff[weekday.key]; // true = ON, false = OFF
          const isSaving = savingDay === weekday.key || savingDay === 'all';

          return (
            <div
              key={weekday.key}
              id={`day-card-${weekday.key}`}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                isAvailable
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  : 'bg-amber-50/40 border-amber-200/80 shadow-sm'
              }`}
            >
              {/* Day info & status */}
              <div className="flex items-start sm:items-center gap-3.5 mb-3 sm:mb-0">
                <div 
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    isAvailable
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {weekday.shortLabel}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{weekday.label}</h3>
                    <span 
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isAvailable 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          ON • Available
                        </>
                      ) : (
                        <>
                          <CalendarOff className="w-3 h-3 text-amber-700" />
                          OFF • Day Off
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAvailable ? (
                      <span className="text-slate-600">
                        Available for customer bookings every {weekday.label} (08:00 AM – 06:00 PM).
                      </span>
                    ) : (
                      <span className="text-amber-800 font-medium">
                        Permanently blocked every {weekday.label}. Customers cannot book lessons on this weekday.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Toggle Switch */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-xs font-medium text-slate-500 sm:hidden">
                  {isAvailable ? 'Status: Available' : 'Status: Day Off'}
                </span>

                <button
                  type="button"
                  id={`toggle-button-${weekday.key}`}
                  disabled={isSaving || isLoading}
                  onClick={() => handleToggleWeekday(weekday.key)}
                  aria-pressed={isAvailable}
                  aria-label={`Toggle ${weekday.label} availability`}
                  className={`relative inline-flex h-9 w-20 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isAvailable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 hover:bg-slate-400'
                  } ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {/* ON text label */}
                  <span 
                    className={`absolute left-2.5 text-[11px] font-extrabold text-white transition-opacity select-none ${
                      isAvailable ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    ON
                  </span>

                  {/* OFF text label */}
                  <span 
                    className={`absolute right-2 text-[11px] font-extrabold text-slate-600 transition-opacity select-none ${
                      isAvailable ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    OFF
                  </span>

                  {/* Moving knob */}
                  <span
                    className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out flex items-center justify-center ${
                      isAvailable ? 'translate-x-12' : 'translate-x-1'
                    }`}
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                    ) : isAvailable ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    ) : (
                      <CalendarOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Controls */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Need quick schedule presets? You can bulk update your weekly schedule with one click:
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="preset-all-on"
            disabled={savingDay !== null || isLoading}
            onClick={handleSetAllOn}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            Turn All Days ON
          </button>
          <button
            type="button"
            id="preset-weekends-off"
            disabled={savingDay !== null || isLoading}
            onClick={handleSetWeekendsOff}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            Weekends OFF (Sat & Sun)
          </button>
        </div>
      </div>
    </div>
  );
}
