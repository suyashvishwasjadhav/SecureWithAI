"""initial

Revision ID: 0001
Revises: 
Create Date: 2026-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('scans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_type', sa.String(), nullable=True),
        sa.Column('target', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('risk_score', sa.Integer(), nullable=True),
        sa.Column('intensity', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scans_created_at'), 'scans', ['created_at'], unique=False)
    op.create_index(op.f('ix_scans_status'), 'scans', ['status'], unique=False)

    op.create_table('attack_surface',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('nodes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('edges', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('vuln_type', sa.String(), nullable=True),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('parameter', sa.String(), nullable=True),
        sa.Column('file_path', sa.String(), nullable=True),
        sa.Column('line_number', sa.Integer(), nullable=True),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('attack_worked', sa.Boolean(), nullable=True),
        sa.Column('owasp_category', sa.String(), nullable=True),
        sa.Column('tool_source', sa.String(), nullable=True),
        sa.Column('ai_fix', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('waf_rule', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('correlated_finding_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('correlation_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['correlated_finding_id'], ['findings.id'], ),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_findings_scan_id'), 'findings', ['scan_id'], unique=False)
    op.create_index(op.f('ix_findings_severity'), 'findings', ['severity'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_findings_severity'), table_name='findings')
    op.drop_index(op.f('ix_findings_scan_id'), table_name='findings')
    op.drop_table('findings')
    op.drop_table('attack_surface')
    op.drop_index(op.f('ix_scans_status'), table_name='scans')
    op.drop_index(op.f('ix_scans_created_at'), table_name='scans')
    op.drop_table('scans')
