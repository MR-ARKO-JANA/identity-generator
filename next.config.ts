import type { NextConfig } from "next";

const isRender = process.env.RENDER === "true" || process.env.RENDER_SERVICE_ID !== undefined;
const repo = "identity-generator";

const nextConfig: NextConfig = {
  output: isRender ? "standalone" : "export",
  images: {
    unoptimized: true,
  },
  ...(isRender
    ? {}
    : {
        basePath: `/${repo}`,
        assetPrefix: `/${repo}/`,
      }),
};

export default nextConfig;
