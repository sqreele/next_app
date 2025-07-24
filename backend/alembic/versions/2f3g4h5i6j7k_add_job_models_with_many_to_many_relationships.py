"""Add Job model with many-to-many relationships

Revision ID: 2f3g4h5i6j7k
Revises: 1d4701d18bc1
Create Date: 2025-01-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f3g4h5i6j7k'
down_revision: Union[str, Sequence[str], None] = '1d4701d18bc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Job model with many-to-many relationships."""
    
    # Create JobStatus enum
    op.execute("CREATE TYPE jobstatus AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD')")
    
    # Create the jobs table
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', name='jobstatus'), nullable=False),
        sa.Column('before_image', sa.String(length=500), nullable=True),
        sa.Column('after_image', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for jobs table
    op.create_index('idx_job_created_date', 'jobs', ['created_at'])
    op.create_index('idx_job_status_created', 'jobs', ['status', 'created_at'])
    op.create_index('idx_job_status_updated', 'jobs', ['status', 'updated_at'])
    op.create_index('idx_job_title_status', 'jobs', ['title', 'status'])
    op.create_index(op.f('ix_jobs_after_image'), 'jobs', ['after_image'])
    op.create_index(op.f('ix_jobs_before_image'), 'jobs', ['before_image'])
    op.create_index(op.f('ix_jobs_created_at'), 'jobs', ['created_at'])
    op.create_index(op.f('ix_jobs_id'), 'jobs', ['id'])
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'])
    op.create_index(op.f('ix_jobs_title'), 'jobs', ['title'])
    
    # Create job_user_association table for many-to-many relationship
    op.create_table(
        'job_user_association',
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('job_id', 'user_id')
    )
    
    # Create indexes for job_user_association table
    op.create_index('idx_job_user_job', 'job_user_association', ['job_id'])
    op.create_index('idx_job_user_user', 'job_user_association', ['user_id'])
    
    # Create job_topic_association table for many-to-many relationship
    op.create_table(
        'job_topic_association',
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
        sa.PrimaryKeyConstraint('job_id', 'topic_id')
    )
    
    # Create indexes for job_topic_association table
    op.create_index('idx_job_topic_job', 'job_topic_association', ['job_id'])
    op.create_index('idx_job_topic_topic', 'job_topic_association', ['topic_id'])
    
    # Create job_room_association table for many-to-many relationship
    op.create_table(
        'job_room_association',
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.PrimaryKeyConstraint('job_id', 'room_id')
    )
    
    # Create indexes for job_room_association table
    op.create_index('idx_job_room_job', 'job_room_association', ['job_id'])
    op.create_index('idx_job_room_room', 'job_room_association', ['room_id'])
    
    # Create job_property_association table for many-to-many relationship
    op.create_table(
        'job_property_association',
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ),
        sa.PrimaryKeyConstraint('job_id', 'property_id')
    )
    
    # Create indexes for job_property_association table
    op.create_index('idx_job_property_job', 'job_property_association', ['job_id'])
    op.create_index('idx_job_property_property', 'job_property_association', ['property_id'])


def downgrade() -> None:
    """Remove Job model and many-to-many relationships."""
    
    # Drop job_property_association table and its indexes
    op.drop_index('idx_job_property_property', table_name='job_property_association')
    op.drop_index('idx_job_property_job', table_name='job_property_association')
    op.drop_table('job_property_association')
    
    # Drop job_room_association table and its indexes
    op.drop_index('idx_job_room_room', table_name='job_room_association')
    op.drop_index('idx_job_room_job', table_name='job_room_association')
    op.drop_table('job_room_association')
    
    # Drop job_topic_association table and its indexes
    op.drop_index('idx_job_topic_topic', table_name='job_topic_association')
    op.drop_index('idx_job_topic_job', table_name='job_topic_association')
    op.drop_table('job_topic_association')
    
    # Drop job_user_association table and its indexes
    op.drop_index('idx_job_user_user', table_name='job_user_association')
    op.drop_index('idx_job_user_job', table_name='job_user_association')
    op.drop_table('job_user_association')
    
    # Drop jobs table and its indexes
    op.drop_index(op.f('ix_jobs_title'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_status'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_id'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_created_at'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_before_image'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_after_image'), table_name='jobs')
    op.drop_index('idx_job_title_status', table_name='jobs')
    op.drop_index('idx_job_status_updated', table_name='jobs')
    op.drop_index('idx_job_status_created', table_name='jobs')
    op.drop_index('idx_job_created_date', table_name='jobs')
    op.drop_table('jobs')
    
    # Drop JobStatus enum
    op.execute("DROP TYPE jobstatus")