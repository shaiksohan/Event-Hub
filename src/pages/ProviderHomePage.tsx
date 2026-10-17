import { useEffect, useState } from 'react';
import { Plus, Ticket, MessageCircle, Film, ArrowRight, Bell, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { ProfileSections, ALL_SECTIONS } from '@/components/ProfileSections';

const ACTIONS = [
  {
    label: 'Add Service',
    description: 'Create a new service listing',
    icon: Plus,
    path: '/dashboard',
    color: 'bg-[#0879c9]',
  },
  {
    label: 'Bookings',
    description: 'Manage your customer bookings',
    icon: Ticket,
    path: '/bookings',
    color: 'bg-amber-500',
  },
  {
    label: 'Messages',
    description: 'Chat with your customers',
    icon: MessageCircle,
    path: '/messages',
    color: 'bg-blue-500',
  },
  {
    label: 'Notifications',
    description: 'View your recent activity',
    icon: Bell,
    path: '/notifications',
    color: 'bg-teal-600',
  },
  {
    label: 'Add Reels',
    description: 'Upload video reels to showcase work',
    icon: Film,
    path: '/reels',
    color: 'bg-pink-500',
  },
  {
    label: 'Followers',
    description: 'See who is following you',
    icon: Users,
    path: '',
    color: 'bg-indigo-500',
  },
];

export default function ProviderHomePage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || profile?.role !== 'provider') return;
    Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('followee_id', user.id),
      supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', user.id).eq('read', false),
      supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', user.id).eq('read', false),
    ]).then(([followers, notifs, msgs]) => {
      setFollowerCount(followers.count ?? 0);
      setUnreadNotifs(notifs.count ?? 0);
      setUnreadMsgs(msgs.count ?? 0);
    });
  }, [user, profile]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#10213f] mb-6">Provider Dashboard</h1>

      {/* Welcome Banner */}
      <div className="reveal relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#10213f] to-[#0879c9] p-6 md:p-8 mb-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="relative">
          <p className="text-[#bdefff] text-sm font-medium">Welcome back,</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-1">{profile?.business_name || profile?.full_name || 'Provider'}</h2>
          <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap">
            <button
              onClick={() => navigate(`/followers/${user.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-[#bdefff] hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
            >
              <Users className="w-3.5 h-3.5" /> {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
                unreadNotifs > 0
                  ? 'bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
                  : 'bg-white/10 text-[#bdefff] hover:bg-white/20'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotifs > 0 ? `${unreadNotifs} new` : 'Notifications'}
            </button>
            <button
              onClick={() => navigate('/messages')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
                unreadMsgs > 0
                  ? 'bg-blue-400/20 text-blue-100 hover:bg-blue-400/30'
                  : 'bg-white/10 text-[#bdefff] hover:bg-white/20'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {unreadMsgs > 0 ? `${unreadMsgs} unread` : 'Messages'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="reveal grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path || `/followers/${user.id}`)}
              className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-[#9ddff7] transition-all"
            >
              <div className={`w-14 h-14 rounded-xl ${action.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base">{action.label}</p>
                <p className="text-sm text-gray-400 mt-0.5">{action.description}</p>
              </div>
              {action.label === 'Notifications' && unreadNotifs > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                  {unreadNotifs}
                </span>
              )}
              {action.label === 'Messages' && unreadMsgs > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                  {unreadMsgs}
                </span>
              )}
              {action.label === 'Followers' && followerCount > 0 && (
                <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                  {followerCount}
                </span>
              )}
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Profile Sections with all tabs */}
      <ProfileSections sections={ALL_SECTIONS} />
    </div>
  );
}
