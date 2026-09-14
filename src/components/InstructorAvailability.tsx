import React, { useState, useEffect, useCallback } from 'react';
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
  HelpCircle,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface TimeOffItem {
  id: number;
  date: string;
  isFullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  startMinutes?: number | null;
  endMinutes?: number | null;
  reason?: string | null;
  instructorId?: string;
  instructorName?: string;
  createdAt?: string | Date;
}

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
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM'
];

export function InstructorAvailability() {
  const [blocks, setBlocks] = useState<TimeOffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
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

  // Load Time Off Blocks from Server
  const loadTimeOff = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('instructor_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/instructor/time-off', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.blocks)) {
          setBlocks(data.blocks);
        }
      }
    } catch (err) {
      console.error('Failed to load time off blocks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeOff();
  }, [loadTimeOff]);

  // Real-time conflict checker whenever date/time/fullDay changes
  const checkConflicts = useCallback(async (
    targetDate: string,
    fullDay: boolean,
    start: string,
    end: string,
    instId: string,
    excludeId?: number | null
  ) => {
    if (!targetDate) return;
    setIsCheckingConflicts(true);
    try {
      const token = localStorage.getItem('instructor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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
  }, []);

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

    setIsSaving(true);
    try {
      const token = localStorage.getItem('instructor_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = editingBlockId 
        ? `/api/instructor/time-off/${editingBlockId}` 
        : '/api/instructor/time-off';
      const method = editingBlockId ? 'PUT' : 'POST';

      const payload = {
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to save time off block');
      }

      setFeedback({
        type: 'success',
        message: editingBlockId 
          ? `Time off block on ${date} updated successfully!` 
          : `Availability blocked for ${date} (${isFullDay ? 'Full Day Off' : `${startTime} - ${endTime}`})!`
      });

      setIsFormOpen(false);
      await loadTimeOff();
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

  const handleDeleteBlock = async (block: TimeOffItem) => {
    if (!window.confirm(`Are you sure you want to remove this time off block on ${block.date}? This will restore normal booking availability for students on this date.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('instructor_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/instructor/time-off/${block.id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Time off on ${block.date} removed. Booking availability restored!`
        });
        setBlocks(prev => prev.filter(b => b.id !== block.id));
        setTimeout(() => setFeedback(null), 5000);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove block');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to remove time off block'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Instructor Availability Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-black">
            Availability & Time Off Settings
          </h2>
          <p className="text-xs sm:text-sm text-black/60 max-w-xl mt-1">
            Manage your scheduled days off or block specific time windows. Blocked dates are authoritatively protected from customer bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTimeOff}
            disabled={isLoading}
            className="p-2.5 bg-brand-offwhite hover:bg-black/5 text-brand-black rounded-xl border border-black/10 transition-colors"
            title="Refresh availability list"
          >
            <RefreshCw className={cn("w-4 h-4 text-brand-red", isLoading && "animate-spin")} />
          </button>

          <button
            onClick={handleOpenAddForm}
            className="bg-brand-red hover:bg-[#c41a21] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-brand-red/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Block Time Off</span>
          </button>
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

      {/* Add / Edit Time Off Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
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
                
                {/* Instructor Selection (Supports Multiple Instructors) */}
                <div>
                  <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                    Instructor Roster
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-brand-offwhite border border-black/10 rounded-xl">
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

                {/* Date Selection */}
                <div>
                  <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                    required
                  />
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
                          ? "bg-amber-500/10 border-amber-500 text-amber-900 shadow-sm" 
                          : "bg-brand-offwhite border-black/10 text-black/60 hover:bg-black/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider">Full Day Off</span>
                        {isFullDay && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                      </div>
                      <span className="text-[11px] font-normal text-black/60">
                        Entire working day blocked (08:00 AM - 06:00 PM)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFullDay(false)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left font-bold transition-all cursor-pointer flex flex-col gap-1",
                        !isFullDay 
                          ? "bg-brand-red/10 border-brand-red text-brand-red shadow-sm" 
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

                {/* Reason / Notes */}
                <div>
                  <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                    Reason / Internal Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Car servicing, Personal appointment, Public holiday"
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-red"
                  />
                </div>

                {/* Conflict Warning Card (Never silently wipe confirmed bookings!) */}
                {conflicts.length > 0 && (
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-red-900 block">
                          Conflict Detected ({conflicts.length} Confirmed Lesson{conflicts.length > 1 ? 's' : ''})
                        </span>
                        <p className="text-[11px] text-red-800 leading-relaxed mt-0.5">
                          Driving school policy prohibits silently cancelling confirmed student bookings. You must reschedule or contact these students before blocking this period:
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
                              {c.date} at {c.time} • {c.suburb}
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
                      "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md",
                      conflicts.length > 0 
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                        : "bg-brand-red hover:bg-[#c41a21] text-white shadow-brand-red/25 cursor-pointer"
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

      {/* Blocks List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-red" />
            <h3 className="text-base sm:text-lg font-bold text-brand-black">
              Scheduled Time Off & Blocked Dates
            </h3>
            <span className="bg-black/5 text-black/70 text-xs font-bold px-2 py-0.5 rounded-full">
              {blocks.length}
            </span>
          </div>

          <div className="text-xs text-black/50">
            Enforced on server & database
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-black/50">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-red" />
            <span className="text-xs font-semibold">Loading blocked dates...</span>
          </div>
        ) : blocks.length === 0 ? (
          <div className="py-12 text-center text-black/50 bg-brand-offwhite rounded-2xl border border-dashed border-black/10">
            <Ban className="w-8 h-8 mx-auto text-black/20 mb-2" />
            <p className="text-sm font-bold text-brand-black mb-1">No upcoming time off blocks scheduled.</p>
            <p className="text-xs text-black/50 max-w-sm mx-auto mb-4">
              Your normal working calendar is fully open for customer bookings.
            </p>
            <button
              onClick={handleOpenAddForm}
              className="bg-brand-red text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#c41a21] transition-all cursor-pointer"
            >
              + Add Day Off
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {blocks.map((block) => (
              <div 
                key={block.id}
                className="p-4 rounded-2xl bg-brand-offwhite border border-black/5 hover:border-black/15 transition-all flex flex-col justify-between gap-3 relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-display font-bold text-sm sm:text-base text-brand-black">
                      {block.date}
                    </span>

                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      block.isFullDay 
                        ? "bg-amber-100 text-amber-800 border-amber-300" 
                        : "bg-blue-50 text-blue-800 border-blue-200"
                    )}>
                      {block.isFullDay ? 'Full Day Off' : 'Partial Window'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-black/70 mb-2">
                    <Clock className="w-3.5 h-3.5 text-brand-red" />
                    <span className="font-semibold">
                      {block.isFullDay ? 'All Day (08:00 AM - 06:00 PM)' : `${block.startTime} - ${block.endTime}`}
                    </span>
                  </div>

                  {block.reason && (
                    <div className="flex items-start gap-1.5 text-xs text-black/60 bg-white/70 p-2 rounded-xl border border-black/5">
                      <FileText className="w-3.5 h-3.5 text-black/40 shrink-0 mt-0.5" />
                      <span className="italic">{block.reason}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-black/50">
                    Instructor: <strong>{block.instructorName || 'Wally'}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditBlock(block)}
                      className="p-1.5 hover:bg-black/5 text-black/60 hover:text-black rounded-lg transition-colors cursor-pointer"
                      title="Edit Block"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteBlock(block)}
                      className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                      title="Remove Block & Restore Availability"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
