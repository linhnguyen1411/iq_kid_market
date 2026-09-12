"""Add quality_score to game_versions table (Phase 6).

Revision ID: 0010_add_quality_score
Revises: 0009_add_game_blueprints_table
Create Date: 2026-09-12
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0010_add_quality_score'
down_revision: Union[str, None] = '0009_add_game_blueprints_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [c['name'] for c in insp.get_columns('game_versions')]

    if 'quality_score' not in columns:
        op.add_column(
            'game_versions',
            sa.Column('quality_score', sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [c['name'] for c in insp.get_columns('game_versions')]

    if 'quality_score' in columns:
        op.drop_column('game_versions', 'quality_score')
