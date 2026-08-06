import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network IP testing on mobile devices during development
  allowedDevOrigins: ["localhost:3000", "127.0.0.1:3000", "192.168.1.*", "192.168.*.*"],
};

export default nextConfig;
