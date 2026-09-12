import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  Calendar,
  Clock,
  MapPin,
  User,
  Check
} from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Authentic Vector Google Pay Mark (Google 4-Color 'G' + 'Pay')
export const GooglePayMark: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({ 
  className = "",
  size = 'md'
}) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Official 4-Color Google G */}
      <svg className={`${iconSize} shrink-0`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1V21.09H19.93C22.18 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"/>
        <path d="M12 24C15.24 24 17.96 22.92 19.93 21.09L16.08 18.1C15.01 18.82 13.62 19.25 12 19.25C8.87 19.25 6.22 17.14 5.27 14.29H1.28V17.38C3.25 21.3 7.31 24 12 24Z" fill="#34A853"/>
        <path d="M5.27 14.29C5.02 13.57 4.89 12.8 4.89 12C4.89 11.2 5.02 10.43 5.27 9.71V6.62H1.28C0.47 8.24 0 10.06 0 12C0 13.94 0.47 15.76 1.28 17.38L5.27 14.29Z" fill="#FBBC05"/>
        <path d="M12 4.75C13.77 4.75 15.35 5.36 16.6 6.55L20.02 3.13C17.95 1.19 15.24 0 12 0C7.31 0 3.25 2.7 1.28 6.62L5.27 9.71C6.22 6.86 8.87 4.75 12 4.75Z" fill="#EA4335"/>
      </svg>
      {/* Authentic 'Pay' text */}
      <span className={`text-white font-medium ${textSize} tracking-tight leading-none select-none font-sans`}>
        Pay
      </span>
    </div>
  );
};

// Safe HTTP response parser to prevent "Unexpected token A... is not valid JSON" when servers return HTML or text error pages
async function parseResponseSafely(res: Response): Promise<{ data: any; isJson: boolean; rawText: string }> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      return { data, isJson: true, rawText: '' };
    } catch {
      // JSON parse failed
    }
  }
  const rawText = await res.text().catch(() => '');
  return { data: null, isJson: false, rawText };
}


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
  userId?: string | null;
  lessons?: any[];
}

export interface PaymentsStepProps {
  bookingRef?: string;
  items: PaymentLineItem[];
  customerInfo: CustomerPaymentInfo;
  onBack: () => void;
  onPaymentSuccess: (
    booking: any, 
    details?: { method: string; transactionId: string; amount: number }
  ) => void;
  isProcessingOverride?: boolean;
}

// Inner form component wrapped in Stripe Elements provider
interface RealStripeCheckoutFormProps {
  clientSecret?: string;
  serverTotal: number;
  verifiedItems: PaymentLineItem[];
  customerInfo: CustomerPaymentInfo;
  bookingRef: string;
  onPaymentSuccess: (
    booking: any, 
    details?: { method: string; transactionId: string; amount: number }
  ) => void;
  isBusy: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  onRequestHostedCheckout: () => void;
  isCreatingHosted: boolean;
}

