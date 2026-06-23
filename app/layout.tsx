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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${caveat.variable} ${bebas.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
