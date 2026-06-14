// @ts-check

/**
 * Next.js configuration — STRICT static HTML export.
 *
 * `output: 'export'` produces a fully static site in `out/` (no Node server),
 * which is what Firebase Hosting serves. Because there is no server runtime:
 *   - the Next.js Image Optimization API is unavailable -> images.unoptimized
 *   - route handlers / server actions / ISR are NOT supported
 *   - all data must be fetched at build time or client-side
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  // Static export cannot optimize images at request time.
  images: {
    unoptimized: true,
  },
  // Emit /about/index.html instead of /about.html so Firebase clean URLs work.
  trailingSlash: true,
  // Fail the production build on type or lint errors (do not silently ship).
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
