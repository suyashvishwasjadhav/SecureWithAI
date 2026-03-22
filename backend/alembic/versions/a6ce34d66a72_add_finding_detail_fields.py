"""add_finding_detail_fields

Revision ID: a6ce34d66a72
Revises: ed5c9926fb21
Create Date: 2026-03-19 21:23:55.501525

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6ce34d66a72'
down_revision: Union[str, None] = 'ed5c9926fb21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    from sqlalchemy.dialects import postgresql
    op.add_column('findings', sa.Column('attack_examples', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('findings', sa.Column('defense_examples', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('findings', sa.Column('layman_explanation', sa.Text(), nullable=True))
    op.add_column('findings', sa.Column('cvss_score', sa.Float(), nullable=True))
    op.add_column('findings', sa.Column('cve_id', sa.String(), nullable=True))
    op.add_column('findings', sa.Column('fix_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('findings', sa.Column('fix_verified_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    op.drop_column('findings', 'fix_verified_at')
    op.drop_column('findings', 'fix_verified')
    # Note: downgrade might need to handle server_default if necessary, 
    # but op.drop_column is usually enough.
    op.drop_column('findings', 'cve_id')
    op.drop_column('findings', 'cvss_score')
    op.drop_column('findings', 'layman_explanation')
    op.drop_column('findings', 'defense_examples')
    op.drop_column('findings', 'attack_examples')
