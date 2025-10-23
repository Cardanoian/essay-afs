#!/bin/bash

# Essay-AFS 통합 배포 스크립트 (프론트엔드 + 백엔드)
# 사용법: sudo ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

# 배너 출력
print_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║     Essay-AFS 통합 배포 스크립트 (Full Stack)       ║"
    echo "║                                                       ║"
    echo "║     Frontend: https://essay.gbeai.net                ║"
    echo "║     Backend:  https://essay-server.gbeai.net         ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Root 권한 확인
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "이 스크립트는 root 권한이 필요합니다. 'sudo ./deploy.sh'로 실행해주세요."
        exit 1
    fi
    log_success "Root 권한 확인 완료"
}

# .env 파일 확인
check_env_file() {
    log_step ".env 파일 확인 중..."
    
    if [ ! -f .env ]; then
        log_warning ".env 파일이 없습니다. .env.example을 복사합니다."
        cp .env.example .env
        log_error ".env 파일을 생성했습니다. 파일을 열어서 필수 환경 변수를 설정한 후 다시 실행해주세요."
        log_info "필수 설정 항목:"
        log_info "  - OPENAI_API_KEY: OpenAI API 키"
        log_info "  - SECRET_KEY: JWT 시크릿 키"
        log_info "  - EMAIL: SSL 인증서 발급용 이메일"
        exit 1
    fi
    
    # 필수 환경 변수 확인
    source .env
    
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-api-key-here" ]; then
        log_error "OPENAI_API_KEY가 설정되지 않았습니다."
        exit 1
    fi
    
    if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "your_very_secure_secret_key_here" ]; then
        log_error "SECRET_KEY가 설정되지 않았습니다."
        exit 1
    fi
    
    if [ -z "$EMAIL" ] || [ "$EMAIL" = "your-email@example.com" ]; then
        log_error "EMAIL이 설정되지 않았습니다."
        exit 1
    fi
    
    log_success ".env 파일 확인 완료"
}

# Docker 설치 확인 및 설치
install_docker() {
    log_step "Docker 설치 확인 중..."
    
    if command -v docker &> /dev/null; then
        log_success "Docker가 이미 설치되어 있습니다. ($(docker --version))"
    else
        log_warning "Docker가 설치되어 있지 않습니다. 설치를 시작합니다..."
        
        apt-get update
        apt-get install -y ca-certificates curl gnupg lsb-release
        
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        log_success "Docker 설치 완료!"
    fi
    
    if docker compose version &> /dev/null; then
        log_success "Docker Compose가 설치되어 있습니다."
    else
        log_error "Docker Compose가 설치되지 않았습니다."
        exit 1
    fi
}

# 필요한 디렉토리 생성
create_directories() {
    log_step "필요한 디렉토리 생성 중..."
    
    mkdir -p backend/db
    mkdir -p backend/logs
    mkdir -p logs/nginx
    mkdir -p certbot/conf
    mkdir -p certbot/www
    
    log_success "디렉토리 생성 완료"
}

# SSL 인증서 발급 (두 도메인)
setup_ssl() {
    log_step "SSL 인증서 설정 확인 중..."
    
    source .env
    FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-essay.gbeai.net}
    BACKEND_DOMAIN=${BACKEND_DOMAIN:-essay-server.gbeai.net}
    
    # 두 도메인 모두 인증서 확인
    if [ -d "certbot/conf/live/$FRONTEND_DOMAIN" ] && [ -d "certbot/conf/live/$BACKEND_DOMAIN" ]; then
        log_success "SSL 인증서가 이미 존재합니다."
        return 0
    fi
    
    log_warning "SSL 인증서 발급을 시작합니다..."
    log_info "프론트엔드: $FRONTEND_DOMAIN"
    log_info "백엔드: $BACKEND_DOMAIN"
    log_info "이메일: $EMAIL"
    
    # 임시 Nginx 설정 생성
    cat > nginx-temp.conf << EOF
