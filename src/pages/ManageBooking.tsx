import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff, Calendar, Clock, MapPin, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ManageBooking() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both your email and password/booking reference.');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsLoggedIn(true);
    }, 800);
  };

  return (
    <div className="pt-32 pb-24 bg-brand-black min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background accents */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <div className="absolute -left-40 top-20 w-96 h-96 border-[40px] border-brand-red rounded-full mix-blend-screen" />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] bg-brand-red rounded-full mix-blend-screen filter blur-[120px]" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-brand-red/30 rounded-full"
            style={{ left: `${10 + i * 12}%`, top: `${15 + i * 9}%` }}
            animate={{ y: [-20, 20, -20], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div 
              key="login-card"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[36px] p-8 md:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 shimmer pointer-events-none" />

              <div className="text-center mb-10 relative z-10">
                <div className="bg-white/95 px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(227,34,42,0.4)] mx-auto mb-6 flex items-center justify-center w-fit">
                  <img src="/assets/logo.png" alt="Wally's Driving School" className="h-11 w-auto object-contain max-w-[170px]" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2 tracking-tight">Manage Booking</h1>
                <p className="text-white/60 text-sm sm:text-base">Sign in to view, reschedule or check your lesson status.</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">Email or Booking Reference</label>
                  <input 
                    type="text" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300"
                    placeholder="student@example.com or REF-12345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">Password / Phone Number</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-brand-red text-white font-bold rounded-2xl py-4 hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_25px_rgba(227,34,42,0.4)] hover:shadow-[0_0_35px_rgba(255,255,255,0.3)] mt-2 flex items-center justify-center gap-2 text-base"
                >
                  {isLoading ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <span>Access My Bookings</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>

              <div className="mt-8 text-center relative z-10">
                <a href="#" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
                  Need help locating your reference? <span className="text-brand-red underline decoration-brand-red/30 underline-offset-4">Call 0406 693 301</span>
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="booking-details"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[36px] p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-white"
            >
              <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-brand-red font-bold">Booking Portal</span>
                  <h2 className="text-2xl font-bold font-display">Active Bookings</h2>
                </div>
                <button 
                  onClick={() => setIsLoggedIn(false)}
                  className="text-xs font-semibold text-white/60 hover:text-white bg-white/10 px-3.5 py-1.5 rounded-full transition-colors"
                >
                  Sign Out
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-brand-red/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                    </span>
                    <span className="text-xs text-white/50">Ref: #WD-8492</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">2 Hours Practical Driving Lesson</h3>
                  <div className="space-y-1.5 text-xs text-white/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-red" />
                      <span>Saturday, 28 October 2026</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-red" />
                      <span>10:00 AM - 12:00 PM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-red" />
                      <span>Pick-up: Rooty Hill Station NSW 2766</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link 
                  to="/book-now" 
                  className="flex-1 bg-brand-red py-3.5 rounded-xl font-bold text-center text-sm shadow-[0_0_20px_rgba(227,34,42,0.4)] hover:bg-white hover:text-brand-black transition-all"
                >
                  Book Another Lesson
                </Link>
                <a 
                  href="tel:0406693301" 
                  className="px-5 py-3.5 rounded-xl font-bold bg-white/10 border border-white/15 hover:bg-white/20 text-center text-sm transition-all"
                >
                  Reschedule
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="mt-8 text-center text-white/40 text-sm">
          <Link to="/" className="hover:text-white transition-colors inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Wally's Driving School
          </Link>
        </div>
      </div>
    </div>
  );
}
