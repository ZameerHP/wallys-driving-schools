import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  CreditCard, 
  Check, 
  ShieldCheck, 
  Lock, 
  AlertCircle,
  ExternalLink,
  Loader2,
  X,
  Smartphone,
  Zap,
  Globe
} from 'lucide-react';
import { addBooking, BookingItem } from '../../lib/bookings';

export interface PaymentLineItem {
  id?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerPaymentInfo {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  pickupAddress?: string;
  suburb?: string;
  date?: string;
  time?: string;
  bookingDate?: string;
  bookingTime?: string;
  notes?: string;
  packageTitle?: string;
  packagePrice?: number;
}

export interface PaymentsStepProps {
  bookingRef?: string;
  items: PaymentLineItem[];
  customerInfo: CustomerPaymentInfo;
  onBack: () => void;
  onPaymentSuccess: (booking: any, details: { method: 'stripe' | 'paypal'; transactionId: string; amount: number }) => void;
  isProcessingOverride?: boolean;
}

// Format card number with spaces (e.g. 4242 4242 4242 4242)
function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Format expiration date (MM/YY)
function formatExpiryDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

// Official brand vector assets from providers' brand kits
export function StripeBrandLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 25" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M59.64 14.28c0-4.47-2.18-8-6.27-8-4.13 0-6.65 3.53-6.65 8 0 5.27 3 7.93 7.22 7.93 2.06 0 3.62-.46 4.8-1.18v-3.48c-1.18.66-2.52 1.05-4.06 1.05-1.63 0-3.08-.6-3.3-2.45h8.22c.04-.52.04-1.35.04-1.87zm-8.28-1.57c0-1.79.99-2.53 2.06-2.53 1.03 0 1.97.74 1.97 2.53h-4.03zm-9.3-6.43h-4.38v15.44h4.38V6.28zm-2.19-2.27c1.47 0 2.39-.99 2.39-2.21C42.24.58 41.32 0 39.87 0s-2.43.58-2.43 1.8c0 1.22.98 2.21 2.43 2.21zm-6.19 5.34c-1.01-.5-2.31-.83-3.69-.83-2.73 0-4.63 1.4-4.63 3.96 0 3.86 5.32 3.25 5.32 4.92 0 .58-.51.78-1.24.78-1.39 0-3.15-.58-4.28-1.24v3.83c1.27.55 2.76.81 4.2.81 2.82 0 4.88-1.38 4.88-4 0-4.16-5.36-3.41-5.36-4.99 0-.5.42-.72 1.13-.72 1.19 0 2.65.44 3.67.99V7.02v-.67zm-14.88 2.7l-.3-1.89h-3.95v15.44h4.39v-10.4c1.03-1.33 2.74-1.07 3.32-.86V7.02c-.61-.25-2.61-.47-3.46 1.43zm-10.49-3.2c-1.11-.47-2.6-.74-4.52-.74-4.14 0-6.86 2.15-6.86 5.8 0 5.67 7.79 4.75 7.79 7.2 0 .86-.74 1.14-1.81 1.14-1.57 0-3.57-.64-5.14-1.52v4.21c1.77.78 3.59 1.11 5.36 1.11 4.29 0 7.21-2.1 7.21-5.83 0-6.11-7.85-4.98-7.85-7.31 0-.75.64-1.03 1.63-1.03 1.36 0 2.9.44 4.19 1.11V7.02v-.47z" fill="#635BFF"/>
    </svg>
  );
}

