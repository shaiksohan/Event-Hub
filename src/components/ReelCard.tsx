import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { Heart, MessageCircle, Send, Music, Play, MoreVertical, Trash2, Star, Bookmark, Volume2, VolumeX, Share2, Eye, ImagePlus, SmilePlus, X, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { Reel, ReelComment, Profile } from '@/lib/types';

type Props = {
  reel: Reel;
  isActive: boolean;
  onEnded?: () => void;
};

const COMMENT_STICKERS = ['❤️', '👏', '🔥', '😂', '😮', '😭', '😍', '🎉'];
const COMMENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const COMMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export default function ReelCard({ reel, isActive, onEnded }: Props) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(reel.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(reel.like_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [posting, setPosting] = useState(false);
  const commentImageInputRef = useRef<HTMLInputElement>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [checkFollow, setCheckFollow] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [muted, setMuted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const reelProfile = reel.profile;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('reel_saves')
      .select('id')
      .eq('reel_id', reel.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, reel.id]);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.muted = false;
      setMuted(false);
      videoRef.current.play().catch(() => {
        // Autoplay with sound blocked by browser — fall back to muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          setMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted, isActive]);

  useEffect(() => {
    if (!user || !reelProfile || reel.user_id === user.id) return;
    supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('followee_id', reel.user_id)
      .maybeSingle()
      .then(({ data }) => {
        setIsFollowing(!!data);
        setCheckFollow(true);
      });
  }, [user, reel.user_id, reelProfile]);

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('reel_comments')
      .select('*, profile:profiles!reel_comments_user_id_profiles_fkey(*)')
      .eq('reel_id', reel.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const commentRows = (data ?? []) as unknown as ReelComment[];
    const commentsWithImages = await Promise.all(commentRows.map(async (comment) => {
      if (!comment.image_path) return comment;
      const { data: signedImage } = await supabase.storage
        .from('reel-comment-images')
        .createSignedUrl(comment.image_path, 3600);
      return { ...comment, image_url: signedImage?.signedUrl ?? null };
    }));

    setComments(commentsWithImages);
    setLoadingComments(false);
  };

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      await supabase.from('reel_likes').delete().eq('reel_id', reel.id).eq('user_id', user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from('reel_likes').insert({ reel_id: reel.id, user_id: user.id });
      if (reel.user_id !== user.id) {
        supabase.from('notifications').insert({
          user_id: reel.user_id,
          actor_id: user.id,
          type: 'like',
          entity_id: reel.id,
          entity_type: 'reel',
          message: 'liked your reel',
        });
      }
    }
  };

  const toggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const clearCommentImage = () => {
    if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
    setCommentImage(null);
    setCommentImagePreview(null);
    if (commentImageInputRef.current) commentImageInputRef.current.value = '';
  };

  const handleCommentImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!COMMENT_IMAGE_TYPES.includes(file.type) || file.size > COMMENT_IMAGE_MAX_BYTES) {
      event.target.value = '';
      return;
    }
    if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
    setCommentImage(file);
    setCommentImagePreview(URL.createObjectURL(file));
  };

  const postComment = async () => {
    if (!user || (!commentText.trim() && !commentImage && !selectedSticker)) return;
    setPosting(true);

    let imagePath: string | null = null;
    if (commentImage) {
      imagePath = `${user.id}/${crypto.randomUUID()}.${commentImage.name.split('.').pop()?.toLowerCase() || 'jpg'}`;
      const { error: uploadError } = await supabase.storage
        .from('reel-comment-images')
        .upload(imagePath, commentImage, { cacheControl: '3600', upsert: false, contentType: commentImage.type });
      if (uploadError) {
        setPosting(false);
        return;
      }
    }

    const { data, error: commentError } = await supabase
      .from('reel_comments')
      .insert({
        reel_id: reel.id,
        user_id: user.id,
        comment: commentText.trim(),
        image_path: imagePath,
        sticker: selectedSticker,
      })
      .select('*, profile:profiles!reel_comments_user_id_profiles_fkey(*)')
      .maybeSingle();

    if (data && !commentError) {
      const newComment = data as unknown as ReelComment;
      if (imagePath) {
        const { data: signedImage } = await supabase.storage
          .from('reel-comment-images')
          .createSignedUrl(imagePath, 3600);
        newComment.image_url = signedImage?.signedUrl ?? null;
      }
      setComments((prev) => [newComment, ...prev]);
      setCommentText('');
      setSelectedSticker(null);
      clearCommentImage();
      if (reel.user_id !== user.id) {
        supabase.from('notifications').insert({
          user_id: reel.user_id,
          actor_id: user.id,
          type: 'comment',
          entity_id: reel.id,
          entity_type: 'reel',
          message: 'commented on your reel',
        });
      }
    } else if (imagePath) {
      await supabase.storage.from('reel-comment-images').remove([imagePath]);
    }
    setPosting(false);
  };

  const deleteComment = async (comment: ReelComment) => {
    if (!user) return;
    await supabase.from('reel_comments').delete().eq('id', comment.id).eq('user_id', user.id);
    if (comment.image_path) {
      await supabase.storage.from('reel-comment-images').remove([comment.image_path]);
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
  };

  const toggleFollow = async () => {
    if (!user || !reelProfile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', reel.user_id);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followee_id: reel.user_id });
      setIsFollowing(true);
      supabase.from('notifications').insert({
        user_id: reel.user_id,
        actor_id: user.id,
        type: 'follow',
        entity_id: null,
        entity_type: null,
        message: 'started following you',
      });
    }
  };

  const deleteReel = async () => {
    if (!user || reel.user_id !== user.id) return;
    await supabase.from('reels').delete().eq('id', reel.id);
    window.location.reload();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !muted;
    videoRef.current.muted = newMuted;
    setMuted(newMuted);
    if (!newMuted && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    if (saved) {
      setSaved(false);
      await supabase.from('reel_saves').delete().eq('reel_id', reel.id).eq('user_id', user.id);
    } else {
      setSaved(true);
      await supabase.from('reel_saves').insert({ reel_id: reel.id, user_id: user.id });
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/reels?reel=${encodeURIComponent(reel.id)}` : '';
  const shareText = `Check out this reel on EventHub!`;

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
    setShowShare(false);
  };

  const shareViaApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'EventHub Reel', text: shareText, url: shareUrl });
      } catch {}
    } else {
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
    }
    setShowShare(false);
  };

  const shareToInstagram = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    window.open('https://www.instagram.com/', '_blank');
    setShowShare(false);
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
    setShowShare(false);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setShowShare(false);
  };

  const isOwner = user?.id === reel.user_id;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black snap-start snap-always">
      {/* Video progress bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-20">
          <div className="h-full bg-white transition-[width] linear" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        muted={muted}
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0) setProgress(v.currentTime / v.duration);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(1);
          onEnded?.();
        }}
        className="w-full h-full object-cover"
      />

      {/* Pause overlay — play button + sound button in center */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMute}
              className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-110"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-7 h-7 text-white" /> : <Volume2 className="w-7 h-7 text-white" />}
            </button>
            <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-110">
              <Play className="w-8 h-8 text-white fill-white" />
            </button>
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Right action bar - middle right corner */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-transform ${liked ? 'bg-red-500/20 scale-110' : 'bg-white/10'}`}>
            <Heart className={`w-6 h-6 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-medium">{likeCount}</span>
        </button>

        {/* Comments */}
        <button onClick={toggleComments} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{reel.comment_count ?? 0}</span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span key={reel.view_count ?? 0} className="text-white text-xs font-medium animate-[pop_0.3s_ease-out]">{reel.view_count ?? 0}</span>
        </div>

        {/* Share popup - triggered from 3-dot menu */}
        {showShare && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowShare(false)} />
            <div className="absolute right-14 top-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
              <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Share to</p>
              <button
                onClick={shareToWhatsApp}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-[#0879c9]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </button>
              <button
                onClick={shareToInstagram}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </button>
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-[#1877f2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={shareViaApp}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-5 h-5 text-[#0879c9]" /> Share via apps
              </button>
            </div>
          </>
        )}

        {/* Three dots menu - available for all users */}
        <div className="relative">
          <button onClick={() => { setShowMenu(!showMenu); setShowShare(false); }} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md">
              <MoreVertical className="w-6 h-6 text-white" />
            </div>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-14 top-0 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                {!isOwner && (
                  <button
                    onClick={() => { navigate(`/profile/${reel.user_id}`); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" /> View Profile
                  </button>
                )}
                {!isOwner && checkFollow && (
                  <button
                    onClick={() => { toggleFollow(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" /> {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
                <button
                  onClick={() => { toggleSave(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {saved ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <Star className="w-4 h-4" />}
                  {saved ? 'Remove from Favorites' : 'Add to Favorites'}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setShowShare(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button
                  onClick={() => { copyLink(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Copy Link
                </button>
                {isOwner && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={deleteReel}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 right-20 bottom-24 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(`/profile/${reel.user_id}`)}
            className="flex items-center gap-2"
          >
            {reelProfile?.avatar_url ? (
              <img src={reelProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0879c9] to-[#10213f] flex items-center justify-center border-2 border-white/30">
                <span className="text-white font-bold text-sm">
                  {(reelProfile?.full_name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate(`/profile/${reel.user_id}`)}
              className="text-white font-semibold text-sm truncate block hover:underline"
            >
              {reelProfile?.full_name || 'Unknown User'}
            </button>
            {reelProfile?.business_name && (
              <p className="text-white/70 text-xs truncate">{reelProfile.business_name}</p>
            )}
          </div>
          {!isOwner && checkFollow && (
            <button
              onClick={toggleFollow}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isFollowing
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        {reel.caption && (
          <p className="text-white text-sm mb-2 line-clamp-3 break-words">{reel.caption}</p>
        )}
        <div className="flex items-center gap-1.5 text-white/60 text-xs">
          <Music className="w-3 h-3" />
          <span>Original audio</span>
        </div>
      </div>

      {/* Comments panel — Instagram-style half sheet */}
      {showComments && (
        <>
          {/* Backdrop dim */}
          <div
            className="absolute inset-0 z-20 bg-black/40"
            style={{ animation: 'sheet-fade-in 200ms ease-out' }}
            onClick={() => setShowComments(false)}
          />
          {/* Sheet */}
          <div
            className="absolute right-0 bottom-0 left-0 z-30 bg-white rounded-t-2xl flex flex-col"
            style={{ height: '50%', animation: 'sheet-up 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 text-sm">Comments</h3>
              <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close comments">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {/* Comment composer — above the list */}
            {user && (
              <div className="border-b border-gray-100 bg-white px-4 py-3 flex-shrink-0">
                {commentImagePreview && (
                  <div className="relative w-16 h-16 mb-2">
                    <img src={commentImagePreview} alt="Attachment preview" className="w-full h-full rounded-lg object-cover" />
                    <button
                      onClick={clearCommentImage}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {selectedSticker && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                    <span className="text-2xl">{selectedSticker}</span>
                    <button onClick={() => setSelectedSticker(null)} className="text-xs hover:text-red-500">Remove sticker</button>
                  </div>
                )}
                {showStickers && (
                  <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-gray-50 border border-gray-100">
                    {COMMENT_STICKERS.map((sticker) => (
                      <button
                        key={sticker}
                        onClick={() => { setSelectedSticker(sticker); setShowStickers(false); }}
                        className="text-2xl hover:scale-125 transition-transform"
                        aria-label={`Use ${sticker} sticker`}
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-500 text-xs font-bold">
                        {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <input
                    ref={commentImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleCommentImageChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => commentImageInputRef.current?.click()}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-[#0879c9] hover:bg-[#e9f8ff] transition-colors"
                    aria-label="Add image"
                  >
                    <ImagePlus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowStickers((visible) => !visible)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showStickers || selectedSticker ? 'text-[#0879c9] bg-[#e9f8ff]' : 'text-gray-500 hover:text-[#0879c9] hover:bg-[#e9f8ff]'}`}
                    aria-label="Add sticker"
                  >
                    <SmilePlus className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') postComment(); }}
                    placeholder="Add a comment..."
                    className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-full bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 outline-none transition-colors"
                  />
                  <button
                    onClick={postComment}
                    disabled={(!commentText.trim() && !commentImage && !selectedSticker) || posting}
                    className="text-[#0879c9] font-semibold text-sm disabled:opacity-40 flex-shrink-0"
                  >
                    {posting ? '...' : 'Post'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 ml-12">Images up to 5 MB</p>
              </div>
            )}
            {/* Comment list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-[#0879c9] rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <CommentRow key={c.id} comment={c} currentUserId={user?.id ?? ''} onDelete={deleteComment} onNavigate={navigate} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  currentUserId,
  onDelete,
  onNavigate,
}: {
  comment: ReelComment;
  currentUserId: string;
  onDelete: (comment: ReelComment) => void;
  onNavigate: (to: string) => void;
}) {
  const cp = comment.profile as Profile | undefined;
  return (
    <div className="flex items-start gap-2.5">
      <button onClick={() => onNavigate(`/profile/${comment.user_id}`)}>
        {cp?.avatar_url ? (
          <img src={cp.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <span className="text-teal-600 text-xs font-bold">
              {(cp?.full_name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-gray-900">{cp?.full_name || 'Unknown'}</span>
          {comment.comment && <>{' '}<span className="text-gray-700 break-words">{comment.comment}</span></>}
        </p>
        {comment.sticker && <div className="text-3xl mt-1">{comment.sticker}</div>}
        {comment.image_url && (
          <img src={comment.image_url} alt="Comment attachment" className="mt-2 max-w-[180px] max-h-40 rounded-xl object-cover border border-gray-100" />
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {comment.user_id !== currentUserId && (
          <button onClick={() => onNavigate(`/messages/${comment.user_id}`)} className="text-gray-300 hover:text-teal-600" aria-label="Message commenter">
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
        {comment.user_id === currentUserId && (
          <button onClick={() => onDelete(comment)} className="text-gray-300 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
