/** @type {import('next').NextConfig} */
const API_URL = process.env.ARKVOLT_API_URL ?? 'http://127.0.0.1:4000';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // The browser talks to /api/* on its own origin; Next proxies that to the
  // Express service. Two reasons this matters: the session cookie stays
  // first-party (cookies are dropped on cross-site requests without
  // SameSite=None + Secure), and there is no CORS preflight on every call.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    // Cloudinary delivery when the client configures it; local /media otherwise.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },

  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
