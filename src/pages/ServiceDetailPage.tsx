import { useEffect, useState, useRef } from 'react';
import { MapPin, Star, Heart, Share2, ArrowLeft, Minus, Plus, CheckCircle, Calendar, Users, MessageSquare, Send, ArrowRight, User, Phone, LockKeyhole, Shield, Link2, PartyPopper, UtensilsCrossed, Video, Wrench, IndianRupee, Loader2, Leaf, Drumstick } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Service, Review, ServiceType, MenuItem } from '@/lib/types';
import { SERVICE_TYPE_LABELS, PRICE_UNITS } from '@/lib/types';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import MenuSelection, { type SelectedItem } from '@/components/MenuSelection';

const SERVICE_TYPE_INFO: Record<ServiceType, { description: string; keyPoints: string[]; icon: typeof PartyPopper }> = {
  function: {
    description: 'Make every celebration special with EventHub Function Services. Find professional decorators, function halls, stage designers, lighting, sound systems, and event planners for your special occasions.',
    keyPoints: ['Weddings, Receptions & Engagements', 'Birthday & Anniversary Functions', 'Decoration, Stage & Lighting', 'Function Halls & Event Management'],
    icon: PartyPopper,
  },
  catering: {
    description: 'Serve delicious food at every occasion with EventHub Catering Services. Discover catering providers offering tasty menus, fresh food, and professional service for small gatherings and grand celebrations.',
    keyPoints: ['Wedding & Function Catering', 'South Indian & Andhra Food', 'Vegetarian & Non-Vegetarian Menus', 'Biryani, Tiffins, Snacks & Sweets'],
    icon: UtensilsCrossed,
  },
  camera_studio: {
    description: 'Capture your precious moments with EventHub Camera & Studio Services. Find skilled photographers and videographers for weddings, birthdays, pre-wedding shoots, and other special occasions.',
    keyPoints: ['Wedding Photography & Videography', 'Pre-Wedding & Birthday Shoots', 'Drone Photography & Live Streaming', 'Photo Albums, Video Editing & Reels'],
    icon: Video,
  },
  workers: {
    description: 'Find reliable workers for your functions and special events with EventHub Workers Services. Connect with skilled people to help with event setup, serving, cleaning, decoration, and other essential tasks.',
    keyPoints: ['Event Setup & Decoration Workers', 'Catering Servers & Kitchen Helpers', 'Cleaning & Maintenance Staff', 'Loading, Unloading & General Helpers'],
    icon: Wrench,
  },
};

