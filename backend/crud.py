import models, schemas
from typing import List, Optional
import datetime
import bcrypt

from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.ext.asyncio import AsyncSession 

# User

async def get_user_by_email(
    db: AsyncSession, 
    email: str
    ) -> Optional[models.User]:
    # 기본 조회 (관계 필드 제외)
    stmt = select(models.User).where(models.User.email == email)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_user_by_email_with_relations(
    db: AsyncSession, 
    email: str
    ) -> Optional[models.User]:
    # 관계 필드 포함 조회
    stmt = (
        select(models.User)
        .where(models.User.email == email)
        .options(
            selectinload(models.User.classes),
            selectinload(models.User.assignment)
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_user(
    db: AsyncSession, 
    user: schemas.UserCreate
    ) -> models.User:
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode()
    db_user = models.User(
        email=user.email, 
        hashed_password=hashed_password, 
        school_level=user.school_level,
        name=user.name
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

# Class
async def get_classes(
    db: AsyncSession, 
    user_id: int
    ) -> List[models.SchoolClass]:
    stmt = select(models.SchoolClass).where(models.SchoolClass.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_grade_by_student_id(
    db: AsyncSession, 
    student_id: int
    ) -> Optional[str]:
    stmt = (
        select(models.Student)
        .options(selectinload(models.Student.class_))
        .where(models.Student.id == student_id)
    )
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        return None 
    return student.class_.grade

async def create_class(
    db: AsyncSession, 
    class_data: schemas.ClassBase, 
    teacher: models.User
    ):
    new_class = models.SchoolClass(
        name=class_data.name,
        grade=class_data.grade,
        school_level=teacher.school_level,
        user_id=teacher.id
    )
    db.add(new_class)
    await db.commit()
    await db.refresh(new_class)
    return new_class

async def update_class(db: AsyncSession, class_id: int, class_update: schemas.ClassUpdate, user_id: int):
    stmt = select(models.SchoolClass).where(models.SchoolClass.id == class_id, models.SchoolClass.user_id == user_id)
    result = await db.execute(stmt)
    school_class = result.scalar_one_or_none()
    if not school_class:
        return None
    for field, value in class_update.model_dump(exclude_unset=True).items():
        setattr(school_class, field, value)
    await db.commit()
    await db.refresh(school_class)
    return school_class

async def delete_class(db: AsyncSession, class_id: int, user_id: int):
    stmt = select(models.SchoolClass).where(models.SchoolClass.id == class_id, models.SchoolClass.user_id == user_id)
    result = await db.execute(stmt)
    school_class = result.scalar_one_or_none()
    if not school_class:
        return False
    await db.delete(school_class)
    await db.commit()
    return True

# Student

async def get_students_by_class(
    db: AsyncSession, 
    class_id: int
    ) -> List[models.Student]:
    stmt = select(models.Student).where(models.Student.class_id == class_id)
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_student(
    db: AsyncSession, 
    student: schemas.StudentBase
    ) -> models.Student:
    db_student = models.Student(**student.model_dump())
    db.add(db_student)
    await db.commit()
    await db.refresh(db_student)
    return db_student

async def delete_student(
    db: AsyncSession, 
    student: schemas.StudentBase
    ) -> bool:
    stmt = select(models.Student).where(
        models.Student.number == student.number,
        models.Student.name == student.name,
        models.Student.class_id == student.class_id
    )
    result = await db.execute(stmt)
    db_student = result.scalar_one_or_none()

    if not db_student:
        return False

    await db.delete(db_student)
    await db.commit()
    return True

# Analysis
async def get_student_with_analysis(
    db: AsyncSession, 
    student_id : int
    ):

    print("아이디", student_id)
    stmt = select(
        models.Student
        ).where(
            models.Student.number == student_id,
        ).options(
        selectinload(models.Student.analysis_result),
        selectinload(models.Student.class_),
        )

    student_id = student_id
    result = await db.execute(stmt)
    print("아이디 : ", result)
    # print("결과 : ", result)
    return result.scalars().all()

async def create_student_analysis_result(
    db: AsyncSession,
    student_id: int,
    analysis_source: dict,
    analysis_result: dict
):
    from datetime import datetime
    new_result = models.AnalysisResult(
        student_id=student_id,
        analysis_source=analysis_source,
        analysis_result=analysis_result,
        created_at=datetime.utcnow()
    )
    db.add(new_result)
    await db.commit()
    await db.refresh(new_result)
    return new_result

async def get_latest_student_analysis(
    db: AsyncSession,
    student_id: int
):
    stmt = (
        select(models.AnalysisResult)
        .where(models.AnalysisResult.student_id == student_id)
        .order_by(models.AnalysisResult.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_latest_student_submissions(
    db: AsyncSession,
    student_id: int,
    n: int = 3
):
    stmt = (
        select(models.ASubmission)
        .where(models.ASubmission.student_id == student_id)
        .order_by(models.ASubmission.submitted_at.desc())
        .limit(n)
    )
    result = await db.execute(stmt)
    submissions = result.scalars().all()
    # Prefer revised_content if available, else content
    return [s.revised_content if s.revised_content else s.content for s in submissions]

# Assignment

async def get_assignments_by_class(
    db: AsyncSession, 
    class_id: int, 
    user_id: int
    ) -> List[models.Assignment]:
    stmt = select(models.Assignment).where(
        models.Assignment.class_id == class_id,
        models.Assignment.user_id == user_id
    )
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_assignment(
    db: AsyncSession, 
    assignment: schemas.AssignmentCreate
    ) -> models.Assignment:
    db_assignment = models.Assignment(**assignment.model_dump())
    db.add(db_assignment)
    await db.commit()
    await db.refresh(db_assignment)
    return db_assignment

async def update_assignment(
    db: AsyncSession,
    assignment_id: int,
    assignment_update: schemas.AssignmentUpdate,
    user_id: int
) -> Optional[models.Assignment]:
    stmt = select(models.Assignment).where(
        models.Assignment.id == assignment_id,
        models.Assignment.user_id == user_id
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()

    if not assignment:
        return None

    for field, value in assignment_update.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)

    await db.commit()
    await db.refresh(assignment)
    return assignment

async def update_assignment_status(
    db: AsyncSession,
    assignment_id: int,
    status: str,
    started_at=None,
    completed_at=None
) -> Optional[models.Assignment]:
    stmt = select(models.Assignment).where(models.Assignment.id == assignment_id)
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()

    if not assignment:
        return None

    assignment.status = status
    if started_at is not None:
        assignment.started_at = started_at
    if completed_at is not None:
        assignment.completed_at = completed_at

    await db.commit()
    await db.refresh(assignment)
    return assignment

async def delete_assignment(
    db: AsyncSession, 
    assignment_id: int, 
    user_id: int
    ) -> bool:
    stmt = select(models.Assignment).where(
        models.Assignment.id == assignment_id,
        models.Assignment.user_id == user_id
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()

    if not assignment:
        return False

    await db.delete(assignment)
    await db.commit()
    return True

# Evaluation

async def get_evaluation_by_class(
    db: AsyncSession, 
    class_id: int, 
    user_id: int
    ) -> List[models.Evaluation]:
    stmt = select(models.Evaluation).where(
        models.Evaluation.class_id == class_id,
        models.Evaluation.user_id == user_id
    )
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_evaluation(
    db: AsyncSession, 
    evaluation: schemas.EvaluationCreate
    ) -> models.Evaluation:
    db_evaluation = models.Evaluation(**evaluation.model_dump())
    db.add(db_evaluation)
    await db.commit()
    await db.refresh(db_evaluation)
    return db_evaluation

async def update_evaluation(
    db: AsyncSession,
    evaluation_id: int,
    evaluation_update: schemas.EvaluationUpdate,
    user_id: int
) -> Optional[models.Evaluation]:
    stmt = select(models.Evaluation).where(
        models.Evaluation.id == evaluation_id,
        models.Evaluation.user_id == user_id
    )
    result = await db.execute(stmt)
    evaluation = result.scalar_one_or_none()

    if not evaluation:
        return None

    for field, value in evaluation_update.model_dump(exclude_unset=True).items():
        setattr(evaluation, field, value)

    await db.commit()
    await db.refresh(evaluation)
    return evaluation

async def update_evaluation_status(
    db: AsyncSession,
    evaluation_id: int,
    status: str,
    started_at=None,
    completed_at=None
) -> Optional[models.Evaluation]:
    stmt = select(models.Evaluation).where(models.Evaluation.id == evaluation_id)
    result = await db.execute(stmt)
    evaluation = result.scalar_one_or_none()

    if not evaluation:
        return None

    evaluation.status = status
    if started_at is not None:
        evaluation.started_at = started_at
    if completed_at is not None:
        evaluation.completed_at = completed_at

    await db.commit()
    await db.refresh(evaluation)
    return evaluation

async def delete_evaluation(db: AsyncSession, evaluation_id: int, user_id: int) -> bool:
    stmt = select(models.Evaluation).where(
        models.Evaluation.id == evaluation_id,
        models.Evaluation.user_id == user_id
    )
    result = await db.execute(stmt)
    evaluation = result.scalar_one_or_none()

    if not evaluation:
        return False

    await db.delete(evaluation)
    await db.commit()
    return True


# Submission

async def update_assign_submission(
    db: AsyncSession, 
    submission_data: dict
    ):
    student_id = submission_data.get("student_id")
    assignment_id = submission_data.get("assignment_id")

    stmt = select(models.ASubmission).where(
        models.ASubmission.student_id == student_id,
        models.ASubmission.assignment_id == assignment_id
    )
    result = await db.execute(stmt)
    submission = result.scalar_one_or_none()

    if not submission:
        raise ValueError("해당 제출물이 존재하지 않습니다.")

    if "content" in submission_data:
        submission.content = submission_data["content"]
    if "revised_content" in submission_data:
        submission.revised_content = submission_data["revised_content"]
    if "status" in submission_data:
        submission.status = submission_data["status"]

    submission.submitted_at = datetime.datetime.now(datetime.timezone.utc)

    await db.commit()
    await db.refresh(submission)
    return submission

async def update_eval_submission(
    db: AsyncSession, 
    submission_data: dict
    ):
    student_id = submission_data.get("student_id")
    evaluation_id = submission_data.get("evaluation_id")

    print("학생 아디이", student_id)
    print("평가 아이디", evaluation_id)

    stmt = select(models.ESubmission).where(
        models.ESubmission.student_id == student_id,
        models.ESubmission.evaluation_id == evaluation_id
    )
    result = await db.execute(stmt)
    submission = result.scalar_one_or_none()

    if not submission:
        raise ValueError("해당 제출물이 존재하지 않습니다.")

    if "content" in submission_data:
        submission.content = submission_data["content"]
    if "status" in submission_data:
        submission.status = submission_data["status"]
    if "score" in submission_data :
        submission.score = submission_data['score']

    submission.submitted_at = datetime.datetime.now(datetime.timezone.utc)

    await db.commit()
    await db.refresh(submission)
    return submission

async def get_submissions_by_aid(
    db: AsyncSession, 
    assignment_id: Optional[int] = None, 
    student_id: Optional[int] = None
    ):
    stmt = select(models.ASubmission).options(
        selectinload(models.ASubmission.assign_feedback)
        )

    if assignment_id is not None:
        stmt = stmt.where(models.ASubmission.assignment_id == assignment_id)
    if student_id is not None:
        stmt = stmt.where(models.ASubmission.student_id == student_id)
    
    result = await db.execute(stmt)
    submissions = result.scalars().all()
    
    return submissions

async def get_submissions_by_eid(
    db: AsyncSession, 
    evaluation_id: Optional[int] = None, 
    student_id: Optional[int] = None
    ):
    stmt = select(models.ESubmission).options(
        selectinload(models.ESubmission.eval_feedback)
        )

    if evaluation_id is not None:
        stmt = stmt.where(models.ESubmission.evaluation_id == evaluation_id)
    if student_id is not None:
        stmt = stmt.where(models.ESubmission.student_id == student_id)

    result = await db.execute(stmt)
    return result.scalars().all()

async def create_submission_feedback(
    db: AsyncSession, 
    submission_data: schemas.ASubmissionGet
    ):
    submission = models.ASubmission(
        student_id=submission_data.student_id,
        assignment_id=submission_data.assignment_id,
        status=submission_data.status
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission

async def patch_submission_feedback(
    db: AsyncSession, 
    patch_info : schemas.SubmissionFeedbackPatch):
    # 피드백 조회
    if patch_info.evaluation_id :
        stmt_feedback = select(models.EFeedback).where(
            models.EFeedback.evaluation_id == patch_info.evaluation_id,
            models.EFeedback.student_id == patch_info.student_id
        )
    else :
        stmt_feedback = select(models.AFeedback).where(
            models.AFeedback.assignment_id == patch_info.assignment_id,
            models.AFeedback.student_id == patch_info.student_id
        )

    result = await db.execute(stmt_feedback)
    submission_feedback = result.scalar_one_or_none()

    if not submission_feedback:
        raise ValueError("해당 피드백이 존재하지 않습니다.")

    submission_feedback.content = patch_info.feedback

    if patch_info.evaluation_id :
        stmt_submission = select(models.ESubmission).where(
            models.ESubmission.evaluation_id == patch_info.evaluation_id,
            models.ESubmission.student_id == patch_info.student_id
        )
    else :
        stmt_submission = select(models.ASubmission).where(
            models.ASubmission.assignment_id == patch_info.assignment_id,
            models.ASubmission.student_id == patch_info.student_id
        )
    result_sub = await db.execute(stmt_submission)
    submission = result_sub.scalar_one_or_none()

    if patch_info.assignment_id and submission:
        submission.status = models.ASubmissionStatus.feedback_done

    await db.commit()
    await db.refresh(submission_feedback)
    return submission_feedback

async def start_assignment_for_class(
    db: AsyncSession,
    assignment_id: int,
    class_id: int
) -> int:
    stmt_students = select(models.Student).where(models.Student.class_id == class_id)
    result = await db.execute(stmt_students)
    students = result.scalars().all()

    created_count = 0

    for student in students:
        stmt_exist = select(models.ASubmission).where(
            models.ASubmission.assignment_id == assignment_id,
            models.ASubmission.student_id == student.id
        )
        exist_result = await db.execute(stmt_exist)
        exists = exist_result.scalar_one_or_none()

        if not exists:
            submission = models.ASubmission(
                assignment_id=assignment_id,
                student_id=student.id,
                content="",
                status="in_progress",
                submitted_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(submission)
            await db.flush()  # submission.id 확보

            feedback = models.AFeedback(
                assign_submission_id=submission.id,
                student_id=student.id,
                assignment_id=assignment_id,
                content=""
            )
            db.add(feedback)
            created_count += 1

    await db.commit()
    return created_count


async def start_evaluation_for_class(
    db: AsyncSession,
    evaluation_id: int,
    class_id: int
) -> int:
    stmt_students = select(models.Student).where(models.Student.class_id == class_id)
    result = await db.execute(stmt_students)
    students = result.scalars().all()

    created_count = 0

    for student in students:
        stmt_exist = select(models.ESubmission).where(
            models.ESubmission.evaluation_id == evaluation_id,
            models.ESubmission.student_id == student.id
        )
        exist_result = await db.execute(stmt_exist)
        exists = exist_result.scalar_one_or_none()

        if not exists:
            submission = models.ESubmission(
                evaluation_id=evaluation_id,
                student_id=student.id,
                content="",
                score = "",
                status="in_progress",
                submitted_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(submission)
            await db.flush()  # submission.id 확보

            feedback = models.EFeedback(
                eval_submission_id=submission.id,
                student_id=student.id,
                evaluation_id=evaluation_id,
                content=""
            )
            db.add(feedback)
            created_count += 1

    await db.commit()
    return created_count