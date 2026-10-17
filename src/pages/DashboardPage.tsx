import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit3, Trash2, Star, Eye, IndianRupee, Briefcase, ArrowLeft, X, Save, Camera, Ticket, CheckCircle, Clock, Loader2, Wallet, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service, ServiceType, ServiceBooking, BookingStatus, ProviderPayout } from '@/lib/types';
import { SERVICE_TYPE_LABELS, PRICE_UNITS, SERVICE_CATEGORIES, BOOKING_STATUS_LABELS } from '@/lib/types';
import MenuManagerModal from '@/components/MenuManagerModal';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

type DashTab = 'services' | 'bookings' | 'earnings';
type BookingFilter = 'all' | 'new' | 'upcoming' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [stats, setStats] = useState({ totalBookings: 0, pendingBookings: 0, totalRevenue: 0, pendingPayouts: 0, completedPayouts: 0, totalEarnings: 0 });
  const [dashTab, setDashTab] = useState<DashTab>('services');
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [payouts, setPayouts] = useState<ProviderPayout[]>([]);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [menuService, setMenuService] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/');
    if (!loading && profile && (profile.role !== 'provider' || profile.service_type === 'workers')) navigate('/');
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('services')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setServicesError('Your services could not be loaded. Please refresh and try again.');
          setServices([]);
        } else {
          setServices((data ?? []).map((service) => ({
            ...service,
            rating: Number(service.rating ?? 0),
            review_count: Number(service.review_count ?? 0),
            price: Number(service.price ?? 0),
            gallery_urls: Array.isArray(service.gallery_urls) ? service.gallery_urls : [],
          })) as Service[]);
        }
        setLoadingServices(false);
      });
  }, [user]);

  const fetchBookingsAndStats = useCallback(async () => {
    if (!user) return;
    const { data: bData } = await supabase
      .from('service_bookings')
      .select('total_price, status, booking_status, escrow_status')
      .eq('provider_id', user.id);
    if (bData) {
      const total = bData.length;
      const confirmed = bData.filter((b: { status: string; booking_status?: string | null }) => b.booking_status === 'booking_confirmed' || b.status === 'confirmed').length;
      const revenue = bData
        .filter((b: { status: string; booking_status?: string | null }) => b.status === 'completed' || b.status === 'confirmed' || b.booking_status === 'completed')
        .reduce((sum: number, b: { total_price: number }) => sum + Number(b.total_price), 0);
      setStats((prev) => ({ ...prev, totalBookings: total, pendingBookings: confirmed, totalRevenue: revenue }));
    }
    const { data: pData } = await supabase
      .from('provider_payouts')
      .select('amount, platform_fee, status')
      .eq('provider_id', user.id);
    if (pData) {
      const pending = pData.filter((p: { status: string }) => p.status === 'pending').length;
      const completed = pData.filter((p: { status: string }) => p.status === 'completed').length;
      const earnings = pData
        .filter((p: { status: string }) => p.status === 'completed')
        .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
      setStats((prev) => ({ ...prev, pendingPayouts: pending, completedPayouts: completed, totalEarnings: earnings }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchBookingsAndStats();
  }, [user, fetchBookingsAndStats]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('service_bookings')
      .select('*, service:services(*), customer:profiles!service_bookings_user_id_profiles_fkey(*)')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false });
    setBookings((data ?? []) as ServiceBooking[]);
  }, [user]);

  const fetchPayouts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('provider_payouts')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false });
    setPayouts((data ?? []) as ProviderPayout[]);
  }, [user]);

  useEffect(() => {
    if (dashTab === 'bookings') fetchBookings();
    if (dashTab === 'earnings') fetchPayouts();
  }, [dashTab, fetchBookings, fetchPayouts]);

  const providerAccept = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('provider_accept_reject_booking', { p_booking_id: id, p_action: 'accept' });
    await fetchBookings();
    await fetchBookingsAndStats();
    setActionLoading(null);
  };

  const providerReject = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('provider_accept_reject_booking', { p_booking_id: id, p_action: 'reject' });
    await fetchBookings();
    await fetchBookingsAndStats();
    setActionLoading(null);
  };

  const providerMarkCompleted = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('mark_service_completed', { p_booking_id: id });
    await fetchBookings();
    await fetchBookingsAndStats();
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('services').delete().eq('id', id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleAvailable = async (service: Service) => {
    const updated = { ...service, available: !service.available };
    await supabase.from('services').update({ available: !service.available }).eq('id', service.id);
    setServices((prev) => prev.map((s) => s.id === service.id ? updated : s));
  };

  if (loading || loadingServices) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  if (servicesError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-red-100 p-8 shadow-sm">
          <p className="text-red-600 font-semibold">Unable to load your services</p>
          <p className="text-sm text-gray-500 mt-2">{servicesError}</p>
          <button onClick={() => window.location.reload()} className="mt-5 px-5 py-2.5 rounded-xl bg-[#0879c9] text-white font-semibold hover:bg-[#0668a8] transition-colors">Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reveal max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0879c9] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="reveal flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#10213f]">Provider Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage your service listings and bookings</p>
        </div>
        <button
          onClick={() => { setEditingService(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] text-white px-4 py-2.5 rounded-xl font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Service
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { id: 'services', label: 'My Services' },
          { id: 'bookings', label: 'Bookings' },
          { id: 'earnings', label: 'Earnings' },
        ] as { id: DashTab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setDashTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              dashTab === t.id ? 'bg-[#0879c9] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e9f8ff] flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-[#0879c9]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{services.length}</p>
              <p className="text-xs text-gray-500">Active Services</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
              <p className="text-xs text-gray-500">Confirmed Bookings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fff4c7] flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-[#b7812b]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Total Earnings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayouts}</p>
              <p className="text-xs text-gray-500">Pending Payouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Tab */}
      {dashTab === 'bookings' && (
        <ProviderBookingsTab
          bookings={bookings}
          filter={bookingFilter}
          setFilter={setBookingFilter}
          actionLoading={actionLoading}
          onAccept={providerAccept}
          onReject={providerReject}
          onComplete={providerMarkCompleted}
          navigate={navigate}
        />
      )}

      {/* Earnings Tab */}
      {dashTab === 'earnings' && (
        <EarningsTab payouts={payouts} stats={stats} />
      )}

      {/* Services List */}
      {dashTab === 'services' && (services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-400 text-lg mt-4">No services yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first service listing to start receiving bookings.</p>
          <button
            onClick={() => { setEditingService(null); setShowForm(true); }}
            className="mt-6 inline-flex items-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Your First Service
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service, idx) => (
            <div
              key={service.id}
              className="reveal flex flex-col sm:flex-row gap-4 bg-white rounded-2xl border border-[#dcecff] p-4 hover:shadow-md transition-shadow"
              data-stagger={Math.min(idx + 1, 8)}
            >
              <div className="w-full sm:w-28 h-28 rounded-xl overflow-hidden flex-shrink-0">
                <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-[#e9f8ff] text-[#0879c9] text-xs font-medium rounded-full mb-1">
                        {SERVICE_TYPE_LABELS[service.service_type]}
                      </span>
                      <h3
                        className="font-bold text-gray-900 text-lg cursor-pointer hover:text-[#0879c9] transition-colors"
                        onClick={() => navigate(`/service/${service.id}`)}
                      >
                        {service.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium text-gray-700">{Number(service.rating ?? 0).toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({Number(service.review_count ?? 0)})</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    ₹{service.price} {PRICE_UNITS[service.price_unit] || service.price_unit}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-50">
                  <button
                    onClick={() => toggleAvailable(service)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      service.available
                        ? 'text-[#0879c9] bg-[#e9f8ff] hover:bg-[#d3eefb]'
                        : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {service.available ? 'Available' : 'Unavailable'}
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    {service.service_type === 'catering' && (
                      <button
                        onClick={() => setMenuService({ id: service.id, title: service.title })}
                        className="flex items-center gap-1 text-sm text-[#0879c9] hover:text-[#0668a8] transition-colors font-medium"
                      >
                        <UtensilsCrossed className="w-4 h-4" /> Manage Menu
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingService(service); setShowForm(true); }}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0879c9] transition-colors"
                    >
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Menu Manager Modal */}
      {menuService && (
        <MenuManagerModal
          serviceId={menuService.id}
          serviceName={menuService.title}
          onClose={() => setMenuService(null)}
        />
      )}

      {/* Service Form Modal */}
      {showForm && (
        <ServiceFormModal
          service={editingService}
          onClose={() => { setShowForm(false); setEditingService(null); }}
          onSave={async (data) => {
            if (editingService) {
              await supabase.from('services').update(data).eq('id', editingService.id);
              setServices((prev) => prev.map((s) => s.id === editingService.id ? { ...s, ...data } as Service : s));
            } else {
              const { data: newService } = await supabase.from('services').insert({
                ...data,
                provider_id: user.id,
              }).select('*').single();
              const raw = newService as Record<string, unknown>;
              const normalized = { ...raw, rating: Number(raw.rating ?? 0), review_count: Number(raw.review_count ?? 0), price: Number(raw.price ?? 0), gallery_urls: Array.isArray(raw.gallery_urls) ? raw.gallery_urls : [] } as unknown as Service;
              if (newService) setServices((prev) => [normalized, ...prev]);
            }
            setShowForm(false);
            setEditingService(null);
          }}
        />
      )}
    </div>
  );
}

function ProviderBookingsTab({
  bookings,
  filter,
  setFilter,
  actionLoading,
  onAccept,
  onReject,
  onComplete,
  navigate,
}: {
  bookings: ServiceBooking[];
  filter: BookingFilter;
  setFilter: (f: BookingFilter) => void;
  actionLoading: string | null;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  navigate: (path: string) => void;
}) {
  const filterOptions: { id: BookingFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const filtered = bookings.filter((b) => {
    const raw = (b.booking_status || b.status) as string;
    if (filter === 'all') return true;
    if (filter === 'new') return raw === 'awaiting_provider' || raw === 'pending_payment' || raw === 'pending';
    if (filter === 'upcoming') return raw === 'booking_confirmed' || raw === 'confirmed';
    if (filter === 'accepted') return raw === 'booking_confirmed';
    if (filter === 'in_progress') return raw === 'in_progress' || raw === 'awaiting_customer';
    if (filter === 'completed') return raw === 'completed' || raw === 'payout_processing' || raw === 'payout_completed';
    if (filter === 'cancelled') return raw === 'cancelled' || raw === 'refunded' || raw === 'cancellation_requested';
    return true;
  });

  const statusBadgeClass = (rawStatus: string) => {
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
      disputed: 'bg-amber-100 text-amber-700',
      pending: 'bg-amber-50 text-amber-600',
      confirmed: 'bg-teal-50 text-teal-600',
    };
    return styles[rawStatus] || 'bg-gray-100 text-gray-500';
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <Ticket className="w-12 h-12 text-gray-300 mx-auto" />
        <p className="text-gray-400 text-lg mt-4">No bookings yet</p>
        <p className="text-gray-400 text-sm mt-1">When customers book your services, they will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id ? 'bg-[#0879c9] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No bookings in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const svc = b.service;
            const raw = (b.booking_status || b.status) as string;
            const label = BOOKING_STATUS_LABELS[raw as BookingStatus] || raw;
            const canAccept = raw === 'awaiting_provider';
            const canReject = raw === 'awaiting_provider';
            const canComplete = raw === 'booking_confirmed';
            return (
              <div key={b.id} className="bg-white rounded-xl border border-[#dcecff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(raw)}`}>{label}</span>
                      {svc && <span className="text-xs text-gray-400">{SERVICE_TYPE_LABELS[svc.service_type]}</span>}
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{svc?.title || 'Unknown Service'}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Customer: {b.customer_name || (b.customer as { full_name?: string })?.full_name || 'N/A'}
                      {b.customer_phone && ` · ${b.customer_phone}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {b.booking_time && ` · ${b.booking_time}`}
                      {b.event_location && ` · ${b.event_location}`}
                    </p>
                  </div>
                  <span className="font-bold text-gray-900 text-sm flex-shrink-0">₹{Number(b.total_price).toFixed(2)}</span>
                </div>
                {(canAccept || canReject || canComplete) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    {canAccept && (
                      <button
                        onClick={() => onAccept(b.id)}
                        disabled={actionLoading === b.id}
                        className="text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Accept'}
                      </button>
                    )}
                    {canReject && (
                      <button
                        onClick={() => onReject(b.id)}
                        disabled={actionLoading === b.id}
                        className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                    {canComplete && (
                      <button
                        onClick={() => onComplete(b.id)}
                        disabled={actionLoading === b.id}
                        className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Mark Completed'}
                      </button>
                    )}
                    {svc && (
                      <button
                        onClick={() => navigate(`/service/${svc.id}`)}
                        className="text-xs font-medium text-[#0879c9] bg-[#e9f8ff] px-3 py-1.5 rounded-lg hover:bg-[#d5f2ff] transition-colors ml-auto"
                      >
                        View
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EarningsTab({ payouts, stats }: { payouts: ProviderPayout[]; stats: { totalEarnings: number; pendingPayouts: number; completedPayouts: number } }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Total Earnings (After Fee)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayouts}</p>
              <p className="text-xs text-gray-500">Pending Payouts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completedPayouts}</p>
              <p className="text-xs text-gray-500">Completed Payouts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#dcecff] p-5">
        <h3 className="font-bold text-[#10213f] mb-4">Payout History</h3>
        {payouts.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-gray-400 mt-3">No payouts yet</p>
            <p className="text-xs text-gray-400 mt-1">Payouts appear here automatically after a customer confirms service completion.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold text-gray-900 text-sm">₹{Number(p.amount).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Platform Fee: ₹{Number(p.platform_fee).toFixed(2)} · {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                  p.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                  p.status === 'failed' ? 'bg-red-50 text-red-500' :
                  'bg-amber-50 text-amber-600'
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#e9f8ff]/40 rounded-xl border border-[#bdefff] p-4 text-xs text-[#0879c9] flex items-start gap-2">
        <Wallet className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>EventHub holds payments in escrow and automatically releases them to you after the customer confirms service completion. A 5% platform fee is deducted from each payout.</span>
      </div>
    </div>
  );
}

type FormData = {
  title: string;
  description: string;
  service_type: string;
  category: string;
  price: number;
  price_unit: string;
  city: string;
  address: string;
  image_url: string;
  gallery_urls: string[];
  available: boolean;
};

function ServiceFormModal({
  service,
  onClose,
  onSave,
}: {
  service: Service | null;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
}) {
  const [title, setTitle] = useState(service?.title || '');
  const [description, setDescription] = useState(service?.description || '');
  const [serviceType, setServiceType] = useState<ServiceType>(service?.service_type || 'function');
  const [category, setCategory] = useState(service?.category || '');
  const [price, setPrice] = useState(service?.price?.toString() || '0');
  const [priceUnit, setPriceUnit] = useState(service?.price_unit || 'per_event');
  const [city, setCity] = useState(service?.city || '');
  const [address, setAddress] = useState(service?.address || '');
  const [imageUrl, setImageUrl] = useState(service?.image_url || '');
  const [galleryUrls, setGalleryUrls] = useState<string[]>(service?.gallery_urls ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `services/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('service-images').upload(path, file);
    if (!upErr) {
      const { data: pub } = supabase.storage.from('service-images').getPublicUrl(path);
      setImageUrl(pub.publicUrl);
    }
    setUploading(false);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingGallery(true);
    const uploaded: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `services/gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('service-images').upload(path, file);
      if (!upErr) {
        const { data: pub } = supabase.storage.from('service-images').getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
    }
    setGalleryUrls((prev) => [...prev, ...uploaded].slice(0, 5));
    setUploadingGallery(false);
  };

  const serviceTypes = [
    { value: 'function', label: 'Function' },
    { value: 'camera_studio', label: 'Camera Studio' },
    { value: 'catering', label: 'Catering Services' },
    { value: 'workers', label: 'Workers' },
  ];

  const units = [
    { value: 'per_hour', label: 'Per Hour' },
    { value: 'per_day', label: 'Per Day' },
    { value: 'per_event', label: 'Per Event' },
    { value: 'per_person', label: 'Per Person' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      title,
      description,
      service_type: serviceType,
      category,
      price: parseFloat(price) || 0,
      price_unit: priceUnit,
      city,
      address,
      image_url: imageUrl,
      gallery_urls: galleryUrls,
      available: service?.available ?? true,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-gray-900">
            {service ? 'Edit Service' : 'Add New Service'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Corporate Function Package"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe your service..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => { setServiceType(e.target.value as ServiceType); setCategory(''); }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors bg-white"
            >
              {serviceTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors bg-white"
            >
              <option value="">Select a category...</option>
              {SERVICE_CATEGORIES[serviceType].map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price Unit</label>
              <select
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors bg-white"
              >
                {units.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Mumbai"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Image</label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <label className="flex-1 cursor-pointer">
                <span className="block w-full text-center py-3 rounded-xl border border-gray-200 hover:border-[#9ddff7] text-sm font-medium text-[#52627d] transition-colors">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Gallery Images (up to 5)</label>
            <div className="flex flex-wrap gap-3 mb-2">
              {galleryUrls.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => setGalleryUrls((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {galleryUrls.length < 5 && (
                <label className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#9ddff7] transition-colors">
                  {uploadingGallery ? (
                    <div className="w-5 h-5 border-2 border-[#bdefff] border-t-[#0879c9] rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryUpload}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#dcecff] text-[#52627d] font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> {service ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
