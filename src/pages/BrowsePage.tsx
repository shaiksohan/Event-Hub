import { useEffect, useState } from 'react';
import { Search, X, ChevronDown, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service, ServiceType } from '@/lib/types';
import { SERVICE_TYPE_LABELS, SERVICE_CATEGORIES } from '@/lib/types';
import { useRouter } from '@/lib/router';
import ServiceCard from '@/components/ServiceCard';
import { useAuth } from '@/lib/auth';

export default function BrowsePage() {
  const { path } = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [showCategories, setShowCategories] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(path.split('?')[1] || '');
    const type = params.get('type');
    const categoryParam = params.get('category');
    setServiceType(type || '');
    setCategory(categoryParam || '');
  }, [path]);

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      let query = supabase.from('services').select('*');

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%`);
      }
      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (city) {
        query = query.ilike('city', `%${city}%`);
      }
      if (minRating > 0) {
        query = query.gte('rating', minRating);
      }

      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'rating_desc') query = query.order('rating', { ascending: false });
      else if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });

      const { data } = await query;
      setServices(data as Service[]);
      setLoading(false);
    };
    loadServices();
  }, [search, serviceType, category, city, minRating, sortBy]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('service_favorites')
      .select('service_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavorites(new Set(data.map((f) => f.service_id)));
      });
  }, [user]);

  const toggleFavorite = async (serviceId: string) => {
    if (!user) return;
    if (favorites.has(serviceId)) {
      await supabase.from('service_favorites').delete().eq('user_id', user.id).eq('service_id', serviceId);
      setFavorites((prev) => { const next = new Set(prev); next.delete(serviceId); return next; });
    } else {
      await supabase.from('service_favorites').insert({ user_id: user.id, service_id: serviceId });
      setFavorites((prev) => new Set(prev).add(serviceId));
    }
  };

  const types = [
    { value: '', label: 'All Services' },
    { value: 'function', label: 'Function' },
    { value: 'camera_studio', label: 'Camera Studio' },
    { value: 'catering', label: 'Catering Services' },
    { value: 'workers', label: 'Workers' },
  ];

  const availableCategories = serviceType
    ? SERVICE_CATEGORIES[serviceType as ServiceType]
    : [];

  const clearAll = () => {
    setServiceType('');
    setCategory('');
    setCity('');
    setSearch('');
    setMinRating(0);
  };

  const CITIES = [
    'Rajahmundry', 'Kakinada', 'Vijayawada', 'Visakhapatnam', 'Guntur',
    'Tirupati', 'Nellore', 'Hyderabad', 'Chennai', 'Bengaluru',
    'Amalapuram', 'Tanuku', 'Bhimavaram', 'Eluru', 'Ongole',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 reveal">
        <span className="inline-flex items-center rounded-full bg-[#e9f8ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0879c9]">Discover your fit</span>
        <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#10213f]">Browse Services</h1>
        <p className="text-sm text-[#52627d] mt-1">Find the right creative team, setup crew, or catering partner for your event.</p>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 reveal" data-stagger="1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search services, cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#dcecff] bg-white/90 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full sm:w-auto px-3 py-3 rounded-xl border border-[#dcecff] focus:border-[#00a8e8] outline-none transition-colors bg-white text-sm text-[#52627d]"
        >
          <option value="newest">Newest</option>
          <option value="rating_desc">Top Rated</option>
          <option value="price_asc">Price (Low)</option>
          <option value="price_desc">Price (High)</option>
        </select>
      </div>

      {/* Service Type Pills */}
      <div className="flex flex-wrap gap-2 mb-3 reveal" data-stagger="2">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => { setServiceType(t.value); setCategory(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              serviceType === t.value ? 'bg-[#0879c9] text-white shadow-sm shadow-[#0879c9]/20' : 'bg-white text-[#52627d] border border-[#dcecff] hover:border-[#9ddff7] hover:text-[#0879c9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category Dropdown — only shown when a service type is selected */}
      {availableCategories.length > 0 && (
        <div className="relative mb-4">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#bdefff] bg-white text-sm font-medium text-[#10213f] hover:border-[#00a8e8] transition-colors"
          >
            <span>
              {category ? category : `All ${SERVICE_TYPE_LABELS[serviceType as ServiceType]} Categories`}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
          </button>
          {showCategories && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-[#dcecff] shadow-xl shadow-[#10213f]/10 max-h-64 overflow-y-auto">
              <button
                onClick={() => { setCategory(''); setShowCategories(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f1faff] transition-colors ${!category ? 'text-[#0879c9] font-semibold' : 'text-[#52627d]'}`}
              >
                All Categories
              </button>
              {availableCategories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setCategory(c.value); setShowCategories(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f1faff] transition-colors ${category === c.value ? 'text-[#0879c9] font-semibold' : 'text-[#52627d]'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* City filter + Rating filter + Clear */}
      <div className="flex flex-wrap items-center gap-3 mb-6 reveal" data-stagger="3">
        <div className="relative flex-1 max-w-xs">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors text-sm bg-white appearance-none cursor-pointer"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="px-4 py-2 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors text-sm bg-white cursor-pointer"
        >
          <option value={0}>All Ratings</option>
          <option value={4}>4+ Stars</option>
          <option value={4.5}>4.5+ Stars</option>
          <option value={5}>5 Stars</option>
        </select>
        {(serviceType || category || city || search || minRating > 0) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No services found matching your filters.</p>
          <button
            onClick={clearAll}
            className="mt-4 text-teal-600 font-medium hover:text-teal-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{services.length} service{services.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service, idx) => (
              <div key={service.id} className="reveal" data-stagger={Math.min(idx + 1, 8)}>
                <ServiceCard
                  key={service.id}
                  service={service}
                  favorited={favorites.has(service.id)}
                  onToggleFavorite={user ? () => toggleFavorite(service.id) : undefined}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
