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
  X
} from 'lucide-react';

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
      onPaymentSuccess(confirmResult.booking, {
        method: 'stripe',
        transactionId: paymentIntentId,
        amount: intentData.totalAmount || serverTotal
      });
    } catch (err: any) {
      console.error('Stripe payment failed:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please check your card details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Pay options (Link / Google Pay)
  const handleQuickStripePay = async (providerName: 'Link' | 'Google Pay') => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const intentRes = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: verifiedItems,
          customerInfo,
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
          bookingRef: bookingRef || intentData.bookingRef,
          bookingData: {
            ...customerInfo,
            bookingRef: bookingRef || intentData.bookingRef,
            packageTitle: verifiedItems[0]?.name || 'Driving Lesson',
            packagePrice: intentData.totalAmount || serverTotal,
            notes: `[Paid with Stripe ${providerName}]`
          },
          items: verifiedItems
        })
      });

      const confirmResult = await confirmRes.json();
      onPaymentSuccess(confirmResult.booking, {
        method: 'stripe',
        transactionId: paymentIntentId,
        amount: intentData.totalAmount || serverTotal
      });
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
      onPaymentSuccess(data.booking, {
        method: 'paypal',
        transactionId: paypalOrderId,
        amount: data.amount || serverTotal
      });
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
              <div className="w-8 h-8 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-serif font-black text-lg shadow-sm">
                S
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
              <div className="w-8 h-8 rounded-lg bg-[#003087]/10 flex items-center justify-center">
                <span className="font-black text-[#003087] tracking-tighter text-sm italic">
                  Pay<span className="text-[#0079C1]">Pal</span>
                </span>
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
            onClick={() => handleQuickStripePay('Link')}
            disabled={isBusy}
            className="w-full bg-[#00D66F] hover:bg-[#00c566] text-black font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            <span className="font-bold tracking-tight">Link</span>
            <span>Pay securely with Link</span>
          </button>

          {/* Black Google Pay button */}
          <button
            type="button"
            onClick={() => handleQuickStripePay('Google Pay')}
            disabled={isBusy}
            className="w-full bg-black hover:bg-neutral-900 text-white font-medium text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            <span className="font-bold text-xs tracking-wider">GPay</span>
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
              {/* Card number field (with Mastercard/Visa/Amex/UnionPay icons) */}
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
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none opacity-80">
                    {/* Brand card badges */}
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-black text-[9px]">VISA</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[9px]">MC</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-400 text-white font-black text-[9px]">AMEX</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-[9px]">UPI</span>
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
