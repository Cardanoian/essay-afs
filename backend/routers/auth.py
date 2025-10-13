from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from jose import JWTError, jwt
import datetime
import bcrypt

import crud, schemas, database
from models import User

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(database.get_db)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="토큰에 사용자 정보가 없습니다.")
        user_id = int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user

@router.post("/register", response_model=schemas.UserBase)
async def register(
    user: schemas.UserCreate, 
    db: AsyncSession = Depends(database.get_db)
    ):
    existing = await crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")
    return await crud.create_user(db, user)

@router.post("/login")
async def login(
    form: schemas.UserLogin, 
    db: AsyncSession = Depends(database.get_db)
    ):
    db_user = await crud.get_user_by_email(db, form.email)
    if not db_user or not bcrypt.checkpw(form.password.encode(), db_user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    payload = {
        "user_id": db_user.id,
        "email": db_user.email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "name": db_user.name,
            "school_level": db_user.school_level
        }
    }

# 기본 유저 정보 (관계 필드 제외)
@router.get("/me", response_model=schemas.UserGet)
async def get_user_info(    
    current_user: User = Depends(get_current_user)
    ):
    return current_user

# 관계 필드 포함한 유저 정보
@router.get("/me/full", response_model=schemas.UserGetWithRelations)
async def get_user_info_with_relations(
    db: AsyncSession = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
    ):
    # 관계 필드를 명시적으로 로드
    stmt = (
        select(User)
        .where(User.id == current_user.id)
        .options(
            selectinload(User.classes),
            selectinload(User.assignment),
            selectinload(User.evaluations)
        )
    )
    result = await db.execute(stmt)
    user_with_relations = result.scalar_one()
    
    return user_with_relations

@router.patch("/feedback_guide")
async def update_feedback_guide(
    update: schemas.UserFeedbackGuideUpdate,
    db: AsyncSession = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.feedback_guide = update.feedback_guide
    await db.commit()
    return {"message": "피드백 가이드가 성공적으로 업데이트되었습니다."}