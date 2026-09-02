import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FAQS } from '../lib/content';
import { useState } from 'react';
import { Plus, Minus, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

export function Faqs() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-brand-black/50 mb-4 uppercase tracking-wider">
            <Link to="/" className="hover:text-brand-red">Wallys Driving School</Link>
            <span>/</span>
            <span className="text-brand-red">FAQs</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold">FAQS</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <h2 className="text-3xl font-display font-bold mb-6">Frequently asked Question & Answers Here</h2>
            <div className="bg-brand-red text-white p-8 rounded-[32px] shadow-xl">
              <h3 className="text-xl font-bold mb-4">Do You Still Have Question? Call Anytime</h3>
              <a href="tel:0406693301" className="flex items-center gap-4 text-2xl font-bold bg-white/10 px-6 py-4 rounded-xl hover:bg-white/20 transition-colors">
                <Phone className="w-6 h-6" />
                0406 693 301
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {FAQS.map((faq, i) => (
              <div 
                key={i} 
                className={cn(
                  "bg-white rounded-[24px] border transition-all duration-300 overflow-hidden",
                  openIndex === i ? "border-brand-red shadow-lg" : "border-black/5 hover:border-black/10"
                )}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-display font-bold text-lg pr-8">{faq.question}</span>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                    openIndex === i ? "bg-brand-red text-white" : "bg-black/5 text-brand-black"
                  )}>
                    {openIndex === i ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
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
                      <div className="px-8 pb-6 text-brand-black/70">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
