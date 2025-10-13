from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import crud, schemas, database
from typing import List
from routers.auth import get_current_user

router = APIRouter(prefix="/classes", tags=["classes"])


@router.get("/", response_model=List[schemas.ClassGet])
async def list_classes(
    db: AsyncSession = Depends(database.get_db), 
    user=Depends(get_current_user)
):
    return await crud.get_classes(db, user.id)


@router.post("/", response_model=schemas.ClassBase)
async def create_class(
    class_info: schemas.ClassBase, 
    db: AsyncSession = Depends(database.get_db), 
    user=Depends(get_current_user)
):
    return await crud.create_class(db, class_info, user)

@router.put("/{class_id}", response_model=schemas.ClassGet)
async def update_class(
    class_id: int,
    class_update: schemas.ClassUpdate,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
):
    return await crud.update_class(db, class_id, class_update, user.id)

@router.delete("/{class_id}")
async def delete_class(
    class_id: int,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
):
    result = await crud.delete_class(db, class_id, user.id)
    return {"success": result}