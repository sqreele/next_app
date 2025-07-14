from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import schemas, models, dependencies
from sqlalchemy.future import select

router = APIRouter(prefix="/topics", tags=["topics"])

@router.get("/", response_model=List[schemas.Topic])
async def list_topics(db: AsyncSession = Depends(dependencies.get_db)):
    result = await db.execute(select(models.Topic))
    return result.scalars().all()

@router.get("/{topic_id}", response_model=schemas.Topic)
async def get_topic(topic_id: int, db: AsyncSession = Depends(dependencies.get_db)):
    topic = await db.get(models.Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@router.post("/", response_model=schemas.Topic)
async def create_topic(topic: schemas.TopicCreate, db: AsyncSession = Depends(dependencies.get_db)):
    db_topic = models.Topic(title=topic.title)
    db.add(db_topic)
    await db.commit()
    await db.refresh(db_topic)
    return db_topic

@router.put("/{topic_id}", response_model=schemas.Topic)
async def update_topic(topic_id: int, topic: schemas.TopicCreate, db: AsyncSession = Depends(dependencies.get_db)):
    db_topic = await db.get(models.Topic, topic_id)
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db_topic.title = topic.title
    await db.commit()
    await db.refresh(db_topic)
    return db_topic

@router.delete("/{topic_id}")
async def delete_topic(topic_id: int, db: AsyncSession = Depends(dependencies.get_db)):
    db_topic = await db.get(models.Topic, topic_id)
    if not db_topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    await db.delete(db_topic)
    await db.commit()
    return {"message": "Topic deleted"} 