import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, CheckCircle2, Phone, Car } from 'lucide-react';

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
                Free door-to-door pick up and drop off in all serviced postcodes. Don't see your suburb? Call us to check instructor availability in your area.
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
                href="tel:0406693301" 
                className="w-full bg-brand-red py-3.5 rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-2 hover:bg-white hover:text-brand-black transition-all shadow-[0_0_20px_rgba(227,34,42,0.4)]"
              >
                <Phone className="w-4 h-4" />
                <span>Call to Inquire: 0406 693 301</span>
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

          {/* Interactive Map */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
            className="lg:col-span-2 bg-white rounded-[40px] p-4 sm:p-6 shadow-2xl border border-black/5 overflow-hidden h-[640px] flex flex-col"
          >
            <div className="flex items-center justify-between px-2 pb-4 mb-2 border-b border-black/5">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-black">
                <Navigation className="w-4 h-4 text-brand-red" />
                Interactive Route & Location Map
              </div>
              <span className="text-xs text-brand-black/50">Rooty Hill, NSW 2766</span>
            </div>
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3316.156452094375!2d150.832614!3d-33.782457799999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x61e217baec8826d1%3A0xa738bb52089c7f1e!2sWallys%20Driving%20School!5e0!3m2!1sen!2s!4v1788371550806!5m2!1sen!2s" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '28px', flex: 1 }} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