export function PayPalBrandLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 26" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.8 1.1H4.6C4 1.1 3.5 1.5 3.4 2.1L1 17.5c-.1.5.3 1 .8 1h3.9l1-6.3c.1-.5.6-1 1.2-1h2.5c4.7 0 7.4-2.3 8.1-6.8.3-2-0.1-3.4-1-4.3-1.2-1.2-3.1-1.6-4.7-1.6z" fill="#003087"/>
      <path d="M13.9 6.8c-.7 4.5-3.4 6.8-8.1 6.8H3.3l-1 6.3c-.1.5.3 1 .8 1h3.5l1-6.3c.1-.5.6-1 1.2-1h1.9c3.9 0 6.2-1.9 6.8-5.6.3-1.6.1-2.8-.6-3.6-.5.9-1.3 1.8-2.6 2.4z" fill="#0079C1"/>
      <path d="M12 6.8c-.3-.1-.7-.1-1.1-.1H5.7L4.4 14.8h2.6c3.9 0 6.2-1.9 6.8-5.6.2-1.4 0-2.5-.7-3.3-.4.4-.7.7-1.1.9z" fill="#00457C"/>
      <path d="M30 6.9h-4.3c-.4 0-.7.3-.8.7l-2.2 13.7c0 .3.2.6.5.6h2.5c.4 0 .7-.3.8-.7l.6-3.7h1.6c3.1 0 4.9-1.5 5.4-4.5.2-1.3 0-2.3-.6-2.9-.8-.8-2-1.1-3.5-1.1zm.6 4.5c-.3 1.9-1.4 2.8-3.4 2.8h-1l.7-4.4h1.1c1.3 0 2.2.1 2.6.5.4.3.5.7.4 1.1h-.4zM44.5 12.3h-2.4c0-.3 0-.6-.1-.8l.8-4.6h-2.5l-.2 1.3c-.5-.9-1.7-1.5-3.1-1.5-2.9 0-4.6 2.3-5 5-0.2 1.4.1 2.7.9 3.6.7.8 1.8 1.2 3 1.2 2.1 0 3.3-1.4 3.3-1.4l-.2 1.2h2.3c.4 0 .7-.3.8-.7l1.1-6.9h-2.5l-.3 1.6h3.9zm-4.3 2.1c-.2 1.4-1.2 2.3-2.6 2.3-.8 0-1.4-.3-1.7-.8-.4-.5-.4-1.2-.2-2 .2-1.4 1.2-2.3 2.6-2.3.8 0 1.4.3 1.7.8.4.5.4 1.2.2 2zM55.8 6.9l-3.3 9.4-1.4-9.1c-.1-.4-.4-.7-.8-.7h-2.5c-.3 0-.6.3-.5.6l2.8 13.5-2.6 3.6c-.2.3 0 .7.4.7h2.5c.3 0 .6-.2.8-.4l7.6-16.7c.2-.4-.1-.8-.5-.8h-2.5c-.3 0-.5.2-.5.5z" fill="#003087"/>
      <path d="M66 6.9h-4.3c-.4 0-.7.3-.8.7l-2.2 13.7c0 .3.2.6.5.6h2.5c.4 0 .7-.3.8-.7l.6-3.7h1.6c3.1 0 4.9-1.5 5.4-4.5.2-1.3 0-2.3-.6-2.9-.8-.8-2-1.1-3.5-1.1zm.6 4.5c-.3 1.9-1.4 2.8-3.4 2.8h-1l.7-4.4h1.1c1.3 0 2.2.1 2.6.5.4.3.5.7.4 1.1h-.4zM80.5 12.3h-2.4c0-.3 0-.6-.1-.8l.8-4.6h-2.5l-.2 1.3c-.5-.9-1.7-1.5-3.1-1.5-2.9 0-4.6 2.3-5 5-0.2 1.4.1 2.7.9 3.6.7.8 1.8 1.2 3 1.2 2.1 0 3.3-1.4 3.3-1.4l-.2 1.2h2.3c.4 0 .7-.3.8-.7l1.1-6.9h-2.5l-.3 1.6h3.9zm-4.3 2.1c-.2 1.4-1.2 2.3-2.6 2.3-.8 0-1.4-.3-1.7-.8-.4-.5-.4-1.2-.2-2 .2-1.4 1.2-2.3 2.6-2.3.8 0 1.4.3 1.7.8.4.5.4 1.2.2 2zM85 2.2l-2.2 14c0 .3.2.6.5.6h2.2c.4 0 .7-.3.8-.7l2.2-14.1c0-.3-.2-.6-.5-.6H85.5c-.2 0-.4.3-.5.8z" fill="#0079C1"/>
    </svg>
  );
}

export function GooglePayBrandLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 22" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.7 11.2c0-.7-.1-1.4-.2-2.1H11.5v4.2h6.3c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.4-5.3 3.4-8.7z" fill="#4285F4"/>
      <path d="M11.5 22.5c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H.8v3.1c2 4 6.2 6.7 10.7 6.7z" fill="#34A853"/>
      <path d="M4.8 12.7c-.2-.7-.4-1.5-.4-2.2s.2-1.5.4-2.2V5.2H.8C0 6.8 0 8.3 0 10.5s0 3.7.8 5.3l4-3.1z" fill="#FBBC05"/>
      <path d="M11.5 4.3c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.4.9 14.7 0 11.5 0 7 0 2.8 2.7.8 6.7l4 3.1c.9-2.9 3.6-5.5 6.7-5.5z" fill="#EA4335"/>
      <path d="M31.2 8.5v8.5h-2.1V1.4h5.6c1.4 0 2.6.5 3.5 1.4s1.5 2.1 1.5 3.4-.5 2.5-1.5 3.4c-.9.9-2.1 1.4-3.5 1.4h-3.5v-2.5zm0-4.6v4.6h3.6c.8 0 1.5-.3 2.1-.8.6-.6.9-1.3.9-2.1 0-.8-.3-1.5-.9-2.1-.6-.6-1.3-.8-2.1-.8h-3.6v1.2zM45 5.5c1.5 0 2.7.4 3.6 1.2.9.8 1.4 2 1.4 3.5v6.8h-2v-1.6h-.1c-.9 1.3-2 1.9-3.4 1.9-1.2 0-2.3-.4-3.1-1.1-.8-.7-1.3-1.7-1.3-2.8 0-1.2.5-2.2 1.3-2.8.9-.7 2-1 3.5-1 1.3 0 2.3.2 3.1.6v-.5c0-.8-.3-1.4-.9-1.9-.6-.5-1.3-.7-2.1-.7-1.3 0-2.3.5-3.1 1.6l-1.9-1.2c1.2-1.5 2.8-2.4 5-2.4zm-2.7 8.3c0 .5.2 1 .8 1.4.5.4 1.1.5 1.8.5.9 0 1.7-.4 2.4-1 .7-.7 1-1.5 1-2.4-.6-.5-1.6-.7-2.7-.7-.8 0-1.5.2-2.1.6-.8.4-1.2 1-1.2 1.6zM54 5.9l-7.1 16.3h-2.2l2.6-5.7-4.7-10.6h2.3l3.4 8.2h.1l3.3-8.2H54z" fill="currentColor"/>
    </svg>
  );
}

