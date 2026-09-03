import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ChevronDown, User, CheckCircle2, Eye, EyeOff, Shield, ArrowLeft, KeyRound, LogOut } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

const APPOINTMENTS = [
  {
    date: 'Today, 24 Oct',
    items: [
      { id: 1, time: '09:00 AM', type: '1 Hour Driving Lesson', client: 'Sarah Jenkins', status: 'Approved' },
      { id: 2, time: '11:30 AM', type: 'Driving Test Package', client: 'Michael Chen', status: 'Pending' }
    ]
  },
  {
    date: 'Tomorrow, 25 Oct',
    items: [
      { id: 3, time: '10:00 AM', type: '2 Hours Lesson', client: 'Emma Wilson', status: 'Approved' }
    ]
  }
];

function InstructorLoginGate({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fillDemo = () => {
    setEmail('instructor@wallys.com');
    setPassword('wallys2024');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    setTimeout(() => {
      const isEmailValid = cleanEmail === 'instructor@wallys.com' || cleanEmail === 'instructor' || cleanEmail === 'admin' || cleanEmail === 'wally';
      const isPasswordValid = cleanPassword === 'wallys2024' || cleanPassword === 'admin' || cleanPassword === '123456';

      if (isEmailValid && isPasswordValid) {
        onLogin();
      } else {
        setError('Invalid credentials. Use demo: instructor@wallys.com / wallys2024');
        setIsLoading(false);
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
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
              className="w-16 h-16 bg-brand-red rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(227,34,42,0.5)]"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2 tracking-tight">
              Instructor Portal
            </h1>
            <p className="text-white/60 text-sm sm:text-base">
              Authorized personnel only. Access your driving lessons & schedule.
            </p>
          </div>

          {/* Quick Demo Fill Helper */}
          <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <KeyRound className="w-4 h-4 text-brand-red shrink-0" />
              <span>Demo: <strong className="text-white">instructor@wallys.com</strong> / <strong className="text-white">wallys2024</strong></span>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="text-xs bg-brand-red/80 hover:bg-brand-red text-white px-2.5 py-1 rounded-lg font-bold transition-all"
            >
              Auto-fill
            </button>
          </div>

          <form className="flex flex-col gap-5 relative z-10" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">Instructor Email / Username</label>
              <input 
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300"
                placeholder="instructor@wallys.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">Password</label>
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

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              type="submit" 
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-brand-red text-white font-bold rounded-2xl py-4 hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_25px_rgba(227,34,42,0.4)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            >
              {isLoading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                />
              ) : (
                'Sign In to Dashboard'
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <a href="tel:0406693301" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Need access or lost password? <span className="text-brand-red underline decoration-brand-red/30 underline-offset-4">Contact Admin</span>
            </a>
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
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<number | null>(null);

  return (
    <div className="pt-24 bg-brand-offwhite min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full md:w-64 bg-brand-black text-white shrink-0 min-h-screen p-6 sticky top-0 md:h-screen overflow-y-auto z-20 border-r border-white/10"
      >
        <div className="flex items-center gap-3 mb-12">
          <div className="w-9 h-9 rounded-2xl bg-brand-red flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(227,34,42,0.5)]">
            <span className="text-white font-display font-bold text-sm">W</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base leading-none tracking-tight">Instructor Panel</span>
            <span className="text-[10px] text-brand-red font-semibold uppercase mt-0.5">Verified Session</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-brand-red rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(227,34,42,0.3)]">
            <Calendar className="w-4 h-4" />
            Appointments
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-medium text-sm transition-all duration-300">
            <Clock className="w-4 h-4" />
            Schedule & Events
          </a>
          <div className="my-4 h-px bg-white/10" />
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl font-medium text-sm transition-all duration-300 mt-auto text-left w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-4xl"
        >
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-red">Active Roster</span>
              <h1 className="text-3xl font-display font-bold mb-1">Instructor Lessons</h1>
              <p className="text-brand-black/60 text-sm">Manage scheduled driving lessons, test bookings and client attendances.</p>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-700 px-3.5 py-2 rounded-xl text-xs font-bold w-fit">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Online & Receiving Bookings
            </div>
          </div>

          <div className="space-y-12">
            {APPOINTMENTS.map((group, i) => (
              <div key={i} className="relative">
                <div className="sticky top-24 z-10 bg-brand-offwhite/90 backdrop-blur-md py-4 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <motion.div 
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2.5 h-2.5 rounded-full bg-brand-red" 
                    />
                    {group.date}
                  </h2>
                </div>
                
                <div className="space-y-4 pl-4 border-l-2 border-black/10 relative">
                  {group.items.map((apt, j) => (
                    <motion.div 
                      key={apt.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + j * 0.1 }}
                      className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 relative hover:border-brand-red/30 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="absolute top-1/2 -left-[21px] w-4 h-4 rounded-full bg-white border-2 border-brand-red -translate-y-1/2" />
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 font-bold text-brand-red text-sm mb-1">
                            <Clock className="w-4 h-4" />
                            {apt.time}
                          </div>
                          <h3 className="text-lg font-bold mb-1">{apt.type}</h3>
                          <div className="flex items-center gap-2 text-sm text-brand-black/60">
                            <User className="w-4 h-4" />
                            {apt.client}
                          </div>
                        </div>

                        <div className="relative">
                          <button 
                            onClick={() => setActiveStatusDropdown(activeStatusDropdown === apt.id ? null : apt.id)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300",
                              apt.status === 'Approved' ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                            )}
                          >
                            {apt.status === 'Approved' && <CheckCircle2 className="w-4 h-4" />}
                            {apt.status}
                            <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                          </button>
                          
                          <AnimatePresence>
                            {activeStatusDropdown === apt.id && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-black/5 overflow-hidden z-20"
                              >
                                <button onClick={() => setActiveStatusDropdown(null)} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-black/5 transition-colors">Approved</button>
                                <button onClick={() => setActiveStatusDropdown(null)} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-black/5 transition-colors">Pending</button>
                                <button onClick={() => setActiveStatusDropdown(null)} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-black/5 text-red-600 transition-colors">Cancel</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function InstructorLogin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
          <InstructorDashboard onLogout={() => setIsLoggedIn(false)} />
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
