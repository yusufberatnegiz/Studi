import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling these Node.js-native packages.
  // They're only used in server actions; Node.js require() loads them at runtime.
  serverExternalPackages: ["pdf-parse", "pdf2json", "mammoth", "jszip"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
