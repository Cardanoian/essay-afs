import asyncio
from database import engine
from models import Base

async def create_tables():
    """비동기로 테이블을 생성하는 함수"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 테이블이 성공적으로 생성되었습니다!")

if __name__ == "__main__":
    asyncio.run(create_tables())