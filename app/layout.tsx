import type { Metadata, Viewport } from 'next';
import { Golos_Text, Sofia_Sans_Condensed, JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PWARegistration from '../components/PWARegistration';
import { I18nProvider, Locale } from '../lib/i18n';

const golos = Golos_Text({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

const sofiaCondensed = Sofia_Sans_Condensed({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#070A11',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.tabletennisbhos.me'),
  title: {
    default: 'BANM Masaüstü Tennis Portalı | Rəsmi Liqa və Reytinq',
    template: '%s | BANM Masaüstü Tennis',
  },
  description:
    'Bakı Ali Neft Məktəbinin rəsmi masaüstü tennis platforması. Canlı ELO reytinqi, matç nəticələri və zal qaydaları.',
  openGraph: {
    title: 'BANM Masaüstü Tennis Portalı',
    description: 'Öz reytinqini öyrən, rəqiblərinə meydan oxu və liqada yüksəl!',
    url: 'https://www.tabletennisbhos.me',
    siteName: 'BANM Table Tennis',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BANM Table Tennis League Banner',
      },
    ],
    locale: 'az_AZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BANM Masaüstü Tennis Portalı',
    description: 'Bakı Ali Neft Məktəbi rəsmi ELO reytinq sistemi.',
    images: ['/og-image.png'],
  },
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
  const cookieStore = cookies();
  const rawLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const initialLocale: Locale = rawLocale === 'en' || rawLocale === 'ru' ? rawLocale : 'az';

  return (
    <html
      lang={initialLocale}
      className={`dark ${golos.variable} ${sofiaCondensed.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased">
        <I18nProvider initialLocale={initialLocale}>
          <PWARegistration />
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-8 sm:pt-6 sm:pb-8">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
