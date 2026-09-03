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
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen relative overflow-hidden">
      <div className="absolute top-20 right-0 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-brand-black/50 mb-3 uppercase tracking-widest">
            <Link to="/" className="hover:text-brand-red transition-colors">Wally's Driving School</Link>
            <span>/</span>
            <span className="text-brand-red font-semibold">Online Booking</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-brand-black">BOOK NOW</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
          {/* Stepper Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
            className="lg:col-span-1 bg-brand-black text-white rounded-[36px] p-8 shadow-2xl sticky top-32"
          >
            <div className="mb-6 pb-6 border-b border-white/10">
              <span className="text-xs uppercase tracking-wider text-brand-red font-bold">Step {currentStep + 1} of {STEPS.length}</span>
              <h3 className="text-lg font-bold font-display mt-1">{STEPS[currentStep]}</h3>
            </div>

            <div className="flex flex-col gap-6">
              {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                
                return (
                  <div 
                    key={idx} 
                    className="flex items-start gap-4 relative group cursor-pointer" 
                    onClick={() => idx <= currentStep && setCurrentStep(idx)}
                  >
                    {idx !== STEPS.length - 1 && (
                      <div className={cn(
                        "absolute left-4 top-8 bottom-[-24px] w-0.5 transition-colors duration-500",
                        isCompleted ? "bg-brand-red" : "bg-white/15"
                      )} />
                    )}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 z-10 text-xs font-bold",
                      isCompleted ? "bg-brand-red border-brand-red text-white shadow-[0_0_12px_rgba(227,34,42,0.6)]" : 
                      isActive ? "border-brand-red bg-brand-black text-brand-red shadow-[0_0_12px_rgba(227,34,42,0.5)]" : "border-white/20 bg-brand-black text-white/40"
                    )}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className={cn(
                      "pt-1 text-sm font-bold transition-colors duration-300",
                      isActive ? "text-brand-red" : isCompleted ? "text-white" : "text-white/40 group-hover:text-white/70"
                    )}>
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2.5 text-xs text-white/60">
              <ShieldCheck className="w-4 h-4 text-brand-red shrink-0" />
              <span>Dual-pedal modern vehicles with full insurance</span>
            </div>
          </motion.div>

          {/* Wizard Form Area */}
          <motion.div 
            className="lg:col-span-3 bg-white rounded-[36px] p-8 md:p-12 shadow-xl border border-black/5 min-h-[500px] flex flex-col justify-between"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          >
            {bookingSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 flex flex-col items-center justify-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-green-500/10 text-green-600 flex items-center justify-center mb-6 shadow-lg">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <span className="text-xs uppercase tracking-widest text-brand-red font-bold mb-2">Booking Confirmed</span>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-brand-black mb-3">
                  Thank You, {studentName || 'Learner Driver'}!
                </h2>
                <p className="text-brand-black/70 max-w-md mx-auto mb-8 text-sm sm:text-base leading-relaxed">
                  Your reservation for <strong>{selectedPackage.title}</strong> on <strong>{bookingDate}</strong> at <strong>{bookingTime}</strong> has been received. Wally will contact you shortly to confirm pickup details.
                </p>

                <div className="bg-brand-offwhite p-6 rounded-2xl border border-black/5 max-w-md w-full mb-8 text-left space-y-2 text-xs text-brand-black/80">
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

                <div className="flex gap-4">
                  <Link 
                    to="/" 
                    className="bg-brand-black text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-brand-red transition-colors"
                  >
                    Return to Homepage
                  </Link>
                  <Link 
                    to="/manage-booking" 
                    className="bg-white text-brand-black border border-black/10 px-8 py-3.5 rounded-full font-bold text-sm hover:bg-black/5 transition-colors"
                  >
                    Manage Booking
                  </Link>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-display font-bold mb-2">Step 1: Select Your Package</h2>
                    <p className="text-sm text-brand-black/60 mb-8">Choose the best driving lesson package for your current level.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {PACKAGES.map(pkg => {
                        const isSelected = selectedPackage.id === pkg.id;
                        return (
                          <div 
                            key={pkg.id} 
                            onClick={() => setSelectedPackage(pkg)} 
                            className={cn(
                              "border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 relative",
                              isSelected 
                                ? "border-brand-red bg-brand-red/5 shadow-md" 
                                : "border-black/10 hover:border-brand-red/40 hover:bg-black/[0.02]"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute top-4 right-4 w-6 h-6 bg-brand-red text-white rounded-full flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-red bg-brand-red/10 px-2.5 py-1 rounded-full inline-block mb-3">
                              {pkg.label}
                            </span>
                            <h3 className="text-lg font-bold mb-1">{pkg.title}</h3>
                            <div className="text-2xl font-bold text-brand-red mb-2">${pkg.price} AUD</div>
                            <p className="text-xs text-brand-black/60 line-clamp-2">{pkg.description || 'Professional instruction with RMS certified instructor.'}</p>
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
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-display font-bold mb-2">Step 2: Preferred Date & Time</h2>
                    <p className="text-sm text-brand-black/60 mb-8">Pick your preferred driving lesson schedule (8:00 AM – 8:00 PM daily).</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-2">
                          Lesson Date
                        </label>
                        <input 
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full bg-brand-offwhite border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-2">
                          Lesson Time
                        </label>
                        <select 
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full bg-brand-offwhite border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                        >
                          <option value="08:00 AM">08:00 AM</option>
                          <option value="09:30 AM">09:30 AM</option>
                          <option value="10:00 AM">10:00 AM</option>
                          <option value="11:30 AM">11:30 AM</option>
                          <option value="01:00 PM">01:00 PM</option>
                          <option value="02:30 PM">02:30 PM</option>
                          <option value="04:00 PM">04:00 PM</option>
                          <option value="05:30 PM">05:30 PM</option>
                          <option value="07:00 PM">07:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-brand-red/5 border border-brand-red/20 rounded-2xl text-xs text-brand-black/80 flex items-center gap-3">
                      <Clock className="w-5 h-5 text-brand-red shrink-0" />
                      <span>We provide door-to-door pickup 10 minutes prior to your allocated time slot.</span>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-display font-bold mb-2">Step 3: Student Details</h2>
                    <p className="text-sm text-brand-black/60 mb-8">Enter your contact info for lesson dispatch and pickup confirmation.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-2">Full Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="Sarah Jenkins"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          className="w-full bg-brand-offwhite border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-2">Mobile Phone</label>
                        <input 
                          type="tel"
                          required
                          placeholder="0400 000 000"
                          value={studentPhone}
                          onChange={(e) => setStudentPhone(e.target.value)}
                          className="w-full bg-brand-offwhite border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-2">Email Address</label>
                        <input 
                          type="email"
                          required
                          placeholder="sarah@example.com"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          className="w-full bg-brand-offwhite border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-2">Pickup Suburb</label>
                        <input 
                          type="text"
                          required
                          placeholder="Rooty Hill / Mount Druitt / Blacktown"
                          value={suburb}
                          onChange={(e) => setSuburb(e.target.value)}
                          className="w-full bg-brand-offwhite border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-brand-red"
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
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-display font-bold mb-2">Step 4: Review & Confirm</h2>
                    <p className="text-sm text-brand-black/60 mb-8">Confirm your driving lesson reservation details.</p>

                    <div className="bg-brand-offwhite p-6 rounded-3xl border border-black/5 space-y-4 mb-8">
                      <div className="flex justify-between items-center pb-4 border-b border-black/5">
                        <span className="text-sm text-brand-black/60">Selected Course:</span>
                        <span className="font-bold text-base">{selectedPackage.title} ({selectedPackage.label})</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-black/5">
                        <span className="text-sm text-brand-black/60">Date & Time:</span>
                        <span className="font-bold text-base">{bookingDate} at {bookingTime}</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-black/5">
                        <span className="text-sm text-brand-black/60">Student Name:</span>
                        <span className="font-bold text-base">{studentName || 'Learner'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-black/5">
                        <span className="text-sm text-brand-black/60">Pickup Area:</span>
                        <span className="font-bold text-base">{suburb || 'Western Sydney'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-base">Total Payable:</span>
                        <span className="text-2xl font-display font-bold text-brand-red">${selectedPackage.price} AUD</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stepper Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-black/5">
                  {currentStep > 0 ? (
                    <button 
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-6 py-3 rounded-full font-bold text-sm bg-black/5 hover:bg-black/10 text-brand-black transition-colors"
                    >
                      Back
                    </button>
                  ) : <div />}

                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleNext}
                    className="px-8 py-3.5 rounded-full font-bold text-sm bg-brand-red text-white shadow-[0_0_20px_rgba(227,34,42,0.4)] hover:bg-brand-black transition-all flex items-center gap-2"
                  >
                    <span>{currentStep === STEPS.length - 1 ? 'Confirm & Book Lesson' : 'Continue'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
