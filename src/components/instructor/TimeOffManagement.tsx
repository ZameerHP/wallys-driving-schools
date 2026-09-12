import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  Plus,
  X,
  ShieldAlert,
  Sun,
  Moon,
  CalendarOff,
  Info,
  CalendarCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TimeOffBlockItem {
  id: number | string;
  instructorId: string;
  date: string;
  isFullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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

interface TimeOffManagementProps {
  onAvailabilityChanged?: () => void;
}

const TIME_OPTIONS = [
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM'
];

const PRESET_REASONS = [
  'Personal Day Off',
  'Vehicle Maintenance & Service',
  'RMS / Service NSW Driving Test Supervision',
  'Medical / Health Appointment',
  'Annual Leave / Family Holiday',
  'Instructor Training & Accreditation'
];

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) || 0;
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    // If YYYY-MM-DD
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    // If DD/MM/YYYY
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const TimeOffManagement: React.FC<TimeOffManagementProps> = ({ onAvailabilityChanged }) => {
  const [blocks, setBlocks] = useState<TimeOffBlockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [isFullDay, setIsFullDay] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('01:00 PM');
  const [reason, setReason] = useState('');
  const [instructorId, setInstructorId] = useState('wally');

  // Conflict Checking State
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictingBooking[]>([]);

  // Editing State
  const [editingBlock, setEditingBlock] = useState<TimeOffBlockItem | null>(null);

  // Delete Confirmation State
  const [deletingBlock, setDeletingBlock] = useState<TimeOffBlockItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'full' | 'partial' | 'upcoming'>('upcoming');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('instructor_token') || 'wally_owner_session';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Fetch all time off blocks from backend API
  const fetchBlocks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/instructor/time-off?instructorId=${instructorId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
      } else {
        const err = await res.json();
        console.warn('Could not load time off blocks:', err);
      }
    } catch (error) {
      console.error('Error loading time off blocks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // Check for booking conflicts whenever date, mode, or time window changes
  const checkConflicts = useCallback(async (
    dateToCheck: string,
    fullDay: boolean,
    start: string,
    end: string
  ) => {
    if (!dateToCheck) return;
    setIsCheckingConflicts(true);
    try {
      const res = await fetch('/api/instructor/time-off/check-conflicts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: dateToCheck,
          isFullDay: fullDay,
          startTime: fullDay ? null : start,
          endTime: fullDay ? null : end,
          instructorId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [instructorId]);

  // Debounced conflict check on form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      checkConflicts(selectedDate, isFullDay, startTime, endTime);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedDate, isFullDay, startTime, endTime, checkConflicts]);

  // Time validity helper
  const isTimeOrderValid = useMemo(() => {
    if (isFullDay) return true;
    return parseTimeToMinutes(endTime) > parseTimeToMinutes(startTime);
  }, [isFullDay, startTime, endTime]);

  const durationHours = useMemo(() => {
    if (isFullDay) return 'All Day';
    const diff = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
    if (diff <= 0) return '0 hrs';
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    if (mins === 0) return `${hrs} hrs`;
    return `${hrs}h ${mins}m`;
  }, [isFullDay, startTime, endTime]);

  // Reset form
  const resetForm = () => {
    setEditingBlock(null);
    setIsFullDay(true);
    setSelectedDate(todayStr);
    setStartTime('09:00 AM');
    setEndTime('01:00 PM');
    setReason('');
    setConflicts([]);
  };

  // Populate form for editing
  const startEditing = (block: TimeOffBlockItem) => {
    setEditingBlock(block);
    setIsFullDay(block.isFullDay);
    setSelectedDate(block.date);
    if (!block.isFullDay && block.startTime && block.endTime) {
      setStartTime(block.startTime);
      setEndTime(block.endTime);
    }
    setReason(block.reason || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save or update block
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      setFeedback({ type: 'error', message: 'Please select a date for the block.' });
      return;
    }

    if (!isFullDay && !isTimeOrderValid) {
      setFeedback({ type: 'error', message: 'Start time must be strictly before end time.' });
      return;
    }

    if (conflicts.length > 0) {
      setFeedback({
        type: 'error',
        message: 'Cannot save block: Existing student bookings conflict with this period. Please reschedule or resolve them first.'
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const url = editingBlock 
        ? `/api/instructor/time-off/${editingBlock.id}`
        : '/api/instructor/time-off';
      const method = editingBlock ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: selectedDate,
          isFullDay,
          startTime: isFullDay ? null : startTime,
          endTime: isFullDay ? null : endTime,
          reason: reason.trim() || null,
          instructorId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: editingBlock 
            ? 'Availability block successfully updated.' 
            : (isFullDay ? `Full day off saved for ${formatDateDisplay(selectedDate)}.` : `Time block saved for ${formatDateDisplay(selectedDate)}.`)
        });
        resetForm();
        await fetchBlocks();
        if (onAvailabilityChanged) onAvailabilityChanged();
      } else {
        if (data.conflicts && data.conflicts.length > 0) {
          setConflicts(data.conflicts);
        }
        setFeedback({
          type: 'error',
          message: data.message || data.error || 'Failed to save time-off block.'
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Server communication error.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // Delete block
  const handleDeleteBlock = async () => {
    if (!deletingBlock) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/instructor/time-off/${deletingBlock.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: 'Time-off block removed. Normal student booking availability has been restored.'
        });
        setDeletingBlock(null);
        await fetchBlocks();
        if (onAvailabilityChanged) onAvailabilityChanged();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to delete block.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Server communication error.' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // Quick date pickers
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filtered blocks list
  const filteredBlocks = useMemo(() => {
    return blocks.filter(b => {
      if (filterType === 'full') return b.isFullDay;
      if (filterType === 'partial') return !b.isFullDay;
      if (filterType === 'upcoming') {
        return b.date >= todayStr;
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [blocks, filterType, todayStr]);

  const upcomingCount = useMemo(() => {
    return blocks.filter(b => b.date >= todayStr).length;
  }, [blocks, todayStr]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-brand-black to-neutral-900 text-white rounded-3xl p-6 sm:p-8 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-brand-red/20 text-brand-red text-xs font-bold uppercase tracking-wider rounded-full border border-brand-red/30 flex items-center gap-1.5">
                <CalendarOff className="w-3.5 h-3.5" />
                Instructor Availability Controls
              </span>
              <span className="px-2.5 py-0.5 bg-white/10 text-white/80 text-[11px] font-semibold rounded-full">
                Instructor: Wally
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Day Off & Time-Off Settings
            </h2>
            <p className="text-white/70 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Block full days off or custom time windows. When blocked, student booking systems and reschedule tools across all packages will automatically prevent bookings during that time. Confirmed student lessons are never silently cancelled.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center">
              <div className="text-2xl font-bold text-white">{upcomingCount}</div>
              <div className="text-[10px] uppercase font-bold text-white/60 tracking-wider">Upcoming Blocks</div>
            </div>
            <button
              onClick={fetchBlocks}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-3.5 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              title="Refresh time-off schedule"
            >
              <RefreshCw className={cn("w-4 h-4 text-brand-red", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm",
              feedback.type === 'success' 
                ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                : "bg-red-50 border-red-200 text-red-900"
            )}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 text-black/50 hover:text-black rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form to Add / Edit Block */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200 shadow-sm sticky top-24">
            <div className="flex items-center justify-between pb-5 border-b border-neutral-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center font-bold">
                  {editingBlock ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-black">
                    {editingBlock ? 'Edit Block' : 'Add Availability Block'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {editingBlock ? 'Modify block parameters' : 'Schedule day off or blocked time period'}
                  </p>
                </div>
              </div>

              {editingBlock && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-neutral-500 hover:text-brand-black px-2.5 py-1 rounded-lg hover:bg-neutral-100 font-medium transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-5">
              {/* Mode Toggle: Full Day vs Partial Day */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Block Mode
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setIsFullDay(true)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                      isFullDay
                        ? "bg-brand-red text-white shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    )}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Full Day Off</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullDay(false)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                      !isFullDay
                        ? "bg-brand-black text-white shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    )}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Partial Day</span>
                  </button>
                </div>
              </div>

              {/* Date Selector with Quick Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Select Date
                  </label>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    {formatDateDisplay(selectedDate)}
                  </span>
                </div>

                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent bg-neutral-50/50"
                  required
                />

                {/* Quick Date Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer",
                      selectedDate === todayStr 
                        ? "bg-neutral-900 text-white border-neutral-900" 
                        : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                    )}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(7)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Next Week
                  </button>
                </div>
              </div>

              {/* Partial Day Time Range Controls */}
              <AnimatePresence>
                {!isFullDay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-1"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                          Start Time
                        </label>
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs sm:text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={`start-${t}`} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                          End Time
                        </label>
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs sm:text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={`end-${t}`} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Duration helper & validation */}
                    {!isTimeOrderValid ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>Invalid time window: Start time must precede end time.</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          Blocked duration:
                        </span>
                        <span className="font-bold text-neutral-900 bg-neutral-200/80 px-2 py-0.5 rounded-md">
                          {durationHours}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reason / Note Input */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Reason / Label <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Car servicing, Personal appointment, Vacation"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
                />

                {/* Preset Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_REASONS.slice(0, 3).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReason(p)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conflict Status Banner */}
              <div>
                {isCheckingConflicts ? (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                    <span>Verifying booking conflicts...</span>
                  </div>
                ) : conflicts.length > 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold text-amber-950">
                          Conflict Detected ({conflicts.length} confirmed booking{conflicts.length > 1 ? 's' : ''}):
                        </strong>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-tight">
                          Wallys Driving School policy strictly protects confirmed student lessons. Please reschedule these bookings before blocking this period:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pl-6 pr-1">
                      {conflicts.map(c => (
                        <div key={c.id} className="p-2 bg-white/80 rounded-lg border border-amber-200 text-[11px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-neutral-900">{c.studentName}</span>
                            <span className="text-neutral-500 text-[10px] ml-1.5">({c.bookingRef})</span>
                            <div className="text-amber-800 font-semibold">{c.time}</div>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                            {c.suburb || 'Western Sydney'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No booking conflicts. This period is clear to block.</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSaving || !isTimeOrderValid || conflicts.length > 0}
                className={cn(
                  "w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md",
                  (isSaving || !isTimeOrderValid || conflicts.length > 0)
                    ? "bg-neutral-300 cursor-not-allowed text-neutral-500 shadow-none"
                    : "bg-brand-red hover:bg-brand-red/90 active:scale-[0.99]"
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Block...</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    <span>{editingBlock ? 'Update Time-Off Block' : 'Save Time-Off Block'}</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                Saving will instantly update live booking availability. Any customer attempting to book or reschedule during this time will see the slot marked unavailable.
              </p>
            </form>
          </div>
        </div>

        {/* Right Column: Active & Upcoming Time-Off Schedule */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-100 mb-6">
              <div>
                <h3 className="text-base font-bold text-brand-black">
                  Scheduled Time-Off & Blocks
                </h3>
                <p className="text-xs text-neutral-500">
                  Manage active and upcoming availability exclusions
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterType('upcoming')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    filterType === 'upcoming' 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  Upcoming ({upcomingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('full')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    filterType === 'full' 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  Full Days
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('partial')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    filterType === 'partial' 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  Partial
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    filterType === 'all' 
                      ? "bg-white text-neutral-900 shadow-sm" 
                      : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  All ({blocks.length})
                </button>
              </div>
            </div>

            {/* Blocks List */}
            {isLoading ? (
              <div className="py-16 text-center text-neutral-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-red" />
                <p className="text-sm font-medium">Loading instructor availability blocks...</p>
              </div>
            ) : filteredBlocks.length === 0 ? (
              <div className="py-16 text-center text-neutral-400">
                <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-neutral-400">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-neutral-800 mb-1">
                  No Blocks Found
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {filterType === 'upcoming' 
                    ? 'No upcoming days off or time blocks scheduled. Instructor Wally is fully available for student lessons.'
                    : 'No time-off records match the selected filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBlocks.map((block) => {
                  const isPast = block.date < todayStr;
                  return (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                        isPast 
                          ? "bg-neutral-50/70 border-neutral-200 opacity-60" 
                          : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold",
                          block.isFullDay
                            ? "bg-red-50 text-brand-red border border-red-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        )}>
                          {block.isFullDay ? <Sun className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-neutral-900">
                              {formatDateDisplay(block.date)}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              block.isFullDay
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            )}>
                              {block.isFullDay ? 'Full Day Off' : 'Partial Block'}
                            </span>
                            {isPast && (
                              <span className="text-[10px] font-semibold text-neutral-400 uppercase">
                                (Past)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-neutral-600 mt-1">
                            {!block.isFullDay && block.startTime && block.endTime ? (
                              <span className="font-semibold text-neutral-800">
                                {block.startTime} – {block.endTime}
                              </span>
                            ) : (
                              <span className="text-neutral-500">All student slots blocked</span>
                            )}

                            {block.reason && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="italic text-neutral-600">"{block.reason}"</span>
                              </>
                            )}
                          </div>

                          <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                            <UserCheck className="w-3 h-3 text-neutral-400" />
                            <span>Instructor: Wally</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(block)}
                          className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Edit this block"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBlock(block)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Remove block and restore availability"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingBlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-neutral-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-brand-red flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                Remove Time-Off Block?
              </h3>

              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-4">
                Are you sure you want to remove this block for{' '}
                <strong className="text-neutral-900 font-semibold">{formatDateDisplay(deletingBlock.date)}</strong>
                {deletingBlock.isFullDay 
                  ? ' (Full Day Off)' 
                  : ` (${deletingBlock.startTime} – ${deletingBlock.endTime})`}?
              </p>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 mb-6 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Normal student booking availability will be immediately restored for this time slot.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingBlock(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBlock}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red/90 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm & Restore Availability</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
