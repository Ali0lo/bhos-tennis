/** @type {import('next').NextConfig} */
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
    ];
  },
};

export default nextConfig;