export function LinkBrandLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 45 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.1 2.2C10.5.8 8.4 0 6.1 0 2.7 0 0 2.7 0 6.1s2.7 6.1 6.1 6.1c2.3 0 4.4-.8 6-2.2l-1.9-1.9c-1.1 1-2.5 1.6-4.1 1.6-3.2 0-5.8-2.6-5.8-5.8s2.6-5.8 5.8-5.8c1.6 0 3 .6 4.1 1.6l1.9-1.7z" fill="currentColor"/>
      <path d="M15.4 0h-2.5v12.2h2.5V0zM19.2 3.9h-2.4v8.3h2.4V3.9zM18 0c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4 1.4-.6 1.4-1.4S18.8 0 18 0zM30.6 7.4c0-2.2-1.5-3.6-3.6-3.6-1.5 0-2.7.7-3.4 1.9V3.9h-2.4v8.3h2.4V7.8c0-1.3.8-2 1.9-2 1.1 0 1.8.7 1.8 2v4.4h2.4V7.4h.9zM42.2 0h-2.5v7.2l-3.3-3.3h-3.2l4.2 4.1-4.4 4.2h3.3l3.4-3.3v3.3h2.5V0z" fill="currentColor"/>
    </svg>
  );
}

export function VisaBrandLogo({ className = "h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.12 1.25L12.57 15.22H8.28L5.05 4.3C4.85 3.51 4.67 3.23 4.08 2.91C3.12 2.38 1.47 1.89 0 1.57L0.1 1.25H7.01C7.9 1.25 8.68 1.83 8.87 2.87L10.57 11.83L14.75 1.25H19.12ZM35.91 10.74C35.92 6.64 30.12 6.42 30.16 4.61C30.17 4.06 30.71 3.47 31.89 3.32C32.48 3.24 34.07 3.19 35.88 4.02L36.63 0.63C35.61 0.27 34.29 0 32.61 0C28.63 0 25.86 2.08 25.83 5.06C25.8 7.27 27.81 8.5 29.34 9.23C30.91 9.98 31.44 10.47 31.43 11.14C31.42 12.18 30.16 12.63 28.98 12.65C26.96 12.68 25.79 12.11 24.87 11.68L24.09 15.26C25.13 15.73 27.06 16.13 29.04 16.15C33.28 16.15 35.9 14.09 35.91 10.74ZM46.5 15.22H50.27L47.01 1.25H43.51C42.72 1.25 42.06 1.7 41.76 2.41L35.67 15.22H39.95L40.8 12.92H46.03L46.5 15.22ZM41.98 9.77L44.13 3.99L45.37 9.77H41.98ZM24.97 1.25L21.6 15.22H17.49L20.86 1.25H24.97Z" fill="#1434CB"/>
    </svg>
  );
}

export function MastercardBrandLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#EB001B"/>
      <circle cx="16" cy="8" r="7" fill="#F79E1B"/>
      <path d="M12 3.12A6.97 6.97 0 0 1 14.88 8 6.97 6.97 0 0 1 12 12.88 6.97 6.97 0 0 1 9.12 8 6.97 6.97 0 0 1 12 3.12Z" fill="#FF5F00"/>
    </svg>
  );
}

export function AmexBrandLogo({ className = "h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="20" rx="3" fill="#006FCF"/>
      <path d="M6 14.5L8.5 6.5H11.5L14 14.5H11.8L11.2 12.5H8.8L8.2 14.5H6ZM9.2 10.8H10.8L10 8.2L9.2 10.8ZM14.5 14.5L16.8 6.5H19.5L20.8 11.2L22.2 6.5H24.8L27.2 14.5H25L23.5 9.5L22 14.5H19.8L18.2 9.5L16.8 14.5H14.5Z" fill="white"/>
    </svg>
  );
}

