import path from "node:path";
import type { NextConfig } from "next";

const nextConfig = {
  output: "standalone" as const,
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
  typescript: {
    ignoreBuildErrors: true 
  },
  
  eslint: {
    ignoreDuringBuilds: true 
  }
} satisfies Record<string, any>; 
export default nextConfig as NextConfig;