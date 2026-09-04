import { motion } from 'framer-motion';
import { PACKAGES } from '../lib/content';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { TiltCard } from '../components/TiltCard';

export function Packages() {
  const [filter, setFilter] = useState('All');
  const categories = ['All', 'Lessons', 'Hour Packs', 'Test Packages'];
  
  const filteredPackages = PACKAGES.filter(pkg => filter === 'All' || pkg.category === filter);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="pt-24 pb-12 bg-brand-offwhite min-h-screen relative overflow-hidden flex flex-col justify-center">
      {/* Background ambient lighting */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-brand-red/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-[10px] font-bold text-brand-black/50 mb-2 uppercase tracking-widest">
              <Link to="/" className="hover:text-brand-red transition-colors">Wally's Driving School</Link>
              <span>/</span>
              <span className="text-brand-red font-semibold">Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-black tracking-tight">
              DRIVING PACKAGES
            </h1>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full font-bold text-xs transition-all duration-300",
                  filter === cat 
                    ? "bg-brand-black text-white shadow-lg shadow-black/20 scale-105" 
                    : "bg-white text-brand-black/80 hover:text-black hover:bg-white/80 border border-black/10 hover:border-black/20"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Packages Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={filter} // Re-trigger animation on filter change
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredPackages.map((pkg) => {
            const isPopular = pkg.id === '10-hours-pack';
            return (
              <motion.div key={pkg.id} variants={itemVariants} className="h-full">
                <TiltCard
                  maxTilt={4}
                  className={cn(
                    "rounded-[24px] p-6 border transition-all duration-500 group flex flex-col h-full relative overflow-hidden",
                    isPopular 
                      ? "bg-brand-black text-white border-brand-red/50 shadow-[0_10px_30px_rgba(227,34,42,0.15)]" 
                      : "bg-white text-brand-black border-black/5 hover:border-brand-red/30 shadow-sm hover:shadow-xl"
                  )}
                >
                  {isPopular && (
                    <div className="absolute top-4 right-4 bg-brand-red text-white text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(227,34,42,0.6)]">
                      <Sparkles className="w-2.5 h-2.5" /> Popular
                    </div>
                  )}
                  
                  <div className={cn(
                    "inline-block px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider mb-4 self-start",
                    isPopular ? "bg-white/10 text-white border border-white/15" : "bg-brand-red/10 text-brand-red font-bold"
                  )}>
                    {pkg.label}
                  </div>
                  
                  <h3 className="text-xl font-display font-bold mb-1 tracking-tight line-clamp-1">{pkg.title}</h3>
                  
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-3xl font-display font-bold text-brand-red tracking-tight">${pkg.price}</span>
                    <span className={cn("text-[10px] font-semibold", isPopular ? "text-white/50" : "text-black/40")}>AUD</span>
                  </div>
                  
                  <p className={cn("text-xs leading-relaxed mb-5 flex-grow", isPopular ? "text-white/70" : "text-brand-black/70")}>
                    {pkg.description || 'Comprehensive step-by-step driving training with RMS approved instructor in dual-pedal automatic vehicle.'}
                  </p>
                  
                  <div className={cn("space-y-2 mb-5 text-[11px] font-semibold pt-4 border-t", isPopular ? "border-white/10 text-white/80" : "border-black/5 text-black/70")}>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-red shrink-0" />
                      <span>Dual-controlled vehicle</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-red shrink-0" />
                      <span>Pick-up & drop-off</span>
                    </div>
                  </div>
                  
                  <div data-magnetic>
                    <Link 
                      to="/book-now" 
                      data-cursor-text="BOOK"
                      className={cn(
                        "w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-sm",
                        isPopular 
                          ? "bg-brand-red text-white hover:bg-white hover:text-brand-black shadow-[0_0_15px_rgba(227,34,42,0.4)]" 
                          : "bg-brand-black text-white hover:bg-brand-red hover:text-white"
                      )}
                    >
                      <span>Book Package</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
