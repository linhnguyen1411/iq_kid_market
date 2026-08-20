"""Initial schema and performance indexes

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-20 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Bảng users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='student'),
        sa.Column('grade', sa.Integer(), nullable=True),
        sa.Column('avatar', sa.String(length=50), server_default='smile_tiger'),
        sa.Column('xp', sa.Integer(), server_default='0'),
        sa.Column('level', sa.Integer(), server_default='1'),
        sa.Column('streak', sa.Integer(), server_default='0'),
        sa.Column('last_active_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_grade', 'users', ['grade'])
    op.create_index('ix_users_xp', 'users', ['xp'])
    op.create_index('ix_users_streak', 'users', ['streak'])

    # 2. Bảng wallets
    op.create_table(
        'wallets',
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('balance', sa.Integer(), server_default='0'),
        sa.Column('currency', sa.String(length=10), server_default='VND'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
    )

    # 3. Bảng wallet_transactions
    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('wallet_user_id', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=True),
        sa.Column('detail', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['wallet_user_id'], ['wallets.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_wallet_transactions_wallet_user_id', 'wallet_transactions', ['wallet_user_id'])
    op.create_index('ix_wallet_transactions_created_at', 'wallet_transactions', ['created_at'])

    # 4. Bảng games
    op.create_table(
        'games',
        sa.Column('id', sa.String(length=80), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('detailed_description', sa.Text(), nullable=True),
        sa.Column('thumbnail', sa.String(length=20), nullable=True),
        sa.Column('price', sa.Integer(), server_default='0'),
        sa.Column('grade_from', sa.Integer(), server_default='1'),
        sa.Column('grade_to', sa.Integer(), server_default='9'),
        sa.Column('template_code', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=50), server_default='iq'),
        sa.Column('creator_id', sa.String(length=50), nullable=True),
        sa.Column('creator_name', sa.String(length=150), nullable=True),
        sa.Column('review_status', sa.String(length=30), server_default='approved'),
        sa.Column('review_feedback', sa.Text(), nullable=True),
        sa.Column('is_published', sa.Boolean(), server_default='1'),
        sa.Column('is_seed', sa.Boolean(), server_default='0'),
        sa.Column('rating_avg', sa.Float(), server_default='4.5'),
        sa.Column('plays_count', sa.Integer(), server_default='0'),
        sa.Column('levels', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_games_template_code', 'games', ['template_code'])
    op.create_index('ix_games_category', 'games', ['category'])
    op.create_index('ix_games_review_status', 'games', ['review_status'])
    op.create_index('ix_games_is_published', 'games', ['is_published'])
    op.create_index('ix_games_price', 'games', ['price'])
    op.create_index('ix_games_grade_from', 'games', ['grade_from'])
    op.create_index('ix_games_grade_to', 'games', ['grade_to'])
    op.create_index('ix_games_rating_avg', 'games', ['rating_avg'])
    op.create_index('ix_games_created_at', 'games', ['created_at'])
    op.create_index('ix_games_creator_id', 'games', ['creator_id'])

    # 5. Bảng purchases
    op.create_table(
        'purchases',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('game_id', sa.String(length=80), nullable=False),
        sa.Column('purchased_price', sa.Integer(), server_default='0'),
        sa.Column('purchased_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_purchases_user_id', 'purchases', ['user_id'])
    op.create_index('ix_purchases_game_id', 'purchases', ['game_id'])

    # 6. Bảng attempts
    op.create_table(
        'attempts',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('game_id', sa.String(length=80), nullable=False),
        sa.Column('level_num', sa.Integer(), nullable=False),
        sa.Column('score', sa.Integer(), server_default='0'),
        sa.Column('completed', sa.Boolean(), server_default='0'),
        sa.Column('duration_secs', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_attempts_user_id', 'attempts', ['user_id'])
    op.create_index('ix_attempts_game_id', 'attempts', ['game_id'])
    op.create_index('ix_attempts_score', 'attempts', ['score'])
    op.create_index('ix_attempts_created_at', 'attempts', ['created_at'])

    # 7. Bảng achievements
    op.create_table(
        'achievements',
        sa.Column('id', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('badge_code', sa.String(length=50), nullable=True),
        sa.Column('xp_bonus', sa.Integer(), server_default='100'),
        sa.Column('icon', sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # 8. Bảng user_achievements
    op.create_table(
        'user_achievements',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('achievement_id', sa.String(length=30), nullable=False),
        sa.Column('unlocked_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['achievement_id'], ['achievements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_achievements_user_id', 'user_achievements', ['user_id'])

    # 9. Bảng scratch_courses
    op.create_table(
        'scratch_courses',
        sa.Column('id', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('thumbnail', sa.String(length=20), nullable=True),
        sa.Column('difficulty', sa.String(length=50), server_default='Cơ bản'),
        sa.Column('total_lessons', sa.Integer(), server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 10. Bảng scratch_lessons
    op.create_table(
        'scratch_lessons',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('course_id', sa.String(length=30), nullable=False),
        sa.Column('lesson_num', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('target_block_sequence', sa.Text(), nullable=True),
        sa.Column('start_scene_json', sa.Text(), nullable=True),
        sa.Column('xp_reward', sa.Integer(), server_default='30'),
        sa.ForeignKeyConstraint(['course_id'], ['scratch_courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 11. Bảng user_scratch_progress
    op.create_table(
        'user_scratch_progress',
        sa.Column('id', sa.String(length=60), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('course_id', sa.String(length=30), nullable=False),
        sa.Column('lesson_id', sa.Integer(), nullable=False),
        sa.Column('lesson_num', sa.Integer(), nullable=False),
        sa.Column('completed', sa.Boolean(), server_default='1'),
        sa.Column('stars_earned', sa.Integer(), server_default='3'),
        sa.Column('submitted_sequence', sa.Text(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)')),
        sa.ForeignKeyConstraint(['course_id'], ['scratch_courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lesson_id'], ['scratch_lessons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_scratch_progress_user_id', 'user_scratch_progress', ['user_id'])


def downgrade() -> None:
    op.drop_table('user_scratch_progress')
    op.drop_table('scratch_lessons')
    op.drop_table('scratch_courses')
    op.drop_table('user_achievements')
    op.drop_table('achievements')
    op.drop_table('attempts')
    op.drop_table('purchases')
    op.drop_table('games')
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')
    op.drop_table('users')
