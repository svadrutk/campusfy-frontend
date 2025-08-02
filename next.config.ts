import type { NextConfig } from "next";

const config: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>.*?)\.?campusfy\.app',
            },
          ],
          destination: '/:path*',
        },
      ],
    };
  },
};

export default config;
