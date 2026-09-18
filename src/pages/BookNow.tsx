import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Clock, 
  User, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  ArrowLeft, 
  ArrowRight,
  Plus, 
  Trash2, 
  CreditCard, 
  Check, 
  Calendar,
  Calendar as CalendarIcon, 
  Package as PackageIcon, 
  Layers, 
  ShoppingCart, 
  Lock, 
  AlertCircle,
  MapPin,
  ExternalLink,
  ChevronRight as ChevronRightIcon,
  HelpCircle,
  Menu,
  X,
  CalendarOff,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { addBooking, createBookingInDb, BookingItem } from '../lib/bookings';
import PaymentsStep from '../components/booking/PaymentsStep';
import ErrorBoundary from '../components/ErrorBoundary';
import { validateInternationalPhone, validateWorkingEmail } from '../lib/validation';
import { Country, DEFAULT_COUNTRY } from '../lib/countries';
import { PhoneInputWithCountry } from '../components/PhoneInputWithCountry';
import { useAuth } from '../context/AuthContext';
import { PACKAGES } from '../lib/content';
import { GoogleAutofillModal, GoogleGIcon } from '../components/booking/GoogleAutofillModal';
import { 
  getPackageSpecs, 
  generateSlotsForDuration, 
  checkSlotAvailability, 
  ScheduledLesson,
  formatDurationDisplay,
  SlotPeriod
} from '../lib/bookingSlots';
import { computeDisabledDays, DayAvailabilityResponse, MonthAvailabilityDay, AvailabilitySlotItem } from '../types/availability';
import { fetchTimeOffBlocks, isTimeOffBlockDeleted, getLocalTimeOffBlocks, normalizeDateKey } from '../lib/timeOff';

// --- DATA DEFINITIONS BASED ON LIVE SITE ---



const NSW_SUBURBS = [
  { suburb: 'Rooty Hill', postcode: '2766' },
  { suburb: 'Blacktown', postcode: '2148' },
  { suburb: 'Mount Druitt', postcode: '2770' },
  { suburb: 'Plumpton', postcode: '2761' },
  { suburb: 'Doonside', postcode: '2767' },
  { suburb: 'Quakers Hill', postcode: '2763' },
  { suburb: 'Glenwood', postcode: '2768' },
  { suburb: 'Stanhope Gardens', postcode: '2768' },
  { suburb: 'The Ponds', postcode: '2769' },
  { suburb: 'Schofields', postcode: '2762' },
  { suburb: 'Riverstone', postcode: '2765' },
  { suburb: 'Kellyville Ridge', postcode: '2155' },
  { suburb: 'Rouse Hill', postcode: '2155' },
  { suburb: 'Marsden Park', postcode: '2765' },
  { suburb: 'Colebee', postcode: '2761' },
  { suburb: 'Dean Park', postcode: '2761' },
  { suburb: 'Glendenning', postcode: '2761' },
  { suburb: 'Hassall Grove', postcode: '2761' },
  { suburb: 'Oakhurst', postcode: '2761' },
  { suburb: 'Minchinbury', postcode: '2770' },
  { suburb: 'Eastern Creek', postcode: '2766' },
  { suburb: 'St Marys', postcode: '2760' },
  { suburb: 'Colyton', postcode: '2760' },
  { suburb: 'Oxley Park', postcode: '2760' },
  { suburb: 'St Clair', postcode: '2759' },
  { suburb: 'Erskine Park', postcode: '2759' },
  { suburb: 'Kings Langley', postcode: '2147' },
  { suburb: 'Lalor Park', postcode: '2147' },
  { suburb: 'Seven Hills', postcode: '2147' },
  { suburb: 'Prospect', postcode: '2148' },
  { suburb: 'Toongabbie', postcode: '2146' },
  { suburb: 'Wentworthville', postcode: '2145' },
  { suburb: 'Pendle Hill', postcode: '2145' },
  { suburb: 'Girraween', postcode: '2145' },
  { suburb: 'Greystanes', postcode: '2145' },
  { suburb: 'Pemulwuy', postcode: '2145' },
  { suburb: 'Wetherill Park', postcode: '2164' },
  { suburb: 'Penrith', postcode: '2750' },
  { suburb: 'Glenmore Park', postcode: '2745' },
  { suburb: 'Cranebrook', postcode: '2749' },
  { suburb: 'Cambridge Park', postcode: '2747' },
  { suburb: 'Werrington', postcode: '2747' },
  { suburb: 'Kingswood', postcode: '2747' }
];

const TEST_CENTRES = [
  { centre: 'St Marys', state: 'NSW', postcode: '2760' },
  { centre: 'Penrith', state: 'NSW', postcode: '2750' },
  { centre: 'Blacktown', state: 'NSW', postcode: '2148' },
  { centre: 'Glenmore Park', state: 'NSW', postcode: '2745' },
  { centre: 'Wetherill Park', state: 'NSW', postcode: '2164' },
  { centre: 'Richmond', state: 'NSW', postcode: '2753' },
  { centre: 'Castle Hill', state: 'NSW', postcode: '2154' }
];

const TIME_SLOTS = [
  { slot: '8:00 AM – 9:00 AM', available: true },
  { slot: '8:30 AM – 9:30 AM', available: true },
  { slot: '9:00 AM – 10:00 AM', available: true },
  { slot: '9:30 AM – 10:30 AM', available: true },
  { slot: '10:00 AM – 11:00 AM', available: true },
  { slot: '10:30 AM – 11:30 AM', available: true },
  { slot: '11:00 AM – 12:00 PM', available: true },
  { slot: '1:00 PM – 2:00 PM', available: true },
  { slot: '2:30 PM – 3:30 PM', available: true },
  { slot: '3:30 PM – 4:30 PM', available: true },
  { slot: '4:00 PM – 5:00 PM', available: true },
  { slot: '5:00 PM – 6:00 PM', available: true }
];

const COUNTRY_CODES = [
  { code: '+61', country: 'AU', label: 'Australia (+61)' }
];

export interface CartItem {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  date: string;
  time: string;
  image: string;
  isPackage?: boolean;
}

