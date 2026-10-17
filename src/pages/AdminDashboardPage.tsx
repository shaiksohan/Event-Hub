import { useEffect, useState, useCallback } from 'react';
import {
  Shield, ArrowLeft, Ticket, Users, IndianRupee, AlertTriangle,
  CheckCircle, Clock, Loader2, TrendingUp, FileText, Ban,
  ScanLine, Eye, UserCircle, Store, ArrowRight, Star,
  Image as ImageIcon, X, Wallet, Send,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { ServiceBooking, Profile, PaymentTransaction, ProviderPayout, Dispute, AuditLog } from '@/lib/types';
import { BOOKING_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/lib/types';

type Tab = 'overview' | 'users' | 'providers' | 'bookings' | 'transactions' | 'payouts' | 'disputes' | 'audit';

export default function AdminDashboardPage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !profile) return;
    const isAdmin = profile.role === 'admin';
    setAuthorized(isAdmin);
    setChecking(false);
  }, [user, profile]);

  if (loading || checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0879c9] animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#10213f]">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have administrator access to view this page.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 rounded-xl bg-[#0879c9] text-white font-semibold">
          Go Home
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'providers', label: 'Providers', icon: Store },
    { id: 'bookings', label: 'Bookings', icon: Ticket },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'payouts', label: 'Payouts', icon: IndianRupee },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'audit', label: 'Audit Log', icon: FileText },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0879c9] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#10213f] flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#10213f]">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Full control over users, bookings, payments, and payouts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-[#0879c9] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'providers' && <ProvidersTab />}
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'payouts' && <PayoutsTab />}
      {tab === 'disputes' && <DisputesTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

/* ======================== OVERVIEW ======================== */

function OverviewTab() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalProviders: 0, totalBookings: 0, paidBookings: 0,
    cancelledBookings: 0, disputedBookings: 0, totalRevenue: 0,
    pendingPayouts: 0, completedPayouts: 0, platformRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase.from('profiles').select('role');
      const { data: bookings } = await supabase.from('service_bookings').select('total_price, payment_status, booking_status');
      const { data: payouts } = await supabase.from('provider_payouts').select('amount, platform_fee, status');

      if (profiles) {
        setStats((prev) => ({
          ...prev,
          totalUsers: profiles.filter((p: { role: string }) => p.role === 'customer' || p.role === 'admin').length,
          totalProviders: profiles.filter((p: { role: string }) => p.role === 'provider').length,
        }));
      }
      if (bookings) {
        const paid = bookings.filter((b: { payment_status: string }) => b.payment_status === 'paid');
        const cancelled = bookings.filter((b: { booking_status: string }) => b.booking_status === 'cancelled');
        const disputed = bookings.filter((b: { booking_status: string }) => b.booking_status === 'disputed');
        const revenue = paid.reduce((s: number, b: { total_price: number }) => s + Number(b.total_price), 0);
        setStats((prev) => ({
          ...prev,
          totalBookings: bookings.length,
          paidBookings: paid.length,
          cancelledBookings: cancelled.length,
          disputedBookings: disputed.length,
          totalRevenue: revenue,
        }));
      }
      if (payouts) {
        const pending = payouts.filter((p: { status: string }) => p.status === 'pending');
        const completed = payouts.filter((p: { status: string }) => p.status === 'completed');
        const platformRev = completed.reduce((s: number, p: { platform_fee: number }) => s + Number(p.platform_fee), 0);
        setStats((prev) => ({
          ...prev,
          pendingPayouts: pending.length,
          completedPayouts: completed.length,
          platformRevenue: platformRev,
        }));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-[#e9f8ff] text-[#0879c9]' },
    { label: 'Total Providers', value: stats.totalProviders, icon: Store, color: 'bg-teal-50 text-teal-600' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: Ticket, color: 'bg-blue-50 text-blue-600' },
    { label: 'Paid Bookings', value: stats.paidBookings, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Cancelled', value: stats.cancelledBookings, icon: Ban, color: 'bg-red-50 text-red-500' },
    { label: 'Disputed', value: stats.disputedBookings, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Revenue', value: `\u20B9${stats.totalRevenue.toFixed(0)}`, icon: IndianRupee, color: 'bg-[#fff4c7] text-[#b7812b]' },
    { label: 'Platform Revenue', value: `\u20B9${stats.platformRevenue.toFixed(0)}`, icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
    { label: 'Pending Payouts', value: stats.pendingPayouts, icon: Clock, color: 'bg-orange-50 text-orange-600' },
    { label: 'Completed Payouts', value: stats.completedPayouts, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
            <c.icon className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{c.value}</p>
          <p className="text-xs text-gray-500 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ======================== USERS ======================== */

function UsersTab() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setUsers((data ?? []) as Profile[]);
        setLoading(false);
      });
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.business_name?.toLowerCase().includes(q) ||
      u.referral_code?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, business, or referral code..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none text-sm"
        />
      </div>
      <div className="space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-[#dcecff] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#e9f8ff] flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-5 h-5 text-[#0879c9]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm">{u.full_name || 'Unknown'}</h4>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      u.role === 'admin' ? 'bg-[#10213f] text-white' :
                      u.role === 'provider' ? 'bg-teal-50 text-teal-600' :
                      'bg-[#e9f8ff] text-[#0879c9]'
                    }`}>{u.role}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {u.phone && <span>{u.phone}</span>}
                    {u.business_name && <span className="text-gray-400">Business: {u.business_name}</span>}
                    {u.service_type && u.service_type !== '' && (
                      <span className="text-gray-400">{SERVICE_TYPE_LABELS[u.service_type as keyof typeof SERVICE_TYPE_LABELS] || u.service_type}</span>
                    )}
                    {u.referral_code && <span className="text-gray-400">Code: {u.referral_code}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Joined: {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">₹{Number(u.wallet_balance || 0).toFixed(0)}</p>
                <p className="text-xs text-gray-400">wallet</p>
                <p className="text-xs text-[#b7812b] mt-1">{u.referral_coins || 0} coins</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon={Users} message="No users found" />}
    </div>
  );
}

/* ======================== PROVIDERS ======================== */

function ProvidersTab() {
  const [providers, setProviders] = useState<(Profile & { service_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'provider')
        .order('created_at', { ascending: false });

      if (!profiles) { setLoading(false); return; }

      const providerIds = profiles.map((p) => p.id);
      const { data: services } = await supabase
        .from('services')
        .select('provider_id')
        .in('provider_id', providerIds);

      const countMap: Record<string, number> = {};
      services?.forEach((s: { provider_id: string }) => {
        countMap[s.provider_id] = (countMap[s.provider_id] || 0) + 1;
      });

      setProviders(profiles.map((p) => ({ ...p, service_count: countMap[p.id] || 0 })) as (Profile & { service_count?: number })[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <div key={p.id} className="bg-white rounded-xl border border-[#dcecff] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-teal-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm">{p.full_name || 'Unknown'}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  <span className="font-medium text-teal-600">{p.business_name || 'No business name'}</span>
                  {p.service_type && p.service_type !== '' && (
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-xs font-medium rounded-full">
                      {SERVICE_TYPE_LABELS[p.service_type as keyof typeof SERVICE_TYPE_LABELS] || p.service_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                  {p.phone && <span>{p.phone}</span>}
                  {p.upi_id && <span>UPI: {p.upi_id}</span>}
                  <span>{p.service_count} service(s) listed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {providers.length === 0 && <EmptyState icon={Store} message="No providers found" />}
    </div>
  );
}

/* ======================== BOOKINGS (with Payment Scanner) ======================== */

function BookingsTab() {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerBooking, setScannerBooking] = useState<ServiceBooking | null>(null);
  const { navigate } = useRouter();

  const fetchBookings = useCallback(async () => {
    const { data } = await supabase
      .from('service_bookings')
      .select('*, service:services(*), customer:profiles!service_bookings_user_id_profiles_fkey(*)')
      .order('created_at', { ascending: false });
    setBookings((data ?? []) as ServiceBooking[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="bg-white rounded-xl border border-[#dcecff] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono text-gray-400">{b.id.slice(0, 12)}</span>
                <span className="px-2 py-0.5 bg-[#e9f8ff] text-[#0879c9] text-xs font-medium rounded-full">
                  {b.service ? SERVICE_TYPE_LABELS[b.service.service_type] : 'N/A'}
                </span>
                <StatusBadge status={b.booking_status || b.status} />
                {b.payment_screenshot_url && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full flex items-center gap-1">
                    <ScanLine className="w-3 h-3" /> Screenshot
                  </span>
                )}
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{b.service?.title || 'Unknown Service'}</h4>
              <p className="text-xs text-gray-500 mt-1">
                Customer: {b.customer_name || (b.customer as { full_name?: string })?.full_name || 'N/A'}
                {b.customer_phone && ` · ${b.customer_phone}`}
                {' '}· ₹{Number(b.total_price).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' '}·{' '}
                <span className={`font-medium ${
                  b.payment_status === 'paid' ? 'text-emerald-600' :
                  b.payment_status === 'failed' ? 'text-red-500' :
                  'text-amber-600'
                }`}>Payment: {b.payment_status}</span>
                {' '}·{' '}
                <span className={`font-medium ${
                  b.escrow_status === 'released' ? 'text-emerald-600' :
                  b.escrow_status === 'held' ? 'text-amber-600' :
                  'text-gray-400'
                }`}>Escrow: {b.escrow_status}</span>
              </p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {b.payment_screenshot_url && (
                <button
                  onClick={() => setScannerBooking(b)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-medium hover:bg-emerald-100 transition-colors"
                >
                  <ScanLine className="w-3.5 h-3.5" /> Scan
                </button>
              )}
              <button
                onClick={() => navigate(`/service/${b.service_id}`)}
                className="text-xs text-[#0879c9] hover:underline"
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
      {bookings.length === 0 && <EmptyState icon={Ticket} message="No bookings found" />}

      {/* Payment Screenshot Scanner Modal */}
      {scannerBooking && (
        <PaymentScannerModal
          booking={scannerBooking}
          onClose={() => setScannerBooking(null)}
          onUpdate={fetchBookings}
        />
      )}
    </div>
  );
}

function PaymentScannerModal({ booking, onClose, onUpdate }: {
  booking: ServiceBooking;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [action, setAction] = useState<string | null>(null);
  const [escrowStatus, setEscrowStatus] = useState(booking.escrow_status);

  const verifyPayment = async () => {
    setAction('verify');
    await supabase
      .from('service_bookings')
      .update({ payment_status: 'paid' })
      .eq('id', booking.id);
    await onUpdate();
    setAction(null);
  };

  const releaseEscrow = async () => {
    setAction('release');
    await supabase
      .from('service_bookings')
      .update({
        escrow_status: 'released',
        escrow_released_at: new Date().toISOString(),
        booking_status: 'payout_processing',
      })
      .eq('id', booking.id);
    setEscrowStatus('released');
    await onUpdate();
    setAction(null);
  };

  const customerName = booking.customer_name || (booking.customer as { full_name?: string })?.full_name || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Payment Scanner</h3>
              <p className="text-xs text-gray-400">Booking {booking.id.slice(0, 12)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Booking details */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-900">{customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-gray-900 text-right">{booking.service?.title || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-[#10213f]">₹{Number(booking.total_price).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Method</span>
              <span className="font-medium text-gray-900">{booking.payment_method || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Status</span>
              <span className={`font-medium ${
                booking.payment_status === 'paid' ? 'text-emerald-600' :
                booking.payment_status === 'failed' ? 'text-red-500' :
                'text-amber-600'
              }`}>{booking.payment_status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Escrow Status</span>
              <span className={`font-medium ${
                escrowStatus === 'released' ? 'text-emerald-600' :
                escrowStatus === 'held' ? 'text-amber-600' :
                'text-gray-400'
              }`}>{escrowStatus}</span>
            </div>
          </div>

          {/* Payment Screenshot */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-gray-400" /> Payment Screenshot
            </p>
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={booking.payment_screenshot_url!}
                alt="Payment proof"
                className="w-full max-h-80 object-contain"
              />
            </div>
            <a
              href={booking.payment_screenshot_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0879c9] hover:underline mt-1.5 inline-flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> Open full size
            </a>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {booking.payment_status !== 'paid' && (
              <button
                onClick={verifyPayment}
                disabled={action !== null}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                {action === 'verify' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Verify Payment
              </button>
            )}
            {booking.payment_status === 'paid' && escrowStatus !== 'released' && (
              <button
                onClick={releaseEscrow}
                disabled={action !== null}
                className="w-full flex items-center justify-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] text-white font-medium rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                {action === 'release' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Release to Provider
              </button>
            )}
            {escrowStatus === 'released' && (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium py-2">
                <CheckCircle className="w-4 h-4" /> Payment released to provider
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================== TRANSACTIONS ======================== */

function TransactionsTab() {
  const [txns, setTxns] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTxns((data ?? []) as PaymentTransaction[]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {txns.map((t) => (
        <div key={t.id} className="bg-white rounded-xl border border-[#dcecff] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-gray-400">{t.gateway_payment_id || 'N/A'}</p>
            <p className="text-sm font-medium text-gray-900 mt-1">₹{(Number(t.amount) / 100).toFixed(2)}</p>
            <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            t.status === 'verified' ? 'bg-emerald-50 text-emerald-600' :
            t.status === 'failed' ? 'bg-red-50 text-red-500' :
            'bg-amber-50 text-amber-600'
          }`}>{t.status}</span>
        </div>
      ))}
      {txns.length === 0 && <EmptyState icon={FileText} message="No transactions yet" />}
    </div>
  );
}