server {
    listen 80;
    server_name $FRONTEND_DOMAIN $BACKEND_DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'SSL 인증서 발급 중...';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # 임시 Nginx 컨테이너 실행
    log_info "임시 Nginx 컨테이너 시작 중..."
    docker run -d --name nginx-temp \
        -p 80:80 \
        -v $(pwd)/nginx-temp.conf:/etc/nginx/conf.d/default.conf:ro \
        -v $(pwd)/certbot/www:/var/www/certbot:ro \
        nginx:alpine
    
    sleep 5
    
    # 프론트엔드 도메인 인증서 발급
    log_info "프론트엔드 도메인 인증서 발급 중..."
    docker run --rm \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        -v $(pwd)/certbot/www:/var/www/certbot \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $FRONTEND_DOMAIN
    
    # 백엔드 도메인 인증서 발급
    log_info "백엔드 도메인 인증서 발급 중..."
    docker run --rm \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        -v $(pwd)/certbot/www:/var/www/certbot \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $BACKEND_DOMAIN
    
    # 임시 Nginx 컨테이너 중지 및 삭제
    docker stop nginx-temp
    docker rm nginx-temp
    rm nginx-temp.conf
    
    if [ -d "certbot/conf/live/$FRONTEND_DOMAIN" ] && [ -d "certbot/conf/live/$BACKEND_DOMAIN" ]; then
        log_success "SSL 인증서 발급 완료!"
    else
        log_error "SSL 인증서 발급 실패. DNS 설정을 확인해주세요."
        exit 1
    fi
}

# SSL 자동 갱신 설정
setup_ssl_auto_renewal() {
    log_step "SSL 인증서 자동 갱신 설정 중..."
    
    # 갱신 스크립트 생성
    cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
cd $(dirname $(readlink -f $0))/../../essay-afs || exit
docker compose run --rm certbot renew --quiet
docker compose exec nginx nginx -s reload
echo "$(date): SSL 인증서 갱신 확인 완료" >> /var/log/ssl-renewal.log
EOF
    
    chmod +x /usr/local/bin/renew-ssl.sh
    
    # Cron 작업 확인
    if crontab -l 2>/dev/null | grep -q "renew-ssl.sh"; then
        log_success "SSL 자동 갱신이 이미 설정되어 있습니다."
    else
        (crontab -l 2>/dev/null; echo "0 2,14 * * * /usr/local/bin/renew-ssl.sh") | crontab -
        log_success "SSL 자동 갱신 Cron 작업 추가 완료"
        log_info "갱신 스케줄: 매일 새벽 2시, 오후 2시"
    fi
}

# 기존 컨테이너 중지
stop_existing_containers() {
    log_step "기존 컨테이너 확인 중..."
    
    if docker compose ps | grep -q "essay-afs"; then
        log_warning "기존 컨테이너를 중지합니다..."
        docker compose down
        log_success "기존 컨테이너 중지 완료"
    else
        log_info "실행 중인 컨테이너가 없습니다."
    fi
}

# Docker 캐시/이미지/빌드 캐시/네트워크 정리 (DB만 유지)
clean_docker_cache() {
    log_step "Docker 캐시/이미지/빌드 캐시/네트워크 정리 중 (DB만 유지)..."
    docker compose down --volumes --remove-orphans
    docker system prune -af --volumes
    docker builder prune -af
    log_success "Docker 캐시/이미지/빌드 캐시/네트워크 정리 완료 (DB만 유지)"
}

# Docker 이미지 빌드 및 컨테이너 시작
start_containers() {
    log_step "Docker 이미지 빌드 및 컨테이너 시작 중..."
    
    log_info "프론트엔드 빌드 중... (5-10분 소요)"
    log_info "백엔드 빌드 중... (2-3분 소요)"
    
    # 이미지 빌드
    docker compose build --no-cache
    
    # 컨테이너 시작
    docker compose up -d
    
    log_success "컨테이너 시작 완료!"
}

