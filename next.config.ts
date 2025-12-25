import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 部署时临时注释 basePath
  // basePath: '/blog',
  // assetPrefix: '/blog',
  output: 'export', // 静态导出
  images: {
    unoptimized: true, // 静态导出需要禁用图片优化
  },
};

export default nextConfig;