/* ======================== PAYOUTS ======================== */

function PayoutsTab() {
  const [payouts, setPayouts] = useState<(ProviderPayout & { booking?: ServiceBooking; provider?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    const { data } = await supabase
      .from('provider_payouts')
      .select('*, booking:service_bookings(*), provider:profiles!provider_payouts_provider_id_fkey(*)')
      .order('created_at', { ascending: false });
    setPayouts((data ?? []) as (ProviderPayout & { booking?: ServiceBooking; provider?: Profile })[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const releasePayout = async (id: string) => {
    setReleasing(id);
    await supabase
      .from('provider_payouts')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);
    await fetchPayouts();
    setReleasing(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {payouts.map((p) => (
        <div key={p.id} className="bg-white rounded-xl border border-[#dcecff] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">₹{Number(p.amount).toFixed(2)}</p>
              <p className="text-xs text-gray-400">Platform Fee: ₹{Number(p.platform_fee).toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Provider: {p.provider?.full_name || p.provider?.business_name || 'N/A'}
              </p>
              <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                p.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                p.status === 'failed' ? 'bg-red-50 text-red-500' :
                'bg-amber-50 text-amber-600'
              }`}>{p.status}</span>
              {p.status === 'pending' && (
                <button
                  onClick={() => releasePayout(p.id)}
                  disabled={releasing === p.id}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#0879c9] text-white font-medium hover:bg-[#0668a8] transition-colors disabled:opacity-50"
                >
                  {releasing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Transfer
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {payouts.length === 0 && <EmptyState icon={IndianRupee} message="No payouts yet" />}
    </div>
  );
}

/* ======================== DISPUTES ======================== */

function DisputesTab() {
  const [disputes, setDisputes] = useState<(Dispute & { booking?: ServiceBooking })[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    const { data } = await supabase
      .from('disputes')
      .select('*, booking:service_bookings(*)')
      .order('created_at', { ascending: false });
    setDisputes((data ?? []) as (Dispute & { booking?: ServiceBooking })[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const resolveDispute = async (id: string, status: string) => {
    setResolving(id);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from('disputes').update({
      status,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    await fetchDisputes();
    setResolving(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <div key={d.id} className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{d.reason}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(d.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${
              d.status === 'open' ? 'bg-amber-50 text-amber-600' :
              d.status === 'under_review' ? 'bg-blue-50 text-blue-600' :
              'bg-emerald-50 text-emerald-600'
            }`}>{d.status.replace(/_/g, ' ')}</span>
          </div>
          {d.status === 'open' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => resolveDispute(d.id, 'resolved_favor_customer')}
                disabled={resolving === d.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Favor Customer
              </button>
              <button
                onClick={() => resolveDispute(d.id, 'resolved_favor_provider')}
                disabled={resolving === d.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 font-medium hover:bg-teal-100 transition-colors disabled:opacity-50"
              >
                Favor Provider
              </button>
            </div>
          )}
        </div>
      ))}
      {disputes.length === 0 && <EmptyState icon={AlertTriangle} message="No disputes found" />}
    </div>
  );
}

/* ======================== AUDIT LOG ======================== */

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs((data ?? []) as AuditLog[]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0879c9] animate-spin" /></div>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{log.action}</p>
              <p className="text-xs text-gray-400">{log.entity_type} · {new Date(log.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      ))}
      {logs.length === 0 && <EmptyState icon={FileText} message="No audit entries yet" />}
    </div>
  );
}

/* ======================== SHARED ======================== */

function StatusBadge({ status }: { status: string }) {
  const label = BOOKING_STATUS_LABELS[status as keyof typeof BOOKING_STATUS_LABELS] || status;
  const styles: Record<string, string> = {
    pending_payment: 'bg-amber-50 text-amber-600',
    payment_successful: 'bg-emerald-50 text-emerald-600',
    awaiting_provider: 'bg-blue-50 text-blue-600',
    booking_confirmed: 'bg-teal-50 text-teal-600',
    in_progress: 'bg-indigo-50 text-indigo-600',
    awaiting_customer: 'bg-cyan-50 text-cyan-600',
    completed: 'bg-green-50 text-green-600',
    payout_processing: 'bg-orange-50 text-orange-600',
    payout_completed: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-red-50 text-red-500',
    disputed: 'bg-amber-50 text-amber-600',
    refunded: 'bg-gray-100 text-gray-500',
    pending: 'bg-amber-50 text-amber-600',
    confirmed: 'bg-teal-50 text-teal-600',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {label}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Ticket; message: string }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <Icon className="w-12 h-12 text-gray-300 mx-auto" />
      <p className="text-gray-400 text-lg mt-4">{message}</p>
    </div>
  );
}
