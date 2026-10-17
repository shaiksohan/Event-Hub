import { Mail, Twitter, Instagram, Facebook } from 'lucide-react';
import { useRouter } from '@/lib/router';

export default function Footer() {
  const { navigate } = useRouter();

  return (
    <footer className="bg-[#10213f] text-[#aebbd0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <img src="/eventhub_logo_transparent.png" alt="EventHub" className="w-12 h-12 object-contain" />
              <span className="text-xl font-black text-white">Event<span className="text-[#ffca28]">Hub</span></span>
            </button>
            <p className="text-sm leading-relaxed max-w-xs">Bring your celebration to life with trusted event services, creative professionals, and a smoother way to book.</p>
          </div>

          <div>
            <h3 className="text-[#ffca28] font-semibold mb-4 text-sm uppercase tracking-wide">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/browse?type=function')} className="hover:text-white transition-colors">Function</button></li>
              <li><button onClick={() => navigate('/browse?type=camera_studio')} className="hover:text-white transition-colors">Camera Studio</button></li>
              <li><button onClick={() => navigate('/browse?type=catering')} className="hover:text-white transition-colors">Catering</button></li>
              <li><button onClick={() => navigate('/browse?type=workers')} className="hover:text-white transition-colors">Workers</button></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#ffca28] font-semibold mb-4 text-sm uppercase tracking-wide">Account</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/profile')} className="hover:text-white transition-colors">My Profile</button></li>
              <li><button onClick={() => navigate('/bookings')} className="hover:text-white transition-colors">My Bookings</button></li>
              <li><button onClick={() => navigate('/favorites')} className="hover:text-white transition-colors">Favorites</button></li>
              <li><button onClick={() => navigate('/refer')} className="text-[#fff4c7] hover:text-white transition-colors">Refer &amp; Earn</button></li>
              <li><button onClick={() => navigate('/auth')} className="hover:text-white transition-colors">Sign In</button></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#ffca28] font-semibold mb-4 text-sm uppercase tracking-wide">Connect</h3>
            <div className="flex gap-3">
              {[{ icon: Twitter, label: 'Twitter' }, { icon: Instagram, label: 'Instagram' }, { icon: Facebook, label: 'Facebook' }, { icon: Mail, label: 'Email' }].map(({ icon: Icon, label }) => (
                <a key={label} href="#" className="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#0879c9] flex items-center justify-center transition-colors" aria-label={label}>
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-white/10 text-sm text-center">© 2026 EventHub. Celebrate more, coordinate less.</div>
      </div>
    </footer>
  );
}
