import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
          {
            source: '/api/:path*',
            destination: 'https://delaine-vulturine-containedly.ngrok-free.dev/api/:path*',
          },
        ]
      },

};

export default nextConfig;
