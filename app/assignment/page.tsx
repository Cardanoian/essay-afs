"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "../components/Modal";
import { getClasses, getAssignments, addAssignment, updateAssignmentStatus, updateAssignment, deleteAssignment, startAssignment } from "../lib/api";
import { encodeAssignmentToken } from "../lib/hashids";
import { toast } from "react-toastify";
import { loginCheck } from "../hooks"

interface Class {
  id: number;
  name: string;
}
interface Assignment {
  id: number;
  name: string;
  class_id: number;
  className?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  guide?: string;
  condition?: string;
}

export default function EducationAssignmentsPage() {
  loginCheck();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [studentGuide, setStudentGuide] = useState("")
  const [assignmentCondition, setAssignmentCondition] = useState("")
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [confirmAction, setConfirmAction] = useState<{action: string, assignment: Assignment} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  

  const router = useRouter();

  // 학급 목록 불러오기
  useEffect(() => {
    getClasses().then(res => {
      setClasses(res.data);
      if (res.data.length > 0) setClassId(res.data[0].id);
    });
  }, []);

  // 과제 목록 불러오기
  useEffect(() => {
    if (classId) {
      setLoading(true);
      getAssignments(classId)
        .then(res => setAssignments(res.data))
        .finally(() => setLoading(false));
    } else {
      setAssignments([]);
    }
  }, [classId]);

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !classId) return;
    setLoading(true);
    
    await addAssignment({ 
      name, 
      guide : studentGuide, 
      condition :assignmentCondition,
      status : "pending", 
      class_id: classId 
    });

    const res = await getAssignments(classId);
    setAssignments(res.data);
    setName("");
    setStudentGuide("");
    setAssignmentCondition("");
    setShowAdd(false);
    setLoading(false);
  };

  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !classId || !editAssignment) return;
    setLoading(true);
    
    try {
      // API 호출로 과제 수정
      await updateAssignment(editAssignment.id, {
        name,
        guide: studentGuide,
        condition: assignmentCondition,
        class_id: classId
      });

      // 성공 시 과제 목록 갱신
      const res = await getAssignments(classId);
      setAssignments(res.data);
      
      // 폼 초기화
      setName("");
      setStudentGuide("");
      setAssignmentCondition("");
      setEditAssignment(null);
      setShowAdd(false);
    } catch (error) {
      console.error("과제 수정 중 오류:", error);
      alert("과제 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteAssignment(deleteTarget.id);
      
      // 성공 시 과제 목록 갱신
      const res = await getAssignments(classId!);
      setAssignments(res.data);
      
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("과제 삭제 중 오류:", error);
      alert("과제 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (editAssignment) {
      handleEditAssignment(e);
    } else {
      handleAddAssignment(e);
    }
  };

  const handleModalClose = () => {
    setShowAdd(false);
    setEditAssignment(null);
    setName("");
    setStudentGuide("");
    setAssignmentCondition("");
  };

  const handleStatusUpdate = async () => {
    if (!confirmAction) return;
    
    const { action, assignment } = confirmAction;
    let newStatus = "";
    let started_at = assignment.started_at;
    let completed_at = assignment.completed_at;
    
    try {
      if (action === "과제 배부하기") {
        // 1. 모든 학생에 대해 subm ission 생성
        const res = await startAssignment(
          {
            assignment_id : assignment.id, 
            class_id : assignment.class_id
          }
          );
        toast.success(`과제가 시작되었습니다! (${res.data.created}명 학생에게 배부됨)`);
        newStatus = "in_progress";
        started_at = new Date().toISOString();
        await updateAssignmentStatus(assignment.id, newStatus);
      } else if (action === "과제 종료하기") {
        newStatus = "completed";
        completed_at = new Date().toISOString();
        await updateAssignmentStatus(assignment.id, newStatus);
      } else if (action === "과제 활성화하기") {
        newStatus = "in_progress";
        completed_at = undefined; // 종료시간 리셋
        await updateAssignmentStatus(assignment.id, newStatus);
      }
      
      // 성공 시 과제 목록 갱신
      const res = await getAssignments(classId!);
      setAssignments(res.data);
      
      setShowConfirm(false);
      setConfirmAction(null);
    } catch (error) {
      console.error("과제 상태 업데이트 중 오류:", error);
      toast.error("과제 상태 업데이트 중 오류가 발생했습니다.");
    }
  };

  // 카드 버튼 핸들러(임시)
  const handleCardBtn = (action: string, assignment: Assignment) => {
    if (action === "과제 배부하기" && assignment.status === "pending") {
      setConfirmAction({ action, assignment });
      setShowConfirm(true);

    } else if (action === "과제 종료하기" && assignment.status === "in_progress") {
      setConfirmAction({ action, assignment });
      setShowConfirm(true);

    } else if (action === "과제 활성화하기" && assignment.status === "completed") {
      setConfirmAction({ action, assignment });
      setShowConfirm(true);

    } else if (action === "과제 배부하기" && assignment.status === "in_progress") {
      const token = encodeAssignmentToken(assignment.id, assignment.class_id);
      router.push(`/a_dist/assignment/${token}`);
    
    } else if (action === "제출물 관리") {
      const token = encodeAssignmentToken(assignment.id, assignment.class_id);
      router.push(`/a_dist/manage_submit/${token}`)

    } else if (action === "과제 설정하기") {
      // 수정 모드로 모달 열기
      setEditAssignment(assignment);
      setName(assignment.name);
      setStudentGuide(assignment.guide || "");
      setAssignmentCondition(assignment.condition || "");
      setClassId(assignment.class_id);
      setShowAdd(true);
      
    } else if (action === "과제 삭제하기") {
      setDeleteTarget(assignment);
      setShowDeleteConfirm(true);
    } else {
      alert(`${assignment.name} - ${action}`);
    }
  };

  const getConfirmMessage = () => {
    if (!confirmAction) return "";
    
    switch (confirmAction.action) {
      case "과제 배부하기":
        return "과제를 시작하시겠습니까?";
      case "과제 종료하기":
        return "과제를 마무리하시겠습니까?";
      case "과제 활성화하기":
        return "과제를 다시 활성화하시겠습니까?";
      default:
        return "";
    }
  };


  const getStatusButtonText = (assignment: Assignment) => {
    switch (assignment.status) {
      case "pending":
        return null; // pending 상태에서는 상태 변경 버튼 없음
      case "in_progress":
        return "과제 종료하기";
      case "completed":
        return "과제 활성화하기";
      default:
        return null;
    }
  };

  const getStatusOrder = (status: string) => {
    switch (status) {
      case "pending":
        return 0;
      case "in_progress":
        return 1;
      case "completed":
        return 2;
      default:
        return 3;
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return null;
    const utcDate = new Date(dateString);
    const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // UTC+9 보정
    return kstDate.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "in_progress":
        return "진행중";
      case "completed":
        return "완료";
      default:
        return "알 수 없음";
    }
  };

  const getFilteredAssignments = () => {
    let filtered = assignments;
    if (statusFilter !== "all") {
      filtered = assignments.filter(a => a.status === statusFilter);
    }
    return filtered.sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-extrabold mb-6 text-indigo-700 tracking-tight">교육활동 과제 관리</h1>
      <button
        onClick={() => setShowAdd(true)}
        className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg px-5 py-2 font-bold shadow hover:from-indigo-600 hover:to-blue-600 transition mb-6"
      >
        + 과제 추가
      </button>
      <div className="flex gap-4 mb-6 flex-wrap">
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => setClassId(cls.id)}
            className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${classId === cls.id ? "bg-indigo-600 text-white scale-105" : "bg-white hover:bg-indigo-50"}`}
          >
            {cls.name}
          </button>
        ))}
      </div>
      {/* 상태 필터 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${statusFilter === "all" ? "bg-indigo-600 text-white" : "bg-white hover:bg-indigo-50"}`}
        >
          전체
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${statusFilter === "pending" ? "bg-yellow-500 text-white" : "bg-white hover:bg-yellow-50"}`}
        >
          대기중
        </button>
        <button
          onClick={() => setStatusFilter("in_progress")}
          className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${statusFilter === "in_progress" ? "bg-blue-500 text-white" : "bg-white hover:bg-blue-50"}`}
        >
          진행중
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${statusFilter === "completed" ? "bg-green-500 text-white" : "bg-white hover:bg-green-50"}`}
        >
          완료
        </button>
      </div>
      {loading && <div className="text-center text-indigo-500 font-semibold">로딩 중...</div>}
      {/* 가로형 카드 리스트 */}
      <div className="flex flex-col gap-6">
        {getFilteredAssignments().map(a => (
          <div
            key={a.id}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-row items-stretch w-full overflow-hidden group relative"
          >
            {/* 상태 영역 (왼쪽, 색상 전체, 큰 글씨) */}
            <div className={`flex flex-col justify-center items-center min-w-[140px] px-6 py-0 ${getStatusColor(a.status)} relative`}>
              <span className="text-2xl font-extrabold tracking-wide text-center w-full py-10">{getStatusText(a.status)}</span>
            </div>
            {/* 메인 콘텐츠 */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-between p-8 gap-6">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 truncate">{a.name}</h3>
                <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-2">
                  {a.started_at && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">시작:</span>
                      <span>{formatDateTime(a.started_at)}</span>
                    </div>
                  )}
                  {a.completed_at && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">종료:</span>
                      <span>{formatDateTime(a.completed_at)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {a.guide && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">안내: {a.guide}</span>}
                  {a.condition && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">조건: {a.condition}</span>}
                </div>
              </div>
              {/* 우측 버튼 영역 */}
              <div className="flex flex-col items-end min-w-[220px] gap-2 relative pt-10">
                <button
                  onClick={() => {
                    setDeleteTarget(a);
                    setShowDeleteConfirm(true);
                  }}
                  className="absolute top-0 right-0 w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-20"
                  title="과제 삭제"
                  style={{ marginTop: '-12px', marginRight: '-12px' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex flex-col gap-2 w-full pt-2">
                  <button
                    onClick={() => handleCardBtn("과제 배부하기", a)}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg py-2 px-5 text-sm font-semibold shadow hover:from-blue-600 hover:to-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={a.status === "completed"}
                  >
                    과제 배부하기
                  </button>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleCardBtn("제출물 관리", a)}
                      className="flex-1 bg-gradient-to-r from-indigo-400 to-purple-400 text-white rounded-lg py-2 px-3 text-sm font-semibold shadow hover:from-indigo-500 hover:to-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={a.status === "completed"}
                    >
                      제출물 관리
                    </button>
                    <button
                      onClick={() => handleCardBtn("과제 설정하기", a)}
                      className="flex-1 bg-gradient-to-r from-green-400 to-blue-400 text-white rounded-lg py-2 px-3 text-sm font-semibold shadow hover:from-green-500 hover:to-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={a.status === "completed"}
                    >
                      설정
                    </button>
                  </div>
                  {getStatusButtonText(a) && (
                    <button
                      onClick={() => handleCardBtn(getStatusButtonText(a)!, a)}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg py-2 px-3 text-sm font-semibold shadow hover:from-yellow-500 hover:to-orange-500 transition"
                    >
                      {getStatusButtonText(a)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* 과제 추가/수정 모달 */}
      <Modal open={showAdd} onClose={handleModalClose}>
        <h2 className="text-xl font-bold mb-4 text-indigo-700">
          {editAssignment ? "과제 수정" : "과제 추가"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-indigo-700 mb-1">과제 제목 :</label>
            <input
              type="text"
              placeholder="과제 제목"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-indigo-700 mb-1">작성 조건 / 과제 문항 :</label>
            <textarea
              placeholder="작성 조건 또는 과제 문항을 입력하세요"
              value={assignmentCondition}
              onChange={e => setAssignmentCondition(e.target.value)}
              className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg resize-y min-h-[60px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-indigo-700 mb-1">학생 안내 문구 :</label>
            <textarea
              placeholder="학생들에게 보여질 안내 문구를 입력하세요"
              value={studentGuide}
              onChange={e => setStudentGuide(e.target.value)}
              className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg resize-y min-h-[40px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-indigo-700 mb-1">배부 학급 :</label>
            <select
              value={classId ?? undefined}
              onChange={e => setClassId(Number(e.target.value))}
              className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg"
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={`bg-indigo-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-indigo-700 transition flex items-center justify-center ${loading ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={loading}>
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : null}
            {loading ? "추가 중..." : editAssignment ? "저장" : "추가"}
          </button>
        </form>
      </Modal>

      {/* 상태 변경 확인 모달 */}
      <Modal open={showConfirm} onClose={() => { setShowConfirm(false); setConfirmAction(null); }}>
        <h2 className="text-xl font-bold mb-4 text-indigo-700">확인</h2>
        <p className="text-lg mb-6">{getConfirmMessage()}</p>
        <div className="flex gap-3">
          <button
            onClick={handleStatusUpdate}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-indigo-700 transition"
          >
            확인
          </button>
          <button
            onClick={() => { setShowConfirm(false); setConfirmAction(null); }}
            className="flex-1 bg-gray-400 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-gray-500 transition"
          >
            취소
          </button>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">과제 삭제</h2>
          <p className="text-gray-600 mb-6">
            <span className="font-semibold text-red-600">"{deleteTarget?.name}"</span> 과제를 삭제하시겠습니까?
          </p>
          <p className="text-sm text-gray-500 mb-6">이 작업은 되돌릴 수 없습니다.</p>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteAssignment}
              className="flex-1 bg-red-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-red-700 transition"
            >
              삭제
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
              className="flex-1 bg-gray-400 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-gray-500 transition"
            >
              취소
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 