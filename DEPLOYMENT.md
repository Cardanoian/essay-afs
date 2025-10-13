# Essay-AFS 통합 배포 가이드 🚀

Docker를 이용한 풀스택(프론트엔드 + 백엔드) 통합 배포 가이드입니다.

## 📋 목차

- [시스템 요구사항](#시스템-요구사항)
- [아키텍처 개요](#아키텍처-개요)
- [배포 전 준비사항](#배포-전-준비사항)
- [배포 방법](#배포-방법)
- [부분 배포](#부분-배포)
- [관리 및 유지보수](#관리-및-유지보수)
- [트러블슈팅](#트러블슈팅)

---

## 🖥 시스템 요구사항

### 서버 사양

- **OS**: Ubuntu 20.04 LTS 이상
- **CPU**: 4 Core 이상 (권장)
- **RAM**: 4GB 이상 (권장)
- **디스크**: 30GB 이상
- **네트워크**: 공인 IP 주소

### 필수 소프트웨어

- Docker (자동 설치됨)
- Docker Compose (자동 설치됨)
- Git

---

## 🏗 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                    Ubuntu 서버                          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Docker Compose                           │  │
│  │                                                  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  │  │
│  │  │  Frontend  │  │  Backend   │  │  Nginx   │  │  │
│  │  │  (Next.js) │  │  (FastAPI) │  │  (Proxy) │  │  │
│  │  │   :3000    │  │   :3050    │  │  :80/443 │  │  │
│  │  └────────────┘  └────────────┘  └──────────┘  │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Certbot (SSL 인증서 자동 관리)          │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

외부 접속:
https://essay.gbeai.net → Nginx → Frontend:3000
https://essay-server.gbeai.net → Nginx → Backend:3050
```

### 주요 특징

- ✅ **단일 서버 배포**: 하나의 서버에서 모든 것 관리
- ✅ **멀티 도메인 SSL**: 두 도메인 모두 자동 HTTPS
- ✅ **독립적 배포**: 프론트/백엔드 개별 배포 가능
- ✅ **자동 SSL 갱신**: Let's Encrypt 인증서 자동 갱신
- ✅ **데이터 영구 보존**: SQLite 데이터 볼륨 마운트

---

## 🔧 배포 전 준비사항

### 1. DNS 설정

두 도메인 모두 서버 IP로 설정:

```
Type: A
Name: essay
Value: [서버 공인 IP]

Type: A
Name: essay-server
Value: [서버 공인 IP]
```

**DNS 전파 확인:**

```bash
nslookup essay.gbeai.net
nslookup essay-server.gbeai.net
```

### 2. 방화벽 설정

다음 포트를 열어야 합니다:

- **22**: SSH
- **80**: HTTP (SSL 인증서 발급용)
- **443**: HTTPS

**Ubuntu UFW:**

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. 필수 정보 준비

- ✅ **OpenAI API Key**: https://platform.openai.com/api-keys
- ✅ **이메일 주소**: SSL 인증서 발급용
- ✅ **도메인**: essay.gbeai.net, essay-server.gbeai.net

---

## 🚀 배포 방법

### 1단계: 서버 접속

```bash
ssh username@essay-server.gbeai.net
```

### 2단계: 프로젝트 클론

```bash
# Git 설치 (필요한 경우)
sudo apt update
sudo apt install -y git

# 프로젝트 클론
git clone https://github.com/Cardanoian/essay-afs.git
cd essay-afs
```

### 3단계: 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집
nano .env
```

**.env 파일 설정:**

```env
# OpenAI API Key (필수)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# JWT 인증 설정 (필수)
SECRET_KEY=your_generated_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 데이터베이스 설정
DATABASE_URL=sqlite+aiosqlite:///./db/essay_afs.db

# CORS 설정
CORS_ORIGINS=https://essay.gbeai.net,http://localhost:3000

# 도메인 설정
FRONTEND_DOMAIN=essay.gbeai.net
BACKEND_DOMAIN=essay-server.gbeai.net

# SSL 인증서 발급용 이메일 (필수)
EMAIL=your-email@example.com

# Next.js 환경 변수
NEXT_PUBLIC_API_URL=https://essay-server.gbeai.net
```

**SECRET_KEY 생성:**

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4단계: 전체 배포 실행

```bash
# 실행 권한 확인
ls -l deploy.sh

# 배포 시작
sudo ./deploy.sh
```

**배포 과정 (10-15분 소요):**

1. ✅ Root 권한 확인
2. ✅ .env 파일 검증
3. ✅ Docker 설치 (필요한 경우)
4. ✅ 필요한 디렉토리 생성
5. ✅ SSL 인증서 발급 (두 도메인)
6. ✅ 프론트엔드 빌드 (5-10분)
7. ✅ 백엔드 빌드 (2-3분)
8. ✅ 컨테이너 시작
9. ✅ SSL 자동 갱신 설정
10. ✅ 헬스 체크

### 5단계: 배포 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# 예상 출력:
# NAME                  STATUS              PORTS
# essay-afs-frontend    Up (healthy)        0.0.0.0:3000->3000/tcp
# essay-afs-backend     Up (healthy)        0.0.0.0:3050->3050/tcp
# essay-afs-nginx       Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# essay-afs-certbot     Up
```

**웹 브라우저에서 확인:**

- 프론트엔드: https://essay.gbeai.net
- 백엔드 API: https://essay-server.gbeai.net/docs

---

## 🎯 부분 배포

### 프론트엔드만 배포 (3-5분)

UI 수정, 스타일 변경 등 프론트엔드만 변경된 경우:

```bash
sudo ./deploy-front.sh
```

**특징:**

- ✅ 프론트엔드만 재빌드
- ✅ 백엔드는 그대로 유지 (재시작 X)
- ✅ 빠른 배포 (3-5분)

### 백엔드만 배포 (1-2분)

API 로직, 데이터베이스 모델 등 백엔드만 변경된 경우:

```bash
sudo ./deploy-back.sh
```

**특징:**

- ✅ 백엔드만 재빌드
- ✅ 프론트엔드는 그대로 유지 (재시작 X)
- ✅ 매우 빠른 배포 (1-2분)

### 배포 시나리오 비교

| 시나리오        | 스크립트          | 시간    | 영향 범위 |
| --------------- | ----------------- | ------- | --------- |
| 최초 배포       | `deploy.sh`       | 10-15분 | 전체      |
| UI 수정         | `deploy-front.sh` | 3-5분   | 프론트    |
| API 수정        | `deploy-back.sh`  | 1-2분   | 백엔드    |
| 대규모 변경     | `deploy.sh`       | 10-15분 | 전체      |
| 환경 변수 변경  | `deploy.sh`       | 10-15분 | 전체      |
| SSL 인증서 갱신 | 자동 (매일 2회)   | -       | -         |

---

## 🔧 관리 및 유지보수

### 컨테이너 관리

```bash
# 전체 로그 확인
docker compose logs -f

# 프론트엔드 로그만
docker compose logs -f frontend

# 백엔드 로그만
docker compose logs -f fastapi

# Nginx 로그
docker compose logs -f nginx

# 컨테이너 상태
docker compose ps

# 전체 재시작
docker compose restart

# 특정 서비스만 재시작
docker compose restart frontend
docker compose restart fastapi
docker compose restart nginx
```

### 코드 업데이트

```bash
cd ~/essay-afs

# 최신 코드 가져오기
git pull origin main

# 전체 재배포
sudo ./deploy.sh

# 또는 부분 배포
sudo ./deploy-front.sh  # 프론트엔드만
sudo ./deploy-back.sh   # 백엔드만
```

### 데이터베이스 백업

**수동 백업:**

```bash
# 백업 디렉토리 생성
mkdir -p ~/backups

# SQLite 파일 백업
cp ~/essay-afs/backend/db/essay_afs.db ~/backups/essay_afs_$(date +%Y%m%d_%H%M%S).db
```

**자동 백업 설정:**

```bash
# 백업 스크립트 생성
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DB_PATH="$HOME/essay-afs/backend/db/essay_afs.db"
mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/essay_afs_$(date +%Y%m%d_%H%M%S).db

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "essay_afs_*.db" -mtime +30 -delete
EOF

chmod +x ~/backup-db.sh

# Cron 작업 추가 (매일 새벽 3시)
(crontab -l 2>/dev/null; echo "0 3 * * * $HOME/backup-db.sh") | crontab -
```

### SSL 인증서 관리

**자동 갱신 (이미 설정됨):**

- 갱신 스케줄: 매일 새벽 2시, 오후 2시
- 로그 위치: `/var/log/ssl-renewal.log`

**수동 갱신:**

```bash
cd ~/essay-afs
docker compose run --rm certbot renew
docker compose restart nginx
```

**갱신 로그 확인:**

```bash
tail -f /var/log/ssl-renewal.log
```

### 모니터링

**시스템 리소스:**

```bash
# CPU, 메모리 사용량
htop

# 디스크 사용량
df -h

# Docker 리소스 사용량
docker stats
```

**로그 모니터링:**

```bash
# 실시간 로그
docker compose logs -f

# 최근 100줄
docker compose logs --tail=100

# 특정 시간 이후 로그
docker compose logs --since 1h
```

---

## 🔍 트러블슈팅

### 문제 1: SSL 인증서 발급 실패

**증상:**

```
SSL 인증서 발급 실패. DNS 설정을 확인해주세요.
```

**해결 방법:**

1. DNS 설정 확인:

```bash
nslookup essay.gbeai.net
nslookup essay-server.gbeai.net
```

2. 방화벽 확인:

```bash
sudo ufw status
```

3. 재시도:

```bash
sudo ./deploy.sh
```

---

### 문제 2: 프론트엔드 빌드 실패

**증상:**

```
프론트엔드 서버 시작 실패
```

**해결 방법:**

1. 로그 확인:

```bash
docker compose logs frontend
```

2. 환경 변수 확인:

```bash
cat .env | grep NEXT_PUBLIC_API_URL
```

3. 재빌드:

```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

### 문제 3: 백엔드 502 에러

**증상:**

- API 호출 시 502 Bad Gateway

**해결 방법:**

1. 백엔드 컨테이너 상태 확인:

```bash
docker compose ps
docker compose logs fastapi
```

2. 백엔드 재시작:

```bash
docker compose restart fastapi
```

3. 헬스 체크:

```bash
curl http://localhost:3050/health
```

---

### 문제 4: CORS 에러

**증상:**

- 프론트엔드에서 API 호출 시 CORS 에러

**해결 방법:**

1. .env 파일 확인:

```bash
cat .env | grep CORS_ORIGINS
```

2. CORS_ORIGINS에 프론트엔드 도메인 추가:

```bash
nano .env
# CORS_ORIGINS=https://essay.gbeai.net,http://localhost:3000
```

3. 백엔드 재시작:

```bash
docker compose restart fastapi
```

---

### 문제 5: 디스크 공간 부족

**증상:**

```
no space left on device
```

**해결 방법:**

```bash
# 사용하지 않는 Docker 리소스 정리
docker system prune -a

# 디스크 사용량 확인
df -h
docker system df

# 오래된 이미지 삭제
docker image prune -a
```

---

## 📊 성능 최적화

### 1. 워커 수 조정

**프론트엔드 (Next.js):**

현재 단일 프로세스로 실행 중. 필요시 PM2 등으로 클러스터링 가능.

**백엔드 (FastAPI):**

`backend/Dockerfile`에서 워커 수 조정:

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3050", "--workers", "4"]
```

권장 워커 수: `(2 x CPU 코어 수) + 1`

### 2. 캐싱 설정

Nginx에서 정적 파일 캐싱 추가 가능.

### 3. 리소스 제한

`docker-compose.yml`에서 리소스 제한 설정 가능:

```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## 🔐 보안 권장사항

1. **.env 파일 권한:**

```bash
chmod 600 .env
```

2. **SSH 키 기반 인증 사용**

3. **정기적인 시스템 업데이트:**

```bash
sudo apt update && sudo apt upgrade -y
```

4. **방화벽 활성화:**

```bash
sudo ufw enable
```

5. **로그 정기 확인**

6. **백업 자동화**

---

## 📞 지원

문제가 해결되지 않으면:

1. GitHub Issues: https://github.com/Cardanoian/essay-afs/issues
2. 로그 파일 첨부
3. 에러 메시지 전체 복사

---

## 📚 추가 리소스

- [Docker 공식 문서](https://docs.docker.com/)
- [Next.js 문서](https://nextjs.org/docs)
- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)
- [Nginx 문서](https://nginx.org/en/docs/)

---

**Essay-AFS Full Stack Deployment Guide v1.0**

마지막 업데이트: 2025년 1월
