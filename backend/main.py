from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine
from models import Base

from routers import (
    auth,
    classes,
    students,
    assignments,
    submit,
    ai,
    analysis,
    evaluation,
)

from dotenv import load_dotenv

load_dotenv()


async def create_tables():
    """앱 시작 시 테이블 생성"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 테이블이 생성되었습니다!")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 생명주기 관리"""
    # 앱 시작 시 실행
    await create_tables()
    yield
    # 앱 종료 시 실행 (필요한 경우)
    print("🔄 앱이 종료됩니다...")


app = FastAPI(
    title="Essay Assistant API",
    description="에세이 도우미 백엔드 API",
    version="1.0.0",
    lifespan=lifespan,
)

import os

# CORS_ORIGINS 환경변수에서 중복/공백/빈 문자열 제거
origins = list(
    set(filter(None, [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",")]))
)

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router)
app.include_router(submit.router)
app.include_router(classes.router)
app.include_router(students.router)
app.include_router(assignments.router)
app.include_router(evaluation.router)
app.include_router(analysis.router)
app.include_router(ai.router)


@app.get("/")
def read_root():
    return {"message": "Essay Assistant FastAPI backend is running."}


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is running normally"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)  # 개발 시 자동 리로드
