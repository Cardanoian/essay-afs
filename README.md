# Essay-AFS (Essay Assistant Feedback System)

AI 기반 에세이 피드백 시스템 - 교사가 학생들의 에세이 과제와 평가를 관리하고, AI 피드백을 제공하는 웹 애플리케이션

## 📋 목차

- [프로젝트 소개](#프로젝트-소개)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [설치 및 실행](#설치-및-실행)
- [환경 변수 설정](#환경-변수-설정)
- [API 엔드포인트](#api-엔드포인트)
- [배포 가이드](#배포-가이드)

## 🎯 프로젝트 소개

Essay-AFS는 교육 현장에서 교사가 학생들의 에세이 작성을 효율적으로 관리하고, AI 기술을 활용하여 즉각적인 피드백을 제공할 수 있도록 돕는 시스템입니다.

### 주요 특징

- **학급 관리**: 학급별 학생 관리 및 CSV 일괄 등록
- **과제 관리**: 에세이 과제 생성, 배포, 제출 관리
- **평가 관리**: 평가 기준 설정 및 자동 채점
- **AI 피드백**: OpenAI/LangChain 기반 실시간 피드백 생성
- **학생 분석**: 학생별 제출 이력 및 성장 분석
- **QR 코드**: 학생 제출 페이지 QR 코드 생성

## ✨ 주요 기능

### 교사 기능

- 학급 및 학생 관리
- 과제 생성 및 배포 (가이드라인, 조건 설정)
- 평가 생성 및 배포 (평가 기준 설정)
- 학생 제출물 확인 및 관리
- AI 피드백 생성 및 수정
- 학생별 분석 리포트 조회

### 학생 기능

- QR 코드 또는 링크를 통한 과제/평가 접근
- 에세이 작성 및 제출
- 중간 피드백 요청 (작성 중)
- 최종 피드백 확인
- 수정본 재제출

### AI 기능

- 중간 피드백: 작성 중인 에세이에 대한 개선 제안
- 최종 피드백: 제출된 에세이에 대한 종합 평가
- 자동 채점: 평가 기준에 따른 점수 산출
- 맞춤형 피드백: 교사 설정 가이드라인 반영

## 🛠 기술 스택

### 프론트엔드

| 기술           | 버전   | 용도                          |
| -------------- | ------ | ----------------------------- |
| Next.js        | 15.3.5 | React 프레임워크 (App Router) |
| React          | 19.0.0 | UI 라이브러리                 |
| TypeScript     | 5.x    | 타입 안정성                   |
| Tailwind CSS   | 4.x    | 스타일링                      |
| Axios          | 1.10.0 | HTTP 클라이언트               |
| React Markdown | 10.1.0 | 마크다운 렌더링               |
| React QR Code  | 2.0.18 | QR 코드 생성                  |
| React Toastify | 11.0.5 | 알림 메시지                   |
| Hashids        | 2.3.0  | ID 암호화                     |

### 백엔드

| 기술             | 버전     | 용도                 |
| ---------------- | -------- | -------------------- |
| FastAPI          | 0.115.14 | Python 웹 프레임워크 |
| SQLAlchemy       | 2.0.41   | ORM (비동기 지원)    |
| Pydantic         | 2.11.7   | 데이터 검증          |
| Uvicorn          | 0.35.0   | ASGI 서버            |
| python-jose      | 3.5.0    | JWT 토큰 처리        |
| bcrypt           | 4.3.0    | 비밀번호 해싱        |
| LangChain        | 0.3.26   | AI 체인 구성         |
| LangChain-OpenAI | 0.3.27   | OpenAI 통합          |
| OpenAI           | 1.95.0   | AI API               |
| pandas           | 2.3.1    | 데이터 분석          |
| python-dotenv    | 1.1.1    | 환경 변수 관리       |

### 데이터베이스

| 기술      | 용도                   |
| --------- | ---------------------- |
| SQLite    | 파일 기반 데이터베이스 |
| aiosqlite | 비동기 SQLite 드라이버 |

## 📁 프로젝트 구조

```
essay-afs/
├── app/                          # Next.js 프론트엔드 (App Router)
│   ├── account/                  # 계정 관련 페이지
│   │   ├── login/               # 로그인
│   │   ├── signup/              # 회원가입
│   │   ├── privacy-policy/      # 개인정보처리방침
│   │   └── terms-of-service/    # 이용약관
│   ├── dashboard/               # 대시보드
│   ├── classes/                 # 학급 관리
│   ├── students/                # 학생 관리
│   │   └── [token]/            # 학생 상세 (분석)
│   ├── assignment/              # 과제 생성
│   ├── assignments/             # 과제 목록
│   ├── evaluation/              # 평가 생성
│   ├── a_dist/                  # 과제 배포 페이지
│   │   ├── assignment/[token]/ # 학생 과제 제출
│   │   └── manage_submit/[token]/ # 교사 제출 관리
│   ├── e_dist/                  # 평가 배포 페이지
│   │   ├── evaluation/[token]/ # 학생 평가 제출
│   │   └── manage_submit/[token]/ # 교사 제출 관리
│   ├── components/              # 공통 컴포넌트
│   │   ├── Modal.tsx
│   │   └── FeedbackGuideModal.tsx
│   ├── hooks/                   # 커스텀 훅
│   │   ├── auth.ts             # 인증 훅
│   │   ├── loginCheck.ts       # 로그인 체크
│   │   └── index.ts
│   ├── lib/                     # 유틸리티
│   │   ├── api.ts              # API 함수
│   │   ├── hashids.ts          # ID 암호화
│   │   └── utils.ts
│   ├── AppLayout.tsx            # 레이아웃 컴포넌트
│   ├── sidebar.tsx              # 사이드바
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 홈 페이지
│   └── globals.css              # 전역 스타일
│
├── backend/                      # FastAPI 백엔드
│   ├── routers/                 # API 라우터
│   │   ├── auth.py             # 인증 (회원가입, 로그인)
│   │   ├── classes.py          # 학급 관리
│   │   ├── students.py         # 학생 관리
│   │   ├── assignments.py      # 과제 관리
│   │   ├── evaluation.py       # 평가 관리
│   │   ├── submit.py           # 제출물 관리
│   │   ├── ai.py               # AI 피드백 생성
│   │   └── analysis.py         # 학생 분석
│   ├── main.py                  # FastAPI 앱 진입점
│   ├── models.py                # SQLAlchemy 모델
│   ├── schemas.py               # Pydantic 스키마
│   ├── database.py              # DB 연결 설정
│   ├── crud.py                  # CRUD 작업
│   ├── init_db.py               # DB 초기화
│   └── requirements.txt         # Python 의존성
│
├── db/                          # 데이터베이스
│   └── essay_afs.db            # SQLite DB 파일
│
├── public/                      # 정적 파일
│   ├── logo.png
│   └── favicon.ico
│
├── package.json                 # Node.js 의존성
├── tsconfig.json                # TypeScript 설정
├── next.config.ts               # Next.js 설정
├── tailwind.config.js           # Tailwind 설정
├── postcss.config.mjs           # PostCSS 설정
└── .gitignore                   # Git 제외 파일
```

## 🗄 데이터베이스 스키마

### ERD 개요

```
User (교사)
  ├── SchoolClass (학급)
  │     ├── Student (학생)
  │     │     ├── ASubmission (과제 제출)
  │     │     │     └── AFeedback (과제 피드백)
  │     │     ├── ESubmission (평가 제출)
  │     │     │     └── EFeedback (평가 피드백)
  │     │     └── AnalysisResult (분석 결과)
  │     ├── Assignment (과제)
  │     └── Evaluation (평가)
```

### 주요 테이블

#### users (교사)

- `id`: 기본키
- `email`: 이메일 (고유)
- `hashed_password`: 해시된 비밀번호
- `school_level`: 학교급 (초/중/고)
- `name`: 이름
- `feedback_guide`: 피드백 가이드 (JSON)

#### classes (학급)

- `id`: 기본키
- `name`: 학급명
- `grade`: 학년
- `school_level`: 학교급
- `user_id`: 교사 ID (외래키)

#### student (학생)

- `id`: 기본키
- `class_id`: 학급 ID (외래키)
- `number`: 번호
- `name`: 이름
- `email`: 이메일 (선택)

#### assignment (과제)

- `id`: 기본키
- `class_id`: 학급 ID (외래키)
- `user_id`: 교사 ID (외래키)
- `name`: 과제명
- `guide`: 작성 가이드
- `condition`: 작성 조건
- `status`: 상태 (pending/in_progress/completed)
- `started_at`: 시작 시간
- `completed_at`: 완료 시간

#### evaluation (평가)

- `id`: 기본키
- `class_id`: 학급 ID (외래키)
- `user_id`: 교사 ID (외래키)
- `name`: 평가명
- `item`: 평가 항목
- `criteria`: 평가 기준 (JSON)
- `status`: 상태
- `started_at`: 시작 시간
- `completed_at`: 완료 시간

#### assign_submission (과제 제출)

- `id`: 기본키
- `assignment_id`: 과제 ID (외래키)
- `student_id`: 학생 ID (외래키)
- `content`: 제출 내용
- `revised_content`: 수정 내용
- `status`: 상태 (in_progress/first_submitted/feedback_done/final_submitted)
- `submitted_at`: 제출 시간

#### esubmission (평가 제출)

- `id`: 기본키
- `evaluation_id`: 평가 ID (외래키)
- `student_id`: 학생 ID (외래키)
- `content`: 제출 내용
- `score`: 점수
- `status`: 상태 (in_progress/submitted)
- `submitted_at`: 제출 시간

#### assign_feedback (과제 피드백)

- `id`: 기본키
- `assign_submission_id`: 과제 제출 ID (외래키)
- `assignment_id`: 과제 ID (외래키)
- `student_id`: 학생 ID (외래키)
- `content`: 피드백 내용
- `created_at`: 생성 시간

#### eval_feedback (평가 피드백)

- `id`: 기본키
- `eval_submission_id`: 평가 제출 ID (외래키)
- `evaluation_id`: 평가 ID (외래키)
- `student_id`: 학생 ID (외래키)
- `content`: 피드백 내용
- `created_at`: 생성 시간

#### analysis_results (분석 결과)

- `id`: 기본키
- `student_id`: 학생 ID (외래키)
- `analysis_source`: 분석 소스 데이터 (JSON)
- `analysis_result`: 분석 결과 (JSON)
- `created_at`: 생성 시간

## 🚀 설치 및 실행

### 사전 요구사항

- Node.js 20.x 이상
- Python 3.10 이상
- npm 또는 yarn

### 1. 저장소 클론

```bash
git clone https://github.com/jy9307/essay-afs.git
cd essay-afs
```

### 2. 프론트엔드 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 3. 백엔드 설정

```bash
# backend 디렉토리로 이동
cd backend

# 가상환경 생성 (권장)
python -m venv env

# 가상환경 활성화
# Windows
env\Scripts\activate
# macOS/Linux
source env/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행 (http://localhost:8000)
python main.py

# 또는 uvicorn 직접 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 데이터베이스 초기화

데이터베이스는 백엔드 서버 시작 시 자동으로 생성됩니다.
수동으로 초기화하려면:

```bash
cd backend
python init_db.py
```

## 🔐 환경 변수 설정

### 백엔드 환경 변수

`backend/.env` 파일 생성:

```env
# OpenAI API 키 (필수)
OPENAI_API_KEY=your_openai_api_key_here

# JWT 설정
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 데이터베이스 (기본값 사용 가능)
DATABASE_URL=sqlite+aiosqlite:///./db/essay_afs.db

# CORS 설정 (프론트엔드 URL)
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 프론트엔드 환경 변수

`app/lib/api.ts`에서 백엔드 URL 설정:

```typescript
const api = axios.create({
  baseURL: 'http://localhost:8000', // 개발 환경
  // baseURL: "https://your-backend-api.com", // 프로덕션 환경
  withCredentials: false,
});
```

## 📡 API 엔드포인트

### 인증 (auth.py)

| Method | Endpoint               | 설명                         |
| ------ | ---------------------- | ---------------------------- |
| POST   | `/auth/register`       | 회원가입                     |
| POST   | `/auth/login`          | 로그인                       |
| GET    | `/auth/me`             | 현재 사용자 정보             |
| GET    | `/auth/me/full`        | 사용자 전체 정보 (관계 포함) |
| PATCH  | `/auth/feedback_guide` | 피드백 가이드 업데이트       |

### 학급 관리 (classes.py)

| Method | Endpoint              | 설명           |
| ------ | --------------------- | -------------- |
| GET    | `/classes`            | 학급 목록 조회 |
| POST   | `/classes`            | 학급 생성      |
| PUT    | `/classes/{class_id}` | 학급 수정      |
| DELETE | `/classes/{class_id}` | 학급 삭제      |

### 학생 관리 (students.py)

| Method | Endpoint                     | 설명             |
| ------ | ---------------------------- | ---------------- |
| GET    | `/students/class/{class_id}` | 학급별 학생 목록 |
| POST   | `/students`                  | 학생 추가        |
| POST   | `/students/upload`           | CSV 일괄 등록    |
| POST   | `/students/delete`           | 학생 삭제        |

### 과제 관리 (assignments.py)

| Method | Endpoint                              | 설명                         |
| ------ | ------------------------------------- | ---------------------------- |
| GET    | `/assignments/class/{class_id}`       | 학급별 과제 목록             |
| GET    | `/assignments/{assignment_id}`        | 과제 상세 조회               |
| POST   | `/assignments`                        | 과제 생성                    |
| PUT    | `/assignments/{assignment_id}`        | 과제 수정                    |
| DELETE | `/assignments/{assignment_id}`        | 과제 삭제                    |
| PATCH  | `/assignments/{assignment_id}/status` | 과제 상태 변경               |
| POST   | `/assignments/start_assignment`       | 과제 시작 (학생별 제출 생성) |

### 평가 관리 (evaluation.py)

| Method | Endpoint                             | 설명                         |
| ------ | ------------------------------------ | ---------------------------- |
| GET    | `/evaluation/class/{class_id}`       | 학급별 평가 목록             |
| GET    | `/evaluation/{evaluation_id}`        | 평가 상세 조회               |
| POST   | `/evaluation`                        | 평가 생성                    |
| PUT    | `/evaluation/{evaluation_id}`        | 평가 수정                    |
| DELETE | `/evaluation/{evaluation_id}`        | 평가 삭제                    |
| PATCH  | `/evaluation/{evaluation_id}/status` | 평가 상태 변경               |
| POST   | `/evaluation/start_evaluation`       | 평가 시작 (학생별 제출 생성) |

### 제출물 관리 (submit.py)

| Method | Endpoint                               | 설명               |
| ------ | -------------------------------------- | ------------------ |
| GET    | `/submission/a`                        | 과제 제출 조회     |
| GET    | `/submission/e`                        | 평가 제출 조회     |
| PATCH  | `/submission/update_assign_submission` | 과제 제출 업데이트 |
| PATCH  | `/submission/update_eval_submission`   | 평가 제출 업데이트 |
| PATCH  | `/submission/patch_feedback`           | 피드백 수정        |

### AI 피드백 (ai.py)

| Method | Endpoint             | 설명             |
| ------ | -------------------- | ---------------- |
| POST   | `/ai/mid_feedback`   | 중간 피드백 생성 |
| POST   | `/ai/final_feedback` | 최종 피드백 생성 |
| POST   | `/ai/score`          | AI 자동 채점     |

### 학생 분석 (analysis.py)

| Method | Endpoint    | 설명                |
| ------ | ----------- | ------------------- |
| GET    | `/analysis` | 학생 분석 결과 조회 |
| POST   | `/analysis` | 학생 분석 생성      |

## 🌐 배포 가이드

이 가이드는 **Vercel (프론트엔드)** + **Ubuntu 서버 (백엔드 + SQLite)** 배포를 기준으로 작성되었습니다.

### 배포 아키텍처

```
┌─────────────────┐         ┌──────────────────────┐
│                 │         │   Ubuntu 서버        │
│  Vercel         │  HTTPS  │                      │
│  (프론트엔드)   ├────────►│  Nginx (리버스 프록시)│
│  Next.js        │         │         ↓            │
│                 │         │  Gunicorn + Uvicorn  │
└─────────────────┘         │  (FastAPI 백엔드)    │
                            │         ↓            │
                            │  SQLite (DB)         │
                            └──────────────────────┘
```

---

## 1️⃣ 프론트엔드 배포 (Vercel)

### 1.1 Vercel 계정 및 프로젝트 설정

1. **Vercel 계정 생성**

   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **GitHub 저장소 연결**

   - Vercel 대시보드에서 "New Project" 클릭
   - GitHub 저장소 `essay-afs` 선택
   - Import

3. **프로젝트 설정**
   - Framework Preset: **Next.js** (자동 감지)
   - Root Directory: `./` (프로젝트 루트)
   - Build Command: `npm run build` (기본값)
   - Output Directory: `.next` (기본값)

### 1.2 환경 변수 설정

Vercel 프로젝트 설정 → Environment Variables에서 추가:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

> ⚠️ **중요**: `NEXT_PUBLIC_` 접두사를 반드시 붙여야 클라이언트에서 접근 가능합니다.

### 1.3 코드 수정

`app/lib/api.ts` 파일을 다음과 같이 수정:

```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  withCredentials: false,
});
```

### 1.4 배포

```bash
# 로컬에서 Vercel CLI 사용 (선택사항)
npm install -g vercel
vercel login
vercel

# 또는 GitHub에 push하면 자동 배포
git add .
git commit -m "Update API URL for production"
git push origin main
```

### 1.5 도메인 설정 (선택사항)

- Vercel 대시보드 → Settings → Domains
- 커스텀 도메인 추가 (예: `essay-afs.com`)
- DNS 설정에서 CNAME 레코드 추가

---

## 2️⃣ 백엔드 배포 (Ubuntu 서버)

### 2.1 서버 초기 설정

#### SSH 접속

```bash
ssh username@your-server-ip
```

#### 시스템 업데이트

```bash
sudo apt update
sudo apt upgrade -y
```

#### 필수 패키지 설치

```bash
sudo apt install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx
```

### 2.2 프로젝트 클론 및 설정

```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론
git clone https://github.com/jy9307/essay-afs.git
cd essay-afs/backend

# Python 가상환경 생성
python3 -m venv env
source env/bin/activate

# 의존성 설치
pip install -r requirements.txt
pip install gunicorn  # 프로덕션 서버용
```

### 2.3 환경 변수 설정

```bash
nano .env
```

다음 내용 입력:

```env
# OpenAI API 키
OPENAI_API_KEY=your_openai_api_key_here

# JWT 설정
SECRET_KEY=your_very_secure_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# SQLite 데이터베이스 (기본값)
DATABASE_URL=sqlite+aiosqlite:///./db/essay_afs.db

# CORS 설정 (Vercel 도메인 추가)
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

> 💡 **SECRET_KEY 생성 방법**:
>
> ```bash
> python3 -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

### 2.4 데이터베이스 초기화

```bash
cd ~/essay-afs/backend
source env/bin/activate
python init_db.py
```

### 2.5 SQLite 백업 설정

#### 수동 백업

```bash
# 백업
cp ~/essay-afs/db/essay_afs.db ~/essay-afs/db/essay_afs_backup_$(date +%Y%m%d).db
```

#### 자동 백업 (Cron)

```bash
# 백업 스크립트 생성
nano ~/backup_db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/db_backups"
DB_PATH="/home/ubuntu/essay-afs/db/essay_afs.db"
mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/essay_afs_backup_$(date +%Y%m%d_%H%M%S).db

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "essay_afs_backup_*.db" -mtime +7 -delete
```

```bash
# 실행 권한 부여
chmod +x ~/backup_db.sh

# Cron 작업 추가 (매일 새벽 2시)
crontab -e
```

다음 라인 추가:

```
0 2 * * * /home/ubuntu/backup_db.sh
```

---

## 3️⃣ Gunicorn + Systemd 설정

### 3.1 Systemd 서비스 파일 생성

```bash
sudo nano /etc/systemd/system/essay-afs.service
```

다음 내용 입력:

```ini
[Unit]
Description=Essay-AFS FastAPI Application
After=network.target

[Service]
Type=notify
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/essay-afs/backend
Environment="PATH=/home/ubuntu/essay-afs/backend/env/bin"
ExecStart=/home/ubuntu/essay-afs/backend/env/bin/gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/essay-afs/access.log \
    --error-logfile /var/log/essay-afs/error.log
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
KillSignal=SIGQUIT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 3.2 로그 디렉토리 생성

```bash
sudo mkdir -p /var/log/essay-afs
sudo chown ubuntu:ubuntu /var/log/essay-afs
```

### 3.3 서비스 시작

```bash
# 서비스 등록
sudo systemctl daemon-reload
sudo systemctl enable essay-afs

# 서비스 시작
sudo systemctl start essay-afs

# 상태 확인
sudo systemctl status essay-afs

# 로그 확인
sudo journalctl -u essay-afs -f
```

### 3.4 서비스 관리 명령어

```bash
# 재시작
sudo systemctl restart essay-afs

# 중지
sudo systemctl stop essay-afs

# 로그 확인
sudo tail -f /var/log/essay-afs/error.log
sudo tail -f /var/log/essay-afs/access.log
```

---

## 4️⃣ Nginx 리버스 프록시 설정

### 4.1 Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/essay-afs
```

다음 내용 입력:

```nginx
server {
    listen 80;
    server_name your-backend-domain.com;  # 실제 도메인으로 변경

    client_max_body_size 10M;

    # 로그 설정
    access_log /var/log/nginx/essay-afs-access.log;
    error_log /var/log/nginx/essay-afs-error.log;

    # FastAPI 백엔드로 프록시
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 지원 (필요한 경우)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4.2 Nginx 설정 활성화

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/essay-afs /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택사항)
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## 5️⃣ SSL 인증서 설정 (Let's Encrypt)

### 5.1 Certbot으로 SSL 인증서 발급

```bash
# SSL 인증서 자동 발급 및 Nginx 설정
sudo certbot --nginx -d your-backend-domain.com

# 이메일 입력 및 약관 동의
# Redirect HTTP to HTTPS? → Yes 선택
```

### 5.2 자동 갱신 설정

```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# Cron은 자동으로 설정됨 (확인)
sudo systemctl status certbot.timer
```

### 5.3 SSL 설정 후 Nginx 재시작

```bash
sudo systemctl restart nginx
```

이제 `https://your-backend-domain.com`으로 접속 가능합니다.

---

## 6️⃣ 방화벽 설정

### 6.1 UFW 방화벽 설정

```bash
# UFW 활성화
sudo ufw enable

# SSH 허용 (중요!)
sudo ufw allow 22/tcp
sudo ufw allow OpenSSH

# HTTP, HTTPS 허용
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 상태 확인
sudo ufw status verbose
```

### 6.2 클라우드 보안 그룹 설정

AWS EC2, DigitalOcean 등의 경우 추가로 보안 그룹 설정:

- **Inbound Rules**:
  - SSH (22): Your IP
  - HTTP (80): 0.0.0.0/0
  - HTTPS (443): 0.0.0.0/0

---

## 7️⃣ 배포 확인 및 테스트

### 7.1 백엔드 API 테스트

```bash
# 헬스 체크
curl https://your-backend-domain.com/health

# API 문서 확인
# 브라우저에서 https://your-backend-domain.com/docs 접속
```

### 7.2 프론트엔드 테스트

1. Vercel 배포 URL 접속 (예: `https://essay-afs.vercel.app`)
2. 회원가입 및 로그인 테스트
3. 학급 생성, 학생 추가 등 기능 테스트

### 7.3 로그 모니터링

```bash
# 백엔드 로그
sudo journalctl -u essay-afs -f

# Nginx 로그
sudo tail -f /var/log/nginx/essay-afs-access.log
sudo tail -f /var/log/nginx/essay-afs-error.log
```

---

## 8️⃣ 배포 후 유지보수

### 8.1 코드 업데이트

```bash
cd ~/essay-afs
git pull origin main

# 백엔드 업데이트
cd backend
source env/bin/activate
pip install -r requirements.txt

# 서비스 재시작
sudo systemctl restart essay-afs
```

### 8.2 데이터베이스 마이그레이션

모델 변경 시:

```bash
cd ~/essay-afs/backend
source env/bin/activate
python init_db.py  # 또는 마이그레이션 스크립트 실행
sudo systemctl restart essay-afs
```

### 8.3 모니터링

#### 시스템 리소스 확인

```bash
# CPU, 메모리 사용량
htop

# 디스크 사용량
df -h

# 프로세스 확인
ps aux | grep gunicorn
```

#### 로그 로테이션 설정

```bash
sudo nano /etc/logrotate.d/essay-afs
```

```
/var/log/essay-afs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        systemctl reload essay-afs > /dev/null 2>&1 || true
    endscript
}
```

### 8.4 성능 최적화

#### Gunicorn 워커 수 조정

```bash
# CPU 코어 수 확인
nproc

# 권장 워커 수: (2 x CPU 코어 수) + 1
# 예: 2코어 → 5 workers
sudo nano /etc/systemd/system/essay-afs.service
```

`--workers 4`를 적절한 값으로 변경 후:

```bash
sudo systemctl daemon-reload
sudo systemctl restart essay-afs
```

---

## 9️⃣ 트러블슈팅

### 문제 1: 502 Bad Gateway

**원인**: Gunicorn 서비스가 실행되지 않음

**해결**:

```bash
sudo systemctl status essay-afs
sudo journalctl -u essay-afs -n 50
sudo systemctl restart essay-afs
```

### 문제 2: CORS 에러

**원인**: CORS 설정에 Vercel 도메인이 없음

**해결**:

```bash
nano ~/essay-afs/backend/.env
```

`CORS_ORIGINS`에 Vercel URL 추가 후:

```bash
sudo systemctl restart essay-afs
```

### 문제 3: 데이터베이스 파일 권한 문제

**원인**: SQLite 파일 또는 디렉토리 권한 문제

**해결**:

```bash
# db 디렉토리 및 파일 권한 확인
ls -la ~/essay-afs/db/

# 권한 수정
chmod 755 ~/essay-afs/db
chmod 644 ~/essay-afs/db/essay_afs.db
chown ubuntu:ubuntu ~/essay-afs/db/essay_afs.db
```

### 문제 4: SSL 인증서 갱신 실패

**원인**: Certbot 자동 갱신 실패

**해결**:

```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

---

## 📊 배포 체크리스트

### 프론트엔드 (Vercel)

- [ ] GitHub 저장소 연결
- [ ] 환경 변수 설정 (`NEXT_PUBLIC_API_URL`)
- [ ] 배포 성공 확인
- [ ] 커스텀 도메인 설정 (선택사항)

### 백엔드 (Ubuntu 서버)

- [ ] 서버 초기 설정 완료
- [ ] 프로젝트 클론 및 의존성 설치
- [ ] 환경 변수 설정 (`.env`)
- [ ] SQLite 데이터베이스 초기화
- [ ] Systemd 서비스 등록 및 시작
- [ ] Nginx 리버스 프록시 설정
- [ ] SSL 인증서 발급
- [ ] 방화벽 설정
- [ ] API 테스트 성공

### 보안

- [ ] `.env` 파일 권한 설정 (`chmod 600 .env`)
- [ ] SECRET_KEY 강력하게 설정
- [ ] SSH 키 기반 인증 설정
- [ ] 불필요한 포트 차단
- [ ] 정기 백업 설정

### 모니터링

- [ ] 로그 확인 가능
- [ ] 자동 재시작 설정
- [ ] 백업 자동화
- [ ] 로그 로테이션 설정

---

## 📚 추가 리소스

- [Vercel 문서](https://vercel.com/docs)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)

---

1. **서버 접속 및 프로젝트 클론**

   ```bash
   git clone https://github.com/jy9307/essay-afs.git
   cd essay-afs/backend
   ```

2. **Python 환경 설정**

   ```bash
   python3 -m venv env
   source env/bin/activate
   pip install -r requirements.txt
   ```

3. **환경 변수 설정**

   ```bash
   nano .env
   # OPENAI_API_KEY, SECRET_KEY 등 설정
   ```

4. **Gunicorn + Uvicorn으로 실행**

   ```bash
   pip install gunicorn
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

5. **Systemd 서비스 등록 (자동 시작)**

   ```bash
   sudo nano /etc/systemd/system/essay-afs.service
   ```

   ```ini
   [Unit]
   Description=Essay-AFS FastAPI
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/essay-afs/backend
   Environment="PATH=/home/ubuntu/essay-afs/backend/env/bin"
   ExecStart=/home/ubuntu/essay-afs/backend/env/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable essay-afs
   sudo systemctl start essay-afs
   sudo systemctl status essay-afs
   ```

6. **Nginx 리버스 프록시 설정**

   ```bash
   sudo nano /etc/nginx/sites-available/essay-afs
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/essay-afs /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **SSL 인증서 설정 (Let's Encrypt)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

#### 방법 2: Docker 배포

1. **Dockerfile 생성** (`backend/Dockerfile`)

   ```dockerfile
   FROM python:3.10-slim

   WORKDIR /app

   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   COPY . .

   EXPOSE 8000

   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. **Docker 이미지 빌드 및 실행**
   ```bash
   docker build -t essay-afs-backend .
   docker run -d -p 8000:8000 --env-file .env essay-afs-backend
   ```

#### 방법 3: Railway, Render 등 PaaS

1. **Railway 배포**

   - Railway 계정 생성
   - GitHub 저장소 연결
   - `backend` 디렉토리 선택
   - 환경 변수 설정 (OPENAI_API_KEY 등)
   - 자동 배포

2. **Render 배포**
   - Render 계정 생성
   - New Web Service 선택
   - GitHub 저장소 연결
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - 환경 변수 설정

### 데이터베이스 배포

#### 개발/소규모: SQLite (현재 설정)

- 파일 기반 DB로 간단한 배포
- `db/essay_afs.db` 파일 백업 필요

#### 프로덕션/대규모: PostgreSQL 권장

1. **PostgreSQL 설치 또는 클라우드 서비스 사용**

   - AWS RDS, Google Cloud SQL, Supabase 등

2. **의존성 추가**

   ```bash
   pip install asyncpg psycopg2-binary
   ```

3. **database.py 수정**

   ```python
   SQLALCHEMY_DATABASE_URL = "postgresql+asyncpg://user:password@host:5432/dbname"
   ```

4. **환경 변수로 관리**
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname
   ```

### CORS 설정 (중요!)

프론트엔드와 백엔드가 다른 도메인에 배포된 경우, `backend/main.py`에서 CORS 설정:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # 개발
        "https://your-frontend-domain.vercel.app",  # 프로덕션
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🔧 개발 및 운영 팁

### 프론트엔드 개발

- **Hot Reload**: `npm run dev`로 실행 시 자동 새로고침
- **타입 체크**: TypeScript로 타입 안정성 확보
- **API 함수**: `app/lib/api.ts`에 모든 API 호출 함수 정의
- **인증**: `app/hooks/auth.ts`에서 토큰 관리

### 백엔드 개발

- **자동 리로드**: `uvicorn main:app --reload`
- **API 문서**: http://localhost:8000/docs (Swagger UI)
- **대화형 API**: http://localhost:8000/redoc
- **DB 마이그레이션**: 모델 변경 시 `init_db.py` 실행

### 디버깅

- **프론트엔드**: 브라우저 개발자 도구 Console
- **백엔드**: FastAPI 로그 확인 (`echo=True` 설정 시 SQL 쿼리 출력)
- **네트워크**: Axios 요청/응답 확인

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 👥 기여

버그 리포트, 기능 제안, Pull Request를 환영합니다!

## 📧 문의

프로젝트 관련 문의사항은 GitHub Issues를 이용해주세요.

---

**Essay-AFS** - AI 기반 에세이 피드백 시스템
