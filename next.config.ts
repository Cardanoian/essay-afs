import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone 모드 활성화 (Docker 배포용)
  output: 'standalone',
};

export default nextConfig;
