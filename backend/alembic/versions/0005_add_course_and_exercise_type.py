"""Add course_type to scratch_courses and exercise_type to scratch_lessons."""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005_add_course_and_exercise_type"
down_revision: Union[str, None] = "0004_add_daily_quests_and_spins"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Thêm course_type vào scratch_courses
    with op.batch_alter_table("scratch_courses") as batch_op:
        batch_op.add_column(
            sa.Column("course_type", sa.String(length=50), nullable=False, server_default="algorithm_maze")
        )

    # Thêm engine_type vào scratch_lessons
    with op.batch_alter_table("scratch_lessons") as batch_op:
        batch_op.add_column(
            sa.Column("engine_type", sa.String(length=50), nullable=True, server_default="algorithm_maze")
        )


def downgrade() -> None:
    with op.batch_alter_table("scratch_lessons") as batch_op:
        batch_op.drop_column("engine_type")

    with op.batch_alter_table("scratch_courses") as batch_op:
        batch_op.drop_column("course_type")
