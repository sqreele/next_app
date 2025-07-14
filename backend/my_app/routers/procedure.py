from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import schemas, models, dependencies
from sqlalchemy.future import select

router = APIRouter(prefix="/procedures", tags=["procedures"])

@router.get("/", response_model=List[schemas.Procedure])
async def list_procedures(db: AsyncSession = Depends(dependencies.get_db)):
    result = await db.execute(select(models.Procedure))
    return result.scalars().all()

@router.get("/{procedure_id}", response_model=schemas.Procedure)
async def get_procedure(procedure_id: int, db: AsyncSession = Depends(dependencies.get_db)):
    procedure = await db.get(models.Procedure, procedure_id)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return procedure

@router.post("/", response_model=schemas.Procedure)
async def create_procedure(procedure: schemas.ProcedureCreate, db: AsyncSession = Depends(dependencies.get_db)):
    db_procedure = models.Procedure(title=procedure.title, remark=procedure.remark, machine_id=procedure.machine_id)
    db.add(db_procedure)
    await db.commit()
    await db.refresh(db_procedure)
    return db_procedure

@router.put("/{procedure_id}", response_model=schemas.Procedure)
async def update_procedure(procedure_id: int, procedure: schemas.ProcedureCreate, db: AsyncSession = Depends(dependencies.get_db)):
    db_procedure = await db.get(models.Procedure, procedure_id)
    if not db_procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    db_procedure.title = procedure.title
    db_procedure.remark = procedure.remark
    db_procedure.machine_id = procedure.machine_id
    await db.commit()
    await db.refresh(db_procedure)
    return db_procedure

@router.delete("/{procedure_id}")
async def delete_procedure(procedure_id: int, db: AsyncSession = Depends(dependencies.get_db)):
    db_procedure = await db.get(models.Procedure, procedure_id)
    if not db_procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    await db.delete(db_procedure)
    await db.commit()
    return {"message": "Procedure deleted"} 