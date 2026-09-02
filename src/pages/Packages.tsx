import { motion } from 'framer-motion';
import { PACKAGES } from '../lib/content';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function Packages() {
  const [filter, setFilter] = useState('All');
  const categories = ['All', 'Lessons', 'Hour Packs', 'Test Packages'];

  const filteredPackages = PACKAGES.filter(pkg => filter === 'All' || pkg.category === filter);

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
            <span className="text-brand-red">Packages</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold">PACKAGES</h1>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-6 py-2 rounded-full font-bold transition-all",
                filter === cat 
                  ? "bg-brand-black text-white shadow-lg" 
                  : "bg-white text-brand-black hover:bg-black/5 border border-black/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[32px] p-8 border border-black/5 hover:shadow-xl hover:-translate-y-2 transition-all group flex flex-col h-full"
            >
              <div className="bg-brand-red text-white inline-block px-4 py-2 rounded-full font-bold text-sm mb-6 self-start">
                {pkg.label}
              </div>
              <h3 className="text-2xl font-display font-bold mb-2">{pkg.title}</h3>
              <div className="text-4xl font-display font-bold text-brand-red mb-6">${pkg.price}</div>
              <p className="text-brand-black/70 mb-8 flex-grow">{pkg.description || 'Professional driving instruction.'}</p>
              
              <Link to="/book-now" className="w-12 h-12 rounded-full bg-brand-offwhite text-brand-black flex items-center justify-center group-hover:bg-brand-black group-hover:text-white group-hover:scale-110 transition-all self-start border border-black/10">
                <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
