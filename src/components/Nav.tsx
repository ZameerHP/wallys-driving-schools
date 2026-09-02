import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Menu, X, ChevronDown, User } from 'lucide-react';
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
  { name: 'Manage Booking', path: '/manage-booking' },
  { name: 'Instructor Login', path: '/instructor-login' },
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
          scrolled ? 'bg-brand-black/90 backdrop-blur-xl shadow-2xl py-3 border-b border-white/10' : 'bg-transparent py-6'
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="relative z-50 flex items-center gap-3 group">
              <div className="w-12 h-12 bg-brand-red text-white flex items-center justify-center font-bold text-2xl rounded-2xl shadow-[0_0_15px_rgba(227,34,42,0.5)] group-hover:shadow-[0_0_25px_rgba(227,34,42,0.8)] transition-all duration-300">
                W
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-bold text-white leading-none tracking-tight">Wally's</span>
                <span className="text-xs font-bold text-brand-red uppercase tracking-widest">Driving School</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1" onMouseLeave={() => setHoveredPath(null)}>
              {MAIN_LINKS.map((link) => {
                const isActive = location.pathname === link.path;
                const isHovered = hoveredPath === link.path;
                
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onMouseEnter={() => setHoveredPath(link.path)}
                    className={cn(
                      "relative px-4 py-2 text-[13px] font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap",
                      isActive || isHovered ? "text-brand-black" : "text-white/90 hover:text-white"
                    )}
                  >
                    {/* Pill Background */}
                    {isHovered && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-white rounded-full z-[-1]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {/* Active Indicator (Underline if not hovered but active) */}
                    {isActive && !isHovered && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute bottom-1 left-4 right-4 h-[2px] bg-brand-red rounded-full"
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
                <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold uppercase tracking-wider text-white/90 hover:text-white transition-colors">
                  <User className="w-4 h-4" />
                  Login
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", loginDropdownOpen && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {loginDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl overflow-hidden border border-black/5"
                    >
                      {LOGIN_LINKS.map(link => (
                        <Link 
                          key={link.path} 
                          to={link.path}
                          className="block px-4 py-3 text-sm font-semibold text-brand-black hover:bg-brand-offwhite hover:text-brand-red transition-colors"
                        >
                          {link.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden xl:flex items-center gap-4 ml-4 pl-4 border-l border-white/20">
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="tel:0406693301" 
                className="flex items-center gap-2 bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(227,34,42,0.4)] hover:shadow-[0_0_25px_rgba(227,34,42,0.6)] hover:bg-white hover:text-brand-black transition-all"
              >
                <Phone className="w-4 h-4" />
                <span className="whitespace-nowrap">0406 693 301</span>
              </motion.a>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/book-now" className="bg-white text-brand-black px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-brand-red hover:text-white transition-all whitespace-nowrap">
                  Book Now
                </Link>
              </motion.div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="xl:hidden relative z-50 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
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
            transition={{ type: 'spring', stiffness: 20, damping: 10, duration: 0.5 }}
            className="fixed inset-0 z-40 bg-brand-black/95 backdrop-blur-2xl flex flex-col justify-center px-6 overflow-y-auto"
          >
            <motion.nav 
              variants={navContainerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-6 w-full max-w-md mx-auto pt-24 pb-12"
            >
              {MAIN_LINKS.map((link) => (
                <motion.div key={link.path} variants={navItemVariants}>
                  <Link
                    to={link.path}
                    className={cn(
                      "block text-3xl font-display font-bold transition-colors",
                      location.pathname === link.path ? "text-brand-red" : "text-white hover:text-brand-red"
                    )}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={navItemVariants} className="w-full h-px bg-white/10 my-4" />

              {LOGIN_LINKS.map((link) => (
                <motion.div key={link.path} variants={navItemVariants}>
                  <Link
                    to={link.path}
                    className="flex items-center gap-3 text-xl font-bold text-white/80 hover:text-white transition-colors"
                  >
                    <User className="w-5 h-5 text-brand-red" />
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={navItemVariants} className="mt-8 flex flex-col gap-4">
                <Link 
                  to="/book-now"
                  className="w-full bg-brand-red text-white py-4 rounded-full text-center text-lg font-bold shadow-[0_0_20px_rgba(227,34,42,0.4)]"
                >
                  Book Now
                </Link>
                <a 
                  href="tel:0406693301"
                  className="w-full bg-white/10 text-white py-4 rounded-full text-center text-lg font-bold flex items-center justify-center gap-2 border border-white/20"
                >
                  <Phone className="w-5 h-5" />
                  0406 693 301
                </a>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
