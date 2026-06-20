import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'The Leander Local Guide',
  description: 'Skip the chains. Find the spots that actually make Leander worth staying in.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
