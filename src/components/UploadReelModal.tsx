import { useRef, useState } from 'react';
import { X, Upload, Loader2, Film } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Props = {
  onClose: () => void;
  onUploaded: () => void;
};

export default function UploadReelModal({ onClose, onUploaded }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (f: File) => {
    if (!f.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }
    setError('');
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!user || !file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('reels').upload(filePath, file, { upsert: false });
    if (upErr) {
      setError('Failed to upload video. Please try again.');
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from('reels').getPublicUrl(filePath);
    setUploading(false);

    setSaving(true);
    const { data: inserted, error: insErr } = await supabase.from('reels').insert({
      user_id: user.id,
      video_url: pub.publicUrl,
      caption: caption.trim(),
    }).select('*').maybeSingle();
    setSaving(false);
    if (insErr) {
      setError(insErr.message || 'Failed to publish reel. Please try again.');
      return;
    }

    // Notify all followers about the new reel
    if (inserted) {
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followee_id', user.id);

      if (followers && followers.length > 0) {
        const notifications = (followers as { follower_id: string }[]).map((f) => ({
          user_id: f.follower_id,
          actor_id: user.id,
          type: 'reel' as const,
          entity_id: (inserted as { id: string }).id,
          entity_type: 'reel',
          message: 'shared a new reel',
        }));
        await supabase.from('notifications').insert(notifications);
      }
    }

    onUploaded();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Reel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>
          )}

          {!videoUrl ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-12 flex flex-col items-center gap-3 hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
                <Film className="w-7 h-7 text-teal-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Tap to select a video</p>
                <p className="text-xs text-gray-400 mt-0.5">MP4, WebM, MOV up to 50MB</p>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[300px] mx-auto">
                <video src={videoUrl} controls className="w-full h-full object-contain" />
              </div>
              <button
                onClick={() => { setFile(null); setVideoUrl(''); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Choose a different video
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Write a caption..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors resize-none text-sm"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading || saving}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {uploading || saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {uploading ? 'Uploading...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Publish Reel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
