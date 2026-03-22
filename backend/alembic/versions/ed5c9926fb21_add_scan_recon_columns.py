"""add_scan_recon_columns

Revision ID: ed5c9926fb21
Revises: 0002
Create Date: 2026-03-19 21:12:29.770660

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed5c9926fb21'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    from sqlalchemy.dialects import postgresql
    op.add_column('scans', sa.Column('open_ports', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('scans', sa.Column('os_guess', sa.String(), nullable=True))
    # Note: If tech_stack is also JSONB
    op.add_column('scans', sa.Column('tech_stack', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

def downgrade() -> None:
    op.drop_column('scans', 'tech_stack')
    op.drop_column('scans', 'os_guess')
    op.drop_column('scans', 'open_ports')
