import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone 모드 활성화 (Docker 배포용)
  output: 'standalone',

  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

export default nextConfig;
