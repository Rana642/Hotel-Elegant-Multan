// Editorial / SEO content for room pages. Kept out of the DB because it is
// long-form marketing copy that changes rarely. Every fact here is grounded in
// the hotel's real Booking.com listing (8.4/10, 144 reviews) and Google
// profile (4.4★, 238 reviews) — no invented amenities or distances.

export interface RoomFaq {
  q: string;
  a: string;
}

export interface RoomEditorial {
  /** 2–3 sentence richer intro shown under the DB description */
  summary: string;
  /** Who the room suits — keyword-rich single line */
  idealFor: string;
  /** "Why book this room" bullets */
  highlights: string[];
  /** Room-specific FAQ (also emitted as FAQPage schema) */
  faqs: RoomFaq[];
}

export const roomContent: Record<string, RoomEditorial> = {
  'executive-king': {
    summary:
      "The Executive King is our signature room for business and solo travellers who want to work well and sleep better. Soundproofed walls keep the city out, a dedicated work desk keeps you productive, and premium bedding on a king-size bed makes the end of a long day easy. At 345 sq ft with a private ensuite, it is one of the most-booked rooms at Hotel Elegant Executive Suites in Gulgasht, Multan.",
    idealFor:
      'Best for business travellers, visiting professionals and couples staying in Gulgasht, Multan.',
    highlights: [
      'Soundproofed room for a quiet night on the main road',
      'Dedicated work desk with fast, free WiFi (rated 9.5 by guests)',
      'King-size premium bedding and a private ensuite bathroom',
      'Just ~7 km from Multan International Airport, with free airport shuttle',
      'Free private parking, 24-hour reception and room service',
    ],
    faqs: [
      {
        q: 'How many guests can stay in the Executive King room?',
        a: 'The Executive King comfortably sleeps 2 adults on one king-size bed. An extra bed can be added for PKR 2,500 per person per night on request.',
      },
      {
        q: 'Is the Executive King room good for business travellers?',
        a: 'Yes. It is purpose-built for work trips — a dedicated desk, soundproofing for quiet calls, fast free WiFi, and a location just 7 km from Multan International Airport with a free airport shuttle.',
      },
      {
        q: 'What is the price of the Executive King room in Multan?',
        a: 'The Executive King starts from PKR 8,500 per night (currently on offer). No advance payment is required — you pay at the hotel by card or cash.',
      },
    ],
  },

  'family-suite': {
    summary:
      "The Family Suite is our largest layout — a separate living area plus generous sleeping space, built for families who want to stay together comfortably. At 525 sq ft it sleeps up to four adults and a child, and can be interconnected for larger groups. Guests on Booking.com repeatedly recommend Hotel Elegant for families, calling the rooms spacious and the environment quiet and homely.",
    idealFor:
      'Best for families and large families visiting Multan who want space to relax together.',
    highlights: [
      'Separate living area — room to unwind beyond the bedroom',
      'Sleeps up to 4 adults + 1 child; interconnecting option for big families',
      'Complimentary buffet breakfast (Halal, continental & Asian)',
      'Free private parking and a safe, family-friendly environment',
      'Praised in guest reviews as ideal for large families',
    ],
    faqs: [
      {
        q: 'Is the Family Suite good for large families?',
        a: 'Yes — it is our most spacious room at 525 sq ft with a separate living area, sleeps 4 adults plus a child, and can be interconnected with an adjoining room for larger families. Guests on Booking.com specifically recommend it for large families.',
      },
      {
        q: 'How many people can stay in the Family Suite?',
        a: 'Up to 4 adults and 1 child. Additional extra beds are available at PKR 2,500 per person per night, subject to availability.',
      },
      {
        q: 'Is breakfast included with the Family Suite?',
        a: 'Yes, a complimentary breakfast buffet is included for all guests — with Halal, continental and Asian options that guests rate highly.',
      },
    ],
  },

  'presidential-suite': {
    summary:
      "The Presidential Suite is our finest accommodation — generous living quarters with a private dining area, a separate lounge and premium finishes. Designed for VIP guests, delegations and families who want the best, it pairs a comfortable bedroom with a spacious sitting and dining space. It reflects why Hotel Elegant scores 9.0/10 for location and is a favourite for special stays in Gulgasht, Multan.",
    idealFor:
      'Best for VIP guests, corporate delegations and families wanting Multan\'s most spacious suite.',
    highlights: [
      'Private dining area and separate lounge — entertain in-suite',
      'Premium finishes throughout our most exclusive layout',
      'Ideal for delegations, VIPs and special-occasion stays',
      'Free WiFi, minibar, smart TV and 24-hour room service',
      'Central Gulgasht location rated 9.0/10 by recent guests',
    ],
    faqs: [
      {
        q: 'What makes the Presidential Suite different from other rooms?',
        a: 'It is our most premium accommodation, with a private dining area, a separate lounge, and upgraded finishes — designed for VIP guests, delegations and special occasions rather than a standard overnight stay.',
      },
      {
        q: 'Is the Presidential Suite suitable for corporate delegations?',
        a: 'Yes. The separate lounge and private dining area make it well suited to hosting meetings or entertaining guests in-suite, with 24-hour room service and fast free WiFi throughout.',
      },
      {
        q: 'What is the price of the Presidential Suite in Multan?',
        a: 'The Presidential Suite starts from PKR 15,200 per night (currently on offer). No advance payment is required — pay at the hotel by card or cash.',
      },
    ],
  },

  'junior-suite': {
    summary:
      "The Junior Suite gives you a refined room with a comfortable sitting area and modern comfort — a step up from a standard room without the size of a full suite. Soundproofed and thoughtfully finished, it is ideal for couples who want extra space or a small family. It's a well-priced way to enjoy the clean, quiet, home-like stay Hotel Elegant is known for in Gulgasht, Multan.",
    idealFor:
      'Best for couples and small families who want a little extra space in Multan.',
    highlights: [
      'Separate seating area for extra room to relax',
      'Soundproofed for a quiet, restful stay',
      'Sleeps 2 adults + 1 child comfortably',
      'Complimentary breakfast, free WiFi and free parking',
      'Excellent value — guests praise the comfort and cleanliness',
    ],
    faqs: [
      {
        q: 'Who is the Junior Suite best for?',
        a: 'Couples who want extra space and small families. It offers a separate sitting area and soundproofing, sleeping 2 adults and 1 child comfortably.',
      },
      {
        q: 'Is the Junior Suite soundproofed?',
        a: 'Yes — like our Executive King, the Junior Suite is soundproofed, which guests value on our main-road location for a quiet, restful night.',
      },
      {
        q: 'What is the price of the Junior Suite in Multan?',
        a: 'The Junior Suite starts from PKR 9,500 per night (currently on offer). No advance payment — you pay at the hotel.',
      },
    ],
  },

  'triple-sharing': {
    summary:
      "The Triple Sharing room is our best-value option for three guests travelling together — colleagues on a work trip, friends on a weekend, or a small group exploring Multan. It keeps the essentials that matter: air conditioning, a private ensuite bathroom, a smart TV and fast free WiFi, at a price that is hard to beat. Guests consistently highlight excellent value for money at Hotel Elegant.",
    idealFor:
      'Best for three colleagues, friends or a small group wanting a budget-friendly hotel in Multan.',
    highlights: [
      'Comfortably sleeps 3 guests — great for groups and colleagues',
      'Private ensuite bathroom with shower',
      'Air conditioning, smart TV and fast free WiFi',
      'Complimentary breakfast and free private parking included',
      'Outstanding value — one of our most economical rooms',
    ],
    faqs: [
      {
        q: 'How many people can stay in the Triple Sharing room?',
        a: 'The Triple Sharing room comfortably accommodates 3 guests, making it ideal for colleagues or friends travelling together.',
      },
      {
        q: 'Is the Triple Sharing room good value?',
        a: 'Yes — it is one of our most economical rooms and includes air conditioning, a private ensuite, smart TV, free WiFi and complimentary breakfast. Guests on Booking.com regularly rate Hotel Elegant highly for value for money.',
      },
      {
        q: 'What is the price of the Triple Sharing room in Multan?',
        a: 'The Triple Sharing room starts from PKR 8,500 per night (currently on offer) for three guests. No advance payment is required.',
      },
    ],
  },
};

