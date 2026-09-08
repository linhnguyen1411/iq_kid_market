"""Add scratch_projects table."""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0006_add_scratch_projects_table"
down_revision: Union[str, None] = "0005_add_course_and_exercise_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scratch_projects",
        sa.Column("id", sa.String(length=60), nullable=False),
        sa.Column("user_id", sa.String(length=50), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False, server_default="Dự Án Scratch Của Bé"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("thumbnail", sa.String(length=20), server_default="🐱"),
        sa.Column("project_data", sa.Text(), nullable=False),
        sa.Column("is_public", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scratch_projects_user_id", "scratch_projects", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_scratch_projects_user_id", table_name="scratch_projects")
    op.drop_table("scratch_projects")
