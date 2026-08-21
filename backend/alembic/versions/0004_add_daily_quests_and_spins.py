"""Add daily quests, login rewards and lucky spins."""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004_add_daily_quests_and_spins"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("daily_quests",
        sa.Column("id", sa.String(50), primary_key=True), sa.Column("title", sa.String(150), nullable=False),
        sa.Column("description", sa.String(255), nullable=False), sa.Column("type", sa.String(40), nullable=False),
        sa.Column("target_count", sa.Integer(), nullable=False), sa.Column("xp_reward", sa.Integer(), server_default="0"),
        sa.Column("coin_reward", sa.Integer(), server_default="0"), sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.UniqueConstraint("type", name="uq_daily_quests_type"))
    op.create_index("ix_daily_quests_type", "daily_quests", ["type"])
    op.create_table("user_daily_quests",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quest_id", sa.String(50), sa.ForeignKey("daily_quests.id", ondelete="CASCADE"), nullable=False), sa.Column("current_progress", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(20), server_default="IN_PROGRESS", nullable=False), sa.Column("quest_date", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "quest_id", "quest_date", name="uq_user_daily_quest_day"))
    for name, column in [("ix_user_daily_quests_user_id", "user_id"), ("ix_user_daily_quests_quest_id", "quest_id"), ("ix_user_daily_quests_status", "status"), ("ix_user_daily_quests_quest_date", "quest_date")]:
        op.create_index(name, "user_daily_quests", [column])
    op.create_table("user_daily_spins",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("spin_date", sa.DateTime(), nullable=False), sa.Column("eligible", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("spun", sa.Boolean(), server_default=sa.false(), nullable=False), sa.Column("reward_code", sa.String(40)),
        sa.Column("reward_amount", sa.Integer(), server_default="0", nullable=False), sa.UniqueConstraint("user_id", "spin_date", name="uq_user_daily_spin_day"))
    for name, column in [("ix_user_daily_spins_user_id", "user_id"), ("ix_user_daily_spins_spin_date", "spin_date")]:
        op.create_index(name, "user_daily_spins", [column])
    op.create_table("login_reward_claims",
        sa.Column("id", sa.String(80), primary_key=True), sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claim_date", sa.DateTime(), nullable=False), sa.Column("day_number", sa.Integer(), nullable=False), sa.Column("coin_reward", sa.Integer(), nullable=False),
        sa.UniqueConstraint("user_id", "claim_date", name="uq_login_reward_user_day"))
    for name, column in [("ix_login_reward_claims_user_id", "user_id"), ("ix_login_reward_claims_claim_date", "claim_date")]:
        op.create_index(name, "login_reward_claims", [column])


def downgrade() -> None:
    op.drop_table("login_reward_claims")
    op.drop_table("user_daily_spins")
    op.drop_table("user_daily_quests")
    op.drop_table("daily_quests")