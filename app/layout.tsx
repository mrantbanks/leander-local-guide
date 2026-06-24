import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';
import { fraunces, hanken, caveat, bebas } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://leanderlocalguide.com'),
  title: {
    default: 'The Leander Local Guide · Leander, TX food scene',
    template: '%s · The Leander Local Guide',
  },
  description:
    'A guide to Leander, Texas and its local food scene. By a local, for locals: the hidden gems, the bar where everybody knows your name, and the one dish worth the drive.',
};

const siteLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://leanderlocalguide.com/#website',
      url: 'https://leanderlocalguide.com/',
      name: 'The Leander Local Guide',
      description: 'A guide to Leander, Texas and its local food scene.',
      publisher: { '@id': 'https://leanderlocalguide.com/#org' },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Organization',
      '@id': 'https://leanderlocalguide.com/#org',
      name: 'The Leander Local Guide',
      url: 'https://leanderlocalguide.com/',
      description: 'Honest, first-person reviews of every local restaurant, bar, cafe, brewery, bakery and food truck in Leander, Texas.',
      areaServed: { '@type': 'City', name: 'Leander', containedInPlace: { '@type': 'State', name: 'Texas' } },
      founder: { '@id': 'https://leanderlocalguide.com/about#anthony-martinez' },
      knowsAbout: ['Leander Texas restaurants', 'Leander food scene', 'local dining', 'tacos', 'BBQ', 'food trucks'],
    },
    {
      '@type': 'Person',
      '@id': 'https://leanderlocalguide.com/about#anthony-martinez',
      name: 'Anthony Martinez',
      url: 'https://leanderlocalguide.com/about',
      jobTitle: 'Local food critic, The Leander Local',
      worksFor: { '@id': 'https://leanderlocalguide.com/#org' },
      sameAs: ['https://www.linkedin.com/in/anthony-m-493b2691/'],
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${caveat.variable} ${bebas.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
