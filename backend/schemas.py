from __future__ import annotations
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
import enum

# User


class UserSchoolLevel(str, enum.Enum):
    elementary = "초등학교"
    middle = "중학교"
    high = "고등학교"


class UserBase(BaseModel):
    email: EmailStr
    name: str
    school_level: UserSchoolLevel


class UserGet(UserBase):
    id: int
    feedback_guide: Dict[str, Any]
    model_config = ConfigDict(from_attributes=True)


class UserGetWithRelations(UserBase):
    id: int
    classes: List[ClassGet] = []
    assignment: List[AssignmentGet] = []
    evaluation: List[EvaluationGet] = []
    feedback_guide: Dict[str, Any]
    model_config = ConfigDict(from_attributes=True)


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserFeedbackGuideUpdate(BaseModel):
    feedback_guide: Dict[str, Any]


# SchoolClass


class ClassBase(BaseModel):
    name: str
    model_config = ConfigDict(from_attributes=True)


class ClassGet(ClassBase):
    id: int


class ClassUpdate(BaseModel):
    name: Optional[str] = None


class StudentBase(BaseModel):
    class_id: int
    number: int
    name: str
    email: Optional[str] = None


class StudentGet(StudentBase):
    id: int


class StudentGetwithAnalysis(StudentGet):
    analysis_result: Dict[str, Any]


# Assignment


class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class AssignmentBase(BaseModel):
    name: str
    class_id: int
    status: AssignmentStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    guide: Optional[str] = None
    condition: Optional[str] = None


class AssignmentCreate(AssignmentBase):
    user_id: int


class AssignmentUpdate(BaseModel):
    name: Optional[str] = None
    class_id: Optional[int] = None
    guide: Optional[str] = None
    condition: Optional[str] = None


class AssignmentGet(AssignmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AssignmentStartRequest(BaseModel):
    assignment_id: int
    class_id: int


# Evaluation
class EvaluationBase(BaseModel):
    class_id: int
    name: str
    item: str
    criteria: Dict[str, Any]
    status: AssignmentStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class EvaluationCreate(EvaluationBase):
    user_id: int


class EvaluationUpdate(BaseModel):
    name: Optional[str] = None
    class_id: Optional[int] = None
    criteria: Dict[str, Any]
    item: str


class EvaluationGet(EvaluationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class EvaluationStartRequest(BaseModel):
    evaluation_id: int
    class_id: int


# Submission


class SubmissionBase(BaseModel):
    student_id: int
    content: Optional[str] = None
    submitted_at: Optional[datetime] = None
    status: str


class ASubmissionUpdate(SubmissionBase):
    assignment_id: int
    revised_content: Optional[str] = None


class ESubmissionUpdate(SubmissionBase):
    evaluation_id: int
    revised_content: Optional[str] = None
    score: Optional[str] = None


class ASubmissionGet(SubmissionBase):
    id: int
    revised_content: Optional[str] = None
    assignment_id: int
    assign_feedback: List[FeedbackGet] = []
    model_config = ConfigDict(from_attributes=True)


class ESubmissionGet(SubmissionBase):
    id: int
    score: str
    evaluation_id: int
    feedbacks: List[FeedbackGet] = []
    model_config = ConfigDict(from_attributes=True)


class SubmissionCreate(SubmissionBase):
    submitted_at: Optional[datetime] = None


class SubmissionFeedback(SubmissionBase):
    status: str
    feedback: str


class SubmissionFeedbackPatch(BaseModel):
    assignment_id: Optional[int] = None
    evaluation_id: Optional[int] = None
    student_id: int
    feedback: str


# Feedback
class FeedbackGet(BaseModel):
    id: int
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Analysis


class AnalysisBase(BaseModel):
    student_id: int


class AnalysisCreate(BaseModel):
    analysis_source: Dict[str, Any]


class AnalysisGet(AnalysisBase):
    id: int
    class_: Dict[str, Any]
    analysis_results: Dict[str, Any]
