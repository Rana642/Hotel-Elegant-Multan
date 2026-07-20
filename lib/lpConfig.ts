// Configuration for the paid-traffic landing pages under /lp/*.
//
// These pages are DELIBERATELY independent of the Supabase DB: ad traffic must
// load fast and never render an empty page if the DB is briefly unreachable, so
// room data here is static (grounded in the real hotel data + prices). The
// existing SEO pages under /rooms/* remain DB-driven and untouched.

export interface LpRoom {
  slug: string;
  name: string;
  image: string;
  imageAlt: string;
  price: number; // regular price (PKR)
  offer: number | null; // effective/charged price when on offer
  size: string;
  occupancy: string;
  view: string;
  amenities: string[];
}

export type LpVariantKey = 'book' | 'family' | 'business' | 'premium';

export interface LpVariant {
  key: LpVariantKey;
  /** Default H1 (keyword-first). Overridable via a sanitized ?kw= param. */
  h1: string;
  /** Eyebrow line above the H1. */
  eyebrow: string;
  /** Hero background image. */
  heroImage: string;
  heroAlt: string;
  /** 'all' → carousel of every room; otherwise a single featured room slug. */
  featured: 'all' | string;
  /** Page <title> / meta description. */
  metaTitle: string;
  metaDescription: string;
}

// ── Static room data (real photos already in /public) ──────────────────────
export const LP_ROOMS: Record<string, LpRoom> = {
  'executive-king': {
    slug: 'executive-king',
    name: 'Executive King',
    image: '/Executive King 1.jpg',
    imageAlt: 'Executive King room at Hotel Elegant Executive Suites Multan',
    price: 8500,
    offer: 7695,
    size: '345 sq ft',
    occupancy: '2 Adults',
    view: 'City View',
    amenities: ['Soundproof', 'Work Desk', 'Free WiFi', 'Ensuite'],
  },
  'family-suite': {
    slug: 'family-suite',
    name: 'Family Suite',
    image: '/Family Suite 1.jpg',
    imageAlt: 'Spacious Family Suite at Hotel Elegant Executive Suites Multan',
    price: 12000,
    offer: 11115,
    size: '525 sq ft',
    occupancy: '4 Adults +1 Child',
    view: 'Separate Living Area',
    amenities: ['Living Area', 'Free Breakfast', 'Free WiFi', 'Extra Beds'],
  },
  'presidential-suite': {
    slug: 'presidential-suite',
    name: 'Presidential Suite',
    image: '/Presidential Suite 1.jpg',
    imageAlt: 'Presidential Suite at Hotel Elegant Executive Suites Multan',
    price: 15200,
    offer: 13680,
    size: '525 sq ft',
    occupancy: '3 Adults',
    view: 'Private Lounge & Dining',
    amenities: ['Private Lounge', 'Minibar', 'Smart TV', 'Room Service'],
  },
  'junior-suite': {
    slug: 'junior-suite',
    name: 'Junior Suite',
    image: '/Junior Suite 1.jpg',
    imageAlt: 'Junior Suite at Hotel Elegant Executive Suites Multan',
    price: 9500,
    offer: null,
    size: '505 sq ft',
    occupancy: '2 Adults +1 Child',
    view: 'Seating Area',
    amenities: ['Seating Area', 'Soundproof', 'Free WiFi', 'Ensuite'],
  },
  'triple-sharing': {
    slug: 'triple-sharing',
    name: 'Triple Sharing',
    image: '/Triple Sharing 1.jpg',
    imageAlt: 'Triple Sharing room at Hotel Elegant Executive Suites Multan',
    price: 8500,
    offer: null,
    size: '270 sq ft',
    occupancy: '3 Adults',
    view: 'City View',
    amenities: ['AC', 'Smart TV', 'Free WiFi', 'Ensuite'],
  },
};

/** Order used for the /lp/book carousel. */
export const LP_ROOM_ORDER = [
  'executive-king',
  'family-suite',
  'presidential-suite',
  'junior-suite',
  'triple-sharing',
];

export const LP_ALL_ROOMS: LpRoom[] = LP_ROOM_ORDER.map((s) => LP_ROOMS[s]);

