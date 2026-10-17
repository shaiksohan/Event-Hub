import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Copy, Gift, RefreshCw, Share2, Sparkles, Trophy, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';

export default function ReferEarnPage() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [period, setPeriod] = useState('All Time');
  const [copied, setCopied] = useState(false);
  const [topReferrers, setTopReferrers] = useState<Array<{ name: string; points: number; initials: string; color: string }>>([]);
  const referralCode = profile?.referral_code || `LV${(user?.id || '485c020').replace(/-/g, '').slice(-7).toUpperCase()}`;
  const referralLink = `${window.location.origin}/auth?mode=signup&ref=${encodeURIComponent(referralCode)}`;
  const displayName = profile?.full_name?.trim() || 'You';
  const points = profile?.referral_coins || 0;

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, referral_coins')
      .order('referral_coins', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setTopReferrers((data ?? []).map((referrer, index) => ({
          name: referrer.full_name || 'EventHub member',
          points: referrer.referral_coins || 0,
          initials: (referrer.full_name || 'E').charAt(0).toUpperCase(),
          color: ['bg-[#4b2d3b]', 'bg-[#0879c9]', 'bg-[#e32d68]'][index] || 'bg-[#10213f]',
        })));
      });
  }, []);

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const shareReferral = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join me on EventHub',
        text: 'Find trusted event services on EventHub. Use my referral code to join.',
        url: referralLink,
      });
      return;
    }
    await copyReferralLink();
  };

  const shareText = `Join me on EventHub! Find trusted event services. Use my referral code ${referralCode} to sign up. ${referralLink}`;

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareToInstagram = () => {
    navigator.clipboard?.writeText(shareText).catch(() => {});
    window.open('https://www.instagram.com/', '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(`Join me on EventHub! Use my referral code ${referralCode}.`)}`, '_blank');
  };

  return (
    <div className="reveal min-h-screen bg-[#f6f9ff] px-4 py-5 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="reveal mb-5 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-xl p-2 text-[#10213f] transition-colors hover:bg-[#dff7ff]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-[#10213f]">Refer &amp; Earn</h1>
        </div>

        <section className="reveal relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4b2338] via-[#7e2f3c] to-[#e32d68] p-5 text-white shadow-lg shadow-[#e32d68]/15 sm:p-7">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#ffca28]/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff4c7]/15 text-[#ffca28] ring-1 ring-[#fff4c7]/20">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#fff4c7]">Leaderboard</h2>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-[#ffe7ed]">Current top referrers and qualification progress.</p>
              </div>
            </div>
            <div className="flex gap-2 text-[#fff4c7]">
              <Gift className="h-6 w-6" />
              <button onClick={() => setPeriod('All Time')} aria-label="Refresh leaderboard" className="transition-transform hover:rotate-180">
                <RefreshCw className="h-6 w-6" />
              </button>
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-4 rounded-2xl border border-[#eadfe0] bg-white p-1 shadow-sm">
          {['Today', 'This Week', 'This Month', 'All Time'].map((option) => (
            <button
              key={option}
              onClick={() => setPeriod(option)}
              className={`rounded-xl px-2 py-3 text-xs font-bold transition-colors sm:text-sm ${period === option ? 'bg-[#f2eeee] text-[#10213f] shadow-sm' : 'text-[#52627d] hover:bg-[#fff7df]'}`}
            >
              {option}
            </button>
          ))}
        </div>

        <section className="reveal mt-4 rounded-2xl border border-[#dcecff] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-3 items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#b7812b] text-sm font-bold text-[#fff4c7]">You</div>
              <div>
                <p className="text-sm font-bold text-[#10213f]">{displayName}</p>
                <p className="text-xs text-[#52627d]">Rank</p>
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-[#0879c9]">{points}</p>
              <p className="text-xs text-[#52627d]">Points</p>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-[#b7812b] sm:text-lg">{referralCode}</p>
              <p className="text-xs text-[#52627d]">Code</p>
            </div>
          </div>
        </section>

        <section className="reveal mt-4 rounded-2xl border border-[#dcecff] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-[#10213f]">Current Top Referrers</h2>
          <p className="mt-1 text-sm text-[#52627d]">Rankings update from valid installs and new customer signups.</p>
          <div className="mt-5 space-y-3">
            {topReferrers.map((referrer, index) => (
              <div key={referrer.name} className="reveal flex items-center gap-3 rounded-2xl border border-[#ead7a6] bg-[#fffdf7] p-3" data-stagger={Math.min(index + 1, 8)}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b7812b] text-xs font-black text-[#fff4c7]">#{index + 1}</div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${referrer.color}`}>{referrer.initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#10213f]">{referrer.name}</p>
                  <p className="text-sm text-[#52627d]">{referrer.points} points</p>
                </div>
                <span className="rounded-full bg-[#fff4c7] px-3 py-1 text-xs font-bold text-[#8a641d]">{referrer.points} coins</span>
              </div>
            ))}
          </div>
        </section>

        <button className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-[#ead7a6] bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff4c7] text-[#b7812b]"><Gift className="h-6 w-6" /></span>
          <span className="flex-1"><strong className="block text-[#10213f]">View Rewards &amp; Rules</strong><small className="text-sm text-[#52627d]">How points and rewards work</small></span>
          <ChevronRight className="h-5 w-5 text-[#b7812b]" />
        </button>

        <section className="reveal mt-4 rounded-2xl border border-[#dcecff] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#e9f8ff] p-3 text-[#0879c9]"><Users className="h-6 w-6" /></div>
            <div>
              <h2 className="text-xl font-black text-[#10213f]">Invite Friends</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#52627d]">Share your code and earn rewards when friends join EventHub.</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#bdefff] bg-[#f6fbff] p-3">
            <code className="min-w-0 flex-1 truncate text-sm font-bold text-[#0879c9]">{referralLink}</code>
            <button onClick={copyReferralLink} className="rounded-lg bg-[#0879c9] p-2 text-white transition-colors hover:bg-[#063d73]" aria-label="Copy referral link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={shareReferral} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffca28] px-5 py-3 font-bold text-[#10213f] transition-colors hover:bg-[#ffd95c]">
            <Share2 className="h-4 w-4" /> Share Invite
          </button>

          {/* Platform share buttons */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <button
              onClick={shareToWhatsApp}
              className="flex flex-col items-center gap-2 rounded-xl border border-[#e8e0d5] bg-white py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]/10">
                <svg className="h-6 w-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </span>
              <span className="text-xs font-bold text-[#10213f]">WhatsApp</span>
            </button>
            <button
              onClick={shareToInstagram}
              className="flex flex-col items-center gap-2 rounded-xl border border-[#e8e0d5] bg-white py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50">
                <svg className="h-6 w-6 text-pink-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </span>
              <span className="text-xs font-bold text-[#10213f]">Instagram</span>
            </button>
            <button
              onClick={shareToFacebook}
              className="flex flex-col items-center gap-2 rounded-xl border border-[#e8e0d5] bg-white py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-6 w-6 text-[#1877f2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </span>
              <span className="text-xs font-bold text-[#10213f]">Facebook</span>
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#0879c9]"><Sparkles className="h-4 w-4" /> Every successful invite moves you up the leaderboard.</div>
        </section>
      </div>
    </div>
  );
}