export default function ServiceDetailPage({ serviceId }: { serviceId: string }) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [duration, setDuration] = useState(1);
  const [numGuests, setNumGuests] = useState(1);
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [pincode, setPincode] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const lookupPincode = async (pin: string) => {
    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const info = Array.isArray(data) ? data[0] : null;
      if (info && info.Status === 'Success' && Array.isArray(info.PostOffice) && info.PostOffice.length > 0) {
        const po = info.PostOffice[0];
        setCountry('India');
        setState(po.State || '');
        setDistrict(po.District || '');
        setVillage(po.Name || '');
      }
    } catch {
      // silently ignore — user can fill manually
    }
    setPincodeLoading(false);
  };
  const [bookingStep, setBookingStep] = useState<'details' | 'summary' | 'processing' | 'error'>('details');
  const [bookingError, setBookingError] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [hasBooked, setHasBooked] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const [menuSelection, setMenuSelection] = useState<Record<string, SelectedItem>>({});
  const [serviceMenuItems, setServiceMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setCustomerName(profile.full_name || '');
      setCustomerPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .maybeSingle()
      .then(({ data }) => {
        const raw = data as Record<string, unknown> | null;
        const svc = raw
          ? ({ ...raw, rating: Number(raw.rating ?? 0), review_count: Number(raw.review_count ?? 0), price: Number(raw.price ?? 0), gallery_urls: Array.isArray(raw.gallery_urls) ? raw.gallery_urls : [], highlights: Array.isArray(raw.highlights) ? raw.highlights : [], inclusions: Array.isArray(raw.inclusions) ? raw.inclusions : [], exclusions: Array.isArray(raw.exclusions) ? raw.exclusions : [], customization_options: Array.isArray(raw.customization_options) ? raw.customization_options : [], suitable_occasions: Array.isArray(raw.suitable_occasions) ? raw.suitable_occasions : [], faqs: Array.isArray(raw.faqs) ? raw.faqs : [], packages: Array.isArray(raw.packages) ? raw.packages : [] } as unknown as Service)
          : null;
        setService(svc);
        setLoading(false);
      });
  }, [serviceId]);

  useEffect(() => {
    supabase
      .from('reviews')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data as Review[]));
  }, [serviceId]);

  useEffect(() => {
    setMenuLoading(true);
    supabase
      .from('service_menu_items')
      .select('*')
      .eq('service_id', serviceId)
      .eq('available', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data }) => setServiceMenuItems((data ?? []).map((item) => ({ ...item, price: Number(item.price ?? 0) })) as MenuItem[]))
      .then(() => setMenuLoading(false), () => setMenuLoading(false));
  }, [serviceId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('service_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('service_id', serviceId)
      .maybeSingle()
      .then(({ data }) => setFavorited(!!data));
  }, [user, serviceId]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('service_bookings').select('id').eq('user_id', user.id).eq('service_id', serviceId).maybeSingle(),
      supabase.from('reviews').select('id').eq('user_id', user.id).eq('service_id', serviceId).maybeSingle(),
    ]).then(([booking, review]) => {
      setHasBooked(!!booking.data);
      setHasReviewed(!!review.data);
    });
  }, [user, serviceId]);

  const submitReview = async () => {
    if (!user || !service) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert({
      service_id: service.id,
      user_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
    if (!error) {
      setReviewSubmitted(true);
      setHasReviewed(true);
      setReviewComment('');
      supabase
        .from('reviews')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setReviews(data as Review[]));
    }
    setSubmittingReview(false);
  };

  const toggleFavorite = async () => {
    if (!user) { navigate('/auth'); return; }
    if (favorited) {
      await supabase.from('service_favorites').delete().eq('user_id', user.id).eq('service_id', serviceId);
      setFavorited(false);
    } else {
      await supabase.from('service_favorites').insert({ user_id: user.id, service_id: serviceId });
      setFavorited(true);
    }
  };

  const calcTotal = () => {
    if (!service) return 0;
    const menuTotal = Object.values(menuSelection).reduce((sum, s) => sum + Number(s.price ?? 0) * Number(s.quantity ?? 0), 0);
    if (service.price_unit === 'per_hour') return service.price * duration + menuTotal;
    if (service.price_unit === 'per_person') return service.price * numGuests + menuTotal;
    return service.price + menuTotal;
  };

  const to12Hour = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${period}`;
  };

  const formattedTime = () => {
    if (!bookingTime) return '';
    return `${to12Hour(bookingTime)}${bookingEndTime ? ` - ${to12Hour(bookingEndTime)}` : ''}`;
  };

  const validateAndShowSummary = () => {
    if (!user) { navigate('/auth'); return; }
    if (!service) return;
    if (!customerName.trim()) { setBookingError('Please enter your name'); return; }
    if (!customerPhone.trim() || !/^\+?[0-9\s-]{10,15}$/.test(customerPhone.trim())) { setBookingError('Please enter a valid phone number'); return; }
    if (!bookingDate) { setBookingError('Please select a start date'); return; }
    if (!bookingEndDate) { setBookingError('Please select an end date'); return; }
    if (bookingEndDate < bookingDate) { setBookingError('End date cannot be before the start date'); return; }
    if (!bookingTime || !bookingEndTime) { setBookingError('Please select both booking times'); return; }
    if (!eventLocation.trim()) { setBookingError('Please enter the event location'); return; }
    if (!country.trim() || !state.trim() || !district.trim() || !village.trim()) { setBookingError('Please fill in all location fields (Country, State, District, Village)'); return; }
    setBookingError('');
    setBookingStep('summary');
  };

  const handleBooking = async () => {
    if (!user || !service) return;
    setBookingStep('processing');
    setBookingError('');
    const { data, error } = await supabase.from('service_bookings').insert({
      user_id: user.id,
      service_id: service.id,
      provider_id: service.provider_id,
      booking_date: bookingDate,
      booking_end_date: bookingEndDate,
      booking_time: formattedTime(),
      booking_end_time: to12Hour(bookingEndTime),
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      duration_hours: duration,
      num_guests: numGuests,
      notes,
      address: address.trim(),
      event_location: eventLocation.trim(),
      country: country.trim(),
      state: state.trim(),
      district: district.trim(),
      village: village.trim(),
      total_price: calcTotal(),
      status: 'pending',
      payment_status: 'pending',
      escrow_status: 'none',
      booking_status: 'pending_payment',
    }).select('id').maybeSingle();
    if (error) {
      setBookingStep('error');
      setBookingError(error.message);
    } else {
      const newBookingId = data?.id ?? null;
      setBookingId(newBookingId);
      const selections = Object.values(menuSelection).filter((s) => s.quantity > 0);
      if (newBookingId && selections.length > 0) {
        const { error: selectionError } = await supabase.from('booking_menu_selections').insert(
          selections.map((s) => ({
            booking_id: newBookingId,
            menu_item_id: s.menu_item_id,
            user_id: user.id,
            quantity: s.quantity,
          }))
        );
        if (selectionError) {
          setBookingStep('error');
          setBookingError('Your booking was created, but the selected menu items could not be saved. Please contact the provider before payment.');
          return;
        }
      }
      setShowBooking(false);
      navigate(`/payment/${newBookingId}`);
    }
  };

  const resetBooking = () => {
    setShowBooking(false);
    setBookingStep('details');
    setBookingDate('');
    setBookingEndDate('');
    setBookingTime('');
    setBookingEndTime('');
    setCustomerName(profile?.full_name || '');
    setCustomerPhone(profile?.phone || '');
    setDuration(1);
    setNumGuests(1);
    setNotes('');
    setAddress('');
    setEventLocation('');
    setCountry('India');
    setState('');
    setDistrict('');
    setVillage('');
    setPincode('');
    setBookingError('');
    setBookingId(null);
    setMenuSelection({});
  };

  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShowShareMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShareMenu]);

  const shareServiceUrl = service ? `${window.location.origin}/service/${service.id}` : '';
  const shareServiceText = service ? `Check out ${service.title} on EventHub!` : '';

  const shareServiceToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareServiceText + ' ' + shareServiceUrl)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareServiceToInstagram = () => {
    navigator.clipboard?.writeText(shareServiceUrl).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    setShowShareMenu(false);
  };

  const shareServiceToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareServiceUrl)}&quote=${encodeURIComponent(shareServiceText)}`, '_blank');
    setShowShareMenu(false);
  };

  const copyServiceLink = () => {
    navigator.clipboard?.writeText(shareServiceUrl).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
        <div className="h-80 bg-gray-200 rounded-2xl mb-6" />
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Service not found.</p>
        <button onClick={() => navigate('/browse')} className="mt-4 text-[#0879c9] font-medium">
          Back to Browse
        </button>
      </div>
    );
  }

  const gallery = [service.image_url, ...service.gallery_urls].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/browse')}
        className="flex items-center gap-2 text-sm text-[#52627d] hover:text-[#0879c9] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </button>

      {/* Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <div className="md:col-span-2 h-72 md:h-96 rounded-2xl overflow-hidden">
          <img src={gallery[activeImage] || service.image_url} alt={service.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex md:flex-col gap-3">
          {gallery.slice(0, 3).map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className={`flex-1 h-24 md:h-28 rounded-xl overflow-hidden border-2 transition-colors ${
                activeImage === i ? 'border-[#00a8e8]' : 'border-transparent'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-block px-3 py-1 bg-[#e9f8ff] text-[#0879c9] text-xs font-semibold rounded-full">
                {SERVICE_TYPE_LABELS[service.service_type]}
              </span>
              {service.category && (
                <span className="inline-block px-3 py-1 bg-[#0879c9] text-white text-xs font-semibold rounded-full">
                  {service.category}
                </span>
              )}
              {service.available ? (
                <span className="inline-block px-3 py-1 bg-[#e9f8ff] text-[#0879c9] text-xs font-semibold rounded-full">
                  Available
                </span>
              ) : (
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
                  Unavailable
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-[#10213f]">{service.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-gray-700">{Number(service.rating ?? 0).toFixed(1)}</span>
                <span className="text-sm text-gray-400">({Number(service.review_count ?? 0)} reviews)</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-4 h-4" /> {service.city}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#10213f] mb-3">About This Service</h2>
            <p className="text-[#52627d] leading-relaxed">{service.description}</p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-gray-100">
            <h3 className="font-semibold text-[#10213f] mb-2">Service Location</h3>
            <p className="text-sm text-gray-600">
              {service.address && `${service.address}, `}{service.city}
            </p>
          </div>

          {/* Service Type Info */}
          {SERVICE_TYPE_INFO[service.service_type] && (() => {
            const info = SERVICE_TYPE_INFO[service.service_type];
            const Icon = info.icon;
            return (
              <div className="p-5 bg-gradient-to-br from-[#e9f8ff] to-[#f1faff] rounded-xl border border-[#bdefff]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0879c9] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#10213f]">{SERVICE_TYPE_LABELS[service.service_type]}</h3>
                </div>
                <p className="text-sm text-[#52627d] leading-relaxed mb-4">{info.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {info.keyPoints.map((point) => (
                    <div key={point} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#0879c9] flex-shrink-0" />
                      <span className="text-sm text-[#52627d]">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Catering Menu Preview */}
          {service.service_type === 'catering' && serviceMenuItems.length > 0 && (() => {
            const grouped = serviceMenuItems.reduce<Record<string, typeof serviceMenuItems>>((acc, item) => {
              (acc[item.category] = acc[item.category] || []).push(item);
              return acc;
            }, {});
            return (
              <div>
                <h2 className="text-xl font-bold text-[#10213f] mb-4 flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-[#0879c9]" /> Menu
                  <span className="text-sm font-normal text-gray-400">({serviceMenuItems.length} items)</span>
                </h2>
                <div className="space-y-5">
                  {Object.entries(grouped).map(([category, catItems]) => (
                    <div key={category}>
                      <h3 className="text-sm font-bold text-[#0879c9] mb-2">{category}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 bg-white">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[#e9f8ff] flex items-center justify-center flex-shrink-0">
                                {item.is_veg ? <Leaf className="w-5 h-5 text-green-500" /> : <Drumstick className="w-5 h-5 text-red-400" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {item.is_veg ? (
                                  <span className="w-3 h-3 rounded-sm border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                                    <span className="w-1 h-1 rounded-full bg-green-500" />
                                  </span>
                                ) : (
                                  <span className="w-3 h-3 rounded-sm border-2 border-red-500 flex items-center justify-center flex-shrink-0">
                                    <span className="w-1 h-1 rounded-full bg-red-500" />
                                  </span>
                                )}
                                <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                              </div>
                              {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                              <p className="text-sm font-semibold text-[#0879c9] flex items-center mt-0.5"><IndianRupee className="w-3 h-3" />{Number(item.price).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-bold text-[#10213f] mb-4">Reviews ({reviews.length})</h2>

            {/* Write Review Form */}
            {user && hasBooked && !hasReviewed && !reviewSubmitted && (
              <div className="p-5 bg-white rounded-xl border border-[#bdefff] mb-4">
                <h3 className="font-semibold text-[#10213f] mb-3">Write a Review</h3>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Share your experience..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00a8e8] focus:ring-1 focus:ring-[#00a8e8] outline-none transition-colors resize-none mb-3"
                />
                <button
                  onClick={submitReview}
                  disabled={!reviewComment.trim() || submittingReview}
                  className="flex items-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
                >
                  {submittingReview ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Review
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Review Submitted Confirmation */}
            {reviewSubmitted && (
              <div className="p-4 bg-[#e9f8ff] rounded-xl border border-[#bdefff] mb-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#0879c9] flex-shrink-0" />
                <p className="text-sm text-[#0879c9]">Thank you! Your review has been submitted.</p>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm">No reviews yet. {hasBooked ? 'Be the first to review this service!' : 'Book this service to leave a review.'}</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-white rounded-xl border border-gray-100">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl border border-[#dcecff] p-6 space-y-5">
            {profile?.role === 'provider' ? (
              <div className="rounded-xl bg-[#fff0f3] border border-[#f6b6c8] p-4 text-center">
                <p className="text-sm text-[#e32d68] font-medium">You are registered as a service provider.</p>
                <p className="text-xs text-gray-500 mt-1">Providers can create and manage their own service listings, upload reels, and receive bookings — but cannot book other services.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-3 inline-flex items-center gap-2 bg-[#e32d68] hover:bg-[#c01f56] text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
                  Go to My Dashboard
                </button>
              </div>
            ) : (
              <button
                onClick={() => { if (!user) navigate('/auth'); else setShowBooking(true); }}
                disabled={!service.available}
                className="w-full bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-colors"
              >
                {user ? 'Book Now' : 'Sign In to Book'}
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={toggleFavorite}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#dcecff] hover:border-[#9ddff7] text-sm font-medium text-[#52627d] transition-colors"
              >
                <Heart className={`w-4 h-4 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
                {favorited ? 'Saved' : 'Save'}
              </button>
              <div className="relative flex-1" ref={shareRef}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#dcecff] hover:border-[#9ddff7] text-sm font-medium text-[#52627d] transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                {showShareMenu && (
                  <div className="absolute bottom-full mb-2 right-0 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-10">
                    <button onClick={shareServiceToWhatsApp} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366] font-bold text-xs">W</span>
                      WhatsApp
                    </button>
                    <button onClick={shareServiceToInstagram} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] flex items-center justify-center text-white font-bold text-xs">I</span>
                      Instagram
                    </button>
                    <button onClick={shareServiceToFacebook} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] font-bold text-xs">F</span>
                      Facebook
                    </button>
                    <button onClick={copyServiceLink} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors border-t border-gray-50 mt-1 pt-2">
                      <Link2 className="w-4 h-4 text-gray-400 ml-2" />
                      {linkCopied ? 'Link Copied!' : 'Copy Link'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {user && user.id !== service.provider_id && (
              <button
                onClick={() => navigate(`/messages/${service.provider_id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:border-[#9ddff7] hover:bg-[#e9f8ff] text-sm font-medium text-[#0879c9] transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> Message Provider
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && service && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto bg-[#10213f]/45 backdrop-blur-sm" onClick={() => bookingStep !== 'processing' && resetBooking()}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-4xl w-full p-5 sm:p-7 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {bookingStep === 'processing' ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 mx-auto border-4 border-[#bdefff] border-t-[#0879c9] rounded-full animate-spin" />
                <p className="text-gray-500 mt-4">Submitting your booking...</p>
              </div>
            ) : bookingStep === 'error' ? (
              <div className="text-center py-10">
                <p className="text-red-500 font-medium">Booking failed</p>
                <p className="text-sm text-gray-500 mt-2">{bookingError}</p>
                <button onClick={() => setBookingStep('details')} className="mt-5 px-6 py-2.5 rounded-xl bg-[#0879c9] text-white font-medium">Try Again</button>
              </div>
            ) : bookingStep === 'summary' ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#10213f]">Booking Summary</h3>
                    <p className="text-sm text-gray-500 mt-1">Review your details before proceeding to payment</p>
                  </div>
                  <button onClick={() => setBookingStep('details')} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Back to form">×</button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-[#dcecff] p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0879c9] mb-3"><User className="w-4 h-4" /> Customer Details</h4>
                    <div className="space-y-1.5 text-sm">
                      <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{customerName}</span></p>
                      <p><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{customerPhone}</span></p>
                      <p><span className="text-gray-500">Event Location:</span> <span className="font-medium text-gray-900">{eventLocation}</span></p>
                      <p><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{[address, village, district, state, country].filter(Boolean).join(', ')}</span></p>
                      {notes && <p><span className="text-gray-500">Requirements:</span> <span className="font-medium text-gray-900">{notes}</span></p>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dcecff] p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0879c9] mb-3"><Calendar className="w-4 h-4" /> Schedule</h4>
                    <div className="space-y-1.5 text-sm">
                      <p><span className="text-gray-500">Dates:</span> <span className="font-medium text-gray-900">{bookingDate} to {bookingEndDate}</span></p>
                      <p><span className="text-gray-500">Time:</span> <span className="font-medium text-gray-900">{formattedTime()}</span></p>
                      {service.price_unit === 'per_hour' && <p><span className="text-gray-500">Duration:</span> <span className="font-medium text-gray-900">{duration} hours</span></p>}
                      {service.price_unit === 'per_person' && <p><span className="text-gray-500">Guests:</span> <span className="font-medium text-gray-900">{numGuests}</span></p>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dcecff] p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0879c9] mb-3"><Shield className="w-4 h-4" /> Service Provider</h4>
                    <div className="space-y-1.5 text-sm">
                      <p><span className="text-gray-500">Service:</span> <span className="font-medium text-gray-900">{service.title}</span></p>
                      <p><span className="text-gray-500">Service Price:</span> <span className="font-medium text-gray-900">₹{service.price} {PRICE_UNITS[service.price_unit] || service.price_unit}</span></p>
                      <p><span className="text-gray-500">Payment Status:</span> <span className="font-medium text-amber-600">Pending Payment</span></p>
                    </div>
                  </div>

                  {Object.values(menuSelection).filter((s) => s.quantity > 0).length > 0 && (
                    <div className="rounded-xl border border-[#dcecff] p-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#0879c9] mb-3"><UtensilsCrossed className="w-4 h-4" /> Selected Menu Items</h4>
                      <div className="space-y-1.5 text-sm">
                        {Object.values(menuSelection).filter((s) => s.quantity > 0).map((s) => (
                          <div key={s.menu_item_id} className="flex items-center justify-between">
                            <span className="text-gray-700">{s.name} × {s.quantity}</span>
                            <span className="font-medium text-gray-900">₹{(Number(s.price ?? 0) * Number(s.quantity ?? 0)).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                          <span className="font-semibold text-gray-900">Menu Subtotal</span>
                          <span className="font-bold text-[#0879c9]">₹{Object.values(menuSelection).reduce((sum, s) => sum + Number(s.price ?? 0) * Number(s.quantity ?? 0), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-[#e9f8ff] rounded-xl">
                    <span className="font-semibold text-gray-900">Booking Total</span>
                    <span className="font-bold text-[#0879c9] text-lg">₹{calcTotal().toFixed(2)}</span>
                  </div>

                  <div className="rounded-xl border border-[#bdefff] bg-[#e9f8ff]/40 p-3 text-xs text-[#0879c9] flex items-start gap-2">
                    <LockKeyhole className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>After you proceed, you will be taken to a secure payment page. Your payment will be held safely by EventHub and released to the provider only after the service is completed and confirmed.</span>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep('details')} className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">Edit Details</button>
                    <button onClick={handleBooking} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] text-white font-semibold transition-colors">
                      Proceed to Payment <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-[#10213f]">Book This Service</h3>
                    <p className="text-sm text-gray-500 mt-1">{service.title}</p>
                  </div>
                  <button onClick={resetBooking} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close booking form">×</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#dcecff] p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#0879c9] mb-3"><User className="w-4 h-4" /> Customer Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your name" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                        <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Enter 10-digit mobile number" inputMode="tel" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Event Location</label>
                        <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Venue name or event address" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Street Address <span className="font-normal text-gray-400">(Optional)</span></label>
                        <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House no, street, landmark" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
                          <div className="relative">
                            <input
                              value={pincode}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPincode(val);
                                if (val.length === 6) lookupPincode(val);
                              }}
                              placeholder="Enter 6-digit pincode"
                              inputMode="numeric"
                              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]"
                            />
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            {pincodeLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0879c9] animate-spin" />}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Auto-filled from pincode" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
                          <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Auto-filled from pincode" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Village / City</label>
                        <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Auto-filled from pincode" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Special Requirements <span className="font-normal text-gray-400">(Optional)</span></label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special requests or requirements..." className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8] resize-none" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dcecff] p-4 space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#0879c9] mb-3"><Calendar className="w-4 h-4" /> Booking Dates</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-xs font-medium text-gray-600">Start Date<input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="mt-1 w-full px-2.5 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></label>
                        <label className="text-xs font-medium text-gray-600">End Date<input type="date" value={bookingEndDate} onChange={(e) => setBookingEndDate(e.target.value)} min={bookingDate || new Date().toISOString().split('T')[0]} className="mt-1 w-full px-2.5 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#00a8e8]" /></label>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#0879c9] mb-3">Booking Time</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white outline-none focus:border-[#00a8e8]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                          <input
                            type="time"
                            value={bookingEndTime}
                            onChange={(e) => setBookingEndTime(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white outline-none focus:border-[#00a8e8]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#bdefff] bg-[#e9f8ff]/40 p-3 text-xs text-[#0879c9] flex items-start gap-2">
                      <LockKeyhole className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>You will be taken to a secure payment page after reviewing your booking. Payment is held safely by EventHub and released to the provider only after service completion.</span>
                    </div>
                  </div>
                </div>

                {service.price_unit === 'per_hour' && <div className="flex items-center justify-between mt-4 p-3 bg-gray-50 rounded-xl"><span className="text-sm font-medium text-gray-700">Duration (hours)</span><div className="flex items-center gap-3"><button onClick={() => setDuration(Math.max(1, duration - 1))} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button><span className="font-semibold w-8 text-center">{duration}</span><button onClick={() => setDuration(Math.min(24, duration + 1))} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button></div></div>}
                {service.price_unit === 'per_person' && <div className="flex items-center justify-between mt-4 p-3 bg-gray-50 rounded-xl"><span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Users className="w-4 h-4" /> Number of Guests</span><div className="flex items-center gap-3"><button onClick={() => setNumGuests(Math.max(1, numGuests - 1))} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button><span className="font-semibold w-8 text-center">{numGuests}</span><button onClick={() => setNumGuests(Math.min(500, numGuests + 1))} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button></div></div>}

                {service.service_type === 'catering' && (
                  <div className="mt-4">
                    <MenuSelection items={serviceMenuItems} loading={menuLoading} selected={menuSelection} onChange={setMenuSelection} />
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 p-4 bg-[#e9f8ff] rounded-xl"><span className="font-semibold text-gray-900">Total Amount</span><span className="font-bold text-[#0879c9] text-lg">₹{calcTotal().toFixed(2)}</span></div>
                <button onClick={validateAndShowSummary} className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0879c9] hover:bg-[#0668a8] text-white font-semibold transition-colors">Review & Continue <ArrowRight className="w-4 h-4" /></button>
                {bookingError && <p className="text-sm text-red-500 mt-3 text-center">{bookingError}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
