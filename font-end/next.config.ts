import type { NextConfig } from "next";

// Proxy routes are generated from src/config/servers.json so adding a new
// server entry automatically creates the corresponding /api/node/* paths.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const servers = (require("./src/config/servers.json").servers) as Array<{
  id: string;
  ipAddress: string;
  statusPort: number;
  ollamaPort: number;
}>;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Global agent backend endpoints (FastAPI at :8000)
      {
        source: "/api/global/:path*",
        destination: "http://localhost:8000/global/:path*",
      },
      // Per-node proxy routes generated from servers.json
      ...servers.flatMap((s) => [
        {
          source: `/api/node/${s.id}/status`,
          destination: `http://${s.ipAddress}:${s.statusPort}/stats`,
        },
        {
          source: `/api/node/${s.id}/ollama/:path*`,
          destination: `http://${s.ipAddress}:${s.ollamaPort}/:path*`,
        },
      ]),
    ];
  },
};

export default nextConfig;