/** Verified nearby places. Transport/eatery distances are from the hotel's
 *  Booking.com listing; landmark distances are approximate ("~"). */
export const NEARBY_PLACES: { name: string; distance: string; type: string }[] = [
  { name: 'Metro Bus & main-road transport', distance: 'Under 1 km', type: 'Transport' },
  { name: 'Food courts, restaurants & brand outlets', distance: 'Walking distance', type: 'Dining & Shopping' },
  { name: 'Multan Cricket Stadium', distance: '~3 km', type: 'Landmark' },
  { name: 'City Railway Station', distance: '5 km', type: 'Transport' },
  { name: 'Multan Cantt Railway Station', distance: '6 km', type: 'Transport' },
  { name: 'Multan International Airport', distance: '~7 km', type: 'Airport' },
  { name: 'Shah Rukn-e-Alam Tomb & Old City', distance: 'Short drive', type: 'Attraction' },
];

/** Quick facts shown as an answer-engine-friendly table on every room page. */
export const HOTEL_QUICK_FACTS: { label: string; value: string }[] = [
  { label: 'Check-in', value: 'Available 24 hours' },
  { label: 'Check-out', value: 'By 12:00 noon' },
  { label: 'Breakfast', value: 'Included — buffet (Halal, continental, Asian)' },
  { label: 'Parking', value: 'Free private parking on site' },
  { label: 'WiFi', value: 'Free in all areas (rated 9.5/10)' },
  { label: 'Airport shuttle', value: 'Available — airport ~7 km' },
  { label: 'Payment', value: 'Pay at hotel — Visa, Mastercard or cash' },
  { label: 'Advance payment', value: 'None required to book' },
];
