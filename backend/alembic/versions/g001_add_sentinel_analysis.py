"""add sentinel_analysis column to scans

Revision ID: g001_add_sentinel_analysis
Revises: f332204c32b5
Create Date: 2026-03-21 08:57:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'g001_add_sentinel_analysis'
down_revision: Union[str, None] = 'f332204c32b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'scans',
        sa.Column(
            'sentinel_analysis',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True
        )
    )


def downgrade() -> None:
    op.drop_column('scans', 'sentinel_analysis')
