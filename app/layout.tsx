import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { I18nProvider } from '../lib/i18n';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BHOS Table Tennis Club | Baku Higher Oil School',
  description:
    'Official table tennis management and ELO ranking portal for Baku Higher Oil School (BHOS) students, coaches, and athletes. Inspired by tabletennis.az.',
  keywords: [
    'BHOS',
    'Baku Higher Oil School',
    'Table Tennis',
    'BANM',
    'tabletennis.az',
    'ELO Rating',
    'Tournament Bracket',
    'Table Reservation',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`dark ${outfit.variable}`}>
      <body className={`${outfit.className} font-sans min-h-screen flex flex-col bg-[#0A192F] text-slate-100 antialiased selection:bg-bhos-cyan selection:text-bhos-navy`}>
        <I18nProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
