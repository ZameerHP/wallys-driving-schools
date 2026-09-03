import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export function Footer() {
  return (
    <footer className="bg-brand-black text-white pt-24 pb-10 border-t border-white/10 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-48 bg-brand-red/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-48 bg-brand-red/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Info */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6 group inline-block">
              <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-[0_0_20px_rgba(227,34,42,0.3)] border border-white/20 group-hover:scale-105 transition-transform duration-300 flex items-center h-14 w-fit">
                <img 
                  src="/assets/logo.png" 
                  alt="Wally's Driving School" 
                  className="h-10 w-auto object-contain max-w-[180px]" 
                />
              </div>
            </Link>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Wally's Driving School is Sydney's trusted, high-performance driving academy. Patient trainers, modern dual-controlled cars, and 99% test pass rate.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/60 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl w-fit">
              <ShieldCheck className="w-4 h-4 text-brand-red" />
              RMS Certified Driver Trainers
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-base uppercase tracking-wider text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
              Quick Links
            </h4>
            <ul className="space-y-3.5 text-sm text-white/70">
              <li><Link to="/about" className="hover:text-brand-red hover:translate-x-1 inline-block transition-all">About Us</Link></li>
              <li><Link to="/packages" className="hover:text-brand-red hover:translate-x-1 inline-block transition-all">Packages & Pricing</Link></li>
              <li><Link to="/services" className="hover:text-brand-red hover:translate-x-1 inline-block transition-all">Our Services</Link></li>
              <li><Link to="/coverage-area" className="hover:text-brand-red hover:translate-x-1 inline-block transition-all">Coverage Area</Link></li>
              <li><Link to="/faqs" className="hover:text-brand-red hover:translate-x-1 inline-block transition-all">Frequently Asked Questions</Link></li>
              <li><Link to="/blog" className="hover:text-brand-red hover:translate-x-1 inline-block transition-all">Driving Guides & Blog</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-display font-bold text-base uppercase tracking-wider text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
              Get In Touch
            </h4>
            <ul className="space-y-4 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                <span>Rooty Hill & Greater Western Sydney, NSW 2766</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brand-red shrink-0" />
                <a href="mailto:wally@wallysdrivingschool.com.au" className="hover:text-white transition-colors">
                  wally@wallysdrivingschool.com.au
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-brand-red shrink-0" />
                <a href="tel:0406693301" className="hover:text-white font-bold text-white transition-colors">
                  0406 693 301
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-brand-red shrink-0" />
                <span>Everyday: 8:00 AM – 8:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display font-bold text-base uppercase tracking-wider text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
              Stay Informed
            </h4>
            <p className="text-white/70 mb-4 text-sm leading-relaxed">
              Subscribe for exclusive driving tips, RMS test route advice, and special discount offers.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert("Thanks for subscribing!"); }} className="flex flex-col gap-2.5">
              <div className="relative">
                <input 
                  type="email" 
                  required
                  placeholder="Your email address" 
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-all duration-300"
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className="w-full bg-brand-red py-3 rounded-xl font-bold text-sm hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_20px_rgba(227,34,42,0.4)] flex items-center justify-center gap-2"
              >
                <span>Subscribe Now</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Wally's Driving School. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/coverage-area" className="hover:text-white transition-colors">Service Areas</Link>
            <Link to="/manage-booking" className="hover:text-white transition-colors">Manage Booking</Link>
            <Link to="/instructor-login" className="hover:text-white transition-colors">Instructor Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
