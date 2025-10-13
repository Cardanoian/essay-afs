from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import crud, schemas, database
import models
from crud import start_assignment_for_class as crud_start_assignment_for_class
from typing import List

import database

router = APIRouter(prefix="/submission", tags=["submission"])


@router.get("/a", response_model=List[schemas.ASubmissionGet])
async def get_submission(
    assignment_id: int = Query(None),
    student_id: int = Query(None),
    db: AsyncSession = Depends(database.get_db)
):
    if assignment_id is None and student_id is None:
        raise HTTPException(status_code=400, detail="assignment_id 또는 student_id 중 하나는 필요합니다.")
    
    return await crud.get_submissions_by_aid(db, assignment_id, student_id)

@router.get("/e", response_model=List[schemas.ESubmissionGet])
async def get_submission_by_aid(
    evaluation_id: int = Query(None),
    student_id: int = Query(None),
    db: AsyncSession = Depends(database.get_db)
):
    if evaluation_id is None and student_id is None:
        raise HTTPException(status_code=400, detail="evaluation_id 또는 student_id 중 하나는 필요합니다.")
    
    return await crud.get_submissions_by_eid(db, evaluation_id, student_id)

@router.patch("/update_assign_submission")
async def update_assign_submission(
    submission_info: schemas.ASubmissionUpdate,
    db: AsyncSession = Depends(database.get_db)
):

    updated = await crud.update_assign_submission(
        db, 
        submission_info.dict(exclude_unset=True)
        )
    return {"updated_id": updated.id}

@router.patch("/update_eval_submission")
async def update_submission(
    submission_info: schemas.ESubmissionUpdate,
    db: AsyncSession = Depends(database.get_db)
):

    updated = await crud.update_eval_submission(
        db, 
        submission_info.dict(exclude_unset=True)
        )
    return {"updated_id": updated.id}

@router.patch("/patch_feedback")
async def patch_feedback(
    patch_info: schemas.SubmissionFeedbackPatch,
    db: AsyncSession = Depends(database.get_db)
):
    updated = await crud.patch_submission_feedback(
        db,
        patch_info
    )
    return {"updated_id": updated.id}
