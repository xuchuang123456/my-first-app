import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/blog',
  assetPrefix: '/blog',
  output: 'export', // 静态导出
  images: {
    unoptimized: true, // 静态导出需要禁用图片优化
  },
};

export default nextConfig;
