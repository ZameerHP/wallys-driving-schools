import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Menu, X, ChevronDown, User, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

const MAIN_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Packages', path: '/packages' },
  { name: 'Services', path: '/services' },
  { name: 'About', path: '/about' },
  { name: 'Blog', path: '/blog' },
  { name: 'FAQs', path: '/faqs' },
  { name: 'Coverage Area', path: '/coverage-area' },
];

const LOGIN_LINKS = [
  { name: 'Manage Booking', path: '/manage-booking', desc: 'View and reschedule lessons' },
  { name: 'Instructor Login', path: '/instructor-login', desc: 'Instructor schedule & portal' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setLoginDropdownOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileOpen]);

  const navContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const navItemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <motion.header
        initial={{ y: shouldReduceMotion ? 0 : "-100%" }}
        animate={{ y: 0 }}
        transition={{ delay: shouldReduceMotion ? 0 : 0.15, type: "spring", stiffness: 200, damping: 20 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled 
            ? 'bg-brand-black/90 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-3.5 border-b border-white/10' 
            : 'bg-gradient-to-b from-black/80 via-black/30 to-transparent py-6'
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="flex items-center justify-between">
            {/* Official Logo */}
            <div data-magnetic>
              <Link to="/" className="relative z-50 flex items-center group">
                <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-[0_0_20px_rgba(227,34,42,0.25)] border border-white/20 group-hover:shadow-[0_0_30px_rgba(227,34,42,0.6)] group-hover:scale-105 transition-all duration-300 flex items-center h-12">
                  <img 
                    src="/assets/logo.png" 
                    alt="Wally's Driving School" 
                    className="h-9 w-auto object-contain max-w-[160px]" 
                  />
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1.5" onMouseLeave={() => setHoveredPath(null)}>
              {MAIN_LINKS.map((link) => {
                const isActive = location.pathname === link.path;
                const isHovered = hoveredPath === link.path;
                
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onMouseEnter={() => setHoveredPath(link.path)}
                    className={cn(
                      "relative px-4 py-2 text-[13px] font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap rounded-full",
                      isActive || isHovered ? "text-brand-black" : "text-white/85 hover:text-white"
                    )}
                  >
                    {/* Pill Background */}
                    {isHovered && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-white rounded-full z-[-1] shadow-lg shadow-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {/* Active Indicator (Underline if not hovered but active) */}
                    {isActive && !isHovered && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute bottom-1 left-4 right-4 h-[2px] bg-brand-red rounded-full shadow-[0_0_8px_rgba(227,34,42,0.8)]"
                      />
                    )}
                    <span className="relative z-10">{link.name}</span>
                  </Link>
                );
              })}

              {/* Dropdown for Logins */}
              <div 
                className="relative ml-2"
                onMouseEnter={() => setLoginDropdownOpen(true)}
                onMouseLeave={() => setLoginDropdownOpen(false)}
              >
                <button 
                  onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold uppercase tracking-wider rounded-full transition-all duration-300 border border-transparent",
                    loginDropdownOpen 
                      ? "bg-white/15 text-white border-white/20" 
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  )}
                >
                  <User className="w-4 h-4 text-brand-red" />
                  <span>Portal</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", loginDropdownOpen && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {loginDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full right-0 mt-2 w-64 bg-[#111114]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden border border-white/15 p-2 z-50"
                    >
                      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                        Select Access Portal
                      </div>
                      {LOGIN_LINKS.map(link => (
                        <Link 
                          key={link.path} 
                          to={link.path}
                          className="flex flex-col px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 group"
                        >
                          <span className="text-sm font-bold text-white group-hover:text-brand-red transition-colors flex items-center justify-between">
                            {link.name}
                            <ShieldCheck className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-brand-red transition-opacity" />
                          </span>
                          <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
                            {link.desc}
                          </span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden xl:flex items-center gap-3.5 ml-4 pl-4 border-l border-white/20">
              <div className="flex items-center gap-2 mr-1">
                <a href="https://www.facebook.com/people/Wallys-Driving-School/61575863566186/?mibextid=wwXIfr&rdid=ldWQaR7pVQgqrG2o&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1Cmms1RUhY%2F%3Fmibextid%3DwwXIfr" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/10 hover:text-brand-red text-white transition-colors">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="https://www.instagram.com/wallysdrivingschools?igsh=aGsyNDR1Zmlvd2Ft" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/10 hover:text-brand-red text-white transition-colors">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              </div>
              
              <div data-magnetic>
                <motion.a 
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  href="tel:0406693301" 
                  data-cursor-text="CALL"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-sm font-bold border border-white/15 backdrop-blur-md hover:border-white/30 transition-all duration-300"
                >
                  <Phone className="w-4 h-4 text-brand-red" />
                  <span className="whitespace-nowrap tracking-wide">0406 693 301</span>
                </motion.a>
              </div>
              
              <div data-magnetic>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link 
                    to="/book-now" 
                    data-cursor-text="BOOK"
                    className="inline-block bg-brand-red text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(227,34,42,0.4)] hover:shadow-[0_0_35px_rgba(227,34,42,0.7)] hover:bg-white hover:text-brand-black transition-all duration-300 whitespace-nowrap"
                  >
                    Book Now
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="xl:hidden relative z-50 p-2.5 text-white hover:bg-white/10 rounded-2xl transition-colors border border-white/10 bg-brand-black/50 backdrop-blur-md"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Full-Screen Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'circle(0% at 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'circle(150% at 100% 0)' }}
            exit={{ opacity: 0, clipPath: 'circle(0% at 100% 0)' }}
            transition={{ type: 'spring', stiffness: 25, damping: 12, duration: 0.4 }}
            className="fixed inset-0 z-40 bg-brand-black/98 backdrop-blur-3xl flex flex-col justify-center px-6 overflow-y-auto"
          >
            <motion.nav 
              variants={navContainerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-5 w-full max-w-md mx-auto pt-24 pb-12"
            >
              {MAIN_LINKS.map((link) => (
                <motion.div key={link.path} variants={navItemVariants}>
                  <Link
                    to={link.path}
                    className={cn(
                      "block text-2xl sm:text-3xl font-display font-bold transition-all py-1",
                      location.pathname === link.path 
                        ? "text-brand-red translate-x-2" 
                        : "text-white hover:text-brand-red hover:translate-x-2"
                    )}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={navItemVariants} className="w-full h-px bg-white/10 my-3" />

              <div className="grid grid-cols-2 gap-3">
                {LOGIN_LINKS.map((link) => (
                  <motion.div key={link.path} variants={navItemVariants}>
                    <Link
                      to={link.path}
                      className="flex flex-col p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/90 hover:text-white hover:border-brand-red/40 hover:bg-white/10 transition-all"
                    >
                      <User className="w-4 h-4 text-brand-red mb-1.5" />
                      <span className="text-sm font-bold">{link.name}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={navItemVariants} className="mt-6 flex flex-col gap-3.5">
                <Link 
                  to="/book-now"
                  className="w-full bg-brand-red text-white py-4 rounded-full text-center text-lg font-bold shadow-[0_0_25px_rgba(227,34,42,0.5)] active:scale-[0.98] transition-all"
                >
                  Book Now
                </Link>
                <a 
                  href="tel:0406693301"
                  className="w-full bg-white/10 text-white py-3.5 rounded-full text-center text-base font-bold flex items-center justify-center gap-2 border border-white/20 hover:bg-white/20 transition-all"
                >
                  <Phone className="w-4 h-4 text-brand-red" />
                  0406 693 301
                </a>
                
                <div className="flex items-center justify-center gap-4 mt-2">
                  <a href="https://www.facebook.com/people/Wallys-Driving-School/61575863566186/?mibextid=wwXIfr&rdid=ldWQaR7pVQgqrG2o&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1Cmms1RUhY%2F%3Fmibextid%3DwwXIfr" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-brand-red text-white transition-colors border border-white/10">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                  </a>
                  <a href="https://www.instagram.com/wallysdrivingschools?igsh=aGsyNDR1Zmlvd2Ft" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-brand-red text-white transition-colors border border-white/10">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </a>
                </div>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
