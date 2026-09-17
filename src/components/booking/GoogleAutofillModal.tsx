import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  CheckCircle2, 
  X, 
  Mail, 
  User, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  Calendar,
  Clock,
  ExternalLink
} from 'lucide-react';
import { validateWorkingEmail } from '../../lib/validation';

export const GoogleGIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
  </svg>
);

export interface SavedGoogleAccount {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source?: string;
}

interface GoogleAutofillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { email: string; firstName: string; lastName: string; phone?: string }) => void;
  initialEmail?: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialPhone?: string;
  onSignInOAuth?: () => Promise<void>;
}

export const GoogleAutofillModal: React.FC<GoogleAutofillModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialEmail = '',
  initialFirstName = '',
  initialLastName = '',
  initialPhone = '',
  onSignInOAuth
}) => {
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [firstNameInput, setFirstNameInput] = useState(initialFirstName);
  const [lastNameInput, setLastNameInput] = useState(initialLastName);
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [savedAccounts, setSavedAccounts] = useState<SavedGoogleAccount[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [oAuthNotice, setOAuthNotice] = useState<string | null>(null);

  // Discover remembered Google accounts from localStorage
  useEffect(() => {
    if (!isOpen) return;

    setEmailInput(initialEmail);
    setFirstNameInput(initialFirstName);
    setLastNameInput(initialLastName);
    setPhoneInput(initialPhone);
    setValidationError(null);
    setSuggestion(null);
    setOAuthNotice(null);

    const accounts: SavedGoogleAccount[] = [];

    // 1. Primary saved Google profile
    try {
      const storedProfile = localStorage.getItem('wallys_verified_google_account');
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        if (parsed?.email && validateWorkingEmail(parsed.email).isValid) {
          accounts.push({
            email: parsed.email,
            firstName: parsed.firstName || '',
            lastName: parsed.lastName || '',
            phone: parsed.phone || '',
            source: 'Saved Profile'
          });
        }
      }
    } catch {}

    // 2. Scan past bookings for previous verified emails
    try {
      const rawBookings = localStorage.getItem('wallys_bookings_v3');
      if (rawBookings) {
        const list = JSON.parse(rawBookings);
        if (Array.isArray(list)) {
          for (const b of list) {
            if (b.email && validateWorkingEmail(b.email).isValid) {
              if (!accounts.some(a => a.email.toLowerCase() === b.email.toLowerCase())) {
                const nameParts = (b.studentName || '').trim().split(' ');
                accounts.push({
                  email: b.email,
                  firstName: nameParts[0] || '',
                  lastName: nameParts.slice(1).join(' ') || '',
                  phone: b.phone || '',
                  source: 'Recent Booking'
                });
              }
            }
          }
        }
      }
    } catch {}

    setSavedAccounts(accounts);

    // If initial email is empty and we have a saved account, pre-populate with the first one
    if (!initialEmail && accounts.length > 0) {
      setEmailInput(accounts[0].email);
      if (!initialFirstName && accounts[0].firstName) setFirstNameInput(accounts[0].firstName);
      if (!initialLastName && accounts[0].lastName) setLastNameInput(accounts[0].lastName);
      if (!initialPhone && accounts[0].phone) setPhoneInput(accounts[0].phone);
    }
  }, [isOpen, initialEmail, initialFirstName, initialLastName, initialPhone]);

  // Live validate email
  useEffect(() => {
    if (!emailInput.trim()) {
      setValidationError(null);
      setSuggestion(null);
      return;
    }

    const res = validateWorkingEmail(emailInput);
    if (!res.isValid) {
      setValidationError(res.error || 'A valid Google email address (@gmail.com) is required.');
      setSuggestion(res.suggestion || null);
    } else {
      setValidationError(null);
      setSuggestion(null);
    }
  }, [emailInput]);

  if (!isOpen) return null;

  const handleSelectAccount = (acc: SavedGoogleAccount) => {
    setEmailInput(acc.email);
    if (acc.firstName) setFirstNameInput(acc.firstName);
    if (acc.lastName) setLastNameInput(acc.lastName);
    if (acc.phone) setPhoneInput(acc.phone);
    
    // Auto apply immediately
    onApply({
      email: acc.email,
      firstName: acc.firstName || firstNameInput,
      lastName: acc.lastName || lastNameInput,
      phone: acc.phone || phoneInput
    });
    onClose();
  };

  const handleApplyCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setValidationError('Please enter your personal Google email address (@gmail.com).');
      return;
    }

    const res = validateWorkingEmail(cleanEmail);
    if (!res.isValid) {
      setValidationError(res.error || 'A valid Google email address (@gmail.com) is required.');
      setSuggestion(res.suggestion || null);
      return;
    }

    // Save to localStorage for future 1-click visits
    try {
      localStorage.setItem('wallys_verified_google_account', JSON.stringify({
        email: res.email,
        firstName: firstNameInput.trim(),
        lastName: lastNameInput.trim(),
        phone: phoneInput.trim(),
        verifiedAt: new Date().toISOString()
      }));
    } catch {}

    onApply({
      email: res.email,
      firstName: firstNameInput.trim(),
      lastName: lastNameInput.trim(),
      phone: phoneInput.trim()
    });
    onClose();
  };

  const handleAppendGmail = () => {
    const raw = emailInput.trim();
    if (!raw) return;
    if (!raw.includes('@')) {
      setEmailInput(`${raw}@gmail.com`);
    } else {
      const user = raw.split('@')[0];
      setEmailInput(`${user}@gmail.com`);
    }
  };

  const handleOAuthClick = async () => {
    if (!onSignInOAuth) {
      setOAuthNotice('Direct Google Sign-in is available below. Enter your Google account for instant autofill.');
      return;
    }
    setIsOAuthLoading(true);
    setOAuthNotice(null);
    try {
      await onSignInOAuth();
    } catch (err: any) {
      console.warn('[Google OAuth notice]:', err);
      setOAuthNotice('Google OAuth is not configured on this domain yet. Please enter your Google email (@gmail.com) below for instant 1-click autofill & calendar sync.');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const isEmailValid = emailInput.trim().length > 0 && !validationError;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white p-5 sm:p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0">
                  <GoogleGIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Auto-fill with Google
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    1-Click booking autofill & Google Calendar synchronization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 max-h-[calc(85vh-120px)] overflow-y-auto space-y-5">
            {/* Remembered Accounts Section (if any) */}
            {savedAccounts.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Select a Remembered Google Account
                </label>
                <div className="space-y-2">
                  {savedAccounts.map((acc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full text-left p-3 rounded-xl border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-emerald-100 text-neutral-700 group-hover:text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 transition-colors">
                          {acc.firstName ? acc.firstName[0].toUpperCase() : 'G'}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-neutral-900 group-hover:text-emerald-900 truncate">
                            {acc.firstName || acc.lastName ? `${acc.firstName} ${acc.lastName}`.trim() : 'Google User'}
                          </p>
                          <p className="text-[11px] text-neutral-500 group-hover:text-emerald-700 truncate font-mono">
                            {acc.email}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                        <span>Auto-fill</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-neutral-400 font-medium">or enter details</span>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Account Form */}
            <form onSubmit={handleApplyCurrent} className="space-y-4">
              {/* Google Email Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <GoogleGIcon className="w-3.5 h-3.5" />
                    <span>Your Google Account Email <span className="text-brand-red">*</span></span>
                  </label>
                  {isEmailValid && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified Google Account
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="yourname@gmail.com"
                    autoFocus
                    className={`w-full bg-neutral-50 border rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-neutral-900 focus:outline-none transition-all ${
                      validationError
                        ? 'border-brand-red ring-2 ring-brand-red/20 bg-rose-50/40'
                        : isEmailValid
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                          : 'border-neutral-200 focus:border-brand-red focus:bg-white'
                    }`}
                  />
                  {!emailInput.includes('@') && emailInput.trim().length > 1 && (
                    <button
                      type="button"
                      onClick={handleAppendGmail}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md text-[11px] font-semibold text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                      title="Append @gmail.com"
                    >
                      + @gmail.com
                    </button>
                  )}
                </div>

                {validationError && (
                  <p className="text-[11px] text-brand-red mt-1.5 flex items-start gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </p>
                )}

                {suggestion && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-xs text-amber-900 font-medium">
                      Did you mean <strong>{suggestion}</strong>?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput(suggestion);
                        setSuggestion(null);
                        setValidationError(null);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply Fix
                    </button>
                  </div>
                )}
              </div>

              {/* Student Name Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      value={firstNameInput}
                      onChange={(e) => setFirstNameInput(e.target.value)}
                      placeholder="e.g. Sana"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      placeholder="e.g. Sindhi"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:border-brand-red focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Phone (Optional) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="0412 345 678"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:border-brand-red focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Benefits highlight card */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-1.5">
                <div className="flex items-center gap-2 text-neutral-900 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>What Google Account sync gives you:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-neutral-600 pl-5 list-disc">
                  <li>Instant Google Calendar invitation with RMS test and lesson location</li>
                  <li>Live booking receipts & tax invoice delivered to your primary inbox</li>
                  <li>Guaranteed RMS instructor dispatch notifications without spam filter drops</li>
                </ul>
              </div>

              {oAuthNotice && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{oAuthNotice}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={!isEmailValid}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                    isEmailValid
                      ? 'bg-brand-black hover:bg-brand-red text-white hover:shadow-brand-red/20 active:scale-[0.98]'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <GoogleGIcon className="w-4 h-4" />
                  <span>Apply & Auto-fill Booking</span>
                  <Check className="w-4 h-4" />
                </button>

                {onSignInOAuth && (
                  <button
                    type="button"
                    onClick={handleOAuthClick}
                    disabled={isOAuthLoading}
                    className="py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm border border-neutral-300 hover:bg-neutral-50 text-neutral-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {isOAuthLoading ? (
                      <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    <span>Sign in with Google</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
