export interface Room {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  size_sqft: number | null;
  max_adults: number;
  max_children: number;
  view: string | null;
  price_per_night: number | null;
  offer_price: number | null;
  amenities: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  room_images?: RoomImage[];
}

export interface RoomImage {
  id: string;
  room_id: string;
  url: string;
  alt: string | null;
  is_featured: boolean;
  sort_order: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
export type BookingSource = 'website' | 'walkin' | 'phone' | 'ota';

export interface Booking {
  id: string;
  booking_ref: string;
  room_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  extra_beds: number;
  nights: number;
  room_total: number;
  extra_bed_total: number;
  grand_total: number;
  special_request: string | null;
  status: BookingStatus;
  source: BookingSource;
  created_at: string;
  rooms?: Room;
}

export interface AvailabilityBlock {
  id: string;
  room_id: string;
  date: string;
  reason: 'booking' | 'maintenance' | 'walkin';
  booking_id: string | null;
}

export interface ContentItem {
  key: string;
  value: string | null;
  updated_at: string;
}

export interface Testimonial {
  name: string;
  rating: number;
  text: string;
}

export interface Stat {
  label: string;
  value: string;
}

export interface BookingFormData {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  extraBeds: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequest: string;
  roomId: string;
}
