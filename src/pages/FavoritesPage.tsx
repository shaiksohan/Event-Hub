import { useEffect, useState } from 'react';
import { Heart, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ServiceFavorite } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import ServiceCard from '@/components/ServiceCard';

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();
  const [favorites, setFavorites] = useState<ServiceFavorite[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(true);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('service_favorites')
      .select('*, service:services(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFavorites(data as ServiceFavorite[]);
        setFavSet(new Set((data as ServiceFavorite[]).map((f) => f.service_id)));
        setLoadingFavs(false);
      });
  }, [user]);

  const toggleFavorite = async (serviceId: string) => {
    if (!user) return;
    await supabase.from('service_favorites').delete().eq('user_id', user.id).eq('service_id', serviceId);
    setFavorites((prev) => prev.filter((f) => f.service_id !== serviceId));
    setFavSet((prev) => { const next = new Set(prev); next.delete(serviceId); return next; });
  };

  if (loading || loadingFavs) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <h1 className="reveal text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
      <p className="text-gray-500 mb-8">Services you've saved for later</p>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Heart className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-400 text-lg mt-4">No favorites yet</p>
          <p className="text-gray-400 text-sm mt-1">Tap the heart icon on any service to save it here.</p>
          <button
            onClick={() => navigate('/browse')}
            className="mt-6 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Browse Services
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((fav, idx) => (
            fav.service && (
              <div key={fav.id} className="reveal" data-stagger={Math.min(idx + 1, 8)}>
                <ServiceCard
                  service={fav.service}
                  favorited={favSet.has(fav.service_id)}
                  onToggleFavorite={() => toggleFavorite(fav.service_id)}
                />
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
