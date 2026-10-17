import { useEffect, useState } from 'react';
import {
  HardHat, Ticket, Bell, MessageCircle, ArrowRight, CheckCircle,
  IndianRupee, Users, MapPin, Calendar, Briefcase, Wrench,
  Search, ChevronRight, AlertCircle, Hourglass,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service, ServiceBooking } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

const WORKER_ACTIONS = [
  { label: 'Find Work', icon: Search, path: '/browse?type=workers', color: 'bg-teal-500' },
  { label: 'Job Requests', icon: Ticket, path: '/bookings', color: 'bg-amber-500' },
  { label: 'My Reels', icon: Wrench, path: '/reels', color: 'bg-pink-500' },
  { label: 'Messages', icon: MessageCircle, path: '/messages', color: 'bg-blue-500' },
];

export default function WorkerHomePage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [jobRequests, setJobRequests] = useState<ServiceBooking[]>([]);
  const [stats, setStats] = useState({ totalJobs: 0, pendingJobs: 0, completedJobs: 0, totalEarnings: 0 });
  const [followerCount, setFollowerCount] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [availableWork, setAvailableWork] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || profile?.role !== 'provider' || profile?.service_type !== 'workers') return;

    Promise.all([
      supabase
        .from('service_bookings')
        .select('*, service:services(*), customer:profiles!service_bookings_user_id_profiles_fkey(*)')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('service_bookings').select('total_price, status').eq('provider_id', user.id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('followee_id', user.id),
      supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', user.id).eq('read', false),
      supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', user.id).eq('read', false),
      supabase
        .from('services')
        .select('*')
        .eq('service_type', 'workers')
        .eq('available', true)
        .order('created_at', { ascending: false })
        .limit(4),
    ]).then(([bookings, allBookings, followers, notifs, msgs, work]) => {
      setJobRequests((bookings.data ?? []) as unknown as ServiceBooking[]);
      const bookingData = allBookings.data ?? [];
      const total = bookingData.length;
      const pending = bookingData.filter((b: { status: string }) => b.status === 'pending').length;
      const completed = bookingData.filter((b: { status: string }) => b.status === 'completed').length;
      const earnings = bookingData
        .filter((b: { status: string }) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum: number, b: { total_price: number }) => sum + Number(b.total_price), 0);
      setStats({ totalJobs: total, pendingJobs: pending, completedJobs: completed, totalEarnings: earnings });
      setFollowerCount(followers.count ?? 0);
      setUnreadNotifs(notifs.count ?? 0);
      setUnreadMsgs(msgs.count ?? 0);
      setAvailableWork((work.data ?? []) as Service[]);
      setLoadingData(false);
    });
  }, [user, profile]);

  const updateBookingStatus = async (id: string, status: ServiceBooking['status']) => {
    const { data: booking } = await supabase.from('service_bookings').select('user_id, service_id').eq('id', id).maybeSingle();
    await supabase.from('service_bookings').update({ status }).eq('id', id);
    setJobRequests((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    if (booking && user) {
      const msg = status === 'confirmed' ? 'accepted your job request' : status === 'completed' ? 'marked your job as completed' : 'declined your job request';
      await supabase.from('notifications').insert({
        user_id: (booking as { user_id: string }).user_id,
        actor_id: user.id,
        type: 'booking',
        entity_id: (booking as { service_id: string }).service_id,
        entity_type: 'service',
        message: msg,
      });
    }
    if (status === 'completed' || status === 'cancelled') {
      const bookingData = (await supabase.from('service_bookings').select('total_price, status').eq('provider_id', user!.id)).data ?? [];
      const completed = bookingData.filter((b: { status: string }) => b.status === 'completed').length;
      const earnings = bookingData
        .filter((b: { status: string }) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum: number, b: { total_price: number }) => sum + Number(b.total_price), 0);
      setStats((prev) => ({ ...prev, completedJobs: completed, totalEarnings: earnings }));
    }
  };

  if (loading || loadingData) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  const pendingRequests = jobRequests.filter((b) => b.status === 'pending');

  return (
    <div className="reveal max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="reveal relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-6 md:p-8 mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="w-5 h-5 text-amber-400" />
              <p className="text-amber-400 text-sm font-medium">Worker Dashboard</p>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">{profile?.full_name || 'Worker'}</h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-200">
                {profile?.business_name || 'Independent Worker'}
              </span>
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-200">
                <Users className="w-3 h-3" /> {followerCount} followers
              </span>
              {unreadNotifs > 0 && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-400/20 text-amber-200">
                  <Bell className="w-3 h-3" /> {unreadNotifs} new
                </span>
              )}
              {unreadMsgs > 0 && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-400/20 text-blue-200">
                  <MessageCircle className="w-3 h-3" /> {unreadMsgs} messages
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/browse?type=workers')}
            className="flex items-center gap-2 bg-amber-500 text-slate-900 hover:bg-amber-400 px-5 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap"
          >
            <Search className="w-5 h-5" /> Find Work
          </button>
        </div>
      </div>

      {/* Pending Job Request Alert */}
      {pendingRequests.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {pendingRequests.length} new job {pendingRequests.length === 1 ? 'request' : 'requests'} waiting for you
            </p>
            <p className="text-sm text-amber-700">Accept or decline below — customers are waiting for your response</p>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 whitespace-nowrap"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="reveal grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {WORKER_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          return (
            <div key={action.label} className="reveal" data-stagger={Math.min(idx + 1, 8)}>
            <button
              onClick={() => navigate(action.path)}
              className="group flex flex-col items-center gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-amber-200 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </button>
            </div>
          );
        })}
      </div>

      {/* Stats Row */}
      <div className="reveal grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <WorkerStatCard icon={Briefcase} label="Total Jobs" value={stats.totalJobs.toString()} color="teal" />
        <WorkerStatCard icon={Hourglass} label="Pending" value={stats.pendingJobs.toString()} color="amber" />
        <WorkerStatCard icon={CheckCircle} label="Completed" value={stats.completedJobs.toString()} color="blue" />
        <WorkerStatCard icon={IndianRupee} label="Earnings" value={`₹${stats.totalEarnings.toFixed(0)}`} color="green" />
      </div>

      <div className="reveal grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Requests */}
        <div className="lg:col-span-2">
          <div className="reveal bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Job Requests</h2>
              <button
                onClick={() => navigate('/bookings')}
                className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {jobRequests.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No job requests yet</p>
                <p className="text-gray-400 text-xs mt-1">Browse available work to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobRequests.map((booking, idx) => {
                  const service = booking.service;
                  if (!service) return null;
                  const customer = booking.customer as { avatar_url?: string; full_name?: string } | undefined;
                  return (
                    <div
                      key={booking.id}
                      className="reveal flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      data-stagger={Math.min(idx + 1, 8)}
                    >
                      <img src={service.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{service.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {customer && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {customer.full_name || 'Customer'}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            booking.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                            booking.status === 'confirmed' ? 'bg-teal-50 text-teal-600' :
                            booking.status === 'completed' ? 'bg-blue-50 text-blue-600' :
                            'bg-red-50 text-red-600'
                          }`}>{booking.status}</span>
                        </div>
                        {booking.status === 'pending' && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              className="text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                              className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors mt-2"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                      <span className="font-bold text-gray-900 text-sm flex-shrink-0">₹{Number(booking.total_price).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Available Work + Profile */}
        <div className="lg:col-span-1 space-y-4">
          {/* Available Work */}
          <div className="reveal bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Available Work</h2>
              <button
                onClick={() => navigate('/browse?type=workers')}
                className="text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                Browse
              </button>
            </div>
            {availableWork.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No work available</p>
                <p className="text-gray-400 text-xs mt-1">Check back later for new opportunities</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableWork.map((work, idx) => (
                  <div
                    key={work.id}
                    className="reveal flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/service/${work.id}`)}
                    data-stagger={Math.min(idx + 1, 8)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {work.image_url ? (
                        <img src={work.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <HardHat className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{work.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" /> {work.city}
                        </span>
                        <span className="text-xs text-gray-400">₹{work.price}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile Card */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <HardHat className="w-6 h-6 text-amber-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{profile?.full_name || 'Your Profile'}</p>
                <p className="text-xs text-gray-400">Edit profile & skills</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkerStatCard({ icon: Icon, label, value, color }: { icon: typeof Briefcase; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-[#fff4c7] text-[#8a641d]',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
