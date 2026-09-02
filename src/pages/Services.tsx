import { motion } from 'framer-motion';
import { ADDITIONAL_SERVICES } from '../lib/content';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';

export function Services() {
  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-black mb-6">Our Services</h1>
          <p className="text-lg text-brand-gray">
            Beyond standard driving lessons, we offer specialized courses and training designed to cater to all aspects of road safety and professional driving instruction.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ADDITIONAL_SERVICES.map((service, i) => {
            const Icon = Icons[service.icon as keyof typeof Icons] as React.ElementType || Icons.Car;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg shadow-brand-black/5 hover:shadow-xl transition-all border border-brand-black/5 flex flex-col"
              >
                <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mb-6 text-brand-red">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-brand-black mb-4">{service.title}</h3>
                <p className="text-brand-gray leading-relaxed mb-8 flex-grow">{service.description}</p>
                <Link to="/book-now" className="text-brand-red font-bold hover:text-brand-black transition-colors flex items-center gap-2">
                  Learn More <Icons.ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
