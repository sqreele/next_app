"""Add jobs table

Revision ID: add1234567890
Revises: 899398de0caf
Create Date: 2025-01-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add1234567890'
down_revision: Union[str, Sequence[str], None] = '899398de0caf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add jobs table."""
    # Create the jobs table
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('topic', sa.String(200), nullable=False, index=True),
        sa.Column('property', sa.String(500), nullable=True, index=True),
        sa.Column('before_image', sa.String(500), nullable=True, index=True),
        sa.Column('after_image', sa.String(500), nullable=True, index=True),
        sa.Column('room_id', sa.Integer(), nullable=True, index=True),
        sa.Column('status', sa.Enum('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', name='jobstatus'), nullable=False, default='PENDING', index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False, index=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True, index=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True, index=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_job_user_status', 'jobs', ['user_id', 'status'])
    op.create_index('idx_job_status_created', 'jobs', ['status', 'created_at'])
    op.create_index('idx_job_room_status', 'jobs', ['room_id', 'status'])
    op.create_index('idx_job_topic_status', 'jobs', ['topic', 'status'])
    op.create_index('idx_job_completed_date', 'jobs', ['completed_at', 'status'])
    op.create_index('idx_job_started_date', 'jobs', ['started_at', 'status'])


def downgrade() -> None:
    """Remove jobs table."""
    # Drop indexes
    op.drop_index('idx_job_started_date', 'jobs')
    op.drop_index('idx_job_completed_date', 'jobs')
    op.drop_index('idx_job_topic_status', 'jobs')
    op.drop_index('idx_job_room_status', 'jobs')
    op.drop_index('idx_job_status_created', 'jobs')
    op.drop_index('idx_job_user_status', 'jobs')
    
    # Drop table
    op.drop_table('jobs')
    
    # Drop enum type
    op.execute("DROP TYPE IF EXISTS jobstatus")