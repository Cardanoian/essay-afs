from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from routers.auth import get_current_user
from datetime import datetime
import crud, schemas, database, models

router = APIRouter(prefix="/api/evaluation")


@router.get("/class/{class_id}", response_model=List[schemas.EvaluationGet])
async def list_evaluation_by_class(
    class_id: int,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    return await crud.get_evaluation_by_class(db, class_id, user.id)


@router.get("/{evaluation_id}", response_model=schemas.EvaluationGet)
async def get_evaluation(
    evaluation_id: int, db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Evaluation).where(models.Evaluation.id == evaluation_id)
    )
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation


@router.post("/", response_model=schemas.EvaluationGet)
async def create_evaluation(
    evaluation: schemas.EvaluationBase,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    evaluation_data = schemas.EvaluationCreate(**evaluation.dict(), user_id=user.id)
    return await crud.create_evaluation(db, evaluation_data)


@router.put("/{evaluation_id}", response_model=schemas.EvaluationGet)
async def update_evaluation(
    evaluation_id: int,
    evaluation_update: schemas.EvaluationUpdate,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    evaluation = await crud.update_evaluation(
        db, evaluation_id, evaluation_update, user.id
    )
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation


@router.delete("/{evaluation_id}")
async def delete_evaluation(
    evaluation_id: int,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    success = await crud.delete_evaluation(db, evaluation_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return {"message": "Evaluation deleted successfully"}


@router.patch("/{evaluation_id}/status", response_model=schemas.EvaluationGet)
async def update_evaluation_status(
    evaluation_id: int,
    status: str = Body(..., embed=True),
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user),
):
    try:
        status_enum = schemas.AssignmentStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")

    started_at = None
    completed_at = None
    if status_enum == schemas.AssignmentStatus.in_progress:
        started_at = datetime.utcnow()
    elif status_enum == schemas.AssignmentStatus.completed:
        completed_at = datetime.utcnow()

    evaluation = await crud.update_evaluation_status(
        db, evaluation_id, status_enum, started_at, completed_at
    )
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation


@router.post("/start_evaluation")
async def start_evaluation_for_class(
    request: schemas.EvaluationStartRequest, db: AsyncSession = Depends(database.get_db)
):
    created_count = await crud.start_evaluation_for_class(
        db, request.evaluation_id, request.class_id
    )
    return {"created": created_count}
