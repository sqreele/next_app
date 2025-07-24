"""Add WorkOrder model and many-to-many relationship with topics

Revision ID: 1d4701d18bc1
Revises: 899398de0caf
Create Date: 2025-01-10 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d4701d18bc1'
down_revision: Union[str, Sequence[str], None] = '899398de0caf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add WorkOrder model and many-to-many relationship with topics."""
    
    # Create WorkOrder status and type enums
    op.execute("CREATE TYPE workorderstatus AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE')")
    op.execute("CREATE TYPE workordertype AS ENUM ('PM', 'ISSUE', 'WORKORDER')")
    
    # Create the work_orders table
    op.create_table(
        'work_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('machine_id', sa.Integer(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=True),
        sa.Column('property_id', sa.Integer(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('procedure_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE', name='workorderstatus'), nullable=False),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='issuepriority'), nullable=False),
        sa.Column('type', sa.Enum('PM', 'ISSUE', 'WORKORDER', name='workordertype'), nullable=False),
        sa.Column('frequency', sa.Enum('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', name='frequencytype'), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('before_images', sa.Text(), nullable=True),
        sa.Column('after_images', sa.Text(), nullable=True),
        sa.Column('pdf_file_path', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['machine_id'], ['machines.id'], ),
        sa.ForeignKeyConstraint(['procedure_id'], ['procedures.id'], ),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for work_orders table
    op.create_index('idx_work_order_assigned_status', 'work_orders', ['assigned_to_id', 'status'])
    op.create_index('idx_work_order_due_date', 'work_orders', ['due_date', 'status'])
    op.create_index('idx_work_order_machine_status', 'work_orders', ['machine_id', 'status'])
    op.create_index('idx_work_order_procedure_status', 'work_orders', ['procedure_id', 'status'])
    op.create_index('idx_work_order_status_priority', 'work_orders', ['status', 'priority'])
    op.create_index('idx_work_order_topic_status', 'work_orders', ['topic_id', 'status'])
    op.create_index('idx_work_order_type_status', 'work_orders', ['type', 'status'])
    op.create_index(op.f('ix_work_orders_assigned_to_id'), 'work_orders', ['assigned_to_id'])
    op.create_index(op.f('ix_work_orders_completed_at'), 'work_orders', ['completed_at'])
    op.create_index(op.f('ix_work_orders_created_at'), 'work_orders', ['created_at'])
    op.create_index(op.f('ix_work_orders_due_date'), 'work_orders', ['due_date'])
    op.create_index(op.f('ix_work_orders_id'), 'work_orders', ['id'])
    op.create_index(op.f('ix_work_orders_machine_id'), 'work_orders', ['machine_id'])
    op.create_index(op.f('ix_work_orders_priority'), 'work_orders', ['priority'])
    op.create_index(op.f('ix_work_orders_procedure_id'), 'work_orders', ['procedure_id'])
    op.create_index(op.f('ix_work_orders_property_id'), 'work_orders', ['property_id'])
    op.create_index(op.f('ix_work_orders_room_id'), 'work_orders', ['room_id'])
    op.create_index(op.f('ix_work_orders_status'), 'work_orders', ['status'])
    op.create_index(op.f('ix_work_orders_topic_id'), 'work_orders', ['topic_id'])
    op.create_index(op.f('ix_work_orders_type'), 'work_orders', ['type'])
    
    # Create the work_order_topic_association table for many-to-many relationship
    op.create_table(
        'work_order_topic_association',
        sa.Column('work_order_id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id'], ),
        sa.PrimaryKeyConstraint('work_order_id', 'topic_id')
    )
    
    # Create indexes for association table
    op.create_index('idx_work_order_topic_topic', 'work_order_topic_association', ['topic_id'])
    op.create_index('idx_work_order_topic_work_order', 'work_order_topic_association', ['work_order_id'])
    
    # Create the work_order_files table
    op.create_table(
        'work_order_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('work_order_id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('image_type', sa.Enum('BEFORE', 'AFTER', 'DURING', 'REFERENCE', name='imagetype'), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for work_order_files table
    op.create_index('idx_work_order_file_uploaded_date', 'work_order_files', ['uploaded_at', 'file_type'])
    op.create_index('idx_work_order_file_work_order_type', 'work_order_files', ['work_order_id', 'image_type'])
    op.create_index(op.f('ix_work_order_files_file_name'), 'work_order_files', ['file_name'])
    op.create_index(op.f('ix_work_order_files_file_path'), 'work_order_files', ['file_path'])
    op.create_index(op.f('ix_work_order_files_file_type'), 'work_order_files', ['file_type'])
    op.create_index(op.f('ix_work_order_files_id'), 'work_order_files', ['id'])
    op.create_index(op.f('ix_work_order_files_image_type'), 'work_order_files', ['image_type'])
    op.create_index(op.f('ix_work_order_files_uploaded_at'), 'work_order_files', ['uploaded_at'])
    op.create_index(op.f('ix_work_order_files_work_order_id'), 'work_order_files', ['work_order_id'])


def downgrade() -> None:
    """Remove WorkOrder model and many-to-many relationship with topics."""
    
    # Drop work_order_files table and its indexes
    op.drop_index(op.f('ix_work_order_files_work_order_id'), table_name='work_order_files')
    op.drop_index(op.f('ix_work_order_files_uploaded_at'), table_name='work_order_files')
    op.drop_index(op.f('ix_work_order_files_image_type'), table_name='work_order_files')
    op.drop_index(op.f('ix_work_order_files_id'), table_name='work_order_files')
    op.drop_index(op.f('ix_work_order_files_file_type'), table_name='work_order_files')
    op.drop_index(op.f('ix_work_order_files_file_path'), table_name='work_order_files')
    op.drop_index(op.f('ix_work_order_files_file_name'), table_name='work_order_files')
    op.drop_index('idx_work_order_file_work_order_type', table_name='work_order_files')
    op.drop_index('idx_work_order_file_uploaded_date', table_name='work_order_files')
    op.drop_table('work_order_files')
    
    # Drop association table and its indexes
    op.drop_index('idx_work_order_topic_work_order', table_name='work_order_topic_association')
    op.drop_index('idx_work_order_topic_topic', table_name='work_order_topic_association')
    op.drop_table('work_order_topic_association')
    
    # Drop work_orders table and its indexes
    op.drop_index(op.f('ix_work_orders_type'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_topic_id'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_status'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_room_id'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_property_id'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_procedure_id'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_priority'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_machine_id'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_id'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_due_date'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_created_at'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_completed_at'), table_name='work_orders')
    op.drop_index(op.f('ix_work_orders_assigned_to_id'), table_name='work_orders')
    op.drop_index('idx_work_order_type_status', table_name='work_orders')
    op.drop_index('idx_work_order_topic_status', table_name='work_orders')
    op.drop_index('idx_work_order_status_priority', table_name='work_orders')
    op.drop_index('idx_work_order_procedure_status', table_name='work_orders')
    op.drop_index('idx_work_order_machine_status', table_name='work_orders')
    op.drop_index('idx_work_order_due_date', table_name='work_orders')
    op.drop_index('idx_work_order_assigned_status', table_name='work_orders')
    op.drop_table('work_orders')
    
    # Drop enums
    op.execute("DROP TYPE workordertype")
    op.execute("DROP TYPE workorderstatus")