// ── Variant configs ────────────────────────────────────────────────────────
export const LP_VARIANTS: Record<LpVariantKey, LpVariant> = {
  book: {
    key: 'book',
    h1: 'Hotel Room in Multan — Book Direct',
    eyebrow: 'Gulgasht Colony · Multan, Pakistan',
    heroImage: '/hero-poster.jpg',
    heroAlt: 'Hotel Elegant Executive Suites Multan',
    featured: 'all',
    metaTitle: 'Hotel Room in Multan — Book Direct | Hotel Elegant',
    metaDescription:
      'Book a hotel room in Multan direct — best rate, no advance payment. 4.4★ from 238 guests. Free breakfast, WiFi & parking. Confirm on WhatsApp.',
  },
  family: {
    key: 'family',
    h1: 'Family Hotel in Multan',
    eyebrow: 'Spacious Family Suites · Gulgasht, Multan',
    heroImage: '/Family Suite 1.jpg',
    heroAlt: 'Family Suite at Hotel Elegant Executive Suites Multan',
    featured: 'family-suite',
    metaTitle: 'Family Hotel in Multan — Spacious Family Suite | Hotel Elegant',
    metaDescription:
      'Family hotel in Multan with a spacious 525 sq ft Family Suite, separate living area, free breakfast & safe parking. No advance payment. Book on WhatsApp.',
  },
  business: {
    key: 'business',
    h1: 'Business Hotel in Multan — Near the Airport',
    eyebrow: '~7 km from Multan Airport · Gulgasht',
    heroImage: '/Executive King 1.jpg',
    heroAlt: 'Executive King business room at Hotel Elegant Executive Suites Multan',
    featured: 'executive-king',
    metaTitle: 'Business Hotel in Multan Near the Airport | Hotel Elegant',
    metaDescription:
      'Business hotel in Multan ~7 km from the airport. Soundproof Executive King with work desk & fast WiFi. 24/7 reception, best direct rate. Book on WhatsApp.',
  },
  premium: {
    key: 'premium',
    h1: "Multan's Top-Rated Boutique Hotel",
    eyebrow: 'Premium Suites · Gulgasht, Multan',
    heroImage: '/Presidential Suite 1.jpg',
    heroAlt: 'Presidential Suite at Hotel Elegant Executive Suites Multan',
    featured: 'presidential-suite',
    metaTitle: "Multan's Top-Rated Boutique Hotel | Hotel Elegant",
    metaDescription:
      "Multan's top-rated boutique hotel — premium Presidential & Executive suites in Gulgasht. 4.4★ from 238 guests. Best direct rate, confirm on WhatsApp.",
  },
};

// ── Shared page content (reused across all variants) ───────────────────────
export const LP_TRUST = [
  '4.4★ Google (238 reviews)',
  '8.0 Booking.com',
  'Free Parking',
  'Free WiFi',
  '24/7 Reception',
];

export const LP_COMPARISON_LEFT = [
  'Room not found on arrival — re-booked at a higher rate',
  'Bill higher than the online rate + surprise charges',
  'Advertised amenities missing or sub-standard',
  'Cleanliness & hot-water complaints common',
  'Slow support through third-party channels',
];

export const LP_COMPARISON_RIGHT = [
  'A real person confirms your room on WhatsApp before you arrive',
  'Best direct rate — clear pricing, no hidden fees',
  'Verified AC, soundproofing & ensuite in every room',
  'Praised for cleanliness in 238 reviews · 4.4★ on Google',
  '24/7 reception — instant WhatsApp response',
];

export const LP_REVIEWS = [
  {
    name: 'Fareed Ul Haq',
    rating: 5,
    text: 'Excellent stay. The room was spotless, staff were welcoming and the location in Gulgasht is very convenient. Highly recommended.',
  },
  {
    name: 'Ahmad Jutt',
    rating: 5,
    text: 'Clean, quiet and great value. The breakfast was good and check-in was smooth. Will definitely stay again on my next Multan trip.',
  },
  {
    name: 'Ali Anwar',
    rating: 4,
    text: 'Comfortable rooms and friendly reception. Confirming on WhatsApp was quick and easy. Good option for a business stay in Multan.',
  },
];

