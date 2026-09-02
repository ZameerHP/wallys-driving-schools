import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export function CoverageArea() {
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
            <span className="text-brand-red">Coverage Area</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold">COVERAGE AREA</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <h2 className="text-3xl font-display font-bold mb-6">Serving Western Sydney</h2>
            <p className="text-brand-black/70 mb-8 text-lg">
              Wally's Driving School provides comprehensive driving lessons across Western Sydney. We offer convenient pick-up and drop-off services at your home, school, or workplace within our coverage area.
            </p>
            <div className="bg-brand-black text-white p-8 rounded-[32px] shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <MapPin className="text-brand-red" />
                Primary Locations
              </h3>
              <ul className="space-y-4 text-white/80 font-medium">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-brand-red rounded-full" /> Rooty Hill</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-brand-red rounded-full" /> Mount Druitt</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-brand-red rounded-full" /> St Marys</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-brand-red rounded-full" /> Minchinbury</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-brand-red rounded-full" /> Western Sydney Parklands</li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white rounded-[40px] p-4 shadow-xl border border-black/5 overflow-hidden h-[600px]"
          >
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3316.156452094375!2d150.832614!3d-33.782457799999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x61e217baec8826d1%3A0xa738bb52089c7f1e!2sWallys%20Driving%20School!5e0!3m2!1sen!2s!4v1788371550806!5m2!1sen!2s" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '32px' }} 
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
