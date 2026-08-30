import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = { reactStrictMode: true, outputFileTracingRoot: path.join(__dirname), experimental: { cpus: 1 } };
export default nextConfig;
