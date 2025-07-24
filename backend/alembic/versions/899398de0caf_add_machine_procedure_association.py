"""Add machine_procedure_association table

Revision ID: 899398de0caf
Revises: 17f8bad509d5
Create Date: 2025-01-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '899398de0caf'
down_revision: Union[str, Sequence[str], None] = '17f8bad509d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add machine_procedure_association table for many-to-many relationship."""
    # Create the machine_procedure_association table
    op.create_table(
        'machine_procedure_association',
        sa.Column('machine_id', sa.Integer(), nullable=False),
        sa.Column('procedure_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['machine_id'], ['machines.id'], ),
        sa.ForeignKeyConstraint(['procedure_id'], ['procedures.id'], ),
        sa.PrimaryKeyConstraint('machine_id', 'procedure_id')
    )
    
    # Create indexes
    op.create_index('idx_machine_procedure_machine', 'machine_procedure_association', ['machine_id'])
    op.create_index('idx_machine_procedure_procedure', 'machine_procedure_association', ['procedure_id'])


def downgrade() -> None:
    """Remove machine_procedure_association table."""
    # Drop indexes
    op.drop_index('idx_machine_procedure_procedure', 'machine_procedure_association')
    op.drop_index('idx_machine_procedure_machine', 'machine_procedure_association')
    
    # Drop table
    op.drop_table('machine_procedure_association')