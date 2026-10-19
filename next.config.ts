import type { NextConfig } from "next";

// Security headers for every Worker-rendered response. Static assets served
// straight from the ASSETS binding (public/, _next/static) never reach this —
// public/_headers carries the same basics for those.
//
// The CSP is split in two. The enforced half is directives that cannot break a
// page (framing, <base>, plugins, http→https). The full allow-list runs in
// REPORT-ONLY until it has been watched against real traffic: violations show
// in the browser console without blocking anything. Once clean, move the
// report-only string into the enforced header. Inline scripts are allowed
// because Next's bootstrap and ThemeScript are inline, and nonces would force
// every page to render dynamically.
const CSP_ENFORCED = [
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com",
  "frame-src 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: CSP_ENFORCED },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  // Load @supabase/supabase-js as a native Node.js module in Server Components
  // and Route Handlers (via nodejs_compat on CF Workers) instead of bundling it.
  // This prevents the Edge Runtime process.version warning in those contexts and
  // avoids the realtime-js WebSocketFactory CF Workers detection throwing there.
  serverExternalPackages: ["@supabase/supabase-js"],

  webpack(config, { nextRuntime, webpack }) {
    if (nextRuntime === "edge") {
      // @supabase/supabase-js reads process.version at module load time to build
      // the X-Client-Info header. Next.js Edge Runtime warns when it sees
      // process.version in the middleware bundle. Replacing it with a string
      // constant via DefinePlugin eliminates the reference entirely so webpack
      // dead-code-eliminates it — no warning, no runtime dependency on
      // process.version.
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.version": JSON.stringify(""),
        })
      );
    }
    return config;
  },
};

export default nextConfig;
