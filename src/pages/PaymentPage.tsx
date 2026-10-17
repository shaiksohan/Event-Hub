import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Loader2, Lock, Shield,
  Smartphone, CreditCard, Building2, Wallet, IndianRupee, Clock,
  Info, XCircle, RefreshCw, Copy, QrCode,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { ServiceBooking, Profile } from '@/lib/types';

type PaymentStep = 'loading' | 'summary' | 'upi_apps' | 'processing' | 'success' | 'failed' | 'dev_mode';
type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

const EVENTHUB_UPI_ID = '9701872176@ibl';
const EVENTHUB_PAYEE_NAME = 'EventHub';

type UpiApp = {
  id: string;
  name: string;
  color: string;
  bg: string;
  scheme: (pa: string, pn: string, am: number, tn: string) => string;
};

const UPI_APPS: UpiApp[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: 'text-white',
    bg: 'bg-[#5f259f]',
    scheme: (pa, pn, am, tn) =>
      `phonepe://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${am.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tn)}`,
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    color: 'text-white',
    bg: 'bg-[#1a73e8]',
    scheme: (pa, pn, am, tn) =>
      `tez://upi/pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${am.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tn)}`,
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: 'text-white',
    bg: 'bg-[#00baf2]',
    scheme: (pa, pn, am, tn) =>
      `paytmmp://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${am.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tn)}`,
  },
];

