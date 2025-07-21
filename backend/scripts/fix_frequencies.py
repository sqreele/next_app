# File: backend/my_app/scripts/fix_frequencies.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from my_app.models import Procedure, WorkOrder, Frequency
from my_app.dependencies import get_db

async def fix_invalid_frequencies(db: AsyncSession):
    async with db as session:
        await session.execute(
            update(Procedure)
            .where(Procedure.frequency == "Weekly ( 5-10 mins)")
            .values(frequency=Frequency.WEEKLY)
        )
        await session.execute(
            update(WorkOrder)
            .where(WorkOrder.frequency == "Weekly ( 5-10 mins)")
            .values(frequency=Frequency.WEEKLY)
        )
        await session.commit()