export const PaymentsStep: React.FC<PaymentsStepProps> = ({
  bookingRef,
  items: initialItems,
  customerInfo,
  onBack,
  onPaymentSuccess,
  isProcessingOverride = false
}) => {
  // Method selection: 'stripe' | 'paypal'
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal'>('stripe');

  // Authoritative server-side items and total amount
  const [verifiedItems, setVerifiedItems] = useState<PaymentLineItem[]>(initialItems);
  const [serverTotal, setServerTotal] = useState<number>(() => {
    return initialItems.reduce((sum, item) => sum + (item.lineTotal || (item.unitPrice * item.quantity)), 0);
  });
  const [isCalculating, setIsCalculating] = useState<boolean>(true);

  // Stripe form state
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  const [country, setCountry] = useState<string>('Australia');
  const [saveInfoForFasterCheckout, setSaveInfoForFasterCheckout] = useState<boolean>(false);
  const [linkEmail, setLinkEmail] = useState<string>(customerInfo?.email || '');
  const [linkPhone, setLinkPhone] = useState<string>(customerInfo?.phone || '');

  // UI status & processing state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PayPal overlay popup state
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState<boolean>(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [isCapturingPayPal, setIsCapturingPayPal] = useState<boolean>(false);

  // Google Pay & Stripe Link interactive modal states
  const [isGooglePayModalOpen, setIsGooglePayModalOpen] = useState<boolean>(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [linkSmsCode, setLinkSmsCode] = useState<string>('424242');

  // Authoritative client-side synchronization & success dispatch
  const finalizeBookingSuccess = (
    rawBooking: any,
    method: 'stripe' | 'paypal',
    subMethod: string,
    transactionId: string,
    amount: number
  ) => {
    const targetRef = rawBooking?.bookingRef || rawBooking?.ref || bookingRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`;
    const normalized: BookingItem & { paymentMethod?: string } = {
      id: String(rawBooking?.id || `b-${Date.now()}`),
      ref: targetRef,
      studentName: rawBooking?.studentName || customerInfo.name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Learner Driver',
      phone: rawBooking?.phone || customerInfo.phone || '',
      email: rawBooking?.email || customerInfo.email || '',
      suburb: rawBooking?.suburb || customerInfo.suburb || 'Rockingham, WA',
      pickupAddress: rawBooking?.pickupAddress || customerInfo.pickupAddress || customerInfo.address || '',
      packageTitle: rawBooking?.packageTitle || verifiedItems[0]?.name || 'Driving Lesson',
      packagePrice: Number(rawBooking?.packagePrice || amount || serverTotal),
      date: rawBooking?.date || customerInfo.date || customerInfo.bookingDate || new Date().toISOString().split('T')[0],
      time: rawBooking?.time || customerInfo.time || customerInfo.bookingTime || '09:00 AM',
      status: 'Confirmed',
      paymentStatus: 'paid',
      paymentMethod: subMethod,
      notes: rawBooking?.notes || customerInfo.notes || `[Paid via ${subMethod}: ${transactionId}]`,
      createdAt: rawBooking?.createdAt || new Date().toISOString().split('T')[0],
      stripeSessionId: transactionId,
    };

    try {
      addBooking(normalized);
    } catch (e) {
      console.error('Failed to update local storage booking:', e);
    }

    onPaymentSuccess(normalized, {
      method,
      transactionId,
      amount: normalized.packagePrice
    });
  };

  // 1. Calculate authoritative total amount server-side on mount or item changes
  useEffect(() => {
    let isMounted = true;
    async function fetchServerTotal() {
      setIsCalculating(true);
      try {
        const res = await fetch('/api/payments/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: initialItems })
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setVerifiedItems(data.items);
            setServerTotal(data.totalAmount);
          }
        }
      } catch (err) {
        console.warn('Failed to calculate server total, falling back to items:', err);
      } finally {
        if (isMounted) {
          setIsCalculating(false);
        }
      }
    }
    fetchServerTotal();
    return () => {
      isMounted = false;
    };
  }, [initialItems]);

  // Handle Stripe card submission
  const handleStripeContinue = async () => {
    setErrorMessage(null);

    // Validation
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 13) {
      setErrorMessage('Please enter a valid card number (16 digits or test card 4242 4242 4242 4242).');
      return;
    }
    if (expiryDate.length < 4) {
      setErrorMessage('Please enter a valid expiration date (MM/YY).');
      return;
    }
    if (cvc.length < 3) {
      setErrorMessage('Please enter a valid 3-digit security code (CVC).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Create Stripe payment intent on server
      const intentRes = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: verifiedItems,
          customerInfo,
          bookingRef
        })
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json();
        throw new Error(errData.message || 'Failed to initialize Stripe payment.');
      }

      const intentData = await intentRes.json();
      const paymentIntentId = intentData.paymentIntentId;

      // Step 2: Confirm & verify payment server-side
      const confirmRes = await fetch('/api/payments/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethod: 'Credit Card',
          bookingRef: bookingRef || intentData.bookingRef,
          bookingData: {
            ...customerInfo,
            bookingRef: bookingRef || intentData.bookingRef,
            packageTitle: verifiedItems[0]?.name || 'Driving Lesson',
            packagePrice: intentData.totalAmount || serverTotal,
          },
          items: verifiedItems
        })
      });

      if (!confirmRes.ok) {
        const confirmErr = await confirmRes.json();
        throw new Error(confirmErr.message || 'Failed to verify payment with server.');
      }

      const confirmResult = await confirmRes.json();
      finalizeBookingSuccess(
        confirmResult.booking,
        'stripe',
        'Credit Card',
        paymentIntentId,
        intentData.totalAmount || serverTotal
      );
    } catch (err: any) {
      console.error('Stripe payment failed:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please check your card details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Pay options (Stripe Link / Google Pay)
  const handleQuickStripePay = async (providerName: 'Stripe Link' | 'Google Pay') => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const intentRes = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: verifiedItems,
          customerInfo: {
            ...customerInfo,
            email: providerName === 'Stripe Link' ? (linkEmail || customerInfo.email) : customerInfo.email,
            phone: providerName === 'Stripe Link' ? (linkPhone || customerInfo.phone) : customerInfo.phone
          },
          bookingRef
        })
      });

      const intentData = await intentRes.json();
      const paymentIntentId = intentData.paymentIntentId || `pi_quick_${Date.now()}`;

      const confirmRes = await fetch('/api/payments/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethod: providerName,
          bookingRef: bookingRef || intentData.bookingRef,
          bookingData: {
            ...customerInfo,
            bookingRef: bookingRef || intentData.bookingRef,
            packageTitle: verifiedItems[0]?.name || 'Driving Lesson',
            packagePrice: intentData.totalAmount || serverTotal,
            notes: `[Paid with ${providerName}]`
          },
          items: verifiedItems
        })
      });

      if (!confirmRes.ok) {
        const confirmErr = await confirmRes.json();
        throw new Error(confirmErr.message || `Failed to verify payment with ${providerName}.`);
      }

      const confirmResult = await confirmRes.json();
      setIsGooglePayModalOpen(false);
      setIsLinkModalOpen(false);
      finalizeBookingSuccess(
        confirmResult.booking,
        'stripe',
        providerName,
        paymentIntentId,
        intentData.totalAmount || serverTotal
      );
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to process payment via ${providerName}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle PayPal button click
  const handleOpenPayPal = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: verifiedItems,
          customerInfo,
          bookingRef
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const data = await res.json();
      setPaypalOrderId(data.orderId);
      setIsPayPalModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to start PayPal checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete & capture PayPal payment in popup/overlay
  const handleCapturePayPal = async () => {
    if (!paypalOrderId) return;
    setIsCapturingPayPal(true);
    try {
      const res = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paypalOrderId,
          bookingRef,
          bookingData: {
            ...customerInfo,
            bookingRef,
            packageTitle: verifiedItems[0]?.name || 'Driving Lesson',
            packagePrice: serverTotal,
          },
          items: verifiedItems
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'PayPal capture failed');
      }

      const data = await res.json();
      setIsPayPalModalOpen(false);
      finalizeBookingSuccess(
        data.booking,
        'paypal',
        'PayPal',
        paypalOrderId,
        data.amount || serverTotal
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to capture PayPal payment.');
    } finally {
      setIsCapturingPayPal(false);
    }
  };

  const isBusy = isSubmitting || isProcessingOverride;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 1. Header: "Payments" with a red back-chevron to return to the previous step */}
      <div className="flex items-center justify-between border-b border-black/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isBusy}
            aria-label="Return to previous step"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 text-[#E3222A] transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-6 h-6 text-[#E3222A] stroke-[2.5]" />
          </button>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-[#111111] tracking-tight">
            Payments
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-black/50 font-medium">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-bit SSL Encrypted</span>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Payment Error:</span> {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Summary card: lists each service line item (name, unit price, quantity) with line total right-aligned, followed by Total Amount in bold red */}
      <div className="bg-[#F9F9FB] rounded-2xl p-5 border border-black/10 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-black/60 pb-1">
          Order Summary
        </div>

        <div className="divide-y divide-black/5 space-y-2">
          {verifiedItems.map((item, idx) => (
            <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-sm">
              <div className="pr-4">
                <div className="font-medium text-[#111111]">{item.name}</div>
                <div className="text-xs text-black/50">
                  Unit: ${Number(item.unitPrice).toFixed(2)} AUD × {item.quantity}
                </div>
              </div>
              <div className="font-bold text-[#111111] shrink-0 text-right">
                ${Number(item.lineTotal || (item.unitPrice * item.quantity)).toFixed(2)} AUD
              </div>
            </div>
          ))}
        </div>

        {/* Total Amount row in bold red */}
        <div className="border-t border-black/10 pt-3 mt-3 flex items-center justify-between">
          <div className="font-bold text-base text-[#111111]">
            Total Amount
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-[#E3222A]">
            {isCalculating ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-black/40 font-normal">
                <Loader2 className="w-4 h-4 animate-spin text-[#E3222A]" /> Computing...
              </span>
            ) : (
              `$${serverTotal.toFixed(2)} AUD`
            )}
          </div>
        </div>
      </div>

      {/* 3. Payment Method selector: two side-by-side option cards — Stripe (purple "S" icon) and PayPal (PayPal logo) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-black/70">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Stripe Card */}
          <button
            type="button"
            onClick={() => setSelectedMethod('stripe')}
            className={`p-4 rounded-xl text-left transition-all relative flex flex-col justify-between border-2 ${
              selectedMethod === 'stripe'
                ? 'border-[#E3222A] bg-red-50/10 shadow-sm'
                : 'border-black/10 bg-white hover:border-black/20'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="h-8 flex items-center">
                <StripeBrandLogo className="h-6 w-auto" />
              </div>
              {selectedMethod === 'stripe' && (
                <div className="w-4 h-4 rounded-full bg-[#E3222A] flex items-center justify-center text-white">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-[#111111]">Stripe</div>
              <div className="text-[11px] text-black/50 leading-tight">
                Cards, Link, Google Pay
              </div>
            </div>
          </button>

          {/* PayPal Card */}
          <button
            type="button"
            onClick={() => setSelectedMethod('paypal')}
            className={`p-4 rounded-xl text-left transition-all relative flex flex-col justify-between border-2 ${
              selectedMethod === 'paypal'
                ? 'border-[#E3222A] bg-red-50/10 shadow-sm'
                : 'border-black/10 bg-white hover:border-black/20'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="h-8 flex items-center">
                <PayPalBrandLogo className="h-5 w-auto" />
              </div>
              {selectedMethod === 'paypal' && (
                <div className="w-4 h-4 rounded-full bg-[#E3222A] flex items-center justify-center text-white">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-[#111111]">PayPal</div>
              <div className="text-[11px] text-black/50 leading-tight">
                PayPal balance & linked cards
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. When Stripe is selected: panel expands in exact order */}
      {selectedMethod === 'stripe' && (
        <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-4 shadow-sm">
          {/* Green "Pay securely with Link" button */}
          <button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            disabled={isBusy}
            className="w-full bg-[#00D66F] hover:bg-[#00c566] text-black font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            <LinkBrandLogo className="h-4 w-auto text-black" />
            <span>Pay securely with Link</span>
          </button>

          {/* Black Google Pay button */}
          <button
            type="button"
            onClick={() => setIsGooglePayModalOpen(true)}
            disabled={isBusy}
            className="w-full bg-black hover:bg-neutral-900 text-white font-medium text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            <GooglePayBrandLogo className="h-5 w-auto text-white" />
            <span>Pay with Google Pay</span>
          </button>

          {/* Divider reading "OR PAY WITH CARD" */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-black/10 absolute"></div>
            <span className="relative bg-white px-3 text-[11px] font-bold text-black/50 uppercase tracking-wider">
              OR PAY WITH CARD
            </span>
          </div>

          {/* Card tab (radio + card icon) */}
          <div className="border border-black/10 rounded-xl p-4 bg-[#FBFBFC] space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-black/5">
              <div className="w-4 h-4 rounded-full border-4 border-[#635BFF] bg-white"></div>
              <CreditCard className="w-4 h-4 text-[#111111]" />
              <span className="text-xs font-bold text-[#111111]">Card</span>
            </div>

            {/* Card inputs */}
            <div className="space-y-3 pt-1">
              {/* Card number field (with Mastercard/Visa/Amex icons) */}
              <div>
                <label className="block text-[11px] font-semibold text-black/60 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    disabled={isBusy}
                    className="w-full bg-white border border-black/15 focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] rounded-lg px-3 py-2 text-sm text-[#111111] pr-32 transition-all outline-none font-mono"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    {/* Official Brand card badges */}
                    <div className="p-1 rounded bg-white border border-black/10 shadow-xs flex items-center">
                      <VisaBrandLogo className="h-3 w-auto" />
                    </div>
                    <div className="p-1 rounded bg-white border border-black/10 shadow-xs flex items-center">
                      <MastercardBrandLogo className="h-3.5 w-auto" />
                    </div>
                    <div className="p-0.5 rounded bg-white border border-black/10 shadow-xs flex items-center">
                      <AmexBrandLogo className="h-3.5 w-auto" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiration date (MM/YY) and Security code (CVC) side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black/60 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM / YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                    disabled={isBusy}
                    className="w-full bg-white border border-black/15 focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] rounded-lg px-3 py-2 text-sm text-[#111111] outline-none font-mono transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black/60 mb-1">
                    Security Code (CVC)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    disabled={isBusy}
                    className="w-full bg-white border border-black/15 focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] rounded-lg px-3 py-2 text-sm text-[#111111] outline-none font-mono transition-all"
                  />
                </div>
              </div>

              {/* Country dropdown */}
              <div>
                <label className="block text-[11px] font-semibold text-black/60 mb-1">
                  Country or Region
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={isBusy}
                  className="w-full bg-white border border-black/15 focus:border-[#635BFF] focus:ring-1 focus:ring-[#635BFF] rounded-lg px-3 py-2 text-sm text-[#111111] outline-none cursor-pointer"
                >
                  <option value="Australia">Australia</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional "Save my information for faster checkout" section (Stripe Link) with Email and Mobile number fields */}
          <div className="border border-black/10 rounded-xl p-3 bg-white space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveInfoForFasterCheckout}
                onChange={(e) => setSaveInfoForFasterCheckout(e.target.checked)}
                disabled={isBusy}
                className="w-4 h-4 text-[#635BFF] rounded border-black/20 focus:ring-[#635BFF]"
              />
              <span className="text-xs font-semibold text-[#111111]">
                Save my information for faster checkout
              </span>
            </label>

            {saveInfoForFasterCheckout && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-black/50 mb-1">
                    Email for Stripe Link
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    disabled={isBusy}
                    className="w-full bg-[#F9F9FB] border border-black/10 rounded-lg px-3 py-1.5 text-xs text-[#111111] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-black/50 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+61 400 000 000"
                    value={linkPhone}
                    onChange={(e) => setLinkPhone(e.target.value)}
                    disabled={isBusy}
                    className="w-full bg-[#F9F9FB] border border-black/10 rounded-lg px-3 py-1.5 text-xs text-[#111111] outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer: "Payment protected by policy and powered by Stripe" with the Stripe logo */}
          <div className="flex items-center justify-between text-[11px] text-black/50 pt-2 border-t border-black/5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Payment protected by policy and powered by Stripe</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-serif font-black text-[#635BFF] text-xs">stripe</span>
            </div>
          </div>

          {/* A red Continue button bottom-right confirms the card payment */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleStripeContinue}
              disabled={isBusy}
              className="bg-[#E3222A] hover:bg-[#c41a21] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#E3222A]/25 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center gap-2 text-sm"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 5. When PayPal is selected: bottom-right Continue button is replaced by yellow PayPal button */}
      {selectedMethod === 'paypal' && (
        <div className="bg-white border border-black/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="text-center py-4 space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#FFC439]/20 flex items-center justify-center mx-auto text-[#003087]">
              <span className="font-black text-xl italic tracking-tighter">P</span>
            </div>
            <h3 className="font-bold text-sm text-[#111111]">
              Pay with PayPal Sandbox or Account
            </h3>
            <p className="text-xs text-black/60 max-w-md mx-auto">
              You will be directed to PayPal to complete your payment of{' '}
              <span className="font-bold text-[#E3222A]">${serverTotal.toFixed(2)} AUD</span> securely.
            </p>
          </div>

          {/* Bottom-right yellow PayPal button */}
          <div className="flex justify-end pt-2 border-t border-black/5">
            <button
              type="button"
              onClick={handleOpenPayPal}
              disabled={isBusy}
              className="bg-[#FFC439] hover:bg-[#f2ba32] text-[#003087] font-bold py-3 px-8 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 text-sm"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#003087]" />
                  <span>Connecting to PayPal...</span>
                </>
              ) : (
                <>
                  <span className="font-black italic">PayPal</span>
                  <span>Pay Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Google Pay popup / modal */}
      {isGooglePayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider">
                  GPay
                </div>
                <div>
                  <span className="font-bold text-sm text-black">Google Pay</span>
                  <p className="text-[11px] text-black/50">Wally's Driving School</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGooglePayModalOpen(false)}
                disabled={isBusy}
                className="text-black/40 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account & Card details */}
            <div className="space-y-3">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-black/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-black/60">Google Account</span>
                  <span className="font-medium text-black">{customerInfo?.email || 'google.user@gmail.com'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-black/60">Payment Method</span>
                  <span className="font-medium text-black flex items-center gap-1.5">
                    <span className="px-1 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold">VISA</span>
                    •••• 4242
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-black/5">
                  <span className="text-black/60">Pay To</span>
                  <span className="font-medium text-black">Wally's Driving School NSW</span>
                </div>
              </div>

              <div className="flex justify-between items-center px-1 py-1">
                <span className="text-sm font-semibold text-black">Total to authorize:</span>
                <span className="text-lg font-black text-brand-red">${serverTotal.toFixed(2)} AUD</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickStripePay('Google Pay')}
                disabled={isBusy}
                className="w-full bg-black hover:bg-neutral-900 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing with Google Pay...</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-xs tracking-wider">GPay</span>
                    <span>Pay ${serverTotal.toFixed(2)} AUD</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsGooglePayModalOpen(false)}
                  disabled={isBusy}
                  className="text-xs text-black/50 hover:text-black font-semibold transition-all"
                >
                  Cancel and use another method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Link popup / modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00D66F] text-black flex items-center justify-center font-black text-sm">
                  Link
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-black">Link</span>
                    <span className="text-[10px] bg-black/5 px-1.5 py-0.5 rounded font-semibold text-black/70">by Stripe</span>
                  </div>
                  <p className="text-[11px] text-black/50">1-click fast checkout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                disabled={isBusy}
                className="text-black/40 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Link details */}
            <div className="space-y-3">
              <div className="p-3.5 bg-[#FBFBFC] rounded-xl border border-black/5 space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-black/60 block mb-1">Account Email</label>
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-white rounded-lg border border-black/10 focus:outline-none focus:border-[#00D66F]"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-black/60 block mb-1">Mobile Phone (for SMS 1-Click Code)</label>
                  <input
                    type="tel"
                    value={linkPhone}
                    onChange={(e) => setLinkPhone(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-white rounded-lg border border-black/10 focus:outline-none focus:border-[#00D66F]"
                    placeholder="0412 345 678"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-black/60">6-digit Security Code</label>
                    <span className="text-[10px] text-emerald-600 font-medium">Test mode pre-filled</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={linkSmsCode}
                    onChange={(e) => setLinkSmsCode(e.target.value)}
                    className="w-full text-center tracking-widest text-sm font-mono font-bold px-3 py-2 bg-white rounded-lg border border-black/10 focus:outline-none focus:border-[#00D66F]"
                  />
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-black/5">
                  <span className="text-black/60">Saved Card</span>
                  <span className="font-medium text-black flex items-center gap-1.5">
                    <span className="px-1 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold">VISA</span>
                    •••• 4242
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center px-1 py-1">
                <span className="text-sm font-semibold text-black">Total to authorize:</span>
                <span className="text-lg font-black text-brand-red">${serverTotal.toFixed(2)} AUD</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickStripePay('Stripe Link')}
                disabled={isBusy}
                className="w-full bg-[#00D66F] hover:bg-[#00c566] text-black font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Processing with Link...</span>
                  </>
                ) : (
                  <>
                    <span className="font-black tracking-tight">Link</span>
                    <span>Pay ${serverTotal.toFixed(2)} AUD with 1-Click</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  disabled={isBusy}
                  className="text-xs text-black/50 hover:text-black font-semibold transition-all"
                >
                  Cancel and use another method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PayPal payment popup / overlay */}
      {isPayPalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Overlay header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#003087] text-white flex items-center justify-center text-xs font-black italic">
                  P
                </div>
                <span className="font-bold text-sm text-[#003087]">PayPal Checkout</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPayPalModalOpen(false)}
                className="text-black/40 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exact required wording: "Complete your payment in the open window, or close it to continue paying another way" with a Cancel payment option */}
            <div className="space-y-3 text-center py-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#003087] animate-spin" />
              </div>
              <p className="text-sm text-[#111111] font-medium leading-relaxed">
                Complete your payment in the open window, or close it to continue paying another way
              </p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-black/5 text-xs text-black/70 space-y-1">
                <div>Order Reference: <span className="font-mono font-bold">{paypalOrderId}</span></div>
                <div>Amount to Authorize: <span className="font-bold text-[#E3222A]">${serverTotal.toFixed(2)} AUD</span></div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCapturePayPal}
                disabled={isCapturingPayPal}
                className="w-full bg-[#003087] hover:bg-[#002466] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all disabled:opacity-60"
              >
                {isCapturingPayPal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Confirming with PayPal Server...</span>
                  </>
                ) : (
                  <span>Simulate / Confirm PayPal Payment</span>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsPayPalModalOpen(false)}
                  disabled={isCapturingPayPal}
                  className="text-xs text-[#E3222A] font-bold hover:underline transition-all"
                >
                  Cancel payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PaymentsStep;