export function BookNow() {
  // Ensure the whole viewport root document background is pristine white on Book Now page
  useEffect(() => {
    const prevBg = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#ffffff';
    return () => {
      document.documentElement.style.backgroundColor = prevBg;
    };
  }, []);

  // Isolated Booking Section Scroll & Chaining Prevention
  const bookingScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bookingScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const { deltaY } = e;
      if (!deltaY) return;

      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      const isScrollingUp = deltaY < 0;
      const isScrollingDown = deltaY > 0;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Intercept only when at boundaries so internal scrolling is completely smooth
      // and prevent wheel event from falling through and scrolling the parent page
      if ((atTop && isScrollingUp) || (atBottom && isScrollingDown)) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Navigation & Wizard State
  const [activeStepId, setActiveStepId] = useState<string>('service');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [serviceSearch, setServiceSearch] = useState('');
  
  // Selections
  const [selectedPackage, setSelectedPackage] = useState<any>(PACKAGES[0]);
  
  // Package Specifications
  const packageSpecs = useMemo(() => getPackageSpecs(selectedPackage), [selectedPackage]);

  // Date & Time
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('9:00 AM – 10:00 AM');

  // Multi-Lesson Package Scheduling State (each lesson has distinct Date + Time)
  const [scheduledLessons, setScheduledLessons] = useState<ScheduledLesson[]>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return [{ lessonNumber: 1, date: d.toISOString().split('T')[0], time: '9:00 AM – 10:00 AM' }];
  });
  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);

  // Sync scheduled lessons whenever the selected package changes
  useEffect(() => {
    const specs = getPackageSpecs(selectedPackage);
    const slots = generateSlotsForDuration(specs.durationMinutes);
    const defaultSlot = slots[2]?.slot || slots[0]?.slot || '9:00 AM – 10:00 AM';

    setScheduledLessons(prev => {
      const count = specs.lessonCount;
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 2);

      const next: ScheduledLesson[] = [];
      for (let i = 0; i < count; i++) {
        const existing = prev[i];
        if (existing) {
          const isValid = slots.some(s => s.slot === existing.time);
          next.push({
            lessonNumber: i + 1,
            date: existing.date,
            time: isValid ? existing.time : defaultSlot
          });
        } else {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + (i * 2));
          next.push({
            lessonNumber: i + 1,
            date: d.toISOString().split('T')[0],
            time: defaultSlot
          });
        }
      }
      return next;
    });
    setActiveLessonIndex(0);
  }, [selectedPackage?.id]);

  // Active lesson helper
  const activeLesson = scheduledLessons[activeLessonIndex] || scheduledLessons[0] || {
    lessonNumber: 1,
    date: selectedDate,
    time: selectedTimeSlot
  };

  // Keep selectedDate and selectedTimeSlot in sync with active lesson
  useEffect(() => {
    if (activeLesson) {
      if (activeLesson.date && activeLesson.date !== selectedDate) {
        setSelectedDate(activeLesson.date);
      }
      if (activeLesson.time && activeLesson.time !== selectedTimeSlot) {
        setSelectedTimeSlot(activeLesson.time);
      }
    }
  }, [activeLessonIndex, activeLesson?.date, activeLesson?.time]);

  // Cart Items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'cart-init-1',
      title: '1 Hour Driving Lesson',
      subtitle: 'Driving Lessons (1h, 1 person)',
      price: 65.00,
      date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      time: '9:00 AM – 10:00 AM',
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=400',
      isPackage: false
    }
  ]);
  const [expandedCartItem, setExpandedCartItem] = useState<string | null>('cart-init-1');

  // Authentication & Google Account Integration
  const auth = useAuth();

  // Student Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [isGoogleVerified, setIsGoogleVerified] = useState(false);
  const [isGoogleAutofillModalOpen, setIsGoogleAutofillModalOpen] = useState(false);
  const [autofillSuccessNotice, setAutofillSuccessNotice] = useState<string | null>(null);

  // Helper to load saved verified Google profile from localStorage
  const getSavedGoogleAccount = () => {
    try {
      const stored = localStorage.getItem('wallys_verified_google_account');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email && validateWorkingEmail(parsed.email).isValid) {
          return parsed;
        }
      }
    } catch {}
    return null;
  };

  // Auto-fill from authenticated Google account or saved profile if available
  useEffect(() => {
    if (auth?.user?.email && !email) {
      const gEmail = auth.user.email;
      setEmail(gEmail);
      setIsGoogleVerified(true);
      const fullName = auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || '';
      if (fullName) {
        const parts = fullName.trim().split(' ');
        if (!firstName) setFirstName(parts[0] || '');
        if (!lastName && parts.length > 1) setLastName(parts.slice(1).join(' ') || '');
      }
      return;
    }

    // Check if user has previously saved a verified Google account on this device
    if (!email) {
      const saved = getSavedGoogleAccount();
      if (saved?.email) {
        setEmail(saved.email);
        setIsGoogleVerified(true);
        if (saved.firstName && !firstName) setFirstName(saved.firstName);
        if (saved.lastName && !lastName) setLastName(saved.lastName);
        if (saved.phone && !phone) setPhone(saved.phone);
      }
    }
  }, [auth?.user]);

  const handleAutofillWithGoogle = () => {
    // Open the Google Account Selector modal for 1-click account selection & auto-paste
    setIsGoogleAutofillModalOpen(true);
  };

  const handleApplyGoogleAutofill = (data: { email: string; firstName: string; lastName: string; phone?: string }) => {
    setEmail(data.email);
    setEmailTouched(true);
    setIsGoogleVerified(true);
    // Reset verification status if a new email is selected
    setIsEmailVerified(false);
    setVerifiedEmailAddress(null);
    setVerificationToken(null);
    setCodeSent(false);
    setVerificationCode('');
    setVerificationSuccessMsg(null);
    setVerificationError(null);
    if (data.firstName) setFirstName(data.firstName);
    if (data.lastName) setLastName(data.lastName);
    if (data.phone) setPhone(data.phone);
    setInfoErrors(prev => {
      const copy = { ...prev };
      delete copy.email;
      return copy;
    });
    setAutofillSuccessNotice(`✓ Auto-filled with Google Account: ${data.email}`);
    setTimeout(() => setAutofillSuccessNotice(null), 6000);
  };

  // Real Email Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmailAddress, setVerifiedEmailAddress] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 60-second cooldown timer for code resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSendVerificationCode = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailTouched(true);
      setInfoErrors(prev => ({ ...prev, email: 'Please enter your email address first.' }));
      setVerificationError('Please enter an email address before requesting a code.');
      return;
    }

    const emailCheck = validateWorkingEmail(cleanEmail);
    if (!emailCheck.isValid) {
      setEmailTouched(true);
      setInfoErrors(prev => ({ ...prev, email: emailCheck.error || 'Please enter a valid email address.' }));
      setVerificationError(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    setIsSendingCode(true);
    setVerificationError(null);
    setVerificationSuccessMsg(null);

    try {
      const res = await fetch('/api/email-verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailCheck.email })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerificationError(data.message || 'Unable to send the verification code. Please try again.');
        if (data.cooldownSeconds) {
          setResendCooldown(data.cooldownSeconds);
        }
        return;
      }

      setCodeSent(true);
      setVerificationCode('');
      setVerificationSuccessMsg('Verification code sent to your email.');
      setResendCooldown(data.cooldownSeconds || 60);
    } catch (err: any) {
      setVerificationError('Unable to send the verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    const cleanCode = verificationCode.replace(/\D/g, '').trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setVerificationError('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingCode(true);
    setVerificationError(null);

    try {
      const res = await fetch('/api/email-verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: cleanCode
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerificationError(data.message || 'Invalid verification code. Please try again.');
        return;
      }

      // Mark verified
      setIsEmailVerified(true);
      setVerifiedEmailAddress(email.trim().toLowerCase());
      setVerificationToken(data.verificationToken || null);
      setVerificationSuccessMsg('✓ Email verified successfully');
      setVerificationError(null);
      setCodeSent(false);
    } catch (err: any) {
      setVerificationError('An error occurred during verification. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryCode, setCountryCode] = useState('+61');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [suburbSearch, setSuburbSearch] = useState('Rooty Hill NSW 2766');
  const [suburbDropdownOpen, setSuburbDropdownOpen] = useState(false);
  const [selectedTestCentre, setSelectedTestCentre] = useState('St Marys NSW 2760');
  const [testCentreDropdownOpen, setTestCentreDropdownOpen] = useState(false);
  const [testTime, setTestTime] = useState('');
  const [infoErrors, setInfoErrors] = useState<{ [key: string]: string }>({});
  const [bookedSlots, setBookedSlots] = useState<{ date: string; time: string; status?: string; isFullDay?: boolean; reason?: string }[]>(() => {
    try {
      const cached = getLocalTimeOffBlocks();
      const initialSlots: { date: string; time: string; status?: string; isFullDay?: boolean; reason?: string }[] = [];
      if (Array.isArray(cached)) {
        for (const b of cached) {
          const norm = normalizeDateKey(b.date);
          if (norm) {
            const isFull = Boolean(b.isFullDay) || (!b.startTime && !b.endTime);
            if (isFull) {
              initialSlots.push({
                date: norm,
                time: 'Full Day Off',
                status: 'Blocked',
                isFullDay: true,
                reason: b.reason || 'Instructor Day Off'
              });
            } else if (b.startTime && b.endTime) {
              initialSlots.push({
                date: norm,
                time: `${b.displayStartTime || b.startTime} - ${b.displayEndTime || b.endTime}`,
                status: 'Blocked',
                isFullDay: false,
                reason: b.reason || 'Instructor Unavailable'
              });
            }
          }
        }
      }
      return initialSlots;
    } catch {
      return [];
    }
  });
  const [blockedOffDays, setBlockedOffDays] = useState<Map<string, { isFullDay: boolean; reason?: string }>>(() => {
    const map = new Map<string, { isFullDay: boolean; reason?: string }>();
    try {
      const cached = getLocalTimeOffBlocks();
      if (Array.isArray(cached)) {
        for (const b of cached) {
          const norm = normalizeDateKey(b.date);
          if (norm) {
            const isFull = Boolean(b.isFullDay) || (!b.startTime && !b.endTime);
            if (isFull) {
              map.set(norm, { isFullDay: true, reason: b.reason || 'Instructor Day Off' });
            }
          }
        }
      }
    } catch {}
    return map;
  });
  const [operatingSettings, setOperatingSettings] = useState<{
    operatingHours?: any;
    dateOverrides?: any[];
    bufferMinutes?: number;
    timezone?: string;
    disabledDays?: number[];
  }>(() => {
    try {
      const cached = localStorage.getItem('wallys_operating_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.operatingHours) {
          return {
            ...parsed,
            disabledDays: Array.isArray(parsed.disabledDays) ? parsed.disabledDays : computeDisabledDays(parsed.operatingHours)
          };
        }
        if (parsed?.settings?.operatingHours) {
          return {
            ...parsed.settings,
            disabledDays: Array.isArray(parsed.settings.disabledDays) ? parsed.settings.disabledDays : (Array.isArray(parsed.disabledDays) ? parsed.disabledDays : computeDisabledDays(parsed.settings.operatingHours))
          };
        }
      }
    } catch {}
    return {
      operatingHours: {
        monday: { enabled: true, label: 'Monday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
        tuesday: { enabled: true, label: 'Tuesday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
        wednesday: { enabled: true, label: 'Wednesday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
        thursday: { enabled: true, label: 'Thursday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
        friday: { enabled: true, label: 'Friday', periods: [{ start: '08:00 AM', end: '06:00 PM' }] },
        saturday: { enabled: true, label: 'Saturday', periods: [{ start: '08:00 AM', end: '05:00 PM' }] },
        sunday: { enabled: true, label: 'Sunday', periods: [{ start: '08:00 AM', end: '05:00 PM' }] }
      },
      disabledDays: [],
      bufferMinutes: 15,
      timezone: 'Australia/Sydney'
    };
  });
  const [isRefreshingSlots, setIsRefreshingSlots] = useState(false);
  const [slotConflictError, setSlotConflictError] = useState<string | null>(null);
  const [monthAvailability, setMonthAvailability] = useState<Record<string, MonthAvailabilityDay>>({});
  const [selectedDayAvailability, setSelectedDayAvailability] = useState<DayAvailabilityResponse | null>(null);
  const [isLoadingMonthAvail, setIsLoadingMonthAvail] = useState(false);

  // Determine if Car Hire package is selected
  const isCarHire = Boolean(selectedPackage?.id?.includes('test') || selectedPackage?.label?.toLowerCase().includes('car hire') || selectedPackage?.title?.toLowerCase().includes('car hire'));

  // Helper to normalize any date format (YYYY-MM-DD, DD/MM/YYYY, '15 September 2026')
  const normalizeDateStr = (rawDate: string): string => {
    if (!rawDate) return '';
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // Format: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const MONTHS: Record<string, string> = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    };

    // Format: "15 September 2026", "15 September", "15 Sep 2026"
    const textMatch1 = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:,?\s+(\d{4}))?$/i);
    if (textMatch1) {
      const day = textMatch1[1].padStart(2, '0');
      const mon = textMatch1[2].toLowerCase();
      const month = MONTHS[mon];
      const year = textMatch1[3] || new Date().getFullYear().toString();
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }

    // Format: "September 15, 2026", "September 15"
    const textMatch2 = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);
    if (textMatch2) {
      const mon = textMatch2[1].toLowerCase();
      const day = textMatch2[2].padStart(2, '0');
      const month = MONTHS[mon];
      const year = textMatch2[3] || new Date().getFullYear().toString();
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return trimmed.toLowerCase();
  };

  // Robust time parser handling ranges & single timestamps
  const parseTime = (timeStr: string, defaultDurationMinutes = 60): { start: number; end: number } | null => {
    if (!timeStr) return null;
    const clean = timeStr.trim().replace(/\s+/g, ' ');

    const rangeMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i) ||
                       clean.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);

    if (rangeMatch) {
      const parsePart = (hStr: string, mStr: string | undefined, ampmStr: string | undefined) => {
        let h = parseInt(hStr, 10);
        const m = mStr ? parseInt(mStr, 10) : 0;
        const ampm = (ampmStr || '').toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };

      let startAmpm = rangeMatch[3];
      let endAmpm = rangeMatch[6];

      const startH = parseInt(rangeMatch[1], 10);
      const endH = parseInt(rangeMatch[4], 10);

      // If neither has AM/PM, infer daytime driving school hours (7:00 AM - 7:00 PM)
      if (!startAmpm && !endAmpm) {
        startAmpm = (startH >= 7 && startH <= 12) ? 'AM' : 'PM';
        endAmpm = (endH >= 7 && endH <= 12) ? 'AM' : 'PM';
      } else if (!startAmpm && endAmpm) {
        if (endAmpm.toUpperCase() === 'PM' && startH <= endH && startH >= 12) {
          startAmpm = 'PM';
        } else if (endAmpm.toUpperCase() === 'PM' && startH > endH && startH <= 12) {
          startAmpm = 'AM';
        } else {
          startAmpm = endAmpm;
        }
      } else if (startAmpm && !endAmpm) {
        if (startAmpm.toUpperCase() === 'AM' && endH < startH) {
          endAmpm = 'PM';
        } else {
          endAmpm = startAmpm;
        }
      }

      const start = parsePart(rangeMatch[1], rangeMatch[2], startAmpm);
      const end = parsePart(rangeMatch[4], rangeMatch[5], endAmpm);
      return { start, end: end > start ? end : start + defaultDurationMinutes };
    }

    const singleMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (singleMatch) {
      let h = parseInt(singleMatch[1], 10);
      const m = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
      let ampm = (singleMatch[3] || '').toUpperCase();
      if (!ampm) {
        ampm = (h >= 7 && h <= 12) ? 'AM' : 'PM';
      }
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const start = h * 60 + m;
      return { start, end: start + defaultDurationMinutes };
    }

    return null;
  };

  // Fetch owner/instructor blocked days with zero caching and resilient cloud/localStorage fallback
  const refreshBlockedDays = useCallback(async () => {
    try {
      const blocks = await fetchTimeOffBlocks();
      const map = new Map<string, { isFullDay: boolean; reason?: string }>();
      const partialBlockSlots: Array<{ date: string; time: string; status: string; isFullDay: boolean; reason?: string }> = [];

      if (Array.isArray(blocks)) {
        for (const b of blocks) {
          const norm = normalizeDateStr(b.date);
          // Skip if this block was recently deleted / tombstoned
          if (isTimeOffBlockDeleted(b.id, b.date) || (norm && isTimeOffBlockDeleted(b.id, norm))) {
            continue;
          }

          const isFullDay = Boolean(b.isFullDay) || (b as any).isFullDay === 'true' || (!b.startTime && !b.endTime);
          if (norm) {
            if (isFullDay) {
              map.set(norm, { isFullDay: true, reason: b.reason || 'Instructor Day Off' });
            } else if (b.startTime && b.endTime) {
              partialBlockSlots.push({
                date: norm,
                time: `${b.displayStartTime || b.startTime} - ${b.displayEndTime || b.endTime}`,
                status: 'Blocked',
                isFullDay: false,
                reason: b.reason || 'Instructor Unavailable'
              });
            }
          }
        }
      }
      setBlockedOffDays(map);

      // If partial blocks exist, integrate them into bookedSlots to block overlapping slots without doubling
      if (partialBlockSlots.length > 0) {
        setBookedSlots(prev => {
          const combined = [...prev, ...partialBlockSlots];
          return combined.filter((s, idx, arr) => {
            const sNorm = normalizeDateStr(s.date);
            return arr.findIndex(other => normalizeDateStr(other.date) === sNorm && other.time === s.time) === idx;
          });
        });
      }
    } catch (err) {
      console.warn('Failed to load blocked off days:', err);
    }
  }, []);

  // Authoritative month availability fetcher (Single Source of Truth)
  const fetchMonthAvailability = useCallback(async (year: number, month: number) => {
    try {
      setIsLoadingMonthAvail(true);
      const res = await fetch(`/api/availability/month?year=${year}&month=${month}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.days) {
          setMonthAvailability(data.days);
        }
      }
    } catch (err) {
      console.warn('Failed to load month availability:', err);
    } finally {
      setIsLoadingMonthAvail(false);
    }
  }, []);

  // Authoritative day availability fetcher
  const fetchDayAvailability = useCallback(async (targetDate: string, duration: number = 60) => {
    if (!targetDate) return;
    try {
      setIsRefreshingSlots(true);
      const norm = normalizeDateStr(targetDate);
      const res = await fetch(`/api/availability?date=${encodeURIComponent(norm)}&duration=${duration}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: DayAvailabilityResponse = await res.json();
        setSelectedDayAvailability(data);
        if (Array.isArray(data.bookedSlots)) {
          setBookedSlots(data.bookedSlots);
        }
      }
    } catch (err) {
      console.warn('Failed to load day availability:', err);
    } finally {
      setIsRefreshingSlots(false);
    }
  }, []);

  // Fetch month availability when selected month/year changes
  useEffect(() => {
    fetchMonthAvailability(selectedYear, selectedMonth + 1);
  }, [selectedYear, selectedMonth, fetchMonthAvailability]);

  // Fetch day availability when selected date or package duration changes
  useEffect(() => {
    if (selectedDate) {
      fetchDayAvailability(selectedDate, packageSpecs.durationMinutes);
    }
  }, [selectedDate, packageSpecs.durationMinutes, fetchDayAvailability]);

  // Real-time availability loader with zero cache
  const refreshAvailability = useCallback(async (targetDate?: string) => {
    fetchMonthAvailability(selectedYear, selectedMonth + 1);
    if (targetDate || selectedDate) {
      fetchDayAvailability(targetDate || selectedDate, packageSpecs.durationMinutes);
    }
    refreshBlockedDays();
  }, [fetchMonthAvailability, selectedYear, selectedMonth, selectedDate, packageSpecs.durationMinutes, fetchDayAvailability, refreshBlockedDays]);

  // Fetch instructor weekly operating hours and overrides
  const refreshOperatingHours = useCallback(async () => {
    try {
      const cached = localStorage.getItem('wallys_operating_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.operatingHours || parsed.settings?.operatingHours)) {
          const s = parsed.operatingHours ? parsed : parsed.settings;
          const computedDisabled = computeDisabledDays(s.operatingHours);
          setOperatingSettings(prev => ({
            ...prev,
            ...s,
            operatingHours: s.operatingHours || prev.operatingHours,
            disabledDays: Array.isArray(s.disabledDays) ? s.disabledDays : (Array.isArray(parsed.disabledDays) ? parsed.disabledDays : computedDisabled),
            bufferMinutes: typeof s.bufferMinutes === 'number' ? s.bufferMinutes : prev.bufferMinutes
          }));
        }
      }
    } catch {}

    try {
      const res = await fetch(`/api/availability/operating-hours?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const computedDisabled = computeDisabledDays(data.operatingHours || data.settings?.operatingHours);
        setOperatingSettings(prev => ({
          ...prev,
          ...data,
          operatingHours: data.operatingHours || data.settings?.operatingHours || prev.operatingHours,
          disabledDays: Array.isArray(data.disabledDays) ? data.disabledDays : computedDisabled
        }));
        try {
          localStorage.setItem('wallys_operating_settings', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.warn('Failed to fetch operating hours:', err);
    }
  }, []);

  // Compute exact operating status and active periods for any calendar date
  const getDayOperatingInfo = useCallback((dateStr: string): { isClosed: boolean; isDayOff: boolean; periods: SlotPeriod[]; reason?: string } => {
    if (!dateStr) return { isClosed: false, isDayOff: false, periods: [{ start: '08:00 AM', end: '06:00 PM' }] };

    const norm = normalizeDateStr(dateStr);

    // 1. Authoritative check from centralized backend month availability
    const monthDay = monthAvailability[norm];
    if (monthDay) {
      return {
        isClosed: !monthDay.isOpen,
        isDayOff: Boolean(monthDay.isDayOff),
        periods: monthDay.isOpen ? [{ start: '08:00 AM', end: '06:00 PM' }] : [],
        reason: monthDay.reasonIfUnavailable
      };
    }

    // 2. Check explicit Time Off / Blocked Days
    if (norm && blockedOffDays.has(norm)) {
      return { 
        isClosed: true, 
        isDayOff: true,
        periods: [], 
        reason: blockedOffDays.get(norm)?.reason || 'Instructor Day Off' 
      };
    }

    // 3. Check full-day blocks in bookedSlots
    const hasFullDayBooking = bookedSlots.some(b => {
      if (b.status === 'Cancelled') return false;
      if (normalizeDateStr(b.date) !== norm) return false;
      const cleanTime = (b.time || '').trim().toLowerCase();
      return Boolean((b as any).isFullDay) || cleanTime === 'full day off' || cleanTime.includes('day off') || cleanTime === 'all day' || cleanTime === 'full_day' || cleanTime === 'full';
    });
    if (hasFullDayBooking) {
      return { isClosed: true, isDayOff: true, periods: [], reason: 'Instructor Day Off' };
    }

    // 4. Check custom Date Overrides
    const overrides = operatingSettings.dateOverrides || [];
    const override = overrides.find(o => normalizeDateStr(o.date) === norm);
    if (override) {
      if (override.type === 'unavailable' || override.isFullDay) {
        return { isClosed: true, isDayOff: true, periods: [], reason: override.reason || 'Instructor unavailable' };
      }
      if (override.periods && override.periods.length > 0) {
        return { isClosed: false, isDayOff: false, periods: override.periods, reason: override.reason };
      }
    }

    // 5. Check weekly Operating Hours
    const parts = norm.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const dayIdx = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = dayNames[dayIdx];
      const dayConfig = operatingSettings.operatingHours?.[dayKey];

      if (operatingSettings.disabledDays && operatingSettings.disabledDays.includes(dayIdx)) {
        return { isClosed: true, isDayOff: false, periods: [], reason: `Closed on ${dayConfig?.label || dayKey}s` };
      }

      if (dayConfig) {
        if (!dayConfig.enabled || !dayConfig.periods || dayConfig.periods.length === 0) {
          return { isClosed: true, isDayOff: false, periods: [], reason: `Closed on ${dayConfig.label || dayKey}s` };
        }
        return { isClosed: false, isDayOff: false, periods: dayConfig.periods };
      }
    }

    return { isClosed: false, isDayOff: false, periods: [{ start: '08:00 AM', end: '05:00 PM' }] };
  }, [monthAvailability, operatingSettings, blockedOffDays, bookedSlots]);

  // Helper to find next non-blocked, upcoming available date
  const findNextAvailableDate = useCallback((startDateStr: string, blockedMap: Map<string, { isFullDay: boolean; reason?: string }>, offsetDays = 0) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + 2 + offsetDays);

    for (let i = 0; i < 90; i++) {
      const candidate = new Date(base);
      candidate.setDate(base.getDate() + i);
      const y = candidate.getFullYear();
      const m = String(candidate.getMonth() + 1).padStart(2, '0');
      const d = String(candidate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayInfo = getDayOperatingInfo(dateStr);
      if (!blockedMap.has(dateStr) && !dayInfo.isClosed) {
        return dateStr;
      }
    }
    return startDateStr;
  }, [getDayOperatingInfo]);

  // Immediately refresh availability when customer changes date
  useEffect(() => {
    if (selectedDate) {
      refreshAvailability(selectedDate);
    }
  }, [selectedDate, refreshAvailability]);

  // Initial load and continuous sync of blocked days and availability
  useEffect(() => {
    refreshBlockedDays();
    refreshAvailability();
    refreshOperatingHours();
    const timer = setInterval(() => {
      refreshAvailability();
      refreshBlockedDays();
      refreshOperatingHours();
    }, 8000);

    const handleSync = (e?: any) => {
      let detail = e?.detail || e?.data;
      if (!detail && e?.key === 'wallys_availability_ping' && e?.newValue) {
        try {
          detail = JSON.parse(e.newValue);
        } catch {}
      }
      if (!detail) {
        try {
          const rawPing = localStorage.getItem('wallys_availability_ping');
          if (rawPing) detail = JSON.parse(rawPing);
        } catch {}
      }

      // 1. Instantly update operating hours state for zero-latency calendar day fading
      const incomingHours = detail?.operatingHours 
        || detail?.operatingSettings?.operatingHours 
        || detail?.settings?.operatingHours;

      if (incomingHours) {
        const op = detail.operatingSettings || detail.settings || detail;
        const compDisabled = Array.isArray(op.disabledDays) 
          ? op.disabledDays 
          : (Array.isArray(detail.disabledDays) ? detail.disabledDays : computeDisabledDays(incomingHours));
        
        setOperatingSettings(prev => ({
          ...prev,
          ...op,
          operatingHours: incomingHours,
          disabledDays: compDisabled,
          bufferMinutes: typeof op.bufferMinutes === 'number' ? op.bufferMinutes : prev.bufferMinutes
        }));

        try {
          localStorage.setItem('wallys_operating_settings', JSON.stringify({
            ...op,
            operatingHours: incomingHours,
            disabledDays: compDisabled
          }));
        } catch {}
      } else {
        try {
          const cached = localStorage.getItem('wallys_operating_settings');
          if (cached) {
            const parsed = JSON.parse(cached);
            const s = parsed.operatingHours ? parsed : parsed.settings;
            if (s?.operatingHours) {
              const compDisabled = Array.isArray(s.disabledDays) ? s.disabledDays : (Array.isArray(parsed.disabledDays) ? parsed.disabledDays : computeDisabledDays(s.operatingHours));
              setOperatingSettings(prev => ({
                ...prev,
                ...s,
                operatingHours: s.operatingHours,
                disabledDays: compDisabled,
                bufferMinutes: typeof s.bufferMinutes === 'number' ? s.bufferMinutes : prev.bufferMinutes
              }));
            }
          }
        } catch {}
      }

      // 2. Optimistically add newly blocked days if received in payload
      if ((detail?.action === 'added' || detail?.action === 'created' || detail?.action === 'updated') && (detail?.block || detail?.date)) {
        const b = detail.block || { date: detail.date, isFullDay: true };
        const bNorm = normalizeDateStr(b.date);
        if (bNorm && (Boolean(b.isFullDay) || (!b.startTime && !b.endTime))) {
          setBlockedOffDays(prev => {
            const next = new Map(prev);
            next.set(bNorm, { isFullDay: true, reason: b.reason || 'Instructor Day Off' });
            return next;
          });
        }
      }

      const removedDate = detail?.date;
      const removedNorm = detail?.normDate || (removedDate ? normalizeDateStr(removedDate) : null);

      // Instantly unblock the day from local state if deleted
      setBlockedOffDays(prev => {
        const next = new Map(prev);
        if (removedDate) next.delete(removedDate);
        if (removedNorm) next.delete(removedNorm);
        for (const k of next.keys()) {
          if (isTimeOffBlockDeleted(undefined, k)) {
            next.delete(k);
          }
        }
        return next;
      });

      // Clear any day off / full day blocked slots from bookedSlots
      setBookedSlots(prev => prev.filter(b => {
        const bNorm = normalizeDateStr(b.date);
        if (isTimeOffBlockDeleted(undefined, b.date) || (bNorm && isTimeOffBlockDeleted(undefined, bNorm))) {
          const cleanTime = (b.time || '').trim().toLowerCase();
          return !Boolean((b as any).isFullDay) && cleanTime !== 'full_day' && !cleanTime.includes('day off') && b.status !== 'Blocked';
        }
        if (bNorm === removedNorm || b.date === removedDate) {
          const cleanTime = (b.time || '').trim().toLowerCase();
          return !Boolean((b as any).isFullDay) && cleanTime !== 'full_day' && !cleanTime.includes('day off') && b.status !== 'Blocked';
        }
        return true;
      }));

      // Clear any conflict banner if selected date was the removed date
      if (selectedDate && (normalizeDateStr(selectedDate) === removedNorm || selectedDate === removedDate || isTimeOffBlockDeleted(undefined, selectedDate))) {
        setSlotConflictError(null);
      }

      refreshBlockedDays();
      refreshAvailability();
      refreshOperatingHours();
    };

    window.addEventListener('wallys-availability-updated', handleSync);
    window.addEventListener('wallys-operating-hours-updated', handleSync);
    window.addEventListener('storage', handleSync);

    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('wallys-availability-channel');
        channel.onmessage = (msg) => handleSync(msg);
      }
    } catch {}

    return () => {
      clearInterval(timer);
      window.removeEventListener('wallys-availability-updated', handleSync);
      window.removeEventListener('wallys-operating-hours-updated', handleSync);
      window.removeEventListener('storage', handleSync);
      try {
        channel?.close();
      } catch {}
    };
  }, [refreshAvailability, refreshBlockedDays, refreshOperatingHours]);

  // Auto-advance away from blocked days or closed days if initial or selected date is off
  useEffect(() => {
    const norm = normalizeDateStr(selectedDate);
    const dayInfo = getDayOperatingInfo(selectedDate);
    const isSelectedClosed = dayInfo.isClosed || (norm ? blockedOffDays.has(norm) : false);

    if (isSelectedClosed) {
      const nextDate = findNextAvailableDate(selectedDate, blockedOffDays);
      if (nextDate && nextDate !== selectedDate) {
        setSelectedDate(nextDate);
        setSelectedTimeSlot('');
        setScheduledLessons(prev => {
          const next = [...prev];
          if (next[activeLessonIndex]) {
            next[activeLessonIndex] = {
              ...next[activeLessonIndex],
              date: nextDate,
              time: ''
            };
          }
          return next;
        });
      }
    }

    setScheduledLessons(prev => {
      let changed = false;
      const updated = prev.map((l, idx) => {
        const lNorm = normalizeDateStr(l.date);
        const lDayInfo = getDayOperatingInfo(l.date);
        if ((lNorm && blockedOffDays.has(lNorm)) || lDayInfo.isClosed) {
          changed = true;
          const nextDate = findNextAvailableDate(l.date, blockedOffDays, idx);
          return {
            ...l,
            date: nextDate || l.date
          };
        }
        return l;
      });
      return changed ? updated : prev;
    });
  }, [blockedOffDays, findNextAvailableDate, selectedDate, activeLessonIndex, getDayOperatingInfo]);
  
  // Determine if a slot is available based on DB bookings + 30 min buffer
  const isSlotAvailable = useCallback((date: string, time: string) => {
    const t1 = parseTime(time);
    if (!t1) return true;
    const targetNorm = normalizeDateStr(date);

    for (const b of bookedSlots) {
      if (b.status === 'Cancelled') continue;
      const bNorm = normalizeDateStr(b.date);
      if (bNorm === targetNorm) {
        const t2 = parseTime(b.time);
        if (t2) {
          const buffer = b.status === 'Blocked' ? 0 : 30;
          if (t1.start < t2.end + buffer && t1.end > t2.start - buffer) {
            return false;
          }
        } else if (b.time.trim().toLowerCase() === time.trim().toLowerCase()) {
          return false;
        }
      }
    }
    return true;
  }, [bookedSlots]);

  // Generate dynamic slots based on package duration and instructor operating hours for the selected date
  const availableSlotsForPackage = useMemo(() => {
    const norm = normalizeDateStr(selectedDate);
    if (selectedDayAvailability && normalizeDateStr(selectedDayAvailability.date) === norm) {
      if (!selectedDayAvailability.isOpen) return [];
      return selectedDayAvailability.availableSlots;
    }
    const dayInfo = getDayOperatingInfo(selectedDate);
    if (dayInfo.isClosed) return [];
    return generateSlotsForDuration(packageSpecs.durationMinutes, dayInfo.periods);
  }, [selectedDayAvailability, selectedDate, getDayOperatingInfo, packageSpecs.durationMinutes]);

  // Check availability including self-conflict within the same multi-lesson package and instructor operating hours
  const getSlotAvailabilityStatus = useCallback((slotStr: string) => {
    const norm = normalizeDateStr(selectedDate);

    // 1. Check self-conflict within the same multi-lesson package
    if (packageSpecs.lessonCount > 1) {
      const conflictingLesson = scheduledLessons.find(
        l => l.lessonNumber !== activeLesson.lessonNumber &&
             normalizeDateStr(l.date) === norm &&
             l.time === slotStr
      );
      if (conflictingLesson) {
        return {
          available: false,
          reason: 'self_conflict',
          conflictingLesson: conflictingLesson.lessonNumber,
          conflictReason: `Already selected for Lesson ${conflictingLesson.lessonNumber}`
        };
      }
    }

    // 2. Authoritative slot status from single source of truth backend
    if (selectedDayAvailability && normalizeDateStr(selectedDayAvailability.date) === norm) {
      if (!selectedDayAvailability.isOpen) {
        return {
          available: false,
          reason: selectedDayAvailability.isDayOff ? 'time_off' : 'closed',
          conflictReason: selectedDayAvailability.reasonIfUnavailable || 'Instructor unavailable on this date'
        };
      }
      const match = selectedDayAvailability.availableSlots.find(s => s.slot === slotStr || s.time === slotStr);
      if (match) {
        return {
          available: match.available,
          reason: match.available ? undefined : (match.reason?.toLowerCase().includes('instructor') || match.reason?.toLowerCase().includes('time off') ? 'time_off' : 'booked'),
          conflictReason: match.reason
        };
      }
    }

    const dayInfo = getDayOperatingInfo(selectedDate);
    return checkSlotAvailability(
      selectedDate,
      slotStr,
      bookedSlots,
      packageSpecs.lessonCount > 1 ? scheduledLessons : undefined,
      packageSpecs.lessonCount > 1 ? activeLesson.lessonNumber : undefined,
      {
        bufferMinutes: operatingSettings.bufferMinutes ?? 15,
        operatingPeriods: dayInfo.periods,
        isClosed: dayInfo.isClosed,
        reason: dayInfo.reason
      }
    );
  }, [selectedDate, selectedDayAvailability, packageSpecs.lessonCount, scheduledLessons, activeLesson.lessonNumber, getDayOperatingInfo, bookedSlots, operatingSettings.bufferMinutes]);

  // Update date for the currently active lesson
  const handleSelectCalendarDate = (dateStr: string) => {
    const dayInfo = getDayOperatingInfo(dateStr);
    if (dayInfo.isClosed) {
      setSlotConflictError(`Cannot book on ${dateStr}: Instructor is unavailable (${dayInfo.reason || 'Closed'}). Please select an open date.`);
      return;
    }

    const norm = normalizeDateStr(dateStr);
    if (blockedOffDays.has(norm)) {
      const reason = blockedOffDays.get(norm)?.reason || 'Owner Day Off';
      setSlotConflictError(`Cannot book on ${dateStr}: Blocked off by the instructor (${reason}). Please select an available date.`);
      return;
    }
    setSelectedDate(dateStr);
    refreshAvailability(dateStr);
    setSlotConflictError(null);
    setScheduledLessons(prev => {
      const next = [...prev];
      if (next[activeLessonIndex]) {
        next[activeLessonIndex] = {
          ...next[activeLessonIndex],
          date: dateStr
        };
      }
      return next;
    });
  };

  // Update time for the currently active lesson
  const handleSelectTimeSlot = (slotStr: string) => {
    const dayInfo = getDayOperatingInfo(selectedDate);
    if (dayInfo.isClosed) {
      setSlotConflictError(`Cannot select time: Instructor is unavailable on ${selectedDate} (${dayInfo.reason || 'Closed'}). Please choose an open date.`);
      return;
    }

    const status = getSlotAvailabilityStatus(slotStr);
    if (!status.available) {
      if (status.reason === 'time_off') {
        setSlotConflictError(`Instructor is unavailable for ${slotStr} (${status.conflictReason || 'Scheduled time off'}). Please choose an available time slot.`);
      } else {
        setSlotConflictError(`Time slot ${slotStr} is already booked. Please choose an available time slot.`);
      }
      return;
    }
    setSelectedTimeSlot(slotStr);
    setSlotConflictError(null);
    setScheduledLessons(prev => {
      const next = [...prev];
      if (next[activeLessonIndex]) {
        next[activeLessonIndex] = {
          ...next[activeLessonIndex],
          time: slotStr
        };
      }
      return next;
    });
  };


  // URL params for Stripe redirection
  const [searchParams] = useSearchParams();

  // Stable booking reference for current checkout flow
  const [activeBookingRef, setActiveBookingRef] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('wallys_active_booking_ref');
      if (saved && saved.startsWith('WD-')) return saved;
    } catch {}
    const newRef = `WD-${Math.floor(1000 + Math.random() * 9000)}`;
    try { sessionStorage.setItem('wallys_active_booking_ref', newRef); } catch {}
    return newRef;
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{ configured: boolean; mode: string; message: string } | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeNotice, setStripeNotice] = useState<string | null>(null);

  // Success / Confirmation
  const [confirmedBooking, setConfirmedBooking] = useState<BookingItem | null>(null);
  const [serviceLearnMoreModal, setServiceLearnMoreModal] = useState<any | null>(null);

  // Query backend Stripe status and verify return sessions
  useEffect(() => {
    // 1. Check Stripe API connection status
    fetch('/api/stripe/status')
      .then(res => res.json())
      .then(data => setStripeStatus(data))
      .catch(() => setStripeStatus({ configured: false, mode: 'none', message: 'Unable to check status' }));

    // 2. Check if returning from a successful Stripe Checkout session
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      setIsProcessing(true);
      fetch(`/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`)
        .then(res => res.json())
        .then(data => {
          setIsProcessing(false);
          if (data && data.paymentStatus === 'paid') {
            const meta = data.metadata || {};
            const verifiedBooking = addBooking({
              studentName: meta.studentName || data.customerName || 'Student Driver',
              phone: meta.studentPhone || 'Contact details provided',
              email: data.customerEmail || 'student@example.com',
              suburb: meta.pickupAddress || 'Sydney NSW',
              packageTitle: meta.serviceTitle || 'Driving Lesson',
              packagePrice: data.amountTotal || 65,
              date: meta.bookingDate || new Date().toISOString().split('T')[0],
              time: meta.bookingTime || 'Scheduled Session',
              status: 'Pending',
              notes: `Stripe Checkout Paid (${data.id}). Amount: $${data.amountTotal} AUD. Instructor: ${meta.instructorName || 'Fast Track Instructor'}`
            });
            setConfirmedBooking(verifiedBooking);
            setActiveStepId('payment');
          } else {
            setStripeError('Payment was not completed. Please try again.');
          }
        })
        .catch(err => {
          setIsProcessing(false);
          console.error("Failed to verify Stripe checkout session:", err);
          setStripeError('Could not verify payment session. If you were charged, please contact us.');
        });
    }

    // 3. Check if returning from cancelled Stripe Checkout
    if (searchParams.get('cancelled') === 'true') {
      setActiveStepId('payment');
      setStripeNotice('Payment was cancelled. You can retry when you are ready.');
    }
  }, [searchParams]);

  // 5 Canonical Wizard Steps (Service Selection -> Date & Time -> Cart -> Your Information -> Payments)
  const steps = useMemo(() => {
    return [
      { id: 'service', label: 'Service Selection', icon: Layers },
      { id: 'datetime', label: 'Date & Time', icon: CalendarIcon },
      { id: 'cart', label: 'Cart', icon: ShoppingCart },
      { id: 'info', label: 'Your Information', icon: User },
      { id: 'payment', label: 'Payments', icon: CreditCard }
    ];
  }, []);

  const currentStepIndex = steps.findIndex(s => s.id === activeStepId);

  // Helper to step forward/backward
  const goToNextStep = async () => {
    if (activeStepId === 'service') {
      setActiveStepId('datetime');
    } else if (activeStepId === 'datetime') {
      // Validate that every lesson in multi-lesson package has a selected date and time
      const incomplete = scheduledLessons.find(l => !l.date || !l.time);
      if (incomplete) {
        setSlotConflictError(`Please select a date and time for Lesson ${incomplete.lessonNumber} of ${packageSpecs.lessonCount}.`);
        setActiveLessonIndex(incomplete.lessonNumber - 1);
        return;
      }

      // Check if any scheduled lesson is on a day blocked off by the owner or closed
      const blockedLesson = scheduledLessons.find(l => {
        const norm = normalizeDateStr(l.date);
        const dayInfo = getDayOperatingInfo(l.date);
        return dayInfo.isClosed || (norm ? blockedOffDays.has(norm) : false);
      });
      if (blockedLesson) {
        const dayInfo = getDayOperatingInfo(blockedLesson.date);
        const reason = dayInfo.reason || blockedOffDays.get(normalizeDateStr(blockedLesson.date))?.reason || 'Instructor Day Off / Closed';
        setSlotConflictError(`Lesson ${blockedLesson.lessonNumber} is scheduled on ${blockedLesson.date}, which is unavailable (${reason}). Please select an open date on the calendar.`);
        setActiveLessonIndex(blockedLesson.lessonNumber - 1);
        return;
      }

      // Authoritative batch availability check against database
      try {
        const checkRes = await fetch('/api/check-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessons: scheduledLessons })
        });
        if (!checkRes.ok) {
          const checkData = await checkRes.json();
          setSlotConflictError(checkData.message || "One or more of your selected lesson times are no longer available. Please choose another time.");
          refreshAvailability(selectedDate);
          return;
        }
      } catch (err) {
        console.warn('Real-time batch slot check warning:', err);
      }

      // Sync or update cart item
      const itemTitle = selectedPackage?.title || '1 Hour Driving Lesson';
      const itemPrice = selectedPackage?.price || 65.00;
      const itemImg = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=400';
      
      const updatedCart: CartItem[] = [
        {
          id: `item-${Date.now()}`,
          title: itemTitle,
          subtitle: packageSpecs.lessonCount > 1
            ? `${packageSpecs.lessonCount} Lessons (${packageSpecs.lessonCount * 3} Log Book Hours)`
            : (selectedPackage?.label || selectedPackage?.category || 'Driving Lessons'),
          price: itemPrice,
          date: scheduledLessons[0]?.date || selectedDate,
          time: scheduledLessons[0]?.time || selectedTimeSlot,
          image: itemImg,
          isPackage: true
        }
      ];
      setCartItems(updatedCart);
      setActiveStepId('cart');
    } else if (activeStepId === 'cart') {
      setActiveStepId('info');
    } else if (activeStepId === 'info') {
      const isCarHire = Boolean(selectedPackage?.id?.includes('test') || selectedPackage?.label?.toLowerCase().includes('car hire') || selectedPackage?.title?.toLowerCase().includes('car hire'));
      // Validate mandatory fields
      const errors: { [key: string]: string } = {};
      if (!firstName.trim()) errors.firstName = 'First name is required';
      if (!lastName.trim()) errors.lastName = 'Last name is required';

      // Strict real working email check
      const emailCheck = validateWorkingEmail(email);
      setEmailTouched(true);
      if (!emailCheck.isValid) {
        errors.email = emailCheck.error || 'Please enter a valid working email address';
        setEmailSuggestion(emailCheck.suggestion || null);
      } else {
        setEmailSuggestion(null);
      }

      // Phone number check with international country code support
      const phoneCheck = validateInternationalPhone(phone, selectedCountry.dialCode);
      if (!phoneCheck.isValid) {
        errors.phone = phoneCheck.error || 'Please enter a valid phone number';
      }

      if (!address.trim()) errors.address = 'Pickup address is required';
      if (!suburbSearch.trim()) errors.suburb = 'Service suburb is required';
      if (isCarHire && !selectedTestCentre.trim()) {
        errors.testCentre = 'Please select a test centre for your car hire';
      }

      if (Object.keys(errors).length > 0) {
        setInfoErrors(errors);
        return;
      }

      // Enforce verified email before moving forward to Payment
      const normalizedEmail = emailCheck.email.toLowerCase().trim();
      if (!isEmailVerified || verifiedEmailAddress !== normalizedEmail || !verificationToken) {
        setVerificationError('Please verify your email before completing your booking.');
        const emailEl = document.getElementById('student-email-input');
        if (emailEl) {
          emailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Authoritative database check right before proceeding to Payment
      try {
        const checkRes = await fetch('/api/check-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessons: scheduledLessons,
            email: emailCheck.email,
            phone: phoneCheck.formatted
          })
        });
        if (!checkRes.ok) {
          const checkData = await checkRes.json();
          setSlotConflictError(checkData.message || "One or more of your selected lesson times are no longer available. Please select another time.");
          refreshAvailability(selectedDate);
          setActiveStepId('datetime');
          return;
        }
      } catch (err) {
        console.warn('Real-time check error:', err);
      }

      // Standardize clean values
      setEmail(emailCheck.email);
      if (!isCarHire) {
        setSelectedTestCentre('');
        setTestTime('');
      }
      setPhone(phoneCheck.formatted);
      setInfoErrors({});
      setActiveStepId('payment');
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setActiveStepId(steps[currentStepIndex - 1].id);
    }
  };

  // Service Selection Handlers
  const handleSelectService = (srv: any) => {
    setSelectedPackage(srv);
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return PACKAGES;
    const q = serviceSearch.toLowerCase();
    return PACKAGES.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.category.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  }, [serviceSearch]);

  // Suburb Filter
  const filteredSuburbs = useMemo(() => {
    if (!suburbSearch.trim()) return NSW_SUBURBS;
    const q = suburbSearch.toLowerCase();
    return NSW_SUBURBS.filter(s => 
      s.suburb.toLowerCase().includes(q) || 
      s.postcode.includes(q)
    );
  }, [suburbSearch]);

  // Test Centre Filter
  const filteredTestCentres = useMemo(() => {
    if (!selectedTestCentre.trim()) return TEST_CENTRES;
    const q = selectedTestCentre.toLowerCase();
    const matched = TEST_CENTRES.filter(c => 
      c.centre.toLowerCase().includes(q) || 
      c.postcode.includes(q)
    );
    return matched.length > 0 ? matched : TEST_CENTRES;
  }, [selectedTestCentre]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const year = selectedYear;
    const month = selectedMonth;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    // Adjust to Mon=0 .. Sun=6
    const adjustedStart = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < adjustedStart; i++) {
      days.push({ day: null, isCurrentMonth: false, dateStr: '' });
    }
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isPast = dateObj < today;
      const isSunday = dateObj.getDay() === 0;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        isCurrentMonth: true,
        isPast,
        isSunday,
        dateStr
      });
    }
    return days;
  }, [selectedMonth, selectedYear]);

  // Cart total calculations
  const cartSubtotal = cartItems.reduce((acc, it) => acc + it.price, 0);

  // Submit Final Booking
  const handleConfirmAndPay = async (simulateMock: boolean | React.MouseEvent = false) => {
    const isMock = typeof simulateMock === 'boolean' ? simulateMock : false;
    setIsProcessing(true);
    setStripeError(null);
    setStripeNotice(null);
    setSlotConflictError(null);

    const primaryItem = cartItems[0] || {
      title: selectedPackage?.title || '1 Hour Driving Lesson',
      price: 65,
      date: selectedDate,
      time: selectedTimeSlot
    };

    const targetDate = primaryItem.date || selectedDate;
    const targetTime = primaryItem.time || selectedTimeSlot;

    // Email validation before initiating any payment
    const emailCheck = validateWorkingEmail(email);
    if (!emailCheck.isValid) {
      setIsProcessing(false);
      setEmailTouched(true);
      setInfoErrors(prev => ({ ...prev, email: emailCheck.error || 'A valid email address is required.' }));
      setEmailSuggestion(emailCheck.suggestion || null);
      setActiveStepId('info');
      return;
    }

    // Check if target date or any lesson date is blocked by the owner or closed
    const blockedLesson = scheduledLessons.find(l => {
      const norm = normalizeDateStr(l.date);
      const dayInfo = getDayOperatingInfo(l.date);
      return dayInfo.isClosed || (norm ? blockedOffDays.has(norm) : false);
    });
    if (blockedLesson) {
      setIsProcessing(false);
      const dayInfo = getDayOperatingInfo(blockedLesson.date);
      const reason = dayInfo.reason || blockedOffDays.get(normalizeDateStr(blockedLesson.date))?.reason || 'Instructor Day Off / Closed';
      setSlotConflictError(`Cannot complete booking: Date ${blockedLesson.date} is unavailable (${reason}). Please choose an available date.`);
      setActiveStepId('datetime');
      setActiveLessonIndex(blockedLesson.lessonNumber - 1);
      return;
    }

    // Strict email verification guard before processing payment
    const normalizedEmail = email.toLowerCase().trim();
    if (!isEmailVerified || verifiedEmailAddress !== normalizedEmail || !verificationToken) {
      setIsProcessing(false);
      setVerificationError('Please verify your email before completing your booking.');
      setActiveStepId('info');
      const emailEl = document.getElementById('student-email-input');
      if (emailEl) {
        emailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 1. Authoritative real-time check against database immediately before charging or creating booking
    try {
      const checkRes = await fetch('/api/check-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessons: scheduledLessons,
          email,
          phone: `${countryCode} ${phone}`
        })
      });
      if (!checkRes.ok) {
        const checkData = await checkRes.json();
        setIsProcessing(false);
        setSlotConflictError(checkData.message || "One or more of your selected lesson times are no longer available. Please choose another time.");
        refreshAvailability(targetDate);
        setActiveStepId('datetime');
        return;
      }
    } catch (err) {
      console.warn('Real-time check before submission failed:', err);
    }

    // If card payment and not explicitly simulating mock test, initiate real Stripe Checkout
    if (paymentMethod === 'card' && !isMock) {
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceTitle: primaryItem.title,
            totalAmount: cartSubtotal,
            studentName: `${firstName || 'Learner'} ${lastName || 'Driver'}`.trim(),
            studentEmail: email,
            studentPhone: `${countryCode} ${phone}`,
            pickupAddress: `${address}, ${suburbSearch}`,
            bookingDate: targetDate,
            bookingTime: targetTime,
            instructorName: 'Certified Instructor',
            isPackage: Boolean(selectedPackage),
            packageHours: selectedPackage?.logbookHours || 1,
            lessons: scheduledLessons,
            verificationToken
          })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setIsProcessing(false);
          if (res.status === 409 || data.error === 'SLOT_ALREADY_BOOKED') {
            setSlotConflictError(data.message || "This time slot is no longer available. Please select another time.");
            refreshAvailability(targetDate);
            setActiveStepId('datetime');
            return;
          }
          if (data.error === 'STRIPE_NOT_CONFIGURED') {
            setStripeError('STRIPE_NOT_CONFIGURED');
          } else {
            setStripeError(data.message || 'Payment session could not be created');
          }
          return;
        }

        if (data.url) {
          // Redirect to Stripe's hosted Checkout page (Google Pay, Cards)
          window.location.href = data.url;
          return;
        }
      } catch (err: any) {
        console.error('Error initiating Stripe checkout:', err);
        setIsProcessing(false);
        setStripeError(err?.message || 'Could not connect to payment server. Please verify your connection.');
        return;
      }
    }

    // Cash (Pay in Car) or Mock Simulation
    try {
      const newBooking = await createBookingInDb({
        studentName: `${firstName || 'Learner'} ${lastName || 'Driver'}`.trim(),
        phone: `${countryCode} ${phone || '0400 000 000'}`,
        email: email || 'student@example.com',
        suburb: suburbSearch || 'Rooty Hill NSW 2766',
        pickupAddress: `${address || 'Home pickup'}, ${suburbSearch || ''}`.trim(),
        packageTitle: primaryItem.title,
        packagePrice: cartSubtotal,
        date: targetDate,
        time: targetTime,
        status: 'Pending',
        notes: `Pickup: ${address || 'Home pickup'}. Test Centre: ${selectedTestCentre || 'N/A'}. Test Time: ${testTime || 'Not set'}. Payment: ${simulateMock ? 'MOCK CARD (TEST)' : paymentMethod.toUpperCase()}`,
        lessons: scheduledLessons,
        verificationToken: verificationToken || undefined
      });

      setConfirmedBooking({
        ...newBooking,
        lessons: scheduledLessons
      });
    } catch (err: any) {
      console.error('Error creating booking in DB:', err);
      setSlotConflictError(err?.message || "This time slot is no longer available. Please select another time.");
      refreshAvailability(targetDate);
      setActiveStepId('datetime');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step Summaries for Sidebar
  const getStepSummary = (stepId: string) => {
    if (stepId === 'service' && selectedPackage) {
      return selectedPackage.title;
    }
    if (stepId === 'package' && selectedPackage) {
      return `${selectedPackage?.title} ($${selectedPackage.price.toFixed(2)})`;
    }
    if (stepId === 'datetime') {
      return `${selectedDate}, ${selectedTimeSlot.split('–')[0].trim()}`;
    }
    if (stepId === 'cart') {
      return `${cartItems.length} appointment${cartItems.length > 1 ? 's' : ''} ($${cartSubtotal.toFixed(2)})`;
    }
    if (stepId === 'info' && firstName) {
      return `${firstName} ${lastName}`;
    }
    if (stepId === 'payment') {
      return paymentMethod === 'card' ? 'Credit / Debit Card' : 'Pay In Car';
    }
    return '';
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen bg-white font-sans antialiased text-brand-black flex flex-col pt-[72px] sm:pt-[76px] pb-2 sm:pb-3 lg:overflow-hidden">
      
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex-1 min-h-0 flex flex-col">
        {/* 1. SLEEK COMPACT HEADER (NO HERO IMAGE) */}
        <div className="shrink-0 flex items-center justify-between pb-2 mb-1.5 px-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-red bg-brand-red/10 px-2.5 py-0.5 rounded-full border border-brand-red/20">
              Official Booking
            </span>
            <h1 className="text-base sm:text-lg lg:text-xl font-display font-black text-brand-black tracking-tight">
              BOOK A DRIVING LESSON
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-brand-black/60 font-medium">
            <div className="flex items-center gap-1.5">
              <Link to="/" className="hover:text-brand-red transition-colors">Home</Link>
              <span>/</span>
              <span className="text-brand-red font-semibold">Book Now</span>
            </div>
          </div>
        </div>

        {/* 2. BOOKING WIZARD MAIN CONTAINER */}
        <main className="flex-1 min-h-0 flex flex-col w-full">
        {confirmedBooking ? (
          /* CONFIRMED BOOKING SUCCESS VIEW */
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-black/5 max-w-2xl w-full text-center my-auto"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              {confirmedBooking.paymentStatus === 'paid' ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Status: Booking Confirmed & Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Status: Pending Instructor Confirmation
                </span>
              )}
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-brand-black mb-1.5">
                Thank You, {confirmedBooking.studentName}!
              </h2>
              <p className="text-brand-black/70 text-xs sm:text-sm mb-5 max-w-md mx-auto">
                {confirmedBooking.paymentStatus === 'paid' 
                  ? "Your driving lesson booking is confirmed and payment has been processed. A receipt has been issued and Wallys team has reserved your slot."
                  : "Your driving lesson booking has been received. Wally (Owner & Instructor) will review your appointment and mark it Confirmed in the instructor portal."}
              </p>

              <div className="bg-brand-offwhite rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2 mb-6 border border-black/5">
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <span className="text-brand-black/60">Booking Reference:</span>
                  <span className="font-mono font-bold text-brand-red text-base">#{confirmedBooking.ref || confirmedBooking.bookingRef || 'WD-BOOKING'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <span className="text-brand-black/60">Payment Status:</span>
                  {confirmedBooking.paymentStatus === 'paid' ? (
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-xs uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Paid Online ({confirmedBooking.paymentMethod || 'Card / Google Pay'})
                    </span>
                  ) : (
                    <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 text-xs uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Pending / Pay in Car
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-brand-black/60">Selected Package:</span>
                  <span className="font-bold text-brand-black">{confirmedBooking.packageTitle}</span>
                </div>
                {confirmedBooking.lessons && confirmedBooking.lessons.length > 1 ? (
                  <div className="pt-2 border-t border-black/5">
                    <span className="text-xs font-bold text-brand-black block mb-1.5">
                      Confirmed Lesson Schedule ({confirmedBooking.lessons.length} Lessons):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {confirmedBooking.lessons.map((l: any, idx: number) => (
                        <div key={idx} className="bg-white p-2 rounded-lg border border-black/10 flex justify-between text-xs">
                          <span className="font-bold text-brand-black">Lesson {l.lessonNumber}</span>
                          <span className="text-brand-black/70">{l.date} · {l.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-brand-black/60">Scheduled Date & Time:</span>
                    <span className="font-bold text-brand-black">{confirmedBooking.date} · {confirmedBooking.time}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-brand-black/60">Service Suburb:</span>
                  <span className="font-bold text-brand-black">{confirmedBooking.suburb}</span>
                </div>
                {confirmedBooking.pickupAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-brand-black/60">Pickup Address:</span>
                    <span className="font-bold text-brand-black text-right truncate max-w-[220px]">{confirmedBooking.pickupAddress}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-black/5">
                  <span className="text-brand-black/60">Total Amount:</span>
                  <span className="font-display font-black text-brand-red text-base sm:text-lg">${Number(confirmedBooking.packagePrice || 0).toFixed(2)} AUD</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link 
                  to={`/manage-booking?ref=${encodeURIComponent(confirmedBooking.ref || confirmedBooking.bookingRef || '')}`}
                  className="w-full sm:w-auto bg-brand-red text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-[#c41a21] transition-all duration-300 shadow-md shadow-brand-red/30 flex items-center justify-center gap-2"
                >
                  <span>Manage / Reschedule My Booking</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link 
                  to="/" 
                  className="w-full sm:w-auto bg-white border border-black/15 text-brand-black px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-black/5 transition-all duration-300"
                >
                  Back to Homepage
                </Link>
              </div>
            </motion.div>
          </div>
        ) : (
          /* TWO COLUMN WIZARD LAYOUT */
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch gap-4 sm:gap-5 lg:gap-6">
            
            {/* LEFT COLUMN: SOLID RED VERTICAL STEPPER SIDEBAR (~25%) */}
            <aside 
              className={cn(
                "bg-brand-red text-white rounded-3xl shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden shrink-0 h-full",
                isSidebarCollapsed ? "w-full lg:w-20 p-4" : "w-full lg:w-72 xl:w-80 p-5 lg:p-6"
              )}
            >
              <div className="flex-1 flex flex-col min-h-0">
                {/* Stepper Header (when expanded) */}
                {!isSidebarCollapsed && (
                  <div className="mb-4 pb-3 border-b border-white/30 shrink-0">
                    <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Booking Step</span>
                    <h2 className="text-lg sm:text-xl font-display font-black text-white">
                      Step {currentStepIndex + 1} of {steps.length}
                    </h2>
                  </div>
                )}

                {/* Step List */}
                <nav 
                  data-lenis-prevent
                  className="space-y-3 sm:space-y-3.5 flex-1 overflow-y-auto pr-1 overscroll-contain"
                  style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                >
                  {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const StepIcon = step.icon;
                    const summary = getStepSummary(step.id);

                    return (
                      <div 
                        key={step.id} 
                        onClick={() => {
                          if (idx <= currentStepIndex) {
                            setActiveStepId(step.id);
                          }
                        }}
                        className={cn(
                          "group relative flex items-start gap-3 transition-all rounded-xl cursor-pointer",
                          idx <= currentStepIndex ? "opacity-100" : "opacity-60 cursor-not-allowed",
                          isSidebarCollapsed && "justify-center"
                        )}
                      >
                        {/* Status Indicator Icon with vertical white connecting line */}
                        <div className="pt-0.5 shrink-0 relative flex flex-col items-center">
                          {isCompleted ? (
                            <div className="w-6 h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md relative z-10 font-bold">
                              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                            </div>
                          ) : isCurrent ? (
                            <div className="w-6 h-6 rounded-full border-2 border-white ring-2 ring-white/60 bg-white/30 flex items-center justify-center relative z-10">
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-white/70 bg-white/10 flex items-center justify-center relative z-10">
                              <span className="text-[10px] text-white font-bold">{idx + 1}</span>
                            </div>
                          )}

                          {/* White connecting line between step circles */}
                          {idx < steps.length - 1 && (
                            <div className="w-0.5 bg-white/45 group-hover:bg-white/80 transition-colors absolute top-6 bottom-[-16px] left-1/2 -translate-x-1/2" />
                          )}
                        </div>

                        {/* Label & Dynamic Summary */}
                        {!isSidebarCollapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <StepIcon className="w-4 h-4 text-white/90 shrink-0" />
                              <span className={cn(
                                "text-sm font-bold truncate leading-snug",
                                isCurrent ? "text-white underline underline-offset-4 decoration-white" : "text-white/90"
                              )}>
                                {step.label}
                              </span>
                            </div>
                            
                            {/* Completed One-line Summary */}
                            {isCompleted && summary && (
                              <p className="text-[11px] text-white/85 font-medium truncate mt-0.5 pl-6">
                                {summary}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Support & Sidebar Toggle */}
              <div className="shrink-0 pt-3 border-t border-white/30 space-y-2.5">
                {/* Get In Touch block */}
                {!isSidebarCollapsed && (
                  <div className="bg-white/15 rounded-2xl p-3 text-xs space-y-1.5 backdrop-blur-sm border border-white/20 shadow-sm">
                    <span className="font-bold text-white uppercase tracking-wider text-[10px]">Get In Touch</span>
                    <a 
                      href="mailto:wally@wallysdrivingschool.com.au" 
                      className="flex items-center gap-2 text-white/90 hover:text-white text-[11px] transition-colors truncate"
                    >
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">wally@wallysdrivingschool.com.au</span>
                    </a>
                  </div>
                )}

                {/* Collapse menu toggle */}
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white/90 hover:text-white py-1.5 px-3 rounded-xl border border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                  title={isSidebarCollapsed ? "Expand sidebar" : "Collapse menu"}
                >
                  <Menu className="w-4 h-4" />
                  {!isSidebarCollapsed && <span>Collapse menu</span>}
                </button>
              </div>
            </aside>

            {/* RIGHT COLUMN: ACTIVE STEP CONTENT CARD (~75%) */}
            <div className="flex-1 w-full h-full bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-black/5 relative flex flex-col justify-between min-w-0 overflow-hidden">
              
              {/* Card Header: Back Arrow + Step Title */}
              <div className="shrink-0 flex items-center justify-between pb-3.5 mb-3.5 border-b border-black/5">
                <div className="flex items-center gap-3">
                  {currentStepIndex > 0 && (
                    <button 
                      onClick={goToPrevStep}
                      className="p-1.5 rounded-xl text-brand-black/60 hover:text-brand-black hover:bg-black/5 transition-colors cursor-pointer"
                      title="Back to previous step"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-brand-black">
                      {steps[currentStepIndex]?.label}
                    </h3>
                    <p className="text-brand-black/60 text-xs">
                      {activeStepId === 'service' && 'Choose your desired driving lesson or test car package.'}
                      {activeStepId === 'package' && 'Review your multi-lesson package benefits.'}
                      {activeStepId === 'datetime' && 'Pick your preferred date and half-hour start time slot.'}
                      {activeStepId === 'cart' && 'Review selected bookings or add more before proceeding.'}
                      {activeStepId === 'info' && 'Enter your contact details and serviced NSW suburb.'}
                      {activeStepId === 'payment' && 'Review final order and confirm booking.'}
                    </p>
                  </div>
                </div>

                {/* Live Cart Counter Pill */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite rounded-full border border-black/5 text-xs font-bold text-brand-black/80">
                  <ShoppingCart className="w-3.5 h-3.5 text-brand-red" />
                  <span>Total: ${cartSubtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* CARD BODY: STEP BY STEP CONTENT */}
              <div 
                ref={bookingScrollRef}
                data-lenis-prevent
                className="flex-1 overflow-y-auto pr-1.5 min-h-0 overscroll-contain"
                style={{ 
                  overscrollBehavior: 'contain', 
                  WebkitOverflowScrolling: 'touch', 
                  scrollBehavior: 'smooth' 
                }}
              >
                {/* Real-time Time Slot Conflict Alert */}
                {slotConflictError && (
                  <div className="mb-3 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900 shadow-sm animate-shake">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-sm text-rose-950">Time Slot Unavailable</div>
                      <p className="text-rose-800 mt-0.5 leading-relaxed">{slotConflictError}</p>
                      {activeStepId !== 'datetime' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSlotConflictError(null);
                            setActiveStepId('datetime');
                          }}
                          className="mt-2 text-xs font-bold text-rose-900 bg-rose-200/80 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Choose Another Time Slot
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSlotConflictError(null)}
                      className="text-rose-500 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">

                  {/* ================= STEP 1: SERVICE SELECTION ================= */}
                  {activeStepId === 'service' && (
                    <motion.div 
                      key="step-service"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-black/40" />
                        <input 
                          type="text"
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Search driving lessons, test packages..."
                          className="w-full bg-brand-offwhite border border-black/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-all"
                        />
                        {serviceSearch && (
                          <button 
                            onClick={() => setServiceSearch('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-brand-black/40 hover:text-brand-black"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Responsive Grid of Service Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredServices.map((srv) => {
                          const isSelected = selectedPackage?.id === srv.id;

                          return (
                            <div 
                              key={srv.id}
                              onClick={() => handleSelectService(srv)}
                              className={cn(
                                "p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group bg-white",
                                isSelected 
                                  ? "border-brand-red bg-brand-red/5 ring-2 ring-brand-red/30 shadow-md" 
                                  : "border-black/10 hover:border-black/20 hover:bg-black/[0.02]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img 
                                  src={'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=400'} 
                                  alt={srv.title}
                                  onError={(e) => {
                                    e.currentTarget.src = "/assets/images/about-driving-lesson.jpg";
                                  }}
                                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-black/10" 
                                />
                                <div className="min-w-0">
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-red/10 text-brand-red inline-block mb-0.5">
                                    {srv.category}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-bold text-brand-black truncate leading-tight">
                                    {srv.title}
                                  </h4>
                                  
                                  <div className="flex items-center gap-2.5 text-[11px] text-brand-black/60 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-brand-red" />
                                      {srv.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setServiceLearnMoreModal(srv);
                                      }}
                                      className="text-brand-red hover:underline font-bold"
                                    >
                                      Learn More
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-base sm:text-lg font-display font-black text-brand-black">
                                  ${srv.price.toFixed(2)}
                                </div>
                                <span className="text-[10px] text-brand-black/50 uppercase font-semibold">AUD</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* ================= STEP 2: PACKAGE DETAILS ================= */}
                  {activeStepId === 'package' && selectedPackage && (
                    <motion.div 
                      key="step-package"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="bg-brand-offwhite border border-black/10 rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
                          <div>
                            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wide">
                              Without expiration
                            </span>
                            <h4 className="text-2xl font-display font-bold text-brand-black mt-2">
                              {selectedPackage?.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-brand-black/70 mt-1">
                              {selectedPackage.description}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-3xl font-display font-black text-brand-red">
                              ${selectedPackage.price.toFixed(2)}
                            </span>
                            <span className="block text-xs text-brand-black/50">AUD Total</span>
                          </div>
                        </div>

                        {/* Package Includes List */}
                        <div className="pt-5">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-brand-black/70 mb-3">
                            {selectedPackage?.title} Includes:
                          </h5>
                          <div className="bg-white rounded-xl p-4 border border-black/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center font-bold text-sm">
                                {selectedPackage.quantity}x
                              </div>
                              <div>
                                <span className="font-bold text-sm text-brand-black">{selectedPackage.lessonName}</span>
                                <span className="block text-xs text-brand-black/60">
                                  Includes 1-on-1 dual-control tuition, pick-up & drop-off
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-xs bg-brand-offwhite px-3 py-1 rounded-lg">
                              Qty: {selectedPackage.quantity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-brand-black/60 px-2">
                        <span>Want to switch back to a single lesson?</span>
                        <button 
                          onClick={() => {
                            setSelectedPackage(null);
                            setActiveStepId('service');
                          }}
                          className="font-bold text-brand-red hover:underline"
                        >
                          Change Service
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ================= STEP 3: DATE & TIME ================= */}
                  {activeStepId === 'datetime' && (
                    <motion.div 
                      key="step-datetime"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Multi-Lesson Header & Tabs */}
                      {packageSpecs.lessonCount > 1 ? (
                        <div className="bg-brand-offwhite rounded-2xl p-4 border border-black/10">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-full">
                                  Multi-Lesson Package
                                </span>
                                <h3 className="text-sm sm:text-base font-display font-black text-brand-black">
                                  Schedule Each Lesson Separately
                                </h3>
                              </div>
                              <p className="text-xs text-brand-black/60 mt-0.5">
                                Select a distinct date and start time for every lesson in your {packageSpecs.lessonCount}-lesson package.
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 bg-white border border-black/10 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-black">
                              <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />
                              <span>
                                {scheduledLessons.filter(l => l.date && l.time).length} of {packageSpecs.lessonCount} Scheduled
                              </span>
                            </div>
                          </div>

                          {/* Lesson Selector Pills */}
                          <div className="pt-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-black/50 block mb-2">
                              Select lesson to schedule:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {scheduledLessons.map((l, idx) => {
                                const isActive = idx === activeLessonIndex;
                                const isFilled = Boolean(l.date && l.time);

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setActiveLessonIndex(idx);
                                      setSelectedDate(l.date);
                                      setSelectedTimeSlot(l.time);
                                      refreshAvailability(l.date);
                                      setSlotConflictError(null);
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                                      isActive
                                        ? "bg-brand-red text-white border-brand-red shadow-sm shadow-brand-red/30 scale-105"
                                        : isFilled
                                        ? "bg-white text-brand-black border-black/15 hover:border-brand-red/50 hover:bg-black/5"
                                        : "bg-black/[0.03] text-black/50 border-black/10 hover:border-black/20"
                                    )}
                                  >
                                    <span>Lesson {l.lessonNumber}</span>
                                    {isFilled ? (
                                      <Check className={cn("w-3 h-3", isActive ? "text-white" : "text-emerald-600")} />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Active Lesson Status Banner */}
                          <div className="mt-3 p-2.5 bg-white rounded-xl border border-black/10 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                              <span className="font-bold text-brand-black">
                                Currently Setting Lesson {activeLesson.lessonNumber} of {packageSpecs.lessonCount}:
                              </span>
                              <span className="text-brand-black/70">
                                {activeLesson.date} · {activeLesson.time}
                              </span>
                            </div>
                            {activeLessonIndex < packageSpecs.lessonCount - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextIdx = activeLessonIndex + 1;
                                  setActiveLessonIndex(nextIdx);
                                  const nextL = scheduledLessons[nextIdx];
                                  if (nextL) {
                                    setSelectedDate(nextL.date);
                                    setSelectedTimeSlot(nextL.time);
                                    refreshAvailability(nextL.date);
                                  }
                                }}
                                className="text-brand-red hover:underline font-bold text-xs"
                              >
                                Next Lesson →
                              </button>
                            )}
                          </div>
                        </div>
                      ) : packageSpecs.isContinuousTestPackage ? (
                        /* Continuous Test Package Banner */
                        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                              Continuous {formatDurationDisplay(packageSpecs.durationMinutes)} Test Package Booking Block
                            </h4>
                            <p className="text-[11px] text-amber-900/80 mt-0.5">
                              Includes RMS test car hire + {packageSpecs.durationMinutes === 150 ? '1-hour' : '2-hour'} pre-test warmup lesson. Wallys vehicle is reserved continuously for this entire duration.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* Interactive Calendar (Mon-Sun) */}
                        <div className="lg:col-span-7 bg-brand-offwhite rounded-2xl p-3 sm:p-4 border border-black/10">
                          {/* Month / Year header with arrows */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-white border border-black/10 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-brand-red"
                              >
                                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, idx) => (
                                  <option key={idx} value={idx}>{m}</option>
                                ))}
                              </select>
                              <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-white border border-black/10 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-brand-red"
                              >
                                {[2026, 2027].map((yr) => (
                                  <option key={yr} value={yr}>{yr}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  if (selectedMonth === 0) {
                                    setSelectedMonth(11);
                                    setSelectedYear(prev => prev - 1);
                                  } else {
                                    setSelectedMonth(prev => prev - 1);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-white border border-black/10 hover:bg-black/5 transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (selectedMonth === 11) {
                                    setSelectedMonth(0);
                                    setSelectedYear(prev => prev + 1);
                                  } else {
                                    setSelectedMonth(prev => prev + 1);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-white border border-black/10 hover:bg-black/5 transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Days of Week (Mon-Sun) */}
                          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-brand-black/60 mb-1.5">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                              <div key={d} className="py-0.5">{d}</div>
                            ))}
                          </div>

                          {/* Days Grid */}
                          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                            {calendarDays.map((item, idx) => {
                              if (!item.isCurrentMonth || !item.day || item.day <= 0) {
                                return <div key={idx} className="h-8" aria-hidden="true" />;
                              }
                              const isSelected = selectedDate === item.dateStr;
                              const isUnavailable = item.isPast;

                              // Check if date is marked as instructor/owner Full Day Off or closed via operating hours
                              const dayInfo = getDayOperatingInfo(item.dateStr);
                              const isDayOff = dayInfo.isClosed;
                              const dayOffReason = dayInfo.reason || 'Instructor Closed / Unavailable';

                              // Check if any other lesson is booked on this date
                              const otherLessonsOnDate = packageSpecs.lessonCount > 1 
                                ? scheduledLessons.filter(l => l.date === item.dateStr && l.lessonNumber !== activeLesson.lessonNumber)
                                : [];

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={isUnavailable || isDayOff}
                                  aria-disabled={isUnavailable || isDayOff}
                                  onClick={() => {
                                    if (isUnavailable || isDayOff) return;
                                    if (item.dateStr) {
                                      handleSelectCalendarDate(item.dateStr);
                                    }
                                  }}
                                  title={
                                    isDayOff
                                      ? `Instructor unavailable (${dayOffReason}) - Date blocked`
                                      : isUnavailable
                                      ? "Past date unavailable"
                                      : isSelected
                                      ? "Selected Date"
                                      : `Select ${item.dateStr}`
                                  }
                                  className={cn(
                                    "relative h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-xs select-none",
                                    isDayOff
                                      ? "opacity-15 text-neutral-400/50 cursor-not-allowed line-through pointer-events-none select-none bg-transparent hover:bg-transparent"
                                      : isUnavailable 
                                      ? "text-black/20 cursor-not-allowed line-through"
                                      : isSelected 
                                      ? "bg-brand-red text-white font-bold shadow-md shadow-brand-red/30 scale-105 cursor-pointer" 
                                      : "hover:bg-white text-brand-black hover:shadow-sm cursor-pointer"
                                  )}
                                >
                                  <span>{item.day}</span>
                                  {otherLessonsOnDate.length > 0 && !isSelected && !isDayOff && (
                                    <span 
                                      title={`Lesson ${otherLessonsOnDate.map(l => l.lessonNumber).join(', ')} scheduled`}
                                      className="absolute bottom-0.5 w-1 h-1 rounded-full bg-brand-red"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Calendar Legend */}
                          <div className="mt-2.5 pt-2 border-t border-black/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-brand-black/60">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-brand-red inline-block"></span>
                              <span>Selected</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded bg-neutral-400/40 opacity-25 line-through inline-block"></span>
                              <span>Day Off / Unavailable (Faded)</span>
                            </div>
                          </div>
                        </div>

                        {/* Available Slots Section */}
                        <div className="lg:col-span-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-brand-black/60 block">
                                {packageSpecs.lessonCount > 1 ? `Lesson ${activeLesson.lessonNumber} Slots` : 'Available Slots'} ({selectedDate})
                              </span>
                              <span className="text-[10px] text-brand-black/50 font-semibold">
                                {formatDurationDisplay(packageSpecs.durationMinutes)} each
                              </span>
                            </div>
                            
                            {(() => {
                              // Check if selected date is closed or day off
                              const dayInfo = getDayOperatingInfo(selectedDate);
                              const isSelectedDayClosed = dayInfo.isClosed;
                              const isSelectedDayFullDayOff = dayInfo.isDayOff || (dayInfo.isClosed && (dayInfo.reason?.toLowerCase().includes('day off') || dayInfo.reason?.toLowerCase().includes('time off')));

                              if (isSelectedDayClosed) {
                                const reason = dayInfo.reason || (isSelectedDayFullDayOff ? 'Instructor Day Off' : 'Driving School Closed');
                                return (
                                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs my-2">
                                    <div className="flex items-center gap-2 font-bold mb-1 text-amber-800">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span>{isSelectedDayFullDayOff ? 'Instructor Day Off' : 'Driving School Closed'}</span>
                                    </div>
                                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                                      {reason}. No lesson bookings are permitted on this date ({selectedDate}). Please select another date on the calendar.
                                    </p>
                                  </div>
                                );
                              }

                              if (isRefreshingSlots && !selectedDayAvailability) {
                                return (
                                  <div className="p-8 text-center text-xs text-brand-black/60 my-2">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-red" />
                                    <p className="font-bold">Checking slot availability...</p>
                                  </div>
                                );
                              }

                              const allSlots = availableSlotsForPackage;

                              if (allSlots.length === 0) {
                                return (
                                  <div className="p-5 bg-black/[0.02] rounded-2xl border border-black/5 text-center text-xs text-brand-black/60 my-2">
                                    <CalendarOff className="w-5 h-5 mx-auto mb-1.5 text-black/40" />
                                    <p className="font-bold text-brand-black">No lesson slots available</p>
                                    <p className="text-[11px] text-black/40 mt-0.5">
                                      All times for this date are booked or blocked. Please select another date on the calendar.
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto pr-1">
                                  {allSlots.map((slotObj, idx) => {
                                    const status = getSlotAvailabilityStatus(slotObj.slot);
                                    const isAvailable = status.available;
                                    const isSelected = selectedTimeSlot === slotObj.slot;
                                    const isTimeOff = !isAvailable && status.reason === 'time_off';

                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        disabled={!isAvailable}
                                        onClick={() => {
                                          if (isAvailable) {
                                            handleSelectTimeSlot(slotObj.slot);
                                          }
                                        }}
                                        title={
                                          isTimeOff
                                            ? (status.conflictReason || 'Instructor unavailable during this time window')
                                            : !isAvailable
                                            ? (status.conflictReason || 'Slot already booked')
                                            : `Select ${slotObj.slot}`
                                        }
                                        className={cn(
                                          "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between",
                                          isSelected
                                            ? "bg-brand-red text-white border-brand-red shadow-md cursor-pointer"
                                            : isTimeOff
                                            ? "bg-amber-500/5 text-amber-900/60 border-amber-200/50 cursor-not-allowed select-none"
                                            : !isAvailable
                                            ? "bg-black/[0.03] text-black/30 border-black/5 cursor-not-allowed line-through"
                                            : "bg-white border-black/10 hover:border-brand-red/50 text-brand-black cursor-pointer"
                                        )}
                                      >
                                        <span className="flex items-center gap-2">
                                          <Clock className="w-3.5 h-3.5" />
                                          <span className={cn(!isAvailable && !isTimeOff && "line-through")}>
                                            {slotObj.slot}
                                          </span>
                                        </span>
                                        {isSelected ? (
                                          <Check className="w-3.5 h-3.5" />
                                        ) : isTimeOff ? (
                                          <span className="text-[9px] uppercase font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded no-underline">
                                            Instructor unavailable
                                          </span>
                                        ) : !isAvailable ? (
                                          <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-100/70 px-1.5 py-0.5 rounded no-underline">
                                            {status.reason === 'self_conflict' 
                                              ? `In Lesson ${status.conflictingLesson}` 
                                              : 'Booked'}
                                          </span>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Advance lesson helper */}
                          {packageSpecs.lessonCount > 1 && activeLessonIndex < packageSpecs.lessonCount - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextIdx = activeLessonIndex + 1;
                                setActiveLessonIndex(nextIdx);
                                const nextL = scheduledLessons[nextIdx];
                                if (nextL) {
                                  setSelectedDate(nextL.date);
                                  setSelectedTimeSlot(nextL.time);
                                  refreshAvailability(nextL.date);
                                }
                              }}
                              className="mt-2.5 w-full py-2 px-3 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                              <span>Next: Schedule Lesson {activeLessonIndex + 2} of {packageSpecs.lessonCount}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div className="mt-3 p-2.5 bg-brand-offwhite rounded-xl border border-black/5 text-[11px] text-brand-black/70 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Instructor Wally operates everyday 8:00 AM – 6:00 PM.</span>
                          </div>
                        </div>

                      </div>

                      {/* Multi-Lesson Summary Tray */}
                      {packageSpecs.lessonCount > 1 && (
                        <div className="mt-4 p-3 bg-brand-offwhite rounded-2xl border border-black/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-black/70">
                              Package Schedule Overview ({packageSpecs.lessonCount} Lessons)
                            </span>
                            <span className="text-[11px] font-semibold text-brand-black/50">
                              Click any lesson to adjust its date/time
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {scheduledLessons.map((l, idx) => (
                              <div 
                                key={idx}
                                onClick={() => {
                                  setActiveLessonIndex(idx);
                                  setSelectedDate(l.date);
                                  setSelectedTimeSlot(l.time);
                                  refreshAvailability(l.date);
                                }}
                                className={cn(
                                  "p-2 rounded-xl border text-xs cursor-pointer transition-all",
                                  idx === activeLessonIndex 
                                    ? "bg-white border-brand-red shadow-sm ring-1 ring-brand-red" 
                                    : "bg-white border-black/10 hover:border-black/30"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-brand-black">Lesson {l.lessonNumber}</span>
                                  {l.date && l.time && <Check className="w-3 h-3 text-emerald-600" />}
                                </div>
                                <div className="text-[11px] text-brand-black/70 truncate mt-0.5">
                                  {l.date}
                                </div>
                                <div className="text-[10px] text-brand-black/50 truncate">
                                  {l.time}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ================= STEP 4: CART ================= */}
                  {activeStepId === 'cart' && (
                    <motion.div 
                      key="step-cart"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <p className="text-xs sm:text-sm text-brand-black/70">
                        You can find below the appointments you selected for booking. If you want to book more, click on the button below.
                      </p>

                      <div className="space-y-3">
                        {cartItems.map((item) => {
                          const isExpanded = expandedCartItem === item.id;

                          return (
                            <div 
                              key={item.id}
                              className="border border-black/10 rounded-2xl p-4 bg-brand-offwhite/50 overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={item.image} 
                                    alt={item.title} 
                                    onError={(e) => {
                                      e.currentTarget.src = "/assets/images/about-driving-lesson.jpg";
                                    }}
                                    className="w-14 h-14 rounded-xl object-cover border border-black/10"
                                  />
                                  <div>
                                    <h4 className="text-sm sm:text-base font-bold text-brand-black">{item.title}</h4>
                                    <span className="text-xs text-brand-black/60 flex items-center gap-2 mt-0.5">
                                      <CalendarIcon className="w-3 h-3 text-brand-red" />
                                      {item.date} · {item.time}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-display font-bold text-brand-black">
                                    ${item.price.toFixed(2)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedCartItem(isExpanded ? null : item.id)}
                                    className="p-1 rounded-lg hover:bg-black/5 text-brand-black/60"
                                    title="View appointment details"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              {/* Expand Details */}
                              {isExpanded && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-3 pt-3 border-t border-black/5 text-xs text-brand-black/70"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span>Pickup: Door-to-door in Western Sydney (NSW)</span>
                                      <span className="block text-[11px] text-brand-black/50">Includes dual-control vehicle and certified instructor tuition.</span>
                                    </div>
                                    <button 
                                      onClick={() => setCartItems([])}
                                      className="text-red-500 hover:text-red-700 flex items-center gap-1 font-bold text-xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Remove
                                    </button>
                                  </div>

                                  {/* Multi-Lesson Individual Schedule List */}
                                  {packageSpecs.lessonCount > 1 && (
                                    <div className="mt-3 pt-3 border-t border-black/5">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-brand-black">
                                          Scheduled Lessons ({packageSpecs.lessonCount} Lessons):
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setActiveStepId('datetime')}
                                          className="text-brand-red font-bold text-[11px] hover:underline cursor-pointer"
                                        >
                                          Edit Schedule
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {scheduledLessons.map((l, idx) => (
                                          <div key={idx} className="bg-white p-2 rounded-xl border border-black/10 flex items-center justify-between text-xs">
                                            <span className="font-bold text-brand-black">Lesson {l.lessonNumber}</span>
                                            <span className="text-brand-black/70">{l.date} · {l.time}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* "+ Book another" link */}
                      <div className="pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setActiveStepId('service')}
                          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand-red hover:underline cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Book another</span>
                        </button>

                        <div className="text-right">
                          <span className="text-xs text-brand-black/50 block">Subtotal</span>
                          <span className="text-2xl font-display font-black text-brand-black">${cartSubtotal.toFixed(2)} AUD</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ================= STEP 5: YOUR INFORMATION ================= */}
                  {activeStepId === 'info' && (
                    <motion.div 
                      key="step-info"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Autofill Success Notification */}
                      {autofillSuccessNotice && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold">{autofillSuccessNotice}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAutofillSuccessNotice(null)}
                            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      {/* First Name & Last Name Form Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* First Name */}
                        <div>
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            First Name <span className="text-brand-red">*</span>
                          </label>
                          <input 
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="e.g. John"
                            className={cn(
                              "w-full bg-brand-offwhite border rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white transition-all",
                              infoErrors.firstName ? "border-brand-red" : "border-black/10 focus:border-brand-red"
                            )}
                          />
                          {infoErrors.firstName && <span className="text-[10px] text-brand-red font-semibold">{infoErrors.firstName}</span>}
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            Last Name <span className="text-brand-red">*</span>
                          </label>
                          <input 
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="e.g. Smith"
                            className={cn(
                              "w-full bg-brand-offwhite border rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white transition-all",
                              infoErrors.lastName ? "border-brand-red" : "border-black/10 focus:border-brand-red"
                            )}
                          />
                          {infoErrors.lastName && <span className="text-[10px] text-brand-red font-semibold">{infoErrors.lastName}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Email */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                            <label className="text-xs font-bold text-brand-black/80 uppercase tracking-wider flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              <span>Email Address <span className="text-brand-red">*</span></span>
                            </label>
                            {isEmailVerified ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  Verified
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleAutofillWithGoogle}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300 hover:border-neutral-400 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Auto-fill with your Google Account"
                              >
                                <GoogleGIcon className="w-3.5 h-3.5" />
                                <span>Auto-fill with Google</span>
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input 
                              id="student-email-input"
                              name="email"
                              autoComplete="email"
                              inputMode="email"
                              type="email"
                              value={email}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEmail(val);
                                setEmailTouched(true);
                                if (isEmailVerified || verifiedEmailAddress || codeSent) {
                                  setIsEmailVerified(false);
                                  setVerifiedEmailAddress(null);
                                  setVerificationToken(null);
                                  setCodeSent(false);
                                  setVerificationCode('');
                                  setVerificationSuccessMsg(null);
                                  setVerificationError(null);
                                }
                                if (!val.trim()) {
                                  setEmailSuggestion(null);
                                  setIsGoogleVerified(false);
                                  setInfoErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy.email;
                                    return copy;
                                  });
                                  return;
                                }
                                const res = validateWorkingEmail(val);
                                if (!res.isValid) {
                                  setIsGoogleVerified(false);
                                  setEmailSuggestion(res.suggestion || null);
                                  setInfoErrors(prev => ({ ...prev, email: res.error || 'Please enter a valid email address' }));
                                } else {
                                  setIsGoogleVerified(true);
                                  setEmailSuggestion(null);
                                  setInfoErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy.email;
                                    return copy;
                                  });
                                }
                              }}
                              onBlur={() => {
                                setEmailTouched(true);
                                if (!email.trim()) {
                                  setIsGoogleVerified(false);
                                  setInfoErrors(prev => ({ ...prev, email: 'Email address is required to receive your booking confirmation & code.' }));
                                  return;
                                }
                                const res = validateWorkingEmail(email);
                                if (!res.isValid) {
                                  setIsGoogleVerified(false);
                                  setEmailSuggestion(res.suggestion || null);
                                  setInfoErrors(prev => ({ ...prev, email: res.error || 'Please enter a valid email address' }));
                                } else {
                                  setEmail(res.email);
                                  setIsGoogleVerified(true);
                                  setEmailSuggestion(null);
                                  setInfoErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy.email;
                                    return copy;
                                  });
                                }
                              }}
                              placeholder="name@example.com"
                              className={cn(
                                "w-full bg-brand-offwhite border rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all pr-10",
                                infoErrors.email 
                                  ? "border-brand-red bg-rose-50/50 ring-2 ring-brand-red/20 focus:border-brand-red" 
                                  : isEmailVerified
                                    ? "border-emerald-500 bg-emerald-50/30 focus:border-emerald-600 ring-2 ring-emerald-500/20"
                                    : email.trim() && !infoErrors.email
                                      ? "border-neutral-300 focus:border-brand-red focus:bg-white"
                                      : "border-black/10 focus:border-brand-red focus:bg-white"
                              )}
                            />
                            {isEmailVerified ? (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1" title="Email verified">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              </div>
                            ) : email.trim() && !infoErrors.email ? (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 opacity-60">
                                <Check className="w-4 h-4 text-neutral-400" />
                              </div>
                            ) : (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                <Mail className="w-4 h-4 text-neutral-400" />
                              </div>
                            )}
                          </div>
                          {emailSuggestion && (
                            <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2">
                              <span className="text-[11px] text-amber-900 font-medium">
                                Did you mean <strong>{emailSuggestion}</strong>?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEmail(emailSuggestion);
                                  setEmailSuggestion(null);
                                  setIsGoogleVerified(true);
                                  setIsEmailVerified(false);
                                  setVerifiedEmailAddress(null);
                                  setVerificationToken(null);
                                  setCodeSent(false);
                                  setVerificationCode('');
                                  setVerificationSuccessMsg(null);
                                  setVerificationError(null);
                                  setInfoErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy.email;
                                    return copy;
                                  });
                                }}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded shadow-sm transition-colors cursor-pointer shrink-0"
                              >
                                Use this
                              </button>
                            </div>
                          )}
                          {infoErrors.email && !emailSuggestion && (
                            <div className="flex items-start gap-1.5 text-[11px] text-brand-red font-semibold mt-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{infoErrors.email}</span>
                            </div>
                          )}
                          {/* Real Email Verification Section */}
                          <div className="mt-2.5">
                            {isEmailVerified ? (
                              /* Verified State Badge */
                              <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="text-xs sm:text-sm font-bold text-emerald-900">
                                    Email verified
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                                  Verified
                                </span>
                              </div>
                            ) : !codeSent ? (
                              /* Send Verification Code Button */
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  id="send-verification-code-btn"
                                  onClick={handleSendVerificationCode}
                                  disabled={isSendingCode || !email.trim()}
                                  className={cn(
                                    "inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer shadow-2xs",
                                    "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300 hover:border-neutral-400 active:scale-[0.98]",
                                    (isSendingCode || !email.trim()) && "opacity-60 cursor-not-allowed active:scale-100"
                                  )}
                                >
                                  {isSendingCode ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-red" />
                                      <span>Sending Code...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="w-3.5 h-3.5 text-brand-red" />
                                      <span>Send Verification Code</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              /* Verification Code Input & Action Box */
                              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3 shadow-2xs">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{verificationSuccessMsg || "Verification code sent to your email."}</span>
                                </div>

                                <div>
                                  <label htmlFor="otp-code-input" className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                    Verification Code
                                  </label>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                      id="otp-code-input"
                                      name="verificationOtp"
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      maxLength={6}
                                      placeholder="Enter 6-digit code"
                                      value={verificationCode}
                                      onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setVerificationCode(digits);
                                        if (verificationError) setVerificationError(null);
                                      }}
                                      onPaste={(e) => {
                                        e.preventDefault();
                                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                                        setVerificationCode(pasted);
                                        if (verificationError) setVerificationError(null);
                                      }}
                                      className="flex-1 tracking-[0.2em] font-mono text-sm sm:text-base font-bold text-center sm:text-left px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition-all"
                                    />
                                    <button
                                      type="button"
                                      id="verify-email-btn"
                                      onClick={handleVerifyEmail}
                                      disabled={isVerifyingCode || verificationCode.length !== 6}
                                      className={cn(
                                        "px-5 py-2 bg-brand-red hover:bg-[#c41a21] text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.98]",
                                        (isVerifyingCode || verificationCode.length !== 6) && "opacity-60 cursor-not-allowed active:scale-100"
                                      )}
                                    >
                                      {isVerifyingCode ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          <span>Verifying...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Verify Code</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end text-xs pt-1 border-t border-neutral-200/60">
                                  {resendCooldown > 0 ? (
                                    <span className="text-[11px] font-semibold text-neutral-400">
                                      Resend in {resendCooldown}s
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={handleSendVerificationCode}
                                      disabled={isSendingCode}
                                      className="text-[11px] font-bold text-brand-red hover:underline cursor-pointer transition-colors inline-flex items-center gap-1"
                                    >
                                      <span>Resend Code</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Verification error message */}
                            {verificationError && (
                              <div className="flex items-start gap-1.5 text-[11px] text-brand-red font-semibold mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-red" />
                                <span>{verificationError}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Phone with Country Code Selector */}
                        <div>
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            Phone Number <span className="text-brand-red">*</span>
                          </label>
                          <PhoneInputWithCountry
                            phone={phone}
                            onChangePhone={(val) => {
                              setPhone(val);
                              if (infoErrors.phone) {
                                setInfoErrors(prev => {
                                  const copy = { ...prev };
                                  delete copy.phone;
                                  return copy;
                                });
                              }
                            }}
                            selectedCountry={selectedCountry}
                            onChangeCountry={(country) => {
                              setSelectedCountry(country);
                              setCountryCode(country.dialCode);
                              if (infoErrors.phone) {
                                setInfoErrors(prev => {
                                  const copy = { ...prev };
                                  delete copy.phone;
                                  return copy;
                                });
                              }
                            }}
                            error={infoErrors.phone}
                          />
                        </div>
                      </div>

                      {/* Pickup Street Address */}
                      <div>
                        <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                          Address (Pickup Street Address) <span className="text-brand-red">*</span>
                        </label>
                        <input 
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 14 Railway Street"
                          className={cn(
                            "w-full bg-brand-offwhite border rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white transition-all",
                            infoErrors.address ? "border-brand-red" : "border-black/10 focus:border-brand-red"
                          )}
                        />
                        {infoErrors.address && <span className="text-[10px] text-brand-red font-semibold">{infoErrors.address}</span>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Suburb Searchable Dropdown */}
                        <div className="relative">
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            Please select your suburb from our service areas <span className="text-brand-red">*</span>
                          </label>
                          <input 
                            type="text"
                            value={suburbSearch}
                            onFocus={() => setSuburbDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setSuburbDropdownOpen(false), 200)}
                            onChange={(e) => {
                              setSuburbSearch(e.target.value);
                              setSuburbDropdownOpen(true);
                            }}
                            placeholder="Type suburb or postcode (e.g. Rooty Hill)"
                            className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-all"
                          />
                          
                          {suburbDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-black/10 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30">
                              {filteredSuburbs.map((sub, idx) => (
                                <div 
                                  key={idx}
                                  onClick={() => {
                                    setSuburbSearch(`${sub.suburb} NSW ${sub.postcode}`);
                                    setSuburbDropdownOpen(false);
                                  }}
                                  className="px-4 py-2 text-xs hover:bg-black/5 cursor-pointer flex justify-between"
                                >
                                  <span className="font-semibold text-brand-black">{sub.suburb}</span>
                                  <span className="text-brand-black/50">{sub.postcode}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Test Centre Searchable Dropdown - Shown when Car Hire package is selected */}
                        {isCarHire && (
                        <div className="relative">
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            RMS Test Centre <span className="text-brand-red">*</span>
                          </label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={selectedTestCentre}
                              onFocus={() => setTestCentreDropdownOpen(true)}
                              onBlur={() => setTimeout(() => setTestCentreDropdownOpen(false), 200)}
                              onChange={(e) => {
                                setSelectedTestCentre(e.target.value);
                                setTestCentreDropdownOpen(true);
                                if (infoErrors.testCentre) {
                                  setInfoErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy.testCentre;
                                    return copy;
                                  });
                                }
                              }}
                              placeholder="Select or type test centre (e.g. St Marys)"
                              className={cn(
                                "w-full bg-brand-offwhite border rounded-xl pl-4 pr-10 py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white transition-all",
                                infoErrors.testCentre ? "border-brand-red" : "border-black/10 focus:border-brand-red"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setTestCentreDropdownOpen(prev => !prev)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-black/40 hover:text-brand-black p-1 transition-colors"
                              aria-label="Toggle test centres list"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          {infoErrors.testCentre && <span className="text-[10px] text-brand-red font-semibold">{infoErrors.testCentre}</span>}

                          {testCentreDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-black/10 rounded-xl shadow-xl max-h-52 overflow-y-auto z-30 divide-y divide-black/5">
                              {filteredTestCentres.map((tc, idx) => (
                                <div 
                                  key={idx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSelectedTestCentre(`${tc.centre} NSW ${tc.postcode}`);
                                    setTestCentreDropdownOpen(false);
                                    if (infoErrors.testCentre) {
                                      setInfoErrors(prev => {
                                        const copy = { ...prev };
                                        delete copy.testCentre;
                                        return copy;
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "px-4 py-2.5 text-xs hover:bg-brand-red/5 cursor-pointer flex justify-between items-center transition-colors",
                                    selectedTestCentre.includes(tc.centre) && "bg-brand-red/10 text-brand-red font-semibold"
                                  )}
                                >
                                  <span className="font-semibold">{tc.centre} Service NSW</span>
                                  <span className="text-brand-black/50 text-[11px] font-mono">{tc.state} {tc.postcode}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        )}
                      </div>

                      {/* Test Time (Optional) */}
                      {isCarHire && (
                      <div>
                        <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                          Test Time <span className="text-brand-black/40 font-normal">(optional - if RMS test is booked)</span>
                        </label>
                        <input 
                          type="text"
                          value={testTime}
                          onChange={(e) => setTestTime(e.target.value)}
                          placeholder="e.g. 10:15 AM (if already scheduled with Service NSW)"
                          className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-brand-red focus:bg-white transition-all"
                        />
                      </div>
                      )}
                      
                      {/* Mandatory Disclaimer text */}
                      <p className="text-[11px] text-brand-black/60 italic pt-1">
                        We currently operate only in the suburbs listed above. For other suburbs, please contact us.
                      </p>
                    </motion.div>
                  )}

                  {/* ================= STEP 5: PAYMENTS ================= */}
                  {activeStepId === 'payment' && (
                    <motion.div 
                      key="step-payment"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <ErrorBoundary
                        title="Payment Form Ready"
                        message="Unable to render payment elements in this browser session. You can safely return to the previous step or reload."
                        onReset={() => setActiveStepId('info')}
                      >
                        <PaymentsStep
                          bookingRef={activeBookingRef}
                          items={cartItems.length > 0 ? cartItems.map(it => ({
                            id: it.id,
                            name: it.title,
                            unitPrice: it.price,
                            quantity: 1,
                            lineTotal: it.price
                          })) : [{
                            id: 'default-lesson',
                            name: selectedPackage ? selectedPackage?.title : (selectedPackage?.title || '1 Hour Driving Lesson'),
                            unitPrice: selectedPackage ? selectedPackage.price : (selectedPackage?.price || 65.00),
                            quantity: 1,
                            lineTotal: selectedPackage ? selectedPackage.price : (selectedPackage?.price || 65.00)
                          }]}
                          customerInfo={{
                            name: `${firstName || 'Learner'} ${lastName || 'Driver'}`.trim(),
                            firstName,
                            lastName,
                            email,
                            phone: `${countryCode} ${phone}`,
                            address,
                            pickupAddress: `${address}, ${suburbSearch}`.trim(),
                            suburb: suburbSearch,
                            date: selectedDate,
                            time: selectedTimeSlot,
                            bookingDate: selectedDate,
                            bookingTime: selectedTimeSlot,
                            notes: `Pickup: ${address}. Test Centre: ${selectedTestCentre || 'N/A'}. Test Time: ${testTime || 'Not set'}.`,
                            packageTitle: cartItems[0]?.title || selectedPackage?.name || selectedPackage?.title || 'Driving Lesson',
                            packagePrice: cartSubtotal > 0 ? cartSubtotal : (selectedPackage?.price || selectedPackage?.price || 65.00),
                            lessons: scheduledLessons,
                            verificationToken: verificationToken || undefined
                          }}
                          onBack={() => setActiveStepId('info')}
                          onPaymentSuccess={(booking) => {
                            setConfirmedBooking(booking);
                          }}
                        />
                      </ErrorBoundary>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Card Footer: Only shown on steps 1-4, Payments has its own action buttons */}
              {activeStepId !== 'payment' && (
                <div className="shrink-0 pt-3 mt-2 border-t border-black/5 flex items-center justify-between">
                  <div className="text-xs text-brand-black/50 font-medium">
                    <span>Step {currentStepIndex + 1} of {steps.length}</span>
                  </div>

                  <div>
                    {(() => {
                      const isAnyScheduledDateBlocked = activeStepId === 'datetime' && scheduledLessons.some(l => {
                        const info = getDayOperatingInfo(l.date);
                        return info.isClosed;
                      });

                      return (
                        <button
                          type="button"
                          disabled={isAnyScheduledDateBlocked}
                          onClick={goToNextStep}
                          title={isAnyScheduledDateBlocked ? "Please select a date that is not blocked off by the instructor" : undefined}
                          className={cn(
                            "bg-brand-red hover:bg-[#c41a21] text-white font-bold px-7 py-2.5 rounded-xl shadow-md shadow-brand-red/25 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer",
                            isAnyScheduledDateBlocked && "opacity-50 cursor-not-allowed hover:bg-brand-red shadow-none pointer-events-none"
                          )}
                        >
                          <span>Continue</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>
      </div>

      {/* LEARN MORE MODAL */}
      <AnimatePresence>
        {serviceLearnMoreModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 relative"
            >
              <button 
                onClick={() => setServiceLearnMoreModal(null)}
                className="absolute right-4 top-4 p-2 text-brand-black/50 hover:text-brand-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <img 
                src={serviceLearnMoreModal.image} 
                alt={serviceLearnMoreModal.name} 
                onError={(e) => {
                  e.currentTarget.src = "/assets/images/about-driving-lesson.jpg";
                }}
                className="w-full h-44 object-cover rounded-2xl mb-4"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-red px-2 py-0.5 rounded-full bg-brand-red/10">
                {serviceLearnMoreModal.category}
              </span>
              <h3 className="text-xl font-bold text-brand-black mt-1 mb-2">
                {serviceLearnMoreModal.name}
              </h3>
              <p className="text-xs sm:text-sm text-brand-black/70 mb-4 leading-relaxed">
                {serviceLearnMoreModal.description}
              </p>

              <div className="bg-brand-offwhite p-3.5 rounded-xl text-xs space-y-1.5 mb-5">
                <div className="flex justify-between">
                  <span className="text-brand-black/60">Duration:</span>
                  <span className="font-bold">{serviceLearnMoreModal.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-black/60">Capacity:</span>
                  <span className="font-bold">{serviceLearnMoreModal.capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-black/60">Price:</span>
                  <span className="font-bold text-brand-red text-sm">${serviceLearnMoreModal.price.toFixed(2)} AUD</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPackage(serviceLearnMoreModal);
                  setServiceLearnMoreModal(null);
                }}
                className="w-full bg-brand-red text-white py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-[#c41a21] transition-colors"
              >
                Select This Service
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Google Autofill Modal */}
      <GoogleAutofillModal
        isOpen={isGoogleAutofillModalOpen}
        onClose={() => setIsGoogleAutofillModalOpen(false)}
        onApply={handleApplyGoogleAutofill}
        initialEmail={email}
        initialFirstName={firstName}
        initialLastName={lastName}
        initialPhone={phone}
      />
    </div>
  );
}
