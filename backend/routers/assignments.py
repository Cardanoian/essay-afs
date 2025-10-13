from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from routers.auth import get_current_user
from datetime import datetime

import crud, schemas, database, models

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("/class/{class_id}", response_model=List[schemas.AssignmentGet])
async def list_assignments_by_class(
    class_id: int,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
):
    return await crud.get_assignments_by_class(db, class_id, user.id)

@router.get("/{assignment_id}", response_model=schemas.AssignmentGet)
async def get_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.Assignment).where(models.Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

@router.post("/", response_model=schemas.AssignmentGet)
async def create_assignment(
    assignment: schemas.AssignmentBase,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
):
    assignment_data = schemas.AssignmentCreate(**assignment.dict(), user_id=user.id)
    return await crud.create_assignment(db, assignment_data)

@router.put("/{assignment_id}", response_model=schemas.AssignmentGet)
async def update_assignment(
    assignment_id: int,
    assignment_update: schemas.AssignmentUpdate,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
):
    assignment = await crud.update_assignment(db, assignment_id, assignment_update, user.id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
):
    success = await crud.delete_assignment(db, assignment_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted successfully"}

@router.patch("/{assignment_id}/status", response_model=schemas.AssignmentGet)
async def update_assignment_status(
    assignment_id: int,
    status: str = Body(..., embed=True),
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
):
    from schemas import AssignmentStatus
    try:
        status_enum = AssignmentStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")

    started_at = None
    completed_at = None
    if status_enum == AssignmentStatus.in_progress:
        started_at = datetime.utcnow()
    elif status_enum == AssignmentStatus.completed:
        completed_at = datetime.utcnow()

    assignment = await crud.update_assignment_status(db, assignment_id, status_enum, started_at, completed_at)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.post("/start_assignment")
async def start_assignment_for_class(
    request: schemas.AssignmentStartRequest,
    db: AsyncSession = Depends(database.get_db)
):
    print("요청 :", request)
    created_count = await crud.start_assignment_for_class(
        db, request.assignment_id, 
        request.class_id
    )
    return {"created": created_count}
