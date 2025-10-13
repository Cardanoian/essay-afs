#!/bin/bash

# Essay-AFS 백엔드 배포 스크립트
# 사용법: sudo ./deploy-back.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

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

print_banner() {
    echo -e "${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║         백엔드 배포 스크립트 (Backend Only)         ║"
    echo "║                                                       ║"
    echo "║        Domain: https://essay-server.gbeai.net         ║"
    echo "║        프론트엔드는 그대로 유지됩니다                ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "이 스크립트는 root 권한이 필요합니다. 'sudo ./deploy-back.sh'로 실행해주세요."
        exit 1
    fi
}

check_containers() {
    log_info "컨테이너 상태 확인 중..."
    
    if ! docker compose ps | grep -q "essay-afs-frontend"; then
        log_error "프론트엔드 컨테이너가 실행 중이지 않습니다."
        log_info "먼저 'sudo ./deploy.sh'로 전체 배포를 실행해주세요."
        exit 1
    fi
    
    log_success "프론트엔드 컨테이너가 실행 중입니다."
}

deploy_backend() {
    log_info "백엔드 배포를 시작합니다..."
    echo ""
    
    log_info "백엔드 이미지 빌드 중... (1-2분 소요)"
    docker compose build fastapi
    
    log_info "백엔드 컨테이너 재시작 중..."
    log_warning "프론트엔드는 영향받지 않습니다."
    
    # --no-deps: 의존성 서비스(프론트엔드, nginx 등)를 재시작하지 않음
    docker compose up -d --no-deps fastapi
    
    log_success "백엔드 컨테이너 재시작 완료!"
}

health_check() {
    log_info "백엔드 헬스 체크 중..."
    
    for i in {1..12}; do
        if curl -f http://localhost:3050/health &> /dev/null; then
            log_success "백엔드 서버가 정상적으로 실행 중입니다!"
            break
        fi
        
        if [ $i -eq 12 ]; then
            log_error "백엔드 서버 시작 실패"
            log_info "로그 확인: docker compose logs fastapi"
            exit 1
        fi
        
        log_info "백엔드 서버 시작 대기 중... ($i/12)"
        sleep 5
    done
    
    # HTTPS 테스트
    source .env 2>/dev/null || true
    BACKEND_DOMAIN=${BACKEND_DOMAIN:-essay-server.gbeai.net}
    
    sleep 3
    if curl -f -k https://$BACKEND_DOMAIN/health &> /dev/null; then
        log_success "HTTPS 접속 성공!"
    else
        log_warning "HTTPS 접속 실패 (Nginx 재시작이 필요할 수 있습니다)"
        log_info "Nginx 재시작: docker compose restart nginx"
    fi
}

print_info() {
    source .env 2>/dev/null || true
    BACKEND_DOMAIN=${BACKEND_DOMAIN:-essay-server.gbeai.net}
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}║           🎉 백엔드 배포 완료! 🎉                   ║${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📍 접속 정보:${NC}"
    echo -e "   - 백엔드 API: ${GREEN}https://$BACKEND_DOMAIN${NC}"
    echo -e "   - API 문서: ${GREEN}https://$BACKEND_DOMAIN/docs${NC}"
    echo -e "   - 헬스 체크: ${GREEN}https://$BACKEND_DOMAIN/health${NC}"
    echo ""
    echo -e "${BLUE}🔧 유용한 명령어:${NC}"
    echo -e "   - 백엔드 로그: ${YELLOW}docker compose logs -f fastapi${NC}"
    echo -e "   - 컨테이너 상태: ${YELLOW}docker compose ps${NC}"
    echo -e "   - Nginx 재시작: ${YELLOW}docker compose restart nginx${NC}"
    echo ""
    echo -e "${BLUE}ℹ️  참고:${NC}"
    echo -e "   - 프론트엔드는 영향받지 않았습니다."
    echo -e "   - 데이터베이스 변경사항이 있다면 마이그레이션을 확인하세요."
    echo ""
}

main() {
    print_banner
    check_root
    check_containers
    deploy_backend
    health_check
    print_info
    
    log_success "백엔드 배포가 완료되었습니다! 🚀"
}

main
