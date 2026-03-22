"""add missing findings columns: confidence_score and verification_status

Revision ID: g002_add_findings_missing_cols
Revises: g001_add_sentinel_analysis
Create Date: 2026-03-21 09:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g002_add_findings_missing_cols'
down_revision: Union[str, None] = 'g001_add_sentinel_analysis'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'findings',
        sa.Column('confidence_score', sa.Integer(), nullable=True)
    )
    op.add_column(
        'findings',
        sa.Column('verification_status', sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('findings', 'verification_status')
    op.drop_column('findings', 'confidence_score')
