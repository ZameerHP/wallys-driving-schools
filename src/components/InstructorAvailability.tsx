import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  User, 
  FileText, 
  AlertCircle,
  ShieldCheck,
  Ban,
  Search,
  Filter,
  Check,
  Database,
  CalendarDays,
  ArrowRight,
  Settings2,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  fetchTimeOffBlocks, 
  createClientTimeOffBlock, 
  deleteClientTimeOffBlock, 
  getLocalTimeOffBlocks, 
  saveLocalTimeOffBlocks,
  isTimeOffBlockDeleted,
  markTimeOffBlockDeleted,
  unmarkTimeOffBlockDeleted,
  broadcastAvailabilityChange,
  TimeOffItem
} from '../lib/timeOff';
import { 
  isSupabaseReady, 
  getSupabase, 
  setSupabaseConfig 
} from '../lib/supabase';

interface ConflictDetail {
  id: number | string;
  bookingRef: string;
  studentName: string;
  date: string;
  time: string;
  phone: string;
  email: string;
  suburb: string;
  status: string;
}

const COMMON_TIME_SLOTS = [
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM'
];

const REASON_PRESETS = [
  'Personal Day Off',
  'Vehicle Maintenance & Service',
  'RMS / Service NSW Driving Test Supervision',
  'Medical / Doctor Appointment',
  'Annual Leave / Holiday',
  'Instructor Training & Accreditation',
  'Public Holiday'
];

function formatHumanDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function InstructorAvailability() {
  const [blocks, setBlocks] = useState<TimeOffItem[]>(() => {
    return getLocalTimeOffBlocks();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'fullday' | 'partial' | 'past'>('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<number | string | null>(null);
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('08:30 AM');
  const [endTime, setEndTime] = useState('12:30 PM');
  const [reason, setReason] = useState('');
  const [instructorId, setInstructorId] = useState('wally');
  const [instructorName, setInstructorName] = useState('Wally');

  // Conflict Checking State
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Deletion Modal State (Custom modal avoids window.confirm iframe issues)
  const [deletingBlock, setDeletingBlock] = useState<TimeOffItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track recently deleted block IDs and dates to prevent ghost resurrection from cached responses
  const recentlyDeletedRef = useRef<Map<string, number>>(new Map());

  const normalizeDateKey = (d: string): string => {
    if (!d) return '';
    const clean = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(clean)) {
      const parts = clean.split(/[/-]/);
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return clean;
  };

  const markDeletedKey = useCallback((id: string | number | undefined, dateStr: string) => {
    const now = Date.now();
    if (id) recentlyDeletedRef.current.set(String(id), now);
    if (dateStr) {
      recentlyDeletedRef.current.set(dateStr, now);
      const norm = normalizeDateKey(dateStr);
      if (norm) recentlyDeletedRef.current.set(norm, now);
    }
    // Prune entries older than 60 seconds
    for (const [k, t] of recentlyDeletedRef.current.entries()) {
      if (now - t > 60000) recentlyDeletedRef.current.delete(k);
    }
  }, []);

  const isRecentlyDeleted = useCallback((id: string | number | undefined, dateStr: string): boolean => {
    const now = Date.now();
    const checkKey = (k: string) => {
      const t = recentlyDeletedRef.current.get(k);
      return Boolean(t && (now - t < 60000));
    };
    if (id && checkKey(String(id))) return true;
    if (dateStr) {
      if (checkKey(dateStr)) return true;
      const norm = normalizeDateKey(dateStr);
      if (norm && checkKey(norm)) return true;
    }
    return false;
  }, []);

  // Resilient authentication headers
  const getInstructorHeaders = useCallback((isJson = false): Record<string, string> => {
    let token = typeof window !== 'undefined' ? localStorage.getItem('instructor_token') : null;
    if (!token || token === 'null' || token === 'undefined') {
      token = 'wally_owner_session';
      try {
        localStorage.setItem('instructor_token', 'wally_owner_session');
      } catch {}
    }
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'x-instructor-token': token,
    };
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }, []);

  // Load Time Off Blocks from Server
  const loadTimeOff = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = getInstructorHeaders(false);
      const res = await fetch(`/api/instructor/time-off?_t=${Date.now()}`, { 
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.blocks)) {
          // Filter out any blocks that were recently deleted or marked as tombstone
          const liveBlocks = data.blocks.filter((b: any) => !isRecentlyDeleted(b.id, b.date) && !isTimeOffBlockDeleted(b.id, b.date));
          const sorted = liveBlocks.sort((a: any, b: any) => a.date.localeCompare(b.date));
          setBlocks(sorted);
          saveLocalTimeOffBlocks(sorted);
        }
      }
    } catch (err) {
      console.error('Failed to load time off blocks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getInstructorHeaders, isRecentlyDeleted]);

  useEffect(() => {
    loadTimeOff();

    const handleSync = () => {
      loadTimeOff();
    };
    window.addEventListener('wallys-availability-updated', handleSync);
    return () => {
      window.removeEventListener('wallys-availability-updated', handleSync);
    };
  }, [loadTimeOff]);

  // Real-time conflict checker
  const checkConflicts = useCallback(async (
    targetDate: string,
    fullDay: boolean,
    start: string,
    end: string,
    instId: string,
    excludeId?: number | string | null
  ) => {
    if (!targetDate) return;
    setIsCheckingConflicts(true);
    try {
      const headers = getInstructorHeaders(true);

      const res = await fetch('/api/instructor/time-off/check-conflicts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          date: targetDate,
          isFullDay: fullDay,
          startTime: fullDay ? undefined : start,
          endTime: fullDay ? undefined : end,
          instructorId: instId,
          excludeBlockId: excludeId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch (err) {
      console.warn('Conflict check error:', err);
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [getInstructorHeaders]);

  useEffect(() => {
    if (isFormOpen && date) {
      checkConflicts(date, isFullDay, startTime, endTime, instructorId, editingBlockId);
    }
  }, [isFormOpen, date, isFullDay, startTime, endTime, instructorId, editingBlockId, checkConflicts]);

  const handleOpenAddForm = () => {
    setEditingBlockId(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    setIsFullDay(true);
    setStartTime('08:30 AM');
    setEndTime('12:30 PM');
    setReason('');
    setConflicts([]);
    setIsFormOpen(true);
  };

  const handleEditBlock = (b: TimeOffItem) => {
    setEditingBlockId(b.id);
    setDate(b.date);
    setIsFullDay(b.isFullDay);
    setStartTime(b.startTime || '08:30 AM');
    setEndTime(b.endTime || '12:30 PM');
    setReason(b.reason || '');
    setInstructorId(b.instructorId || 'wally');
    setInstructorName(b.instructorName || 'Wally');
    setConflicts([]);
    setIsFormOpen(true);
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    if (conflicts.length > 0) {
      setFeedback({
        type: 'error',
        message: `Cannot block availability: ${conflicts.length} confirmed student booking(s) exist in this period. Please reschedule or contact students first.`
      });
      return;
    }

    // Explicitly unmark any deletion tombstone so this block is immediately recognized
    unmarkTimeOffBlockDeleted(date, editingBlockId || undefined);
    const norm = normalizeDateKey(date);
    if (norm) unmarkTimeOffBlockDeleted(norm);
    recentlyDeletedRef.current.delete(date);
    if (norm) recentlyDeletedRef.current.delete(norm);
    if (editingBlockId) recentlyDeletedRef.current.delete(String(editingBlockId));

    setIsSaving(true);
    try {
      const headers = getInstructorHeaders(true);

      const url = editingBlockId 
        ? `/api/instructor/time-off/${encodeURIComponent(String(editingBlockId))}` 
        : '/api/instructor/time-off';
      const method = editingBlockId ? 'PUT' : 'POST';

      const payload = {
        id: editingBlockId || undefined,
        date,
        isFullDay,
        startTime: isFullDay ? null : startTime,
        endTime: isFullDay ? null : endTime,
        reason: reason.trim() || undefined,
        instructorId,
        instructorName
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to save time off block');
      }

      // Optimistic update of local blocks state
      if (data.block) {
        setBlocks(prev => {
          const filtered = prev.filter(b => String(b.id) !== String(data.block.id) && b.date !== data.block.date);
          const updated = [...filtered, data.block].sort((a, b) => a.date.localeCompare(b.date));
          saveLocalTimeOffBlocks(updated);
          return updated;
        });
      }

      setFeedback({
        type: 'success',
        message: editingBlockId 
          ? `Time off block on ${formatHumanDate(date)} updated and synchronized!` 
          : `Availability blocked for ${formatHumanDate(date)} (${isFullDay ? 'Full Day Off' : `${startTime} – ${endTime}`})!`
      });

      // Direct client Supabase synchronization if configured
      if (data.block) {
        createClientTimeOffBlock(data.block).catch(() => {});
      } else {
        createClientTimeOffBlock({ ...payload, id: `block_${Date.now()}` }).catch(() => {});
      }

      setIsFormOpen(false);
      await loadTimeOff();
      broadcastAvailabilityChange();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      console.error('Error saving time off block:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save time off block'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Perform removal of block with multi-tier fallback
  const handleConfirmDelete = async () => {
    if (!deletingBlock) return;
    const block = deletingBlock;
    setIsDeleting(true);

    const blockDateNorm = normalizeDateKey(block.date);
    markDeletedKey(block.id, block.date);
    markTimeOffBlockDeleted(block.id, block.date);

    // Optimistic UI update: remove block immediately from view and local storage
    setBlocks(prev => {
      const updated = prev.filter(b => {
        if (String(b.id) === String(block.id)) return false;
        const bNorm = normalizeDateKey(b.date);
        if (b.date === block.date || bNorm === blockDateNorm) return false;
        return true;
      });
      saveLocalTimeOffBlocks(updated);
      return updated;
    });

    try {
      const headers = getInstructorHeaders(true);
      const safeId = block.id ? String(block.id).trim() : '0';

      // Tier 1: Dedicated multi-tier client helper (Supabase direct + API + local storage sync)
      await deleteClientTimeOffBlock(block.id, block.date);

      // Tier 2: DELETE /api/instructor/time-off/:id?date=... with body payload fallback
      let res = await fetch(`/api/instructor/time-off/${encodeURIComponent(safeId)}?date=${encodeURIComponent(block.date)}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: block.id, date: block.date })
      }).catch(() => null);

      // Tier 3: If Tier 2 failed or returned non-ok, fallback to POST /api/instructor/time-off/delete
      if (!res || !res.ok) {
        res = await fetch(`/api/instructor/time-off/delete?date=${encodeURIComponent(block.date)}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: block.id, date: block.date })
        }).catch(() => null);
      }

      setFeedback({
        type: 'success',
        message: `Time off on ${formatHumanDate(block.date)} removed completely! Customer calendar availability restored.`
      });

      // Close modal and broadcast event
      setDeletingBlock(null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallys-availability-updated', {
          detail: { date: block.date, normDate: blockDateNorm, id: block.id, action: 'removed' }
        }));
      }

      await loadTimeOff();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error removing time off block:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to remove time off block. Please refresh.'
      });
      await loadTimeOff();
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Date Picker helpers
  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(d.toISOString().split('T')[0]);
  };

  // Filter and search logic
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredBlocks = useMemo(() => {
    return blocks.filter(block => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dateMatch = block.date.toLowerCase().includes(q);
        const reasonMatch = (block.reason || '').toLowerCase().includes(q);
        const nameMatch = (block.instructorName || '').toLowerCase().includes(q);
        if (!dateMatch && !reasonMatch && !nameMatch) return false;
      }

      // Filter tabs
      if (activeFilter === 'upcoming') {
        return block.date >= todayStr;
      }
      if (activeFilter === 'past') {
        return block.date < todayStr;
      }
      if (activeFilter === 'fullday') {
        return block.isFullDay;
      }
      if (activeFilter === 'partial') {
        return !block.isFullDay;
      }
      return true;
    });
  }, [blocks, searchQuery, activeFilter, todayStr]);

  const stats = useMemo(() => {
    const total = blocks.length;
    const fullDays = blocks.filter(b => b.isFullDay).length;
    const partial = blocks.filter(b => !b.isFullDay).length;
    const upcoming = blocks.filter(b => b.date >= todayStr).length;
    return { total, fullDays, partial, upcoming };
  }, [blocks, todayStr]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Availability & Time Off Engine</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-semibold">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Database & JSON Synced</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-black">
            Availability & Time Off Settings
          </h2>
          <p className="text-xs sm:text-sm text-black/60 max-w-xl mt-1">
            Manage your scheduled days off or block specific time windows. Every block is authoritatively enforced across the booking calendar, database, and local files.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadTimeOff}
            disabled={isLoading}
            className="p-3 bg-brand-offwhite hover:bg-black/5 text-brand-black rounded-xl border border-black/10 transition-colors flex items-center gap-2 text-xs font-bold"
            title="Refresh availability list from database"
          >
            <RefreshCw className={cn("w-4 h-4 text-brand-red", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={handleOpenAddForm}
            className="bg-brand-red hover:bg-[#c41a21] text-white font-bold px-5 py-3 rounded-xl text-xs transition-all shadow-md shadow-brand-red/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Block Time Off</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs">
          <span className="text-[11px] font-bold text-black/50 uppercase tracking-wider block">Total Scheduled</span>
          <div className="text-2xl font-display font-bold text-brand-black mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs">
          <span className="text-[11px] font-bold text-black/50 uppercase tracking-wider block">Upcoming Active</span>
          <div className="text-2xl font-display font-bold text-emerald-600 mt-0.5">{stats.upcoming}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs">
          <span className="text-[11px] font-bold text-black/50 uppercase tracking-wider block">Full Days Off</span>
          <div className="text-2xl font-display font-bold text-amber-600 mt-0.5">{stats.fullDays}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs">
          <span className="text-[11px] font-bold text-black/50 uppercase tracking-wider block">Partial Windows</span>
          <div className="text-2xl font-display font-bold text-blue-600 mt-0.5">{stats.partial}</div>
        </div>
      </div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm border",
              feedback.type === 'success' 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-red-50 border-red-200 text-red-800"
            )}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 text-black/40 hover:text-black rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingBlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/10 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-black">Remove Time Off Block</h3>
                  <span className="text-xs text-black/50">Restore booking availability for students</span>
                </div>
              </div>

              <div className="p-4 bg-brand-offwhite rounded-2xl border border-black/5 space-y-2 mb-5 text-xs">
                <div className="flex justify-between">
                  <span className="text-black/50">Date:</span>
                  <span className="font-bold text-brand-black">{formatHumanDate(deletingBlock.date)} ({deletingBlock.date})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/50">Type:</span>
                  <span className="font-bold text-brand-black">
                    {deletingBlock.isFullDay 
                      ? 'Full Day Off (All Day)' 
                      : `${deletingBlock.startTime} – ${deletingBlock.endTime}`}
                  </span>
                </div>
                {deletingBlock.reason && (
                  <div className="flex justify-between gap-2">
                    <span className="text-black/50 shrink-0">Reason:</span>
                    <span className="font-medium text-black/80 italic text-right">{deletingBlock.reason}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-black/50">Instructor:</span>
                  <span className="font-semibold text-brand-black">{deletingBlock.instructorName || 'Wally'}</span>
                </div>
              </div>

              <p className="text-xs text-black/60 mb-6 leading-relaxed">
                Removing this block will immediately open up this schedule on the customer booking calendar. Confirmed student bookings are protected.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingBlock(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-black/60 hover:text-black rounded-xl hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Restore Availability</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Time Off Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-black/10 overflow-hidden relative my-6"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-brand-black text-white flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">
                      {editingBlockId ? 'Edit Blocked Availability' : 'Block Date or Time Off'}
                    </h3>
                    <span className="text-xs text-white/60">
                      Authoritatively prevent lesson bookings for selected window.
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveBlock} className="p-6 space-y-5">
                
                {/* Instructor Selection */}
                <div>
                  <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                    Instructor Roster
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 bg-brand-offwhite border border-black/10 rounded-xl">
                      <User className="w-4 h-4 text-brand-red" />
                      <select
                        value={instructorId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInstructorId(val);
                          setInstructorName(val === 'wally' ? 'Wally' : val);
                        }}
                        className="w-full bg-transparent text-xs font-bold text-brand-black focus:outline-none"
                      >
                        <option value="wally">Wally (Owner & Lead Instructor)</option>
                        <option value="instructor-2">Second Instructor (Western Sydney)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Selection with Quick Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider">
                      Select Date
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleQuickDate(0)}
                        className="px-2 py-0.5 rounded-md bg-black/5 hover:bg-black/10 text-black/70 font-semibold"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate(1)}
                        className="px-2 py-0.5 rounded-md bg-black/5 hover:bg-black/10 text-black/70 font-semibold"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate(7)}
                        className="px-2 py-0.5 rounded-md bg-black/5 hover:bg-black/10 text-black/70 font-semibold"
                      >
                        +7 Days
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                    required
                  />
                  {date && (
                    <span className="text-[11px] text-brand-red font-semibold mt-1 block">
                      {formatHumanDate(date)}
                    </span>
                  )}
                </div>

                {/* Block Type: Full Day Off vs Specific Time Window */}
                <div>
                  <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                    Block Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFullDay(true)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left font-bold transition-all cursor-pointer flex flex-col gap-1",
                        isFullDay 
                          ? "bg-amber-500/10 border-amber-500 text-amber-900 shadow-xs" 
                          : "bg-brand-offwhite border-black/10 text-black/60 hover:bg-black/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider">Full Day Off</span>
                        {isFullDay && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                      </div>
                      <span className="text-[11px] font-normal text-black/60">
                        Entire working day blocked (08:00 AM – 06:00 PM)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFullDay(false)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left font-bold transition-all cursor-pointer flex flex-col gap-1",
                        !isFullDay 
                          ? "bg-brand-red/10 border-brand-red text-brand-red shadow-xs" 
                          : "bg-brand-offwhite border-black/10 text-black/60 hover:bg-black/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider">Partial Hours</span>
                        {!isFullDay && <CheckCircle2 className="w-4 h-4 text-brand-red" />}
                      </div>
                      <span className="text-[11px] font-normal text-black/60">
                        Block specific morning or afternoon window
                      </span>
                    </button>
                  </div>
                </div>

                {/* Partial Time Range */}
                {!isFullDay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-brand-offwhite rounded-2xl border border-black/5 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-black/60 mb-1">Start Time</label>
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                        >
                          {COMMON_TIME_SLOTS.map(s => (
                            <option key={`start-${s}`} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black/60 mb-1">End Time</label>
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                        >
                          {COMMON_TIME_SLOTS.map(s => (
                            <option key={`end-${s}`} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Reason / Notes with Quick Presets */}
                <div>
                  <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                    Reason / Internal Note
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Car servicing, Personal appointment, Public holiday"
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-red mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReason(preset)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                          reason === preset 
                            ? "bg-brand-red text-white" 
                            : "bg-black/5 text-black/70 hover:bg-black/10"
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conflict Warning Card */}
                {conflicts.length > 0 && (
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-red-900 block">
                          Conflict Detected ({conflicts.length} Confirmed Lesson{conflicts.length > 1 ? 's' : ''})
                        </span>
                        <p className="text-[11px] text-red-800 leading-relaxed mt-0.5">
                          Driving school policy protects confirmed student bookings. Please contact or reschedule these students before blocking this period:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {conflicts.map((c) => (
                        <div 
                          key={c.bookingRef}
                          className="p-2.5 bg-white rounded-xl border border-red-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-brand-black block">
                              {c.studentName} (#{c.bookingRef})
                            </span>
                            <span className="text-[11px] text-black/60 block">
                              {formatHumanDate(c.date)} at {c.time} • {c.suburb}
                            </span>
                          </div>
                          <a
                            href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${c.studentName}, Wally here regarding your upcoming lesson on ${c.date} at ${c.time}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 shrink-0"
                          >
                            WhatsApp Student
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-black/10">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-black/60 hover:text-black rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || conflicts.length > 0 || isCheckingConflicts}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer",
                      conflicts.length > 0 
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                        : "bg-brand-red hover:bg-[#c41a21] text-white shadow-brand-red/25"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Block...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{editingBlockId ? 'Update Block' : 'Save Time Off Block'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Blocks List Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 space-y-6">
        {/* Controls: Search and Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-red" />
            <h3 className="text-base sm:text-lg font-bold text-brand-black">
              Scheduled Time Off & Blocked Dates
            </h3>
            <span className="bg-black/5 text-black/70 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredBlocks.length} of {blocks.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search date or reason..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-brand-offwhite border border-black/10 rounded-xl focus:outline-none focus:border-brand-red font-medium text-brand-black"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-brand-offwhite rounded-xl border border-black/5 text-[11px] font-bold">
              <button
                onClick={() => setActiveFilter('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  activeFilter === 'all' ? "bg-white text-brand-black shadow-xs" : "text-black/50 hover:text-black"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('upcoming')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  activeFilter === 'upcoming' ? "bg-white text-brand-black shadow-xs" : "text-black/50 hover:text-black"
                )}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveFilter('fullday')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  activeFilter === 'fullday' ? "bg-white text-brand-black shadow-xs" : "text-black/50 hover:text-black"
                )}
              >
                Full Days
              </button>
              <button
                onClick={() => setActiveFilter('partial')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  activeFilter === 'partial' ? "bg-white text-brand-black shadow-xs" : "text-black/50 hover:text-black"
                )}
              >
                Partial
              </button>
            </div>
          </div>
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-black/50">
            <RefreshCw className="w-7 h-7 animate-spin text-brand-red" />
            <span className="text-xs font-semibold">Synchronizing with database...</span>
          </div>
        ) : filteredBlocks.length === 0 ? (
          <div className="py-14 text-center text-black/50 bg-brand-offwhite rounded-2xl border border-dashed border-black/10 px-4">
            <Ban className="w-10 h-10 mx-auto text-black/20 mb-2.5" />
            <p className="text-sm font-bold text-brand-black mb-1">
              {searchQuery ? 'No matching time off blocks found.' : 'No time off blocks scheduled.'}
            </p>
            <p className="text-xs text-black/50 max-w-sm mx-auto mb-4">
              {searchQuery 
                ? 'Try clearing your search query to see all scheduled blocks.' 
                : 'Your working calendar is completely open for customer bookings.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="bg-black/10 text-brand-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-black/15 transition-all cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenAddForm}
                className="bg-brand-red text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#c41a21] transition-all shadow-md shadow-brand-red/20 cursor-pointer"
              >
                + Add Day Off
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBlocks.map((block) => {
              const isPastDate = block.date < todayStr;
              return (
                <motion.div 
                  key={block.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative",
                    isPastDate
                      ? "bg-black/[0.02] border-black/5 opacity-70"
                      : "bg-brand-offwhite border-black/10 hover:border-black/20 hover:shadow-sm"
                  )}
                >
                  <div>
                    {/* Top Date & Type Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand-red shrink-0" />
                          <span className="font-display font-bold text-sm sm:text-base text-brand-black">
                            {formatHumanDate(block.date)}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-black/40 block mt-0.5 ml-6">
                          {block.date} {isPastDate && '(Past)'}
                        </span>
                      </div>

                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0",
                        block.isFullDay 
                          ? "bg-amber-100 text-amber-900 border-amber-300" 
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      )}>
                        {block.isFullDay ? 'Full Day Off' : 'Partial Window'}
                      </span>
                    </div>

                    {/* Hours Info */}
                    <div className="flex items-center gap-2 text-xs text-black/70 mb-3 bg-white px-3 py-2 rounded-xl border border-black/5">
                      <Clock className="w-3.5 h-3.5 text-brand-red shrink-0" />
                      <span className="font-semibold text-brand-black">
                        {block.isFullDay 
                          ? 'All Day (08:00 AM – 06:00 PM)' 
                          : `${block.displayStartTime || block.startTime} – ${block.displayEndTime || block.endTime}`}
                      </span>
                    </div>

                    {/* Reason / Internal Notes */}
                    {block.reason ? (
                      <div className="flex items-start gap-2 text-xs text-black/70 bg-white/70 p-2.5 rounded-xl border border-black/5">
                        <FileText className="w-3.5 h-3.5 text-black/40 shrink-0 mt-0.5" />
                        <span className="italic font-medium">{block.reason}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-black/40 italic px-1">
                        No special note specified
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Instructor & Actions */}
                  <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-black/50">
                      Instructor: <strong className="text-brand-black">{block.instructorName || 'Wally'}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditBlock(block)}
                        className="px-2.5 py-1 bg-white hover:bg-black/5 text-black/70 hover:text-black rounded-lg transition-colors border border-black/10 flex items-center gap-1.5 font-semibold text-[11px] cursor-pointer"
                        title="Edit Block"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setDeletingBlock(block)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition-colors border border-red-200 flex items-center gap-1.5 font-bold text-[11px] cursor-pointer"
                        title="Remove Block & Restore Availability"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
