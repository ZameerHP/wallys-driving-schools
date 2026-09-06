import { useState, useMemo, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { addBooking, createBookingInDb, BookingItem } from '../lib/bookings';

// --- DATA DEFINITIONS BASED ON LIVE SITE ---

export interface DrivingService {
  id: string;
  name: string;
  category: string;
  duration: string;
  capacity: string;
  price: number;
  image: string;
  description: string;
  hasLinkedPackages: boolean;
}

export interface ServicePackage {
  id: string;
  name: string;
  includesText: string;
  lessonName: string;
  quantity: number;
  price: number;
  logbookHours: number;
  savings: number;
  description: string;
}

const SERVICES: DrivingService[] = [
  {
    id: 'srv-1hr',
    name: '1 Hour Driving Lesson',
    category: 'Driving Lessons',
    duration: '1h',
    capacity: '1 person',
    price: 65.00,
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=400',
    description: 'Comprehensive 1-hour driving lesson with dual-control vehicle. Perfect for logbook hour accumulation, test route familiarization, and parking techniques.',
    hasLinkedPackages: true
  },
  {
    id: 'srv-2hr',
    name: '2 Hour Driving Lesson',
    category: 'Driving Lessons',
    duration: '2h',
    capacity: '1 person',
    price: 130.00,
    image: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&q=80&w=400',
    description: 'Intensive 2-hour road coaching covering roundabouts, lane changing on motorways, emergency braking, and RMS test maneuvers.',
    hasLinkedPackages: true
  },
  {
    id: 'srv-car-1hr',
    name: 'Car Hire + 1 Hour Lesson',
    category: 'Driving Test Package',
    duration: '2h30m',
    capacity: '1 person',
    price: 200.00,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=400',
    description: 'Includes 1-hour pre-test warm-up lesson plus car hire for your RMS practical driving test at your chosen test centre.',
    hasLinkedPackages: false
  },
  {
    id: 'srv-car-2hr',
    name: 'Car Hire + 2 Hour Lesson',
    category: 'Driving Test Package',
    duration: '2h',
    capacity: '1 person',
    price: 250.00,
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=400',
    description: 'Full 2-hour pre-test warm-up lesson covering local RMS test routes, maneuvers, plus vehicle hire for the RMS exam.',
    hasLinkedPackages: false
  }
];

const PACKAGES: ServicePackage[] = [
  {
    id: 'pkg-10hr',
    name: '10 Hours Package',
    includesText: '1 Hour Driving Lesson x10',
    lessonName: '1 Hour Driving Lesson',
    quantity: 10,
    price: 620.00,
    logbookHours: 30,
    savings: 30.00,
    description: 'Complete 10-lesson mastery package. 10 hours with an instructor counts as 30 logbook hours under NSW 3-for-1 scheme.'
  },
  {
    id: 'pkg-5hr',
    name: '5 Hours Package',
    includesText: '1 Hour Driving Lesson x5',
    lessonName: '1 Hour Driving Lesson',
    quantity: 5,
    price: 315.00,
    logbookHours: 15,
    savings: 10.00,
    description: 'Popular 5-lesson bundle. Count 5 instructor hours as 15 logbook hours. Flexible scheduling with no expiration date.'
  }
];

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
  'St Marys NSW 2760',
  'Penrith NSW 2164',
  'Blacktown NSW 2148',
  'Glenmore Park NSW 2761',
  'Wetherill Park NSW 2164'
];

const TIME_SLOTS = [
  { slot: '8:00 AM – 9:00 AM', available: true },
  { slot: '8:30 AM – 9:30 AM', available: true },
  { slot: '9:00 AM – 10:00 AM', available: true },
  { slot: '9:30 AM – 10:30 AM', available: true },
  { slot: '10:00 AM – 11:00 AM', available: true },
  { slot: '10:30 AM – 11:30 AM', available: false }, // booked demo
  { slot: '11:00 AM – 12:00 PM', available: true },
  { slot: '1:00 PM – 2:00 PM', available: true },
  { slot: '2:30 PM – 3:30 PM', available: true },
  { slot: '3:30 PM – 4:30 PM', available: true },
  { slot: '4:00 PM – 5:00 PM', available: true },
  { slot: '5:00 PM – 6:00 PM', available: true }
];

