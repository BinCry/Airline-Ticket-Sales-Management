import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@qlvmb/shared-types"],
  images: {
    qualities: [75, 100]
  },
  turbopack: {
    root: path.join(__dirname, "../..")
  }
};

export default nextConfig;
