import { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

type Conversation = {
  otherUserId: string;
  otherProfile: Profile | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
};

export default function MessagesInboxPage() {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const msgs = data ?? [];
    const convoMap = new Map<string, Conversation>();

    for (const msg of msgs as { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; read: boolean }[]) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const existing = convoMap.get(otherId);
      if (!existing) {
        convoMap.set(otherId, {
          otherUserId: otherId,
          otherProfile: null,
          lastMessage: msg.content,
          lastTime: msg.created_at,
          unread: msg.receiver_id === user.id && !msg.read ? 1 : 0,
        });
      } else if (msg.receiver_id === user.id && !msg.read) {
        existing.unread += 1;
      }
    }

    // Fetch profiles for all conversation partners
    const userIds = Array.from(convoMap.keys());
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      (profiles ?? []).forEach((p: Profile) => {
        const convo = convoMap.get(p.id);
        if (convo) convo.otherProfile = p;
      });
    }

    setConversations(Array.from(convoMap.values()));
    setLoadingConvos(false);
  };

  if (loading || loadingConvos) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="reveal max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <h1 className="reveal text-3xl font-bold text-gray-900 mb-2">Messages</h1>
      <p className="text-gray-500 mb-8">Your conversations with service providers and customers</p>

      {conversations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-400 text-lg mt-4">No messages yet</p>
          <p className="text-gray-400 text-sm mt-1">Start a conversation from a service or profile page.</p>
          <button
            onClick={() => navigate('/browse')}
            className="mt-6 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Browse Services
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((convo, idx) => {
            const p = convo.otherProfile;
            return (
              <div key={convo.otherUserId} className="reveal" data-stagger={Math.min(idx + 1, 8)}>
                <button
                onClick={() => navigate(`/messages/${convo.otherUserId}`)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${
                  convo.unread > 0
                    ? 'bg-teal-50/50 border-teal-100 hover:bg-teal-50'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-teal-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 truncate">{p?.full_name || 'Unknown User'}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {new Date(convo.lastTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${convo.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {convo.lastMessage}
                  </p>
                </div>
                {convo.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {convo.unread > 9 ? '9+' : convo.unread}
                  </span>
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
