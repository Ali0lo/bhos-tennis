import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PWARegistration from '../components/PWARegistration';
import { I18nProvider } from '../lib/i18n';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#080D16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'BANM Stolüstü Tennis Portalı',
  description: 'Rəsmi ITTF ELO Reytinqi və Liqa Sistemi',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BANM TT',
  },
  keywords: [
    'BHOS',
    'Baku Higher Oil School',
    'Table Tennis',
    'BANM',
    'tabletennis.az',
    'ELO Rating',
    'Tournament Bracket',
  ],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} font-sans min-h-screen flex flex-col bg-[#0A192F] text-slate-100 antialiased selection:bg-bhos-cyan selection:text-bhos-navy`}>
        <I18nProvider>
          <PWARegistration />
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
