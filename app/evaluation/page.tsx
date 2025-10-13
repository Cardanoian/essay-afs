"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "../components/Modal";
import { getClasses, getEvaluations, addEvaluation, updateEvaluationStatus, updateEvaluation, deleteEvaluation, startEvaluation } from "../lib/api";
import { encodeAssignmentToken } from "../lib/hashids";
import { loginCheck } from "../hooks"
import { toast } from "react-toastify";

interface Class {
  id: number;
  name: string;
}
interface Evaluation {
  id: number;
  name: string;
  type: string;
  class_id: number;
  className?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  item: string;
  criteria: object;
}

export default function EvaluationEvaluationsPage() {
  loginCheck();

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [evaluationItem, setEvaluationItem] = useState("")
  const [editEvaluation, setEditEvaluation] = useState<Evaluation | null>(null);
  const [confirmAction, setConfirmAction] = useState<{action: string, evaluation: Evaluation} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null);
  const [criteriaSteps, setCriteriaSteps] = useState(3); // 단계 개수
  const [criteria, setCriteria] = useState([
    { name: "", description: "" },
    { name: "", description: "" },
    { name: "", description: "" },
  ]);
  

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
      getEvaluations(classId)
        .then(res => setEvaluations(res.data))
        .finally(() => setLoading(false));
    } else {
      setEvaluations([]);
    }
  }, [classId]);

  // 단계 개수 변경 시 criteria 배열 동기화
  useEffect(() => {
    setCriteria((prev) => {
      const arr = [...prev];
      if (criteriaSteps > arr.length) {
        // 늘리기
        for (let i = arr.length; i < criteriaSteps; i++) {
          arr.push({ name: "", description: "" });
        }
      } else if (criteriaSteps < arr.length) {
        // 줄이기
        arr.length = criteriaSteps;
      }
      return arr;
    });
  }, [criteriaSteps]);

  const handleAddEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !classId) return;
    setLoading(true);
    
    // criteria 배열을 객체로 변환
    const criteriaObject = criteria.reduce((acc, criterion, index) => {
      if (criterion.name && criterion.description) {
        acc[criterion.name] = criterion.description;
      }
      return acc;
    }, {} as Record<string, string>);
    
    await addEvaluation({ 
      name, 
      item: evaluationItem, 
      criteria: criteriaObject,
      status : "pending", 
      class_id: classId 
    });

    const res = await getEvaluations(classId);
    setEvaluations(res.data);
    setName("");
    setEvaluationItem("");
    setShowAdd(false);
    setLoading(false);
  };

  const handleEditEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !classId || !editEvaluation) return;
    setLoading(true);
    
    try {
      // criteria 배열을 객체로 변환
      const criteriaObject = criteria.reduce((acc, criterion, index) => {
        if (criterion.name && criterion.description) {
          acc[criterion.name] = criterion.description;
        }
        return acc;
      }, {} as Record<string, string>);

      // API 호출로 과제 수정
      await updateEvaluation(editEvaluation.id, {
        name,
        item: evaluationItem,
        criteria: criteriaObject,
        class_id: classId
      });

      // 성공 시 과제 목록 갱신
      const res = await getEvaluations(classId);
      setEvaluations(res.data);
      
      // 폼 초기화
      setName("");
      setEvaluationItem("");
      setEditEvaluation(null);
      setShowAdd(false);
    } catch (error) {
      console.error("과제 수정 중 오류:", error);
      alert("과제 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (editEvaluation) {
      handleEditEvaluation(e);
    } else {
      handleAddEvaluation(e);
    }
  };

  const handleModalClose = () => {
    setShowAdd(false);
    setEditEvaluation(null);
    setName("");
    setEvaluationItem("");
  };

  const handleStatusUpdate = async () => {
    if (!confirmAction) return;
    
    const { action, evaluation } = confirmAction;
    let newStatus = "";
    let started_at = evaluation.started_at;
    let completed_at = evaluation.completed_at;
    
    try {
      if (action === "평가 배부하기") {
        // 1. 모든 학생에 대해 evaluation 제출물 생성
        const res = await startEvaluation({
          evaluation_id: evaluation.id,
          class_id: evaluation.class_id
        });
        if (res?.data?.created) {
          toast.success(`평가가 시작되었습니다! (${res.data.created}명 학생에게 배부됨)`);
        }
        newStatus = "in_progress";
        started_at = new Date().toISOString();
        await updateEvaluationStatus(evaluation.id, newStatus);
      } else if (action === "과제 종료하기") {
        newStatus = "completed";
        completed_at = new Date().toISOString();
        await updateEvaluationStatus(evaluation.id, newStatus);
      } else if (action === "과제 활성화하기") {
        newStatus = "in_progress";
        completed_at = undefined; // 종료시간 리셋
        await updateEvaluationStatus(evaluation.id, newStatus);
      }
      // 성공 시 과제 목록 갱신
      const res = await getEvaluations(classId!);
      setEvaluations(res.data);
      setShowConfirm(false);
      setConfirmAction(null);
    } catch (error) {
      console.error("과제 상태 업데이트 중 오류:", error);
      alert("과제 상태 업데이트 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteEvaluation(deleteTarget.id);
      
      // 성공 시 과제 목록 갱신
      const res = await getEvaluations(classId!);
      setEvaluations(res.data);
      
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("과제 삭제 중 오류:", error);
      alert("과제 삭제 중 오류가 발생했습니다.");
    }
  };

  // 카드 버튼 핸들러(임시)
  const handleCardBtn = (action: string, evaluation: Evaluation) => {
    if (action === "평가 배부하기" && evaluation.status === "pending") {
      setConfirmAction({ action, evaluation });
      setShowConfirm(true);
    } else if (action === "과제 종료하기" && evaluation.status === "in_progress") {
      setConfirmAction({ action, evaluation });
      setShowConfirm(true);
    } else if (action === "과제 활성화하기" && evaluation.status === "completed") {
      setConfirmAction({ action, evaluation });
      setShowConfirm(true);
    } else if (action === "평가 배부하기" && evaluation.status === "in_progress") {
      const token = encodeAssignmentToken(evaluation.id, evaluation.class_id);
      router.push(`/e_dist/evaluation/${token}`);
    } else if (action === "제출물 관리") {
      const token = encodeAssignmentToken(evaluation.id, evaluation.class_id);
      router.push(`/e_dist/manage_submit/${token}`);
    } else if (action === "과제 설정하기") {
      // 수정 모드로 모달 열기
      setEditEvaluation(evaluation);
      setName(evaluation.name);
      setEvaluationItem(evaluation.item || "");
      
      // criteria 객체를 배열로 변환
      if (evaluation.criteria && typeof evaluation.criteria === 'object') {
        const criteriaArray = Object.entries(evaluation.criteria).map(([name, description]) => ({
          name,
          description: description as string
        }));
        setCriteria(criteriaArray);
        setCriteriaSteps(criteriaArray.length);
      } else {
        setCriteria([
          { name: "", description: "" },
          { name: "", description: "" },
          { name: "", description: "" },
        ]);
        setCriteriaSteps(3);
      }
      
      setClassId(evaluation.class_id);
      setShowAdd(true);
    } else if (action === "과제 삭제하기") {
      setDeleteTarget(evaluation);
      setShowDeleteConfirm(true);
    } else {
      alert(`${evaluation.name} - ${action}`);
    }
  };

  const getConfirmMessage = () => {
    if (!confirmAction) return "";
    
    switch (confirmAction.action) {
      case "평가 배부하기":
        return "과제를 시작하시겠습니까?";
      case "과제 종료하기":
        return "과제를 마무리하시겠습니까?";
      case "과제 활성화하기":
        return "과제를 다시 활성화하시겠습니까?";
      default:
        return "";
    }
  };

  const getButtonText = (evaluation: Evaluation) => {
    switch (evaluation.status) {
      case "pending":
        return "평가 배부하기";
      case "in_progress":
        return "평가 배부하기";
      case "completed":
        return "과제 활성화하기";
      default:
        return "평가 배부하기";
    }
  };

  const getStatusButtonText = (evaluation: Evaluation) => {
    switch (evaluation.status) {
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

  const getFilteredEvaluations = () => {
    let filtered = evaluations;
    if (statusFilter !== "all") {
      filtered = evaluations.filter(a => a.status === statusFilter);
    }
    return filtered.sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-extrabold mb-6 text-pink-700 tracking-tight">평가활동 문항 관리</h1>
      <button
        onClick={() => setShowAdd(true)}
        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg px-5 py-2 font-bold shadow hover:from-pink-600 hover:to-purple-600 transition mb-6"
      >
        + 문항 추가
      </button>
      <div className="flex gap-4 mb-6 flex-wrap">
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => setClassId(cls.id)}
            className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${classId === cls.id ? "bg-pink-600 text-white scale-105" : "bg-white hover:bg-pink-50"}`}
          >
            {cls.name}
          </button>
        ))}
      </div>
      
      {/* 상태 필터 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${statusFilter === "all" ? "bg-pink-600 text-white" : "bg-white hover:bg-pink-50"}`}
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
      
      {loading && <div className="text-center text-pink-500 font-semibold">로딩 중...</div>}
      {/* 가로형 카드 리스트 */}
      <div className="flex flex-col gap-6">
        {getFilteredEvaluations().map(a => (
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
                  {a.item && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">문항: {a.item}</span>}
                  {a.criteria && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">기준: {Object.keys(a.criteria).length}개</span>}
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
                    onClick={() => handleCardBtn("평가 배부하기", a)}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg py-2 px-5 text-sm font-semibold shadow hover:from-blue-600 hover:to-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={a.status === "completed"}
                  >
                    평가 배부하기
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
      {/* 문항 추가/수정 모달 */}
      <Modal open={showAdd} onClose={handleModalClose} className="max-w-4xl">
        <div className="w-full">
          <h2 className="text-xl font-bold mb-4 text-pink-700">
            {editEvaluation ? "문항 수정" : "문항 추가"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            {/* 평가 제목 */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-pink-700 mb-1">평가 제목 :</label>
              <input
                type="text"
                placeholder="평가 제목"
                value={name}
                onChange={e => setName(e.target.value)}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400 text-lg w-full"
                autoFocus
              />
            </div>
            {/* 평가 기준 */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-pink-700 mb-1">평가 기준 :</label>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-700">단계 개수</span>
                <select
                  value={criteriaSteps}
                  onChange={e => setCriteriaSteps(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {[3,4,5].map(n => <option key={n} value={n}>{n}단계</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full mt-2 rounded-xl shadow border-separate border-spacing-0 bg-white">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-gray-50 text-left rounded-tl-xl w-3/12">단계 이름</th>
                      <th className="px-4 py-3 bg-gray-50 text-left rounded-tr-xl w-7/12">평가 기준</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((step, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-4 py-2 align-top border-b border-gray-200 w-3/12">
                          <input
                            type="text"
                            placeholder={`예: 우수, 보통, 미흡 등`}
                            value={step.name}
                            onChange={e => {
                              const arr = [...criteria];
                              arr[idx].name = e.target.value;
                              setCriteria(arr);
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition"
                          />
                        </td>
                        <td className="px-4 py-2 align-top border-b border-gray-200 w-7/12">
                          <input
                            placeholder="이 단계의 평가 기준을 입력하세요"
                            value={step.description}
                            onChange={e => {
                              const arr = [...criteria];
                              arr[idx].description = e.target.value;
                              setCriteria(arr);
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full resize-y min-h-[40px] focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* 평가 문항 */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-pink-700 mb-1">평가 문항 :</label>
              <textarea
                placeholder="평가 문항을 입력하세요"
                value={evaluationItem}
                onChange={e => setEvaluationItem(e.target.value)}
                className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400 text-lg resize-y min-h-[60px]"
              />
            </div>
            <button type="submit" className={`bg-pink-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-pink-700 transition flex items-center justify-center ${loading ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={loading}>
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : null}
              {loading ? "추가 중..." : editEvaluation ? "저장" : "추가"}
            </button>
          </form>
        </div>
      </Modal>

      {/* 상태 변경 확인 모달 */}
      <Modal open={showConfirm} onClose={() => { setShowConfirm(false); setConfirmAction(null); }}>
        <h2 className="text-xl font-bold mb-4 text-pink-700">확인</h2>
        <p className="text-lg mb-6">{getConfirmMessage()}</p>
        <div className="flex gap-3">
          <button
            onClick={handleStatusUpdate}
            className="flex-1 bg-pink-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-pink-700 transition"
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
              onClick={handleDeleteEvaluation}
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