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
  ArrowLeft, 
  LogOut, 
  Lock, 
  AlertCircle, 
  MapPin, 
  Smartphone, 
  FileText,
  MessageCircle,
  Search,
  Sparkles,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { 
  checkOwnerAuth, 
  isOwnerLoggedIn, 
  setOwnerLoggedIn, 
  logoutOwner, 
  updateBookingStatus, 
  BookingItem,
  fetchBookingsFromDb,
  updateBookingInDb,
  deleteBookingFromDb,
  OWNER_CREDENTIALS
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
    }, 400);
  };

  const handleAutofill = () => {
    setEmail(OWNER_CREDENTIALS.username);
    setPassword(OWNER_CREDENTIALS.password);
  };

  return (
    <div className="pt-32 pb-24 bg-brand-black min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background accents */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <div className="absolute -left-40 top-20 w-96 h-96 border-[40px] border-brand-red rounded-full mix-blend-screen" />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] bg-brand-red rounded-full mix-blend-screen filter blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[36px] p-8 md:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
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
                placeholder="Wally@wallysdrivingschool.com.au"
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
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

          {/* Quick Autofill */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleAutofill}
              className="inline-flex items-center gap-1.5 text-xs text-brand-red hover:underline cursor-pointer font-medium bg-brand-red/10 px-3.5 py-1.5 rounded-full border border-brand-red/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autofill Wally's Credentials</span>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10 flex flex-col gap-2">
            <span className="text-xs text-white/40">Credential: Wally@wallysdrivingschool.com.au</span>
            <Link to="/manage-booking" className="text-xs font-medium text-brand-red hover:underline">
              ← Customer Booking Lookup & Reschedule
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
  const [searchFilter, setSearchFilter] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  
  // Reschedule state
  const [reschedulingItem, setReschedulingItem] = useState<BookingItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchBookingsFromDb();
      setBookingsList(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (item: BookingItem, newStatus: BookingItem['status']) => {
    const updated = updateBookingStatus(item.id, newStatus);
    setBookingsList(updated);
    setActiveStatusDropdown(null);
    await updateBookingInDb(item.id, { status: newStatus }, item.ref);
  };

  const handleSaveReschedule = async () => {
    if (!reschedulingItem || !rescheduleDate || !rescheduleTime) return;
    setIsSavingReschedule(true);

    const updatedFields: Partial<BookingItem> = {
      date: rescheduleDate,
      time: rescheduleTime,
      isRescheduled: true,
      notes: reschedulingItem.notes 
        ? `${reschedulingItem.notes} [RESCHEDULED to ${rescheduleDate} ${rescheduleTime}]`
        : `[RESCHEDULED to ${rescheduleDate} ${rescheduleTime}]`
    };

    const updated = bookingsList.map(b => 
      b.id === reschedulingItem.id || b.ref === reschedulingItem.ref ? { ...b, ...updatedFields } : b
    );
    setBookingsList(updated);
    
    await updateBookingInDb(reschedulingItem.id, updatedFields, reschedulingItem.ref);
    setIsSavingReschedule(false);
    setReschedulingItem(null);
  };

  const handleDelete = async (item: BookingItem) => {
    // 1. Immediately remove from state for instant UI update
    setBookingsList(prev => prev.filter(b => b.id !== item.id && b.ref !== item.ref));

    // 2. Show instant visual confirmation
    setActionFeedback(`Lesson #${item.ref} for ${item.studentName} removed from UI and database.`);
    setTimeout(() => setActionFeedback(null), 4000);

    // 3. Delete from Backend API (Cloud SQL), Supabase, and local storage
    try {
      await deleteBookingFromDb(item.id, item.ref);
    } catch (err) {
      console.error('Failed to delete booking from database:', err);
    }
  };

  const filtered = bookingsList.filter(b => {
    const matchesStatus = statusTab === 'All' || b.status === statusTab;
    const q = searchFilter.toLowerCase();
    const matchesSearch = 
      b.studentName.toLowerCase().includes(q) ||
      b.suburb.toLowerCase().includes(q) ||
      b.ref.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      (b.pickupAddress && b.pickupAddress.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

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
              <span className="text-[10px] text-brand-red font-semibold uppercase mt-0.5">Lead Driving Instructor</span>
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
              <span>Customer Lookup</span>
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10 space-y-2">
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
              <p className="text-brand-black/60 text-xs sm:text-sm">
                Real-time student appointments, pickup addresses, dates, and times across Western Sydney.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={isRefreshing}
                className="bg-white hover:bg-black/5 text-black border border-black/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Refresh Live Schedule"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-brand-red", isRefreshing && "animate-spin")} />
                <span>Refresh Schedule</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          <AnimatePresence>
            {actionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionFeedback}</span>
                </div>
                <button 
                  onClick={() => setActionFeedback(null)} 
                  className="text-emerald-600 hover:text-emerald-900 ml-3 p-1 rounded-lg hover:bg-emerald-100/60"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search student, suburb, ref, address..."
                className="w-full bg-brand-offwhite border border-black/10 rounded-xl pl-9 pr-3 py-2 text-xs text-brand-black focus:outline-none focus:border-brand-red"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {(['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                    statusTab === tab
                      ? "bg-brand-red text-white shadow-sm"
                      : "bg-black/5 text-black/60 hover:bg-black/10"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule List */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-black/5 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-red-50 text-brand-red flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-brand-black mb-1">
                  No Bookings Found
                </h3>
                <p className="text-xs text-black/60 max-w-md mx-auto mb-6">
                  {bookingsList.length === 0
                    ? "Currently no driving appointments are scheduled. When students book through the website or reschedule, lessons will appear here automatically."
                    : "No bookings match your current search or status filter."}
                </p>
                <button
                  onClick={loadData}
                  className="bg-brand-red text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#c41a21] shadow-md shadow-brand-red/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                  <span>Refresh Schedule</span>
                </button>
              </div>
            ) : (
              filtered.map((apt) => (
                <motion.div 
                  key={apt.id || apt.ref}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5 relative hover:border-brand-red/30 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      
                      {/* Reference, Rescheduled Pill, & Date/Time Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-brand-black bg-brand-offwhite px-2.5 py-1 rounded-lg border border-black/10">
                          #{apt.ref}
                        </span>

                        <div className="flex items-center gap-1.5 font-bold text-brand-red text-xs sm:text-sm bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{apt.date}</span>
                          <span className="text-black/30">·</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{apt.time}</span>
                        </div>

                        {apt.isRescheduled && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            RESCHEDULED TIME
                          </span>
                        )}
                      </div>

                      {/* Package Title & Price */}
                      <div className="flex items-baseline gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-brand-black">
                          {apt.packageTitle}
                        </h3>
                        <span className="text-xs font-bold text-brand-red">
                          ${apt.packagePrice.toFixed(2)} AUD
                        </span>
                      </div>
                      
                      {/* Student Details */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-brand-black/70">
                        <div className="flex items-center gap-1.5 font-bold text-brand-black">
                          <User className="w-3.5 h-3.5 text-brand-red" />
                          <span>{apt.studentName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Smartphone className="w-3.5 h-3.5 text-black/40" />
                          <span>{apt.phone}</span>
                        </div>
                        {apt.email && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-black/40">Email:</span>
                            <span>{apt.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Exact Pickup Address Block */}
                      <div className="flex items-start gap-2.5 bg-brand-offwhite border border-black/10 rounded-2xl p-3.5 text-xs text-brand-black">
                        <MapPin className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-brand-red uppercase text-[10px] tracking-wider block mb-0.5">
                            Exact Pickup Address & Instructions
                          </span>
                          <span className="font-semibold text-xs sm:text-sm text-brand-black block">
                            {apt.pickupAddress || apt.notes || `${apt.suburb}, NSW`}
                          </span>
                          <span className="text-[11px] text-black/50">
                            Service Suburb: {apt.suburb}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex md:flex-col items-center md:items-end flex-wrap gap-2 shrink-0 pt-2 md:pt-0">
                      
                      {/* Status Dropdown */}
                      <div className="relative">
                        <button 
                          onClick={() => setActiveStatusDropdown(activeStatusDropdown === (apt.id || apt.ref) ? null : (apt.id || apt.ref))}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
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
                          {activeStatusDropdown === (apt.id || apt.ref) && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden z-30"
                            >
                              <button onClick={() => handleUpdateStatus(apt, 'Confirmed')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-emerald-700">Confirmed</button>
                              <button onClick={() => handleUpdateStatus(apt, 'Pending')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-amber-700">Pending</button>
                              <button onClick={() => handleUpdateStatus(apt, 'Completed')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-blue-700">Completed</button>
                              <button onClick={() => handleUpdateStatus(apt, 'Cancelled')} className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-black/5 text-red-600">Cancelled</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Reschedule Button */}
                      <button
                        onClick={() => {
                          setReschedulingItem(apt);
                          setRescheduleDate(apt.date);
                          setRescheduleTime(apt.time);
                        }}
                        className="px-3 py-1.5 bg-brand-offwhite hover:bg-black/10 text-black/80 rounded-xl border border-black/10 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Reschedule Lesson Date & Time"
                      >
                        <Calendar className="w-3.5 h-3.5 text-brand-red" />
                        <span>Reschedule</span>
                      </button>

                      {/* WhatsApp Student */}
                      <a
                        href={`https://wa.me/${apt.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${apt.studentName}, this is Wally your driving instructor regarding your lesson on ${apt.date} at ${apt.time}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-all text-xs font-bold flex items-center gap-1.5"
                        title="WhatsApp Student"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(apt);
                        }}
                        className="p-2 text-black/30 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Booking from UI & Database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Instructor Reschedule Modal */}
      <AnimatePresence>
        {reschedulingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-black/10 relative"
            >
              <button 
                onClick={() => setReschedulingItem(null)}
                className="absolute right-4 top-4 text-black/50 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-brand-black mb-1">
                Reschedule Lesson
              </h3>
              <p className="text-xs text-black/60 mb-4">
                Student: <strong>{reschedulingItem.studentName}</strong> (#{reschedulingItem.ref})
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-black/70 mb-1">New Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/70 mb-1">New Time Slot</label>
                  <input
                    type="text"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-black focus:outline-none focus:border-brand-red"
                    placeholder="e.g. 10:00 AM - 11:00 AM"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-black/10">
                  <button
                    onClick={() => setReschedulingItem(null)}
                    className="px-4 py-2 text-xs text-black/60 hover:text-black font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSavingReschedule}
                    onClick={handleSaveReschedule}
                    className="bg-brand-red text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#c41a21] shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingReschedule ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
