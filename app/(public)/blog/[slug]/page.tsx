import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowRight, Calendar } from 'lucide-react';
import { blogPosts, getPost } from '@/lib/blogPosts';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: { absolute: post.metaTitle },
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      modifiedTime: post.updated,
      images: [{ url: post.image, alt: post.imageAlt }],
    },
  };
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';
  const more = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <>
      {/* Hero */}
      <div className="relative h-[45vh] min-h-[320px] max-h-[520px] mt-16">
        <Image src={post.image} alt={post.imageAlt} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-[#1A0B2E]/60" />
        <div className="absolute inset-0 flex items-end">
          <div className="container-xl max-w-3xl pb-10">
            <p className="font-montserrat text-[#ff5a68] text-xs font-semibold tracking-widest uppercase mb-3">
              {post.category}
            </p>
            <h1 className="font-playfair font-semibold text-3xl md:text-4xl lg:text-5xl text-white leading-tight text-balance">
              {post.title}
            </h1>
          </div>
        </div>
      </div>

      <article className="container-xl py-14 max-w-3xl">
        {/* Breadcrumb + meta */}
        <nav className="flex items-center gap-2 text-xs font-montserrat text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#E30613]">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[#E30613]">Blog</Link>
          <span>/</span>
          <span className="text-[#1A0B2E] font-semibold truncate">{post.title}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-4 text-xs font-montserrat text-gray-400 mb-8 pb-8 border-b border-gray-100">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} /> Updated {fmt(post.updated)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> {post.readMins} min read
          </span>
          <span>By the Hotel Elegant team</span>
        </div>

        {/* Body */}
        <div className="space-y-6">
          {post.sections.map((s, i) => (
            <div key={i}>
              {s.heading && (
                <h2 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-3 mt-4">
                  {s.heading}
                </h2>
              )}
              {s.paragraphs?.map((p, j) => (
                <p key={j} className="font-montserrat text-[15px] text-gray-600 leading-relaxed mb-4">
                  {p}
                </p>
              ))}
              {s.list && (
                <ul className="space-y-2 mb-4">
                  {s.list.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E30613] mt-2 shrink-0" />
                      <span className="font-montserrat text-[15px] text-gray-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        {post.faqs.length > 0 && (
          <div className="mt-12">
            <h2 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {post.faqs.map((f) => (
                <div key={f.q} className="border border-gray-100 p-5">
                  <h3 className="font-montserrat font-semibold text-sm text-[#1A0B2E] mb-2">{f.q}</h3>
                  <p className="font-montserrat text-sm text-gray-600 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Internal links / CTA */}
        <div className="mt-12 p-6 bg-[#1A0B2E]/5 border-l-2 border-[#E30613]">
          <p className="font-montserrat font-semibold text-sm text-[#1A0B2E] mb-3 tracking-wide uppercase">
            Plan your stay
          </p>
          <ul className="space-y-2">
            {post.related.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="font-montserrat text-sm text-[#E30613] hover:underline flex items-center gap-1.5"
                >
                  <ArrowRight size={13} /> {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </article>

      {/* More posts */}
      {more.length > 0 && (
        <section className="section-pad bg-[#1A0B2E]/[0.03] border-t border-gray-100">
          <div className="container-xl max-w-4xl">
            <h2 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8 text-center">
              More from the Blog
            </h2>
            <div className="grid sm:grid-cols-2 gap-8">
              {more.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group bg-white border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={p.image}
                      alt={p.imageAlt}
                      fill
                      sizes="400px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-playfair font-semibold text-lg text-[#1A0B2E] group-hover:text-[#E30613] transition-colors leading-snug">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Article + FAQ + Breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            image: `${siteUrl}${encodeURI(post.image)}`,
            datePublished: post.published,
            dateModified: post.updated,
            author: { '@type': 'Organization', name: 'Hotel Elegant Executive Suites' },
            publisher: {
              '@type': 'Organization',
              name: 'Hotel Elegant Executive Suites',
              logo: { '@type': 'ImageObject', url: `${siteUrl}/icons/icon-512.png` },
            },
            mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
          }),
        }}
      />
      {post.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: post.faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
              { '@type': 'ListItem', position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
            ],
          }),
        }}
      />
    </>
  );
}
