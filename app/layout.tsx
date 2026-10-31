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
  themeColor: '#0B0F19',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.tabletennisbhos.me'),
  title: {
    default: 'BANM Stolüstü Tennis Portalı | Rəsmi Liqa və Reytinq',
    template: '%s | BANM Stolüstü Tennis',
  },
  description:
    'Bakı Ali Neft Məktəbinin rəsmi stolüstü tennis platforması. Canlı ELO reytinqi, matç nəticələri və zal qaydaları.',
  openGraph: {
    title: 'BANM Stolüstü Tennis Portalı',
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
    title: 'BANM Stolüstü Tennis Portalı',
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
  return (
    <html lang="az" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} font-sans min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-700 selection:text-white`}>
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
