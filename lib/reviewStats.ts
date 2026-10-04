// Single source for the review numbers shown across the site (home, about,
// LPs, room pages, footer, schema, llms.txt). Update here when the Google
// Business Profile count moves — never hard-code a number in a page again.
//
// Booking.com's score is deliberately NOT shown anywhere: it is lower than
// Google's (7.9 vs 4.6★ as of Oct 2026) and linking to the OTA from our own
// site sends direct-booking visitors to a cheaper OTA rate.

export const GOOGLE_RATING = '4.6';
export const GOOGLE_REVIEW_COUNT = 631; // GBP, checked 2026-10-04
