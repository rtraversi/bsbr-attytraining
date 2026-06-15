import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
