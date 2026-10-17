import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, Send, MessageCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message, Profile } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

export default function MessagesPage({ otherUserId }: { otherUserId: string }) {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!otherUserId) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .maybeSingle()
      .then(({ data }) => setOtherProfile(data as Profile | null));
  }, [otherUserId]);

  const fetchMessages = useCallback(async () => {
    if (!user || !otherUserId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as Message[]);
    setLoadingMsgs(false);

    // Mark received messages as read
    const unreadIds = (data ?? []).filter(
      (m: Message) => m.receiver_id === user.id && !m.read
    ).map((m: Message) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ read: true }).in('id', unreadIds);
    }
  }, [user, otherUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('messages-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.receiver_id === user.id) {
              supabase.from('messages').update({ read: true }).eq('id', newMsg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !input.trim()) return;
    setSending(true);
    const { data } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        content: input.trim(),
      })
      .select('*')
      .maybeSingle();

    if (data) {
      setMessages((prev) => [...prev, data as Message]);
      setInput('');

      // Create notification for receiver
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        actor_id: user.id,
        type: 'message',
        entity_id: null,
        entity_type: 'message',
        message: `sent you a message`,
      });
    }
    setSending(false);
  };

  if (loading || loadingMsgs) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-16 bg-gray-200 rounded-xl mb-4" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col" style={{ height: 'calc(100vh - 64px - 56px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 mb-4 flex-shrink-0">
        <button
          onClick={() => navigate('/messages')}
          className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {otherProfile?.avatar_url ? (
          <img src={otherProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <span className="text-teal-600 text-sm font-bold">
              {(otherProfile?.full_name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{otherProfile?.full_name || 'Unknown User'}</h2>
          {otherProfile?.business_name && (
            <p className="text-xs text-gray-500 truncate">{otherProfile.business_name}</p>
          )}
        </div>
        <button
          onClick={() => navigate(`/profile/${otherUserId}`)}
          className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-100 p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm break-words ${
                    isMine
                      ? 'bg-teal-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-teal-100' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 mt-3 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !sending) handleSend(); }}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-12 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
