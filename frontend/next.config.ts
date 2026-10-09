import type { NextConfig } from "next";

const isSitesExport = process.env.SITES_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  distDir: isSitesExport ? ".next-sites" : ".next",
  output: isSitesExport ? "export" : undefined,
  images: { unoptimized: isSitesExport },
  // Browser calls to /api/f1/* are proxied to the separate backend/ service.
  async rewrites() {
    return [{ source: "/api/f1/:path*", destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/api/f1/:path*` }];
  },
};

export default nextConfig;
