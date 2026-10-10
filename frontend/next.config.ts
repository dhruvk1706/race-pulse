import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  // Browser calls to /api/f1/* are proxied to the separate backend/ service.
  async rewrites() {
    return [{ source: "/api/f1/:path*", destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/api/f1/:path*` }];
  },
};

export default nextConfig;
