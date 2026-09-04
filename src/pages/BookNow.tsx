import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Check, ChevronRight, Calendar, Clock, User, CreditCard, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { PACKAGES } from '../lib/content';

const STEPS = [
  'Package Selection',
  'Preferred Date & Time',
  'Student Details',
  'Booking Confirmation'
];

export function BookNow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[0]);
  const [bookingDate, setBookingDate] = useState('2026-10-28');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [suburb, setSuburb] = useState('Rooty Hill');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setBookingSuccess(true);
    }
  };

  return (
    <div className="pt-24 lg:pt-24 pb-8 lg:pb-8 bg-brand-offwhite min-h-screen relative flex flex-col justify-center">
      <div className="absolute top-20 right-0 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex-grow flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-4 lg:mb-5"
        >
          <div className="flex items-center gap-2 text-[11px] font-bold text-brand-black/50 mb-1 uppercase tracking-widest">
            <Link to="/" className="hover:text-brand-red transition-colors">Wally's Driving School</Link>
            <span>/</span>
            <span className="text-brand-red font-semibold">Book Online</span>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-tight text-brand-black">BOOK YOUR LESSON</h1>
            <div className="text-xs text-brand-black/60 hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1 font-medium"><Check className="w-3.5 h-3.5 text-brand-red" /> Dual-Control Fleet</span>
              <span className="flex items-center gap-1 font-medium"><Check className="w-3.5 h-3.5 text-brand-red" /> RMS Certified</span>
              <span className="flex items-center gap-1 font-medium"><Check className="w-3.5 h-3.5 text-brand-red" /> Door-to-Door Pickup</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch h-full">
          {/* Stepper Sidebar - Fixed / Non-scrolling */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
            className="lg:col-span-1 bg-brand-black text-white rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="mb-5 pb-4 border-b border-white/10">
                <span className="text-[11px] uppercase tracking-wider text-brand-red font-bold">Step {currentStep + 1} of {STEPS.length}</span>
                <h3 className="text-base font-bold font-display mt-0.5">{STEPS[currentStep]}</h3>
              </div>

              <div className="flex flex-col gap-4">
                {STEPS.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isCompleted = idx < currentStep;
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 relative group cursor-pointer" 
                      onClick={() => idx <= currentStep && setCurrentStep(idx)}
                    >
                      {idx !== STEPS.length - 1 && (
                        <div className={cn(
                          "absolute left-3.5 top-7 bottom-[-16px] w-0.5 transition-colors duration-500",
                          isCompleted ? "bg-brand-red" : "bg-white/15"
                        )} />
                      )}
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 z-10 text-xs font-bold",
                        isCompleted ? "bg-brand-red border-brand-red text-white shadow-[0_0_12px_rgba(227,34,42,0.6)]" : 
                        isActive ? "border-brand-red bg-brand-black text-brand-red shadow-[0_0_12px_rgba(227,34,42,0.5)]" : "border-white/20 bg-brand-black text-white/40"
                      )}>
                        {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                      </div>
                      <div className={cn(
                        "pt-0.5 text-xs font-bold transition-colors duration-300",
                        isActive ? "text-brand-red" : isCompleted ? "text-white" : "text-white/40 group-hover:text-white/70"
                      )}>
                        {step}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Package preview card */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Selected Package</div>
              <div className="text-sm font-bold text-white leading-tight truncate">{selectedPackage.title}</div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-brand-red font-bold font-display text-sm">${selectedPackage.price} AUD</span>
                <span className="text-[11px] text-white/70 bg-white/10 px-2 py-0.5 rounded-full">{selectedPackage.label}</span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[11px] text-white/50">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-red shrink-0" />
                <span>Dual-control car · RMS certified</span>
              </div>
            </div>
          </motion.div>

          {/* Wizard Form Area */}
          <motion.div 
            className="lg:col-span-3 bg-white rounded-[28px] p-5 sm:p-7 shadow-xl border border-black/5 flex flex-col justify-between"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          >
            {bookingSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 flex flex-col items-center justify-center my-auto"
              >
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center mb-4 shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-[11px] uppercase tracking-widest text-brand-red font-bold mb-1">Booking Confirmed</span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-brand-black mb-2">
                  Thank You, {studentName || 'Learner Driver'}!
                </h2>
                <p className="text-brand-black/70 max-w-md mx-auto mb-6 text-xs sm:text-sm leading-relaxed">
                  Your reservation for <strong>{selectedPackage.title}</strong> on <strong>{bookingDate}</strong> at <strong>{bookingTime}</strong> has been received. Wally will contact you shortly to confirm pickup details.
                </p>

                <div className="bg-brand-offwhite p-4 rounded-2xl border border-black/5 max-w-md w-full mb-6 text-left space-y-2 text-xs text-brand-black/80">
                  <div className="flex justify-between">
                    <span className="font-semibold">Selected Package:</span>
                    <span>{selectedPackage.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Price:</span>
                    <span className="text-brand-red font-bold text-sm">${selectedPackage.price} AUD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Pickup Area:</span>
                    <span>{suburb}, NSW</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link 
                    to="/" 
                    className="bg-brand-black text-white px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm hover:bg-brand-red transition-colors"
                  >
                    Return to Homepage
                  </Link>
                  <Link 
                    to="/manage-booking" 
                    className="bg-white text-brand-black border border-black/10 px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm hover:bg-black/5 transition-colors"
                  >
                    Manage Booking
                  </Link>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="flex-grow">
                  <AnimatePresence mode="wait">
                    {currentStep === 0 && (
                      <motion.div
                        key="step-0"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-black">Step 1: Select Your Package</h2>
                            <p className="text-xs text-brand-black/60">Choose any package below. All 6 packages include RMS certified instructor & dual-control vehicle.</p>
                          </div>
                          <span className="text-[11px] font-bold text-brand-red bg-brand-red/10 px-2.5 py-1 rounded-full">
                            6 Options Available
                          </span>
                        </div>
                        
                        {/* Compact 6-Box Grid: 3 columns x 2 rows, perfectly fitting with NO SCROLLING required */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {PACKAGES.map(pkg => {
                            const isSelected = selectedPackage.id === pkg.id;
                            return (
                              <div 
                                key={pkg.id} 
                                onClick={() => setSelectedPackage(pkg)} 
                                className={cn(
                                  "group relative border-2 rounded-xl p-3 sm:p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-between text-left",
                                  isSelected 
                                    ? "border-brand-red bg-brand-red/[0.04] shadow-[0_4px_16px_rgba(227,34,42,0.12)] ring-1 ring-brand-red/30" 
                                    : "border-black/10 bg-white hover:border-brand-red/40 hover:bg-black/[0.015] hover:shadow-sm"
                                )}
                              >
                                <div>
                                  {/* Top Row: Label badge & Check indicator */}
                                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                                      isSelected ? "bg-brand-red text-white" : "bg-brand-red/10 text-brand-red"
                                    )}>
                                      {pkg.label}
                                    </span>
                                    <div className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                      isSelected ? "bg-brand-red text-white shadow-sm" : "border border-black/20 group-hover:border-brand-red/60"
                                    )}>
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                  </div>

                                  {/* Title */}
                                  <h3 className="text-xs sm:text-sm font-bold text-brand-black group-hover:text-brand-red transition-colors leading-tight mb-1">
                                    {pkg.title}
                                  </h3>
                                </div>

                                <div>
                                  {/* Price & Logbook chip */}
                                  <div className="flex items-baseline justify-between gap-1 mb-1 mt-1">
                                    <div className="text-base sm:text-lg font-bold font-display text-brand-red leading-none">
                                      ${pkg.price} <span className="text-[10px] font-semibold text-brand-black/50">AUD</span>
                                    </div>
                                    {pkg.hours ? (
                                      <span className="text-[10px] font-semibold text-brand-black/70 bg-black/5 px-1.5 py-0.5 rounded">
                                        {pkg.hours}h Logbook
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-brand-red bg-brand-red/10 px-1.5 py-0.5 rounded">
                                        RMS Test Car
                                      </span>
                                    )}
                                  </div>

                                  {/* Description */}
                                  <p className="text-[11px] text-brand-black/60 leading-snug line-clamp-2">
                                    {pkg.description || 'Professional instruction with RMS certified instructor.'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                      >
                        <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-black mb-1">Step 2: Preferred Date & Time</h2>
                        <p className="text-xs text-brand-black/60 mb-4">Pick your preferred driving lesson schedule (8:00 AM – 8:00 PM daily).</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-1.5">
                              Lesson Date
                            </label>
                            <input 
                              type="date"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-1.5">
                              Lesson Time
                            </label>
                            <select 
                              value={bookingTime}
                              onChange={(e) => setBookingTime(e.target.value)}
                              className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                            >
                              <option value="08:00 AM">08:00 AM - Morning</option>
                              <option value="09:30 AM">09:30 AM - Morning</option>
                              <option value="10:00 AM">10:00 AM - Morning</option>
                              <option value="11:30 AM">11:30 AM - Midday</option>
                              <option value="01:00 PM">01:00 PM - Afternoon</option>
                              <option value="02:30 PM">02:30 PM - Afternoon</option>
                              <option value="04:00 PM">04:00 PM - Afternoon</option>
                              <option value="05:30 PM">05:30 PM - Evening</option>
                              <option value="07:00 PM">07:00 PM - Evening</option>
                            </select>
                          </div>
                        </div>

                        {/* Quick Time Selection Pills */}
                        <div className="mb-4">
                          <span className="text-[11px] font-bold text-brand-black/50 uppercase tracking-wider block mb-2">Quick Pick Popular Slots:</span>
                          <div className="flex flex-wrap gap-2">
                            {['08:00 AM', '10:00 AM', '11:30 AM', '01:00 PM', '04:00 PM', '05:30 PM'].map(time => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setBookingTime(time)}
                                className={cn(
                                  "text-xs px-3 py-1.5 rounded-lg font-semibold transition-all",
                                  bookingTime === time 
                                    ? "bg-brand-red text-white shadow-sm" 
                                    : "bg-brand-offwhite hover:bg-black/5 border border-black/5 text-brand-black/80"
                                )}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-brand-red/5 border border-brand-red/20 rounded-xl text-xs text-brand-black/80 flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-brand-red shrink-0" />
                          <span>Complimentary door-to-door pickup provided across Western Sydney suburbs.</span>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                      >
                        <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-black mb-1">Step 3: Student Details</h2>
                        <p className="text-xs text-brand-black/60 mb-4">Enter your contact info for lesson dispatch and pickup confirmation.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-1">Full Name</label>
                            <input 
                              type="text"
                              required
                              placeholder="Sarah Jenkins"
                              value={studentName}
                              onChange={(e) => setStudentName(e.target.value)}
                              className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-1">Mobile Phone</label>
                            <input 
                              type="tel"
                              required
                              placeholder="0400 000 000"
                              value={studentPhone}
                              onChange={(e) => setStudentPhone(e.target.value)}
                              className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-1">Email Address</label>
                            <input 
                              type="email"
                              required
                              placeholder="sarah@example.com"
                              value={studentEmail}
                              onChange={(e) => setStudentEmail(e.target.value)}
                              className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-1">Pickup Suburb</label>
                            <input 
                              type="text"
                              required
                              placeholder="Rooty Hill / Mount Druitt / Blacktown"
                              value={suburb}
                              onChange={(e) => setSuburb(e.target.value)}
                              className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                      >
                        <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-black mb-1">Step 4: Review & Confirm</h2>
                        <p className="text-xs text-brand-black/60 mb-4">Confirm your driving lesson reservation details.</p>

                        <div className="bg-brand-offwhite p-4 sm:p-5 rounded-2xl border border-black/5 space-y-3 mb-4">
                          <div className="flex justify-between items-center pb-2.5 border-b border-black/5">
                            <span className="text-xs text-brand-black/60">Selected Course:</span>
                            <span className="font-bold text-sm">{selectedPackage.title} ({selectedPackage.label})</span>
                          </div>
                          <div className="flex justify-between items-center pb-2.5 border-b border-black/5">
                            <span className="text-xs text-brand-black/60">Date & Time:</span>
                            <span className="font-bold text-sm">{bookingDate} at {bookingTime}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2.5 border-b border-black/5">
                            <span className="text-xs text-brand-black/60">Student Name:</span>
                            <span className="font-bold text-sm">{studentName || 'Learner Driver'}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2.5 border-b border-black/5">
                            <span className="text-xs text-brand-black/60">Pickup Area:</span>
                            <span className="font-bold text-sm">{suburb || 'Rooty Hill'}, NSW</span>
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="font-bold text-sm">Total Payable:</span>
                            <span className="text-xl font-display font-bold text-brand-red">${selectedPackage.price} AUD</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Stepper Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-black/5 shrink-0 mt-2">
                  {currentStep > 0 ? (
                    <button 
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-black/5 hover:bg-black/10 text-brand-black transition-colors"
                    >
                      Back
                    </button>
                  ) : <div />}

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNext}
                    className="px-7 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-brand-red text-white shadow-[0_0_20px_rgba(227,34,42,0.4)] hover:bg-brand-black transition-all flex items-center gap-2"
                  >
                    <span>{currentStep === STEPS.length - 1 ? 'Confirm & Book Lesson' : 'Continue'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
