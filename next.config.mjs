/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app https://*.vercel-insights.com https://*.onrender.com https://fonts.googleapis.com https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob: data:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
  // Short Azerbaijani aliases (URL bar keeps the alias; content is served from the canonical route).
  async rewrites() {
    return [
      { source: "/reytinq", destination: "/leaderboard" },
      { source: "/oyunlar", destination: "/matches" },
      { source: "/turnirler", destination: "/tournaments" },
      { source: "/turnirler/:slug", destination: "/tournaments/:slug" },
      { source: "/oyuncular/:id", destination: "/players/:id" },
      { source: "/masalar", destination: "/tables" },
      { source: "/mini-oyun", destination: "/minigame" },
      { source: "/meydan-oxu", destination: "/challenges" },
    ];
  },
};

export default nextConfig;

