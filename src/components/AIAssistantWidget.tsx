import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  PartyPopper,
  UtensilsCrossed,
  Video,
  Users,
  Ticket,
  Headphones,
  ArrowRight,
  Star,
  MapPin,
  Phone,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  services?: ServicePreview[];
  navigate_to?: string;
  support_card?: boolean;
};

type WhatsAppContact = {
  name: string;
  number: string;
  display: string;
};

const SUPPORT_CONTACTS: WhatsAppContact[] = [
  { name: 'EventHub Support 1', number: '919701872176', display: '+91 97018 72176' },
  { name: 'EventHub Support 2', number: '917569271049', display: '+91 75692 71049' },
];

type ServicePreview = {
  id: string;
  title: string;
  city: string;
  rating: number;
  review_count: number;
  price: number;
  price_unit: string;
  service_type: string;
  category: string;
  image_url: string;
};

const QUICK_REPLIES = [
  { label: 'Function Services', labelTe: 'ఫంక్షన్ సేవలు', icon: PartyPopper, context: { service_type: 'function' } },
  { label: 'Catering Services', labelTe: 'క్యాటరింగ్ సేవలు', icon: UtensilsCrossed, context: { service_type: 'catering' } },
  { label: 'Camera & Studio', labelTe: 'కెమెరా & స్టూడియో', icon: Video, context: { service_type: 'camera_studio' } },
  { label: 'Workers Services', labelTe: 'వర్కర్స్ సేవలు', icon: Users, context: { service_type: 'workers' } },
  { label: 'My Bookings', labelTe: 'నా బుకింగ్‌లు', icon: Ticket, context: {} },
  { label: 'Contact Support', labelTe: 'సపోర్ట్', icon: Headphones, context: {} },
];

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm the EventHub AI Assistant. I can help you find event services, check your bookings, or answer questions. How can I help you today?\n\nనమస్కారం! నేను EventHub AI అసిస్టెంట్. మీకు ఎలా సహాయం చేయగలను?",
};

export default function AIAssistantWidget() {
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [unreadIndicator, setUnreadIndicator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setUnreadIndicator(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string, context?: { service_type?: string }) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowQuickReplies(false);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: 'Please sign in to use the AI assistant. దయచేసి సైన్ ఇన్ చేయండి.',
        }]);
        setLoading(false);
        return;
      }

      const allMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages: allMessages,
          context: context || {},
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();

      if (!data.reply) {
        throw new Error('Invalid response from assistant');
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        services: data.services,
        navigate_to: data.navigate_to,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.rate_limited) {
        // Rate limited — keep quick replies hidden briefly
        setTimeout(() => setShowQuickReplies(true), 3000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `I'm having trouble right now. Please try again or contact EventHub support at +91 90000 90000 or support@eventhub.app`,
      }]);
    } finally {
      setLoading(false);
      setShowQuickReplies(true);
    }
  }, [messages, loading]);

  const handleQuickReply = (reply: typeof QUICK_REPLIES[number]) => {
    if (reply.label === 'My Bookings') {
      navigate('/bookings');
      return;
    }
    if (reply.label === 'Contact Support') {
      setMessages((prev) => [...prev, {
        role: 'user',
        content: 'I need to contact support',
      }, {
        role: 'assistant',
        content: 'Here are our WhatsApp support numbers. Tap to chat or call directly!',
        support_card: true,
      }]);
      setShowQuickReplies(false);
      return;
    }
    sendMessage(`Show me ${reply.label}`, reply.context);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleServiceClick = (serviceId: string) => {
    navigate(`/service/${serviceId}`);
    setOpen(false);
  };

  const handleNavigateTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 group"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0879c9] to-[#e32d68] rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0879c9] to-[#e32d68] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {unreadIndicator && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
            )}
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-96 sm:h-[600px] sm:max-h-[85vh] flex flex-col bg-white sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#10213f] to-[#0879c9] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0879c9]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm leading-tight">EventHub AI Assistant</h3>
                <p className="text-[#bdefff] text-xs">Online — here to help</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/15 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f8fbff]">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'bg-[#0879c9] text-white rounded-br-md'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Service cards */}
                {msg.services && msg.services.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleServiceClick(s.id)}
                        className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-2.5 text-left hover:border-[#9ddff7] hover:shadow-sm transition-all group"
                      >
                        {s.image_url ? (
                          <img src={s.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-[#e9f8ff] flex items-center justify-center flex-shrink-0">
                            <PartyPopper className="w-6 h-6 text-[#0879c9]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#0879c9] transition-colors">
                            {s.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-0.5 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" /> {s.city}
                            </span>
                            <span className="flex items-center gap-0.5 text-xs text-gray-500">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {Number(s.rating ?? 0).toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-[#0879c9] font-medium mt-0.5">
                            Rs.{s.price} {s.price_unit}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#0879c9] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* WhatsApp Support Card */}
                {msg.support_card && (
                  <div className="mt-2 space-y-2">
                    {SUPPORT_CONTACTS.map((contact) => (
                      <div
                        key={contact.number}
                        className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                            <p className="text-xs text-gray-500">{contact.display}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${contact.number}?text=Hi%20EventHub%20Support%2C%20I%20need%20help`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-medium rounded-lg py-2 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Chat
                          </a>
                          <a
                            href={`https://wa.me/${contact.number}?text=Hi%20EventHub%20Support%2C%20I%20need%20help&call=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 bg-[#0879c9] hover:bg-[#0668a8] text-white text-xs font-medium rounded-lg py-2 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Navigation suggestion */}
                {msg.navigate_to && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleNavigateTo(msg.navigate_to!)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0879c9] hover:text-[#0668a8] bg-[#e9f8ff] px-3 py-1.5 rounded-full transition-colors"
                    >
                      View Bookings <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md border border-gray-100 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0879c9] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#0879c9] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#0879c9] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Replies */}
            {showQuickReplies && !loading && messages.length <= 1 && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-2 font-medium">Quick options:</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_REPLIES.map((reply) => {
                    const Icon = reply.icon;
                    return (
                      <button
                        key={reply.label}
                        onClick={() => handleQuickReply(reply)}
                        className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-left hover:border-[#9ddff7] hover:bg-[#f1faff] transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#e9f8ff] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0879c9] transition-colors">
                          <Icon className="w-4 h-4 text-[#0879c9] group-hover:text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 leading-tight">{reply.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-100 bg-white p-3">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none text-sm transition-colors disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-full bg-[#0879c9] hover:bg-[#0668a8] text-white flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              AI may make mistakes. Verify details before booking.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
