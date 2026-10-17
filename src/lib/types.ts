export type Profile = {
  id: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  phone: string;
  location: string;
  website: string;
  role: 'customer' | 'provider' | 'admin';
  business_name: string;
  service_type: string;
  gender: string;
  date_of_birth: string;
  languages: string;
  referral_code: string;
  referral_coins: number;
  wallet_balance: number;
  upi_id: string;
  notif_push: boolean;
  notif_email: boolean;
  profile_visible: boolean;
  created_at: string;
};

export type ServiceType = 'function' | 'camera_studio' | 'catering' | 'workers';

export type ServicePackage = {
  name: string;
  price: number;
  description: string;
  features: string[];
};

export type ServiceFAQ = {
  question: string;
  answer: string;
};

export type Service = {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  service_type: ServiceType;
  category: string;
  price: number;
  price_unit: string;
  city: string;
  address: string;
  image_url: string;
  gallery_urls: string[];
  rating: number;
  review_count: number;
  available: boolean;
  created_at: string;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  customization_options: string[];
  suitable_occasions: string[];
  faqs: ServiceFAQ[];
  packages: ServicePackage[];
  booking_info: string;
};

export type PaymentMethod = 'upi' | 'card' | 'cash_on_delivery' | 'phonepe' | 'paytm' | 'gpay';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type EscrowStatus = 'none' | 'held' | 'released' | 'refunded';

export type BookingStatus =
  | 'pending_payment'
  | 'payment_successful'
  | 'awaiting_provider'
  | 'booking_confirmed'
  | 'in_progress'
  | 'awaiting_customer'
  | 'completed'
  | 'payout_processing'
  | 'payout_completed'
  | 'cancellation_requested'
  | 'cancelled'
  | 'refund_processing'
  | 'refunded'
  | 'disputed';

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'Pending Payment',
  payment_successful: 'Payment Successful — Awaiting Service',
  awaiting_provider: 'Awaiting Provider Acceptance',
  booking_confirmed: 'Booking Confirmed',
  in_progress: 'Service In Progress',
  awaiting_customer: 'Awaiting Customer Confirmation',
  completed: 'Completed',
  payout_processing: 'Payout Processing',
  payout_completed: 'Payout Completed',
  cancellation_requested: 'Cancellation Requested',
  cancelled: 'Cancelled',
  refund_processing: 'Refund Processing',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

