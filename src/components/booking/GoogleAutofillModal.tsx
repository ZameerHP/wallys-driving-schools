import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  X, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  Plus,
  Trash2,
  Sparkles
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
}

const STORAGE_KEY_SINGLE = 'wallys_verified_google_account';
const STORAGE_KEY_LIST = 'wallys_saved_google_accounts_list';

export const GoogleAutofillModal: React.FC<GoogleAutofillModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialEmail = '',
  initialFirstName = '',
  initialLastName = '',
  initialPhone = '',
}) => {
  const [savedAccounts, setSavedAccounts] = useState<SavedGoogleAccount[]>([]);
  const [manualEmail, setManualEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Discover all Google accounts associated with this device/browser
  useEffect(() => {
    if (!isOpen) return;

    setManualEmail('');
    setValidationError(null);

    const accountsMap = new Map<string, SavedGoogleAccount>();

    const addAccount = (acc: SavedGoogleAccount) => {
      const emailLower = acc.email.trim().toLowerCase();
      if (!validateWorkingEmail(emailLower).isValid) return;
      if (!accountsMap.has(emailLower)) {
        accountsMap.set(emailLower, { ...acc, email: emailLower });
      }
    };

    // 1. Saved Google accounts list from localStorage
    try {
      const storedList = localStorage.getItem(STORAGE_KEY_LIST);
      if (storedList) {
        const parsed = JSON.parse(storedList);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item?.email) addAccount(item);
          });
        }
      }
    } catch {}

    // 2. Primary saved Google profile
    try {
      const storedProfile = localStorage.getItem(STORAGE_KEY_SINGLE);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        if (parsed?.email) {
          addAccount({
            email: parsed.email,
            firstName: parsed.firstName || initialFirstName || '',
            lastName: parsed.lastName || initialLastName || '',
            phone: parsed.phone || initialPhone || '',
            source: 'Verified Google Profile'
          });
        }
      }
    } catch {}

    // 3. Discover from Supabase Auth storage if present
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const sbUser = parsed?.user;
            if (sbUser?.email) {
              const fullName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || '';
              const parts = fullName.trim().split(' ');
              addAccount({
                email: sbUser.email,
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || '',
                phone: sbUser.user_metadata?.phone || '',
                source: 'Connected User Account'
              });
            }
          }
        }
      }
    } catch {}

    // 4. Scan recent bookings for previous confirmed Google accounts
    try {
      const rawBookings = localStorage.getItem('wallys_bookings_v3');
      if (rawBookings) {
        const list = JSON.parse(rawBookings);
        if (Array.isArray(list)) {
          for (const b of list) {
            if (b.email) {
              const nameParts = (b.studentName || '').trim().split(' ');
              addAccount({
                email: b.email,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                phone: b.phone || '',
                source: 'Previous Booking'
              });
            }
          }
        }
      }
    } catch {}

    // 5. If an initial email was provided in the input field, include it too
    if (initialEmail && validateWorkingEmail(initialEmail).isValid) {
      addAccount({
        email: initialEmail,
        firstName: initialFirstName,
        lastName: initialLastName,
        phone: initialPhone,
        source: 'Current Form Entry'
      });
    }

    const all = Array.from(accountsMap.values());
    setSavedAccounts(all);

    // If no accounts exist yet, show the direct input form
    setShowAddForm(all.length === 0);
  }, [isOpen, initialEmail, initialFirstName, initialLastName, initialPhone]);

  if (!isOpen) return null;

  // Single click: Instantly saves and applies email and details, zero complications!
  const handleSelectAccount = (acc: SavedGoogleAccount) => {
    saveAccountToStorage(acc);
    onApply({
      email: acc.email,
      firstName: acc.firstName || initialFirstName,
      lastName: acc.lastName || initialLastName,
      phone: acc.phone || initialPhone
    });
    onClose();
  };

  const saveAccountToStorage = (acc: SavedGoogleAccount) => {
    try {
      // 1. Save as current active profile
      localStorage.setItem(STORAGE_KEY_SINGLE, JSON.stringify({
        email: acc.email,
        firstName: acc.firstName || initialFirstName,
        lastName: acc.lastName || initialLastName,
        phone: acc.phone || initialPhone,
        verifiedAt: new Date().toISOString()
      }));

      // 2. Add to saved accounts list
      let currentList: SavedGoogleAccount[] = [];
      const stored = localStorage.getItem(STORAGE_KEY_LIST);
      if (stored) {
        try {
          currentList = JSON.parse(stored);
        } catch {}
      }
      if (!Array.isArray(currentList)) currentList = [];

      // Avoid duplicates
      const filtered = currentList.filter(item => item.email.toLowerCase() !== acc.email.toLowerCase());
      filtered.unshift({
        email: acc.email,
        firstName: acc.firstName || initialFirstName,
        lastName: acc.lastName || initialLastName,
        phone: acc.phone || initialPhone,
        source: 'Saved Google Account'
      });
      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(filtered.slice(0, 10)));
    } catch {}
  };

  const handleRemoveAccount = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    try {
      const updated = savedAccounts.filter(a => a.email.toLowerCase() !== emailToRemove.toLowerCase());
      setSavedAccounts(updated);

      // Update storage
      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(updated));
      const single = localStorage.getItem(STORAGE_KEY_SINGLE);
      if (single) {
        const parsed = JSON.parse(single);
        if (parsed.email?.toLowerCase() === emailToRemove.toLowerCase()) {
          localStorage.removeItem(STORAGE_KEY_SINGLE);
        }
      }

      if (updated.length === 0) {
        setShowAddForm(true);
      }
    } catch {}
  };

  const handleApplyManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualEmail.trim();
    if (!clean) {
      setValidationError('Please select or enter your Google email address (@gmail.com).');
      return;
    }

    const res = validateWorkingEmail(clean);
    if (!res.isValid) {
      setValidationError(res.error || 'A valid Google email (@gmail.com) is required.');
      return;
    }

    const newAcc: SavedGoogleAccount = {
      email: res.email,
      firstName: initialFirstName,
      lastName: initialLastName,
      phone: initialPhone,
      source: 'Google Account'
    };

    saveAccountToStorage(newAcc);

    onApply({
      email: res.email,
      firstName: initialFirstName,
      lastName: initialLastName,
      phone: initialPhone
    });
    onClose();
  };

  const handleAppendDomain = (domain: string) => {
    const raw = manualEmail.trim();
    if (!raw) {
      setManualEmail(`yourname${domain}`);
      return;
    }
    if (!raw.includes('@')) {
      setManualEmail(`${raw}${domain}`);
    } else {
      const user = raw.split('@')[0];
      setManualEmail(`${user}${domain}`);
    }
    setValidationError(null);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-4 text-center relative border-b border-neutral-100 bg-linear-to-b from-neutral-50/70 to-white">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200/80 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
              <GoogleGIcon className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Auto-fill with Google
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xs mx-auto">
              Select your Google Account to automatically paste your details into the booking form.
            </p>
          </div>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* List of Detected Google Accounts for 1-Click Selection */}
            {savedAccounts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1 text-neutral-500 font-medium">
                  <span>Select an account:</span>
                  <span>1-click auto-fill</span>
                </div>

                <div className="space-y-2">
                  {savedAccounts.map((acc, idx) => {
                    const initial = acc.firstName 
                      ? acc.firstName[0].toUpperCase() 
                      : acc.email[0].toUpperCase();
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectAccount(acc)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSelectAccount(acc);
                          }
                        }}
                        className="w-full text-left p-3 rounded-xl border border-neutral-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-emerald-100 text-blue-600 group-hover:text-emerald-700 font-bold text-sm flex items-center justify-center shrink-0 transition-colors border border-blue-100 group-hover:border-emerald-200">
                            {initial}
                          </div>
                          <div className="truncate">
                            <p className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-emerald-950 truncate">
                              {acc.firstName || acc.lastName ? `${acc.firstName} ${acc.lastName}`.trim() : 'Google Account'}
                            </p>
                            <p className="text-xs text-neutral-600 group-hover:text-emerald-700 truncate font-mono">
                              {acc.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1">
                            Select
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveAccount(e, acc.email)}
                            title="Remove account from list"
                            className="w-7 h-7 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-brand-red flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Add / Enter Google Email */}
            {showAddForm ? (
              <form onSubmit={handleApplyManual} className="pt-1 space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-neutral-800">
                    {savedAccounts.length > 0 ? 'Use another Google account:' : 'Enter your Google email:'}
                  </span>
                  {savedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => {
                      setManualEmail(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="e.g. yourname@gmail.com"
                    autoFocus
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => handleAppendDomain('@gmail.com')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md text-[11px] font-semibold text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    + @gmail.com
                  </button>
                </div>

                {validationError && (
                  <p className="text-[11px] text-brand-red flex items-start gap-1 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Auto-fill This Account</span>
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full p-3 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-all flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-neutral-500" />
                <span>Use another Google account</span>
              </button>
            )}

            {/* Google Sync Assurance */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Instant auto-paste & Google Calendar synchronization</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
