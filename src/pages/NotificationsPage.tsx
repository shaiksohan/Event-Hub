import { useEffect, useState } from 'react';
import { Bell, ArrowLeft, Heart, MessageCircle, UserPlus, Ticket, Mail, CheckCheck, Film } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (newNotif.user_id !== user.id) return;
          supabase
            .from('notifications')
            .select('*, actor:profiles!notifications_actor_id_profiles_fkey(*)')
            .eq('id', newNotif.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setNotifications((prev) => {
                  if (prev.some((n) => n.id === newNotif.id)) return prev;
                  return [data as unknown as Notification, ...prev];
                });
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_profiles_fkey(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as unknown as Notification[]);
    setLoadingNotifs(false);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return Heart;
      case 'comment': return MessageCircle;
      case 'follow': return UserPlus;
      case 'booking': return Ticket;
      case 'message': return Mail;
      case 'reel': return Film;
      default: return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'like': return 'bg-red-50 text-red-500';
      case 'comment': return 'bg-blue-50 text-blue-500';
      case 'follow': return 'bg-teal-50 text-teal-600';
      case 'booking': return 'bg-amber-50 text-amber-600';
      case 'message': return 'bg-[#e9f8ff] text-[#0879c9]';
      case 'reel': return 'bg-purple-50 text-purple-500';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const handleNotifClick = (notif: Notification) => {
    markRead(notif.id);
    if (notif.type === 'follow') {
      navigate(`/profile/${notif.actor_id}`);
    } else if (notif.type === 'message') {
      navigate(`/messages/${notif.actor_id}`);
    } else if (notif.type === 'booking') {
      navigate('/bookings');
    } else if (notif.type === 'reel' || notif.entity_type === 'reel') {
      navigate('/reels');
    } else if (notif.entity_type === 'service') {
      navigate(`/service/${notif.entity_id}`);
    }
  };

  if (loading || loadingNotifs) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="reveal max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="reveal flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-2">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Bell className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-400 text-lg mt-4">No notifications yet</p>
          <p className="text-gray-400 text-sm mt-1">You'll see updates here when people interact with you.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, idx) => {
            const Icon = getIcon(notif.type);
            const actor = notif.actor;
            return (
              <div key={notif.id} className="reveal" data-stagger={Math.min(idx + 1, 8)}>
                <button
                onClick={() => handleNotifClick(notif)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${
                  notif.read
                    ? 'bg-white border-gray-100 hover:bg-gray-50'
                    : 'bg-teal-50/50 border-teal-100 hover:bg-teal-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notif.type)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {actor?.avatar_url ? (
                      <img src={actor.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-teal-600 text-[10px] font-bold">
                          {(actor?.full_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-700 truncate">
                      <span className="font-semibold text-gray-900">{actor?.full_name || 'Someone'}</span>
                      {' '}{notif.message}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
