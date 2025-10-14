from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException

import crud, schemas, database
from typing import List, Annotated
from routers.auth import get_current_user
import traceback

from io import StringIO

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(prefix="/students")


@router.get("/class/{class_id}")
async def list_students_by_class(
    class_id: int, db: AsyncSession = Depends(database.get_db)
):
    try:
        print(f"[GET] /class/{class_id}")
        return await crud.get_students_by_class(db, class_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"학생 목록 조회 실패: {str(e)}")


@router.post("/", response_model=schemas.StudentBase)
async def create_student(
    student: schemas.StudentBase,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    try:
        print(f"[POST] /students - 입력 데이터: {student}")
        student_data = schemas.StudentBase(**student.dict())
        return await crud.create_student(db, student_data)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"학생 생성 실패: {str(e)}")


@router.post("/upload")
async def upload_student(
    class_id: Annotated[int, Form()],
    file: Annotated[UploadFile, File()],
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    try:
        print(
            f"[POST] /students/upload - 업로드 시작 by user_id: {user.id}, class_id: {class_id}"
        )
        contents = await file.read()
        decoded = contents.decode("cp949")
        df = pd.read_csv(StringIO(decoded))

        print(f"CSV 첫 5줄:\n{df.head()}")

        for _, row in df.iterrows():
            student = schemas.StudentBase(
                number=int(row["number"]),
                name=row["name"],
                email=row["email"],
                class_id=class_id,
            )
            await crud.create_student(db, student)

        return {"message": f"{len(df)}명의 학생을 성공적으로 업로드했습니다."}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=400, detail=f"CSV 파싱 또는 저장 실패: {str(e)}"
        )


@router.post("/delete")
async def delete_student(
    student: schemas.StudentBase,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    try:
        print(f"[DELETE] 요청 - user_id: {user.id}, student: {student}")
        student_data = schemas.StudentBase(**student.dict())
        return await crud.delete_student(db, student_data)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"학생 삭제 실패: {str(e)}")
