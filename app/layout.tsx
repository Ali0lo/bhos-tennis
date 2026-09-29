import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { I18nProvider } from '../lib/i18n';

export const metadata: Metadata = {
  title: 'BHOS Official Table Tennis Club & Ranking Portal',
  description:
    'A home for every rally. Follow the campus rankings, find your table, and compete with the BHOS community.',
  keywords: [
    'BHOS',
    'Baku Higher Oil School',
    'Table Tennis',
    'BANM',
    'ELO Rating',
    'Tournament Bracket',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#0B0E14] text-[#F8FAFC] antialiased selection:bg-[#4E8FF7] selection:text-[#081226]">
        <I18nProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-[1060px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
