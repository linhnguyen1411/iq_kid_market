"""Add game_versions table and version tracking columns."""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0007_add_game_versions_table"
down_revision: Union[str, None] = "0006_add_scratch_projects_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    # 1. Tạo bảng game_versions nếu chưa tồn tại
    if "game_versions" not in existing_tables:
        op.create_table(
            "game_versions",
            sa.Column("id", sa.String(length=80), nullable=False),
            sa.Column("game_id", sa.String(length=80), sa.ForeignKey("games.id", ondelete="CASCADE"), nullable=False),
            sa.Column("version_num", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="draft"),
            sa.Column("levels", sa.JSON().with_variant(JSONB, "postgresql"), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("detailed_description", sa.Text(), nullable=True),
            sa.Column("price", sa.Integer(), server_default="0", nullable=False),
            sa.Column("template_code", sa.String(length=50), nullable=False),
            sa.Column("category", sa.String(length=50), server_default="iq", nullable=False),
            sa.Column("changelog", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("published_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("game_id", "version_num", name="uq_game_version_num"),
        )
        op.create_index("ix_game_versions_game_id", "game_versions", ["game_id"])
        op.create_index("ix_game_versions_status", "game_versions", ["status"])

    # 2. Thêm cột versioning vào games, attempts, purchases (nullable để bảo toàn 100% dữ liệu cũ)
    games_cols = {c["name"] for c in insp.get_columns("games")} if "games" in existing_tables else set()
    if "current_version_num" not in games_cols:
        with op.batch_alter_table("games") as batch_op:
            batch_op.add_column(sa.Column("current_version_num", sa.Integer(), server_default="1", nullable=True))

    purchases_cols = {c["name"] for c in insp.get_columns("purchases")} if "purchases" in existing_tables else set()
    if "game_version_id" not in purchases_cols:
        with op.batch_alter_table("purchases") as batch_op:
            batch_op.add_column(sa.Column("game_version_id", sa.String(length=80), nullable=True))

    attempts_cols = {c["name"] for c in insp.get_columns("attempts")} if "attempts" in existing_tables else set()
    if "game_version_id" not in attempts_cols:
        with op.batch_alter_table("attempts") as batch_op:
            batch_op.add_column(sa.Column("game_version_id", sa.String(length=80), nullable=True))

    sc_cols = {c["name"] for c in insp.get_columns("scratch_courses")} if "scratch_courses" in existing_tables else set()
    if "price" not in sc_cols:
        with op.batch_alter_table("scratch_courses") as batch_op:
            batch_op.add_column(sa.Column("price", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("scratch_courses") as batch_op:
        batch_op.drop_column("price")

    with op.batch_alter_table("attempts") as batch_op:
        batch_op.drop_column("game_version_id")

    with op.batch_alter_table("purchases") as batch_op:
        batch_op.drop_column("game_version_id")

    with op.batch_alter_table("games") as batch_op:
        batch_op.drop_column("current_version_num")

    op.drop_index("ix_game_versions_status", table_name="game_versions")
    op.drop_index("ix_game_versions_game_id", table_name="game_versions")
    op.drop_table("game_versions")
