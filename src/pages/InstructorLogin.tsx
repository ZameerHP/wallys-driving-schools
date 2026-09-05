import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  ChevronDown, 
  User, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Shield, 
  ArrowLeft, 
  LogOut, 
  Lock, 
  AlertCircle, 
  MapPin, 
  Phone, 
  Layers, 
  FileText 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { 
  checkOwnerAuth, 
  isOwnerLoggedIn, 
  setOwnerLoggedIn, 
  logoutOwner, 
  getStoredBookings,
  updateBookingStatus,
  BookingItem
} from '../lib/bookings';

function InstructorLoginGate({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const isValid = checkOwnerAuth(email, password);

      if (isValid) {
        setOwnerLoggedIn(true);
        onLogin();
      } else {
        setError('Access Denied: Only the owner (Wally) is authorized to access the instructor portal. Please check your username and password.');
      }
    }, 600);
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
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-brand-red/30 rounded-full"
            style={{ left: `${15 + i * 15}%`, top: `${20 + i * 10}%` }}
            animate={{ y: [-20, 20, -20], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[36px] p-8 md:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 shimmer pointer-events-none" />

          <div className="text-center mb-8 relative z-10">
            <div className="bg-white/95 px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(227,34,42,0.4)] mx-auto mb-5 flex items-center justify-center w-fit">
              <img src="/assets/logo.png" alt="Wally's Driving School" className="h-11 w-auto object-contain max-w-[170px]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/20 border border-brand-red/30 text-brand-red text-xs font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3" />
              <span>Owner Access Only</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 tracking-tight">
              Instructor Portal
            </h1>
            <p className="text-white/60 text-xs sm:text-sm">
              Restricted to Wally (Owner). Access instructor driving schedules, student roster, and daily timetable.
            </p>
          </div>

          <form className="flex flex-col gap-4 relative z-10" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">Owner Username / Email</label>
              <input 
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300 text-sm"
                placeholder="Enter owner email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300 text-sm"
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

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              type="submit" 
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-brand-red text-white font-bold rounded-2xl py-3.5 hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_25px_rgba(227,34,42,0.4)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              {isLoading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                />
              ) : (
                'Sign In to Instructor Schedule'
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10 flex flex-col gap-2">
            <span className="text-xs text-white/40">Only the owner has authorized credentials to access instructor portals.</span>
            <Link to="/" className="text-xs font-medium text-brand-red hover:underline">
              ← Return to Home Page
            </Link>
          </div>
        </motion.div>
        
        <div className="mt-8 text-center text-white/40 text-sm">
          <Link to="/" className="hover:text-white transition-colors inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Wally's Driving School
          </Link>
        </div>
      </div>
    </div>
  );
}

function InstructorDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);
  const [bookingsList, setBookingsList] = useState<BookingItem[]>([]);

  useEffect(() => {
    setBookingsList(getStoredBookings());
  }, []);

  const handleUpdateStatus = (id: string, newStatus: BookingItem['status']) => {
    const updated = updateBookingStatus(id, newStatus);
    setBookingsList(updated);
    setActiveStatusDropdown(null);
  };

  return (
    <div className="pt-24 bg-brand-offwhite min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full md:w-64 bg-brand-black text-white shrink-0 min-h-screen p-6 sticky top-0 md:h-screen overflow-y-auto z-20 border-r border-white/10 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-2xl bg-brand-red flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(227,34,42,0.5)]">
              <span className="text-white font-display font-bold text-sm">W</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base leading-none tracking-tight">Wally (Owner)</span>
              <span className="text-[10px] text-brand-red font-semibold uppercase mt-0.5">Verified Instructor</span>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-4 py-3 bg-brand-red rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(227,34,42,0.3)]">
              <Calendar className="w-4 h-4" />
              Instructor Schedule
            </div>
            
            <Link 
              to="/manage-booking"
              className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl font-bold text-sm transition-all"
            >
              <FileText className="w-4 h-4 text-brand-red" />
              <span>Manage All Bookings</span>
            </Link>

            <Link
              to="/book-now"
              className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-medium text-sm transition-all"
            >
              <Layers className="w-4 h-4" />
              Book New Lesson
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl font-medium text-sm transition-all duration-300 w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-5xl"
        >
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-red">Active Driving Roster</span>
              <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1 text-brand-black">Wally's Instructor Schedule</h1>
              <p className="text-brand-black/60 text-xs sm:text-sm">Manage scheduled driving lessons, test bookings and client attendances across Western Sydney.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link 
                to="/manage-booking"
                className="bg-brand-red text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#c41a21] shadow-md shadow-brand-red/20 transition-all"
              >
                Go to Bookings Center →
              </Link>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Dual-Control Fleet Active
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {bookingsList.map((apt) => (
              <motion.div 
                key={apt.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 relative hover:border-brand-red/30 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-brand-black/50 bg-brand-offwhite px-2 py-0.5 rounded">
                        #{apt.ref}
                      </span>
                      <div className="flex items-center gap-1.5 font-bold text-brand-red text-xs sm:text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{apt.date} · {apt.time}</span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-brand-black">{apt.packageTitle}</h3>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-black/70">
                      <div className="flex items-center gap-1.5 font-semibold text-brand-black">
                        <User className="w-3.5 h-3.5 text-brand-red" />
                        <span>{apt.studentName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{apt.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-red" />
                        <span>{apt.suburb}, NSW</span>
                      </div>
                    </div>

                    {apt.notes && (
                      <div className="text-xs text-brand-black/60 bg-brand-offwhite p-2 rounded-lg mt-1 border border-black/5">
                        <strong>Student Note:</strong> {apt.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <button 
                        onClick={() => setActiveStatusDropdown(activeStatusDropdown === apt.id ? null : apt.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 cursor-pointer",
                          apt.status === 'Confirmed' ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                          apt.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" :
                          apt.status === 'Completed' ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" :
                          "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        )}
                      >
                        {apt.status === 'Confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{apt.status}</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                      </button>
                      
                      <AnimatePresence>
                        {activeStatusDropdown === apt.id && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden z-30"
                          >
                            <button onClick={() => handleUpdateStatus(apt.id, 'Confirmed')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-emerald-700 transition-colors">Confirm</button>
                            <button onClick={() => handleUpdateStatus(apt.id, 'Pending')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-amber-700 transition-colors">Pending</button>
                            <button onClick={() => handleUpdateStatus(apt.id, 'Completed')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-blue-700 transition-colors">Completed</button>
                            <button onClick={() => handleUpdateStatus(apt.id, 'Cancelled')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-red-600 transition-colors">Cancel</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <a 
                      href={`tel:${apt.phone.replace(/\s+/g, '')}`} 
                      className="p-2 bg-brand-offwhite hover:bg-emerald-50 text-emerald-600 rounded-lg border border-black/5 transition-all"
                      title="Call Student"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function InstructorLogin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (isOwnerLoggedIn()) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    logoutOwner();
    setIsLoggedIn(false);
  };

  return (
    <AnimatePresence mode="wait">
      {isLoggedIn ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
        >
          <InstructorDashboard onLogout={handleLogout} />
        </motion.div>
      ) : (
        <motion.div
          key="login"
          exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          transition={{ duration: 0.4 }}
        >
          <InstructorLoginGate onLogin={() => setIsLoggedIn(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
