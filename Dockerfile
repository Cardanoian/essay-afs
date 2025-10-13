# 프론트엔드 Dockerfile (Next.js)

# Stage 1: 의존성 설치
FROM node:22-alpine AS deps
WORKDIR /app

# 패키지 파일 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# Stage 2: 빌드
FROM node:22-alpine AS builder
WORKDIR /app

# 빌드 시점에 필요한 환경 변수 선언
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules

# 소스 코드 복사
COPY . .

# Next.js 빌드 (standalone 모드)
RUN npm run build

# Stage 3: 프로덕션 런타임
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# curl 설치 (헬스체크용)
RUN apk add --no-cache curl

# 보안을 위한 non-root 유저 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# public 폴더 복사
COPY --from=builder /app/public ./public

# standalone 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js 서버 시작
CMD ["node", "server.js"]
