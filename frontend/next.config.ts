import type { NextConfig } from "next";

const isSitesExport = process.env.SITES_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  distDir: isSitesExport ? ".next-sites" : ".next",
  output: isSitesExport ? "export" : undefined,
  images: { unoptimized: isSitesExport },
};

export default nextConfig;
