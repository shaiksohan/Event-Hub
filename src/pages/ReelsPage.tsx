import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Film, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import ReelCard from '@/components/ReelCard';
import UploadReelModal from '@/components/UploadReelModal';
import type { Reel } from '@/lib/types';

export default function ReelsPage({ userId }: { userId?: string }) {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loadingReels, setLoadingReels] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOwnReels = !!userId;

  const fetchReels = useCallback(async () => {
    setLoadingReels(true);
    let query = supabase
      .from('reels')
      .select('*, profile:profiles!reels_user_id_profiles_fkey(*)')
      .order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data } = await query;
    
    const reelList = (data ?? []) as unknown as Reel[];
    
    if (user && reelList.length > 0) {
      const reelIds = reelList.map((r) => r.id);
      const [{ data: likes }, { data: myLikes }, { data: commentCounts }, { data: viewCounts }] = await Promise.all([
        supabase.from('reel_likes').select('reel_id').in('reel_id', reelIds),
        supabase.from('reel_likes').select('reel_id').eq('user_id', user.id).in('reel_id', reelIds),
        supabase.from('reel_comments').select('reel_id').in('reel_id', reelIds),
        supabase.from('reel_views').select('reel_id, user_id').in('reel_id', reelIds).eq('user_id', user.id),
      ]);
      const viewedSet = new Set((viewCounts ?? []).map((v: { reel_id: string }) => v.reel_id));

      const likeMap = new Map<string, number>();
      (likes ?? []).forEach((l: { reel_id: string }) => {
        likeMap.set(l.reel_id, (likeMap.get(l.reel_id) ?? 0) + 1);
      });
      const myLikeSet = new Set((myLikes ?? []).map((l: { reel_id: string }) => l.reel_id));
      const commentMap = new Map<string, number>();
      (commentCounts ?? []).forEach((c: { reel_id: string }) => {
        commentMap.set(c.reel_id, (commentMap.get(c.reel_id) ?? 0) + 1);
      });

      reelList.forEach((r) => {
        r.like_count = likeMap.get(r.id) ?? 0;
        r.liked_by_me = myLikeSet.has(r.id);
        r.comment_count = commentMap.get(r.id) ?? 0;
        r.viewed_by_me = viewedSet.has(r.id);
      });
    }

    setReels(reelList);
    setLoadingReels(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchReels();
  }, [user, fetchReels]);

  useEffect(() => {
    const requestedReelId = new URLSearchParams(window.location.search).get('reel');
    if (!requestedReelId || reels.length === 0) return;
    const requestedIndex = reels.findIndex((reel) => reel.id === requestedReelId);
    if (requestedIndex < 0) return;
    setActiveIndex(requestedIndex);
    requestAnimationFrame(() => containerRef.current?.scrollTo({ top: requestedIndex * (containerRef.current?.clientHeight ?? 0), behavior: 'auto' }));
  }, [reels]);

  // Track views when active reel changes — count every view
  useEffect(() => {
    if (!user || reels.length === 0) return;
    const activeReel = reels[activeIndex];
    if (!activeReel) return;
    supabase.rpc('record_reel_view', { p_reel_id: activeReel.id }).then(({ error }) => {
      if (!error) {
        setReels((prev) =>
          prev.map((r) =>
            r.id === activeReel.id ? { ...r, view_count: (r.view_count ?? 0) + 1 } : r
          )
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeIndex]);

  // Auto-advance to next reel when the current video ends
  const handleReelEnded = useCallback(() => {
    if (activeIndex >= reels.length - 1) return;
    const nextIndex = activeIndex + 1;
    containerRef.current?.scrollTo({
      top: nextIndex * (containerRef.current?.clientHeight ?? 0),
      behavior: 'smooth',
    });
    setActiveIndex(nextIndex);
  }, [activeIndex, reels.length]);

  // Real-time: automatically push new reels to every user's feed
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('reels-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reels' },
        (payload) => {
          const newReel = payload.new as Reel;
          setReels((prev) => {
            if (prev.some((r) => r.id === newReel.id)) return prev;
            return [newReel, ...prev];
          });
          // Fetch the profile for the new reel
          supabase
            .from('profiles')
            .select('*')
            .eq('id', newReel.user_id)
            .maybeSingle()
            .then(({ data }) => {
              setReels((prev) =>
                prev.map((r) =>
                  r.id === newReel.id ? { ...r, profile: data as Reel['profile'] } : r
                )
              );
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reels' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setReels((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const reelHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / reelHeight);
    if (newIndex !== activeIndex) setActiveIndex(newIndex);
  };

  if (loading || loadingReels) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (reels.length === 0) {
    return (
      <div className="relative h-screen bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Film className="w-10 h-10 text-white/40" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">No Reels Yet</h2>
          {profile?.role === 'provider' ? (
            <>
              <p className="text-white/50 text-sm mb-6">{isOwnReels ? "You haven't uploaded any reels yet!" : 'Be the first to share a reel!'}</p>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" /> Upload Reel
              </button>
            </>
          ) : (
            <p className="text-white/50 text-sm">Check back soon for reels from service providers!</p>
          )}
        </div>
        {showUpload && (
          <UploadReelModal
            onClose={() => setShowUpload(false)}
            onUploaded={() => { setShowUpload(false); fetchReels(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/50 to-transparent pt-4 pb-8 px-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white font-bold text-lg">{isOwnReels ? 'My Reels' : 'Reels'}</h1>
          {profile?.role === 'provider' ? (
            <button
              onClick={() => setShowUpload(true)}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Upload Reel"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>
      </div>

      {/* Vertical scroll feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {reels.map((reel, i) => (
          <div key={reel.id} className="w-full h-full snap-start snap-always">
            <ReelCard reel={reel} isActive={i === activeIndex} onEnded={handleReelEnded} />
          </div>
        ))}
      </div>

      {showUpload && (
        <UploadReelModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); fetchReels(); }}
        />
      )}
    </div>
  );
}
