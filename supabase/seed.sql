-- ============================================================
-- Hotel Elegant Executive Suites — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- ============================================================
-- ROOMS (5 rooms as specified)
-- ============================================================
INSERT INTO rooms (slug, name, description, size_sqft, max_adults, max_children, view, price_per_night, amenities, sort_order) VALUES
(
  'executive-king',
  'Executive King',
  'A spacious king room for the business traveller — soundproof walls, a dedicated work desk, premium bedding and a private ensuite bathroom.',
  345, 2, 0, 'City View', 8500,
  ARRAY['AC','Soundproof','Work Desk','Smart TV','Free WiFi','Ensuite Bathroom','Tea/Coffee Maker','Minibar'],
  1
),
(
  'family-suite',
  'Family Suite',
  'Our largest layout with a separate living area — perfect for families staying together, with room to relax and unwind.',
  525, 4, 1, 'City View', 12000,
  ARRAY['Living Area','Interconnected','AC','Smart TV','Free WiFi','Ensuite Bathroom','Tea/Coffee Maker','Minibar'],
  2
),
(
  'presidential-suite',
  'Presidential Suite',
  'Our finest accommodation — generous living quarters with a private dining area and premium finishes, for VIP guests and delegations.',
  525, 3, 0, 'City View', 18000,
  ARRAY['Dining Area','Minibar','Lounge','AC','Smart TV','Free WiFi','Ensuite Bathroom','Tea/Coffee Maker'],
  3
),
(
  'junior-suite',
  'Junior Suite',
  'A refined suite with a comfortable sitting area and modern comfort — ideal for couples or a small family.',
  505, 2, 1, 'City View', 9500,
  ARRAY['Seating Area','AC','Soundproof','Smart TV','Free WiFi','Ensuite Bathroom','Tea/Coffee Maker','Minibar'],
  4
),
(
  'triple-sharing',
  'Triple Sharing',
  'A comfortable room for three — great value for colleagues or friends travelling together, with an ensuite bathroom.',
  270, 3, 0, 'City View', 7500,
  ARRAY['3 Guests','AC','Ensuite Bath','Smart TV','Free WiFi','Tea/Coffee Maker','Minibar'],
  5
);

-- ============================================================
-- ROOM IMAGES (placeholder Unsplash hotel images)
-- ============================================================
INSERT INTO room_images (room_id, url, alt, is_featured, sort_order) VALUES
-- Executive King
((SELECT id FROM rooms WHERE slug='executive-king'), 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80', 'Executive King room with king bed and city view', true, 1),
((SELECT id FROM rooms WHERE slug='executive-king'), 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80', 'Executive King work desk area', false, 2),
((SELECT id FROM rooms WHERE slug='executive-king'), 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=80', 'Executive King ensuite bathroom', false, 3),

-- Family Suite
((SELECT id FROM rooms WHERE slug='family-suite'), 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80', 'Family Suite living area with sofa', true, 1),
((SELECT id FROM rooms WHERE slug='family-suite'), 'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=1200&q=80', 'Family Suite bedroom', false, 2),
((SELECT id FROM rooms WHERE slug='family-suite'), 'https://images.unsplash.com/photo-1574643156929-51fa098b0394?w=1200&q=80', 'Family Suite bathroom', false, 3),

-- Presidential Suite
((SELECT id FROM rooms WHERE slug='presidential-suite'), 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80', 'Presidential Suite dining area', true, 1),
((SELECT id FROM rooms WHERE slug='presidential-suite'), 'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=1200&q=80', 'Presidential Suite lounge', false, 2),
((SELECT id FROM rooms WHERE slug='presidential-suite'), 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80', 'Presidential Suite premium bathroom', false, 3),

-- Junior Suite
((SELECT id FROM rooms WHERE slug='junior-suite'), 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80', 'Junior Suite with seating area', true, 1),
((SELECT id FROM rooms WHERE slug='junior-suite'), 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&q=80', 'Junior Suite bedroom detail', false, 2),
((SELECT id FROM rooms WHERE slug='junior-suite'), 'https://images.unsplash.com/photo-1606402179428-a57976d71fa4?w=1200&q=80', 'Junior Suite bathroom', false, 3),

-- Triple Sharing
((SELECT id FROM rooms WHERE slug='triple-sharing'), 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=1200&q=80', 'Triple Sharing room with three beds', true, 1),
((SELECT id FROM rooms WHERE slug='triple-sharing'), 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80', 'Triple Sharing room view', false, 2),
((SELECT id FROM rooms WHERE slug='triple-sharing'), 'https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=1200&q=80', 'Triple Sharing ensuite bathroom', false, 3);

-- ============================================================
-- CONTENT
-- ============================================================
INSERT INTO content (key, value) VALUES
('hero_video_url', ''),
('hero_poster_url', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=80'),
('hero_heading', 'Book Multan''s Top-Rated Executive Hotel'),
('hero_subheading', 'Stay in Comfort. Live in Elegance. — From PKR 7,500/night · No payment now'),
('dining_heading', 'Multi-Cuisine Buffet'),
('dining_text', 'Start your day with a complimentary breakfast buffet featuring local and continental favourites.'),
('about_story', 'Hotel Elegant Executive Suites opened in 2024 in the heart of Gulgasht Colony, Multan — bringing a new standard of executive hospitality to one of Pakistan''s most vibrant cities. Our boutique property combines warm Pakistani service with modern comfort, making it the preferred address for business travellers, families, and visiting delegations alike.'),
('stats_json', '[{"label":"Google Rating","value":"4.4★"},{"label":"Reviews","value":"238+"},{"label":"Booking.com","value":"8.0"},{"label":"Room Types","value":"5"}]'),
('testimonials_json', '[{"name":"Fareed Ul Haq","rating":5,"text":"Clean rooms, peaceful ambience, perfect location. Highly recommend Hotel Elegant Executive Suites Multan for business stays."},{"name":"Ahmad Jutt","rating":5,"text":"Cooperative staff, excellent service. Will definitely choose Hotel Elegant Executive Suites Multan again on my next visit."},{"name":"Ali Anwar","rating":5,"text":"Terrific cleaning staff and great breakfast. The rooms are well-maintained and the location in Gulgasht is very convenient."}]');

-- ============================================================
-- SETTINGS
-- ============================================================
INSERT INTO settings (key, value) VALUES
('hotel_name', 'Hotel Elegant Executive Suites Multan'),
('hotel_tagline', 'Stay in Comfort. Live in Elegance.'),
('hotel_address', '77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan'),
('hotel_phone', '0317-333-0998'),
('hotel_phone_e164', '+923173330998'),
('hotel_whatsapp', '923173330998'),
('hotel_email', 'info@elegant-suite.com'),
('notification_email', 'info@elegant-suite.com'),
('extra_bed_price', '2500'),
('checkin_time', '24 hours (any time)'),
('checkout_time', '12:00 noon'),
('cancellation_policy', 'Flexible — confirm changes or cancellations via WhatsApp or call at any time.'),
('children_policy', 'Children 10 years and above welcome. Extra bed PKR 2,500 per person per night. No cots available.'),
('payment_methods', 'Visa, Mastercard, Cash at hotel. No advance payment required to request a booking.'),
('parking_wifi', 'Free private parking and free WiFi throughout all areas of the hotel.'),
('pets_policy', 'Pets are not allowed on the premises.'),
('long_stay', 'Long stays from 1 to 90 nights. Corporate and monthly packages welcome.'),
('checkin_requirements', 'Guests must provide a valid address and phone number at check-in. No minimum age. No curfew.');
