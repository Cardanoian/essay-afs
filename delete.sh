#!/bin/bash

# 스크립트 실행 중 오류가 발생하면 즉시 중단
set -e

echo "Docker Compose 스택을 중지하고 관련 리소스를 삭제합니다..."
# docker-compose.yml이 있는 경우에만 실행
if [ -f docker-compose.yml ]; then
    docker-compose down --volumes --remove-orphans
fi

echo "모든 실행 중인 Docker 컨테이너를 중지하고 삭제합니다..."
# 실행 중인 컨테이너가 있을 경우에만 실행
if [ ! -z "$(docker ps -q)" ]; then
    docker stop $(docker ps -q)
fi

echo "모든 Docker 컨테이너를 삭제합니다..."
# 컨테이너가 있을 경우에만 실행
if [ ! -z "$(docker ps -aq)" ]; then
    docker rm $(docker ps -aq)
fi

echo "모든 Docker 이미지를 삭제합니다..."
# 이미지가 있을 경우에만 실행
if [ ! -z "$(docker images -q)" ]; then
    docker rmi -f $(docker images -q)
fi

echo "사용하지 않는 Docker 볼륨을 삭제합니다..."
docker volume prune -f

echo "사용하지 않는 Docker 네트워크를 삭제합니다..."
docker network prune -f

echo "Docker 시스템 전체를 정리합니다 (빌드 캐시, 로그 등)..."
docker system prune -af

echo "프로젝트 빌드 캐시와 의존성 파일을 삭제합니다..."
rm -rf .next
rm -rf node_modules

echo "모든 정리 작업이 완료되었습니다."
