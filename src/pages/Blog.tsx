import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '../lib/content';
import { Calendar, User, ArrowRight, BookOpen, Clock } from 'lucide-react';

export function Blog() {
  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen relative overflow-hidden">
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[120px] pointer-events-none" />

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
            <span className="text-brand-red font-semibold">Tips & Articles</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-brand-black tracking-tight mb-4">DRIVING BLOG</h1>
          <p className="text-base sm:text-lg text-brand-black/70 max-w-2xl">
            Practical driving tips, NSW road rule insights, and examiner expectations to help you prepare and pass your test on the first attempt.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-[36px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-black/5 hover:border-brand-red/30 flex flex-col group"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 bg-brand-red text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(227,34,42,0.4)]">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </div>
                <div className="absolute bottom-4 left-4 text-white text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-red" />
                  <span>4 min read</span>
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-2 text-brand-black/50 text-xs font-semibold mb-3">
                  <User className="w-3.5 h-3.5 text-brand-red" />
                  <span>By Waleed Khurram (Senior Trainer)</span>
                </div>
                
                <h3 className="text-xl font-display font-bold mb-4 text-brand-black group-hover:text-brand-red transition-colors leading-snug flex-grow">
                  {post.title}
                </h3>

                <p className="text-xs sm:text-sm text-brand-black/60 mb-6 line-clamp-2">
                  Learn practical advice from professional driving instructors to accelerate your progress and gain complete road confidence.
                </p>
                
                <div className="pt-4 border-t border-black/5">
                  <Link to={`/blog/${post.id}`} className="inline-flex items-center gap-2 font-bold text-sm text-brand-black group-hover:text-brand-red transition-colors">
                    <span>Read Article</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
