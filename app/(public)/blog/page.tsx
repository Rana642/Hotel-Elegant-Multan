import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock } from 'lucide-react';
import { blogPosts } from '@/lib/blogPosts';

export const metadata: Metadata = {
  title: { absolute: 'Blog — Multan Travel Tips & Hotel Guides' },
  description:
    'Travel tips and local guides for Multan from Hotel Elegant Executive Suites — places to visit, family travel, business stays and more.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — Multan Travel Tips & Hotel Guides',
    images: [{ url: '/hero-poster.jpg', width: 1280, height: 720, alt: 'Hotel Elegant Executive Suites Multan' }],
  },
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function BlogPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';

  return (
    <>
      <section className="bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Insights &amp; Local Guides
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Multan Travel Tips &amp; Hotel Guides
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto">
            Local guides, travel tips and news from Hotel Elegant Executive Suites, Gulgasht, Multan.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-xl max-w-5xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.slug}
                className="group border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] overflow-hidden block">
                  <Image
                    src={post.image}
                    alt={post.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-0 bg-[#E30613] text-white text-[10px] font-montserrat font-semibold tracking-widest uppercase px-3 py-1">
                    {post.category}
                  </span>
                </Link>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-3 text-xs font-montserrat text-gray-400 mb-3">
                    <span>{fmt(post.published)}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {post.readMins} min read
                    </span>
                  </div>
                  <h2 className="font-playfair font-semibold text-lg text-[#1A0B2E] mb-2 leading-snug">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[#E30613] transition-colors">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="font-montserrat text-sm text-gray-500 leading-relaxed mb-4 flex-1">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-montserrat font-semibold text-sm text-[#E30613] hover:underline flex items-center gap-1.5"
                  >
                    Read more <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Hotel Elegant Multan Blog',
            url: `${siteUrl}/blog`,
            blogPost: blogPosts.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              url: `${siteUrl}/blog/${p.slug}`,
              datePublished: p.published,
              dateModified: p.updated,
              image: `${siteUrl}${encodeURI(p.image)}`,
            })),
          }),
        }}
      />
    </>
  );
}
