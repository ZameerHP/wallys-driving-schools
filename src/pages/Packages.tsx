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

  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-brand-red/5 rounded-full filter blur-[100px] pointer-events-none" />

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
            <span className="text-brand-red font-semibold">Packages & Pricing</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-brand-black tracking-tight mb-4">
            DRIVING PACKAGES
          </h1>
          <p className="text-brand-black/60 max-w-2xl text-base sm:text-lg">
            Choose from single lessons, bulk logbook hour bundles, or RMS test day car hire packages. Every lesson includes a modern dual-controlled vehicle and certified instructor.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300",
                filter === cat 
                  ? "bg-brand-black text-white shadow-lg shadow-black/20 scale-105" 
                  : "bg-white text-brand-black/80 hover:text-black hover:bg-white/80 border border-black/10 hover:border-black/20"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg, i) => {
            const isPopular = pkg.id === '10-hours-pack-1';
            return (
              <TiltCard
                key={pkg.id}
                maxTilt={7}
                className={cn(
                  "rounded-[36px] p-8 md:p-10 border transition-all duration-500 group flex flex-col h-full relative overflow-hidden",
                  isPopular 
                    ? "bg-brand-black text-white border-brand-red/50 shadow-[0_20px_50px_rgba(227,34,42,0.15)]" 
                    : "bg-white text-brand-black border-black/5 hover:border-brand-red/30 shadow-sm hover:shadow-2xl"
                )}
              >
                {isPopular && (
                  <div className="absolute top-5 right-5 bg-brand-red text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(227,34,42,0.6)]">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <div className={cn(
                  "inline-block px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider mb-6 self-start",
                  isPopular ? "bg-white/10 text-white border border-white/15" : "bg-brand-red/10 text-brand-red font-bold"
                )}>
                  {pkg.label}
                </div>

                <h3 className="text-2xl font-display font-bold mb-3 tracking-tight">{pkg.title}</h3>
                
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl sm:text-5xl font-display font-bold text-brand-red tracking-tight">${pkg.price}</span>
                  <span className={cn("text-xs font-semibold", isPopular ? "text-white/50" : "text-black/40")}>AUD / pkg</span>
                </div>

                <p className={cn("text-sm leading-relaxed mb-8 flex-grow", isPopular ? "text-white/70" : "text-brand-black/70")}>
                  {pkg.description || 'Comprehensive step-by-step driving training with RMS approved instructor in dual-pedal automatic vehicle.'}
                </p>

                <div className={cn("space-y-2.5 mb-8 text-xs font-semibold pt-6 border-t", isPopular ? "border-white/10 text-white/80" : "border-black/5 text-black/70")}>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-red shrink-0" />
                    <span>Dual-controlled modern vehicle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-red shrink-0" />
                    <span>Door-to-door pick-up & drop-off</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-red shrink-0" />
                    <span>Official NSW Logbook 3-for-1 hour credits</span>
                  </div>
                </div>
                
                <div data-magnetic>
                  <Link 
                    to="/book-now" 
                    data-cursor-text="BOOK"
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-md",
                      isPopular 
                        ? "bg-brand-red text-white hover:bg-white hover:text-brand-black shadow-[0_0_20px_rgba(227,34,42,0.4)]" 
                        : "bg-brand-black text-white hover:bg-brand-red hover:text-white"
                    )}
                  >
                    <span>Book This Package</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
