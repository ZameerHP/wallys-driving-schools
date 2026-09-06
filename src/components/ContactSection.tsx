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
  Send
} from 'lucide-react';
import { TiltCard } from './TiltCard';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface ContactSectionProps {
  showBreadcrumbs?: boolean;
  isFullPage?: boolean;
}

const WHATSAPP_NUMBER = "61406693301"; // 0406 693 301 in international format
const DISPLAY_PHONE = "0406 693 301";

// Authentic WhatsApp SVG Icon
function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.677.15-.2.301-.776.979-.952 1.18-.175.2-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.493-.894-.798-1.498-1.784-1.674-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.451-.527.15-.175.2-.301.301-.501.101-.2.05-.376-.025-.527-.075-.15-.677-1.63-928-2.232-.244-.585-.493-.505-.677-.514-.175-.008-.376-.01-.577-.01-.2 0-.526.075-.802.376-.276.301-1.053 1.028-1.053 2.508 0 1.48 1.079 2.909 1.229 3.11.15.2 2.124 3.243 5.145 4.549.719.311 1.28.497 1.718.636.722.23 1.379.198 1.899.12.58-.088 1.78-.727 2.03-1.429.25-.702.25-1.303.175-1.429-.075-.125-.276-.2-.577-.35z" />
      <path d="M12.004 2c-5.523 0-10 4.477-10 10 0 1.768.459 3.432 1.264 4.887l-1.344 4.908 5.038-1.321c1.41.77 3.018 1.213 4.73 1.213 5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.286c-1.523 0-2.96-.407-4.208-1.12l-.302-.174-3.125.82.834-3.045-.191-.307c-.777-1.246-1.189-2.696-1.189-4.183 0-4.568 3.717-8.286 8.286-8.286 4.568 0 8.286 3.718 8.286 8.286 0 4.568-3.718 8.286-8.286 8.286z" />
    </svg>
  );
}

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
  const [generatedWaLink, setGeneratedWaLink] = useState('');

  // Build clean WhatsApp message from only the 4 fields
  const buildWhatsAppMessage = () => {
    const lines = [
      `👋 *Hi Wally, I'd like to get in touch!*`,
      ``,
      `👤 *Name:* ${formData.name.trim()}`,
      `📞 *Phone:* ${formData.phone.trim()}`,
      formData.email.trim() ? `✉️ *Email:* ${formData.email.trim()}` : '',
      formData.message.trim() ? `💬 *Message:* ${formData.message.trim()}` : ''
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; phone?: string; email?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Please enter your name';
    if (!formData.phone.trim()) newErrors.phone = 'Please enter your phone number';
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const msg = buildWhatsAppMessage();
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    setGeneratedWaLink(waUrl);
    setIsSubmitted(true);

    // Save to Supabase table if configured
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) {
        sb.from('contact_messages').insert({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
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
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
      }),
    }).catch(err => console.warn('Could not record contact inquiry in database:', err));

    // Directly open WhatsApp
    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback handled by button
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
            Fill in your details to message Wally directly on WhatsApp (<strong>{DISPLAY_PHONE}</strong>).
          </p>
        </div>

        {/* Clean 2-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* LEFT: Quick Contact Channels */}
          <div className="lg:col-span-5 flex flex-col">
            <TiltCard maxTilt={3} className="h-full rounded-3xl">
              <div className="h-full bg-[#0D0D0E] text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-white/[0.08] flex flex-col justify-between relative overflow-hidden">
                
                <div className="relative z-10 space-y-4">
                  {/* WhatsApp Quick Box */}
                  <div className="p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20 shrink-0">
                        <WhatsAppIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[#25D366] tracking-wider">Direct WhatsApp</div>
                        <div className="text-lg font-bold text-white tracking-tight">{DISPLAY_PHONE}</div>
                      </div>
                    </div>
                    <p className="text-xs text-white/70 mb-3">
                      Chat directly with Wally for lesson bookings, test slots & logbook queries.
                    </p>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Wally,%20I'd%20like%20to%20enquire%20about%20driving%20lessons.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>Chat on WhatsApp Now</span>
                    </a>
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
                            Fills a note directly into WhatsApp for Wally.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-red/10 text-brand-red px-2.5 py-1 rounded-full">
                          WhatsApp Send
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
                            Phone Number <span className="text-brand-red">*</span>
                          </label>
                          <div className="relative">
                            <Smartphone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-black/40 pointer-events-none" />
                            <input 
                              type="tel" 
                              placeholder="e.g. 0400 123 456"
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
                          Email Address <span className="text-brand-red">*</span>
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

                      {/* Send / Submit Button (no number in button) */}
                      <div className="pt-1">
                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-[#c41a21] text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-lg shadow-brand-red/25 hover:shadow-brand-red/40 transition-all cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>Send Message</span>
                        </button>
                        <p className="text-[11px] text-center text-brand-black/50 mt-1.5">
                          Sends your details directly to Wally via WhatsApp.
                        </p>
                      </div>

                    </form>
                  ) : (
                    /* Sent State & Direct WhatsApp Fallback */
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-6 px-2"
                    >
                      <div className="w-12 h-12 bg-[#25D366]/15 text-[#25D366] rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>

                      <h4 className="text-xl font-display font-bold text-brand-black mb-1">
                        Message Ready For WhatsApp!
                      </h4>
                      <p className="text-xs sm:text-sm text-brand-black/70 max-w-md mx-auto mb-4">
                        Your message for <strong>Wally ({DISPLAY_PHONE})</strong> is ready. If WhatsApp didn't open automatically, tap below:
                      </p>

                      {/* Preview Box */}
                      <div className="bg-brand-offwhite p-3.5 rounded-xl border border-black/10 text-left text-xs text-brand-black/80 font-mono mb-5 whitespace-pre-line">
                        {buildWhatsAppMessage()}
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <a
                          href={generatedWaLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-[#25D366] text-black font-extrabold px-6 py-2.5 rounded-full text-xs shadow-md hover:bg-[#20bd5a] transition-all"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                          <span>Open WhatsApp Chat</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleReset}
                          className="px-5 py-2.5 rounded-full text-xs font-bold border border-black/15 hover:bg-black/5 text-brand-black transition-colors"
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
