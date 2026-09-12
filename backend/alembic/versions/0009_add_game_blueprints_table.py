"""Add game_blueprints table for Game Blueprint Layer (Phase 5).

Revision ID: 0009_add_game_blueprints_table
Revises: 0008_add_questions_table
Create Date: 2026-09-11
"""

import json
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = '0009_add_game_blueprints_table'
down_revision: Union[str, None] = '0008_add_questions_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    if 'game_blueprints' not in existing_tables:
        blueprints_table = op.create_table(
            'game_blueprints',
            sa.Column('id', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=150), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('grade', sa.Integer(), nullable=False),
            sa.Column('subject', sa.String(length=50), nullable=False),
            sa.Column('topic', sa.String(length=100), nullable=False),
            sa.Column('target_engine', sa.String(length=30), nullable=False),
            sa.Column('total_questions', sa.Integer(), server_default='10', nullable=False),
            sa.Column('rule_config', sa.JSON().with_variant(JSONB, 'postgresql'), nullable=False),
            sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_game_blueprints_grade', 'game_blueprints', ['grade'])
        op.create_index('ix_game_blueprints_subject', 'game_blueprints', ['subject'])
        op.create_index('ix_game_blueprints_topic', 'game_blueprints', ['topic'])
        op.create_index('ix_game_blueprints_target_engine', 'game_blueprints', ['target_engine'])
        op.create_index('ix_game_blueprints_is_active', 'game_blueprints', ['is_active'])

        # Seed initial high-quality curriculum blueprint presets
        seed_blueprints = [
            {
                'id': 'bp_math_g1_count',
                'title': 'Toán 1: Đếm số và So sánh lượng (1-20)',
                'description': 'Công thức rèn luyện kỹ năng đếm, nhận biết mặt số và so sánh số lượng đồ vật trong phạm vi 20.',
                'grade': 1,
                'subject': 'math',
                'topic': 'Đếm số và So sánh',
                'target_engine': 'quiz',
                'total_questions': 10,
                'rule_config': {
                    'difficulty_distribution': {'1': 6, '2': 4, '3': 0},
                    'time_limit_sec': 30,
                    'rewards': {'xp': 80, 'coins': 20}
                },
                'is_active': True,
            },
            {
                'id': 'bp_math_g2_addition',
                'title': 'Toán 2: Bảng cộng trừ có nhớ trong phạm vi 100',
                'description': 'Công thức thực hành phép cộng và phép trừ có nhớ với các số tự nhiên có 2 chữ số.',
                'grade': 2,
                'subject': 'math',
                'topic': 'Phép cộng trừ có nhớ',
                'target_engine': 'math',
                'total_questions': 10,
                'rule_config': {
                    'difficulty_distribution': {'1': 4, '2': 4, '3': 2},
                    'time_limit_sec': 45,
                    'rewards': {'xp': 100, 'coins': 25}
                },
                'is_active': True,
            },
            {
                'id': 'bp_viet_g3_vocab',
                'title': 'Tiếng Việt 3: Mở rộng vốn từ & Luyện từ và câu',
                'description': 'Công thức củng cố vốn từ ngữ chỉ sự vật, hoạt động, đặc điểm và ghép câu hoàn chỉnh.',
                'grade': 3,
                'subject': 'vietnamese',
                'topic': 'Mở rộng vốn từ',
                'target_engine': 'matching',
                'total_questions': 10,
                'rule_config': {
                    'difficulty_distribution': {'1': 4, '2': 4, '3': 2},
                    'time_limit_sec': 40,
                    'rewards': {'xp': 100, 'coins': 25}
                },
                'is_active': True,
            },
            {
                'id': 'bp_sci_g4_nature',
                'title': 'Khoa học 4: Động thực vật & Môi trường sống',
                'description': 'Công thức khám phá thế giới tự nhiên, phân loại động thực vật và chuỗi thức ăn sinh thái.',
                'grade': 4,
                'subject': 'science',
                'topic': 'Tự nhiên và Môi trường sống',
                'target_engine': 'quiz',
                'total_questions': 10,
                'rule_config': {
                    'difficulty_distribution': {'1': 3, '2': 4, '3': 3},
                    'time_limit_sec': 30,
                    'rewards': {'xp': 120, 'coins': 30}
                },
                'is_active': True,
            },
            {
                'id': 'bp_logic_g5_sequence',
                'title': 'Logic 5: Quy luật dãy số & Tư duy trừu tượng',
                'description': 'Công thức thử thách tư duy phân tích dãy số quy luật, hình học trực quan và suy luận logic.',
                'grade': 5,
                'subject': 'logic',
                'topic': 'Quy luật dãy số',
                'target_engine': 'sequence',
                'total_questions': 10,
                'rule_config': {
                    'difficulty_distribution': {'1': 2, '2': 5, '3': 3},
                    'time_limit_sec': 60,
                    'rewards': {'xp': 150, 'coins': 35}
                },
                'is_active': True,
            },
        ]

        op.bulk_insert(blueprints_table, seed_blueprints)


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    if 'game_blueprints' in existing_tables:
        op.drop_index('ix_game_blueprints_is_active', table_name='game_blueprints')
        op.drop_index('ix_game_blueprints_target_engine', table_name='game_blueprints')
        op.drop_index('ix_game_blueprints_topic', table_name='game_blueprints')
        op.drop_index('ix_game_blueprints_subject', table_name='game_blueprints')
        op.drop_index('ix_game_blueprints_grade', table_name='game_blueprints')
        op.drop_table('game_blueprints')
