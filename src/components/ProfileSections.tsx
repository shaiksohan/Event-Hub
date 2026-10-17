import { useEffect, useRef, useState } from 'react';
import {
  User, Mail, Phone, MapPin, Globe, Camera, Save, Calendar,
  CheckCircle, Briefcase, Building2, FileText, Film, Grid3x3,
  Languages, Contact, Smartphone, Gift, Play,
  Eye, Heart, MessageCircle, Bookmark, Receipt, CreditCard,
  Settings, Bell, Shield, LogOut, ChevronRight, Wallet, Coins,
  Lock, HelpCircle, Sliders, X, KeyRound, AlertCircle,
  ArrowUpRight, ArrowDownLeft, UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { SERVICE_TYPE_LABELS, WALLET_SOURCE_LABELS, type ServiceType, type Reel, type ServiceBooking, type Service, type WalletTransaction, type WalletTransactionSource } from '@/lib/types';

export type SectionId = 'overview' | 'personal' | 'business' | 'myreels' | 'saved' | 'transactions' | 'account' | 'settings';

export type SectionDef = { id: SectionId; label: string; icon: React.ReactNode };

export const ALL_SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Overview', icon: <Grid3x3 className="w-4 h-4" /> },
  { id: 'personal', label: 'Personal Details', icon: <User className="w-4 h-4" /> },
  { id: 'business', label: 'Business Info', icon: <Building2 className="w-4 h-4" /> },
  { id: 'myreels', label: 'My Reels', icon: <Film className="w-4 h-4" /> },
  { id: 'saved', label: 'Saved Reels', icon: <Bookmark className="w-4 h-4" /> },
  { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
  { id: 'account', label: 'Account', icon: <Wallet className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export function ProfileSections({ sections }: { sections: SectionDef[] }) {
  const { user, profile, refreshProfile, loading, signOut } = useAuth();
  const { navigate } = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<SectionId>(sections[0].id);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [languages, setLanguages] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [upiId, setUpiId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ bookings: 0, favorites: 0, services: 0 });
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [reelCount, setReelCount] = useState(0);
  const [myReels, setMyReels] = useState<Reel[]>([]);
  const [savedReels, setSavedReels] = useState<Reel[]>([]);
  const [transactions, setTransactions] = useState<ServiceBooking[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [txFilter, setTxFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [providerServices, setProviderServices] = useState<Service[]>([]);

  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBusinessName(profile.business_name || '');
      setServiceType(profile.service_type || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setLanguages(profile.languages || '');
      setBio(profile.bio || '');
      setGender(profile.gender || '');
      setDateOfBirth(profile.date_of_birth || '');
      setUpiId(profile.upi_id || '');
      setAvatarUrl(profile.avatar_url || '');
      setNotifPush(profile.notif_push ?? true);
      setNotifEmail(profile.notif_email ?? false);
      setProfileVisible(profile.profile_visible ?? true);
    }
    if (user) setEmail(user.email ?? '');
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('service_bookings').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('service_favorites').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('services').select('id', { count: 'exact' }).eq('provider_id', user.id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('followee_id', user.id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', user.id),
      supabase.from('reels').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('reels').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]).then(async ([b, f, s, followers, following, reels, reelData]) => {
      setStats({ bookings: b.count ?? 0, favorites: f.count ?? 0, services: s.count ?? 0 });
      setFollowerCount(followers.count ?? 0);
      setFollowingCount(following.count ?? 0);
      setReelCount(reels.count ?? 0);
      const ownReels = (reelData.data ?? []) as unknown as Reel[];
      const ownReelIds = ownReels.map((reel) => reel.id);
      if (ownReelIds.length > 0) {
        const [viewsRes, likesRes, commentsRes] = await Promise.all([
          supabase.from('reel_views').select('reel_id').in('reel_id', ownReelIds),
          supabase.from('reel_likes').select('reel_id').in('reel_id', ownReelIds),
          supabase.from('reel_comments').select('reel_id').in('reel_id', ownReelIds),
        ]);
        const viewCounts = new Map<string, number>();
        (viewsRes.data ?? []).forEach((row: { reel_id: string }) => viewCounts.set(row.reel_id, (viewCounts.get(row.reel_id) ?? 0) + 1));
        const likeCounts = new Map<string, number>();
        (likesRes.data ?? []).forEach((row: { reel_id: string }) => likeCounts.set(row.reel_id, (likeCounts.get(row.reel_id) ?? 0) + 1));
        const commentCounts = new Map<string, number>();
        (commentsRes.data ?? []).forEach((row: { reel_id: string }) => commentCounts.set(row.reel_id, (commentCounts.get(row.reel_id) ?? 0) + 1));
        ownReels.forEach((reel) => {
          reel.view_count = viewCounts.get(reel.id) ?? 0;
          reel.like_count = likeCounts.get(reel.id) ?? 0;
          reel.comment_count = commentCounts.get(reel.id) ?? 0;
        });
      }
      setMyReels(ownReels);
    });

    supabase
      .from('service_bookings')
      .select('*, service:services(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTransactions((data ?? []) as ServiceBooking[]);
        setLoadingTransactions(false);
      });

    supabase
      .from('reel_saves')
      .select('reel:reels(*, profile:profiles!reels_user_id_profiles_fkey(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const saved = (data ?? []).map((r) => (r as unknown as { reel: Reel }).reel).filter(Boolean);
        const savedIds = saved.map((reel) => reel.id);
        if (savedIds.length > 0) {
          const [viewsRes, likesRes, commentsRes] = await Promise.all([
            supabase.from('reel_views').select('reel_id').in('reel_id', savedIds),
            supabase.from('reel_likes').select('reel_id').in('reel_id', savedIds),
            supabase.from('reel_comments').select('reel_id').in('reel_id', savedIds),
          ]);
          const viewCounts = new Map<string, number>();
          (viewsRes.data ?? []).forEach((row: { reel_id: string }) => viewCounts.set(row.reel_id, (viewCounts.get(row.reel_id) ?? 0) + 1));
          const likeCounts = new Map<string, number>();
          (likesRes.data ?? []).forEach((row: { reel_id: string }) => likeCounts.set(row.reel_id, (likeCounts.get(row.reel_id) ?? 0) + 1));
          const commentCounts = new Map<string, number>();
          (commentsRes.data ?? []).forEach((row: { reel_id: string }) => commentCounts.set(row.reel_id, (commentCounts.get(row.reel_id) ?? 0) + 1));
          saved.forEach((reel) => {
            reel.view_count = viewCounts.get(reel.id) ?? 0;
            reel.like_count = likeCounts.get(reel.id) ?? 0;
            reel.comment_count = commentCounts.get(reel.id) ?? 0;
          });
        }
        setSavedReels(saved);
      });

    if (profile?.role === 'provider') {
      supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setProviderServices((data ?? []) as Service[]));
    }
  }, [user, profile]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (upErr) { setUploading(false); return; }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(filePath);
    setAvatarUrl(pub.publicUrl);
    setUploading(false);
  };

  const saveAll = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, full_name: fullName, phone, avatar_url: avatarUrl,
      business_name: businessName, service_type: serviceType, location, website,
      languages, bio, upi_id: upiId, gender, date_of_birth: dateOfBirth || null,
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const updateSetting = async (field: 'notif_push' | 'notif_email' | 'profile_visible', value: boolean) => {
    if (!user) return;
    setSettingsSaving(field);
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', user.id);
    setSettingsSaving(null);
    if (!error) await refreshProfile();
  };

  if (loading || !user) return null;

  const isProvider = profile?.role === 'provider';

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#0879c9] to-[#10213f] rounded-2xl p-5 md:p-8 mb-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 bg-[#00a8e8]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white/60" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-[#0879c9] flex items-center justify-center shadow-lg hover:bg-[#e9f8ff] transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-[#bdefff] border-t-[#0879c9] rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
            />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-white">{fullName || 'Your Name'}</h2>
            <p className="text-[#dff7ff] text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${isProvider ? 'bg-amber-400/20 text-amber-100' : 'bg-white/10 text-[#dff7ff]'}`}>
                {isProvider ? 'Service Provider' : 'Customer'}
              </span>
              {profile?.business_name && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-[#dff7ff]">
                  <Briefcase className="w-3 h-3" /> {profile.business_name}
                </span>
              )}
              {profile?.service_type && SERVICE_TYPE_LABELS[profile.service_type as ServiceType] && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-[#dff7ff]">
                  {SERVICE_TYPE_LABELS[profile.service_type as ServiceType]}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/20">
          <button onClick={() => navigate('/bookings')} className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <p className="text-xl font-bold text-white">{stats.bookings}</p>
            <p className="text-xs text-[#dff7ff]">Bookings</p>
          </button>
          <button onClick={() => navigate('/favorites')} className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <p className="text-xl font-bold text-white">{stats.favorites}</p>
            <p className="text-xs text-[#dff7ff]">Favorites</p>
          </button>
          <button onClick={() => navigate(`/followers/${user.id}`)} className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <p className="text-xl font-bold text-white">{followerCount}</p>
            <p className="text-xs text-[#dff7ff]">Followers</p>
          </button>
          <button onClick={() => navigate(`/following/${user.id}`)} className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <p className="text-xl font-bold text-white">{followingCount}</p>
            <p className="text-xs text-[#dff7ff]">Following</p>
          </button>
          <button onClick={() => navigate('/reels')} className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <p className="text-xl font-bold text-white">{reelCount}</p>
            <p className="text-xs text-[#dff7ff]">Reels</p>
          </button>
          <button onClick={() => navigate('/refer')} className="flex flex-col items-center p-3 rounded-xl bg-[#ffca28]/20 hover:bg-[#ffca28]/30 transition-colors">
            <Gift className="w-5 h-5 text-[#ffca28] mb-1" />
            <p className="text-xl font-bold text-white">{profile?.referral_coins || 0}</p>
            <p className="text-xs text-[#fff4c7]">Coins</p>
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeSection === sec.id
                ? 'bg-[#0879c9] text-white shadow-md shadow-[#0879c9]/20'
                : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200 hover:text-gray-700'
            }`}
          >
            {sec.icon}
            {sec.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      {activeSection === 'overview' && (
        <OverviewSection
          isProvider={isProvider}
          myReels={myReels}
          savedReels={savedReels}
          transactions={transactions}
          providerServices={providerServices}
          navigate={navigate}
          setActiveSection={setActiveSection}
        />
      )}

      {activeSection === 'personal' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-8">
          <SectionHeader icon={<User className="w-5 h-5 text-[#0879c9]" />} title="Personal Details" subtitle="Your personal information" saved={saved} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldInput icon={<User className="w-5 h-5 text-gray-400" />} label="Full Name" value={fullName} onChange={setFullName} placeholder="Rahul Sharma" />
            <FieldInput icon={<Mail className="w-5 h-5 text-gray-400" />} label="Email Address" value={email} disabled />
            <FieldInput icon={<Phone className="w-5 h-5 text-gray-400" />} label="Phone Number" value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" />
            <FieldInput icon={<Languages className="w-5 h-5 text-gray-400" />} label="Languages Spoken" value={languages} onChange={setLanguages} placeholder="Hindi, English, Marathi" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors bg-white appearance-none">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <FieldInput icon={<Calendar className="w-5 h-5 text-gray-400" />} label="Date of Birth" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio / About Yourself</label>
              <div className="relative">
                <FileText className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell people about yourself..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors resize-none" />
              </div>
            </div>
          </div>
          <SaveButton onClick={saveAll} saving={saving} />
        </div>
      )}

      {activeSection === 'business' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-8">
          <SectionHeader icon={<Building2 className="w-5 h-5 text-[#0879c9]" />} title="Business Information" subtitle="Your business details and contact info" saved={saved} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldInput icon={<Briefcase className="w-5 h-5 text-gray-400" />} label="Business Name" value={businessName} onChange={setBusinessName} placeholder="Your Business Name" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Type</label>
              <div className="relative">
                <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors bg-white appearance-none">
                  <option value="">Select a service type</option>
                  <option value="function">Function</option>
                  <option value="camera_studio">Camera Studio</option>
                  <option value="catering">Catering Services</option>
                  <option value="workers">Workers</option>
                </select>
              </div>
            </div>
            <FieldInput icon={<MapPin className="w-5 h-5 text-gray-400" />} label="Location" value={location} onChange={setLocation} placeholder="Mumbai, Maharashtra" />
            <FieldInput icon={<Globe className="w-5 h-5 text-gray-400" />} label="Website" value={website} onChange={setWebsite} placeholder="https://yourwebsite.com" type="url" />
            {isProvider && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI ID <span className="font-normal text-gray-400">(for direct payments)</span></label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Customers can scan a QR code or tap to pay directly via any UPI app.</p>
              </div>
            )}
          </div>
          <SaveButton onClick={saveAll} saving={saving} />
        </div>
      )}

      {activeSection === 'myreels' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader icon={<Film className="w-5 h-5 text-pink-600" />} title="My Reels" subtitle="Your uploaded video content" />
          <ReelGrid reels={myReels} emptyText="No reels yet. Go to the Reels page to upload!" onOpen={(reel) => navigate(`/my-reels?reel=${reel.id}`)} />
        </div>
      )}

      {activeSection === 'saved' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader icon={<Bookmark className="w-5 h-5 text-amber-600" />} title="Saved Reels" subtitle="Reels you've bookmarked" />
          <ReelGrid reels={savedReels} emptyText="No saved reels yet. Tap the bookmark icon on any reel to save it here!" onOpen={(reel) => navigate(`/reels?reel=${reel.id}`)} />
        </div>
      )}

      {activeSection === 'transactions' && (
        <TransactionsSection
          transactions={transactions}
          loading={loadingTransactions}
          txFilter={txFilter}
          setTxFilter={setTxFilter}
        />
      )}

      {activeSection === 'account' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
            <SectionHeader icon={<Wallet className="w-5 h-5 text-[#0879c9]" />} title="Account" subtitle="Account details and balance" />
            <div className="space-y-3">
              <InfoRow icon={<Calendar className="w-5 h-5 text-gray-400" />} label="Member Since" value={new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
              <InfoRow icon={<Mail className="w-5 h-5 text-gray-400" />} label="Email" value={user.email ?? ''} />
              <InfoRow icon={<Coins className="w-5 h-5 text-gray-400" />} label="Referral Coins" value={`${profile?.referral_coins || 0} coins earned`} actionLabel="View" onAction={() => navigate('/refer')} />
              <InfoRow icon={<Receipt className="w-5 h-5 text-gray-400" />} label="Transactions" value={`${transactions.length} total transactions`} actionLabel="View" onAction={() => setActiveSection('transactions')} />
            </div>
          </div>

          <WalletSection navigate={navigate} />
          <div className="bg-gradient-to-br from-[#ffca28]/10 to-[#ffca28]/5 rounded-2xl border border-[#ffca28]/20 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#ffca28]/20 flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-[#ffca28]" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">Refer & Earn</h4>
              <p className="text-sm text-gray-500">Invite friends and earn coins for every referral</p>
            </div>
            <button onClick={() => navigate('/refer')} className="px-4 py-2 rounded-xl bg-[#ffca28] text-[#10213f] text-sm font-semibold hover:bg-[#e6b823] transition-colors flex-shrink-0">
              Refer Now
            </button>
          </div>
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
            <SectionHeader icon={<Bell className="w-5 h-5 text-[#0879c9]" />} title="Notifications" subtitle="Manage how you receive alerts" />
            <div className="space-y-1">
              <ToggleRow icon={<Bell className="w-4 h-4" />} label="Push Notifications" description="Receive alerts on your device" checked={notifPush} onChange={(v) => { setNotifPush(v); updateSetting('notif_push', v); }} saving={settingsSaving === 'notif_push'} />
              <ToggleRow icon={<Mail className="w-4 h-4" />} label="Email Notifications" description="Get updates via email" checked={notifEmail} onChange={(v) => { setNotifEmail(v); updateSetting('notif_email', v); }} saving={settingsSaving === 'notif_email'} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
            <SectionHeader icon={<Shield className="w-5 h-5 text-[#0879c9]" />} title="Privacy" subtitle="Control your profile visibility" />
            <div className="space-y-1">
              <ToggleRow icon={<User className="w-4 h-4" />} label="Public Profile" description="Allow others to view your profile" checked={profileVisible} onChange={(v) => { setProfileVisible(v); updateSetting('profile_visible', v); }} saving={settingsSaving === 'profile_visible'} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
            <SectionHeader icon={<Sliders className="w-5 h-5 text-[#0879c9]" />} title="Preferences" subtitle="App preferences and support" />
            <div className="space-y-1">
              <LinkRow icon={<KeyRound className="w-4 h-4" />} label="Change Password" onClick={() => setShowPasswordModal(true)} />
              <LinkRow icon={<HelpCircle className="w-4 h-4" />} label="Help & Support" onClick={() => navigate('/')} />
              <LinkRow icon={<CreditCard className="w-4 h-4" />} label="Payment Methods" onClick={() => navigate('/bookings')} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
            <button onClick={() => { signOut(); navigate('/'); }} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    if (user?.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setError('Your current password is incorrect.');
        setLoading(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(onClose, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e9f8ff] flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-[#0879c9]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-gray-900 font-semibold">Password updated successfully!</p>
            <p className="text-sm text-gray-400 mt-1">You can now use your new password to sign in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><KeyRound className="w-4 h-4" /> Update Password</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, saved }: { icon: React.ReactNode; title: string; subtitle: string; saved?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#e9f8ff] flex items-center justify-center">{icon}</div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
      </div>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-[#0879c9]">
          <CheckCircle className="w-4 h-4" /> Saved
        </span>
      )}
    </div>
  );
}

function FieldInput({ icon, label, value, onChange, placeholder, type = 'text', disabled }: {
  icon: React.ReactNode; label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, actionLabel, onAction }: { icon: React.ReactNode; label: string; value: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400">{value}</p>
        </div>
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="text-sm font-medium text-[#0879c9] hover:underline">{actionLabel}</button>
      )}
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end mt-6">
      <button onClick={onClick} disabled={saving} className="flex items-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><Save className="w-4 h-4" /> Save Details</>
        )}
      </button>
    </div>
  );
}

function ToggleRow({ icon, label, description, checked, onChange, saving }: { icon: React.ReactNode; label: string; description: string; checked: boolean; onChange: (v: boolean) => void; saving?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={saving}
        className={`relative w-12 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#0879c9]' : 'bg-gray-200'} ${saving ? 'opacity-50' : ''}`}
        style={{ height: '26px' }}
      >
        {saving ? (
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-5 border-2 border-[#bdefff] border-t-[#0879c9] rounded-full animate-spin" />
        ) : (
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : ''}`} />
        )}
      </button>
    </div>
  );
}

function LinkRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3.5 px-1 hover:bg-gray-50 rounded-xl transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">{icon}</div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
  );
}

function OverviewSection({
  isProvider, myReels, savedReels, transactions, providerServices, navigate, setActiveSection,
}: {
  isProvider: boolean;
  myReels: Reel[];
  savedReels: Reel[];
  transactions: ServiceBooking[];
  providerServices: Service[];
  navigate: (to: string) => void;
  setActiveSection: (s: SectionId) => void;
}) {
  const recentReels = myReels.slice(0, 3);
  const recentSaved = savedReels.slice(0, 3);
  const recentTx = transactions.slice(0, 3);

  return (
    <div className="space-y-5">
      {isProvider && providerServices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e9f8ff] flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#0879c9]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">My Services</h3>
                <p className="text-sm text-gray-400">{providerServices.length} active listings</p>
              </div>
            </div>
            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-[#0879c9] hover:underline">Manage</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {providerServices.slice(0, 4).map((svc) => (
              <button key={svc.id} onClick={() => navigate(`/service/${svc.id}`)} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors text-left">
                {svc.image_url ? (
                  <img src={svc.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{svc.title}</p>
                  <p className="text-xs text-gray-400">₹{svc.price} {svc.price_unit}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <OverviewCard
        icon={<Film className="w-5 h-5 text-pink-600" />}
        iconBg="bg-pink-50"
        title="My Reels"
        count={myReels.length}
        countLabel="reels"
        reels={recentReels}
        onSeeAll={() => setActiveSection('myreels')}
      />
      <OverviewCard
        icon={<Bookmark className="w-5 h-5 text-amber-600" />}
        iconBg="bg-amber-50"
        title="Saved Reels"
        count={savedReels.length}
        countLabel="saved"
        reels={recentSaved}
        onSeeAll={() => setActiveSection('saved')}
      />

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
              <p className="text-sm text-gray-400">{transactions.length} total</p>
            </div>
          </div>
          <button onClick={() => setActiveSection('transactions')} className="text-sm font-medium text-[#0879c9] hover:underline">See All</button>
        </div>
        {recentTx.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {recentTx.map((tx) => {
              const svc = tx.service;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-lg bg-[#e9f8ff] flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-[#0879c9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{svc?.title || 'Service booking'}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">₹{Number(tx.total_price).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tx.payment_status === 'paid' ? 'bg-[#fff4c7] text-[#8a641d]' : 'bg-amber-50 text-amber-600'}`}>
                      {tx.payment_status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewCard({ icon, iconBg, title, count, countLabel, reels, onSeeAll }: {
  icon: React.ReactNode; iconBg: string; title: string; count: number; countLabel: string;
  reels: Reel[]; onSeeAll: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>{icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-400">{count} {countLabel}</p>
          </div>
        </div>
        <button onClick={onSeeAll} className="text-sm font-medium text-[#0879c9] hover:underline">See All</button>
      </div>
      {reels.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">Nothing here yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {reels.map((reel) => (
            <div key={reel.id} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black">
              <video src={reel.video_url} className="w-full h-full object-cover" muted />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <p className="text-white text-[10px] truncate">{reel.caption || ''}</p>
              </div>
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-white text-[10px]">
                <Eye className="w-3 h-3" /> {reel.view_count ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsSection({
  transactions, loading, txFilter, setTxFilter,
}: {
  transactions: ServiceBooking[];
  loading: boolean;
  txFilter: 'all' | 'paid' | 'pending';
  setTxFilter: (v: 'all' | 'paid' | 'pending') => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
      <SectionHeader icon={<Receipt className="w-5 h-5 text-amber-600" />} title="Transaction Details" subtitle="Your payment history and booking transactions" />
      <div className="flex gap-2 mb-4">
        {(['all', 'paid', 'pending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTxFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              txFilter === tab ? 'bg-[#0879c9] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab === 'all' ? 'All Transactions' : tab === 'paid' ? 'Paid' : 'Pending'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No transactions yet</p>
          <p className="text-gray-400 text-xs mt-1">Your payment history will appear here after booking a service.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions
            .filter((tx) => txFilter === 'all' || (txFilter === 'paid' ? tx.payment_status === 'paid' : tx.payment_status !== 'paid'))
            .map((tx) => {
              const svc = tx.service;
              const methodName = tx.payment_method === 'upi' ? 'UPI' : tx.payment_method === 'card' ? 'Card' : tx.payment_method === 'phonepe' ? 'PhonePe' : tx.payment_method === 'paytm' ? 'Paytm' : tx.payment_method === 'gpay' ? 'Google Pay' : 'Not selected';
              return (
                <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-[#e9f8ff] flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-[#0879c9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{svc?.title || 'Service booking'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {methodName}
                    </p>
                    {tx.payment_screenshot_url && (
                      <a href={tx.payment_screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0879c9] hover:underline mt-1 inline-block">View payment screenshot</a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">₹{Number(tx.total_price).toFixed(2)}</p>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
                      tx.payment_status === 'paid' ? 'bg-[#fff4c7] text-[#8a641d]' : tx.payment_status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {tx.payment_status}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export function ReelGrid({ reels, emptyText, onOpen }: { reels: Reel[]; emptyText: string; onOpen: (reel: Reel) => void }) {
  if (reels.length === 0) {
    return (
      <div className="text-center py-10">
        <Grid3x3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {reels.map((reel) => (
        <div key={reel.id} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black group text-left">
          <button onClick={() => onOpen(reel)} className="absolute inset-0 w-full h-full">
            <video src={reel.video_url} className="w-full h-full object-cover" muted />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
            {reel.caption && <p className="absolute bottom-0 left-0 right-0 text-white text-[11px] p-1.5 bg-gradient-to-t from-black/70 to-transparent truncate">{reel.caption}</p>}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Play className="w-4 h-4 text-white fill-white" /></div></div>
          </button>
          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 text-white text-[10px]">
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5"><Eye className="w-3 h-3" /> {reel.view_count ?? 0}</span>
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5"><Heart className="w-3 h-3" /> {reel.like_count ?? 0}</span>
          </div>
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-white text-[10px]">
            <MessageCircle className="w-3 h-3" /> {reel.comment_count ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}

function WalletSection({ navigate }: { navigate: (to: string) => void }) {
  const { user, profile } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTxs, setWalletTxs] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const isProvider = profile?.role === 'provider';

  useEffect(() => {
    if (!user) return;
    supabase.rpc('get_or_create_wallet').maybeSingle().then(({ data }) => {
      if (data) setWalletBalance(Number((data as { balance: number }).balance) || 0);
    });
    supabase
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setWalletTxs((data ?? []) as WalletTransaction[]);
        setLoading(false);
      });
  }, [user]);

  const totalCredit = walletTxs
    .filter((t) => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalDebit = walletTxs
    .filter((t) => t.type === 'debit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0879c9] via-[#0a6bc4] to-[#10213f] p-5 shadow-lg shadow-[#0879c9]/15">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/70 text-sm font-medium">{isProvider ? 'Available Earnings' : 'Wallet Balance'}</p>
            <Wallet className="w-5 h-5 text-white/40" />
          </div>
          <p className="text-3xl font-black text-white mb-3">₹{walletBalance.toFixed(2)}</p>
          <button
            onClick={() => navigate('/wallet')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold backdrop-blur-sm transition-all"
          >
            Open Wallet <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-400">Money In</span>
          </div>
          <p className="text-lg font-bold text-gray-900">₹{totalCredit.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xs font-medium text-gray-400">Money Out</span>
          </div>
          <p className="text-lg font-bold text-gray-900">₹{totalDebit.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-900 text-sm">Recent Wallet Activity</h4>
          <button onClick={() => navigate('/wallet')} className="text-xs font-medium text-[#0879c9] hover:underline">See all</button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : walletTxs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No wallet transactions yet</p>
        ) : (
          <div className="space-y-2">
            {walletTxs.map((tx) => {
              const isCredit = tx.type === 'credit';
              const sourceLabel = WALLET_SOURCE_LABELS[tx.source as WalletTransactionSource] || tx.source;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-green-50' : 'bg-red-50'}`}>
                    {isCredit ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{tx.description || sourceLabel}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : '−'}₹{Number(tx.amount).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
