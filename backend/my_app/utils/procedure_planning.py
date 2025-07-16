# ==============================================================================
# File: backend/my_app/utils/procedure_planning.py (NO EXTERNAL DEPENDENCIES)
# Description: Procedure scheduling and planning utilities
# ==============================================================================
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
from .. import models, schemas
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

class ProcedurePlanner:
    
    @staticmethod
    def calculate_next_due_date(last_date: date, frequency: str) -> Optional[date]:
        """Calculate next due date based on frequency using only built-in datetime"""
        
        if frequency == "Daily":
            return last_date + timedelta(days=1)
        elif frequency == "Weekly":
            return last_date + timedelta(weeks=1)
        elif frequency == "Bi-Weekly":
            return last_date + timedelta(weeks=2)
        elif frequency == "Monthly":
            # Handle month rollover manually
            year = last_date.year
            month = last_date.month + 1
            day = last_date.day
            
            if month > 12:
                year += 1
                month = 1
            
            # Handle day overflow (e.g., Jan 31 -> Feb 28)
            try:
                return date(year, month, day)
            except ValueError:
                # If day doesn't exist in target month, use last day of month
                if month == 2:
                    # February handling
                    if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
                        return date(year, month, 29)  # Leap year
                    else:
                        return date(year, month, 28)
                elif month in [4, 6, 9, 11]:
                    return date(year, month, 30)  # 30-day months
                else:
                    return date(year, month, 31)  # 31-day months
        
        elif frequency == "Quarterly":
            return ProcedurePlanner._add_months(last_date, 3)
        elif frequency == "Semi-Annual":
            return ProcedurePlanner._add_months(last_date, 6)
        elif frequency == "Annual" or frequency == "Yearly":
            return ProcedurePlanner._add_months(last_date, 12)
        else:
            return None
    
    @staticmethod
    def _add_months(start_date: date, months: int) -> date:
        """Add months to a date handling edge cases"""
        year = start_date.year
        month = start_date.month + months
        day = start_date.day
        
        # Handle year rollover
        while month > 12:
            year += 1
            month -= 12
        
        # Handle day overflow
        try:
            return date(year, month, day)
        except ValueError:
            # Use last day of the target month
            if month == 2:
                if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
                    return date(year, month, 29)
                else:
                    return date(year, month, 28)
            elif month in [4, 6, 9, 11]:
                return date(year, month, 30)
            else:
                return date(year, month, 31)
    
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
                    "estimated_duration": getattr(procedure, 'estimated_duration_minutes', 30)
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
        
        # Get all procedures with frequency set
        query = select(models.Procedure).where(
            models.Procedure.frequency.isnot(None),
            models.Procedure.frequency != ""
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
            
            if machine_ids:
                machines = [m for m in machines if m.id in machine_ids]
            
            if not machines:
                continue
                
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
