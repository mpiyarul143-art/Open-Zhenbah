import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Needed for Docker multi-stage build that runs `server.js` from `.next/standalone`
  output: 'standalone',
  // Skip linting during build for production (warnings only)
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  // Skip type checking during build for production (warnings only)
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  // Enable styled-components transform
  compiler: {
    styledComponents: true,
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Environment-specific configuration for shared URLs
  env: {
    NEXT_PUBLIC_APP_URL: process.env.APP_URL || 'http://https://open-fiestaa.vercel.app',
    NEXT_PUBLIC_SHARE_URL_BASE: process.env.SHARE_URL_BASE || process.env.APP_URL || 'http://https://open-fiestaa.vercel.app',
  },
  
  // Security headers and CORS configuration for production
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const headers = [];
    
    if (isProduction) {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['https://open-fiestaa.vercel.app'];
      
      // Global security headers
      headers.push({
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://scripts.simpleanalyticscdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'none';"
          }
        ]
      });
      
      // Specific headers for shared chat pages
      headers.push({
        source: '/shared/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=7200, s-maxage=7200, stale-while-revalidate=86400'
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*' // Allow sharing across domains
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS'
          }
        ]
      });
      
      // API CORS headers
      headers.push({
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: allowedOrigins.join(',')
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      });
    }
    
    return headers;
  }
};

export default nextConfig;