"""Add questions table for Question Bank.

Revision ID: 0008_add_questions_table
Revises: 0007_add_game_versions_table
Create Date: 2026-09-11
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = '0008_add_questions_table'
down_revision: Union[str, None] = '0007_add_game_versions_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    if 'questions' not in existing_tables:
        op.create_table(
            'questions',
            sa.Column('id', sa.String(length=60), nullable=False),
            sa.Column('engine_code', sa.String(length=30), nullable=False),
            sa.Column('grade', sa.Integer(), nullable=False),
            sa.Column('subject', sa.String(length=50), nullable=False),
            sa.Column('topic', sa.String(length=100), nullable=False),
            sa.Column('skill', sa.String(length=100), nullable=True),
            sa.Column('difficulty', sa.Integer(), server_default='1', nullable=False),
            sa.Column('prompt', sa.Text(), nullable=False),
            sa.Column('data', sa.JSON().with_variant(JSONB, 'postgresql'), nullable=False),
            sa.Column('content_hash', sa.String(length=64), nullable=False),
            sa.Column('normalized_hash', sa.String(length=64), nullable=False),
            sa.Column('creator_id', sa.String(length=50), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('source_game_id', sa.String(length=80), nullable=True),
            sa.Column('source_game_version', sa.Integer(), server_default='1', nullable=False),
            sa.Column('visibility', sa.String(length=20), server_default='private', nullable=False),
            sa.Column('status', sa.String(length=20), server_default='draft', nullable=False),
            sa.Column('usage_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_questions_engine_code', 'questions', ['engine_code'])
        op.create_index('ix_questions_grade', 'questions', ['grade'])
        op.create_index('ix_questions_subject', 'questions', ['subject'])
        op.create_index('ix_questions_topic', 'questions', ['topic'])
        op.create_index('ix_questions_difficulty', 'questions', ['difficulty'])
        op.create_index('ix_questions_content_hash', 'questions', ['content_hash'])
        op.create_index('ix_questions_normalized_hash', 'questions', ['normalized_hash'])
        op.create_index('ix_questions_creator_id', 'questions', ['creator_id'])
        op.create_index('ix_questions_source_game_id', 'questions', ['source_game_id'])
        op.create_index('ix_questions_visibility', 'questions', ['visibility'])
        op.create_index('ix_questions_status', 'questions', ['status'])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    if 'questions' in existing_tables:
        op.drop_index('ix_questions_status', table_name='questions')
        op.drop_index('ix_questions_visibility', table_name='questions')
        op.drop_index('ix_questions_source_game_id', table_name='questions')
        op.drop_index('ix_questions_creator_id', table_name='questions')
        op.drop_index('ix_questions_normalized_hash', table_name='questions')
        op.drop_index('ix_questions_content_hash', table_name='questions')
        op.drop_index('ix_questions_difficulty', table_name='questions')
        op.drop_index('ix_questions_topic', table_name='questions')
        op.drop_index('ix_questions_subject', table_name='questions')
        op.drop_index('ix_questions_grade', table_name='questions')
        op.drop_index('ix_questions_engine_code', table_name='questions')
        op.drop_table('questions')
