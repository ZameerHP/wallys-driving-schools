import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Search, 
  Smartphone, 
  Mail, 
  Check, 
  Copy, 
  MessageCircle, 
  X, 
  User, 
  Sparkles, 
  AlertCircle, 
  Edit3, 
  RefreshCw,
  Lock,
  ChevronRight,
  CreditCard,
  RotateCcw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { 
  searchCustomerBookings, 
  updateBookingInDb, 
  BookingItem,
  getStoredBookings
} from '../lib/bookings';
import { cn } from '../lib/utils';
import PaymentsStep from '../components/booking/PaymentsStep';

const AVAILABLE_TIMES = [
  '08:30 AM - 09:30 AM',
  '10:00 AM - 11:00 AM',
  '11:30 AM - 12:30 PM',
  '01:30 PM - 02:30 PM',
  '03:00 PM - 04:00 PM',
  '04:30 PM - 05:30 PM'
];

function parseTimeInterval(timeStr: string): { start: number; end: number } | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace(/\s+/g, ' ');
  const rangeMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (rangeMatch) {
    let [_, h1, m1, ap1, h2, m2, ap2] = rangeMatch;
    let startHours = parseInt(h1, 10);
    const startMins = parseInt(m1 || '0', 10);
    let endHours = parseInt(h2, 10);
    const endMins = parseInt(m2 || '0', 10);

    if (!ap1 && ap2) ap1 = ap2;

    if (ap1) {
      if (ap1.toUpperCase() === 'PM' && startHours < 12) startHours += 12;
      if (ap1.toUpperCase() === 'AM' && startHours === 12) startHours = 0;
    }
    if (ap2) {
      if (ap2.toUpperCase() === 'PM' && endHours < 12) endHours += 12;
      if (ap2.toUpperCase() === 'AM' && endHours === 12) endHours = 0;
    }

    return {
      start: startHours * 60 + startMins,
      end: endHours * 60 + endMins
    };
  }

  const singleMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (singleMatch) {
    let [_, h, m, ap] = singleMatch;
    let hours = parseInt(h, 10);
    const mins = parseInt(m || '0', 10);
    if (ap) {
      if (ap.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ap.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    const start = hours * 60 + mins;
    return { start, end: start + 60 };
  }
  return null;
}

function parseBookingDateTime(dateStr: string, timeStr: string): number {
  let hours = 9;
  let minutes = 0;
  const timeMatch = (timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (timeMatch) {
    let [_, h, m, ampm] = timeMatch;
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10) || 0;
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
  }

  if (dateStr && dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    if (parts.length === 3 && parts[0] <= 31 && parts[1] <= 12) {
      const [day, month, year] = parts;
      const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    d.setHours(hours, minutes, 0, 0);
    return d.getTime();
  }
  return Date.now();
}

export function ManageBooking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('ref') || searchParams.get('code') || searchParams.get('number') || '';

  const [bookingCode, setBookingCode] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [foundBookings, setFoundBookings] = useState<BookingItem[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Reschedule Modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState(AVAILABLE_TIMES[1]);
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState<{ date: string; time: string; status?: string }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch real availability for reschedule date
  const fetchAvailabilityForReschedule = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    setIsLoadingSlots(true);
    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(targetDate)}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRescheduleBookedSlots(data);
        }
      }
    } catch (err) {
      console.warn('Failed to load reschedule availability:', err);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (showRescheduleModal && newDate) {
      fetchAvailabilityForReschedule(newDate);
    }
  }, [showRescheduleModal, newDate, fetchAvailabilityForReschedule]);

  const isRescheduleSlotAvailable = (timeSlot: string) => {
    if (!newDate || !selectedBooking) return true;
    const t1 = parseTimeInterval(timeSlot);
    if (!t1) return true;

    for (const b of rescheduleBookedSlots) {
      if (b.status === 'Cancelled') continue;
      // Skip the booking's own original slot if same date & time
      if (b.date === selectedBooking.date && b.time === selectedBooking.time && newDate === selectedBooking.date) {
        continue;
      }
      const t2 = parseTimeInterval(b.time);
      if (t2) {
        const BUFFER_MINUTES = 30;
        if (t1.start < t2.end + BUFFER_MINUTES && t1.end > t2.start - BUFFER_MINUTES) {
          return false;
        }
      } else if (b.time.trim().toLowerCase() === timeSlot.trim().toLowerCase()) {
        return false;
      }
    }
    return true;
  };

  // Edit Address Modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

  // Cancel Booking Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isSavingCancel, setIsSavingCancel] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Change of personal schedule');

  // Online Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Search logic
  const handleSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setIsSearching(true);
    setHasSearched(true);
    setRescheduleSuccess(null);
    setAddressSuccess(null);
    setCancelSuccess(null);
    setCancelError(null);

    try {
      const results = await searchCustomerBookings(q);
      setFoundBookings(results);
      if (results.length > 0) {
        setSelectedBooking(results[0]);
      } else {
        setSelectedBooking(null);
      }
    } catch (err) {
      console.error('Failed to search bookings:', err);
      setFoundBookings([]);
      setSelectedBooking(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search if URL has code or ref
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(refText);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Save Reschedule
  const handleSaveReschedule = async () => {
    if (!selectedBooking || !newDate || !newTime) return;

    setRescheduleError(null);

    // Frontend pre-check
    if (!isRescheduleSlotAvailable(newTime)) {
      setRescheduleError('This time slot is no longer available. Please select another time.');
      fetchAvailabilityForReschedule(newDate);
      return;
    }

    setIsSavingReschedule(true);
    const updatedFields: Partial<BookingItem> = {
      date: newDate,
      time: newTime,
      status: 'Confirmed',
      isRescheduled: true,
      notes: selectedBooking.notes 
        ? `${selectedBooking.notes} [RESCHEDULED to ${newDate} ${newTime}]`
        : `[RESCHEDULED to ${newDate} ${newTime}]`
    };

    try {
      await updateBookingInDb(selectedBooking.id, updatedFields, selectedBooking.ref);
      
      const updatedBooking: BookingItem = {
        ...selectedBooking,
        ...updatedFields,
        isRescheduled: true
      };

      setSelectedBooking(updatedBooking);
      setFoundBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      setShowRescheduleModal(false);
      setRescheduleSuccess(`Lesson successfully rescheduled to ${newDate} at ${newTime}! Your automatic WhatsApp lesson reminder has been updated for 2 hours prior to your new lesson.`);
    } catch (err: any) {
      console.error('Failed to reschedule:', err);
      setRescheduleError(err?.message || 'This time slot is no longer available. Please select another time.');
      fetchAvailabilityForReschedule(newDate);
    } finally {
      setIsSavingReschedule(false);
    }
  };

  // Save Address
  const handleSaveAddress = async () => {
    if (!selectedBooking || !newAddress.trim()) return;

    setIsSavingAddress(true);
    const updatedFields: Partial<BookingItem> = {
      pickupAddress: newAddress.trim(),
      notes: selectedBooking.notes 
        ? `${selectedBooking.notes}. Updated Pickup: ${newAddress.trim()}`
        : `Pickup: ${newAddress.trim()}`
    };

    try {
      await updateBookingInDb(selectedBooking.id, updatedFields, selectedBooking.ref);

      const updatedBooking: BookingItem = {
        ...selectedBooking,
        ...updatedFields
      };

      setSelectedBooking(updatedBooking);
      setFoundBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      setShowAddressModal(false);
      setAddressSuccess(`Pickup address updated to: ${newAddress.trim()}`);
    } catch (err) {
      console.error('Failed to update address:', err);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setIsSavingCancel(true);
    setCancelError(null);

    const bookingTimestamp = parseBookingDateTime(selectedBooking.date, selectedBooking.time);
    const hoursUntil = (bookingTimestamp - Date.now()) / (1000 * 60 * 60);
    const isOver24Hours = hoursUntil > 24;
    const isPaid = selectedBooking.paymentStatus === 'paid';

    const reasonNote = cancelReason ? ` Reason: ${cancelReason}.` : '';

    const updatedFields: Partial<BookingItem> = {
      status: 'Cancelled',
      notes: selectedBooking.notes 
        ? `${selectedBooking.notes} [Cancelled by student.${reasonNote}]`
        : `[Cancelled by student.${reasonNote}]`
    };

    try {
      const serverResult = await updateBookingInDb(selectedBooking.id, updatedFields, selectedBooking.ref);

      const isRefunded = serverResult?.paymentStatus === 'refunded' || (isOver24Hours && isPaid);

      const updatedBooking: BookingItem = {
        ...selectedBooking,
        ...updatedFields,
        paymentStatus: isRefunded ? 'refunded' : selectedBooking.paymentStatus,
        notes: serverResult?.notes || updatedFields.notes
      };

      setSelectedBooking(updatedBooking);
      setFoundBookings(prev => prev.map(b => (b.id === updatedBooking.id || b.ref === updatedBooking.ref ? updatedBooking : b)));
      setShowCancelModal(false);

      if (isRefunded) {
        setCancelSuccess(`Booking #${selectedBooking.ref} has been cancelled and any scheduled WhatsApp lesson reminders have been cancelled. Because your lesson was cancelled more than 24 hours in advance, a full refund of $${selectedBooking.packagePrice.toFixed(2)} AUD has been processed back to your original payment method via Stripe.`);
      } else if (isPaid) {
        setCancelSuccess(`Booking #${selectedBooking.ref} has been cancelled and any scheduled WhatsApp lesson reminders have been cancelled. Note: Because your lesson is scheduled within 24 hours, per driving school policy it is classified as a late cancellation without an automatic refund. If you need assistance, please contact Wally on WhatsApp.`);
      } else {
        setCancelSuccess(`Booking #${selectedBooking.ref} has been cancelled, any scheduled WhatsApp lesson reminders have been cancelled, and your scheduled time slot has been released.`);
      }
    } catch (err: any) {
      console.error('Failed to cancel booking:', err);
      setCancelError(err?.message || 'Failed to cancel booking. Please try again or WhatsApp Wally directly.');
    } finally {
      setIsSavingCancel(false);
    }
  };

  return (
    <div className="pt-28 pb-20 bg-brand-offwhite min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Navigation Bar / Quick Links */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-bold text-black/60 hover:text-brand-red transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <Link
            to="/instructor-login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-brand-black text-xs font-bold border border-black/10 transition-all"
          >
            <Lock className="w-3.5 h-3.5 text-brand-red" />
            <span>Instructor Login (Wally)</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 text-brand-red text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customer Self-Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-brand-black tracking-tight mb-2">
            Manage Your Booking
          </h1>
          <p className="text-sm text-black/60 max-w-md mx-auto">
            Enter your booking code or number to view your lesson, reschedule dates, or update your pickup address.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 mb-8">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(bookingCode);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-2">
                Booking Code, Reference or Phone Number
              </label>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  type="text"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value)}
                  placeholder="e.g. WD-8492 or simply 8492 or 0412 345 678"
                  className="w-full bg-brand-offwhite border border-black/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-semibold text-brand-black focus:outline-none focus:border-brand-red focus:bg-white transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-black/50">
                Tip: Enter the code from your confirmation screen (e.g. <strong>WD-8492</strong> or just <strong>8492</strong>).
              </span>

              <button
                type="submit"
                disabled={isSearching || !bookingCode.trim()}
                className="w-full sm:w-auto bg-brand-red hover:bg-[#c41a21] text-white font-bold px-8 py-3 rounded-2xl text-sm transition-all shadow-md shadow-brand-red/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Open Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Success Banners */}
        <AnimatePresence>
          {rescheduleSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs sm:text-sm font-semibold flex items-center gap-3 mb-6 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{rescheduleSuccess}</span>
            </motion.div>
          )}

          {addressSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-4 text-xs sm:text-sm font-semibold flex items-center gap-3 mb-6 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{addressSuccess}</span>
            </motion.div>
          )}

          {cancelSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 text-xs sm:text-sm font-semibold flex items-center gap-3 mb-6 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{cancelSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multiple Results Tab Selector (if multiple bookings found for same phone/email) */}
        {foundBookings.length > 1 && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-bold text-black/60 shrink-0">Found {foundBookings.length} bookings:</span>
            {foundBookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBooking(b)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  selectedBooking?.id === b.id
                    ? "bg-brand-black text-white"
                    : "bg-white text-black/70 hover:bg-black/5 border border-black/10"
                )}
              >
                #{b.ref} ({b.date})
              </button>
            ))}
          </div>
        )}

        {/* Booking Details Card */}
        {selectedBooking ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-black/5 relative overflow-hidden"
          >
            {/* Top Bar with Reference & Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-black/50 uppercase tracking-wider">Booking Ref:</span>
                <span className="font-mono text-base sm:text-lg font-black text-brand-black bg-brand-offwhite px-3 py-1 rounded-xl border border-black/10">
                  #{selectedBooking.ref}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyRef(selectedBooking.ref)}
                  className="p-1.5 hover:bg-black/5 rounded-lg text-black/40 hover:text-black transition-colors cursor-pointer"
                  title="Copy Reference"
                >
                  {copiedRef === selectedBooking.ref ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedBooking.isRescheduled && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Rescheduled
                  </span>
                )}
                <span className={cn(
                  "text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider border flex items-center gap-1.5",
                  selectedBooking.status === 'Confirmed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  selectedBooking.status === 'Pending' ? "bg-amber-50 text-amber-800 border-amber-300" :
                  selectedBooking.status === 'Completed' ? "bg-blue-50 text-blue-700 border-blue-200" :
                  "bg-red-50 text-red-700 border-red-200"
                )}>
                  {selectedBooking.status === 'Pending' && <Clock className="w-3 h-3 text-amber-600" />}
                  {selectedBooking.status === 'Confirmed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  {selectedBooking.status === 'Cancelled' && <AlertCircle className="w-3 h-3 text-red-600" />}
                  <span>{selectedBooking.status === 'Pending' ? 'Pending Confirmation' : selectedBooking.status}</span>
                </span>

                {/* Payment Status Badge */}
                <span className={cn(
                  "text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider border flex items-center gap-1.5",
                  selectedBooking.paymentStatus === 'paid'
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : selectedBooking.paymentStatus === 'refunded'
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                )}>
                  {selectedBooking.paymentStatus === 'paid' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Paid Online (Stripe)</span>
                    </>
                  ) : selectedBooking.paymentStatus === 'refunded' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                      <span>Refunded (Stripe)</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                      <span>Awaiting Payment</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Status Information Notice */}
            {selectedBooking.status === 'Pending' ? (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs sm:text-sm block text-amber-900">
                    Status: Pending Instructor Confirmation
                  </span>
                  <p className="text-[11px] sm:text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                    Your booking has been received. Your instructor Wally is reviewing your appointment and route. Once confirmed by Wally in the instructor portal, this status will automatically change to <strong className="text-amber-900 font-bold">Confirmed</strong>.
                  </p>
                </div>
              </div>
            ) : selectedBooking.status === 'Confirmed' ? (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs sm:text-sm block text-emerald-900">
                    Booking Confirmed by Instructor
                  </span>
                  <p className="text-[11px] sm:text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                    Wally has officially confirmed your driving lesson. Please be ready at your pickup address at the scheduled date and time.
                  </p>
                </div>
              </div>
            ) : selectedBooking.status === 'Cancelled' ? (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-900">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs sm:text-sm block text-red-900">
                    Booking Cancelled
                  </span>
                  <p className="text-[11px] sm:text-xs text-red-800/90 mt-0.5 leading-relaxed">
                    {selectedBooking.paymentStatus === 'refunded'
                      ? 'This appointment has been cancelled and a full refund has been issued to your original card / payment method via Stripe.'
                      : selectedBooking.paymentStatus === 'paid'
                      ? 'This appointment was cancelled. Because it was scheduled within 24 hours, per driving school policy it is classified as a late cancellation without automatic refund. If you need assistance, please WhatsApp Wally.'
                      : 'This appointment was cancelled and your time slot has been released. No charges were made.'}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Main Lesson Details */}
            <div className="py-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-brand-red uppercase tracking-wider block mb-1">
                  Selected Package
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-brand-black">
                    {selectedBooking.packageTitle}
                  </h2>
                  <span className="text-base sm:text-lg font-black text-brand-red shrink-0">
                    ${selectedBooking.packagePrice.toFixed(2)} AUD
                  </span>
                </div>
              </div>

              {/* Time & Date Highlight Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-brand-offwhite p-4 rounded-2xl border border-black/5 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/50 block">
                      Scheduled Date
                    </span>
                    <span className="text-sm sm:text-base font-bold text-brand-black">
                      {selectedBooking.date}
                    </span>
                  </div>
                </div>

                <div className="bg-brand-offwhite p-4 rounded-2xl border border-black/5 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/50 block">
                      Lesson Time Slot
                    </span>
                    <span className="text-sm sm:text-base font-bold text-brand-black">
                      {selectedBooking.time}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pickup Address Card */}
              <div className="bg-brand-offwhite p-4 rounded-2xl border border-black/5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-black/50 block">
                      Pickup Address & Suburb
                    </span>
                    <span className="text-sm font-bold text-brand-black block">
                      {selectedBooking.pickupAddress || selectedBooking.notes || `${selectedBooking.suburb}, NSW`}
                    </span>
                    <span className="text-xs text-black/50">
                      Service Area: {selectedBooking.suburb}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewAddress(selectedBooking.pickupAddress || '');
                    setShowAddressModal(true);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-black/5 text-brand-black text-xs font-bold rounded-xl border border-black/10 transition-all shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Student Contact Info */}
              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-black/70">
                <div className="flex items-center gap-1.5 font-bold text-brand-black">
                  <User className="w-3.5 h-3.5 text-brand-red" />
                  <span>{selectedBooking.studentName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-black/50" />
                  <span>{selectedBooking.phone}</span>
                </div>
                {selectedBooking.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-black/50" />
                    <span>{selectedBooking.email}</span>
                  </div>
                )}
              </div>

              {/* Automatic WhatsApp Lesson Reminder Information */}
              {selectedBooking.status !== 'Cancelled' && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-900 mt-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block">
                      Automatic WhatsApp Lesson Reminder Active
                    </span>
                    <p className="text-emerald-800/90 mt-0.5 leading-relaxed text-[11px]">
                      A reminder will be sent to your phone (<strong>{selectedBooking.phone}</strong>) automatically 2 hours before your lesson start time ({selectedBooking.time.split('-')[0]?.trim() || selectedBooking.time}).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-black/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {selectedBooking.status === 'Cancelled' ? (
                <>
                  <Link
                    to="/book-now"
                    className="flex-1 bg-brand-red hover:bg-[#c41a21] text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-red/20 transition-all text-center"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book a New Driving Lesson</span>
                  </Link>
                  <a
                    href={`https://wa.me/61406693301?text=${encodeURIComponent(`Hi Wally, regarding my cancelled driving lesson booking #${selectedBooking.ref} (${selectedBooking.studentName}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all text-center"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Wally</span>
                  </a>
                </>
              ) : (
                <>
                  {/* Pay Online Button (if not already paid) */}
                  {selectedBooking.paymentStatus !== 'paid' && selectedBooking.paymentStatus !== 'refunded' && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="flex-1 bg-neutral-950 hover:bg-black text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-[#FFC439]" />
                      <span>Pay Online (Card / Google Pay)</span>
                    </button>
                  )}

                  {/* Reschedule Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewDate(selectedBooking.date);
                      setNewTime(selectedBooking.time || AVAILABLE_TIMES[0]);
                      setShowRescheduleModal(true);
                    }}
                    className="flex-1 bg-brand-red hover:bg-[#c41a21] text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-red/20 transition-all cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Reschedule Date & Time</span>
                  </button>

                  {/* Cancel Booking Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCancelError(null);
                      setShowCancelModal(true);
                    }}
                    className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 border border-red-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Cancel Booking</span>
                  </button>

                  {/* WhatsApp Instructor */}
                  <a
                    href={`https://wa.me/61406693301?text=${encodeURIComponent(`Hi Wally, I am inquiring about my driving lesson booking #${selectedBooking.ref} scheduled on ${selectedBooking.date} at ${selectedBooking.time} (${selectedBooking.studentName}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all text-center"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Wally</span>
                  </a>
                </>
              )}
            </div>
          </motion.div>
        ) : hasSearched && !isSearching ? (
          /* Empty / Not Found State */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl p-8 text-center border border-black/5 shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-brand-red flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-brand-black mb-1">
              No Booking Found for "{bookingCode}"
            </h3>
            <p className="text-xs text-black/60 max-w-sm mx-auto mb-5">
              Please double check the reference code (e.g. <strong>WD-8492</strong> or just <strong>8492</strong>) or search with the phone number used when booking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/book-now"
                className="bg-brand-red text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#c41a21] transition-all"
              >
                Book a Driving Lesson Now
              </Link>
              <a
                href="https://wa.me/61406693301"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-black/15 text-black text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-black/5 transition-all inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Wally for Help</span>
              </a>
            </div>
          </motion.div>
        ) : null}

      </div>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {showRescheduleModal && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 relative"
            >
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="absolute right-5 top-5 text-black/40 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-5">
                <div className="inline-flex items-center gap-1.5 text-brand-red text-xs font-bold uppercase tracking-wider mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reschedule Booking #{selectedBooking.ref}</span>
                </div>
                <h3 className="text-xl font-bold text-brand-black">Pick a New Date & Time</h3>
                <p className="text-xs text-black/60">
                  Select your preferred replacement date and time slot. Wally will be updated immediately.
                </p>
              </div>

              <div className="space-y-4">
                {rescheduleError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block">Slot Unavailable</span>
                      <span>{rescheduleError}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-black/80 uppercase tracking-wider">
                      New Date
                    </label>
                    {isLoadingSlots && (
                      <span className="text-[10px] text-brand-red font-medium flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Checking availability...
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => {
                      setNewDate(e.target.value);
                      setRescheduleError(null);
                    }}
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-3 text-sm font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/80 uppercase tracking-wider mb-1.5">
                    Available Time Slot
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_TIMES.map((slot) => {
                      const isAvailable = isRescheduleSlotAvailable(slot);
                      const isSelected = newTime === slot;

                      return (
                        <button
                          type="button"
                          key={slot}
                          disabled={!isAvailable}
                          onClick={() => {
                            if (isAvailable) {
                              setNewTime(slot);
                              setRescheduleError(null);
                            }
                          }}
                          className={cn(
                            "p-2.5 rounded-xl text-xs font-bold text-center border transition-all flex items-center justify-between px-3",
                            isSelected
                              ? "bg-brand-red text-white border-brand-red shadow-sm cursor-pointer"
                              : !isAvailable
                              ? "bg-black/[0.03] text-black/30 border-black/5 cursor-not-allowed line-through"
                              : "bg-brand-offwhite text-black/80 border-black/10 hover:bg-black/5 cursor-pointer"
                          )}
                        >
                          <span>{slot}</span>
                          {!isAvailable && (
                            <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-100/70 px-1.5 py-0.5 rounded ml-1 no-underline">
                              Booked
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-black/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRescheduleModal(false)}
                    className="px-4 py-2 text-xs font-bold text-black/60 hover:text-black"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSavingReschedule || !newDate || !isRescheduleSlotAvailable(newTime)}
                    onClick={handleSaveReschedule}
                    className="bg-brand-red hover:bg-[#c41a21] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSavingReschedule ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Confirm Reschedule</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Address Modal */}
      <AnimatePresence>
        {showAddressModal && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 relative"
            >
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="absolute right-5 top-5 text-black/40 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-5">
                <div className="inline-flex items-center gap-1.5 text-brand-red text-xs font-bold uppercase tracking-wider mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Update Pickup Location</span>
                </div>
                <h3 className="text-xl font-bold text-brand-black">Pickup Address</h3>
                <p className="text-xs text-black/60">
                  Where should Wally pick you up for this driving lesson?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-black/80 uppercase tracking-wider mb-1.5">
                    Street Address & Details
                  </label>
                  <textarea
                    rows={3}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. 14 Railway St, Rooty Hill NSW 2766 (wait by front driveway)"
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl p-3 text-sm font-semibold text-brand-black focus:outline-none focus:border-brand-red resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-black/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(false)}
                    className="px-4 py-2 text-xs font-bold text-black/60 hover:text-black"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSavingAddress || !newAddress.trim()}
                    onClick={handleSaveAddress}
                    className="bg-brand-red hover:bg-[#c41a21] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSavingAddress ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Save Address</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Online Payment Modal using shared PaymentsStep */}
        {showPaymentModal && selectedBooking && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-black/10 relative my-8 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-black/50 hover:text-black transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <PaymentsStep
                bookingRef={selectedBooking.ref}
                items={[{
                  id: `item-${selectedBooking.ref}`,
                  name: selectedBooking.packageTitle,
                  unitPrice: selectedBooking.packagePrice,
                  quantity: 1,
                  lineTotal: selectedBooking.packagePrice
                }]}
                customerInfo={{
                  name: selectedBooking.studentName,
                  email: selectedBooking.email,
                  phone: selectedBooking.phone,
                  address: selectedBooking.pickupAddress || selectedBooking.suburb,
                  pickupAddress: selectedBooking.pickupAddress || selectedBooking.suburb,
                  suburb: selectedBooking.suburb,
                  date: selectedBooking.date,
                  time: selectedBooking.time,
                  bookingDate: selectedBooking.date,
                  bookingTime: selectedBooking.time,
                  packageTitle: selectedBooking.packageTitle,
                  packagePrice: selectedBooking.packagePrice
                }}
                onBack={() => setShowPaymentModal(false)}
                onPaymentSuccess={(verifiedBooking) => {
                  setSelectedBooking({
                    ...selectedBooking,
                    ...verifiedBooking,
                    paymentStatus: 'paid',
                    status: 'Confirmed'
                  });
                  setShowPaymentModal(false);
                }}
              />
            </motion.div>
          </div>
        )}

        {/* Cancel Booking Confirmation Modal */}
        {showCancelModal && selectedBooking && (() => {
          const bookingTimestamp = parseBookingDateTime(selectedBooking.date, selectedBooking.time);
          const hoursUntil = (bookingTimestamp - Date.now()) / (1000 * 60 * 60);
          const isOver24Hours = hoursUntil > 24;
          const isPaid = selectedBooking.paymentStatus === 'paid';
          const isEligibleForRefund = isOver24Hours && isPaid;

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-black/10 relative my-8"
              >
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="absolute right-5 top-5 text-black/40 hover:text-black p-1 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 text-red-600 text-xs font-bold uppercase tracking-wider mb-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel Driving Lesson</span>
                  </div>
                  <h3 className="text-xl font-bold text-brand-black">
                    Cancel Booking #{selectedBooking.ref}?
                  </h3>
                </div>

                {/* Booking summary card */}
                <div className="bg-brand-offwhite rounded-2xl p-4 border border-black/5 mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-black/50 font-bold uppercase tracking-wider">Lesson</span>
                    <span className="font-bold text-brand-black">{selectedBooking.packageTitle}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-black/50 font-bold uppercase tracking-wider">Scheduled Date & Time</span>
                    <span className="font-bold text-brand-black">{selectedBooking.date} at {selectedBooking.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-black/50 font-bold uppercase tracking-wider">Student</span>
                    <span className="font-bold text-brand-black">{selectedBooking.studentName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5">
                    <span className="text-black/50 font-bold uppercase tracking-wider">Payment Status</span>
                    <span className="font-black text-brand-red">
                      {isPaid 
                        ? `Paid Online ($${selectedBooking.packagePrice.toFixed(2)} AUD)` 
                        : selectedBooking.paymentStatus === 'refunded'
                        ? 'Refunded'
                        : `Awaiting Payment ($${selectedBooking.packagePrice.toFixed(2)} AUD)`}
                    </span>
                  </div>
                </div>

                {/* Dynamic Refund & Cancellation Policy Notice */}
                <div className="mb-5">
                  {isEligibleForRefund ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs sm:text-sm block text-emerald-900">
                          Eligible for 100% Full Refund (${selectedBooking.packagePrice.toFixed(2)} AUD)
                        </span>
                        <p className="text-[11px] sm:text-xs text-emerald-800/90 mt-1 leading-relaxed">
                          Your appointment is scheduled in more than 24 hours ({Math.max(0, Math.round(hoursUntil))} hours from now). Your refund will be automatically credited back to your original payment method via Stripe.
                        </p>
                      </div>
                    </div>
                  ) : isPaid ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs sm:text-sm block text-amber-900">
                          Late Cancellation Policy Notice (Under 24 Hours)
                        </span>
                        <p className="text-[11px] sm:text-xs text-amber-800/90 mt-1 leading-relaxed">
                          This lesson is scheduled within the next 24 hours ({Math.max(0, Math.round(hoursUntil))} hours from now). Under standard driving school policy, cancellations with less than 24 hours notice cannot be automatically refunded to cover instructor scheduling. If you have an emergency, please message Wally on WhatsApp.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs sm:text-sm block text-slate-900">
                          Unpaid Booking
                        </span>
                        <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                          No online payment was taken for this lesson. Cancelling will immediately free up the reserved time slot with no cancellation charge.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason Selection */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-black/70 uppercase tracking-wider mb-2">
                    Reason for Cancellation (Optional)
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl p-3 text-xs sm:text-sm font-semibold text-brand-black focus:outline-none focus:border-brand-red cursor-pointer"
                  >
                    <option value="Change of personal schedule">Change of personal schedule</option>
                    <option value="Need to reschedule for a future date">Need to reschedule for a future date</option>
                    <option value="Work / School commitment">Work / School commitment</option>
                    <option value="Medical or health reason">Medical or health reason</option>
                    <option value="Booked by mistake">Booked by mistake</option>
                    <option value="Other reason">Other reason</option>
                  </select>
                </div>

                {/* Error Notice */}
                {cancelError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cancelError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    disabled={isSavingCancel}
                    className="px-4 py-2.5 text-xs font-bold text-black/60 hover:text-black transition-colors cursor-pointer"
                  >
                    Keep My Lesson
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    disabled={isSavingCancel}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingCancel ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing Cancellation...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Cancellation</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
