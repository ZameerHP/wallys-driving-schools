import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Smartphone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  User, 
  MessageSquare,
  Sparkles,
  Send,
  PhoneCall
} from 'lucide-react';
import { TiltCard } from './TiltCard';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { validateAustralianPhone, validateWorkingEmail } from '../lib/validation';

interface ContactSectionProps {
  showBreadcrumbs?: boolean;
  isFullPage?: boolean;
}

const DISPLAY_PHONE = "0406 693 301";
const TEL_PHONE = "tel:0406693301";
const SMS_PHONE = "sms:0406693301";

export function ContactSection({ showBreadcrumbs = false, isFullPage = false }: ContactSectionProps) {
  // ONLY 4 FIELDS: Name, Email, Number, Message
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; phone?: string; email?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your name';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your full name';
    }

    const phoneCheck = validateAustralianPhone(formData.phone);
    if (!phoneCheck.isValid) {
      newErrors.phone = phoneCheck.error;
    }

    const emailCheck = validateWorkingEmail(formData.email);
    if (!emailCheck.isValid) {
      newErrors.email = emailCheck.error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const formattedPhone = phoneCheck.formatted;
    const cleanEmail = emailCheck.email;

    // Save to Supabase table if configured
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        sb.from('contact_messages').insert({
          name: formData.name.trim(),
          email: cleanEmail,
          phone: formattedPhone,
          message: formData.message.trim(),
        }).then(
          ({ error }) => {
            if (error) console.warn('Supabase contact insert warning:', error);
          },
          (err) => {
            console.warn('Supabase contact error:', err);
          }
        );
      }
    }

    // Save to PostgreSQL database API
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: cleanEmail,
          phone: formattedPhone,
          message: formData.message.trim(),
        }),
      });
    } catch (err) {
      console.warn('Could not record contact inquiry in database:', err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      message: ''
    });
    setErrors({});
    setIsSubmitted(false);
  };

  return (
    <section 
      id="contact" 
      className={`bg-brand-offwhite text-brand-black relative overflow-hidden flex flex-col justify-center ${
        isFullPage 
          ? 'py-6 sm:py-8 lg:min-h-[calc(100vh-5rem)]' 
          : 'py-14 sm:py-16 lg:py-20'
      }`}
    >
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 relative z-10 my-auto">
        
        {/* Simple Header */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          {showBreadcrumbs && (
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-brand-black/45 mb-2 uppercase tracking-widest">
              <Link to="/" className="hover:text-brand-red transition-colors">Wally's Driving School</Link>
              <span>/</span>
              <span className="text-brand-red font-semibold">Contact</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-red uppercase tracking-wider bg-brand-red/10 px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Fast Response • 7 Days
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black tracking-tight text-brand-black mb-1.5 uppercase">
            Get In Touch With Wally
          </h1>

          <p className="text-xs sm:text-sm text-brand-black/65">
            Fill in your details below to send a message, or call directly on <strong>{DISPLAY_PHONE}</strong>.
          </p>
        </div>

        {/* Clean 2-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* LEFT: Quick Contact Channels */}
          <div className="lg:col-span-5 flex flex-col">
            <TiltCard maxTilt={3} className="h-full rounded-3xl">
              <div className="h-full bg-[#0D0D0E] text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-white/[0.08] flex flex-col justify-between relative overflow-hidden">
                
                <div className="relative z-10 space-y-4">
                  {/* Direct Phone Call & SMS Box */}
                  <div className="p-4 rounded-2xl bg-brand-red/10 border border-brand-red/30 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-brand-red text-white flex items-center justify-center shadow-lg shadow-brand-red/20 shrink-0">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-brand-red tracking-wider">Direct Instructor Line</div>
                        <div className="text-lg font-bold text-white tracking-tight">{DISPLAY_PHONE}</div>
                      </div>
                    </div>
                    <p className="text-xs text-white/70 mb-3">
                      Call or text Wally directly for lesson bookings, test slots & logbook queries.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={TEL_PHONE}
                        className="inline-flex items-center justify-center gap-1.5 bg-brand-red hover:bg-[#c41a21] text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-md"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call Now</span>
                      </a>
                      <a
                        href={SMS_PHONE}
                        className="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all border border-white/15"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send SMS</span>
                      </a>
                    </div>
                  </div>

                  {/* Email link */}
                  <div className="space-y-2.5">
                    <a 
                      href="mailto:wally@wallysdrivingschool.com.au"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-brand-red/50 hover:bg-white/[0.08] transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-red/15 text-brand-red flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="text-[10px] font-bold text-white/45 uppercase tracking-wider">Email</div>
                        <div className="text-xs font-bold text-white truncate">wally@wallysdrivingschool.com.au</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Coverage & Hours */}
                <div className="pt-4 border-t border-white/[0.08] space-y-1.5 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-brand-red shrink-0" />
                    <span>Rooty Hill, Blacktown, Penrith & Western Sydney</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-brand-red shrink-0" />
                    <span>8:00 AM – 8:00 PM • Everyday</span>
                  </div>
                </div>

              </div>
            </TiltCard>
          </div>

          {/* RIGHT: ONLY 4 FIELDS: Name, Email, Phone Number, Message */}
          <div className="lg:col-span-7">
            <TiltCard maxTilt={2} className="rounded-3xl h-full">
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-black/[0.03] border border-black/[0.08] h-full flex flex-col justify-center">
                
                <AnimatePresence mode="wait">
                  {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                      <div className="border-b border-black/[0.06] pb-2.5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-display font-bold text-brand-black">
                            Send a Message
                          </h3>
                          <p className="text-xs text-brand-black/55">
                            Send your inquiry directly to Wally's instructor team.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-red/10 text-brand-red px-2.5 py-1 rounded-full">
                          Direct Inquiry
                        </span>
                      </div>

                      {/* Field 1: Name & Field 2: Phone Number */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Name */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-black/70 mb-1">
                            Your Name <span className="text-brand-red">*</span>
                          </label>
                          <div className="relative">
                            <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-black/40 pointer-events-none" />
                            <input 
                              type="text" 
                              placeholder="e.g. Sarah Jenkins"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              className={`w-full bg-brand-offwhite border rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-brand-black placeholder:text-brand-black/35 focus:outline-none transition-all ${
                                errors.name ? 'border-brand-red ring-2 ring-brand-red/20' : 'border-black/10 focus:border-brand-red focus:bg-white'
                              }`}
                            />
                          </div>
                          {errors.name && <p className="text-[10px] text-brand-red font-medium pt-0.5">{errors.name}</p>}
                        </div>

                        {/* 2. Number / Phone */}
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-black/70 mb-1">
                            Australian Phone <span className="text-brand-red">*</span>
                          </label>
                          <div className="relative">
                            <Smartphone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-black/40 pointer-events-none" />
                            <input 
                              type="tel" 
                              placeholder="0406 693 301"
                              value={formData.phone}
                              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                              className={`w-full bg-brand-offwhite border rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-brand-black placeholder:text-brand-black/35 focus:outline-none transition-all ${
                                errors.phone ? 'border-brand-red ring-2 ring-brand-red/20' : 'border-black/10 focus:border-brand-red focus:bg-white'
                              }`}
                            />
                          </div>
                          {errors.phone && <p className="text-[10px] text-brand-red font-medium pt-0.5">{errors.phone}</p>}
                        </div>
                      </div>

                      {/* Field 3: Email Address */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-black/70 mb-1">
                          Working Email Address <span className="text-brand-red">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-black/40 pointer-events-none" />
                          <input 
                            type="email" 
                            placeholder="name@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className={`w-full bg-brand-offwhite border rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-brand-black placeholder:text-brand-black/35 focus:outline-none transition-all ${
                              errors.email ? 'border-brand-red ring-2 ring-brand-red/20' : 'border-black/10 focus:border-brand-red focus:bg-white'
                            }`}
                          />
                        </div>
                        {errors.email && <p className="text-[10px] text-brand-red font-medium pt-0.5">{errors.email}</p>}
                      </div>

                      {/* Field 4: Message */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-black/70 mb-1">
                          Message
                        </label>
                        <div className="relative">
                          <MessageSquare className="w-3.5 h-3.5 absolute left-3 top-3 text-brand-black/40 pointer-events-none" />
                          <textarea 
                            rows={3}
                            placeholder="Write your message here..."
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            className="w-full bg-brand-offwhite border border-black/10 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-brand-black placeholder:text-brand-black/35 focus:outline-none focus:border-brand-red focus:bg-white transition-all resize-none"
                          />
                        </div>
                      </div>

                      {/* Send / Submit Button */}
                      <div className="pt-1">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-[#c41a21] disabled:opacity-70 text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-lg shadow-brand-red/25 hover:shadow-brand-red/40 transition-all cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                        </button>
                        <p className="text-[11px] text-center text-brand-black/50 mt-1.5">
                          Direct inquiry delivered to Wally's instructor team.
                        </p>
                      </div>

                    </form>
                  ) : (
                    /* Sent State */
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-6 px-2"
                    >
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-emerald-200">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <h4 className="text-xl font-display font-bold text-brand-black mb-1">
                        Message Sent Successfully!
                      </h4>
                      <p className="text-xs sm:text-sm text-brand-black/70 max-w-md mx-auto mb-5 leading-relaxed">
                        Thank you, <strong>{formData.name.split(' ')[0]}</strong>. Your inquiry has been received. Wally will contact you shortly at <strong>{formData.phone}</strong> or via email.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <a
                          href={TEL_PHONE}
                          className="inline-flex items-center gap-2 bg-brand-red text-white font-extrabold px-6 py-2.5 rounded-full text-xs shadow-md hover:bg-[#c41a21] transition-all"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Call Wally Directly</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleReset}
                          className="px-5 py-2.5 rounded-full text-xs font-bold border border-black/15 hover:bg-black/5 text-brand-black transition-colors cursor-pointer"
                        >
                          Send Another Message
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </TiltCard>
          </div>

        </div>
      </div>
    </section>
  );
}