const COUNTRY_CODES = [
  { code: '+61', country: 'AU', label: 'Australia (+61)' },
  { code: '+64', country: 'NZ', label: 'New Zealand (+64)' },
  { code: '+1', country: 'US', label: 'USA / Canada (+1)' },
  { code: '+44', country: 'GB', label: 'UK (+44)' },
  { code: '+91', country: 'IN', label: 'India (+91)' },
  { code: '+63', country: 'PH', label: 'Philippines (+63)' }
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

  // Navigation & Wizard State
  const [activeStepId, setActiveStepId] = useState<string>('service');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [serviceSearch, setServiceSearch] = useState('');
  
  // Selections
  const [selectedService, setSelectedService] = useState<DrivingService | null>(SERVICES[0]);
  const [showPackageUpsell, setShowPackageUpsell] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  
  // Date & Time
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('9:00 AM – 10:00 AM');

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

  // Student Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+61');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [suburbSearch, setSuburbSearch] = useState('Rooty Hill NSW 2766');
  const [suburbDropdownOpen, setSuburbDropdownOpen] = useState(false);
  const [selectedTestCentre, setSelectedTestCentre] = useState(TEST_CENTRES[0]);
  const [testTime, setTestTime] = useState('');
  const [infoErrors, setInfoErrors] = useState<{ [key: string]: string }>({});

  // URL params for Stripe redirection
  const [searchParams] = useSearchParams();

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
  const [serviceLearnMoreModal, setServiceLearnMoreModal] = useState<DrivingService | null>(null);

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

  // Dynamic Stepper Configuration
  const steps = useMemo(() => {
    const list = [
      { id: 'service', label: 'Service Selection', icon: Layers },
    ];
    if (selectedPackage) {
      list.push({ id: 'package', label: 'Package', icon: PackageIcon });
    }
    list.push(
      { id: 'datetime', label: 'Date & Time', icon: CalendarIcon },
      { id: 'cart', label: 'Cart', icon: ShoppingCart },
      { id: 'info', label: 'Your Information', icon: User },
      { id: 'payment', label: 'Payments', icon: CreditCard }
    );
    return list;
  }, [selectedPackage]);

  const currentStepIndex = steps.findIndex(s => s.id === activeStepId);

  // Helper to step forward/backward
  const goToNextStep = () => {
    if (activeStepId === 'service') {
      if (selectedService?.hasLinkedPackages && !selectedPackage) {
        setShowPackageUpsell(true);
        return;
      }
      if (selectedPackage) {
        setActiveStepId('package');
      } else {
        setActiveStepId('datetime');
      }
    } else if (activeStepId === 'package') {
      setActiveStepId('datetime');
    } else if (activeStepId === 'datetime') {
      // Sync or update cart item
      const itemTitle = selectedPackage ? selectedPackage.name : (selectedService?.name || '1 Hour Driving Lesson');
      const itemPrice = selectedPackage ? selectedPackage.price : (selectedService?.price || 65.00);
      const itemImg = selectedService?.image || 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=400';
      
      const updatedCart: CartItem[] = [
        {
          id: `item-${Date.now()}`,
          title: itemTitle,
          subtitle: selectedPackage ? selectedPackage.includesText : (selectedService?.category || 'Driving Lessons'),
          price: itemPrice,
          date: selectedDate,
          time: selectedTimeSlot,
          image: itemImg,
          isPackage: !!selectedPackage
        }
      ];
      setCartItems(updatedCart);
      setActiveStepId('cart');
    } else if (activeStepId === 'cart') {
      setActiveStepId('info');
    } else if (activeStepId === 'info') {
      // Validate mandatory fields
      const errors: { [key: string]: string } = {};
      if (!firstName.trim()) errors.firstName = 'First name is required';
      if (!lastName.trim()) errors.lastName = 'Last name is required';
      if (!email.trim() || !email.includes('@')) errors.email = 'Valid email is required';
      if (!phone.trim()) errors.phone = 'Phone number is required';
      if (!address.trim()) errors.address = 'Pickup address is required';
      if (!suburbSearch.trim()) errors.suburb = 'Service suburb is required';

      if (Object.keys(errors).length > 0) {
        setInfoErrors(errors);
        return;
      }
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
  const handleSelectService = (srv: DrivingService) => {
    setSelectedService(srv);
    setSelectedPackage(null); // Reset package selection initially
    if (srv.hasLinkedPackages) {
      setShowPackageUpsell(true);
    } else {
      setShowPackageUpsell(false);
    }
  };

  const handlePickPackage = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setShowPackageUpsell(false);
    setActiveStepId('package');
  };

  const handleSkipPackages = () => {
    setSelectedPackage(null);
    setShowPackageUpsell(false);
    setActiveStepId('datetime');
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return SERVICES;
    const q = serviceSearch.toLowerCase();
    return SERVICES.filter(s => 
      s.name.toLowerCase().includes(q) || 
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

    const primaryItem = cartItems[0] || {
      title: selectedService?.name || '1 Hour Driving Lesson',
      price: 65,
      date: selectedDate,
      time: selectedTimeSlot
    };

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
            bookingDate: primaryItem.date || selectedDate,
            bookingTime: primaryItem.time || selectedTimeSlot,
            instructorName: 'Certified Instructor',
            isPackage: Boolean(selectedPackage),
            packageHours: selectedPackage?.logbookHours || 1
          })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setIsProcessing(false);
          if (data.error === 'STRIPE_NOT_CONFIGURED') {
            setStripeError('STRIPE_NOT_CONFIGURED');
          } else {
            setStripeError(data.message || 'Payment session could not be created');
          }
          return;
        }

        if (data.url) {
          // Redirect to Stripe's hosted Checkout page (Apple Pay, Google Pay, Cards)
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
    setTimeout(async () => {
      setIsProcessing(false);

      const newBooking = await createBookingInDb({
        studentName: `${firstName || 'Learner'} ${lastName || 'Driver'}`.trim(),
        phone: `${countryCode} ${phone || '0400 000 000'}`,
        email: email || 'student@example.com',
        suburb: suburbSearch || 'Rooty Hill NSW 2766',
        pickupAddress: `${address || 'Home pickup'}, ${suburbSearch || ''}`.trim(),
        packageTitle: primaryItem.title,
        packagePrice: cartSubtotal,
        date: primaryItem.date || selectedDate,
        time: primaryItem.time || selectedTimeSlot,
        status: 'Pending',
        notes: `Pickup: ${address || 'Home pickup'}. Test Centre: ${selectedTestCentre}. Test Time: ${testTime || 'Not set'}. Payment: ${simulateMock ? 'MOCK CARD (TEST)' : paymentMethod.toUpperCase()}`
      });

      setConfirmedBooking(newBooking);
    }, 1000);
  };

  // Step Summaries for Sidebar
  const getStepSummary = (stepId: string) => {
    if (stepId === 'service' && selectedService) {
      return selectedPackage ? selectedPackage.name : selectedService.name;
    }
    if (stepId === 'package' && selectedPackage) {
      return `${selectedPackage.name} ($${selectedPackage.price.toFixed(2)})`;
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
              
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Status: Pending Instructor Confirmation
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-brand-black mb-1.5">
                Thank You, {confirmedBooking.studentName}!
              </h2>
              <p className="text-brand-black/70 text-xs sm:text-sm mb-5 max-w-md mx-auto">
                Your driving lesson booking has been received. Wally (Owner & Instructor) will review your appointment and mark it <strong>Confirmed</strong> in the instructor portal.
              </p>

              <div className="bg-brand-offwhite rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2 mb-6 border border-black/5">
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <span className="text-brand-black/60">Booking Reference:</span>
                  <span className="font-mono font-bold text-brand-red text-base">#{confirmedBooking.ref}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <span className="text-brand-black/60">Current Status:</span>
                  <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 text-xs uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pending Confirmation
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-brand-black/60">Selected Package:</span>
                  <span className="font-bold text-brand-black">{confirmedBooking.packageTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-brand-black/60">Scheduled Date & Time:</span>
                  <span className="font-bold text-brand-black">{confirmedBooking.date} · {confirmedBooking.time}</span>
                </div>
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
                  <span className="font-display font-black text-brand-red text-base sm:text-lg">${confirmedBooking.packagePrice.toFixed(2)} AUD</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link 
                  to={`/manage-booking?ref=${encodeURIComponent(confirmedBooking.ref)}`}
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
                <nav className="space-y-3 sm:space-y-3.5 flex-1 overflow-y-auto pr-1">
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
                            <div className="w-6 h-6 rounded-full bg-white text-brand-red flex items-center justify-center shadow-md relative z-10 font-bold">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
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
              <div className="flex-1 overflow-y-auto pr-1.5 min-h-0">
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
                          const isSelected = selectedService?.id === srv.id && !selectedPackage;

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
                                  src={srv.image} 
                                  alt={srv.name}
                                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-black/10" 
                                />
                                <div className="min-w-0">
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-red/10 text-brand-red inline-block mb-0.5">
                                    {srv.category}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-bold text-brand-black truncate leading-tight">
                                    {srv.name}
                                  </h4>
                                  
                                  <div className="flex items-center gap-2.5 text-[11px] text-brand-black/60 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-brand-red" />
                                      {srv.duration}
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

                      {/* INLINE SLIDE-IN PACKAGE UPSELL PANEL */}
                      <AnimatePresence>
                        {showPackageUpsell && selectedService?.hasLinkedPackages && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-brand-red/5 border border-brand-red/20 rounded-2xl p-4 sm:p-5 overflow-hidden"
                          >
                            <div className="text-center mb-3">
                              <span className="text-[11px] font-bold text-brand-red uppercase tracking-wider">Save with Multi-Lesson Packs</span>
                              <h4 className="text-sm sm:text-base font-bold text-brand-black mt-0.5">
                                Special package deals for this service:
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              {PACKAGES.map((pkg) => (
                                <div 
                                  key={pkg.id}
                                  onClick={() => handlePickPackage(pkg)}
                                  className="bg-white border-2 border-brand-red/30 hover:border-brand-red rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex justify-between items-start mb-1.5">
                                      <h5 className="font-bold text-xs sm:text-sm text-brand-black">{pkg.name}</h5>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                        Save ${pkg.savings}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-brand-black/70 mb-2">{pkg.includesText}</p>
                                    <div className="inline-block px-2 py-0.5 bg-brand-offwhite rounded-md text-[10px] font-medium text-brand-black/80">
                                      Counts as <strong>{pkg.logbookHours} Logbook Hours</strong>
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                                    <span className="text-base sm:text-lg font-display font-bold text-brand-red">${pkg.price.toFixed(2)}</span>
                                    <span className="text-[11px] font-bold text-brand-red group-hover:underline flex items-center">
                                      Choose Package →
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* "OR" DIVIDER */}
                            <div className="flex items-center gap-3 my-2.5">
                              <div className="flex-1 h-px bg-black/10" />
                              <span className="text-[10px] uppercase font-bold text-brand-black/40">or</span>
                              <div className="flex-1 h-px bg-black/10" />
                            </div>

                            {/* SKIP PACKAGES BUTTON */}
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={handleSkipPackages}
                                className="text-xs font-bold text-brand-black/70 hover:text-brand-red py-1.5 px-3.5 rounded-xl border border-black/15 hover:border-brand-red transition-all cursor-pointer"
                              >
                                Skip packages and continue with single lesson [${selectedService.price.toFixed(2)}]
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                              {selectedPackage.name}
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
                            {selectedPackage.name} Includes:
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
                      className="space-y-3"
                    >
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
                              if (!item.isCurrentMonth) {
                                return <div key={idx} className="h-8" />;
                              }
                              const isSelected = selectedDate === item.dateStr;
                              const isUnavailable = item.isPast;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={isUnavailable}
                                  onClick={() => item.dateStr && setSelectedDate(item.dateStr)}
                                  className={cn(
                                    "h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer text-xs",
                                    isSelected 
                                      ? "bg-brand-red text-white font-bold shadow-md shadow-brand-red/30 scale-105" 
                                      : isUnavailable 
                                      ? "text-black/20 cursor-not-allowed line-through"
                                      : "hover:bg-white text-brand-black hover:shadow-sm"
                                  )}
                                >
                                  {item.day}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Half-Hour Time Slot Buttons */}
                        <div className="lg:col-span-5 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-black/60 mb-1.5 block">
                              Available Half-Hour Slots ({selectedDate})
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto pr-1">
                              {TIME_SLOTS.map((slotObj, idx) => {
                                const isSelected = selectedTimeSlot === slotObj.slot;

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    disabled={!slotObj.available}
                                    onClick={() => setSelectedTimeSlot(slotObj.slot)}
                                    className={cn(
                                      "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between",
                                      isSelected
                                        ? "bg-brand-red text-white border-brand-red shadow-md"
                                        : !slotObj.available
                                        ? "bg-black/5 text-black/30 border-black/5 cursor-not-allowed line-through"
                                        : "bg-white border-black/10 hover:border-brand-red/50 text-brand-black"
                                    )}
                                  >
                                    <span className="flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5" />
                                      {slotObj.slot}
                                    </span>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-3 p-2.5 bg-brand-offwhite rounded-xl border border-black/5 text-[11px] text-brand-black/70 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Instructor Wally operates everyday 8:00 AM – 6:00 PM.</span>
                          </div>
                        </div>

                      </div>
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
                                  className="mt-3 pt-3 border-t border-black/5 text-xs text-brand-black/70 flex justify-between items-center"
                                >
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
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            Email <span className="text-brand-red">*</span>
                          </label>
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. john.smith@example.com"
                            className={cn(
                              "w-full bg-brand-offwhite border rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white transition-all",
                              infoErrors.email ? "border-brand-red" : "border-black/10 focus:border-brand-red"
                            )}
                          />
                          {infoErrors.email && <span className="text-[10px] text-brand-red font-semibold">{infoErrors.email}</span>}
                        </div>

                        {/* Phone with Country Code */}
                        <div>
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            Phone <span className="text-brand-red">*</span>
                          </label>
                          <div className="flex gap-2">
                            <select 
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="bg-brand-offwhite border border-black/10 rounded-xl px-2 py-2.5 text-xs font-bold focus:outline-none focus:border-brand-red"
                            >
                              {COUNTRY_CODES.map((c) => (
                                <option key={c.code} value={c.code}>{c.code} ({c.country})</option>
                              ))}
                            </select>
                            <input 
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="0412 345 678"
                              className={cn(
                                "flex-1 bg-brand-offwhite border rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white transition-all",
                                infoErrors.phone ? "border-brand-red" : "border-black/10 focus:border-brand-red"
                              )}
                            />
                          </div>
                          {infoErrors.phone && <span className="text-[10px] text-brand-red font-semibold">{infoErrors.phone}</span>}
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

                        {/* Test Centre Dropdown */}
                        <div>
                          <label className="block text-xs font-bold text-brand-black/80 uppercase tracking-wider mb-1">
                            Test Centre <span className="text-brand-red">*</span>
                          </label>
                          <select
                            value={selectedTestCentre}
                            onChange={(e) => setSelectedTestCentre(e.target.value)}
                            className="w-full bg-brand-offwhite border border-black/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-brand-red focus:bg-white"
                          >
                            {TEST_CENTRES.map((centre) => (
                              <option key={centre} value={centre}>{centre}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Test Time (Optional) */}
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

                      {/* Mandatory Disclaimer text */}
                      <p className="text-[11px] text-brand-black/60 italic pt-1">
                        We currently operate only in the suburbs listed above. For other suburbs, please contact us.
                      </p>
                    </motion.div>
                  )}

                  {/* ================= STEP 6: PAYMENTS ================= */}
                  {activeStepId === 'payment' && (
                    <motion.div 
                      key="step-payment"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      {/* Order Summary */}
                      <div className="bg-brand-offwhite rounded-2xl p-5 border border-black/10 space-y-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-black/70 block">Order Summary</span>
                        
                        {cartItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="font-semibold text-brand-black">{item.title}</span>
                            <span className="font-bold text-brand-black">${item.price.toFixed(2)}</span>
                          </div>
                        ))}

                        <div className="flex justify-between items-center text-xs text-brand-black/60 pt-2 border-t border-black/5">
                          <span>Pickup Area:</span>
                          <span className="font-medium">{suburbSearch}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-brand-black/60">
                          <span>Scheduled Date & Time:</span>
                          <span className="font-medium">{selectedDate} ({selectedTimeSlot})</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-brand-black/60">
                          <span>Test Centre:</span>
                          <span className="font-medium">{selectedTestCentre}</span>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-black/10 text-base sm:text-lg font-bold">
                          <span>Total Amount to Pay:</span>
                          <span className="text-brand-red font-display font-black text-xl sm:text-2xl">${cartSubtotal.toFixed(2)} AUD</span>
                        </div>
                      </div>

                      {/* Stripe Notice / Return Alerts */}
                      {stripeNotice && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold block">Payment Notice</span>
                            <span>{stripeNotice}</span>
                          </div>
                        </div>
                      )}

                      {stripeError && stripeError !== 'STRIPE_NOT_CONFIGURED' && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold block">Payment Error</span>
                            <span>{stripeError}</span>
                          </div>
                        </div>
                      )}

                      {/* Payment Method Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-black/80 block">
                            Select Payment Method
                          </span>
                          {stripeStatus?.configured && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Stripe {stripeStatus.mode.toUpperCase()} Connected
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div 
                            onClick={() => {
                              setPaymentMethod('card');
                              setStripeError(null);
                            }}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between",
                              paymentMethod === 'card' 
                                ? "border-brand-red bg-brand-red/5 shadow-sm" 
                                : "border-black/10 hover:border-black/20"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-brand-red" />
                              <div>
                                <span className="font-bold text-sm block">Credit / Debit / Apple Pay</span>
                                <span className="text-[11px] text-brand-black/60">Official Stripe Checkout</span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              paymentMethod === 'card' ? "border-brand-red bg-brand-red" : "border-black/30"
                            )}>
                              {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>

                          <div 
                            onClick={() => {
                              setPaymentMethod('cash');
                              setStripeError(null);
                            }}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between",
                              paymentMethod === 'cash' 
                                ? "border-brand-red bg-brand-red/5 shadow-sm" 
                                : "border-black/10 hover:border-black/20"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-brand-red" />
                              <div>
                                <span className="font-bold text-sm block">Pay In Car</span>
                                <span className="text-[11px] text-brand-black/60">Pay cash on lesson day</span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                              paymentMethod === 'cash' ? "border-brand-red bg-brand-red" : "border-black/30"
                            )}>
                              {paymentMethod === 'cash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Details / Stripe Checkout Notice */}
                      {paymentMethod === 'card' && (
                        <div className="bg-brand-offwhite p-4 rounded-2xl border border-black/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-xs text-brand-black">Stripe Hosted Checkout</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/5 text-brand-black/60">Visa</span>
                              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/5 text-brand-black/60">Mastercard</span>
                              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/5 text-brand-black/60">Apple Pay</span>
                              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/5 text-brand-black/60">Google Pay</span>
                            </div>
                          </div>

                          <p className="text-xs text-brand-black/70 leading-relaxed">
                            Clicking <strong>"Pay with Stripe"</strong> will securely open the Stripe payment gateway where you or your customer can pay by card, Apple Pay, or Google Pay. Once completed, your lesson is automatically confirmed and deposited into your Stripe account balance.
                          </p>

                          {stripeError === 'STRIPE_NOT_CONFIGURED' && (
                            <div className="mt-3 p-3 bg-white border border-amber-300 rounded-xl space-y-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Stripe Secret Key Required for Live Transactions</span>
                              </div>
                              <p className="text-[11px] text-brand-black/70">
                                To receive customer payments into your real Stripe account, add your <code className="bg-black/5 px-1.5 py-0.5 rounded text-brand-red font-mono font-bold">STRIPE_SECRET_KEY</code> in project <strong>Settings &gt; Secrets</strong>.
                              </p>
                              <div className="pt-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAndPay(true)}
                                  className="text-[11px] bg-brand-black text-white hover:bg-black/80 font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Test Booking (Simulate Payment)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod('cash')}
                                  className="text-[11px] text-brand-black/70 hover:text-brand-black underline font-semibold px-2 cursor-pointer"
                                >
                                  Switch to Pay in Car
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-brand-black/60">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>256-bit encrypted checkout. No advance cancellation penalty.</span>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Card Footer: Red Continue / Confirm Button */}
              <div className="shrink-0 pt-3 mt-2 border-t border-black/5 flex items-center justify-between">
                <div className="text-xs text-brand-black/50 font-medium">
                  {activeStepId !== 'payment' && (
                    <span>Step {currentStepIndex + 1} of {steps.length}</span>
                  )}
                </div>

                <div>
                  {activeStepId === 'payment' ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleConfirmAndPay}
                      className="bg-brand-red hover:bg-[#c41a21] text-white font-bold px-7 py-2.5 rounded-xl shadow-lg shadow-brand-red/30 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Confirming Booking...</span>
                        </>
                      ) : (
                        <span>Confirm & Pay (${cartSubtotal.toFixed(2)})</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goToNextStep}
                      className="bg-brand-red hover:bg-[#c41a21] text-white font-bold px-7 py-2.5 rounded-xl shadow-md shadow-brand-red/25 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

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
                  setSelectedService(serviceLearnMoreModal);
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
    </div>
  );
}
