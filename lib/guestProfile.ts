// Small localStorage-backed profile the guest builds up as they submit
// forms on the site. Purpose: kill the "fill your name/phone/email again"
// friction on the second interaction. First contact form / booking populates
// the store; every subsequent modal + form pre-fills its fields from it.
//
// Not synced with the server (no login model here — the site is pay-at-
// hotel, no accounts), so this is purely a browser-local convenience. If
// the guest clears storage or opens an incognito window, the forms are
// blank again — same as before. Nothing sensitive stored (no CNIC,
// payment, etc.) so the browser-local model is fine.
//
// Version tag on the key so if we ever change the shape (add a field,
// rename one), old stored profiles are transparently discarded instead of
// crashing the reader.

const KEY = 'he_guest_profile_v1';

export interface GuestProfile {
  name?: string;
  phone?: string;
  email?: string;
}

/** Read the saved profile, or an empty object if nothing / bad JSON /
 *  running server-side. Never throws — caller can spread the result into
 *  useState defaults without guard. */
export function readGuestProfile(): GuestProfile {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    // Whitelist known fields — defends against a stale future-version blob.
    return {
      name:  typeof parsed.name  === 'string' ? parsed.name  : undefined,
      phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
    };
  } catch {
    return {};
  }
}

/** Merge new values into the stored profile — never wipes an existing
 *  field with an empty string, so a form that only captures name doesn't
 *  discard a previously-saved phone/email. Silently no-ops if storage is
 *  unavailable (Safari private mode, quota exceeded). */
export function saveGuestProfile(patch: GuestProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readGuestProfile();
    const merged: GuestProfile = {
      name:  (patch.name  && patch.name.trim())  || current.name,
      phone: (patch.phone && patch.phone.trim()) || current.phone,
      email: (patch.email && patch.email.trim()) || current.email,
    };
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* private mode / quota — silent */
  }
}
