import { useEffect, useState, useCallback } from 'react';
import {
  Ticket, Calendar, MapPin, Trash2, Clock, Users, CheckCircle, AlertCircle,
  Hourglass, Edit3, X, Save, Smartphone, IndianRupee, LockKeyhole,
  AlertTriangle, FileText, Loader2, ArrowRight, UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ServiceBooking, BookingStatus, BookingMenuSelection } from '@/lib/types';
import { SERVICE_TYPE_LABELS, BOOKING_STATUS_LABELS } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

const TIMELINE_STEPS: { status: BookingStatus; label: string }[] = [
  { status: 'pending_payment', label: 'Payment' },
  { status: 'awaiting_provider', label: 'Provider Review' },
  { status: 'booking_confirmed', label: 'Confirmed' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'awaiting_customer', label: 'Your Confirmation' },
  { status: 'completed', label: 'Completed' },
];

function getTimelineIndex(status: BookingStatus | null | undefined): number {
  if (!status) return 0;
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status);
  if (idx >= 0) return idx;
  if (status === 'payment_successful') return 1;
  if (status === 'payout_processing' || status === 'payout_completed') return 5;
  return 0;
}

export default function BookingsPage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [editingBooking, setEditingBooking] = useState<ServiceBooking | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState<ServiceBooking | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [bookingMenuSelections, setBookingMenuSelections] = useState<BookingMenuSelection[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!selectedBooking) { setBookingMenuSelections([]); return; }
    supabase
      .from('booking_menu_selections')
      .select('*, menu_item:service_menu_items(*)')
      .eq('booking_id', selectedBooking.id)
      .then(({ data }) => setBookingMenuSelections((data ?? []) as BookingMenuSelection[]));
  }, [selectedBooking]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    const filter = profile?.role === 'provider'
      ? supabase.from('service_bookings').select('*, service:services(*), customer:profiles!service_bookings_user_id_profiles_fkey(*)').eq('provider_id', user.id).order('created_at', { ascending: false })
      : supabase.from('service_bookings').select('*, service:services(*)').eq('user_id', user.id).order('created_at', { ascending: false });
    const { data } = await filter;
    setBookings((data ?? []) as ServiceBooking[]);
    setLoadingBookings(false);
  }, [user, profile]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('bookings-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'service_bookings' },
        (payload) => {
          const newBooking = payload.new as ServiceBooking;
          if (profile?.role === 'provider' && newBooking.provider_id === user.id) {
            supabase
              .from('service_bookings')
              .select('*, service:services(*), customer:profiles!service_bookings_user_id_profiles_fkey(*)')
              .eq('id', newBooking.id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  setBookings((prev) => {
                    if (prev.some((b) => b.id === newBooking.id)) return prev;
                    return [data as ServiceBooking, ...prev];
                  });
                }
              });
          } else if (profile?.role !== 'provider' && newBooking.user_id === user.id) {
            supabase
              .from('service_bookings')
              .select('*, service:services(*)')
              .eq('id', newBooking.id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  setBookings((prev) => {
                    if (prev.some((b) => b.id === newBooking.id)) return prev;
                    return [data as ServiceBooking, ...prev];
                  });
                }
              });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_bookings' },
        (payload) => {
          const updated = payload.new as ServiceBooking;
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'service_bookings' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setBookings((prev) => prev.filter((b) => b.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('request_cancellation', { p_booking_id: id });
    await fetchBookings();
    setActionLoading(null);
    setConfirmDelete(null);
  };

  const providerAccept = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('provider_accept_reject_booking', { p_booking_id: id, p_action: 'accept' });
    await fetchBookings();
    setActionLoading(null);
  };

  const providerReject = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('provider_accept_reject_booking', { p_booking_id: id, p_action: 'reject' });
    await fetchBookings();
    setActionLoading(null);
  };

  const providerMarkCompleted = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('mark_service_completed', { p_booking_id: id });
    await fetchBookings();
    setActionLoading(null);
  };

  const customerConfirm = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('customer_confirm_completion', { p_booking_id: id });
    await fetchBookings();
    setActionLoading(null);
  };

  const providerClaimPayout = async (id: string) => {
    setActionLoading(id);
    await supabase.rpc('provider_claim_payout', { p_booking_id: id });
    await fetchBookings();
    setActionLoading(null);
  };

  const raiseDispute = async () => {
    if (!showDispute || !disputeReason.trim()) return;
    setActionLoading(showDispute.id);
    await supabase.rpc('flag_dispute', { p_booking_id: showDispute.id, p_reason: disputeReason.trim() });
    await fetchBookings();
    setActionLoading(null);
    setShowDispute(null);
    setDisputeReason('');
  };

  const updateStatus = async (id: string, status: ServiceBooking['status']) => {
    await supabase.from('service_bookings').update({ status }).eq('id', id);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  };

  const handleEditSave = async (updatedData: Partial<ServiceBooking>) => {
    if (!editingBooking) return;
    await supabase.from('service_bookings').update({
      booking_date: updatedData.booking_date,
      booking_time: updatedData.booking_time,
      address: updatedData.address,
      notes: updatedData.notes,
      total_price: updatedData.total_price,
      duration_hours: updatedData.duration_hours,
      num_guests: updatedData.num_guests,
      status: updatedData.status,
    }).eq('id', editingBooking.id);
    setBookings((prev) => prev.map((b) => b.id === editingBooking.id ? { ...b, ...updatedData } as ServiceBooking : b));
    setEditingBooking(null);
  };

  const statusBadge = (booking: ServiceBooking) => {
    const rawStatus = booking.booking_status || booking.status;
    const label = BOOKING_STATUS_LABELS[rawStatus as BookingStatus] || rawStatus;
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
      cancellation_requested: 'bg-amber-50 text-amber-600',
      cancelled: 'bg-red-50 text-red-500',
      refund_processing: 'bg-orange-50 text-orange-600',
      refunded: 'bg-gray-100 text-gray-500',
      disputed: 'bg-amber-50 text-amber-600',
      pending: 'bg-amber-50 text-amber-600',
      confirmed: 'bg-teal-50 text-teal-600',
    };
    return (
      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${styles[rawStatus] || 'bg-gray-100 text-gray-500'}`}>
        {label}
      </span>
    );
  };

  if (loading || loadingBookings) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!user) return null;

  const isProvider = profile?.role === 'provider';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="reveal mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {isProvider ? 'Received Bookings' : 'My Bookings'}
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 reveal">
        {isProvider ? 'Manage booking requests from customers' : 'Manage your service reservations'}
      </p>

      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-400 text-lg mt-4">No bookings yet</p>
          <p className="text-gray-400 text-sm mt-1">Browse services and book your first one!</p>
          <button
            onClick={() => navigate('/browse')}
            className="mt-6 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Browse Services
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking, idx) => {
            const service = booking.service;
            if (!service) return null;
            const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            });
            const endDateStr = booking.booking_end_date
              ? new Date(booking.booking_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            const rawStatus = (booking.booking_status || booking.status) as BookingStatus;
            const timelineIdx = getTimelineIndex(rawStatus);
            const canCancel = !['cancelled', 'completed', 'refunded', 'payout_completed'].includes(rawStatus);
            const canDispute = ['booking_confirmed', 'in_progress', 'awaiting_customer', 'completed'].includes(rawStatus) && !booking.dispute_flagged;
            const canPay = rawStatus === 'pending_payment' && !isProvider;
            const canConfirmCompletion = rawStatus === 'awaiting_customer' && !isProvider;
            const canProviderAccept = rawStatus === 'awaiting_provider' && isProvider;
            const canProviderReject = rawStatus === 'awaiting_provider' && isProvider;
            const canProviderComplete = rawStatus === 'booking_confirmed' && isProvider;
            const canProviderClaimPayout = rawStatus === 'payout_processing' && isProvider;

            return (
              <div
                key={booking.id}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('button, a, input, select, textarea')) return;
                  setSelectedBooking(booking);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedBooking(booking);
                  }
                }}
                className="reveal flex flex-col sm:flex-row gap-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-lg hover:shadow-[#0879c9]/8 hover:border-[#0879c9]/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0879c9]/40"
                data-stagger={Math.min(idx + 1, 6)}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBooking(booking)}
                  className="w-full sm:w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0879c9]"
                  aria-label={`Open ${service.title}`}
                >
                  <img src={service.image_url} alt={service.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                </button>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full mb-1">
                          {SERVICE_TYPE_LABELS[service.service_type]}
                        </span>
                        <h3
                          className="font-bold text-gray-900 cursor-pointer hover:text-teal-600 transition-colors"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          {service.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-0.5 text-[#0879c9]/70">
                          Tap to view service details
                        </p>
                      </div>
                      {statusBadge(booking)}
                    </div>

                    {isProvider && booking.customer && (
                      <div className="flex items-center gap-2 mt-2">
                        {(booking.customer as { avatar_url?: string; full_name?: string }).avatar_url ? (
                          <img src={(booking.customer as { avatar_url?: string }).avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-teal-600 text-[10px] font-bold">
                              {((booking.customer as { full_name?: string }).full_name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {(booking.customer as { full_name?: string }).full_name || 'Unknown Customer'}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" /> {dateStr}{endDateStr && ` – ${endDateStr}`}
                      </span>
                      {booking.booking_time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> {booking.booking_time}
                        </span>
                      )}
                      {booking.duration_hours > 1 && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> {booking.duration_hours}h
                        </span>
                      )}
                      {booking.num_guests > 1 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" /> {booking.num_guests} guests
                        </span>
                      )}
                    </div>

                    {booking.event_location && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {booking.event_location}
                      </p>
                    )}
                    {booking.address && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {booking.address}
                      </p>
                    )}
                    {(booking.village || booking.district || booking.state || booking.country) && (
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {[booking.village, booking.district, booking.state, booking.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {booking.notes && (
                      <p className="text-sm text-gray-400 mt-1 italic">"{booking.notes}"</p>
                    )}

                    {/* Payment / Escrow badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {booking.payment_method && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Smartphone className="w-3.5 h-3.5" />
                          {booking.payment_method === 'upi' ? 'UPI' : booking.payment_method === 'card' ? 'Credit / Debit Card' : booking.payment_method || 'N/A'}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        booking.payment_status === 'paid' ? 'bg-[#fff4c7] text-[#8a641d]' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {booking.payment_status}
                      </span>
                      {booking.escrow_status === 'held' && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-[#e9f8ff] text-[#0879c9]">
                          <LockKeyhole className="w-3 h-3" /> In Escrow
                        </span>
                      )}
                      {booking.escrow_status === 'released' && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600">
                          <CheckCircle className="w-3 h-3" /> Released
                        </span>
                      )}
                      {booking.escrow_status === 'refunded' && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-500">
                          <AlertCircle className="w-3 h-3" /> Refunded
                        </span>
                      )}
                      {booking.dispute_flagged && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          <AlertTriangle className="w-3 h-3" /> Disputed
                        </span>
                      )}
                    </div>

                    {/* Timeline */}
                    {rawStatus !== 'cancelled' && rawStatus !== 'refunded' && rawStatus !== 'disputed' && rawStatus !== 'cancellation_requested' && (
                      <div className="mt-3 rounded-xl bg-[#f7fbff] border border-[#dcecff] p-3">
                        <div className="flex items-center gap-1">
                          {TIMELINE_STEPS.map((step, i) => (
                            <div key={step.status} className="flex items-center flex-1">
                              <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= timelineIdx ? 'bg-[#0879c9]' : 'bg-gray-200'}`} />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-gray-400">
                          <span className={timelineIdx >= 0 ? 'text-[#0879c9] font-semibold' : ''}>Payment received by EventHub</span>
                          <span className={timelineIdx >= 4 ? 'text-[#0879c9] font-semibold' : ''}>Service completed</span>
                          <span className={timelineIdx >= 5 && rawStatus === 'payout_completed' ? 'text-emerald-600 font-semibold' : ''}>Provider received</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action bar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
                    <span className="flex items-center gap-1 font-bold text-gray-900">
                      <IndianRupee className="w-4 h-4" />{Number(booking.total_price).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="text-xs font-medium text-[#0879c9] bg-[#e9f8ff] px-3 py-1.5 rounded-lg hover:bg-[#d5f2ff] transition-colors"
                      >
                        Booking Details
                      </button>

                      {/* Customer: Pay now */}
                      {canPay && (
                        <button
                          onClick={() => navigate(`/payment/${booking.id}`)}
                          className="text-xs font-medium text-white bg-[#0879c9] px-3 py-1.5 rounded-lg hover:bg-[#0668a8] transition-colors flex items-center gap-1"
                        >
                          Pay Now <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Provider: Accept */}
                      {canProviderAccept && (
                        <button
                          onClick={() => providerAccept(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Accept'}
                        </button>
                      )}

                      {/* Provider: Reject */}
                      {canProviderReject && (
                        <button
                          onClick={() => providerReject(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}

                      {/* Provider: Mark Completed */}
                      {canProviderComplete && (
                        <button
                          onClick={() => providerMarkCompleted(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Mark Completed'}
                        </button>
                      )}

                      {/* Customer: Confirm Completion */}
                      {canConfirmCompletion && (
                        <button
                          onClick={() => customerConfirm(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Confirm & Release Payment'}
                        </button>
                      )}

                      {/* Provider: Receive Money */}
                      {canProviderClaimPayout && (
                        <button
                          onClick={() => providerClaimPayout(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <IndianRupee className="w-3.5 h-3.5" />}
                          {actionLoading === booking.id ? 'Processing...' : 'Receive Money'}
                        </button>
                      )}

                      {/* Raise Dispute */}
                      {canDispute && (
                        <button
                          onClick={() => setShowDispute(booking)}
                          className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" /> Dispute
                        </button>
                      )}

                      {/* Cancel */}
                      {canCancel && !isProvider && (
                        <button
                          onClick={() => setConfirmDelete(booking.id)}
                          className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Provider: old-style status change for legacy */}
                      {isProvider && (booking.status === 'pending' || booking.status === 'confirmed') && !booking.booking_status && (
                        <>
                          {booking.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(booking.id, 'confirmed')}
                              className="text-xs font-medium text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
                            >
                              Confirm
                            </button>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(booking.id, 'completed')}
                              className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Mark Completed
                            </button>
                          )}
                        </>
                      )}

                      {isProvider && (
                        <button
                          onClick={() => setEditingBooking(booking)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10213f]/55 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-mono">Booking #{selectedBooking.id.slice(0, 10)}</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">Booked Details</h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {selectedBooking.service && (
                <div className="flex items-center gap-3 rounded-xl bg-[#e9f8ff] p-3">
                  <img src={selectedBooking.service.image_url} alt={selectedBooking.service.title} className="w-14 h-14 rounded-lg object-cover" />
                  <div><p className="font-bold text-gray-900">{selectedBooking.service.title}</p><p className="text-xs text-gray-500">{selectedBooking.service.city}</p></div>
                </div>
              )}
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Status</span>{statusBadge(selectedBooking)}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailItem label="Start date" value={new Date(selectedBooking.booking_date).toLocaleDateString()} />
                <DetailItem label="End date" value={selectedBooking.booking_end_date ? new Date(selectedBooking.booking_end_date).toLocaleDateString() : 'Same day'} />
                <DetailItem label="Time" value={selectedBooking.booking_time || 'Not specified'} />
                <DetailItem label="Guests" value={String(selectedBooking.num_guests || 1)} />
                <DetailItem label="Amount" value={`₹${Number(selectedBooking.total_price).toFixed(2)}`} />
                <DetailItem label="Payment" value={selectedBooking.payment_status || 'Pending'} />
              </div>
              <div className="rounded-xl border border-gray-100 p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-900">Event & Contact Information</p>
                {selectedBooking.customer_name && <p><span className="text-gray-500">Customer:</span> {selectedBooking.customer_name}</p>}
                {selectedBooking.customer_phone && <p><span className="text-gray-500">Phone:</span> {selectedBooking.customer_phone}</p>}
                {selectedBooking.event_location && <p className="flex gap-2"><MapPin className="w-4 h-4 text-[#0879c9] mt-0.5" />{selectedBooking.event_location}</p>}
                {selectedBooking.address && <p className="flex gap-2"><MapPin className="w-4 h-4 text-[#0879c9] mt-0.5" />{selectedBooking.address}</p>}
                {(selectedBooking.village || selectedBooking.district || selectedBooking.state || selectedBooking.country) && <p className="text-gray-600">{[selectedBooking.village, selectedBooking.district, selectedBooking.state, selectedBooking.country].filter(Boolean).join(', ')}</p>}
              </div>
              {selectedBooking.notes && <div className="rounded-xl bg-gray-50 p-4 text-sm"><p className="font-semibold text-gray-900 mb-1">Special Requirements</p><p className="text-gray-600">{selectedBooking.notes}</p></div>}
              {bookingMenuSelections.length > 0 && (
                <div className="rounded-xl border border-[#dcecff] p-4 space-y-2 text-sm">
                  <p className="font-semibold text-gray-900 flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-[#0879c9]" /> Selected Menu Items</p>
                  <div className="space-y-1.5">
                    {bookingMenuSelections.map((sel) => {
      const item = sel.menu_item as { name?: string; price?: number; is_veg?: boolean } | null;
      const name = item?.name || 'Item';
      const price = Number(item?.price || 0);
      return (
                      <div key={sel.id} className="flex items-center justify-between">
                        <span className="text-gray-700">{name} × {sel.quantity}</span>
                        <span className="font-medium text-gray-900">₹{(price * sel.quantity).toFixed(2)}</span>
                      </div>
                    );
    })}
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                      <span className="font-semibold text-gray-900">Menu Subtotal</span>
                      <span className="font-bold text-[#0879c9]">₹{bookingMenuSelections.reduce((sum, sel) => sum + Number((sel.menu_item as { price?: number })?.price || 0) * sel.quantity, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500"><LockKeyhole className="w-4 h-4 text-[#0879c9]" /> Escrow: {selectedBooking.escrow_status || 'none'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">Cancel this booking?</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              If payment was made, a refund will be initiated. This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Keep It
              </button>
              <button
                onClick={() => handleCancel(confirmDelete)}
                disabled={actionLoading === confirmDelete}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading === confirmDelete ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDispute(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Raise a Dispute
              </h3>
              <button onClick={() => setShowDispute(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Please describe the issue with this booking. An admin will review your dispute and resolve it fairly.
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              placeholder="Describe the problem..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors resize-none text-gray-900"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDispute(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={raiseDispute}
                disabled={!disputeReason.trim() || actionLoading === showDispute.id}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading === showDispute.id ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-900 mt-1 break-words">{value}</p>
    </div>
  );
}

function EditBookingModal({
  booking,
  onClose,
  onSave,
}: {
  booking: ServiceBooking;
  onClose: () => void;
  onSave: (data: Partial<ServiceBooking>) => Promise<void>;
}) {
  const [bookingDate, setBookingDate] = useState(booking.booking_date);
  const [bookingTime, setBookingTime] = useState(booking.booking_time || '');
  const [address, setAddress] = useState(booking.address || '');
  const [notes, setNotes] = useState(booking.notes || '');
  const [totalPrice, setTotalPrice] = useState(booking.total_price?.toString() || '0');
  const [durationHours, setDurationHours] = useState(booking.duration_hours?.toString() || '1');
  const [numGuests, setNumGuests] = useState(booking.num_guests?.toString() || '1');
  const [status, setStatus] = useState<ServiceBooking['status']>(booking.status);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      booking_date: bookingDate,
      booking_time: bookingTime,
      address,
      notes,
      total_price: parseFloat(totalPrice) || 0,
      duration_hours: parseInt(durationHours) || 1,
      num_guests: parseInt(numGuests) || 1,
      status,
    });
    setSaving(false);
  };

  const statuses: ServiceBooking['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-gray-900">Edit Booking</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
              <input
                type="text"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                placeholder="2:00 PM"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Event address"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (hours)</label>
              <input
                type="number"
                min="1"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Guests</label>
              <input
                type="number"
                min="1"
                value={numGuests}
                onChange={(e) => setNumGuests(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Booking notes..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceBooking['status'])}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors bg-white"
            >
              {statuses.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