function buildUpiIntent(pa: string, pn: string, am: number, tn: string): string {
  return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${am.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tn)}`;
}

const TAX_RATE = 0.05;
const PLATFORM_FEE_RATE = 0.05;

export default function PaymentPage({ bookingId }: { bookingId: string }) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [step, setStep] = useState<PaymentStep>('loading');
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PayMethod>('upi');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<string | null>(null);
  const [upiPaidLoading, setUpiPaidLoading] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!user) return;
    const { data, error: fetchErr } = await supabase
      .from('service_bookings')
      .select('*, service:services(*)')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !data) {
      setError('Booking not found');
      setStep('failed');
      return;
    }

    const b = data as ServiceBooking;
    setBooking(b);

    if (b.provider_id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', b.provider_id)
        .maybeSingle();
      if (prof) setProvider(prof as Profile);
    }

    if (b.payment_status === 'paid' || b.booking_status === 'payment_successful') {
      setStep('success');
    } else {
      setStep('summary');
    }
  }, [bookingId, user]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const subtotal = booking ? Number(booking.total_price) : 0;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const finalAmount = Math.round((subtotal + tax + platformFee) * 100) / 100;

  const createOrder = async (): Promise<{ order_id: string; dev_mode: boolean; key_id: string | null; amount: number } | null> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) { setError('Not authenticated'); return null; }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-gateway/create-order`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || 'Failed to create payment order');
      return null;
    }

    return await res.json();
  };

  const verifyPayment = async (paymentId: string, sig: string, ordId: string): Promise<boolean> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) { setError('Not authenticated'); return false; }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-gateway/verify-payment`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        razorpay_payment_id: paymentId,
        razorpay_order_id: ordId,
        razorpay_signature: sig,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || 'Payment verification failed');
      return false;
    }

    return true;
  };

  const handlePay = async () => {
    if (!booking) return;
    if (selectedMethod === 'upi') {
      setStep('upi_apps');
      return;
    }
    setStep('processing');
    setError('');

    try {
      const order = await createOrder();
      if (!order) {
        setStep('failed');
        return;
      }

      setOrderId(order.order_id);
      setDevMode(order.dev_mode);

      if (order.dev_mode) {
        // Dev mode: simulate payment with fake IDs
        const fakePaymentId = `pay_dev_${Date.now()}`;
        const ok = await verifyPayment(fakePaymentId, 'dev_mode', order.order_id);
        if (ok) {
          setStep('success');
        } else {
          setStep('failed');
        }
        return;
      }

      // Production: load Razorpay checkout
      const rzp = await loadRazorpayCheckout();
      if (!rzp) {
        setError('Failed to load payment gateway. Please check your connection.');
        setStep('failed');
        return;
      }

      const options: Record<string, unknown> = {
        key: order.key_id,
        amount: order.amount,
        currency: 'INR',
        name: 'EventHub',
        description: booking.service?.title || 'Service Booking',
        order_id: order.order_id,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const ok = await verifyPayment(
            response.razorpay_payment_id,
            response.razorpay_signature,
            response.razorpay_order_id,
          );
          if (ok) {
            setStep('success');
          } else {
            setStep('failed');
          }
        },
        modal: {
          ondismiss: () => {
            setError('Payment cancelled. You can try again.');
            setStep('summary');
          },
        },
        theme: { color: '#0879c9' },
      };

      const rzpInstance = new rzp(options as RazorpayOptions);
      rzpInstance.open();
    } catch {
      setError('An unexpected error occurred during payment.');
      setStep('failed');
    }
  };

  const markUpiPaid = async () => {
    if (!booking || !user) return;
    setUpiPaidLoading(true);
    const { error: upErr } = await supabase
      .from('service_bookings')
      .update({
        payment_status: 'paid',
        booking_status: 'payment_successful',
        payment_method: selectedUpiApp || 'upi',
      })
      .eq('id', bookingId)
      .eq('user_id', user.id);
    if (upErr) {
      setUpiPaidLoading(false);
      setError('Could not update payment status. Please contact support.');
      setStep('failed');
      return;
    }
    if (booking.provider_id) {
      await supabase.from('notifications').insert({
        user_id: booking.provider_id,
        actor_id: user.id,
        type: 'booking',
        entity_id: booking.service_id,
        entity_type: 'service',
        message: 'A new booking has been paid and is awaiting your acceptance',
      });
    }
    setUpiPaidLoading(false);
    setStep('success');
  };

  const openUpiApp = (app: UpiApp) => {
    if (!booking) return;
    setSelectedUpiApp(app.id);
    const tn = `EventHub ${booking.id.slice(0, 8)}`;
    const url = app.scheme(EVENTHUB_UPI_ID, EVENTHUB_PAYEE_NAME, finalAmount, tn);
    triggerUpiDeepLink(url);
  };

  const openAnyUpi = () => {
    if (!booking) return;
    const tn = `EventHub ${booking.id.slice(0, 8)}`;
    const url = buildUpiIntent(EVENTHUB_UPI_ID, EVENTHUB_PAYEE_NAME, finalAmount, tn);
    triggerUpiDeepLink(url);
  };

  const triggerUpiDeepLink = (url: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => { document.body.removeChild(iframe); }, 3000);
  };

  const copyUpiId = () => {
    navigator.clipboard?.writeText(EVENTHUB_UPI_ID).catch(() => {});
  };

  if (step === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0879c9] animate-spin" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-[#dcecff] p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#10213f] mt-4">Payment Successful</h2>
          <p className="text-gray-500 mt-2">Your payment is safely held by EventHub until the service is completed and you confirm it.</p>

          {booking && (
            <div className="mt-6 text-left bg-[#e9f8ff]/50 rounded-xl border border-[#bdefff] p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-mono font-semibold text-[#0879c9]">{booking.id.slice(0, 12)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service</span>
                <span className="font-medium text-gray-900">{booking.service?.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold text-[#0879c9]">₹{finalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment status</span>
                <span className="font-medium text-emerald-600">Received and held by EventHub</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Next step</span>
                <span className="font-medium text-[#0879c9]">Provider completes the service</span>
              </div>
            </div>
          )}

          {devMode && (
            <div className="mt-4 mx-auto max-w-md bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Development mode: No real payment was processed. Add Razorpay credentials to enable live payments.</span>
            </div>
          )}

          <div className="flex gap-3 mt-6 max-w-sm mx-auto">
            <button
              onClick={() => navigate('/bookings')}
              className="flex-1 py-3 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] text-white font-semibold transition-colors"
            >
              View My Bookings
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'failed') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#10213f] mt-4">Payment Failed</h2>
          <p className="text-gray-500 mt-2">{error || 'Your payment could not be processed. Please try again.'}</p>
          <div className="flex gap-3 mt-6 max-w-sm mx-auto">
            <button
              onClick={() => { setError(''); setStep('summary'); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] text-white font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={() => navigate('/bookings')}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              View Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#0879c9] animate-spin" />
        <p className="text-gray-500">Processing your payment securely...</p>
        <p className="text-xs text-gray-400">Please do not close or refresh this page.</p>
      </div>
    );
  }

  if (step === 'upi_apps' && booking) {
    const tn = `EventHub ${booking.id.slice(0, 8)}`;
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => { setStep('summary'); setSelectedUpiApp(null); }}
          className="flex items-center gap-2 text-sm text-[#52627d] hover:text-[#0879c9] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-2xl border border-[#dcecff] p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#e9f8ff] flex items-center justify-center mb-3">
              <Smartphone className="w-8 h-8 text-[#0879c9]" />
            </div>
            <h2 className="text-xl font-bold text-[#10213f]">Pay via UPI</h2>
            <p className="text-sm text-gray-500 mt-1">Choose your UPI app to pay <span className="font-bold text-[#0879c9]">₹{finalAmount.toFixed(2)}</span></p>
          </div>

          {/* Payee info card */}
          <div className="bg-[#e9f8ff]/50 border border-[#bdefff] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pay to</span>
              <span className="font-bold text-[#10213f]">{EVENTHUB_PAYEE_NAME}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">UPI ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-[#0879c9]">{EVENTHUB_UPI_ID}</span>
                <button onClick={copyUpiId} className="text-gray-400 hover:text-[#0879c9] transition-colors" aria-label="Copy UPI ID">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-[#10213f]">₹{finalAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Note</span>
              <span className="font-mono text-gray-600">{tn}</span>
            </div>
          </div>

          {/* UPI App buttons */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tap an app to pay</p>
          <div className="space-y-3 mb-4">
            {UPI_APPS.map((app) => (
              <button
                key={app.id}
                onClick={() => openUpiApp(app)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${app.bg} hover:opacity-90 transition-all hover:scale-[1.02] shadow-sm`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-bold text-base">{app.name}</p>
                  <p className="text-white/70 text-xs">Opens {app.name} with ₹{finalAmount.toFixed(2)} pre-filled</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/70" />
              </button>
            ))}
          </div>

          {/* Other UPI / fallback */}
          <button
            onClick={openAnyUpi}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-gray-200 hover:border-[#0879c9] hover:bg-[#e9f8ff]/30 transition-all text-gray-600 font-medium text-sm mb-6"
          >
            <Smartphone className="w-4 h-4" /> Other UPI App
          </button>

          {/* Manual UPI ID section */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Or pay manually</p>
            </div>
            <p className="text-xs text-gray-400">Open any UPI app, send ₹{finalAmount.toFixed(2)} to:</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm font-bold text-[#10213f]">{EVENTHUB_UPI_ID}</span>
              <button onClick={copyUpiId} className="text-gray-400 hover:text-[#0879c9] transition-colors" aria-label="Copy UPI ID">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Payment confirmation — always visible */}
          <div className="border-t border-gray-100 pt-5">
            {selectedUpiApp && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Complete your payment in the UPI app</p>
                    <p className="text-xs text-amber-600 mt-0.5">Finish the payment, then tap "I've Paid" below to confirm your booking.</p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={markUpiPaid}
              disabled={upiPaidLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors disabled:opacity-50"
            >
              {upiPaidLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> I've Paid ₹{finalAmount.toFixed(2)}</>
              )}
            </button>
            <button
              onClick={() => { setStep('summary'); setSelectedUpiApp(null); }}
              className="w-full text-center py-2.5 mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Back to payment options
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-4">
            <Shield className="w-3 h-3" /> Your payment is held securely by EventHub
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center gap-2 text-sm text-[#52627d] hover:text-[#0879c9] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Bookings
      </button>

      {/* Logo + Title */}
      <div className="flex items-center gap-3 mb-6">
        <img src="/eventhub_logo_transparent.png" alt="EventHub" className="w-12 h-12 object-contain" />
        <div>
          <h1 className="text-2xl font-bold text-[#10213f]">Secure Checkout</h1>
          <p className="text-sm text-gray-500">Complete your payment to confirm the booking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left: Booking Summary */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
            <h3 className="font-bold text-[#10213f] mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#0879c9]" /> Booking Summary
            </h3>
            <div className="space-y-3 text-sm">
              <Row label="Booking ID" value={booking.id.slice(0, 12)} mono />
              <Row label="Service Name" value={booking.service?.title || 'N/A'} />
              <Row label="Provider" value={provider?.business_name || provider?.full_name || 'N/A'} />
              <Row label="Event Date" value={`${booking.booking_date}${booking.booking_end_date ? ' to ' + booking.booking_end_date : ''}`} />
              <Row label="Event Time" value={booking.booking_time || 'N/A'} />
              {booking.event_location && <Row label="Event Location" value={booking.event_location} />}
              {booking.num_guests > 1 && <Row label="Guests" value={String(booking.num_guests)} />}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
            <h3 className="font-bold text-[#10213f] mb-4">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <PayMethodCard
                id="upi" label="UPI" desc="PhonePe, GPay, Paytm" icon={Smartphone}
                selected={selectedMethod === 'upi'} onClick={() => setSelectedMethod('upi')}
              />
              <PayMethodCard
                id="card" label="Debit / Credit Card" desc="Visa, Mastercard, RuPay" icon={CreditCard}
                selected={selectedMethod === 'card'} onClick={() => setSelectedMethod('card')}
              />
              <PayMethodCard
                id="netbanking" label="Net Banking" desc="All major banks" icon={Building2}
                selected={selectedMethod === 'netbanking'} onClick={() => setSelectedMethod('netbanking')}
              />
              <PayMethodCard
                id="wallet" label="Wallet" desc="Paytm, Mobikwik" icon={Wallet}
                selected={selectedMethod === 'wallet'} onClick={() => setSelectedMethod('wallet')}
              />
            </div>
          </div>
        </div>

        {/* Right: Price Breakdown + Pay Button */}
        <div className="md:col-span-2">
          <div className="sticky top-24 bg-white rounded-2xl border border-[#dcecff] p-5 space-y-4">
            <h3 className="font-bold text-[#10213f]">Price Details</h3>
            <div className="space-y-2 text-sm">
              <PriceRow label="Service Price" value={`₹${subtotal.toFixed(2)}`} />
              <PriceRow label="Taxes & Fees (5%)" value={`₹${tax.toFixed(2)}`} />
              <PriceRow label="Platform Fee (5%)" value={`₹${platformFee.toFixed(2)}`} />
              <div className="border-t border-gray-100 pt-2">
                <PriceRow label="Final Payable" value={`₹${finalAmount.toFixed(2)}`} bold />
              </div>
            </div>

            <div className="rounded-xl bg-[#e9f8ff]/50 border border-[#bdefff] p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#0879c9] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#0879c9]">
                EventHub holds your payment securely. After the provider finishes the service, you confirm completion, and EventHub automatically releases the provider's payout.
              </p>
            </div>

            <button
              onClick={handlePay}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] text-white font-bold transition-colors"
            >
              <Lock className="w-4 h-4" /> Pay ₹{finalAmount.toFixed(2)}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Clock className="w-3 h-3" /> Secure payment powered by Razorpay
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 max-w-3xl bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`font-medium text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-500'}>{label}</span>
      <span className={bold ? 'font-bold text-[#0879c9] text-lg' : 'font-medium text-gray-900'}>{value}</span>
    </div>
  );
}

function PayMethodCard({
  id, label, desc, icon: Icon, selected, onClick,
}: {
  id: string; label: string; desc: string; icon: typeof Smartphone;
  selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${
        selected
          ? 'border-[#00a8e8] bg-[#e9f8ff] ring-2 ring-[#00a8e8]/30'
          : 'border-gray-200 hover:border-[#9ddff7]'
      }`}
      data-method={id}
    >
      <Icon className={`w-5 h-5 ${selected ? 'text-[#0879c9]' : 'text-gray-400'}`} />
      <span className="text-sm font-semibold text-gray-900">{label}</span>
      <span className="text-xs text-gray-400">{desc}</span>
    </button>
  );
}

function loadRazorpayCheckout(): Promise<typeof window.Razorpay | null> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay || null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}
