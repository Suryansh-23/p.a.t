import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
          {
            source: '/api/:path*',
            destination: 'https://p8080.m1142.test-proxy-b.rofl.app/api/:path*',
          },
        ]
      },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            }
        }
        config.externals.push('pino-pretty', 'lokijs', 'encoding')
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                '@react-native-async-storage/async-storage': false,
            }
        }
        return config
    },
};

export default nextConfig;
