import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Send,
  Sparkles
} from 'lucide-react';
import { PACKAGES } from '../lib/content';
import { createManualBookingByInstructor, BookingItem, ManualBookingData } from '../lib/bookings';
import { validateWorkingEmail, validateInternationalPhone } from '../lib/validation';

export interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (booking: BookingItem) => void;
}

const COMMON_SUBURBS = [
  'Rooty Hill',
  'Blacktown',
  'Mount Druitt',
  'Plumpton',
  'Doonside',
  'Quakers Hill',
  'Glenwood',
  'The Ponds',
  'Schofields',
  'Rouse Hill',
  'Marsden Park',
  'Colebee',
  'Minchinbury',
  'Eastern Creek',
  'St Marys',
  'Colyton',
  'St Clair',
  'Erskine Park',
  'Seven Hills',
  'Penrith',
  'Glenmore Park',
  'Werrington',
  'Kingswood'
];

const STANDARD_TIME_SLOTS = [
  '8:00 AM – 9:00 AM',
  '8:30 AM – 9:30 AM',
  '9:00 AM – 10:00 AM',
  '9:30 AM – 10:30 AM',
  '10:00 AM – 11:00 AM',
  '10:30 AM – 11:30 AM',
  '11:00 AM – 12:00 PM',
  '1:00 PM – 2:00 PM',
  '2:00 PM – 3:00 PM',
  '2:30 PM – 3:30 PM',
  '3:00 PM – 4:00 PM',
  '3:30 PM – 4:30 PM',
  '4:00 PM – 5:00 PM',
  '5:00 PM – 6:00 PM'
];

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form states
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [suburb, setSuburb] = useState('Rooty Hill');
  const [customSuburb, setCustomSuburb] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  
  const [selectedPackageId, setSelectedPackageId] = useState('60-min-lesson');
  const [packagePrice, setPackagePrice] = useState<number>(65);
  const [packageTitle, setPackageTitle] = useState('60 Minutes Lesson');
  const [transmission, setTransmission] = useState<'Automatic' | 'Manual'>('Automatic');

  const [date, setDate] = useState(todayStr);
  const [timeSlot, setTimeSlot] = useState(STANDARD_TIME_SLOTS[2]); // 9:00 AM
  const [customTime, setCustomTime] = useState('');
  const [isCustomTime, setIsCustomTime] = useState(false);

  const [status, setStatus] = useState<BookingItem['status']>('Confirmed');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  
  const [allowOverride, setAllowOverride] = useState(true);
  const [sendConfirmation, setSendConfirmation] = useState(true);

  // Submission UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle package selection
  const handlePackageChange = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const found = PACKAGES.find(p => p.id === pkgId);
    if (found) {
      setPackageTitle(found.title);
      setPackagePrice(found.price);
    }
  };

  const resetForm = () => {
    setStudentName('');
    setPhone('');
    setEmail('');
    setSuburb('Rooty Hill');
    setCustomSuburb('');
    setPickupAddress('');
    setSelectedPackageId('60-min-lesson');
    setPackageTitle('60 Minutes Lesson');
    setPackagePrice(65);
    setTransmission('Automatic');
    setDate(todayStr);
    setTimeSlot(STANDARD_TIME_SLOTS[2]);
    setCustomTime('');
    setIsCustomTime(false);
    setStatus('Confirmed');
    setPaymentStatus('paid');
    setPaymentMethod('cash');
    setNotes('');
    setAllowOverride(true);
    setSendConfirmation(true);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validation
    if (!studentName.trim()) {
      setErrorMessage('Student full name is required.');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }

    const phoneValidation = validateInternationalPhone(phone, '+61');
    if (!phoneValidation.isValid) {
      setErrorMessage(phoneValidation.error || 'Please enter a valid phone number (e.g. 0412 345 678).');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Student email is required for calendar confirmation & 2hr lesson reminders.');
      return;
    }

    const emailValidation = validateWorkingEmail(email);
    if (!emailValidation.isValid) {
      setErrorMessage(emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    const finalSuburb = suburb === 'Other' ? customSuburb.trim() : suburb;
    if (!finalSuburb) {
      setErrorMessage('Please specify a suburb.');
      return;
    }

    const finalTime = isCustomTime ? customTime.trim() : timeSlot;
    if (!finalTime) {
      setErrorMessage('Please specify a lesson time slot.');
      return;
    }

    if (!date) {
      setErrorMessage('Please select a lesson date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: ManualBookingData = {
        studentName: studentName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        suburb: finalSuburb,
        pickupAddress: pickupAddress.trim() || undefined,
        packageTitle,
        packagePrice: Number(packagePrice) || 65,
        date,
        time: finalTime,
        status,
        paymentStatus,
        paymentMethod,
        transmission,
        notes: notes.trim(),
        allowOverride,
        sendConfirmation
      };

      const created = await createManualBookingByInstructor(payload);
      
      onSuccess(created);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Failed to create manual booking:', err);
      setErrorMessage(err.message || 'Failed to save booking to database. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-black/10 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-brand-black text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-red flex items-center justify-center shadow-[0_0_12px_rgba(227,34,42,0.4)]">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-display font-bold leading-tight">
                    Add Client Booking (Owner Entry)
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Sparkles className="w-2.5 h-2.5" /> Auto DB Sync
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  Directly injects confirmed lesson into Cloud SQL database and live instructor schedule.
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content (Scrollable) */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Section 1: Student Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-red">
                <User className="w-3.5 h-3.5" />
                <span>Student Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Student Full Name <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Jordan Miller"
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone Number <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0412 345 678"
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address <span className="text-brand-red">*</span>
                    <span className="text-[11px] font-normal text-gray-500 ml-1.5">
                      (Used for confirmation & 2-hr lesson reminder dispatch)
                    </span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. jordan.miller@example.com"
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Lesson Package & Transmission */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-red">
                  <Car className="w-3.5 h-3.5" />
                  <span>Lesson Package & Transmission</span>
                </div>

                {/* Transmission Switch */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setTransmission('Automatic')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      transmission === 'Automatic'
                        ? 'bg-brand-red text-white shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Auto (Dual-Ctrl)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransmission('Manual')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      transmission === 'Manual'
                        ? 'bg-brand-black text-white shadow-xs'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Select Package / Service
                  </label>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none bg-white cursor-pointer"
                  >
                    {PACKAGES.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title} ({pkg.label || `$${pkg.price}`}) — ${pkg.price} AUD
                      </option>
                    ))}
                    <option value="custom">Custom Lesson / Assessment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Price ($ AUD)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={packagePrice}
                      onChange={(e) => setPackagePrice(Number(e.target.value))}
                      className="w-full text-xs sm:text-sm pl-8 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Date, Time & Location */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-red">
                <Calendar className="w-3.5 h-3.5" />
                <span>Appointment Schedule & Location</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Lesson Date <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none bg-white cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Time Slot <span className="text-brand-red">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTime(!isCustomTime)}
                      className="text-[11px] text-brand-red hover:underline font-semibold cursor-pointer"
                    >
                      {isCustomTime ? 'Use Standard Slot' : 'Custom Time'}
                    </button>
                  </div>

                  {isCustomTime ? (
                    <input
                      type="text"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      placeholder="e.g. 11:30 AM – 1:30 PM"
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none"
                    />
                  ) : (
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none bg-white cursor-pointer"
                    >
                      {STANDARD_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Suburb / Service Hub <span className="text-brand-red">*</span>
                  </label>
                  <select
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none bg-white cursor-pointer"
                  >
                    {COMMON_SUBURBS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Other">Other Suburb...</option>
                  </select>

                  {suburb === 'Other' && (
                    <input
                      type="text"
                      required
                      placeholder="Enter specific suburb"
                      value={customSuburb}
                      onChange={(e) => setCustomSuburb(e.target.value)}
                      className="w-full mt-2 text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Exact Pickup Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="e.g. 14 Waratah St, Rooty Hill"
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Status & Payment Method */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-red">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Roster Status & Payment Recording</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Booking Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none bg-white font-semibold cursor-pointer"
                  >
                    <option value="Confirmed">Confirmed (Active Roster)</option>
                    <option value="Pending">Pending (Tentative)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none bg-white font-semibold cursor-pointer"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid (Pay on Day)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none bg-white cursor-pointer"
                  >
                    <option value="cash">Cash in Car</option>
                    <option value="transfer">Bank Transfer / PayID</option>
                    <option value="card">Card / EFTPOS</option>
                    <option value="voucher">Prepaid / Voucher</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 5: Notes */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700">
                Instructor Lesson Notes & Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. First lesson; focus on three-point turns, roundabouts, and logbook entries."
                className="w-full text-xs sm:text-sm p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none resize-none"
              />
            </div>

            {/* Options Checkboxes */}
            <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
              <label className="flex items-center gap-2.5 text-xs text-gray-800 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendConfirmation}
                  onChange={(e) => setSendConfirmation(e.target.checked)}
                  className="rounded border-gray-300 text-brand-red focus:ring-brand-red w-4 h-4"
                />
                <span>Send confirmation email & lesson details to student email via Resend</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-800 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowOverride}
                  onChange={(e) => setAllowOverride(e.target.checked)}
                  className="rounded border-gray-300 text-brand-red focus:ring-brand-red w-4 h-4"
                />
                <span>Owner privilege: allow booking even if time slot was flagged as overlapping</span>
              </label>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:text-black hover:bg-gray-200/60 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-brand-red hover:bg-[#c41a21] text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-md shadow-brand-red/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Add Booking to Database</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ManualBookingModal;
