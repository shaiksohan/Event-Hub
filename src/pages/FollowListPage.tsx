import { useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { Profile } from '@/lib/types';

type Props = {
  userId: string;
  mode: 'followers' | 'following';
};

type FollowUser = Profile & { follow_id: string };

export default function FollowListPage({ userId, mode }: Props) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      if (mode === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('id, follower:profiles!follows_follower_id_profiles_fkey(*)')
          .eq('followee_id', userId)
          .order('created_at', { ascending: false });
        const list = (data ?? []).map((f: Record<string, unknown>) => ({
          ...(f.follower as Profile),
          follow_id: f.id as string,
        }));
        setUsers(list);
      } else {
        const { data } = await supabase
          .from('follows')
          .select('id, followee:profiles!follows_followee_id_profiles_fkey(*)')
          .eq('follower_id', userId)
          .order('created_at', { ascending: false });
        const list = (data ?? []).map((f: Record<string, unknown>) => ({
          ...(f.followee as Profile),
          follow_id: f.id as string,
        }));
        setUsers(list);
      }
      setLoading(false);
    };

    const fetchMyFollows = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id);
      setFollowingIds(new Set((data ?? []).map((d: { followee_id: string }) => d.followee_id)));
    };

    fetchList();
    fetchMyFollows();
  }, [userId, mode, user]);

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    if (followingIds.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', targetId);
      setFollowingIds((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: targetId });
      setFollowingIds((prev) => { const n = new Set(prev); n.add(targetId); return n; });
    }
  };

  return (
    <div className="reveal max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="reveal text-2xl font-bold text-gray-900 mb-1">
        {mode === 'followers' ? 'Followers' : 'Following'}
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        {users.length} {mode === 'followers' ? 'followers' : 'following'}
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 text-lg">No {mode} yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u, idx) => (
            <div
              key={u.id}
              className="reveal flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow"
              data-stagger={Math.min(idx + 1, 8)}
            >
              <button onClick={() => navigate(`/profile/${u.id}`)}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-600 font-bold">
                      {(u.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => navigate(`/profile/${u.id}`)}
                  className="font-semibold text-gray-900 text-sm truncate block hover:text-teal-600 transition-colors"
                >
                  {u.full_name || 'Unknown User'}
                </button>
                {u.business_name && (
                  <p className="text-xs text-gray-400 truncate">{u.business_name}</p>
                )}
                {u.bio && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{u.bio}</p>
                )}
              </div>
              {user && u.id !== user.id && (
                <button
                  onClick={() => toggleFollow(u.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    followingIds.has(u.id)
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {followingIds.has(u.id) ? (
                    <><UserCheck className="w-4 h-4" /> Following</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Follow</>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