# 헬스 체크
health_check() {
    log_step "서비스 헬스 체크 중..."
    
    # 백엔드 헬스 체크
    log_info "백엔드 서버 확인 중..."
    for i in {1..12}; do
        if curl -f http://localhost:3050/health &> /dev/null; then
            log_success "백엔드 서버가 정상적으로 실행 중입니다!"
            break
        fi
        
        if [ $i -eq 12 ]; then
            log_error "백엔드 서버 시작 실패"
            exit 1
        fi
        
        log_info "백엔드 서버 시작 대기 중... ($i/12)"
        sleep 5
    done
    
    # 프론트엔드 헬스 체크
    log_info "프론트엔드 서버 확인 중..."
    for i in {1..12}; do
        if curl -f http://localhost:3000 &> /dev/null; then
            log_success "프론트엔드 서버가 정상적으로 실행 중입니다!"
            break
        fi
        
        if [ $i -eq 12 ]; then
            log_error "프론트엔드 서버 시작 실패"
            exit 1
        fi
        
        log_info "프론트엔드 서버 시작 대기 중... ($i/12)"
        sleep 5
    done
    
    # HTTPS 접속 테스트
    source .env
    FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-essay.gbeai.net}
    BACKEND_DOMAIN=${BACKEND_DOMAIN:-essay-server.gbeai.net}
    
    log_info "HTTPS 접속 테스트 중..."
    sleep 5
    
    if curl -f -k https://$FRONTEND_DOMAIN &> /dev/null; then
        log_success "프론트엔드 HTTPS 접속 성공!"
    else
        log_warning "프론트엔드 HTTPS 접속 실패 (Nginx 로그 확인 필요)"
    fi
    
    if curl -f -k https://$BACKEND_DOMAIN/health &> /dev/null; then
        log_success "백엔드 HTTPS 접속 성공!"
    else
        log_warning "백엔드 HTTPS 접속 실패 (Nginx 로그 확인 필요)"
    fi
}

# 배포 정보 출력
print_deployment_info() {
    source .env
    FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-essay.gbeai.net}
    BACKEND_DOMAIN=${BACKEND_DOMAIN:-essay-server.gbeai.net}
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}║              🎉 배포 완료! 🎉                        ║${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📍 접속 정보:${NC}"
    echo -e "   - 프론트엔드: ${GREEN}https://$FRONTEND_DOMAIN${NC}"
    echo -e "   - 백엔드 API: ${GREEN}https://$BACKEND_DOMAIN${NC}"
    echo -e "   - API 문서: ${GREEN}https://$BACKEND_DOMAIN/docs${NC}"
    echo ""
    echo -e "${BLUE}🔧 유용한 명령어:${NC}"
    echo -e "   - 전체 로그: ${YELLOW}docker compose logs -f${NC}"
    echo -e "   - 프론트엔드 로그: ${YELLOW}docker compose logs -f frontend${NC}"
    echo -e "   - 백엔드 로그: ${YELLOW}docker compose logs -f fastapi${NC}"
    echo -e "   - 컨테이너 상태: ${YELLOW}docker compose ps${NC}"
    echo ""
    echo -e "${BLUE}🚀 부분 배포:${NC}"
    echo -e "   - 프론트엔드만: ${YELLOW}sudo ./deploy-front.sh${NC}"
    echo -e "   - 백엔드만: ${YELLOW}sudo ./deploy-back.sh${NC}"
    echo ""
    echo -e "${BLUE}🔐 보안:${NC}"
    echo -e "   - SSL 인증서는 자동으로 갱신됩니다."
    echo -e "   - .env 파일 권한: ${YELLOW}chmod 600 .env${NC}"
    echo ""
}

# 메인 실행 함수
main() {
    print_banner
    
    log_info "통합 배포를 시작합니다..."
    echo ""
    
    check_root
    check_env_file
    install_docker
    create_directories
    setup_ssl
    stop_existing_containers
    clean_docker_cache
    start_containers
    setup_ssl_auto_renewal
    health_check
    
    print_deployment_info
    
    log_success "모든 배포 과정이 완료되었습니다! 🚀"
}

# 스크립트 실행
main
