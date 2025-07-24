"""Add enhanced work order fields for detailed job creation

Revision ID: 2a3b4c5d6e7f
Revises: 1d4701d18bc1
Create Date: 2025-01-24 06:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a3b4c5d6e7f'
down_revision: Union[str, Sequence[str], None] = '1d4701d18bc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add enhanced fields to work_orders table for detailed job creation."""
    
    # Add new columns to work_orders table
    op.add_column('work_orders', sa.Column('title', sa.String(length=100), nullable=True))
    op.add_column('work_orders', sa.Column('estimated_duration', sa.Integer(), nullable=True))
    op.add_column('work_orders', sa.Column('safety_requirements', sa.Text(), nullable=True))
    op.add_column('work_orders', sa.Column('required_tools', sa.Text(), nullable=True))
    op.add_column('work_orders', sa.Column('required_parts', sa.Text(), nullable=True))
    op.add_column('work_orders', sa.Column('special_instructions', sa.Text(), nullable=True))
    op.add_column('work_orders', sa.Column('cost_estimate', sa.Float(), nullable=True))
    
    # Create indexes for the new columns
    op.create_index('ix_work_orders_title', 'work_orders', ['title'])
    op.create_index('ix_work_orders_estimated_duration', 'work_orders', ['estimated_duration'])
    
    # Modify existing columns to allow null values for general work orders
    op.alter_column('work_orders', 'machine_id', nullable=True)
    op.alter_column('work_orders', 'priority', nullable=True)


def downgrade() -> None:
    """Remove enhanced fields from work_orders table."""
    
    # Drop indexes
    op.drop_index('ix_work_orders_estimated_duration', 'work_orders')
    op.drop_index('ix_work_orders_title', 'work_orders')
    
    # Remove new columns
    op.drop_column('work_orders', 'cost_estimate')
    op.drop_column('work_orders', 'special_instructions')
    op.drop_column('work_orders', 'required_parts')
    op.drop_column('work_orders', 'required_tools')
    op.drop_column('work_orders', 'safety_requirements')
    op.drop_column('work_orders', 'estimated_duration')
    op.drop_column('work_orders', 'title')
    
    # Revert column modifications
    op.alter_column('work_orders', 'machine_id', nullable=False)
    op.alter_column('work_orders', 'priority', nullable=False)