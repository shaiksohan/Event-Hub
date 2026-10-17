import { MapPin, Star, Heart } from 'lucide-react';
import type { CSSProperties, PointerEvent } from 'react';
import type { Service } from '@/lib/types';
import { SERVICE_TYPE_LABELS } from '@/lib/types';
import { useRouter } from '@/lib/router';

type Props = {
  service: Service;
  favorited?: boolean;
  onToggleFavorite?: () => void;
};

export default function ServiceCard({ service, favorited, onToggleFavorite }: Props) {
  const { navigate } = useRouter();

  const resetTilt = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--tilt-x', '0deg');
    event.currentTarget.style.setProperty('--tilt-y', '0deg');
  };

  const updateTilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--tilt-x', `${(y * -6).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
  };

  const cardStyle = {
    '--tilt-x': '0deg',
    '--tilt-y': '0deg',
  } as CSSProperties;

  return (
    <div
      id={`service-card-${service.id}`}
      className="motion-card reveal group bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-[#dcecff] hover:shadow-xl hover:shadow-[#0879c9]/10 hover:border-[#9ddff7] transition-all duration-300 cursor-pointer relative"
      style={cardStyle}
      onClick={() => navigate(`/service/${service.id}`)}
      onPointerMove={updateTilt}
      onPointerLeave={resetTilt}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={service.image_url}
          alt={service.title}
          className="motion-image img-3d w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
            <span className="text-xs font-semibold text-[#0879c9]">
              {SERVICE_TYPE_LABELS[service.service_type]}
            </span>
          </div>
          {service.category && (
            <div className="bg-[#0879c9]/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
              <span className="text-xs font-semibold text-white">{service.category}</span>
            </div>
          )}
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm"
            aria-label="Toggle favorite"
          >
            <Heart className={`w-4 h-4 transition-transform ${favorited ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-3 relative" style={{ transform: 'translateZ(20px)' }}>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-medium text-gray-700">{Number(service.rating ?? 0).toFixed(1)}</span>
          <span className="text-xs text-gray-400">({Number(service.review_count ?? 0)} reviews)</span>
        </div>
        <h3 className="font-bold text-[#10213f] text-lg leading-snug group-hover:text-[#0879c9] transition-colors line-clamp-2">
          {service.title}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{service.city}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">Price shown at booking</span>
          {service.available ? (
            <span className="text-xs font-medium text-[#0879c9] bg-[#e9f8ff] px-2 py-1 rounded-full">
              Available
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
