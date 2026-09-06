import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FAQS } from '../lib/content';
import { useState } from 'react';
import { Plus, Minus, HelpCircle, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export function Faqs() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen relative overflow-hidden">
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-14"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-brand-black/50 mb-3 uppercase tracking-widest">
            <Link to="/" className="hover:text-brand-red transition-colors">Wally's Driving School</Link>
            <span>/</span>
            <span className="text-brand-red font-semibold">Help & Answers</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-brand-black tracking-tight mb-4">FAQS</h1>
          <p className="text-base sm:text-lg text-brand-black/70 max-w-2xl">
            Everything you need to know about learner licences, logbook hours, dual-controlled cars, and NSW driving test preparation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Support Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-brand-red text-white p-8 sm:p-10 rounded-[36px] shadow-[0_20px_50px_rgba(227,34,42,0.35)] relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold font-display mb-3">Still have questions?</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-8">
                Speak directly with Wally or our friendly team. We're available 7 days a week, 8:00 AM to 8:00 PM.
              </p>
              <a 
                href="https://wa.me/61406693301?text=Hi%20Wally,%20I%20have%20a%20question%20about%20driving%20lessons." 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 text-base font-bold bg-white text-brand-black px-6 py-4 rounded-2xl hover:bg-brand-black hover:text-white transition-all shadow-lg"
              >
                <MessageSquare className="w-5 h-5 text-brand-red" />
                <span>Chat on WhatsApp: 0406 693 301</span>
              </a>
            </div>

            <div className="bg-white p-6 rounded-[28px] border border-black/5 shadow-sm">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase text-brand-red mb-2">
                <MessageSquare className="w-4 h-4" /> NSW 3-For-1 Rule
              </div>
              <p className="text-xs text-brand-black/70 leading-relaxed">
                For every 1 hour with an accredited instructor, you record 3 hours in your logbook (up to a maximum of 10 driving hours = 30 logbook hours).
              </p>
            </div>
          </motion.div>

          {/* Accordion FAQ list */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {FAQS.map((faq, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className={cn(
                  "bg-white rounded-[28px] border transition-all duration-300 overflow-hidden",
                  openIndex === i ? "border-brand-red/40 shadow-xl" : "border-black/5 hover:border-black/15 shadow-sm"
                )}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none group"
                >
                  <span className="font-display font-bold text-lg pr-6 text-brand-black group-hover:text-brand-red transition-colors">
                    {faq.question}
                  </span>
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
                    openIndex === i ? "bg-brand-red text-white rotate-180" : "bg-black/5 text-brand-black group-hover:bg-brand-red/10 group-hover:text-brand-red"
                  )}>
                    {openIndex === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-8 pb-6 text-sm sm:text-base text-brand-black/75 leading-relaxed border-t border-black/5 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
