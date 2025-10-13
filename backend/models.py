from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, JSON
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime
import enum

class Base(AsyncAttrs, DeclarativeBase):
    pass

class SchoolLevel(str, enum.Enum):
    elementary = "초등학교"
    middle = "중학교"
    high = "고등학교"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    school_level = Column(Enum(SchoolLevel), nullable=False)
    name = Column(String, nullable=False)
    feedback_guide = Column(JSON, nullable=True, default=dict)

    classes = relationship("SchoolClass", back_populates="user", cascade="all, delete-orphan")
    assignment = relationship("Assignment", back_populates="user", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="user", cascade="all, delete-orphan")

class SchoolClass(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    school_level = Column(Enum(SchoolLevel), nullable=False)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="classes")
    student = relationship("Student", back_populates="class_", cascade="all, delete-orphan")
    assignment = relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="class_", cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "student"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)

    class_ = relationship("SchoolClass", back_populates="student")
    eval_submission = relationship("ESubmission", back_populates="student", cascade="all, delete-orphan")
    assign_submission = relationship("ASubmission", back_populates="student", cascade="all, delete-orphan")
    assign_feedback = relationship("AFeedback", back_populates="student", cascade="all, delete-orphan")
    eval_feedback = relationship("EFeedback", back_populates="student", cascade="all, delete-orphan")
    analysis_result = relationship("AnalysisResult", back_populates="student", cascade="all, delete-orphan")

class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"

class Assignment(Base):
    __tablename__ = "assignment"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(Enum(AssignmentStatus), nullable=False, default=AssignmentStatus.pending)
    guide = Column(Text, nullable=True)
    condition = Column(Text, nullable=True)

    class_ = relationship("SchoolClass", back_populates="assignment")
    user = relationship("User", back_populates="assignment")
    assign_submission = relationship("ASubmission", back_populates="assignment", cascade="all, delete-orphan")
    assign_feedback = relationship("AFeedback", back_populates="assignment", cascade="all, delete-orphan")

class Evaluation(Base):
    __tablename__ = "evaluation"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(Enum(AssignmentStatus), nullable=False, default=AssignmentStatus.pending)
    criteria = Column(JSON, nullable=True, default=dict)
    item = Column(Text, nullable=True)

    class_ = relationship("SchoolClass", back_populates="evaluations")
    user = relationship("User", back_populates="evaluations")
    submission = relationship("ESubmission", back_populates="evaluation", cascade="all, delete-orphan")
    eval_feedback = relationship("EFeedback", back_populates="evaluation", cascade="all, delete-orphan")

class ASubmissionStatus(str, enum.Enum):
    in_progress = "in_progress"
    first_submitted = "first_submitted"
    feedback_done = "feedback_done"
    final_submitted = "final_submitted"

class ASubmission(Base):
    __tablename__ = "assign_submission"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignment.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    revised_content = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=False)
    status = Column(Enum(ASubmissionStatus), nullable=False, default=ASubmissionStatus.in_progress)

    assignment = relationship("Assignment", back_populates="assign_submission")
    student = relationship("Student", back_populates="assign_submission")
    assign_feedback = relationship("AFeedback", back_populates="assign_submission", cascade="all, delete-orphan")

class ESubmissionStatus(str, enum.Enum):
    in_progress = "in_progress"
    submitted = "submitted"

class ESubmission(Base):
    __tablename__ = "esubmission"
    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluation.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    score = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=False)
    status = Column(Enum(ESubmissionStatus), nullable=False, default=ESubmissionStatus.in_progress)

    evaluation = relationship("Evaluation", back_populates="submission")
    student = relationship("Student", back_populates="eval_submission")
    eval_feedback = relationship("EFeedback", back_populates="eval_submission", cascade="all, delete-orphan")

class AFeedback(Base):
    __tablename__ = "assign_feedback"
    id = Column(Integer, primary_key=True, index=True)
    assign_submission_id = Column(Integer, ForeignKey("assign_submission.id", ondelete="CASCADE"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignment.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    assign_submission = relationship("ASubmission", back_populates="assign_feedback")
    student = relationship("Student", back_populates="assign_feedback")
    assignment = relationship("Assignment", back_populates="assign_feedback")

class EFeedback(Base):
    __tablename__ = "eval_feedback"
    id = Column(Integer, primary_key=True, index=True)
    eval_submission_id = Column(Integer, ForeignKey("esubmission.id", ondelete="CASCADE"), nullable=False)
    evaluation_id = Column(Integer, ForeignKey("evaluation.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    eval_submission = relationship("ESubmission", back_populates="eval_feedback")
    student = relationship("Student", back_populates="eval_feedback")
    evaluation = relationship("Evaluation", back_populates="eval_feedback")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False)

    analysis_source = Column(JSON, nullable=True, default=dict)
    analysis_result = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship("Student", back_populates="analysis_result")