export const LP_FAQS = [
  {
    q: 'Do I need to pay in advance to book?',
    a: 'No — we require no advance payment. Send a booking request, we confirm via WhatsApp or call, and you pay at the hotel (Visa, Mastercard or Cash).',
  },
  {
    q: 'What are the check-in and check-out times?',
    a: 'Check-in is available 24 hours a day — arrive any time. Check-out is by 12:00 noon.',
  },
  {
    q: 'Is parking and WiFi free?',
    a: 'Yes — free private parking and free high-speed WiFi in all areas of the hotel.',
  },
  {
    q: 'Can children stay? What about extra beds?',
    a: 'Children aged 10 and above are welcome. An extra bed is PKR 2,500 per person per night.',
  },
  {
    q: 'Do you offer long stays or corporate rates?',
    a: 'Yes — stays from 1 to 90 nights, with corporate and monthly packages. Contact us on WhatsApp for a custom quote.',
  },
];

export const LP_NEARBY = [
  { name: 'Metro Bus & main-road transport', distance: 'Under 1 km' },
  { name: 'Food courts, restaurants & outlets', distance: 'Walking distance' },
  { name: 'Multan Cricket Stadium', distance: '~3 km' },
  { name: 'Multan International Airport', distance: '~7 km' },
  { name: 'Nishtar Hospital / medical district', distance: 'Short drive' },
  { name: 'Shah Rukn-e-Alam Tomb & Old City', distance: 'Short drive' },
];

// ── Constants ──────────────────────────────────────────────────────────────
export const HOTEL_PHONE_DISPLAY = '0317-333-0998';
export const HOTEL_TEL = 'tel:+923173330998';
export const HOTEL_WHATSAPP_NUMBER = '923173330998';
export const HOTEL_WHATSAPP_TEXT =
  "Hi, I'd like to book a room at Hotel Elegant";
export const HOTEL_WHATSAPP_LINK = `https://wa.me/${HOTEL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  HOTEL_WHATSAPP_TEXT
)}`;
export const HOTEL_ADDRESS = '77-A Gulgasht Colony, Multan';
export const BOOKING_COM_URL =
  'https://www.booking.com/hotel/pk/elegant-exective-suite.es.html';

// ── ?kw= dynamic-headline sanitizer ────────────────────────────────────────
// Google Quality Score improves when the H1 echoes the searched term. We only
// ever allow a headline built from a fixed vocabulary of safe hotel words, and
// the sanitizer strips everything except letters/spaces first — so no raw user
// input (and certainly no markup) can ever reach the DOM.
const KW_ALLOWED_WORDS = new Set([
  'hotel', 'hotels', 'room', 'rooms', 'in', 'near', 'the', 'a', 'for', 'and',
  'with', 'multan', 'gulgasht', 'colony', 'city', 'cantt', 'family', 'families',
  'business', 'corporate', 'airport', 'nishtar', 'hospital', 'cricket',
  'stadium', 'five', '5', 'star', 'best', 'top', 'rated', 'luxury', 'boutique',
  'booking', 'book', 'online', 'direct', 'cheap', 'affordable', 'executive',
  'suite', 'suites', 'presidential', 'junior', 'triple', 'sharing', 'king',
  'elegant', 'pakistan', 'punjab', 'stay', 'accommodation', 'guest', 'house',
]);

const KW_MAX_WORDS = 8;

/**
 * Turn a raw ?kw= value into a safe headline, or return null to fall back to
 * the variant default. Only letters and spaces survive; every resulting word
 * must be in the allow-list, otherwise we reject the whole thing.
 */
export function sanitizeKw(raw: string | undefined): string | null {
  if (!raw) return null;
  // Decode +-encoded spaces, keep only letters/digits/spaces, collapse runs.
  const cleaned = raw
    .replace(/\+/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;

  const words = cleaned.split(' ');
  if (words.length === 0 || words.length > KW_MAX_WORDS) return null;
  if (!words.every((w) => KW_ALLOWED_WORDS.has(w))) return null;

  // Must actually be about a Multan hotel to be worth swapping in.
  if (!words.includes('multan')) return null;
  if (!words.some((w) => ['hotel', 'hotels', 'room', 'rooms', 'suite', 'suites'].includes(w)))
    return null;

  return words
    .map((w) => (w.length <= 2 && w !== '5' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