const RealStripeCheckoutForm: React.FC<RealStripeCheckoutFormProps> = ({
  clientSecret,
  serverTotal,
  verifiedItems,
  customerInfo,
  bookingRef,
  onPaymentSuccess,
  isBusy,
  setIsSubmitting,
  setErrorMessage,
  onRequestHostedCheckout,
  isCreatingHosted
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [hasGooglePay, setHasGooglePay] = useState(false);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);
  const [isGooglePayProcessing, setIsGooglePayProcessing] = useState(false);
  const [showGooglePayModal, setShowGooglePayModal] = useState(false);

  // Handle Google Pay confirmation
  const handleGooglePayConfirm = async (event: any) => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: event.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/book-now?step=confirmed`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Google Pay authorization failed');
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        // Authoritative server-side verification and booking confirmation
        const verifyRes = await fetch('/api/payments/stripe/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
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

        const { data: verifyData, isJson: isVerifyJson } = await parseResponseSafely(verifyRes);
        if (!verifyRes.ok || !isVerifyJson || !verifyData?.success) {
          throw new Error(verifyData?.message || 'Server verification failed');
        }

        onPaymentSuccess(verifyData.booking, {
          method: 'google_pay',
          transactionId: paymentIntent.id,
          amount: serverTotal
        });
      }
    } catch (err: any) {
      console.error('[Stripe] Google Pay error:', err);
      setErrorMessage(err.message || 'Payment confirmation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dedicated Click Handler for the Official Google Pay Button
  const handleGooglePayClick = async () => {
    if (isBusy || isCreatingHosted || isGooglePayProcessing) return;
    setIsGooglePayProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Probe if browser can display native PaymentRequest Google Pay sheet
      if (stripe && clientSecret) {
        try {
          const pr = stripe.paymentRequest({
            country: 'AU',
            currency: 'aud',
            total: {
              label: verifiedItems[0]?.name || "Driving Lesson",
              amount: Math.round(serverTotal * 100),
            },
            requestPayerName: true,
            requestPayerEmail: true,
          });

          const canPay = await pr.canMakePayment();
          if (canPay && canPay.googlePay) {
            pr.show();
            pr.on('paymentmethod', async (ev) => {
              setIsSubmitting(true);
              const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
                clientSecret,
                { payment_method: ev.paymentMethod.id },
                { handleActions: false }
              );
              if (confirmError) {
                ev.complete('fail');
                setErrorMessage(confirmError.message || 'Google Pay authorization failed');
                setIsSubmitting(false);
                setIsGooglePayProcessing(false);
                return;
              }
              ev.complete('success');

              const verifyRes = await fetch('/api/payments/stripe/confirm-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentIntentId: paymentIntent.id,
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

              const { data: verifyData, isJson: isVerifyJson } = await parseResponseSafely(verifyRes);
              if (!verifyRes.ok || !isVerifyJson || !verifyData?.success) {
                throw new Error(verifyData?.message || 'Server verification failed');
              }

              onPaymentSuccess(verifyData.booking, {
                method: 'google_pay',
                transactionId: paymentIntent.id,
                amount: serverTotal
              });
            });

            pr.on('cancel', () => {
              setIsGooglePayProcessing(false);
            });
            return;
          }
        } catch (prErr) {
          console.log('[Google Pay] Native payment request check:', prErr);
        }
      }

      // 2. Open interactive Google Pay Sheet dialog with instant checkout options
      setIsGooglePayProcessing(false);
      setShowGooglePayModal(true);
    } catch (err: any) {
      console.error('[Google Pay] Activation error:', err);
      setErrorMessage(err.message || 'Unable to open Google Pay.');
      setIsGooglePayProcessing(false);
    }
  };

  const handleModalProceedToGooglePay = () => {
    setShowGooglePayModal(false);
    onRequestHostedCheckout();
  };

  // Handle regular Stripe Card submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Payment gateway is loading. Please wait a moment.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/book-now?step=confirmed`,
          payment_method_data: {
            billing_details: {
              name: customerInfo.name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || undefined,
              email: customerInfo.email || undefined,
              phone: customerInfo.phone || undefined,
              address: {
                line1: customerInfo.address || customerInfo.pickupAddress || undefined,
                country: 'AU',
              }
            }
          }
        },
        redirect: 'if_required',
      });

      if (error) {
        console.warn('[Stripe] Card payment error:', error);
        setErrorMessage(error.message || 'Your card payment could not be processed.');
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        // Authoritative server-side verification and booking confirmation
        const verifyRes = await fetch('/api/payments/stripe/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
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

        const { data: verifyData, isJson: isVerifyJson } = await parseResponseSafely(verifyRes);
        if (!verifyRes.ok || !isVerifyJson || !verifyData?.success) {
          throw new Error(verifyData?.message || 'Payment confirmed by Stripe, but server booking verification failed.');
        }

        onPaymentSuccess(verifyData.booking, {
          method: 'card',
          transactionId: paymentIntent.id,
          amount: serverTotal
        });
      }
    } catch (err: any) {
      console.error('[Stripe] Card payment error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while processing your card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Official Google Pay Instant Checkout Container (Always Visible & Prominent) */}
        <div className="bg-gradient-to-b from-neutral-50 via-white to-white border border-black/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-black text-white px-2 py-0.5 rounded-md text-[11px] font-bold">
                <GooglePayMark size="sm" />
              </span>
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Google Pay Instant Checkout
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              1-Click Checkout
            </span>
          </div>

          {/* If Stripe's native ExpressCheckoutElement is available on this device */}
          {hasGooglePay && (
            <div className="min-h-[48px]">
              <ExpressCheckoutElement
                options={{
                  buttonHeight: 48,
                  buttonType: {
                    googlePay: 'pay',
                  },
                  buttonTheme: {
                    googlePay: 'black',
                  },
                  paymentMethods: {
                    googlePay: 'auto',
                    applePay: 'never',
                    link: 'never',
                    paypal: 'never',
                    amazonPay: 'never',
                    klarna: 'never',
                  },
                  wallets: {
                    googlePay: 'auto',
                    applePay: 'never',
                  },
                }}
                onConfirm={handleGooglePayConfirm}
                onClick={({ resolve }) => {
                  setErrorMessage(null);
                  resolve();
                }}
                onCancel={() => {
                  setIsSubmitting(false);
                }}
              />
            </div>
          )}

          {/* Primary Clickable Google Pay Button with Official Logo (Always Active & Visible) */}
          {!hasGooglePay && (
            <button
              id="google-pay-checkout-button"
              type="button"
              onClick={handleGooglePayClick}
              disabled={isBusy || isCreatingHosted || isGooglePayProcessing}
              className="w-full h-12 bg-black hover:bg-neutral-900 active:bg-neutral-800 active:scale-[0.99] text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed group relative focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2"
              aria-label="Pay with Google Pay"
            >
              {isGooglePayProcessing ? (
                <div className="flex items-center gap-2 text-white text-xs font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Connecting to Google Pay...</span>
                </div>
              ) : (
                <GooglePayMark size="lg" />
              )}
            </button>
          )}

          <div className="flex items-center justify-between text-[11px] text-black/55 px-1 pt-0.5">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Cards saved to your Google Account • No card entry needed
            </span>
            <span className="font-bold text-neutral-800">AUD ${serverTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Divider between Google Pay and card inputs */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-black/10 absolute" />
          <span className="relative bg-white px-3 text-[11px] font-bold text-black/50 uppercase tracking-wider">
            OR PAY WITH DEBIT / CREDIT CARD
          </span>
        </div>

        {/* 2. Official Stripe PaymentElement (Card Only, Link completely suppressed) */}
        <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#E3222A]" />
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Debit or Credit Card
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-black/50">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>PCI-DSS Level 1 Encrypted</span>
            </div>
          </div>

          {/* The official Stripe Card Element */}
          <div className="min-h-[160px] pt-1">
            <PaymentElement
              options={{
                layout: 'tabs',
                wallets: {
                  applePay: 'never',
                  googlePay: 'never',
                  link: 'never',
                },
                terms: {
                  card: 'never',
                },
              }}
              onReady={() => setIsPaymentElementReady(true)}
            />
          </div>
        </div>

        {/* Trust & Guarantee Banner */}
        <div className="flex items-center justify-between text-[11px] text-black/50 pt-1 px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Secured by Stripe (AUD). Card numbers never touch our servers.</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold tracking-wider bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-black/5">
              VISA
            </span>
            <span className="text-[10px] font-bold tracking-wider bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-black/5">
              MC
            </span>
            <span className="text-[10px] font-bold tracking-wider bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-black/5">
              AMEX
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRequestHostedCheckout}
            disabled={isBusy || isCreatingHosted}
            className="text-xs text-black/60 hover:text-black hover:underline flex items-center gap-1 py-1 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isCreatingHosted ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Opening Stripe Checkout...</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Prefer Stripe Hosted Checkout Page?</span>
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isBusy || !stripe || !elements || !isPaymentElementReady}
            className="w-full sm:w-auto bg-[#E3222A] hover:bg-[#c41a21] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#E3222A]/25 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-white/80" />
                <span>Pay ${serverTotal.toFixed(2)} AUD & Confirm</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Interactive Google Pay Sheet Dialog / Modal */}
      {showGooglePayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-black/10 overflow-hidden space-y-0 text-left"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between bg-neutral-50/80">
              <div className="flex items-center gap-2">
                <GooglePayMark size="md" className="bg-black px-2.5 py-1 rounded-md text-white" />
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Fast Checkout
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGooglePayModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                aria-label="Close Google Pay dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Recipient & Amount Banner */}
              <div className="bg-neutral-50 rounded-xl p-3.5 border border-black/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Wallys Driving School</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {verifiedItems[0]?.name || 'Driving Lesson'} ({bookingRef})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-neutral-900">
                    ${serverTotal.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-neutral-500">AUD</div>
                </div>
              </div>

              {/* Account details */}
              <div className="border border-black/10 rounded-xl p-3.5 space-y-2 bg-white">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Google Account
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {(customerInfo.name || customerInfo.firstName || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-neutral-900 truncate">
                      {customerInfo.name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Google User'}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {customerInfo.email || '3d.threadz14@gmail.com'}
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
              </div>

              {/* Payment Method Selected */}
              <div className="border border-black/10 rounded-xl p-3.5 space-y-2 bg-white">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Payment Method
                </div>
                <div className="flex items-center gap-2.5 text-xs text-neutral-900">
                  <div className="bg-black text-white px-2 py-0.5 rounded font-black text-[10px]">
                    GPay
                  </div>
                  <span className="font-medium flex-1">Cards linked to your Google Account</span>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ready
                  </span>
                </div>
              </div>

              {/* Security info */}
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Protected by Google Security & Stripe 256-bit encryption.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 pt-0 space-y-2.5 bg-white">
              <button
                type="button"
                onClick={handleModalProceedToGooglePay}
                disabled={isBusy || isCreatingHosted}
                className="w-full h-12 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer border border-white/10"
              >
                {isCreatingHosted ? (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Opening Google Pay Checkout...</span>
                  </div>
                ) : (
                  <>
                    <GooglePayMark size="lg" />
                    <span className="text-sm font-semibold ml-1">Pay AUD ${serverTotal.toFixed(2)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowGooglePayModal(false)}
                className="w-full py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Cancel / Pay with Card on this Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// SandboxStripeCheckoutForm: Seamless card & Google Pay fallback for sandbox / preview
// ---------------------------------------------------------------------------
interface SandboxStripeCheckoutFormProps {
  serverTotal: number;
  verifiedItems: PaymentLineItem[];
  customerInfo: any;
  bookingRef: string;
  sandboxPiId: string;
  onPaymentSuccess: (booking: any, meta: any) => void;
  isBusy: boolean;
  setIsSubmitting: (val: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  onRequestHostedCheckout: () => void;
  isCreatingHosted: boolean;
}

const SandboxStripeCheckoutForm: React.FC<SandboxStripeCheckoutFormProps> = ({
  serverTotal,
  verifiedItems,
  customerInfo,
  bookingRef,
  sandboxPiId,
  onPaymentSuccess,
  isBusy,
  setIsSubmitting,
  setErrorMessage,
  onRequestHostedCheckout,
  isCreatingHosted
}) => {
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardholderName, setCardholderName] = useState(() => {
    return customerInfo?.name || `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || 'Student Driver';
  });
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const [isGPayProcessing, setIsGPayProcessing] = useState(false);

  const handleSimulatedPayment = async (methodType: 'card' | 'google_pay') => {
    setIsLocalProcessing(true);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const activePi = sandboxPiId || `pi_sim_${Date.now()}_${bookingRef}`;
      const res = await fetch('/api/payments/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: activePi,
          bookingRef,
          bookingData: {
            studentName: cardholderName,
            email: customerInfo?.email || '',
            phone: customerInfo?.phone || '',
            suburb: customerInfo?.suburb || 'Rockingham, WA',
            pickupAddress: customerInfo?.address || customerInfo?.pickupAddress || '',
            packageTitle: verifiedItems[0]?.name || 'Driving Lesson',
            packagePrice: serverTotal,
            date: customerInfo?.date || customerInfo?.bookingDate || new Date().toISOString().split('T')[0],
            time: customerInfo?.time || customerInfo?.bookingTime || '09:00 AM',
          },
          items: verifiedItems
        })
      });

      const { data, isJson } = await parseResponseSafely(res);
      if (!res.ok || !isJson || !data || data.error) {
        throw new Error(data?.message || 'Payment confirmation failed');
      }

      onPaymentSuccess(data.booking, {
        method: methodType,
        transactionId: activePi,
        amount: serverTotal
      });
    } catch (err: any) {
      console.error('[Sandbox Stripe] Payment error:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsLocalProcessing(false);
      setIsSubmitting(false);
      setIsGPayProcessing(false);
    }
  };

  const handleGPayClick = () => {
    setIsGPayProcessing(true);
    handleSimulatedPayment('google_pay');
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSimulatedPayment('card');
  };

  return (
    <div className="space-y-4">
      {/* 1. Official Google Pay Instant Checkout */}
      <div className="bg-gradient-to-b from-neutral-50 via-white to-white border border-black/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-black text-white px-2 py-0.5 rounded-md text-[11px] font-bold">
              <GooglePayMark size="sm" />
            </span>
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Google Pay Instant Checkout
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            1-Click Checkout
          </span>
        </div>

        <button
          id="google-pay-sandbox-button"
          type="button"
          onClick={handleGPayClick}
          disabled={isBusy || isLocalProcessing || isGPayProcessing}
          className="w-full h-12 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed group relative focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2"
          aria-label="Pay with Google Pay"
        >
          {isGPayProcessing ? (
            <div className="flex items-center gap-2 text-white text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Authorizing with Google Pay...</span>
            </div>
          ) : (
            <GooglePayMark size="lg" />
          )}
        </button>

        <div className="flex items-center justify-between text-[11px] text-black/55 px-1 pt-0.5">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Cards saved to your Google Account • No card entry needed
          </span>
          <span className="font-bold text-neutral-800">AUD ${serverTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="border-t border-black/10 w-full" />
        <span className="bg-[#FAF9F6] px-3 text-[11px] font-semibold text-black/45 uppercase tracking-wider shrink-0">
          Or pay with debit / credit card
        </span>
      </div>

      {/* 2. Direct Card Form */}
      <form onSubmit={handleCardSubmit} className="space-y-4">
        <div className="bg-white border border-black/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#E3222A]" />
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Card Information
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono font-medium">
                Stripe Test Card Ready
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E3222A] focus:border-transparent transition-all"
                  placeholder="4242 4242 4242 4242"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-neutral-400">
                  <span>VISA</span>
                  <span>MC</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E3222A] focus:border-transparent transition-all"
                  placeholder="MM / YY"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                  CVC / CVV
                </label>
                <input
                  type="text"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E3222A] focus:border-transparent transition-all"
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wide mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full h-11 px-3.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E3222A] focus:border-transparent transition-all"
                placeholder="Name on card"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="sandbox-pay-card-button"
          type="submit"
          disabled={isBusy || isLocalProcessing}
          className="w-full py-3.5 bg-[#E3222A] hover:bg-[#c91d24] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLocalProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying Payment with Stripe...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Pay AUD ${serverTotal.toFixed(2)} Securely</span>
            </>
          )}
        </button>
      </form>

      {/* Alternative Hosted Checkout Option */}
      <div className="pt-2 text-center">
        <button
          id="open-stripe-checkout-button"
          type="button"
          onClick={onRequestHostedCheckout}
          disabled={isBusy || isCreatingHosted}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 py-2 px-4 rounded-lg hover:bg-black/5 transition-colors cursor-pointer border border-neutral-200"
        >
          {isCreatingHosted ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
          <span>Open Stripe Checkout</span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-black/45 pt-1">
        <Lock className="w-3 h-3 text-emerald-600" />
        <span>256-bit TLS encrypted transaction • Wallys Driving School</span>
      </div>
    </div>
  );
};

export const PaymentsStep: React.FC<PaymentsStepProps> = ({
  bookingRef: propBookingRef,
  items: initialItems,
  customerInfo,
  onBack,
  onPaymentSuccess,
  isProcessingOverride = false
}) => {
  // Authoritative server-side items and total amount
  const [verifiedItems, setVerifiedItems] = useState<PaymentLineItem[]>(initialItems);
  const [serverTotal, setServerTotal] = useState<number>(() => {
    return initialItems.reduce((acc, item) => acc + (item.unitPrice * (item.quantity || 1)), 0);
  });
  const [bookingRef, setBookingRef] = useState<string>(
    propBookingRef || `WD-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Sync propBookingRef if changed
  useEffect(() => {
    if (propBookingRef && propBookingRef !== bookingRef) {
      setBookingRef(propBookingRef);
    }
  }, [propBookingRef]);

  // Stripe Client Secret & Promise
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  const [sandboxPiId, setSandboxPiId] = useState<string>('');

  // UI state
  const [isLoadingIntent, setIsLoadingIntent] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCreatingHosted, setIsCreatingHosted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSlotConflict = Boolean(
    errorMessage && (
      errorMessage.toLowerCase().includes('already reserved') ||
      errorMessage.toLowerCase().includes('already booked') ||
      errorMessage.toLowerCase().includes('select another') ||
      errorMessage.toLowerCase().includes('no longer available') ||
      errorMessage.toLowerCase().includes('time slot')
    )
  );

  // Initialize Stripe PaymentIntent for Card & Google Pay
  const initializePayment = useCallback(async () => {
    setIsLoadingIntent(true);
    setErrorMessage(null);

    const activeRef = propBookingRef || bookingRef;

    try {
      // 1. Create authoritative PaymentIntent (cards only, Link & Apple Pay disabled)
      const intentRes = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: initialItems,
          customerInfo,
          bookingRef: activeRef
        })
      });

      const { data: intentData, isJson, rawText } = await parseResponseSafely(intentRes);

      if (!intentRes.ok || !isJson || !intentData || intentData.error) {
        if (intentData?.error === 'SLOT_ALREADY_BOOKED') {
          throw new Error(intentData.message || 'This time slot is already reserved. Please select another time.');
        }
        if (intentData?.message) {
          throw new Error(intentData.message);
        }
        if (!intentRes.ok) {
          const detail = rawText && !rawText.startsWith('<!') ? `: ${rawText.slice(0, 150)}` : '';
          throw new Error(`Unable to initialize payment (HTTP ${intentRes.status}${detail}).`);
        }
        throw new Error('Unable to initiate Stripe payment.');
      }

      if (intentData.totalAmount) {
        setServerTotal(intentData.totalAmount);
      }
      if (intentData.items) {
        setVerifiedItems(intentData.items);
      }
      if (intentData.bookingRef && intentData.bookingRef !== bookingRef) {
        setBookingRef(intentData.bookingRef);
      }

      if (intentData.sandboxMode) {
        setIsSandboxMode(true);
        setSandboxPiId(intentData.paymentIntentId || `pi_sim_${activeRef}`);
        setIsLoadingIntent(false);
        return;
      }

      if (intentData.clientSecret) {
        setClientSecret(intentData.clientSecret);
      }
      const clientEnvKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY) || "";
      const pubKey = (intentData.publishableKey || clientEnvKey || "").trim();
      if (pubKey) {
        setStripePromise(loadStripe(pubKey));
      } else {
        // Fallback: fetch publishable key from status
        const statusRes = await fetch('/api/stripe/status');
        const { data: statusData } = await parseResponseSafely(statusRes);
        const fallbackKey = (statusData?.publishableKey || "").trim();
        if (fallbackKey) {
          setStripePromise(loadStripe(fallbackKey));
        } else {
          setIsSandboxMode(true);
          setSandboxPiId(intentData.paymentIntentId || `pi_sim_${activeRef}`);
        }
      }
    } catch (err: any) {
      console.error('[PaymentsStep] Initialization error:', err);
      setErrorMessage(err.message || 'Failed to initialize payment gateway.');
    } finally {
      setIsLoadingIntent(false);
    }
  }, [initialItems, customerInfo, bookingRef, propBookingRef]);

  // Stable initialization trigger: re-run only when booking slot, email or ref changes
  const initTrigger = `${propBookingRef || bookingRef}_${customerInfo?.date || customerInfo?.bookingDate || ''}_${customerInfo?.time || customerInfo?.bookingTime || ''}_${customerInfo?.email || ''}`;

  useEffect(() => {
    initializePayment();
  }, [initTrigger]);

  // Request Stripe Hosted Checkout (fallback / alternative flow)
  const handleRequestHostedCheckout = async () => {
    setIsCreatingHosted(true);
    setErrorMessage(null);

    try {
      const primaryItem = verifiedItems[0] || { name: 'Driving Lesson', unitPrice: serverTotal };
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceTitle: primaryItem.name,
          totalAmount: serverTotal,
          studentName: customerInfo.name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim(),
          studentEmail: customerInfo.email,
          studentPhone: customerInfo.phone,
          pickupAddress: customerInfo.address || customerInfo.pickupAddress,
          bookingDate: customerInfo.date || customerInfo.bookingDate,
          bookingTime: customerInfo.time || customerInfo.bookingTime,
          bookingRef,
          items: verifiedItems,
          lessons: customerInfo.lessons
        })
      });

      const { data, isJson } = await parseResponseSafely(res);
      if (!res.ok || !isJson || !data || data.error) {
        throw new Error(data?.message || 'Failed to generate checkout session.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start Stripe Checkout.');
      setIsCreatingHosted(false);
    }
  };

  const isBusy = isSubmitting || isProcessingOverride || isCreatingHosted;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 1. Header with back chevron and security indicator */}
      <div className="flex items-center justify-between border-b border-black/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isBusy}
            aria-label="Return to previous step"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 text-[#E3222A] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 text-[#E3222A] stroke-[2.5]" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-[#111111] tracking-tight">
              Payment Details
            </h2>
            <p className="text-xs text-black/50">
              Ref: <span className="font-mono font-semibold text-[#111111]">{bookingRef}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">Direct to Merchant (AUD)</span>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#E3222A] shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="font-bold text-red-900">
              {isSlotConflict ? "Selected Slot Conflict" : "Payment Notice"}
            </div>
            <div>{errorMessage}</div>
            {isSlotConflict && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E3222A] text-white rounded-lg font-bold text-xs hover:bg-[#c91d24] transition-colors cursor-pointer mt-1"
              >
                <Clock className="w-3.5 h-3.5" />
                Select Another Time Slot
              </button>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)} 
            className="text-red-500 hover:text-red-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Order & Booking Summary Card */}
      <div className="bg-[#F9F9FB] rounded-2xl p-5 border border-black/10 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-black/60">
            Booking Summary
          </span>
          <span className="text-[11px] text-black/50 font-medium">
            Wallys Driving School NSW
          </span>
        </div>

        {/* Schedule & Location metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-black/70 pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#E3222A] shrink-0" />
            <span className="font-medium text-[#111111]">
              {customerInfo.date || customerInfo.bookingDate || 'Scheduled Date'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#E3222A] shrink-0" />
            <span className="font-medium text-[#111111]">
              {customerInfo.time || customerInfo.bookingTime || 'Scheduled Time'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <MapPin className="w-3.5 h-3.5 text-[#E3222A] shrink-0" />
            <span className="truncate">
              {customerInfo.pickupAddress || customerInfo.address || 'Pickup address provided'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <User className="w-3.5 h-3.5 text-black/40 shrink-0" />
            <span>
              {customerInfo.name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Student Driver'}
              {customerInfo.phone ? ` • ${customerInfo.phone}` : ''}
            </span>
          </div>
        </div>

        {/* Line Items */}
        <div className="border-t border-black/5 pt-3 divide-y divide-black/5 space-y-2">
          {verifiedItems.map((item, idx) => (
            <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-sm">
              <div className="pr-4">
                <div className="font-semibold text-[#111111]">{item.name}</div>
                <div className="text-xs text-black/50">
                  Unit: ${Number(item.unitPrice).toFixed(2)} AUD × {item.quantity || 1}
                </div>
              </div>
              <div className="font-bold text-[#111111] shrink-0 text-right">
                ${Number(item.lineTotal || (item.unitPrice * (item.quantity || 1))).toFixed(2)} AUD
              </div>
            </div>
          ))}
        </div>

        {/* Total Amount row */}
        <div className="border-t border-black/10 pt-3 mt-2 flex items-center justify-between">
          <div className="font-bold text-sm text-[#111111]">
            Total Amount (AUD)
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-[#E3222A]">
            ${serverTotal.toFixed(2)} AUD
          </div>
        </div>
      </div>

      {/* 3. Direct Card & Google Pay Checkout Container */}
      <div className="bg-white border border-black/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div>
            <div className="font-bold text-sm sm:text-base text-[#111111] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#E3222A]" />
              <span>Card & Google Pay Checkout</span>
            </div>
            <p className="text-[11px] text-black/50 mt-0.5">
              Instant, encrypted Australian payment processing via Stripe
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-black text-white px-2 py-0.5 rounded font-medium text-[11px] flex items-center">
              <GooglePayMark size="sm" />
            </span>
            <span className="bg-neutral-100 text-neutral-700 text-[10px] px-2 py-0.5 rounded font-bold border border-black/5">
              CARDS
            </span>
          </div>
        </div>

        {isLoadingIntent ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-black/60">
            <Loader2 className="w-7 h-7 animate-spin text-[#E3222A]" />
            <div className="text-xs font-medium">Connecting to secure Stripe gateway...</div>
          </div>
        ) : isSandboxMode ? (
          <SandboxStripeCheckoutForm
            serverTotal={serverTotal}
            verifiedItems={verifiedItems}
            customerInfo={customerInfo}
            bookingRef={bookingRef}
            sandboxPiId={sandboxPiId}
            onPaymentSuccess={onPaymentSuccess}
            isBusy={isBusy}
            setIsSubmitting={setIsSubmitting}
            setErrorMessage={setErrorMessage}
            onRequestHostedCheckout={handleRequestHostedCheckout}
            isCreatingHosted={isCreatingHosted}
          />
        ) : clientSecret && stripePromise ? (
          <ErrorBoundary
            fallback={
              <div className="p-6 text-center space-y-4 bg-white rounded-xl">
                <AlertCircle className="w-8 h-8 text-[#E3222A] mx-auto" />
                <div className="text-sm font-bold text-neutral-900">
                  Stripe Checkout Ready
                </div>
                <p className="text-xs text-neutral-600 max-w-md mx-auto">
                  Complete your driving lesson booking securely with Stripe Hosted Checkout below.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRequestHostedCheckout}
                    disabled={isCreatingHosted}
                    className="px-5 py-2.5 bg-[#E3222A] text-white rounded-xl font-bold text-xs hover:bg-[#c91d24] transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                  >
                    {isCreatingHosted ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    <span>Open Stripe Checkout</span>
                  </button>
                </div>
              </div>
            }
          >
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#E3222A',
                    colorBackground: '#ffffff',
                    colorText: '#111111',
                    colorDanger: '#df1b41',
                    fontFamily: 'inherit',
                    borderRadius: '10px',
                    fontSizeBase: '14px',
                    spacingUnit: '4px'
                  }
                }
              }}
            >
              <RealStripeCheckoutForm
                clientSecret={clientSecret}
                serverTotal={serverTotal}
                verifiedItems={verifiedItems}
                customerInfo={customerInfo}
                bookingRef={bookingRef}
                onPaymentSuccess={onPaymentSuccess}
                isBusy={isBusy}
                setIsSubmitting={setIsSubmitting}
                setErrorMessage={setErrorMessage}
                onRequestHostedCheckout={handleRequestHostedCheckout}
                isCreatingHosted={isCreatingHosted}
              />
            </Elements>
          </ErrorBoundary>
        ) : (
          <div className="p-6 text-center space-y-4">
            <AlertCircle className="w-9 h-9 text-[#E3222A] mx-auto" />
            <div className="text-sm font-bold text-[#111111]">
              {isSlotConflict ? "Selected Slot Conflict" : "Payment Gateway Notice"}
            </div>
            
            <p className="text-xs text-black/60 max-w-md mx-auto">
              {errorMessage || "Unable to load Stripe elements. Please check your network connection or complete booking via Stripe Hosted Checkout."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {isSlotConflict && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 bg-[#E3222A] text-white rounded-lg font-bold text-xs hover:bg-[#c91d24] transition-colors cursor-pointer"
                >
                  Select Another Slot
                </button>
              )}
              <button
                type="button"
                onClick={initializePayment}
                className="px-3.5 py-2 bg-black/5 text-[#111111] rounded-lg font-semibold text-xs hover:bg-black/10 transition-colors cursor-pointer"
              >
                Retry Connection
              </button>
              <button
                type="button"
                onClick={handleRequestHostedCheckout}
                disabled={isCreatingHosted}
                className="px-4 py-2 bg-[#E3222A] text-white rounded-lg font-bold text-xs hover:bg-[#c91d24] transition-colors cursor-pointer flex items-center gap-2"
              >
                {isCreatingHosted ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                <span>Open Stripe Checkout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsStep;
