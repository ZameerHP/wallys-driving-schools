import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, CheckCircle2, MessageCircle, Car } from 'lucide-react';

const PRIMARY_SUBURBS = [
  'Rooty Hill',
  'Mount Druitt',
  'St Marys',
  'Minchinbury',
  'Plumpton',
  'Blacktown',
  'Doonside',
  'Eastern Creek',
  'Oakhurst',
  'Glendenning',
  'Dean Park',
  'Western Sydney Parklands'
];

export function CoverageArea() {
  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen relative overflow-hidden">
      <div className="absolute top-24 right-0 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[120px] pointer-events-none" />

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
            <span className="text-brand-red font-semibold">Service Coverage</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-brand-black tracking-tight mb-4">COVERAGE AREA</h1>
          <p className="text-base sm:text-lg text-brand-black/70 max-w-2xl">
            We provide convenient door-to-door learner driving lessons across Western Sydney, covering home, school, station and workplace pick-ups.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16 items-start">
          {/* Suburbs info card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-brand-black text-white p-8 sm:p-10 rounded-[36px] shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-[0_0_15px_rgba(227,34,42,0.5)]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display">Western Sydney</h3>
                  <p className="text-xs text-white/50">NSW Primary Service Hub</p>
                </div>
              </div>

              <p className="text-sm text-white/70 leading-relaxed mb-6">
                Free door-to-door pick up and drop off in all serviced postcodes. Don't see your suburb? Message Wally on WhatsApp to check instructor availability in your area.
              </p>

              <div className="space-y-2.5 mb-8">
                {PRIMARY_SUBURBS.map((suburb, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-brand-red shrink-0" />
                    <span>{suburb}</span>
                  </div>
                ))}
              </div>

              <a 
                href="https://wa.me/61406693301?text=Hi%20Wally,%20I'd%20like%20to%20check%20if%20you%20cover%20my%20suburb."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black py-3.5 rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enquire via WhatsApp: 0406 693 301</span>
              </a>
            </div>

            {/* Test Center Card */}
            <div className="bg-white p-6 rounded-[28px] border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Car className="w-5 h-5 text-brand-red" />
                <h4 className="font-bold text-sm">Nearby RMS Test Centers</h4>
              </div>
              <p className="text-xs text-brand-black/60 leading-relaxed">
                We specialize in preparation routes for Blacktown Service NSW and Mount Druitt RMS testing centres.
              </p>
            </div>
          </motion.div>

          {/* Interactive Map Replacement - Premium Blue Circular Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
            className="lg:col-span-2 bg-white rounded-[40px] p-6 shadow-2xl border border-black/5 overflow-hidden h-[640px] flex flex-col justify-center items-center relative"
          >
            <div className="absolute top-4 left-6 flex items-center gap-2 text-xs font-bold text-brand-black z-10">
              <Navigation className="w-4 h-4 text-brand-red" />
              Service Area Visualization
            </div>
            <div className="absolute top-4 right-6 text-xs text-brand-black/50 z-10">Rooty Hill, NSW 2766</div>
            
            {/* The Visualization Canvas */}
            <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center mt-6">
              
              {/* Outer Glow / Layer */}
              <div className="absolute inset-0 bg-blue-50 rounded-full animate-[pulse-glow_4s_ease-in-out_infinite] opacity-60"></div>
              
              {/* Middle Layer */}
              <div className="absolute inset-8 bg-blue-100/80 rounded-full border border-blue-200/50 backdrop-blur-sm shadow-[0_0_40px_rgba(59,130,246,0.15)] flex items-center justify-center">
                {/* Center Core */}
                <div className="absolute inset-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-[0_10px_30px_rgba(59,130,246,0.4)] border-4 border-white/20 flex flex-col items-center justify-center text-white z-20">
                  <MapPin className="w-8 h-8 mb-2 drop-shadow-md" />
                  <span className="font-display font-bold text-lg tracking-wide drop-shadow-md text-center leading-tight">Wally's<br/>Driving School</span>
                  <span className="text-[10px] font-medium tracking-widest uppercase mt-1 opacity-90">Rooty Hill Base</span>
                </div>
              </div>

              {/* Orbiting Suburb Nodes */}
              {PRIMARY_SUBURBS.map((suburb, i) => {
                const total = PRIMARY_SUBURBS.length;
                const angle = (i * (360 / total)) * (Math.PI / 180);
                // Adjust radius based on screen size implicitly by using % based positioning or fixed with transform
                const radiusX = 42; // Percentage from center
                const radiusY = 42;
                
                const left = 50 + radiusX * Math.cos(angle);
                const top = 50 + radiusY * Math.sin(angle);
                
                return (
                  <motion.div
                    key={suburb}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + (i * 0.05), type: "spring" }}
                    className="absolute z-30 flex flex-col items-center justify-center"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] border-2 border-white mb-1.5" />
                    <span className="text-[11px] font-bold text-slate-700 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-slate-100 whitespace-nowrap">
                      {suburb}
                    </span>
                  </motion.div>
                );
              })}
              
              {/* Decorative concentric rings */}
              <div className="absolute inset-0 border border-blue-200/40 rounded-full scale-110 pointer-events-none"></div>
              <div className="absolute inset-0 border border-blue-200/20 rounded-full scale-125 pointer-events-none border-dashed"></div>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
