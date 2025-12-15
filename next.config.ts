import type { NextConfig } from "next";

const securityHeaders = [
  // DNS prefetch control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // Prevent MIME sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // XSS protection
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Referrer policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Permissions policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), gyroscope=(), speaker=(), payment=()'
  },
  // HSTS (HTTP Strict Transport Security) - only enable in production
  ...(process.env.NODE_ENV === 'production' ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  }] : []),
  // Content Security Policy - adjust based on your needs
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    const headers = [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];

    // Add CORS headers for API routes
    // Adjust allowed origins based on your needs
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    };

    // If specific origins are configured, use them; otherwise allow same-origin only
    if (allowedOrigins.length > 0) {
      corsHeaders['Access-Control-Allow-Origin'] = allowedOrigins.join(', ');
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    } else {
      // Default: same-origin only (more secure)
      corsHeaders['Access-Control-Allow-Origin'] = 'same-origin';
    }

    headers.push({
      // Apply CORS headers to API routes
      source: '/api/:path*',
      headers: Object.entries(corsHeaders).map(([key, value]) => ({
        key,
        value,
      })),
    });

    return headers;
  },
};

export default nextConfig;
