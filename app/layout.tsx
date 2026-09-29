import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { I18nProvider } from '../lib/i18n';

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
    <html lang="az" className="dark">
      <body className="min-h-screen flex flex-col bg-[#080D16] text-slate-100 antialiased selection:bg-[#3B82F6] selection:text-white">
        <I18nProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 py-6">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
