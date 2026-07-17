# Image Replacement Guide

## ✅ What's Been Done

1. **About Page** — Fake Unsplash image replaced with `/Hotel Front.jpg`
2. **Created SQL Migration** — Ready to update database with all original images
3. **Identified All Room Images** — Mapped to your uploaded images in `/public`

## 📋 Image Mapping

Your uploaded images have been mapped to rooms as follows:

### Executive King Suite
- `/Executive King 1.jpg` (featured)
- `/Executive King 2.jpg`
- `/Executive King 3.jpg`
- `/Executive King 4.jpg`
- `/Executive King 5.jpg`
- `/Executive King 6.jpg`

### Family Suite
- `/Family Suite 1.jpg` (featured)
- `/Family Suite 2.jpg`
- `/Family Suite 3.jpg`

### Junior Suite
- `/Junior Suite 1.jpg` (featured)
- `/Junior Suite 2.jpg`
- `/Junior Suite 3.jpg`
- `/Junior Suite 4.jpg`

### Presidential Suite
- `/Presidential Suite 1.jpg` (featured)
- `/Presidential Suite 2.jpg`
- `/Presidential Suite 3.jpg`

### Triple Sharing
- `/Triple Sharing 1.jpg` (featured)
- `/Triple Sharing 2.jpg`

### Special Areas
- `/Buffet Area.jpg`
- `/Dinning Area.jpg`
- `/Hotel Front.jpg`

## 🔄 How to Update Database

### Step 1: Open Supabase Console
1. Go to [supabase.com](https://supabase.com) and log in
2. Open your Hotel Elegant project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration Script
1. Click **New Query** button
2. Open the file: `supabase/update-images.sql`
3. Copy ALL the SQL code
4. Paste it into the Supabase SQL Editor
5. Click **Run** button

### Step 3: Verify the Changes
After running the script, you should see a success message. You can verify by:

```sql
-- Check how many room images exist
SELECT COUNT(*) FROM room_images;

-- See images for a specific room
SELECT * FROM room_images 
WHERE room_id = (SELECT id FROM rooms WHERE slug = 'executive-king')
ORDER BY sort_order;
```

## 🏠 What Remains (Hero Image)

The **home page hero section** still uses a fallback Unsplash image:
- File: `app/(public)/page.tsx` (line 116)
- To update it later, you can:
  - Upload a video to Supabase Storage and update `hero_video_url` in the content table
  - OR replace with `/Hotel Front.jpg` when ready

Current code:
```typescript
const heroPoster = 
  content.hero_poster_url || 
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=80';
```

## ✨ After Update

Once you run the SQL script:
1. ✅ All room detail pages will show your real photos
2. ✅ Gallery page will display all room images
3. ✅ Room cards on homepage will show your photos
4. ✅ About page already shows Hotel Front photo

## ❓ Troubleshooting

**If images don't appear after update:**
1. Clear browser cache (Ctrl+Shift+Del)
2. Restart dev server: `npm run dev`
3. Verify room slugs match: Go to Supabase → rooms table
4. Check that file names match exactly (case-sensitive)

**If you need to rollback:**
Run this to delete all room images:
```sql
DELETE FROM room_images;
```

Then re-run the update script.

## 📞 Next Steps

After updating the database:
1. Run dev server: `npm run dev`
2. Visit: http://localhost:3000
3. Check `/rooms` to see updated images
4. Check individual room pages
5. Visit `/gallery` to see all photos
6. Push changes to GitHub when satisfied

```bash
git add -A
git commit -m "Replace fake Unsplash images with original hotel photos"
git push origin main
```
