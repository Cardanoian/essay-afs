#!/bin/bash

echo "======================================"
echo "  데이터베이스 마이그레이션 스크립트"
echo "======================================"
echo ""

# 현재 디렉토리 확인
if [ ! -f "migration_remove_grade.py" ]; then
    echo "❌ 오류: backend 디렉토리에서 실행해주세요."
    echo "   현재 위치: $(pwd)"
    exit 1
fi

# Python 가상환경 확인 (선택사항)
if [ -d "../venv" ]; then
    echo "🔧 가상환경 활성화 중..."
    source ../venv/bin/activate
fi

# 마이그레이션 실행
echo "🚀 마이그레이션 실행 중..."
echo ""

python migration_remove_grade.py

# 실행 결과 확인
if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✅ 마이그레이션이 성공적으로 완료되었습니다!"
    echo "======================================"
    echo ""
    echo "📌 다음 단계:"
    echo "   1. 애플리케이션을 재시작하세요"
    echo "   2. 학급 관리 기능을 테스트하세요"
    echo ""
else
    echo ""
    echo "======================================"
    echo "❌ 마이그레이션 실패"
    echo "======================================"
    echo ""
    echo "⚠️  문제 해결 방법:"
    echo "   1. 데이터베이스 파일 권한 확인"
    echo "   2. 백업 테이블(classes_backup) 수동 삭제"
    echo "   3. 로그 확인 후 재시도"
    echo ""
    exit 1
fi
