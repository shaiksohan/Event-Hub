import { Bell, Gift, MessageCircle, User, LogOut, Wallet, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { createRipple } from '@/lib/ripple';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const { navigate } = useRouter();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 min-w-0 group"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <img
            src="/eventhub_logo_transparent.png"
            alt="EventHub"
            className="w-11 h-11 object-contain flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          />
          <span className="text-lg sm:text-xl font-black tracking-tight text-[#10213f] transition-transform duration-300 group-hover:translate-x-0.5">
            Event<span className="text-[#f0448c]">Hub</span>
          </span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          {profile?.role === 'admin' && (
            <button
              onClick={(e) => { createRipple(e); navigate('/admin'); }}
              className="relative btn-ripple nav-link p-2 text-[#10213f] hover:text-white hover:bg-[#10213f] rounded-xl transition-all duration-200 hover:scale-105"
              aria-label="Admin Dashboard"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={(e) => { createRipple(e); navigate('/wallet'); }}
            className="relative btn-ripple nav-link p-2 text-[#52627d] hover:text-[#0879c9] hover:bg-[#e9f8ff] rounded-xl transition-all duration-200 hover:scale-105"
            aria-label="Wallet"
          >
            <Wallet className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { createRipple(e); navigate('/refer'); }}
            className="relative btn-ripple nav-link p-2 text-[#b7812b] hover:text-[#0879c9] hover:bg-[#fff4c7] rounded-xl transition-all duration-200 hover:scale-105"
            aria-label="Refer and earn"
          >
            <Gift className="w-5 h-5 float-icon" />
          </button>
          <button
            onClick={(e) => { createRipple(e); navigate('/notifications'); }}
            className="relative btn-ripple nav-link p-2 text-[#52627d] hover:text-[#0879c9] hover:bg-[#e9f8ff] rounded-xl transition-all duration-200 hover:scale-105"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { createRipple(e); navigate('/messages'); }}
            className="relative btn-ripple nav-link p-2 text-[#52627d] hover:text-[#0879c9] hover:bg-[#e9f8ff] rounded-xl transition-all duration-200 hover:scale-105"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { createRipple(e); navigate('/profile'); }}
            className="p-1 rounded-full hover:bg-[#e9f8ff] transition-all duration-200 hover:scale-105 ring-2 ring-[#bdefff] hover:ring-[#00a8e8] hover:shadow-lg hover:shadow-[#00a8e8]/20"
            aria-label="Profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#dff7ff] flex items-center justify-center">
                <User className="w-4 h-4 text-[#0879c9]" />
              </div>
            )}
          </button>
          <button
            onClick={(e) => { createRipple(e); handleSignOut(); }}
            className="relative btn-ripple p-2 text-[#8391aa] hover:text-[#e33f61] hover:bg-[#fff0f3] rounded-xl transition-all duration-200 hover:scale-105"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </header>
  );
}
