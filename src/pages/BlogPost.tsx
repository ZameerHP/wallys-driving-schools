import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowLeft, Clock, MessageSquare, Send } from 'lucide-react';
import { BLOG_POSTS } from '../lib/content';
import { useState } from 'react';

export function BlogPost() {
  const { id } = useParams();
  const post = BLOG_POSTS.find((p) => p.id === id);

  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  if (!post) {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-display font-bold mb-4">Post Not Found</h2>
        <Link to="/blog" className="text-brand-red font-bold flex items-center gap-2 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentName.trim() && commentText.trim()) {
      setComments([
        ...comments,
        {
          id: Date.now(),
          name: commentName,
          text: commentText,
          date: new Date().toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          })
        }
      ]);
      setCommentName('');
      setCommentEmail('');
      setCommentText('');
    }
  };

  return (
    <div className="pt-32 pb-24 bg-brand-offwhite min-h-screen relative">
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[120px] pointer-events-none" />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-brand-black/50 mb-6 uppercase tracking-widest hover:text-brand-red transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Articles
          </Link>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-brand-black/60 mb-6">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-black/5">
              <span className="text-brand-red">Category:</span> Blog
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-black/5">
              <Calendar className="w-4 h-4 text-brand-red" /> {post.date}
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-black/5">
              <User className="w-4 h-4 text-brand-red" /> {post.author} ({post.role})
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-black/5">
              <Clock className="w-4 h-4 text-brand-red" /> 4 min read
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-brand-black tracking-tight mb-10 leading-tight">
            {post.title}
          </h1>

          <div className="relative h-[40vh] md:h-[60vh] rounded-[32px] overflow-hidden shadow-2xl mb-12">
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-black/5 mb-16"
        >
          <div 
            className="text-brand-black/80 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: post.content || '' }}
          />
        </motion.div>

        {/* Comment Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-black/5"
        >
          <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="w-6 h-6 text-brand-red" />
            <h3 className="text-2xl font-display font-bold">Leave a Comment</h3>
          </div>

          {comments.length > 0 && (
            <div className="mb-10 space-y-6">
              <h4 className="text-lg font-bold text-brand-black/80 mb-4">{comments.length} Comments</h4>
              {comments.map((c) => (
                <div key={c.id} className="bg-brand-offwhite p-6 rounded-2xl border border-black/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-brand-black">{c.name}</span>
                    <span className="text-xs text-brand-black/50 font-semibold">{c.date}</span>
                  </div>
                  <p className="text-brand-black/70 text-sm leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleCommentSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-brand-black/70 mb-2">Your Name</label>
                <input 
                  type="text" 
                  required
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/20 transition-all font-medium"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-black/70 mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={commentEmail}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/20 transition-all font-medium"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-black/70 mb-2">Write comment</label>
              <textarea 
                required
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/20 transition-all font-medium resize-none"
                placeholder="Share your thoughts..."
              ></textarea>
            </div>
            <button 
              type="submit"
              className="bg-brand-red text-white font-bold py-4 px-8 rounded-xl hover:bg-brand-black transition-colors duration-300 flex items-center justify-center gap-2 w-full sm:w-auto shadow-[0_4px_14px_0_rgba(227,34,42,0.39)] hover:shadow-[0_6px_20px_rgba(11,11,12,0.23)]"
            >
              <span>Submit Comment</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </article>
    </div>
  );
}
