import { useEffect, useState } from 'react';
import { PartyPopper, Video, UtensilsCrossed, Users, Search, ArrowRight, Sparkles, Star, CheckCircle, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/types';
import { useRouter } from '@/lib/router';
import ServiceCard from '@/components/ServiceCard';
import { createRipple } from '@/lib/ripple';

const serviceCategories = [
  {
    type: 'function',
    label: 'Function',
    description: 'Event planning and function management for weddings, parties, and corporate events',
    icon: PartyPopper,
    color: 'from-[#00a8e8] to-[#0879c9]',
    image: 'https://images.pexels.com/photos/12688995/pexels-photo-12688995.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    type: 'camera_studio',
    label: 'Camera Studio',
    description: 'Rent fully equipped photo and video studios by the hour',
    icon: Video,
    color: 'from-[#0879c9] to-[#10213f]',
    image: 'https://images.pexels.com/photos/29877910/pexels-photo-29877910.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    type: 'catering',
    label: 'Catering Services',
    description: 'Gourmet catering for events of any size and style',
    icon: UtensilsCrossed,
    color: 'from-[#ffca28] to-[#f47b20]',
    image: 'https://images.pexels.com/photos/2337843/pexels-photo-2337843.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    type: 'workers',
    label: 'Workers',
    description: 'Event staff, bartenders, setup crews and more',
    icon: Users,
    color: 'from-[#ff5b78] to-[#e32d68]',
    image: 'https://images.pexels.com/photos/37485594/pexels-photo-37485594.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
];

export default function HomePage() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .order('rating', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setServices(data as Service[]);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#10213f] via-[#063d73] to-[#e32d68]">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ffca28]/20 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#00d4ff]/20 blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: 'url(https://images.pexels.com/photos/12688995/pexels-photo-12688995.jpeg?auto=compress&cs=tinysrgb&h=650&w=940)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        {/* Floating decorative shapes */}
        <div className="absolute top-20 right-16 w-16 h-16 border border-[#ffca28]/20 rounded-2xl rotate-12 hidden md:block" style={{ animation: 'motion-shape-spin 20s linear infinite' }} />
        <div className="absolute bottom-24 right-40 w-10 h-10 border border-[#00d4ff]/20 rounded-full hidden md:block" style={{ animation: 'motion-shape-spin 15s linear infinite reverse' }} />
        <div className="absolute top-1/3 left-10 w-6 h-6 bg-[#ffca28]/15 rounded-full blur-sm hidden md:block hero-float" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 md:py-32">
          <div className="max-w-2xl space-y-6 hero-float">
            <img src="/eventhub_logo_transparent.png" alt="EventHub" className="w-28 h-28 sm:w-36 sm:h-36 object-contain -ml-3 drop-shadow-2xl" />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00a8e8]/20 border border-[#00d4ff]/40 hero-badge-3d">
              <Sparkles className="w-4 h-4 text-[#ffca28] float-icon" />
              <span className="text-sm text-[#dff7ff] font-medium">Every event detail, beautifully connected.</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-[#fff4c7] leading-tight hero-text-3d">
              Book services for your <span className="text-[#ffca28]">event</span>
            </h1>
            <p className="text-lg text-[#dff7ff] leading-relaxed">
              Function, studio rentals, catering, and event staff. Find and book trusted service providers in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={(e) => { createRipple(e); navigate('/browse'); }}
                className="btn-ripple btn-glow-gold inline-flex items-center justify-center gap-2 bg-[#ffca28] hover:bg-[#ffd95c] text-[#10213f] px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-[#10213f]/20 transition-all duration-300 hover:scale-105"
              >
                <Search className="w-5 h-5" />
                Browse Services
              </button>
              <button
                onClick={(e) => { createRipple(e); navigate('/auth?mode=signup&role=provider'); }}
                className="btn-ripple btn-glow inline-flex items-center justify-center gap-2 bg-[#00a8e8]/20 hover:bg-[#00a8e8]/35 text-[#e9f8ff] border border-[#9ddff7]/40 px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                Become a Provider
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Four Service Categories */}
      <section className="bg-[#f6fbff] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10 reveal">
          <h2 className="text-3xl font-bold text-[#10213f]">Our Services</h2>
          <p className="text-[#52627d] mt-2">Everything you need for a perfect event</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {serviceCategories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.type}
                onClick={(e) => { createRipple(e); navigate(`/browse?type=${cat.type}`); }}
                className="reveal btn-ripple group relative overflow-hidden rounded-2xl h-64 text-left motion-card border border-white/20"
                data-stagger={idx + 1}
                style={{ '--tilt-x': '0deg', '--tilt-y': '0deg' } as React.CSSProperties}
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} opacity-80 group-hover:opacity-90 transition-opacity duration-300`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                <div className="relative h-full flex flex-col justify-end p-6" style={{ transform: 'translateZ(30px)' }}>
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-white float-icon" />
                  </div>
                  <h3 className="text-xl font-bold text-[#fff4c7]">{cat.label}</h3>
                  <p className="text-sm text-[#e9f8ff]/85 mt-1">{cat.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-sm text-[#fff4c7] font-medium">
                    Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#e9f8ff]/80 border-y border-[#bdefff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10 reveal">
            <h2 className="text-3xl font-bold text-[#10213f]">How It Works</h2>
            <p className="text-[#52627d] mt-2">Book in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Search & Discover', desc: 'Browse through our four service categories and find the perfect provider for your event.' },
              { step: '2', title: 'Book & Confirm', desc: 'Select your date, customize your requirements, and book instantly with secure payment.' },
              { step: '3', title: 'Enjoy Your Event', desc: 'Your service provider handles everything. Sit back and enjoy a seamless event experience.' },
            ].map((item, idx) => (
              <div key={item.step} className="reveal reveal--scale bg-[#fafdff]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#dcecff] text-center shadow-sm shadow-[#0879c9]/5 motion-card hover:shadow-lg hover:shadow-[#0879c9]/10 transition-all duration-300" data-stagger={idx + 1}>
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#bdefff] to-[#9ddff7] flex items-center justify-center mb-4 shadow-md shadow-[#0879c9]/10 float-icon">
                  <span className="text-xl font-bold text-[#0879c9]">{item.step}</span>
                </div>
                <h3 className="font-bold text-[#10213f] text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-[#52627d] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Rated Services */}
      <section className="bg-[#f6fbff] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8 reveal">
          <div>
            <h2 className="text-3xl font-bold text-[#10213f]">Top Rated Services</h2>
            <p className="text-[#52627d] mt-2">Most loved by our customers</p>
          </div>
          <button
            onClick={(e) => { createRipple(e); navigate('/browse'); }}
            className="hidden sm:flex btn-ripple items-center gap-2 text-sm font-medium text-[#0879c9] hover:text-[#0668a8] transition-colors hover:translate-x-1 duration-200"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#fafdff] rounded-2xl border border-[#dcecff] overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, idx) => (
              <div key={service.id} className="reveal" data-stagger={Math.min(idx + 1, 8)}>
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dual Usage CTA */}
      <section className="bg-gradient-to-r from-[#0879c9] to-[#e32d68] relative overflow-hidden">
        <div className="absolute -right-16 top-0 w-48 h-48 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute -left-16 bottom-0 w-48 h-48 rounded-full bg-[#ffca28]/15 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-[#fff4c7] reveal reveal--left">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 float-icon" />
                <span className="text-sm font-medium text-[#bdefff]">For Customers</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-[#fff4c7]">Need a service for your event?</h2>
              <p className="text-[#dff7ff] mb-4">Create a free account and browse hundreds of trusted service providers.</p>
              <button
                onClick={(e) => { createRipple(e); navigate('/auth?mode=signup&role=customer'); }}
                className="btn-ripple btn-glow-gold inline-flex items-center gap-2 bg-[#fff4c7] text-[#10213f] hover:bg-[#ffe98a] px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                Sign Up as Customer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[#fff4c7] md:border-l md:border-[#bdefff]/30 md:pl-8 reveal reveal--right">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 float-icon" />
                <span className="text-sm font-medium text-[#bdefff]">For Providers</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-[#fff4c7]">Offer your services to thousands</h2>
              <p className="text-[#dff7ff] mb-4">List your business and start receiving bookings from customers in your area.</p>
              <button
                onClick={(e) => { createRipple(e); navigate('/auth?mode=signup&role=provider'); }}
                className="btn-ripple btn-glow-gold inline-flex items-center gap-2 bg-[#fff4c7] text-[#10213f] hover:bg-[#ffe98a] px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                Become a Provider <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8e6] border-y border-[#f3dda0] reveal">
        <div className="max-w-7xl mx-auto flex flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#b7812b] float-icon"><Gift className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b7812b]">Share the celebration</p>
              <h2 className="mt-1 text-xl font-black text-[#10213f]">Invite friends and earn EventHub rewards.</h2>
              <p className="mt-1 text-sm text-[#52627d]">Climb the leaderboard when new customers join with your invite.</p>
            </div>
          </div>
          <button
            onClick={(e) => { createRipple(e); navigate('/refer'); }}
            className="btn-ripple btn-glow-coral inline-flex items-center justify-center gap-2 rounded-xl bg-[#e32d68] px-5 py-3 font-bold text-white transition-all duration-300 hover:scale-105"
          >
            Open Refer &amp; Earn <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
