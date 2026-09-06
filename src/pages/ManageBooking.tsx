import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  CreditCard
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

  // Edit Address Modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);

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
      setRescheduleSuccess(`Lesson successfully rescheduled to ${newDate} at ${newTime}! Wally has been notified.`);
    } catch (err) {
      console.error('Failed to reschedule:', err);
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
                  <span>{selectedBooking.status === 'Pending' ? 'Pending Confirmation' : selectedBooking.status}</span>
                </span>

                {/* Payment Status Badge */}
                <span className={cn(
                  "text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider border flex items-center gap-1.5",
                  selectedBooking.paymentStatus === 'paid'
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-neutral-100 text-neutral-700 border-neutral-300"
                )}>
                  {selectedBooking.paymentStatus === 'paid' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Paid Online</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3 h-3 text-neutral-500" />
                      <span>Pay In Car / Unpaid</span>
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
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-black/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Pay Online Button (if not already paid) */}
              {selectedBooking.paymentStatus !== 'paid' && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="flex-1 bg-neutral-950 hover:bg-black text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-[#FFC439]" />
                  <span>Pay Online (Stripe / PayPal)</span>
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

              {/* WhatsApp Instructor */}
              <a
                href={`https://wa.me/61406693301?text=${encodeURIComponent(`Hi Wally, I am inquiring about my driving lesson booking #${selectedBooking.ref} scheduled on ${selectedBooking.date} at ${selectedBooking.time} (${selectedBooking.studentName}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all text-center"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Wally</span>
              </a>
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
                <div>
                  <label className="block text-xs font-bold text-black/80 uppercase tracking-wider mb-1.5">
                    New Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-3 text-sm font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/80 uppercase tracking-wider mb-1.5">
                    Available Time Slot
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_TIMES.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setNewTime(slot)}
                        className={cn(
                          "p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer",
                          newTime === slot
                            ? "bg-brand-red text-white border-brand-red shadow-sm"
                            : "bg-brand-offwhite text-black/80 border-black/10 hover:bg-black/5"
                        )}
                      >
                        {slot}
                      </button>
                    ))}
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
                    disabled={isSavingReschedule || !newDate}
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
      </AnimatePresence>

    </div>
  );
}
