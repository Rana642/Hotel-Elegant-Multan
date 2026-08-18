// Browser-local record of a booking the guest STARTED but hasn't finished.
// Written when they search dates or touch the booking form; read by the
// "Continue your booking" popup so we can offer to resume; cleared when a
// booking completes (thank-you page) or the guest dismisses the prompt.
//
// Lives in localStorage (survives tab close, unlike sessionStorage). A custom
// `he:booking-intent` event is dispatched on every write/clear so the popup
// updates live within the same tab (the native `storage` event only fires in
// OTHER tabs).

export interface BookingIntent {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomId?: string;
  roomName?: string;
  /** Epoch ms of last update — used to expire stale intents. */
  ts: number;
}

const KEY = 'he_booking_intent';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const BOOKING_INTENT_EVENT = 'he:booking-intent';

export function saveBookingIntent(intent: Omit<BookingIntent, 'ts'>): void {
  if (typeof window === 'undefined') return;
  if (!intent.checkIn || !intent.checkOut || intent.checkOut <= intent.checkIn) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, ts: Date.now() }));
    window.dispatchEvent(new Event(BOOKING_INTENT_EVENT));
  } catch {
    /* storage unavailable (private mode / quota) — non-critical */
  }
}

export function readBookingIntent(): BookingIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as BookingIntent;
    if (!p || !p.checkIn || !p.checkOut) return null;
    if (Date.now() - (p.ts || 0) > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearBookingIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(BOOKING_INTENT_EVENT));
  } catch {
    /* non-critical */
  }
}
