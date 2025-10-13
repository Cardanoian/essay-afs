import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', // FastAPI 서버 주소
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// API 함수들
//------------------------------------------------
// 계정 관련 함수
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const signup = (payload: {
  email: string;
  password: string;
  name: string;
  school_level: string;
}) => api.post('/auth/register', payload);

export const getUserInfo = () => api.get('/auth/me');

export const getUserFullInfo = () => api.get('/auth/me/full');

export const updateFeedbackGuide = (feedback_guide: any) =>
  api.patch('/auth/feedback_guide', { feedback_guide });

// 학급 관련 함수
export const getClasses = () => api.get('/classes');

export const addClass = (class_info: { name: string; grade: string }) =>
  api.post('/classes', class_info);

export const updateClass = (
  classId: number,
  class_info: { name?: string; grade?: string }
) => api.put(`/classes/${classId}`, class_info);

export const deleteClass = (classId: number) =>
  api.delete(`/classes/${classId}`);

// 학생 관련 함수
export const getStudents = (classId: number) =>
  api.get(`/students/class/${classId}`);

export const addStudent = (student: {
  number: number;
  name: string;
  email?: string;
  class_id: number;
}) => api.post('/students', student);

export const uploadStudentsCSV = (classId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('class_id', String(classId));
  return api.post('/students/upload', formData);
};

export const deleteStudent = (student: {
  number: number;
  name: string;
  email?: string;
  class_id: number;
}) => api.post('/students/delete', student);

// 학생 분석 관련 함수
export const getStudentAnalysis = (analysis_data: { student_id: number }) =>
  api.get('/analysis', {
    params: analysis_data,
  });

export const createStudentAnalysis = (analysis_source: {
  level: string;
  grade: string;
  submissions: object;
}) => api.post('/analysis', { analysis_source });

// 과제 관련 함수
export const getAssignments = (classId: number) =>
  api.get(`/assignments/class/${classId}`);
export const getAssignment = (assignmentId: number) =>
  api.get(`/assignments/${assignmentId}`);
export const addAssignment = (assignment: {
  name: string;
  guide: string;
  condition: string;
  status: string;
  class_id: number;
}) => api.post('/assignments', assignment);

export const updateAssignment = (
  assignmentId: number,
  assignment: {
    name?: string;
    guide?: string;
    condition?: string;
    class_id?: number;
  }
) => api.put(`/assignments/${assignmentId}`, assignment);

export const deleteAssignment = (assignmentId: number) =>
  api.delete(`/assignments/${assignmentId}`);

export const updateAssignmentStatus = (assignmentId: number, status: string) =>
  api.patch(`/assignments/${assignmentId}/status`, { status });

export const startAssignment = (request: {
  assignment_id: number;
  class_id: number;
}) => api.post('/assignments/start_assignment', request);

// 평가 관련 함수
export const getEvaluations = (classId: number) =>
  api.get(`/evaluation/class/${classId}`);
export const getEvaluation = (evaluationId: number) =>
  api.get(`/evaluation/${evaluationId}`);
export const addEvaluation = (evaluation: {
  class_id: number;
  name: string;
  item: string;
  criteria: object;
  status: string;
}) => api.post('/evaluation', evaluation);

export const updateEvaluation = (
  evaluationId: number,
  evaluation: {
    name?: string;
    item?: string;
    criteria?: object;
    class_id?: number;
  }
) => api.put(`/evaluation/${evaluationId}`, evaluation);

export const deleteEvaluation = (evaluationId: number) =>
  api.delete(`/evaluation/${evaluationId}`);

export const updateEvaluationStatus = (evaluationId: number, status: string) =>
  api.patch(`/evaluation/${evaluationId}/status`, { status });

export const startEvaluation = (request: {
  evaluation_id: number;
  class_id: number;
}) => api.post('/evaluation/start_evaluation', request);

// 제출물 관련 함수
export const updateASubmission = (submission: {
  student_id: number;
  assignment_id?: number;
  content?: string;
  revised_content?: string;
  status: string;
}) => api.patch(`submission/update_assign_submission`, submission);

export const updateESubmission = (submission: {
  student_id: number;
  evaluation_id?: number;
  content?: string;
  score?: string;
  status: string;
}) => api.patch(`submission/update_eval_submission`, submission);

// 학생별 과제 제출 이력 조회
export const getASubmission = (params: {
  assignment_id?: number;
  student_id?: number;
}) => api.get('/submission/a', { params });

// 학생별 평가 제출 이력 조회
export const getESubmission = (params: {
  evaluation_id?: number;
  student_id?: number;
}) => api.get('/submission/e', { params });

export const getMidFeedback = (feedback_data: {
  condition?: string;
  guide?: string;
  content: string;
  last_feedbacks: string;
}) => api.post(`/ai/mid_feedback`, feedback_data);

export const getFinalFeedback = (feedback_data: {
  condition?: string;
  guide?: string;
  content: string;
  studentId: number;
  additional_instructions?: string;
}) => api.post(`/ai/final_feedback`, feedback_data);

export const patchSubmissionFeedback = (
  assignment_id: number,
  student_id: number,
  feedback: string
) =>
  api.patch('/submission/patch_feedback', {
    assignment_id,
    student_id,
    feedback,
  });

export const getAIScore = (score_data: {
  content: string;
  guide: string;
  criteria: object;
  studentId: number;
}) => api.post(`/ai/score`, score_data);