export type PaymentOrder = {
  id: string;
  booking_id: string;
  user_id: string;
  gateway_order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export type PaymentTransaction = {
  id: string;
  booking_id: string;
  order_id: string | null;
  user_id: string;
  gateway_payment_id: string | null;
  amount: number;
  status: string;
  failure_reason: string | null;
  verified_at: string | null;
  created_at: string;
};

export type ProviderPayout = {
  id: string;
  booking_id: string;
  provider_id: string;
  amount: number;
  platform_fee: number;
  status: string;
  gateway_reference: string | null;
  processed_at: string | null;
  created_at: string;
};

export type Dispute = {
  id: string;
  booking_id: string;
  raised_by: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type ServiceBooking = {
  id: string;
  user_id: string;
  service_id: string;
  provider_id: string;
  booking_date: string;
  booking_end_date?: string | null;
  booking_time: string;
  booking_end_time?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  duration_hours: number;
  num_guests: number;
  notes: string;
  address: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_method: PaymentMethod | null;
  payment_screenshot_url: string | null;
  payment_status: PaymentStatus;
  escrow_status: EscrowStatus;
  escrow_released_at: string | null;
  booking_status?: BookingStatus | null;
  event_location?: string | null;
  provider_action?: string | null;
  customer_confirmed?: boolean;
  dispute_flagged?: boolean;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  village?: string | null;
  created_at: string;
  service?: Service;
  customer?: Profile;
};

export type MenuItem = {
  id: string;
  service_id: string;
  provider_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_veg: boolean;
  image_url: string | null;
  sort_order: number;
  available: boolean;
  created_at: string;
};

export type BookingMenuSelection = {
  id: string;
  booking_id: string;
  menu_item_id: string;
  user_id: string;
  quantity: number;
  created_at: string;
  menu_item?: MenuItem;
};

export type ServiceFavorite = {
  id: string;
  user_id: string;
  service_id: string;
  created_at: string;
  service?: Service;
};

export type Review = {
  id: string;
  service_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type Reel = {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  profile?: Profile;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
  view_count?: number;
  viewed_by_me?: boolean;
};

export type ReelComment = {
  id: string;
  reel_id: string;
  user_id: string;
  comment: string;
  image_path?: string | null;
  image_url?: string | null;
  sticker?: string | null;
  created_at: string;
  profile?: Profile;
};

export type Follow = {
  id: string;
  follower_id: string;
  followee_id: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'follow' | 'like' | 'comment' | 'booking' | 'message' | 'reel';
  entity_id: string | null;
  entity_type: string | null;
  message: string;
  read: boolean;
  created_at: string;
  actor?: Profile;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type WalletTransactionType = 'credit' | 'debit';
export type WalletTransactionSource =
  | 'booking_payout' | 'refund' | 'topup' | 'withdrawal' | 'referral_bonus' | 'adjustment';

export type WalletTransaction = {
  id: string;
  wallet_id: string;
  user_id: string;
  type: WalletTransactionType;
  amount: number;
  source: WalletTransactionSource;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
};

export const WALLET_SOURCE_LABELS: Record<WalletTransactionSource, string> = {
  booking_payout: 'Booking Payout',
  refund: 'Refund',
  topup: 'Top-up',
  withdrawal: 'Withdrawal',
  referral_bonus: 'Referral Bonus',
  adjustment: 'Adjustment',
};

export const SERVICE_TYPES: { value: ServiceType; label: string; icon: string }[] = [
  { value: 'function', label: 'Function', icon: 'PartyPopper' },
  { value: 'camera_studio', label: 'Camera Studio', icon: 'Video' },
  { value: 'catering', label: 'Catering Services', icon: 'UtensilsCrossed' },
  { value: 'workers', label: 'Workers', icon: 'Users' },
];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  function: 'Function',
  camera_studio: 'Camera Studio',
  catering: 'Catering Services',
  workers: 'Workers',
};

export const PRICE_UNITS: Record<string, string> = {
  per_hour: 'per hour',
  per_day: 'per day',
  per_event: 'per event',
  per_person: 'per person',
};

export const SERVICE_CATEGORIES: Record<ServiceType, { value: string; label: string }[]> = {
  function: [
    { value: 'Weddings', label: 'Weddings' },
    { value: 'Engagement Functions', label: 'Engagement Functions' },
    { value: 'Reception', label: 'Reception' },
    { value: 'Birthday Functions', label: 'Birthday Functions' },
    { value: 'Anniversary Functions', label: 'Anniversary Functions' },
    { value: 'Housewarming', label: 'Housewarming' },
    { value: 'Naming Ceremony', label: 'Naming Ceremony' },
    { value: 'Baby Shower', label: 'Baby Shower' },
    { value: 'Mehendi', label: 'Mehendi' },
    { value: 'Sangeet', label: 'Sangeet' },
    { value: 'Religious Functions', label: 'Religious Functions' },
    { value: 'Corporate Events', label: 'Corporate Events' },
    { value: 'School & College Events', label: 'School & College Events' },
  ],
  camera_studio: [
    { value: 'Wedding Photography', label: 'Wedding Photography' },
    { value: 'Wedding Videography', label: 'Wedding Videography' },
    { value: 'Candid Photography', label: 'Candid Photography' },
    { value: 'Traditional Photography', label: 'Traditional Photography' },
    { value: 'Pre-Wedding Shoot', label: 'Pre-Wedding Shoot' },
    { value: 'Engagement & Reception Photography', label: 'Engagement & Reception Photography' },
    { value: 'Birthday & Function Photography', label: 'Birthday & Function Photography' },
    { value: 'Drone Photography & Videography', label: 'Drone Photography & Videography' },
    { value: 'Live Streaming', label: 'Live Streaming' },
    { value: 'Photo & Video Editing', label: 'Photo & Video Editing' },
  ],
  catering: [
    { value: 'Wedding Catering', label: 'Wedding Catering' },
    { value: 'Function Catering', label: 'Function Catering' },
    { value: 'Birthday Catering', label: 'Birthday Catering' },
    { value: 'Corporate Catering', label: 'Corporate Catering' },
    { value: 'Traditional Catering', label: 'Traditional Catering' },
    { value: 'South Indian Catering', label: 'South Indian Catering' },
    { value: 'Andhra Catering', label: 'Andhra Catering' },
    { value: 'Vegetarian Catering', label: 'Vegetarian Catering' },
    { value: 'Non-Vegetarian Catering', label: 'Non-Vegetarian Catering' },
    { value: 'Biryani Catering', label: 'Biryani Catering' },
  ],
  workers: [
    { value: 'Decoration Workers', label: 'Decoration Workers' },
    { value: 'Stage Setup Workers', label: 'Stage Setup Workers' },
    { value: 'Lighting Workers', label: 'Lighting Workers' },
    { value: 'Sound System Workers', label: 'Sound System Workers' },
    { value: 'DJ Services', label: 'DJ Services' },
    { value: 'Tables & Chairs Setup', label: 'Tables & Chairs Setup' },
    { value: 'Tent / Canopy Workers', label: 'Tent / Canopy Workers' },
    { value: 'Flower Decoration Workers', label: 'Flower Decoration Workers' },
    { value: 'Event Management Staff', label: 'Event Management Staff' },
    { value: 'Security & Stewards', label: 'Security & Stewards' },
  ],
};

export const FUNCTION_SUB_SERVICES = [
  'Decoration',
  'Function Hall',
  'Stage Setup',
  'Lighting',
  'Sound System',
  'DJ Services',
  'Tables & Chairs',
  'Tent / Canopy',
  'Flower Decoration',
  'Event Management',
];
