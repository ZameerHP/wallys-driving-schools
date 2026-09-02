import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '../lib/content';
import { Calendar, User, ArrowRight } from 'lucide-react';

export function Blog() {
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
            <span className="text-brand-red">Blog</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold">BLOG</h1>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-2 transition-all group flex flex-col"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                  <Calendar className="w-4 h-4" />
                  {post.date}
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-2 text-brand-black/50 text-sm font-medium mb-4">
                  <User className="w-4 h-4" />
                  <span>{post.author}</span>
                  <span className="w-1 h-1 rounded-full bg-brand-black/20" />
                  <span>{post.role}</span>
                </div>
                
                <h3 className="text-2xl font-display font-bold mb-6 group-hover:text-brand-red transition-colors flex-grow">
                  {post.title}
                </h3>
                
                <Link to={`/blog/${post.id}`} className="inline-flex items-center gap-2 font-bold hover:text-brand-red transition-colors w-fit">
                  Read More
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
