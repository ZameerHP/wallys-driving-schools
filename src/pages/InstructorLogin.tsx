import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  ChevronDown, 
  User, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  LogOut, 
  Lock, 
  AlertCircle, 
  MapPin, 
  Smartphone, 
  FileText,
  MessageCircle,
  Mail,
  Search,
  Sparkles,
  RefreshCw,
  Trash2,
  X,
  Plus,
  PlusCircle,
  CalendarCheck,
  CalendarOff,
  CalendarX,
  Edit3,
  AlertTriangle,
  Check,
  Sliders
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '../lib/utils';
import { ManualBookingModal } from '../components/ManualBookingModal';
import { EditBookingModal } from '../components/EditBookingModal';
import { 
  fetchTimeOffBlocks, 
  createClientTimeOffBlock, 
  deleteClientTimeOffBlock,
  getLocalTimeOffBlocks,
  isTimeOffBlockDeleted 
} from '../lib/timeOff';

const TIME_SLOT_OPTIONS = [
  '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
];

const BLOCK_REASON_PRESETS = [
  'Personal Day Off',
  'Vehicle Maintenance & Service',
  'RMS / Service NSW Driving Test Duty',
  'Medical / Doctor Appointment',
  'Annual Leave / Holiday',
  'Severe Weather / Unsafe Driving Conditions'
];

function formatBlockDate(dateStr: string): string {
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
import { InstructorAvailability } from '../components/InstructorAvailability';
import { InstructorDayOff } from '../components/InstructorDayOff';
import { 
  isOwnerLoggedIn, 
  setOwnerLoggedIn, 
  logoutOwner, 
  updateBookingStatus, 
  BookingItem,
  fetchBookingsFromDb,
  updateBookingInDb,
  deleteBookingFromDb,
  triggerLessonReminder,
  fetchReminderSystemStatus
} from '../lib/bookings';

function InstructorLoginGate({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/instructor-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem("instructor_token", data.token);
        }
        setOwnerLoggedIn(true);
        onLogin();
      } else {
        setError(data.message || 'Access Denied: Only the owner (Wally) is authorized to access the instructor portal.');
      }
    } catch {
      setIsLoading(false);
      setError('Unable to reach authentication server. Please check your network connection.');
    }
  };

  return (
    <div className="pt-32 pb-24 bg-brand-black min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background accents */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <div className="absolute -left-40 top-20 w-96 h-96 border-[40px] border-brand-red rounded-full mix-blend-screen" />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] bg-brand-red rounded-full mix-blend-screen filter blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[36px] p-8 md:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          <div className="text-center mb-8 relative z-10">
            <div className="bg-white/95 px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(227,34,42,0.4)] mx-auto mb-5 flex items-center justify-center w-fit">
              <img src="/assets/logo.png" alt="Wallys Driving School" className="h-11 w-auto object-contain max-w-[170px]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/20 border border-brand-red/30 text-brand-red text-xs font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3" />
              <span>Owner Access Only</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 tracking-tight">
              Instructor Portal
            </h1>
            <p className="text-white/60 text-xs sm:text-sm">
              Restricted to Wally (Owner). Access instructor driving schedules, student roster, and daily timetable.
            </p>
          </div>

          <form className="flex flex-col gap-4 relative z-10" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">Owner Username / Email</label>
              <input 
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300 text-sm"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              type="submit" 
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-brand-red text-white font-bold rounded-2xl py-3.5 hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_25px_rgba(227,34,42,0.4)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              {isLoading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                />
              ) : (
                'Sign In to Instructor Schedule'
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10 flex flex-col gap-2">
            <span className="text-xs text-white/40">Credential: Wally@wallysdrivingschool.com.au</span>
            <Link to="/manage-booking" className="text-xs font-medium text-brand-red hover:underline">
              ← Customer Booking Lookup & Reschedule
            </Link>
          </div>
        </motion.div>
        
        <div className="mt-8 text-center text-white/40 text-sm">
          <Link to="/" className="hover:text-white transition-colors inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Wallys Driving School
          </Link>
        </div>
      </div>
    </div>
  );
}

function InstructorDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
  const [bookingsList, setBookingsList] = useState<BookingItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  
  // Resend Email Reminder Engine state
  const [sendingReminderRef, setSendingReminderRef] = useState<string | null>(null);
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [reminderStatusInfo, setReminderStatusInfo] = useState<{
    configured: boolean;
    provider: 'resend' | 'none';
    fromEmail?: string;
    timezone: string;
    intervalSeconds: number;
    stats?: {
      totalConfirmed: number;
      scheduled: number;
      sent: number;
      failed: number;
      cancelled: number;
    };
  } | null>(null);

  // Section navigation state - strictly sticky across page refresh and browser close
  type InstructorTab = 'schedule' | 'day-off' | 'availability';
  const [activeTab, setActiveTabState] = useState<InstructorTab>(() => {
    try {
      const saved = localStorage.getItem('wallys_instructor_active_tab') as InstructorTab;
      if (saved === 'schedule' || saved === 'day-off' || saved === 'availability') {
        return saved;
      }
    } catch {}
    return 'schedule';
  });

  const setActiveTab = useCallback((tab: InstructorTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('wallys_instructor_active_tab', tab);
    } catch {}
  }, []);

  // Blocked Days & Time Off state - initialized from cache to avoid displaying 0 on page refresh
  const [blockedDaysList, setBlockedDaysList] = useState<any[]>(() => {
    return getLocalTimeOffBlocks();
  });
  const [isDeletingBlockId, setIsDeletingBlockId] = useState<string | number | null>(null);

  // Block Modal State for direct blocking on dashboard
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split('T')[0];
  });
  const [blockIsFullDay, setBlockIsFullDay] = useState(true);
  const [blockStartTime, setBlockStartTime] = useState('09:00 AM');
  const [blockEndTime, setBlockEndTime] = useState('01:00 PM');
  const [blockReason, setBlockReason] = useState('');
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [blockConflicts, setBlockConflicts] = useState<any[]>([]);
  const [isCheckingBlockConflicts, setIsCheckingBlockConflicts] = useState(false);

  // Check conflicts in real time when block modal is open
  useEffect(() => {
    if (!isBlockModalOpen || !blockDate) return;
    let active = true;
    setIsCheckingBlockConflicts(true);

    fetch('/api/instructor/time-off/check-conflicts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-instructor-token': 'wally_owner_session'
      },
      body: JSON.stringify({
        date: blockDate,
        isFullDay: blockIsFullDay,
        startTime: blockIsFullDay ? undefined : blockStartTime,
        endTime: blockIsFullDay ? undefined : blockEndTime,
        instructorId: 'wally'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (active) {
          setBlockConflicts(Array.isArray(data.conflicts) ? data.conflicts : []);
        }
      })
      .catch(() => {
        if (active) setBlockConflicts([]);
      })
      .finally(() => {
        if (active) setIsCheckingBlockConflicts(false);
      });

    return () => {
      active = false;
    };
  }, [isBlockModalOpen, blockDate, blockIsFullDay, blockStartTime, blockEndTime]);

  const handleOpenBlockModal = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    setBlockDate(t.toISOString().split('T')[0]);
    setBlockIsFullDay(true);
    setBlockStartTime('09:00 AM');
    setBlockEndTime('01:00 PM');
    setBlockReason('');
    setBlockConflicts([]);
    setIsBlockModalOpen(true);
  };

  const handleSaveNewBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;

    if (blockConflicts.length > 0) {
      setActionFeedback(`⚠️ Cannot block ${blockDate}: overlaps with ${blockConflicts.length} confirmed student booking(s). Please reschedule or resolve first.`);
      return;
    }

    setIsSavingBlock(true);

    // Optimistic UI update: instantly show new block in list and update count!
    const tempId = Date.now();
    const optimisticBlock = {
      id: tempId,
      instructorId: 'wally',
      instructorName: 'Wally',
      date: blockDate,
      isFullDay: blockIsFullDay,
      startTime: blockIsFullDay ? null : blockStartTime,
      endTime: blockIsFullDay ? null : blockEndTime,
      displayStartTime: blockIsFullDay ? null : blockStartTime,
      displayEndTime: blockIsFullDay ? null : blockEndTime,
      reason: blockReason.trim() || 'Instructor Time Off'
    };

    setBlockedDaysList(prev => {
      const filtered = prev.filter(b => b.date !== blockDate);
      return [optimisticBlock, ...filtered].sort((a, b) => a.date.localeCompare(b.date));
    });

    try {
      await createClientTimeOffBlock({
        date: blockDate,
        isFullDay: blockIsFullDay,
        startTime: blockIsFullDay ? null : blockStartTime,
        endTime: blockIsFullDay ? null : blockEndTime,
        reason: blockReason.trim() || 'Instructor Time Off',
        instructorId: 'wally',
        instructorName: 'Wally'
      });

      setIsBlockModalOpen(false);
      setActionFeedback(`Availability blocked for ${formatBlockDate(blockDate)} (${blockIsFullDay ? 'All Day' : `${blockStartTime} – ${blockEndTime}`})! Customers cannot book this slot.`);

      // Sync from storage/backend
      await loadBlockedDays();
    } catch (err: any) {
      console.error('Failed to create block:', err);
      setActionFeedback(`Error: ${err.message || 'Failed to block availability'}`);
      await loadBlockedDays();
    } finally {
      setIsSavingBlock(false);
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  // Edit & Reschedule modal state
  const [editingBooking, setEditingBooking] = useState<BookingItem | null>(null);

  // Manual booking modal state
  const [isAddBookingModalOpen, setIsAddBookingModalOpen] = useState(false);

  const loadBlockedDays = useCallback(async () => {
    try {
      const blocks = await fetchTimeOffBlocks();
      if (Array.isArray(blocks)) {
        setBlockedDaysList(prev => {
          if (prev.length === blocks.length && prev.every((b, i) => b.id === blocks[i]?.id && b.date === blocks[i]?.date && b.isFullDay === blocks[i]?.isFullDay && b.startTime === blocks[i]?.startTime && b.endTime === blocks[i]?.endTime)) {
            return prev;
          }
          return blocks;
        });
      } else {
        const local = getLocalTimeOffBlocks();
        setBlockedDaysList(prev => (prev.length === local.length ? prev : local));
      }
    } catch (err) {
      console.warn('Failed to load blocked days list:', err);
      setBlockedDaysList(getLocalTimeOffBlocks());
    }
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [data, reminderStats] = await Promise.all([
        fetchBookingsFromDb(),
        fetchReminderSystemStatus(),
        loadBlockedDays()
      ]);
      setBookingsList(data);
      if (reminderStats) setReminderStatusInfo(reminderStats);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleAvailabilitySync = (e?: any) => {
      // If event was purely a recurring weekly days-off toggle, do not reload blocked days to prevent stutter
      const detail = e?.detail || e?.data;
      if (detail && detail.weeklyDaysOff && !detail.block && !detail.date) {
        return;
      }
      loadBlockedDays();
    };

    window.addEventListener('wallys-availability-updated', handleAvailabilitySync);
    window.addEventListener('storage', handleAvailabilitySync);

    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('wallys-availability-channel');
        channel.onmessage = (msg) => handleAvailabilitySync(msg);
      }
    } catch {}

    return () => {
      window.removeEventListener('wallys-availability-updated', handleAvailabilitySync);
      window.removeEventListener('storage', handleAvailabilitySync);
      if (channel) channel.close();
    };
  }, [loadBlockedDays]);

  const handleRemoveBlock = async (block: any) => {
    const blockId = block.id;
    const blockDate = block.date;
    setIsDeletingBlockId(blockId);

    // Optimistic UI update: instantly remove from state
    setBlockedDaysList(prev => prev.filter(b => String(b.id) !== String(blockId) && b.date !== blockDate));
    setActionFeedback(`Removing block for ${blockDate}...`);

    try {
      await deleteClientTimeOffBlock(blockId, blockDate);
      setActionFeedback(`Time off on ${blockDate} removed successfully! Date is now unblocked and students can book.`);
      await loadBlockedDays();
    } catch (err: any) {
      console.error('Failed to remove block:', err);
      setActionFeedback(`Error removing block: ${err?.message || 'Server error'}`);
      await loadBlockedDays();
    } finally {
      setIsDeletingBlockId(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleTriggerReminder = async (apt: BookingItem, force = true) => {
    const targetRef = apt.bookingRef || apt.ref || apt.id;
    setSendingReminderRef(targetRef);
    try {
      const res = await triggerLessonReminder(targetRef, force);
      if (res.success) {
        const dest = res.recipientEmail || apt.email || 'student email';
        setActionFeedback(`Resend lesson reminder email ${res.status === 'scheduled' ? 'scheduled' : 'sent'} to student (${apt.studentName} at ${dest})!`);
        setBookingsList(prev => prev.map(b => (b.ref === apt.ref || b.id === apt.id) ? {
          ...b,
          reminderStatus: (res.status as any) || 'sent',
          reminderSentAt: res.status === 'sent' ? new Date().toISOString() : b.reminderSentAt,
          reminderMessageId: res.emailId || res.messageId || null,
          reminderRecipientEmail: res.recipientEmail || b.email,
          reminderError: null
        } : b));
      } else {
        setActionFeedback(`Resend reminder error: ${res.error || 'Failed to dispatch email'}. Check RESEND_API_KEY.`);
        setBookingsList(prev => prev.map(b => (b.ref === apt.ref || b.id === apt.id) ? {
          ...b,
          reminderStatus: 'failed',
          reminderError: res.error || 'Delivery failed'
        } : b));
      }
      // Refresh reminder status stats
      fetchReminderSystemStatus().then(st => { if (st) setReminderStatusInfo(st); });
    } catch (err: any) {
      setActionFeedback(`Reminder exception: ${err?.message || err}`);
    } finally {
      setSendingReminderRef(null);
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  const handleRunScheduler = async () => {
    setIsRunningCron(true);
    try {
      const res = await fetch('/api/reminders/cron/run', { method: 'POST' });
      const data = await res.json();
      setActionFeedback(`Scheduler executed: ${data.processed || 0} reminders processed (${data.sent || 0} sent, ${data.failed || 0} failed).`);
      await loadData();
    } catch (err: any) {
      setActionFeedback(`Scheduler error: ${err?.message || err}`);
    } finally {
      setIsRunningCron(false);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleUpdateStatus = async (item: BookingItem, newStatus: BookingItem['status']) => {
    const updated = updateBookingStatus(item.id, newStatus);
    setBookingsList(updated);
    setActiveStatusDropdown(null);
    await updateBookingInDb(item.id, { status: newStatus }, item.ref);
  };

  const handleSaveBookingEdit = async (updatedFields: Partial<BookingItem>) => {
    if (!editingBooking) return;

    const refToMatch = editingBooking.ref;
    const updated = bookingsList.map(b => 
      (b.id === editingBooking.id || b.ref === refToMatch) ? { ...b, ...updatedFields } : b
    );
    setBookingsList(updated);

    await updateBookingInDb(editingBooking.id, updatedFields, refToMatch);

    setActionFeedback(`Booking #${refToMatch} (${updatedFields.studentName || editingBooking.studentName}) updated and synchronized with database!`);
    setTimeout(() => setActionFeedback(null), 6000);

    await loadData();
  };

  const handleDelete = async (item: BookingItem) => {
    // 1. Immediately remove from state for instant UI update
    setBookingsList(prev => prev.filter(b => b.id !== item.id && b.ref !== item.ref));

    // 2. Show instant visual confirmation
    setActionFeedback(`Lesson #${item.ref} for ${item.studentName} removed from UI and database.`);
    setTimeout(() => setActionFeedback(null), 4000);

    // 3. Delete from Backend API (Cloud SQL), Supabase, and local storage
    try {
      await deleteBookingFromDb(item.id, item.ref);
    } catch (err) {
      console.error('Failed to delete booking from database:', err);
    }
  };

  const filtered = bookingsList.filter(b => {
    const matchesStatus = statusTab === 'All' || b.status === statusTab;
    const q = searchFilter.toLowerCase();
    const matchesSearch = 
      b.studentName.toLowerCase().includes(q) ||
      b.suburb.toLowerCase().includes(q) ||
      b.ref.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      (b.pickupAddress && b.pickupAddress.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="pt-24 bg-brand-offwhite min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full md:w-64 bg-brand-black text-white shrink-0 min-h-screen p-6 sticky top-0 md:h-screen overflow-y-auto z-20 border-r border-white/10 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 border-2 border-brand-red shadow-[0_0_15px_rgba(227,34,42,0.4)] bg-neutral-900">
              <img 
                src="/instructor.jpg" 
                alt="Wally" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base leading-none tracking-tight">Wally (Owner)</span>
              <span className="text-[10px] text-brand-red font-semibold uppercase mt-0.5">Lead Driving Instructor</span>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('schedule')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer w-full",
                activeTab === 'schedule'
                  ? "bg-brand-red text-white shadow-[0_0_15px_rgba(227,34,42,0.3)]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span>Instructor Schedule</span>
            </button>

            <button
              onClick={() => setActiveTab('day-off')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer w-full",
                activeTab === 'day-off'
                  ? "bg-brand-red text-white shadow-[0_0_15px_rgba(227,34,42,0.3)]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <CalendarOff className="w-4 h-4 text-amber-300" />
              <span>Instructor Day Off</span>
            </button>

            <button
              onClick={() => setActiveTab('availability')}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer w-full",
                activeTab === 'availability'
                  ? "bg-brand-red text-white shadow-[0_0_15px_rgba(227,34,42,0.3)]"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Blocked Days & Time Off</span>
              </div>
              {blockedDaysList.length > 0 && (
                <span className="bg-amber-500/30 text-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {blockedDaysList.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setIsAddBookingModalOpen(true)}
              className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl font-bold text-sm transition-all text-left cursor-pointer w-full"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Book for Client</span>
            </button>

            <Link 
              to="/manage-booking"
              className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl font-bold text-sm transition-all"
            >
              <FileText className="w-4 h-4 text-brand-red" />
              <span>Customer Lookup</span>
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10 space-y-2">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl font-medium text-sm transition-all duration-300 w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-5xl"
        >
          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-black/10 pb-4">
            <button
              onClick={() => setActiveTab('schedule')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === 'schedule'
                  ? "bg-brand-black text-white shadow-md"
                  : "bg-white text-black/60 hover:text-black border border-black/5 hover:bg-black/5"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span>Driving Schedule</span>
            </button>

            <button
              onClick={() => setActiveTab('day-off')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === 'day-off'
                  ? "bg-brand-black text-white shadow-md"
                  : "bg-white text-black/60 hover:text-black border border-black/5 hover:bg-black/5"
              )}
            >
              <CalendarOff className="w-4 h-4 text-amber-500" />
              <span>Instructor Day Off</span>
            </button>

            <button
              onClick={() => setActiveTab('availability')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === 'availability'
                  ? "bg-brand-black text-white shadow-md"
                  : "bg-white text-black/60 hover:text-black border border-black/5 hover:bg-black/5"
              )}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Blocked Days & Time Off</span>
              {blockedDaysList.length > 0 && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">
                  {blockedDaysList.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'day-off' ? (
            <InstructorDayOff currentInstructorId="wally" />
          ) : activeTab === 'availability' ? (
            <InstructorAvailability />
          ) : (
            <>
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-red">Active Driving Roster</span>
              <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1 text-brand-black">Wallys Instructor Schedule</h1>
              <p className="text-brand-black/60 text-xs sm:text-sm">
                Real-time student appointments, pickup addresses, dates, and times across Western Sydney.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddBookingModalOpen(true)}
                className="bg-brand-red hover:bg-[#c41a21] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-red/20 hover:shadow-brand-red/30"
                title="Manually Add Booking for Client"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Booking</span>
              </button>

              <button
                onClick={loadData}
                disabled={isRefreshing}
                className="bg-white hover:bg-black/5 text-black border border-black/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Refresh Live Schedule"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-brand-red", isRefreshing && "animate-spin")} />
                <span>Refresh Schedule</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          <AnimatePresence>
            {actionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionFeedback}</span>
                </div>
                <button 
                  onClick={() => setActionFeedback(null)} 
                  className="text-emerald-600 hover:text-emerald-900 ml-3 p-1 rounded-lg hover:bg-emerald-100/60"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Automatic Resend Email Reminder Engine Status Banner */}
          <div className="bg-gradient-to-r from-emerald-950 to-neutral-900 text-white rounded-3xl p-5 mb-6 shadow-md border border-emerald-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Automatic Resend Email Lesson Reminder System
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      reminderStatusInfo?.configured ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    )}>
                      {reminderStatusInfo?.configured 
                        ? 'Resend API Live' 
                        : 'Ready (Awaiting RESEND_API_KEY)'}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    Automatically sends 1 reminder email to the student's email address <strong>2 hours before</strong> lesson start time. Sender: <span className="font-mono text-emerald-300">{reminderStatusInfo?.fromEmail || 'info@wallysdrivingschool.com.au'}</span>. Timezone: <span className="font-mono text-emerald-300">{reminderStatusInfo?.timezone || 'Australia/Sydney'}</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {reminderStatusInfo?.stats && (
                  <div className="hidden lg:flex items-center gap-2 text-xs text-white/80">
                    <span className="px-2.5 py-1 bg-white/10 rounded-xl">
                      <strong className="text-blue-300 font-bold">{reminderStatusInfo.stats.scheduled}</strong> Scheduled
                    </span>
                    <span className="px-2.5 py-1 bg-white/10 rounded-xl">
                      <strong className="text-emerald-300 font-bold">{reminderStatusInfo.stats.sent}</strong> Sent
                    </span>
                    {reminderStatusInfo.stats.failed > 0 && (
                      <span className="px-2.5 py-1 bg-red-500/20 text-red-300 rounded-xl">
                        <strong className="font-bold">{reminderStatusInfo.stats.failed}</strong> Failed
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={handleRunScheduler}
                  disabled={isRunningCron}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="Force run the background 2-hour reminder scheduler check right now"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRunningCron && "animate-spin")} />
                  <span>{isRunningCron ? "Checking..." : "Run Check Now"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Blocked Days & Instructor Time Off Section */}
          <div id="blocked-days-section" className="bg-white rounded-3xl p-5 md:p-6 mb-6 shadow-sm border border-black/10 transition-all">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-black/5">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 shadow-sm">
                  <CalendarOff className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base sm:text-lg font-bold text-brand-black tracking-tight">
                      Blocked Days & Off-Time Management
                    </h3>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm",
                      blockedDaysList.length > 0
                        ? "bg-amber-500 text-white shadow-amber-500/20"
                        : "bg-emerald-600 text-white shadow-emerald-600/20"
                    )}>
                      {blockedDaysList.length > 0 ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{blockedDaysList.length} Active Block{blockedDaysList.length === 1 ? '' : 's'} Made</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>0 Blocks • 100% Fully Open</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-black/60 mt-1">
                    Dates or hours marked off will block customers from booking on the website. Remove any block below to immediately restore booking availability.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenBlockModal}
                  className="bg-brand-red hover:bg-[#c41a21] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-red/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Block Date or Specific Time</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('availability')}
                  className="bg-white hover:bg-neutral-100 text-brand-black border border-black/15 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="Open monthly calendar view"
                >
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Full Calendar View</span>
                </button>
              </div>
            </div>

            {/* Prominent Counter / Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-black/60">Total Blocks Made</span>
                <span className="text-2xl font-extrabold text-brand-black mt-0.5">{blockedDaysList.length}</span>
                <span className="text-[10px] text-black/50 font-medium">Off-duty records</span>
              </div>
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-amber-900">Full Days Off</span>
                <span className="text-2xl font-extrabold text-amber-700 mt-0.5">
                  {blockedDaysList.filter(b => Boolean(b.isFullDay)).length}
                </span>
                <span className="text-[10px] text-amber-700/80 font-medium">All day closed</span>
              </div>
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-blue-900">Partial Windows</span>
                <span className="text-2xl font-extrabold text-blue-700 mt-0.5">
                  {blockedDaysList.filter(b => !b.isFullDay).length}
                </span>
                <span className="text-[10px] text-blue-700/80 font-medium">Specific hours off</span>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-emerald-900">Upcoming Blocks</span>
                <span className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                  {blockedDaysList.filter(b => b.date >= (new Date().toISOString().split('T')[0])).length}
                </span>
                <span className="text-[10px] text-emerald-700/80 font-medium">Future lockouts</span>
              </div>
            </div>

            {/* List of Active Blocks */}
            {blockedDaysList.length === 0 ? (
              <div className="p-6 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-emerald-950">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900">No Blocked Days or Times</h4>
                    <p className="text-xs text-emerald-800/80 mt-0.5">
                      All standard lesson slots (08:00 AM – 06:00 PM) are currently open for student bookings across Western Sydney.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenBlockModal}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Block a Day or Time Now</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-black/60 font-semibold px-1">
                  <span>Showing all {blockedDaysList.length} active block{blockedDaysList.length === 1 ? '' : 's'} — click "Remove Block" to restore student bookings:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {blockedDaysList.map((block) => {
                    const isFull = Boolean(block.isFullDay);
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isPast = block.date < todayStr;
                    return (
                      <div
                        key={block.id || block.date}
                        className={cn(
                          "p-4 rounded-2xl flex flex-col justify-between gap-3 transition-all border shadow-sm",
                          isFull
                            ? "bg-amber-50/70 border-amber-300 hover:border-amber-400"
                            : "bg-blue-50/70 border-blue-300 hover:border-blue-400"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-bold text-sm text-brand-black flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-brand-red" />
                              {formatBlockDate(block.date)}
                            </span>
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                              isFull
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-blue-100 text-blue-900 border-blue-300"
                            )}>
                              {isFull ? "Full Day Off" : "Partial Window"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-semibold text-black/80 bg-white/90 px-3 py-2 rounded-xl border border-black/5 mb-2">
                            <Clock className="w-3.5 h-3.5 text-brand-red shrink-0" />
                            <span>
                              {isFull
                                ? "All Day (08:00 AM – 06:00 PM)"
                                : `${block.displayStartTime || block.startTime} – ${block.displayEndTime || block.endTime}`}
                            </span>
                            {isPast && (
                              <span className="ml-auto text-[10px] text-black/40 bg-black/5 px-2 py-0.5 rounded-md font-normal">
                                Past
                              </span>
                            )}
                          </div>

                          <div className="flex items-start gap-2 text-xs text-black/70 bg-white/70 px-3 py-2 rounded-xl border border-black/5 mb-2">
                            <FileText className="w-3.5 h-3.5 text-black/40 shrink-0 mt-0.5" />
                            <span className="italic font-medium">
                              {block.reason ? block.reason : "Instructor scheduled off-duty"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-semibold px-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>Website booking blocked for this period</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-black/50">
                            Instructor: <strong className="text-black/80">{block.instructorName || 'Wally'}</strong>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveBlock(block)}
                            disabled={isDeletingBlockId === block.id}
                            className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                            title="Delete this block and re-enable student bookings on this date"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isDeletingBlockId === block.id ? "Removing..." : "Remove Block"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search student, suburb, ref, address..."
                className="w-full bg-brand-offwhite border border-black/10 rounded-xl pl-9 pr-3 py-2 text-xs text-brand-black focus:outline-none focus:border-brand-red"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {(['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                    statusTab === tab
                      ? "bg-brand-red text-white shadow-sm"
                      : "bg-black/5 text-black/60 hover:bg-black/10"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule List */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-black/5 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-red-50 text-brand-red flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-brand-black mb-1">
                  No Bookings Found
                </h3>
                <p className="text-xs text-black/60 max-w-md mx-auto mb-6">
                  {bookingsList.length === 0
                    ? "Currently no driving appointments are scheduled. When students book through the website or reschedule, lessons will appear here automatically."
                    : "No bookings match your current search or status filter."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => setIsAddBookingModalOpen(true)}
                    className="bg-brand-red text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#c41a21] shadow-md shadow-brand-red/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Manual Booking</span>
                  </button>

                  <button
                    onClick={loadData}
                    className="bg-brand-black text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-black/80 shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                    <span>Refresh Schedule</span>
                  </button>
                </div>
              </div>
            ) : (
              filtered.map((apt) => (
                <motion.div 
                  key={apt.id || apt.ref}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5 relative hover:border-brand-red/30 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      
                      {/* Reference, Rescheduled Pill, & Date/Time Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-brand-black bg-brand-offwhite px-2.5 py-1 rounded-lg border border-black/10">
                          #{apt.ref}
                        </span>

                        <div className="flex items-center gap-1.5 font-bold text-brand-red text-xs sm:text-sm bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{apt.date}</span>
                          <span className="text-black/30">·</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{apt.time}</span>
                        </div>

                        {apt.isRescheduled && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            RESCHEDULED TIME
                          </span>
                        )}

                        {apt.notes && apt.notes.includes('[Transmission: Manual]') ? (
                          <span className="bg-neutral-800 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Manual
                          </span>
                        ) : (
                          <span className="bg-neutral-100 text-neutral-800 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider border border-black/10">
                            Auto
                          </span>
                        )}

                        {apt.notes && apt.notes.includes('[Created: Owner Manual Entry]') && (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Owner Entry
                          </span>
                        )}
                      </div>

                      {/* Package Title & Price */}
                      <div className="flex items-baseline gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-brand-black">
                          {apt.packageTitle}
                        </h3>
                        <span className="text-xs font-bold text-brand-red">
                          ${apt.packagePrice.toFixed(2)} AUD
                        </span>
                      </div>
                      
                      {/* Student Details */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-brand-black/70">
                        <div className="flex items-center gap-1.5 font-bold text-brand-black">
                          <User className="w-3.5 h-3.5 text-brand-red" />
                          <span>{apt.studentName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Smartphone className="w-3.5 h-3.5 text-black/40" />
                          <span>{apt.phone}</span>
                        </div>
                        {apt.email && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-black/40">Email:</span>
                            <span>{apt.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Resend Lesson Reminder Status Row */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {apt.reminderStatus === 'sent' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Email Reminder Sent</span>
                            {apt.reminderSentAt && (
                              <span className="text-emerald-700/80 font-normal">({new Date(apt.reminderSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                            )}
                            <span className="text-emerald-700/60 font-mono text-[11px]">→ {apt.reminderRecipientEmail || apt.email}</span>
                          </div>
                        ) : apt.reminderStatus === 'scheduled' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Email Reminder Scheduled</span>
                            <span className="text-blue-700/80 font-normal">(2 hrs before start)</span>
                            <span className="text-blue-700/60 font-mono text-[11px]">→ {apt.email}</span>
                          </div>
                        ) : apt.reminderStatus === 'failed' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span className="truncate max-w-xs">Reminder Failed: {apt.reminderError || 'Resend delivery error'}</span>
                          </div>
                        ) : apt.reminderStatus === 'cancelled' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-500 border border-gray-200 text-xs font-medium">
                            <span>Reminder Cancelled</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>Reminder: Scheduled upon Confirmation</span>
                          </div>
                        )}
                      </div>

                      {/* Exact Pickup Address Block */}
                      <div className="flex items-start gap-2.5 bg-brand-offwhite border border-black/10 rounded-2xl p-3.5 text-xs text-brand-black">
                        <MapPin className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-brand-red uppercase text-[10px] tracking-wider block mb-0.5">
                            Exact Pickup Address & Instructions
                          </span>
                          <span className="font-semibold text-xs sm:text-sm text-brand-black block">
                            {apt.pickupAddress || apt.notes || `${apt.suburb}, NSW`}
                          </span>
                          <span className="text-[11px] text-black/50">
                            Service Suburb: {apt.suburb}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex md:flex-col items-center md:items-end flex-wrap gap-2 shrink-0 pt-2 md:pt-0">
                      
                      {/* Status Dropdown */}
                      <div className="relative">
                        <button 
                          onClick={() => setActiveStatusDropdown(activeStatusDropdown === (apt.id || apt.ref) ? null : (apt.id || apt.ref))}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            apt.status === 'Confirmed' ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                            apt.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" :
                            apt.status === 'Completed' ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" :
                            "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          )}
                        >
                          {apt.status === 'Confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{apt.status}</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                        </button>
                        
                        <AnimatePresence>
                          {activeStatusDropdown === (apt.id || apt.ref) && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden z-30"
                            >
                              <button onClick={() => handleUpdateStatus(apt, 'Confirmed')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-emerald-700">Confirmed</button>
                              <button onClick={() => handleUpdateStatus(apt, 'Pending')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-amber-700">Pending</button>
                              <button onClick={() => handleUpdateStatus(apt, 'Completed')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-blue-700">Completed</button>
                              <button onClick={() => handleUpdateStatus(apt, 'Cancelled')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-red-600">Cancelled</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Edit & Reschedule Button */}
                      <button
                        onClick={() => setEditingBooking(apt)}
                        className="px-3 py-1.5 bg-brand-offwhite hover:bg-black/10 text-black/90 rounded-xl border border-black/10 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-brand-red/40"
                        title="Edit booking details, date, time slot, student info, or pickup address"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-brand-red" />
                        <span>Edit & Reschedule</span>
                      </button>

                      {/* Direct API Dispatch Resend Email Reminder */}
                      {apt.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleTriggerReminder(apt, true)}
                          disabled={sendingReminderRef === (apt.bookingRef || apt.ref || apt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer",
                            apt.reminderStatus === 'failed'
                              ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                              : apt.reminderStatus === 'sent'
                              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs"
                          )}
                          title={`Schedule or send Resend 2-hour lesson reminder email to student: ${apt.email}`}
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {sendingReminderRef === (apt.bookingRef || apt.ref || apt.id)
                              ? "Sending..."
                              : apt.reminderStatus === 'failed'
                              ? "Retry Email Reminder"
                              : apt.reminderStatus === 'sent'
                              ? "Resend 2h Email"
                              : "Send 2h Email"}
                          </span>
                        </button>
                      )}

                      {/* WhatsApp Student Direct Chat */}
                      <a
                        href={`https://wa.me/${apt.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${apt.studentName}, this is Wally your driving instructor regarding your lesson on ${apt.date} at ${apt.time}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-brand-offwhite hover:bg-black/10 text-black/80 rounded-xl border border-black/10 transition-all text-xs font-bold flex items-center gap-1.5"
                        title="Open direct WhatsApp chat with student"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Chat</span>
                      </a>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(apt);
                        }}
                        className="p-2 text-black/30 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Booking from UI & Database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          </>
          )}
        </motion.div>
      </div>

      {/* Comprehensive Instructor Edit & Reschedule Modal */}
      <EditBookingModal
        isOpen={Boolean(editingBooking)}
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSave={handleSaveBookingEdit}
      />

      {/* Owner Manual Client Booking Modal */}
      <ManualBookingModal
        isOpen={isAddBookingModalOpen}
        onClose={() => setIsAddBookingModalOpen(false)}
        onSuccess={(createdBooking) => {
          setActionFeedback(`Manual booking #${createdBooking.ref} for ${createdBooking.studentName} (${createdBooking.packageTitle}) successfully added to database!`);
          setBookingsList(prev => [createdBooking, ...prev.filter(b => b.ref !== createdBooking.ref && b.id !== createdBooking.id)]);
          setTimeout(() => setActionFeedback(null), 6000);
          loadData();
        }}
      />

      {/* Direct Dashboard Block Date/Time Modal */}
      <BlockDaysModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        date={blockDate}
        setDate={setBlockDate}
        isFullDay={blockIsFullDay}
        setIsFullDay={setBlockIsFullDay}
        startTime={blockStartTime}
        setStartTime={setBlockStartTime}
        endTime={blockEndTime}
        setEndTime={setBlockEndTime}
        reason={blockReason}
        setReason={setBlockReason}
        isSaving={isSavingBlock}
        conflicts={blockConflicts}
        isCheckingConflicts={isCheckingBlockConflicts}
        onSubmit={handleSaveNewBlock}
      />
    </div>
  );
}

interface BlockDaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  setDate: (d: string) => void;
  isFullDay: boolean;
  setIsFullDay: (f: boolean) => void;
  startTime: string;
  setStartTime: (t: string) => void;
  endTime: string;
  setEndTime: (t: string) => void;
  reason: string;
  setReason: (r: string) => void;
  isSaving: boolean;
  conflicts: any[];
  isCheckingConflicts: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function BlockDaysModal({
  isOpen,
  onClose,
  date,
  setDate,
  isFullDay,
  setIsFullDay,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  reason,
  setReason,
  isSaving,
  conflicts,
  isCheckingConflicts,
  onSubmit
}: BlockDaysModalProps) {
  if (!isOpen) return null;

  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(d.toISOString().split('T')[0]);
  };

  const setNextWeekday = (targetDay: number) => {
    const d = new Date();
    const currentDay = d.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div 
        className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative z-10 border border-black/10 my-8"
      >
        <div className="flex items-start justify-between pb-4 border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
              <CalendarOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-brand-black tracking-tight">
                Block Availability / Time Off
              </h3>
              <p className="text-xs text-black/60 mt-0.5">
                Lock out single days or specific hours. Students visiting the booking page will see this period as unavailable.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black/60 mb-2">
              Select Date to Block *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/5 hover:bg-black/10 text-black/80 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/5 hover:bg-black/10 text-black/80 transition-colors cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setNextWeekday(6)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/5 hover:bg-black/10 text-black/80 transition-colors cursor-pointer"
              >
                This Saturday
              </button>
              <button
                type="button"
                onClick={() => setNextWeekday(0)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/5 hover:bg-black/10 text-black/80 transition-colors cursor-pointer"
              >
                This Sunday
              </button>
              <button
                type="button"
                onClick={() => setNextWeekday(1)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/5 hover:bg-black/10 text-black/80 transition-colors cursor-pointer"
              >
                Next Monday
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(7)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/5 hover:bg-black/10 text-black/80 transition-colors cursor-pointer"
              >
                +7 Days
              </button>
            </div>

            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/[0.03] border border-black/15 rounded-2xl text-sm font-semibold text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red transition-all"
              />
              {date && (
                <span className="text-xs font-medium text-black/60 mt-1 block px-1">
                  Selected: <strong>{formatBlockDate(date)}</strong>
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black/60 mb-2">
              Block Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsFullDay(true)}
                className={cn(
                  "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                  isFullDay
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-900 shadow-sm ring-1 ring-amber-500/30"
                    : "bg-black/[0.02] border-black/10 text-black/70 hover:bg-black/[0.05]"
                )}
              >
                <CalendarOff className={cn("w-5 h-5 shrink-0 mt-0.5", isFullDay ? "text-amber-600" : "text-black/40")} />
                <div>
                  <div className="font-bold text-xs sm:text-sm">Full Day Off</div>
                  <div className="text-[11px] opacity-75 mt-0.5">All day closed (8am–6pm)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsFullDay(false)}
                className={cn(
                  "p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer",
                  !isFullDay
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-900 shadow-sm ring-1 ring-blue-500/30"
                    : "bg-black/[0.02] border-black/10 text-black/70 hover:bg-black/[0.05]"
                )}
              >
                <Clock className={cn("w-5 h-5 shrink-0 mt-0.5", !isFullDay ? "text-blue-600" : "text-black/40")} />
                <div>
                  <div className="font-bold text-xs sm:text-sm">Partial Window</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Specific hours off</div>
                </div>
              </button>
            </div>
          </div>

          {!isFullDay && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Select Time Window
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setStartTime('08:00 AM'); setEndTime('12:00 PM'); }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                  >
                    Morning (8-12)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStartTime('12:00 PM'); setEndTime('04:00 PM'); }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                  >
                    Afternoon (12-4)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStartTime('02:00 PM'); setEndTime('06:00 PM'); }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                  >
                    Late (2-6)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-blue-950 mb-1">Start Time</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-brand-black focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {TIME_SLOT_OPTIONS.slice(0, -1).map(slot => (
                      <option key={`start-${slot}`} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-950 mb-1">End Time</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-brand-black focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {TIME_SLOT_OPTIONS.slice(1).map(slot => (
                      <option key={`end-${slot}`} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black/60 mb-1.5">
              Reason / Internal Note
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {BLOCK_REASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer",
                    reason === preset
                      ? "bg-brand-red text-white border-brand-red shadow-xs font-bold"
                      : "bg-black/[0.02] hover:bg-black/[0.06] text-black/70 border-black/10"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="e.g. Personal Leave, Vehicle Servicing, RMS Test Supervision"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/[0.03] border border-black/15 rounded-2xl text-sm font-medium text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red transition-all"
            />
          </div>

          <div>
            {isCheckingConflicts ? (
              <div className="p-3 bg-neutral-100 rounded-xl text-xs text-black/60 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-black/50" />
                <span>Checking student booking schedule for overlaps...</span>
              </div>
            ) : conflicts.length > 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Conflict Warning: {conflicts.length} student booking(s) exist in this period!</span>
                </div>
                <div className="space-y-0.5 pl-6">
                  {conflicts.map((c: any) => (
                    <div key={c.id || c.bookingRef} className="text-rose-700">
                      • <strong>{c.studentName}</strong>: {c.time} ({c.bookingRef || 'Booking'})
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-rose-600 italic pl-6">
                  Please reschedule these bookings first before setting this block.
                </p>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No student bookings conflict with this window. Safe to block!</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-black/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-black/15 text-xs font-bold text-black/70 hover:bg-black/5 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || conflicts.length > 0 || isCheckingConflicts}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-md cursor-pointer",
                conflicts.length > 0 || isCheckingConflicts
                  ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  : "bg-brand-red hover:bg-[#c41a21] shadow-brand-red/25 disabled:opacity-50"
              )}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving & Blocking...</span>
                </>
              ) : (
                <>
                  <CalendarOff className="w-3.5 h-3.5" />
                  <span>Save & Block Availability</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InstructorLogin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (isOwnerLoggedIn()) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    logoutOwner();
    setIsLoggedIn(false);
  };

  return (
    <AnimatePresence mode="wait">
      {isLoggedIn ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
        >
          <InstructorDashboard onLogout={handleLogout} />
        </motion.div>
      ) : (
        <motion.div
          key="login"
          exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          transition={{ duration: 0.4 }}
        >
          <InstructorLoginGate onLogin={() => setIsLoggedIn(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
