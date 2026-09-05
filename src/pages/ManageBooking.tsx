import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  LogOut, 
  Search, 
  Phone, 
  Mail, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  UserCheck, 
  DollarSign, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  getStoredBookings, 
  updateBookingStatus, 
  updateBookingDetails, 
  deleteBooking, 
  addBooking, 
  checkOwnerAuth, 
  isOwnerLoggedIn, 
  setOwnerLoggedIn, 
  logoutOwner, 
  BookingItem 
} from '../lib/bookings';
import { cn } from '../lib/utils';

export function ManageBooking() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Bookings state
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled'>('All');
  const [editingBooking, setEditingBooking] = useState<BookingItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New booking form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSuburb, setNewSuburb] = useState('Rooty Hill');
  const [newPackageTitle, setNewPackageTitle] = useState('1 Hour Driving Lesson');
  const [newPrice, setNewPrice] = useState(70);
  const [newDate, setNewDate] = useState('2026-10-28');
  const [newTime, setNewTime] = useState('10:00 AM - 11:00 AM');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    if (isOwnerLoggedIn()) {
      setIsLoggedIn(true);
      setBookings(getStoredBookings());
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const isValid = checkOwnerAuth(username, password);

      if (isValid) {
        setOwnerLoggedIn(true);
        setIsLoggedIn(true);
        setBookings(getStoredBookings());
      } else {
        setError('Access Denied: Only the owner (Wally) is authorized to log in. Please enter valid owner credentials.');
      }
    }, 600);
  };

  const handleLogout = () => {
    logoutOwner();
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const handleStatusChange = (id: string, newStatus: BookingItem['status']) => {
    const updated = updateBookingStatus(id, newStatus);
    setBookings(updated);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove the booking for ${name}?`)) {
      const updated = deleteBooking(id);
      setBookings(updated);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    const updated = updateBookingDetails(editingBooking.id, editingBooking);
    setBookings(updated);
    setEditingBooking(null);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const created = addBooking({
      studentName: newStudentName,
      phone: newPhone || '0400 000 000',
      email: newEmail || 'student@example.com',
      suburb: newSuburb || 'Rooty Hill',
      packageTitle: newPackageTitle,
      packagePrice: Number(newPrice) || 70,
      date: newDate,
      time: newTime,
      status: 'Confirmed',
      notes: newNotes
    });

    setBookings(getStoredBookings());
    setIsAddModalOpen(false);
    // Reset form
    setNewStudentName('');
    setNewPhone('');
    setNewEmail('');
    setNewNotes('');
  };

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = statusFilter === 'All' || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      b.studentName.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      b.ref.toLowerCase().includes(q) ||
      b.suburb.toLowerCase().includes(q) ||
      b.packageTitle.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const totalRevenue = bookings.reduce((sum, b) => b.status !== 'Cancelled' ? sum + b.packagePrice : sum, 0);
  const confirmedCount = bookings.filter(b => b.status === 'Confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;

  return (
    <div className="pt-28 pb-20 bg-brand-black min-h-screen relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <div className="absolute -left-40 top-20 w-96 h-96 border-[40px] border-brand-red rounded-full mix-blend-screen" />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] bg-brand-red rounded-full mix-blend-screen filter blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            /* OWNER LOGIN GATE */
            <div className="min-h-[70vh] flex items-center justify-center">
              <motion.div 
                key="login-card"
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-full max-w-lg bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[36px] p-8 md:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
              >
                <div className="absolute inset-0 shimmer pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                  <div className="bg-white/95 px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(227,34,42,0.4)] mx-auto mb-5 flex items-center justify-center w-fit">
                    <img src="/assets/logo.png" alt="Wally's Driving School" className="h-11 w-auto object-contain max-w-[170px]" />
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/20 border border-brand-red/30 text-brand-red text-xs font-bold uppercase tracking-wider mb-2">
                    <Lock className="w-3 h-3" />
                    <span>Owner Portal · Restricted</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 tracking-tight">
                    Manage Bookings
                  </h1>
                  <p className="text-white/60 text-xs sm:text-sm">
                    Only the business owner (Wally) can sign in to view all bookings, reschedule lessons, and manage learner drivers.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4 relative z-10">
                  <div>
                    <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">Owner Username / Email</label>
                    <input 
                      type="text" 
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
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

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-brand-red text-white font-bold rounded-2xl py-3.5 hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_25px_rgba(227,34,42,0.4)] mt-2 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <span>Sign In to Owner Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10 flex flex-col gap-2">
                  <span className="text-xs text-white/40">Only the owner has authorized credentials to access customer bookings.</span>
                  <Link to="/" className="text-xs font-medium text-brand-red hover:underline">
                    ← Return to Home Page
                  </Link>
                </div>
              </motion.div>
            </div>
          ) : (
            /* OWNER DASHBOARD: "SEE BOOKINGS AND EVERYTHING" */
            <motion.div
              key="owner-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="space-y-6"
            >
              {/* Header Bar */}
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-3 py-0.5 rounded-full bg-brand-red/20 border border-brand-red/30 text-brand-red text-[11px] font-bold uppercase tracking-wider">
                      Owner Portal · Wally
                    </span>
                    <span className="text-xs text-white/50">Wally@wallysdrivingschool.com.au</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                    Booking Management Center
                  </h1>
                  <p className="text-white/60 text-xs sm:text-sm mt-0.5">
                    View, manage, reschedule, and update all learner driver bookings.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                  <Link
                    to="/instructor-login"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-white/15 transition-all"
                  >
                    <Calendar className="w-4 h-4 text-brand-red" />
                    <span>Instructor Schedule</span>
                  </Link>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-red hover:bg-[#c41a21] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-red/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Booking</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/60">Total Bookings</span>
                    <UserCheck className="w-4 h-4 text-brand-red" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-white">{bookings.length}</div>
                  <div className="text-[11px] text-white/40 mt-1">Across Sydney Western suburbs</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/60">Confirmed Lessons</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-emerald-400">{confirmedCount}</div>
                  <div className="text-[11px] text-white/40 mt-1">Ready on instructor calendar</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/60">Pending Approval</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-amber-400">{pendingCount}</div>
                  <div className="text-[11px] text-white/40 mt-1">Requires confirmation call</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/60">Estimated Total</span>
                    <DollarSign className="w-4 h-4 text-brand-red" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-white">${totalRevenue} AUD</div>
                  <div className="text-[11px] text-white/40 mt-1">Active booked lessons value</div>
                </div>
              </div>

              {/* Filters & Search Control Bar */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student, ref #, phone, suburb..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all"
                  />
                </div>

                {/* Status filter tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {(['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                        statusFilter === tab 
                          ? "bg-brand-red text-white shadow-md shadow-brand-red/25" 
                          : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bookings List */}
              <div className="space-y-3">
                {filteredBookings.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-white/60">
                    <p className="text-sm">No bookings match your current search/filter criteria.</p>
                  </div>
                ) : (
                  filteredBookings.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-2xl p-5 sm:p-6 transition-all duration-300"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left Column: Student info & Package */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-mono text-xs font-bold text-white/60 bg-white/10 px-2.5 py-0.5 rounded-md">
                              #{item.ref}
                            </span>
                            <span className={cn(
                              "text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                              item.status === 'Confirmed' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                              item.status === 'Pending' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                              item.status === 'Completed' ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                              "bg-red-500/20 text-red-300 border-red-500/30"
                            )}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {item.status}
                            </span>
                            <span className="text-xs text-white/40">Booked: {item.createdAt}</span>
                          </div>

                          <div className="flex items-baseline gap-3">
                            <h3 className="text-lg font-bold text-white font-display">
                              {item.studentName}
                            </h3>
                            <span className="text-brand-red font-bold text-sm">
                              ${item.packagePrice} AUD
                            </span>
                          </div>

                          <div className="text-xs text-white/80 font-medium">
                            {item.packageTitle}
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-white/60 pt-1">
                            <div className="flex items-center gap-1.5 text-white/80">
                              <Calendar className="w-3.5 h-3.5 text-brand-red" />
                              <span>{item.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/80">
                              <Clock className="w-3.5 h-3.5 text-brand-red" />
                              <span>{item.time}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-brand-red" />
                              <span>Pickup: {item.suburb}, NSW</span>
                            </div>
                          </div>

                          {item.notes && (
                            <div className="text-xs text-white/50 bg-black/30 p-2.5 rounded-xl border border-white/5 mt-2">
                              <strong className="text-white/70">Notes:</strong> {item.notes}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Quick Owner Actions */}
                        <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0 border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                          {/* Contact buttons */}
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${item.phone.replace(/\s+/g, '')}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all"
                              title="Call Student"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{item.phone}</span>
                            </a>
                            <a
                              href={`https://wa.me/61${item.phone.replace(/^0/, '').replace(/\s+/g, '')}?text=${encodeURIComponent(`Hi ${item.studentName}, this is Wally from Wally's Driving School regarding your booking #${item.ref}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 rounded-lg text-xs font-bold transition-all"
                              title="WhatsApp Student"
                            >
                              WhatsApp
                            </a>
                          </div>

                          {/* Status buttons */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {item.status !== 'Confirmed' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'Confirmed')}
                                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-md transition-all cursor-pointer"
                              >
                                Confirm
                              </button>
                            )}
                            {item.status !== 'Completed' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'Completed')}
                                className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-bold rounded-md transition-all cursor-pointer"
                              >
                                Complete
                              </button>
                            )}
                            {item.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'Cancelled')}
                                className="px-2.5 py-1 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 text-[11px] font-bold rounded-md transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => setEditingBooking(item)}
                              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all cursor-pointer"
                              title="Reschedule / Edit details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.studentName)}
                              className="p-1.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-md transition-all cursor-pointer"
                              title="Delete booking record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Bottom return link */}
              <div className="pt-6 text-center text-xs text-white/40">
                <Link to="/" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Public Website</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL: RESCHEDULE / EDIT BOOKING */}
      <AnimatePresence>
        {editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-black border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl relative"
            >
              <h2 className="text-xl font-bold font-display mb-1 text-white">Reschedule / Edit Booking</h2>
              <p className="text-xs text-white/60 mb-5">Update lesson timing or notes for #{editingBooking.ref} ({editingBooking.studentName})</p>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Student Name</label>
                  <input
                    type="text"
                    value={editingBooking.studentName}
                    onChange={(e) => setEditingBooking({ ...editingBooking, studentName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Date</label>
                    <input
                      type="date"
                      value={editingBooking.date}
                      onChange={(e) => setEditingBooking({ ...editingBooking, date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Time Slot</label>
                    <input
                      type="text"
                      value={editingBooking.time}
                      onChange={(e) => setEditingBooking({ ...editingBooking, time: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingBooking.phone}
                      onChange={(e) => setEditingBooking({ ...editingBooking, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Suburb</label>
                    <input
                      type="text"
                      value={editingBooking.suburb}
                      onChange={(e) => setEditingBooking({ ...editingBooking, suburb: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Status</label>
                  <select
                    value={editingBooking.status}
                    onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                    className="w-full bg-brand-black border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Instructor Notes</label>
                  <textarea
                    rows={2}
                    value={editingBooking.notes || ''}
                    onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-red hover:bg-[#c41a21] text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-red/30 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD MANUAL BOOKING */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-black border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold font-display mb-1 text-white">Create New Lesson Booking</h2>
              <p className="text-xs text-white/60 mb-5">Log a phone, WhatsApp, or in-person student booking directly.</p>

              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Alex Henderson"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Phone *</label>
                    <input
                      type="text"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0400 000 000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Pickup Suburb</label>
                    <input
                      type="text"
                      value={newSuburb}
                      onChange={(e) => setNewSuburb(e.target.value)}
                      placeholder="Rooty Hill, NSW"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Lesson Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Time Slot</label>
                    <input
                      type="text"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      placeholder="10:00 AM - 11:00 AM"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Package</label>
                    <input
                      type="text"
                      value={newPackageTitle}
                      onChange={(e) => setNewPackageTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 uppercase mb-1">Price ($ AUD)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Notes / Requirements</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Logbook check, RMS test prep, nervous student, etc."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-red hover:bg-[#c41a21] text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-red/30 transition-all"
                  >
                    Confirm & Save Booking
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
