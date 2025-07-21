
# File: backend/my_app/migrations/versions/add_estimated_time.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('procedures', sa.Column('estimated_time', sa.String(50), nullable=True))
    op.add_column('workorders', sa.Column('estimated_time', sa.String(50), nullable=True))

def downgrade():
    op.drop_column('procedures', 'estimated_time')
    op.drop_column('workorders', 'estimated_time')
