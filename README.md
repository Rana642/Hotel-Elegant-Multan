# Hotel Elegant Executive Suites — Website

Modern, dynamic hotel booking website for Hotel Elegant Executive Suites, Multan.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Resend · Framer Motion

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- A Supabase project (free tier works)
- (Optional) Resend account for emails

### 1. Clone & Install

```bash
git clone https://github.com/your-username/hotel-elegant-multan.git
cd hotel-elegant-multan
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxxxxxxxxxxx           # optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=923173330998
```

### 3. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Then run `supabase/seed.sql` to insert the 5 rooms and default content
4. Create an admin user:
   - In Supabase Dashboard → **Authentication** → **Users** → "Add user"
   - After creating, copy the user's UUID
   - Run in SQL editor: `INSERT INTO admin_users (id, email) VALUES ('YOUR-USER-UUID', 'your@email.com');`

### 4. Run Development Server

```bash
npm run dev
```

Visit:
- **Website:** http://localhost:3000
- **Admin:** http://localhost:3000/admin/login

---

## Project Structure

```
├── app/
│   ├── (public)/              # Public pages with Header+Footer layout
│   │   ├── page.tsx           # Home page
│   │   ├── rooms/             # Rooms list + [slug] detail
│   │   ├── booking/           # Booking form
│   │   ├── thank-you/         # Booking confirmation
│   │   ├── about/
│   │   ├── contact/
│   │   ├── policy/
│   │   ├── gallery/
│   │   └── blog/
│   ├── admin/                 # Admin dashboard (auth-protected)
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── bookings/
│   │   ├── rooms/
│   │   ├── calendar/
│   │   ├── content/
│   │   ├── reports/
│   │   └── settings/
│   ├── actions/
│   │   └── booking.ts         # Server action: create booking (no double-booking)
│   ├── sitemap.ts             # Auto sitemap
│   └── robots.ts              # Robots.txt
├── components/                # Shared UI components
├── lib/                       # Supabase clients, utilities
├── types/                     # TypeScript types
├── supabase/
│   ├── schema.sql             # DB schema + RLS policies
│   └── seed.sql               # Room data + default content
├── .github/workflows/
│   └── deploy.yml             # GitHub Actions → Hostinger
├── next.config.ts             # output: 'standalone'
└── .env.example
```

---

## Supabase Setup Details

### Tables
| Table | Purpose |
|-------|---------|
| `rooms` | Room catalogue (name, price, amenities, active) |
| `room_images` | Multiple images per room |
| `bookings` | Guest bookings (pending → confirmed → ...) |
| `availability_blocks` | Date locks (prevent double-booking) |
| `content` | Editable hero, testimonials, about text |
| `settings` | Hotel info, contact, policies |
| `admin_users` | Maps Supabase Auth users to admin role |

### Row Level Security
- **Public:** can read `rooms`, `room_images`, `content`, `settings`, `availability_blocks`
- **Admins only:** can write all tables; can read `bookings`
- **Public booking inserts** go through a server action using the service role key (never exposed client-side)

---

## Booking Flow

1. Guest searches dates → available rooms listed (blocked dates filtered out)
2. Guest selects room → fills form (name, phone, email, extras)
3. Server action:
   - Checks for overlapping `availability_blocks` (prevents double-booking)
   - Creates `booking` record
   - Inserts `availability_blocks` for all nights
   - Sends email via Resend (guest + hotel)
4. Redirects to Thank You page with WhatsApp deep link

### No Double-Booking Guarantee
The availability check and block insert happen in sequence in the server action. If block insertion fails (race condition), the booking is deleted and the guest sees an error.

---

## Deployment — Hostinger Business (Node.js)

### Why Hostinger + Standalone?
`next.config.ts` sets `output: 'standalone'` which bundles everything needed to run the app with `node server.js` — no Vercel required.

### Step-by-Step

**1. Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hotel-elegant-multan.git
git push -u origin main
```

**2. Hostinger hPanel → Node.js App**
- Plan: Business (supports Node.js)
- Node version: 20.x
- App root: `/home/user/htdocs/elegant-suite.com`
- Startup file: `.next/standalone/server.js`
- Start command: `node .next/standalone/server.js`
- Port: 3000 (Hostinger maps to your domain automatically)

**3. Environment Variables in hPanel**
Add all variables from `.env.example` in hPanel → **Node.js** → **Environment Variables**:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL=https://elegant-suite.com
NEXT_PUBLIC_WHATSAPP_NUMBER=923173330998
```

**4. GitHub Auto-Deploy**
Add these secrets in GitHub → Settings → Secrets → Actions:
```
HOSTINGER_SSH_HOST      → your server IP
HOSTINGER_SSH_USER      → your Hostinger username
HOSTINGER_SSH_PASS      → your Hostinger password (or use SSH key)
HOSTINGER_SSH_PORT      → 22
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_WHATSAPP_NUMBER
RESEND_API_KEY
```

The `.github/workflows/deploy.yml` will build and deploy on every push to `main`.

**5. Domain & SSL**
- In Hostinger hPanel → **Domains**: point `elegant-suite.com` to your hosting
- Enable **Free SSL** (Let's Encrypt) in hPanel → **SSL**

**6. Supabase**
Supabase runs as a managed cloud database — no DB needed on Hostinger. Just connect via the env vars above.

### Alternative: SSG/ISR Fallback
If the Business plan's Node.js environment has memory constraints:
- All public pages (`/rooms`, `/about`, etc.) already use `revalidate = 3600` (ISR)
- Only `/admin` and `/booking` need dynamic SSR
- This keeps load manageable even on entry-level Node.js hosting

---

## Admin Dashboard

**Login:** `/admin/login` (Supabase Auth)

| Section | Features |
|---------|---------|
| Dashboard | Today's check-ins/outs, pending count, revenue, recent bookings |
| Bookings | Full list with search/filter, status management, WhatsApp link |
| Rooms | Add/edit/delete rooms, upload photos, set price |
| Availability | Per-room calendar, block/unblock dates, maintenance blocks |
| Content | Edit hero video/poster, heading, testimonials, dining text |
| Reports | Revenue by room, monthly breakdown |
| Settings | Hotel info, contact details, policy text |

---

## Email Notifications (Resend)

- Set `RESEND_API_KEY` in env
- On each booking: guest confirmation email + hotel notification email
- If `RESEND_API_KEY` is absent, emails are skipped gracefully — the booking still works

---

## SEO Features

- Per-page Metadata API (title, description, OG, Twitter cards)
- JSON-LD structured data: `Hotel`, `HotelRoom`, `FAQPage`, `BreadcrumbList`, `Organization`
- `aggregateRating 4.4 / 238` in schema (Google rich results)
- Auto `sitemap.xml` + `robots.txt`
- SSR/ISR for all public pages (indexed, fast)
- `next/image` with AVIF/WebP, lazy loading
- Canonical URLs, clean slugs, H1/H2 hierarchy

---

## Brand Colors

| Variable | Hex | Usage |
|---------|-----|-------|
| `--deep-purple` | `#1A0B2E` | Dark sections, footer, hero overlay |
| `--mid-purple` | `#2D1B5C` | Cards, amenity bands |
| `--red` | `#E30613` | All primary buttons, accents |
| `--soft-lavender` | `#C9BFE0` | Muted text on dark |
| `--pale-lavender` | `#EEEDFE` | Light section tints |
| `--whatsapp` | `#25D366` | WhatsApp buttons only |

---

## Contact

**Hotel Elegant Executive Suites**  
77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan  
📞 0317-333-0998 | ✉️ info@elegant-suite.com
