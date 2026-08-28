import path from "node:path";
import type { NextConfig } from "next";

const nextConfig = {
  output: "standalone" as const,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@qlvmb/shared-types"],
  images: {
    qualities: [75, 100]
  },
  turbopack: {
    root: path.join(__dirname, "../..")
  },
  
  experimental: {
    cpus: 1,
    workerThreads: false
  },
} satisfies Record<string, any>; 
export default nextConfig as NextConfig;
