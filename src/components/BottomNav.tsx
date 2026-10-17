import { Home, Search, Film, Ticket, User } from 'lucide-react';
import type { PointerEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

export default function BottomNav() {
  const { path, navigate } = useRouter();
  const { profile } = useAuth();
  const cleanPath = path.split('?')[0];

  const isWorker = profile?.role === 'provider' && profile?.service_type === 'workers';
  const isProvider = profile?.role === 'provider' && !isWorker;

  const tabs = isWorker
    ? [
        { icon: Home, label: 'Home', path: '/', active: cleanPath === '/' },
        { icon: Search, label: 'Find Work', path: '/browse?type=workers', active: cleanPath.startsWith('/browse') },
        { icon: Ticket, label: 'Jobs', path: '/bookings', active: cleanPath === '/bookings' },
        { icon: Film, label: 'Reels', path: '/reels', active: cleanPath === '/reels' },
        { icon: User, label: 'Profile', path: '/profile', active: cleanPath === '/profile' },
      ]
    : isProvider
    ? [
        { icon: Home, label: 'Home', path: '/', active: cleanPath === '/' },
        { icon: Ticket, label: 'Services', path: '/dashboard', active: cleanPath === '/dashboard' },
        { icon: Film, label: 'Reels', path: '/reels', active: cleanPath === '/reels' },
        { icon: Ticket, label: 'Bookings', path: '/bookings', active: cleanPath === '/bookings' },
        { icon: User, label: 'Profile', path: '/profile', active: cleanPath === '/profile' },
      ]
    : [
        { icon: Home, label: 'Home', path: '/', active: cleanPath === '/' },
        { icon: Search, label: 'Browse', path: '/browse', active: cleanPath.startsWith('/browse') },
        { icon: Film, label: 'Reels', path: '/reels', active: cleanPath === '/reels' },
        { icon: Ticket, label: 'Bookings', path: '/bookings', active: cleanPath === '/bookings' },
        { icon: User, label: 'Profile', path: '/profile', active: cleanPath === '/profile' },
      ];

  const handlePress = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') {
      e.currentTarget.style.transform = 'scale(0.92)';
      setTimeout(() => { e.currentTarget.style.transform = ''; }, 150);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav-bottom">
      <div className="max-w-3xl mx-auto flex items-center justify-around h-16 px-2 sm:px-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              onPointerDown={handlePress}
              className={`relative flex min-w-0 flex-1 max-w-28 flex-col items-center gap-0.5 px-2 py-2 transition-all duration-200 ${
                tab.active ? 'text-[#e32d68]' : 'text-[#8391aa] hover:text-[#0879c9]'
              }`}
            >
              {tab.active && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#00a8e8] to-[#e32d68] shadow-sm shadow-[#e32d68]/30" />
              )}
              <span className={`relative transition-transform duration-200 ${tab.active ? 'scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
                {tab.active && (
                  <span className="absolute inset-0 -z-10 blur-md opacity-40 bg-[#e32d68] rounded-full" />
                )}
              </span>
              <span className="text-[10px] font-medium truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
