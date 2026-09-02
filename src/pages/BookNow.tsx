import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { PACKAGES } from '../lib/content';

const STEPS = [
  'Service Selection',
  'Package',
  'Appointments',
  'Booking Overview',
  'Your Information',
  'Payments'
];

export function BookNow() {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-brand-black/50 mb-4 uppercase tracking-wider">
            <Link to="/" className="hover:text-brand-red">Wallys Driving School</Link>
            <span>/</span>
            <span className="text-brand-red">Book Now</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold">BOOK NOW</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Stepper Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 bg-brand-black text-white rounded-[32px] p-8 shadow-2xl h-fit sticky top-32"
          >
            <div className="flex flex-col gap-8">
              {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                
                return (
                  <div key={idx} className="flex items-start gap-4 relative group cursor-pointer" onClick={() => idx <= currentStep && setCurrentStep(idx)}>
                    {idx !== STEPS.length - 1 && (
                      <div className={cn(
                        "absolute left-4 top-10 bottom-[-32px] w-0.5 transition-colors duration-500",
                        isCompleted ? "bg-brand-red" : "bg-white/10"
                      )} />
                    )}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 z-10",
                      isCompleted ? "bg-brand-red border-brand-red text-white" : 
                      isActive ? "border-brand-red bg-brand-black text-brand-red" : "border-white/20 bg-brand-black text-white/50"
                    )}>
                      {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                    </div>
                    <div className={cn(
                      "pt-1 font-bold transition-colors duration-300",
                      isActive ? "text-brand-red" : isCompleted ? "text-white" : "text-white/50 group-hover:text-white/80"
                    )}>
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Wizard Content */}
          <motion.div 
            className="lg:col-span-3 bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-black/5"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 0 && (
                  <div>
                    <h2 className="text-3xl font-display font-bold mb-8">Select a Service</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {PACKAGES.map(pkg => (
                        <div key={pkg.id} onClick={() => setCurrentStep(1)} className="border border-black/10 rounded-2xl p-6 hover:border-brand-red hover:shadow-md cursor-pointer transition-all">
                          <h3 className="text-xl font-bold mb-2">{pkg.title}</h3>
                          <p className="text-brand-black/60 mb-4">{pkg.label}</p>
                          <div className="text-2xl font-bold text-brand-red">AU${pkg.price.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep > 0 && currentStep < STEPS.length && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-6">
                      <span className="text-2xl font-bold text-brand-black/30">{currentStep + 1}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">{STEPS[currentStep]}</h2>
                    <p className="text-brand-black/60 mb-8 max-w-md">
                      This is a placeholder for the booking wizard step. In a full implementation, this would contain the specific forms and UI for this step.
                    </p>
                    <div className="flex gap-4">
                      <button onClick={() => setCurrentStep(prev => prev - 1)} className="px-6 py-3 rounded-full font-bold bg-black/5 hover:bg-black/10 transition-colors">
                        Back
                      </button>
                      {currentStep < STEPS.length - 1 ? (
                        <button onClick={() => setCurrentStep(prev => prev + 1)} className="px-6 py-3 rounded-full font-bold bg-brand-red text-white hover:bg-brand-red/90 transition-colors">
                          Continue
                        </button>
                      ) : (
                        <button className="px-6 py-3 rounded-full font-bold bg-brand-black text-white hover:bg-black/90 transition-colors">
                          Confirm Booking
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
