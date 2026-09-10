import { redirect } from 'next/navigation';

// Legacy route — the admin list is now the single source of truth
// (Silver-Sand-style inline editing). Old bookmarks land safely here.
export default function NewPromotionRedirect() {
  redirect('/admin/promotions');
}
