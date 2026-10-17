import { useEffect, useState } from 'react';
import { ArrowLeft, User, Briefcase, MapPin, Globe, Languages, Calendar, Film, Heart, MessageCircle, UserPlus, UserCheck, Grid3x3, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { SERVICE_TYPE_LABELS, type ServiceType, type Reel, type Profile } from '@/lib/types';

type Props = { userId: string };

export default function UserProfilePage({ userId }: Props) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reels, setReels] = useState<Reel[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [reelCount, setReelCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: profileData }, { data: reelData }, followerRes, followingRes, reelCountRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('reels').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('follows').select('id', { count: 'exact' }).eq('followee_id', userId),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
        supabase.from('reels').select('id', { count: 'exact' }).eq('user_id', userId),
      ]);
      setProfile(profileData as Profile | null);
      setReels((reelData ?? []) as Reel[]);
      setFollowerCount(followerRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setReelCount(reelCountRes.count ?? 0);
      setLoading(false);

      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('followee_id', userId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }
    };
    fetchAll();
  }, [userId, user]);

  const toggleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', userId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: userId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      supabase.from('notifications').insert({
        user_id: userId,
        actor_id: user.id,
        type: 'follow',
        entity_id: null,
        entity_type: null,
        message: 'started following you',
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-2xl mb-6" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400 text-lg">User not found</p>
        <button onClick={() => window.history.back()} className="mt-4 text-teal-600">Go back</button>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <div className="reveal max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile Header */}
      <div className="reveal bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 bg-teal-500 flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-10 h-10 text-white/60" />
              </div>
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-white">{profile.full_name || 'Unknown User'}</h2>
            {profile.business_name && (
              <p className="text-teal-100 text-sm flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                <Briefcase className="w-3.5 h-3.5" /> {profile.business_name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                profile.role === 'provider' ? 'bg-amber-400/20 text-amber-100' : 'bg-white/10 text-teal-100'
              }`}>
                {profile.role === 'provider' ? 'Service Provider' : 'Customer'}
              </span>
              {profile.service_type && SERVICE_TYPE_LABELS[profile.service_type as ServiceType] && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-teal-100">
                  {SERVICE_TYPE_LABELS[profile.service_type as ServiceType]}
                </span>
              )}
            </div>
          </div>
          {!isOwnProfile && user && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={toggleFollow}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-colors ${
                  isFollowing
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'bg-white text-teal-700 hover:bg-gray-100'
                }`}
              >
                {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
              </button>
              <button
                onClick={() => setShowContactDetails((visible) => !visible)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-colors"
              >
                <Phone className="w-4 h-4" /> Contact
                {showContactDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate(`/messages/${userId}`)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white text-teal-700 hover:bg-gray-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Message
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <button
            onClick={() => navigate(`/followers/${userId}`)}
            className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <p className="text-xl font-bold text-white">{followerCount}</p>
            <p className="text-xs text-teal-100">Followers</p>
          </button>
          <button
            onClick={() => navigate(`/following/${userId}`)}
            className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <p className="text-xl font-bold text-white">{followingCount}</p>
            <p className="text-xs text-teal-100">Following</p>
          </button>
          <div className="flex flex-col items-center p-3 rounded-xl bg-white/10">
            <p className="text-xl font-bold text-white">{reelCount}</p>
            <p className="text-xs text-teal-100">Reels</p>
          </div>
        </div>
      </div>

      {/* Bio / Details */}
      {(profile.bio || profile.location || profile.website || profile.languages || profile.business_name) && (
        <div className="reveal bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Business & About</h3>
              <p className="text-sm text-gray-400">Information shared by this profile</p>
            </div>
          </div>
          {profile.bio && <p className="text-gray-700 text-sm leading-relaxed mb-4">{profile.bio}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {profile.business_name && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {profile.business_name}</span>}
            {profile.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {profile.location}</span>}
            {profile.languages && <span className="flex items-center gap-1.5"><Languages className="w-4 h-4" /> {profile.languages}</span>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-teal-600 hover:underline">
                <Globe className="w-4 h-4" /> Website
              </a>
            )}
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>

          {showContactDetails && (
            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.phone ? (
                <a href={`tel:${profile.phone}`} className="flex items-center gap-3 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700 hover:bg-teal-100 transition-colors">
                  <Phone className="w-4 h-4" /> <span><strong>Phone</strong><br />{profile.phone}</span>
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400"><Phone className="w-4 h-4" /> Phone not provided</div>
              )}
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-700 hover:bg-teal-100 transition-colors">
                  <Globe className="w-4 h-4" /> <span><strong>Website</strong><br />Open business website</span>
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400"><Mail className="w-4 h-4" /> No website provided</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reels Grid */}
      <div className="reveal bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Grid3x3 className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">Reels</h3>
        </div>
        {reels.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No reels yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {reels.map((reel, idx) => (
              <div key={reel.id} className="reveal" data-stagger={Math.min(idx + 1, 8)}>
                <button
                onClick={() => navigate('/reels')}
                className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black group"
              >
                <video src={reel.video_url} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="flex items-center gap-3 text-white text-xs">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> 0</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> 0</span>
                  </div>
                </div>
                {reel.caption && (
                  <p className="absolute bottom-0 left-0 right-0 text-white text-xs p-2 bg-gradient-to-t from-black/60 to-transparent truncate">
                    {reel.caption}
                  </p>
                )}
              </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
