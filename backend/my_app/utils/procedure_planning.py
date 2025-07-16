# ==============================================================================
# File: backend/my_app/utils/procedure_planning.py
# Description: Procedure scheduling and planning utilities
# ==============================================================================
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
from dateutil.relativedelta import relativedelta
from .. import models, schemas
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

class ProcedurePlanner:
    
    @staticmethod
    def calculate_next_due_date(last_date: date, frequency: str) -> Optional[date]:
        """Calculate next due date based on frequency"""
        frequency_map = {
            "Daily": timedelta(days=1),
            "Weekly": timedelta(weeks=1),
            "Bi-Weekly": timedelta(weeks=2),
            "Monthly": relativedelta(months=1),
            "Quarterly": relativedelta(months=3),
            "Semi-Annual": relativedelta(months=6),
            "Annual": relativedelta(years=1),
            "Yearly": relativedelta(years=1)
        }
        
        if frequency not in frequency_map:
            return None
            
        delta = frequency_map[frequency]
        
        # Handle relativedelta vs timedelta
        if isinstance(delta, relativedelta):
            return last_date + delta
        else:
            return last_date + delta
    
    @staticmethod
    def generate_schedule(
        procedure: models.Procedure,
        start_date: date,
        end_date: date,
        machines: List[models.Machine] = None
    ) -> List[Dict]:
        """Generate scheduled executions for a procedure"""
        
        if not procedure.frequency:
            return []
            
        schedule = []
        current_date = start_date
        
        # If no machines specified, use all machines assigned to procedure
        target_machines = machines or procedure.machines
        
        # Generate schedule for each machine
        for machine in target_machines:
            current_date = start_date
            
            while current_date <= end_date:
                schedule.append({
                    "procedure_id": procedure.id,
                    "procedure_title": procedure.title,
                    "machine_id": machine.id,
                    "machine_name": machine.name,
                    "scheduled_date": current_date,
                    "frequency": procedure.frequency,
                    "estimated_duration": procedure.estimated_duration_minutes or 30
                })
                
                # Calculate next occurrence
                next_date = ProcedurePlanner.calculate_next_due_date(current_date, procedure.frequency)
                if not next_date or next_date > end_date:
                    break
                current_date = next_date
        
        return schedule
    
    @staticmethod
    async def create_maintenance_plan(
        db: AsyncSession,
        start_date: date,
        end_date: date,
        property_id: Optional[int] = None,
        machine_ids: Optional[List[int]] = None
    ) -> Dict:
        """Create a comprehensive maintenance plan"""
        
        # Get all active procedures
        query = select(models.Procedure).where(models.Procedure.is_active == True)
        
        if machine_ids:
            query = query.join(models.machine_procedure_association).where(
                models.machine_procedure_association.c.machine_id.in_(machine_ids)
            )
        
        result = await db.execute(query)
        procedures = result.scalars().all()
        
        # Generate schedule for each procedure
        full_schedule = []
        summary = {
            "total_procedures": len(procedures),
            "total_executions": 0,
            "by_frequency": {},
            "by_machine": {},
            "by_week": {}
        }
        
        for procedure in procedures:
            # Load machines for this procedure
            await db.refresh(procedure, ['machines'])
            
            # Filter machines if property_id specified
            machines = procedure.machines
            if property_id:
                machines = [m for m in machines if m.property_id == property_id]
            
            schedule = ProcedurePlanner.generate_schedule(
                procedure, start_date, end_date, machines
            )
            
            full_schedule.extend(schedule)
            
            # Update summary
            summary["total_executions"] += len(schedule)
            summary["by_frequency"][procedure.frequency] = summary["by_frequency"].get(procedure.frequency, 0) + len(schedule)
            
            for item in schedule:
                machine_name = item["machine_name"]
                summary["by_machine"][machine_name] = summary["by_machine"].get(machine_name, 0) + 1
                
                # Group by week
                week_key = item["scheduled_date"].strftime("%Y-W%U")
                summary["by_week"][week_key] = summary["by_week"].get(week_key, 0) + 1
        
        # Sort schedule by date
        full_schedule.sort(key=lambda x: x["scheduled_date"])
        
        return {
            "schedule": full_schedule,
            "summary": summary,
            "period": {
                "start_date": start_date,
                "end_date": end_date,
                "total_days": (end_date - start_date).days
            }
        }
