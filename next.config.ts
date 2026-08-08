import type { NextConfig } from "next";

const isRender = process.env.RENDER === "true" || process.env.RENDER_SERVICE_ID !== undefined;
const repo = "identity-generator";

const nextConfig: NextConfig = {
  output: isRender ? "standalone" : "export",
  images: {
    unoptimized: true,
  },
  ...(isRender
    ? {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
              ],
            },
          ];
        },
      }
    : {
        basePath: `/${repo}`,
        assetPrefix: `/${repo}/`,
      }),
};

export default nextConfig;
