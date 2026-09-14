import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  Save,
  DollarSign,
  Car
} from 'lucide-react';
import { BookingItem } from '../lib/bookings';
import { cn } from '../lib/utils';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  onSave: (updatedBooking: Partial<BookingItem>) => Promise<void>;
}

const STANDARD_SLOTS = [
  '08:30 AM - 09:30 AM',
  '10:00 AM - 11:00 AM',
  '11:30 AM - 12:30 PM',
  '01:30 PM - 02:30 PM',
  '03:00 PM - 04:00 PM',
  '04:30 PM - 05:30 PM',
];

const STANDARD_PACKAGES = [
  { title: '1 Hour Driving Lesson', price: 65 },
  { title: '2 Hour Driving Lesson', price: 120 },
  { title: '5-Lesson Package (5 Hours)', price: 300 },
  { title: '10-Lesson Package (10 Hours)', price: 580 },
  { title: 'Driving Test Day Package', price: 180 },
  { title: 'Refresher Driving Course', price: 90 },
];

export function EditBookingModal({ isOpen, booking, onClose, onSave }: EditBookingModalProps) {
  if (!isOpen || !booking) return null;

  // State initialized with current booking data
  const [date, setDate] = useState(booking.date || '');
  const [time, setTime] = useState(booking.time || STANDARD_SLOTS[0]);
  const [customTime, setCustomTime] = useState('');
  const [isCustomTime, setIsCustomTime] = useState(!STANDARD_SLOTS.includes(booking.time));

  const [studentName, setStudentName] = useState(booking.studentName || '');
  const [phone, setPhone] = useState(booking.phone || '');
  const [email, setEmail] = useState(booking.email || '');
  
  const [pickupAddress, setPickupAddress] = useState(booking.pickupAddress || '');
  const [suburb, setSuburb] = useState(booking.suburb || 'Rockingham');
  
  const [packageTitle, setPackageTitle] = useState(booking.packageTitle || '1 Hour Driving Lesson');
  const [packagePrice, setPackagePrice] = useState<number>(booking.packagePrice || 65);
  const [status, setStatus] = useState<BookingItem['status']>(booking.status || 'Confirmed');
  const [paymentStatus, setPaymentStatus] = useState<string>(booking.paymentStatus || 'paid');
  const [notes, setNotes] = useState(booking.notes || '');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if date or time changed
  const isDateTimeChanged = date !== booking.date || (isCustomTime ? customTime : time) !== booking.time;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const effectiveTime = isCustomTime ? customTime.trim() : time;
    if (!date) {
      setErrorMessage('Please select a valid lesson date.');
      return;
    }
    if (!effectiveTime) {
      setErrorMessage('Please provide a lesson time slot.');
      return;
    }
    if (!studentName.trim()) {
      setErrorMessage('Student name cannot be empty.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Student phone number is required.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedFields: Partial<BookingItem> = {
        date,
        time: effectiveTime,
        studentName: studentName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        pickupAddress: pickupAddress.trim(),
        suburb: suburb.trim(),
        packageTitle: packageTitle.trim(),
        packagePrice: Number(packagePrice) || 65,
        status,
        paymentStatus,
        notes: notes.trim(),
        isRescheduled: isDateTimeChanged ? true : booking.isRescheduled
      };

      await onSave(updatedFields);
      onClose();
    } catch (err: any) {
      console.error('Failed to save booking changes:', err);
      setErrorMessage(err.message || 'Failed to save booking updates. Please check connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-black/10 overflow-hidden my-6 relative flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-brand-black text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-red bg-brand-red/20 px-2 py-0.5 rounded-full border border-brand-red/30">
                Instructor Editor
              </span>
              <span className="font-mono text-xs font-bold text-white/70">
                Ref: #{booking.ref}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-white">
              Edit & Reschedule Booking
            </h2>
            <p className="text-xs text-white/60">
              Changes will instantly update the database and the customer's Manage Booking portal.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-2xl flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Date & Time (Reschedule) */}
          <div className="bg-brand-offwhite p-4 sm:p-5 rounded-2xl border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-black font-bold text-sm">
                <Calendar className="w-4 h-4 text-brand-red" />
                <span>Date & Time (Reschedule Slot)</span>
              </div>
              {isDateTimeChanged && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Date/Time Modified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Lesson Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Time Slot
                </label>
                {!isCustomTime ? (
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                  >
                    {STANDARD_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="e.g. 02:00 PM - 03:00 PM"
                    className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                    required
                  />
                )}
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTime(!isCustomTime);
                      if (!isCustomTime && !customTime) setCustomTime(time);
                    }}
                    className="text-brand-red hover:underline font-semibold cursor-pointer"
                  >
                    {isCustomTime ? 'Switch to Standard Slots' : 'Enter Custom Time'}
                  </button>
                  <span className="text-black/40">Sydney Time</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Student Details */}
          <div className="bg-brand-offwhite p-4 sm:p-5 rounded-2xl border border-black/5 space-y-4">
            <div className="flex items-center gap-2 text-brand-black font-bold text-sm">
              <User className="w-4 h-4 text-brand-red" />
              <span>Student & Contact Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Student name"
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0412 345 678"
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Location & Pickup */}
          <div className="bg-brand-offwhite p-4 sm:p-5 rounded-2xl border border-black/5 space-y-4">
            <div className="flex items-center gap-2 text-brand-black font-bold text-sm">
              <MapPin className="w-4 h-4 text-brand-red" />
              <span>Pickup Address & Service Area</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Pickup Street Address
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="e.g. 14 Railway Parade or school pickup"
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Suburb
                </label>
                <input
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. Blacktown, Parramatta"
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Package, Status & Notes */}
          <div className="bg-brand-offwhite p-4 sm:p-5 rounded-2xl border border-black/5 space-y-4">
            <div className="flex items-center gap-2 text-brand-black font-bold text-sm">
              <DollarSign className="w-4 h-4 text-brand-red" />
              <span>Package, Pricing & Status</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Lesson Package
                </label>
                <select
                  value={packageTitle}
                  onChange={(e) => {
                    const sel = e.target.value;
                    setPackageTitle(sel);
                    const matched = STANDARD_PACKAGES.find(p => p.title === sel);
                    if (matched) setPackagePrice(matched.price);
                  }}
                  className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                >
                  {STANDARD_PACKAGES.map(p => (
                    <option key={p.title} value={p.title}>{p.title}</option>
                  ))}
                  <option value="Custom Lesson">Custom Lesson</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Price ($ AUD)
                </label>
                <input
                  type="number"
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(Number(e.target.value))}
                  className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Booking Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                >
                  <option value="paid">Paid (Stripe / Online)</option>
                  <option value="cash">Cash / Pay on Day</option>
                  <option value="unpaid">Awaiting Payment (Unpaid)</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-black/70 uppercase tracking-wider mb-1.5">
                Instructor Notes / Lesson Directives
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Student notes, logbook progress, road test date, or special instructions"
                className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-black/10">
            <div className="text-[11px] text-black/50">
              Student will see updated information on <strong>/manage-booking</strong>.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-black/70 hover:text-black rounded-xl hover:bg-black/5 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-brand-red hover:bg-[#c41a21] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-brand-red/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Sync Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
