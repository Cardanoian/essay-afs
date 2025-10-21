"""
Grade 컬럼 제거 마이그레이션
- classes 테이블에서 grade 컬럼 제거
- 기존 데이터는 보존
"""

import asyncio
from sqlalchemy import text
from database import engine


async def migrate_remove_grade():
    """classes 테이블에서 grade 컬럼 제거"""
    print("🔄 마이그레이션 시작: grade 컬럼 제거")

    try:
        async with engine.begin() as conn:
            # 1. 기존 데이터 백업
            print("📦 1/5: 기존 데이터 백업 중...")
            await conn.execute(
                text(
                    """
                CREATE TABLE classes_backup AS 
                SELECT id, name, school_level, user_id 
                FROM classes
            """
                )
            )

            # 2. 기존 테이블 삭제
            print("🗑️  2/5: 기존 테이블 삭제 중...")
            await conn.execute(text("DROP TABLE classes"))

            # 3. 새 테이블 생성 (grade 없이)
            print("🏗️  3/5: 새 테이블 생성 중 (grade 컬럼 제외)...")
            await conn.execute(
                text(
                    """
                CREATE TABLE classes (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    school_level VARCHAR NOT NULL,
                    user_id INTEGER NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """
                )
            )

            # 4. 데이터 복원
            print("📥 4/5: 데이터 복원 중...")
            await conn.execute(
                text(
                    """
                INSERT INTO classes (id, name, school_level, user_id)
                SELECT id, name, school_level, user_id 
                FROM classes_backup
            """
                )
            )

            # 5. 백업 테이블 삭제
            print("🧹 5/5: 백업 테이블 정리 중...")
            await conn.execute(text("DROP TABLE classes_backup"))

        print("✅ 마이그레이션 완료: grade 컬럼이 성공적으로 제거되었습니다!")
        return True

    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        print("⚠️  백업 테이블(classes_backup)이 남아있을 수 있습니다.")
        return False


if __name__ == "__main__":
    success = asyncio.run(migrate_remove_grade())
    exit(0 if success else 1)
