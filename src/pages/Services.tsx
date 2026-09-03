import { motion } from 'framer-motion';
import { ADDITIONAL_SERVICES } from '../lib/content';
import { Car, ShieldCheck, FileText, ArrowRight, Award, Compass, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const ICON_MAP = {
  Car: Car,
  ShieldCheck: ShieldCheck,
  FileText: FileText,
};

export function Services() {
  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-red uppercase tracking-widest bg-brand-red/10 px-4 py-1.5 rounded-full mb-4">
            Specialized Training
          </div>
          <h1 className="text-4xl sm:text-6xl font-display font-bold text-brand-black mb-6 tracking-tight">
            Our Premium Services
          </h1>
          <p className="text-base sm:text-lg text-brand-black/70 leading-relaxed">
            Beyond everyday learner driving sessions, Wally's provides comprehensive road safety accreditation, instructor career pathways, and overseas licence conversion preparation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {ADDITIONAL_SERVICES.map((service, i) => {
            const IconComponent = ICON_MAP[service.icon as keyof typeof ICON_MAP] || Car;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm hover:shadow-2xl transition-all duration-500 border border-brand-black/5 hover:border-brand-red/30 flex flex-col group relative overflow-hidden"
              >
                <div className="w-16 h-16 bg-brand-red/10 group-hover:bg-brand-red group-hover:text-white text-brand-red rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 shadow-inner">
                  <IconComponent className="w-8 h-8 transition-transform group-hover:scale-110" />
                </div>
                <h3 className="text-2xl font-bold font-display text-brand-black mb-4 group-hover:text-brand-red transition-colors">
                  {service.title}
                </h3>
                <p className="text-brand-black/70 text-sm leading-relaxed mb-8 flex-grow">
                  {service.description}
                </p>

                <div className="pt-6 border-t border-black/5">
                  <Link 
                    to="/book-now" 
                    className="inline-flex items-center gap-2 text-sm font-bold text-brand-black group-hover:text-brand-red transition-colors"
                  >
                    <span>Inquire or Book Service</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-brand-black text-white rounded-[40px] p-10 md:p-14 shadow-2xl relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Accredited Instructors</h4>
                <p className="text-white/60 text-xs leading-relaxed">All trainers carry full NSW Transport RMS certifications with background safety clearance.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">RMS Test Route Mastery</h4>
                <p className="text-white/60 text-xs leading-relaxed">Practice mock examinations directly on active RMS testing roads and difficult intersections.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">Dual-Pedal Modern Fleet</h4>
                <p className="text-white/60 text-xs leading-relaxed">Ultra-safe modern automatic compact cars with dual instructor control pedals.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
