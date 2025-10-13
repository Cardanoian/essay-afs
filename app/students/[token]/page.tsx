"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useAuth from "../../hooks/auth";
import { getASubmission, getAssignment, createStudentAnalysis, getStudentAnalysis, getESubmission, getEvaluation } from "../../lib/api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import { useRef } from "react";
import { downloadCSV, convertStudentHistoryToCSV, convertStudentAssignmentHistoryToCSV, convertStudentEvaluationHistoryToCSV } from "../../lib/utils";
import { toast } from "react-toastify";
import { encodeStudentToken, decodeStudentToken } from "../../lib/hashids";

interface AnalysisData {
  analysis_result?: { content: string }[];
  grade: string;
  school_level: string;
}

interface Submission {
  id: number;
  assignment_title: string;
  student_id: number;
  content: string;
  revised_content: string;
  submitted_at: string;
  feedback?: { content: string }[];
}

// Markdown 스타일 커스텀 컴포넌트
const markdownComponents = {
  h1: (props: any) => <h1 className="text-2xl font-bold mt-6 mb-2 text-blue-800" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-bold mt-4 mb-2 text-blue-700" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-semibold mt-3 mb-1 text-blue-600" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-6 mb-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-6 mb-2" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-blue-800" {...props} />,
  em: (props: any) => <em className="italic text-indigo-700" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600 mb-2" {...props} />,
  code: (props: any) => <code className="bg-gray-100 rounded px-1 py-0.5 text-sm text-pink-600" {...props} />,
  p: (props: any) => <p className="mb-2" {...props} />,
};

// 평가 제출 이력 테이블용 스타일 유틸
const getScoreBadge = (score: string) => {
  if (score === '상') return 'bg-green-100 text-green-700 border-green-300';
  if (score === '중') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  if (score === '하') return 'bg-red-100 text-red-700 border-red-300';
  return 'bg-gray-100 text-gray-500 border-gray-200';
};

export default function StudentDetailPage() {
  const { token } = useParams();
  const studentId = typeof token === 'string' ? decodeStudentToken(token) : null;
  const { user, userLoading } = useAuth();
  const [tab, setTab] = useState<"analysis" | "a_history" | "e_history">("analysis");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const ANALYSIS_AREAS = [
    { key: "grammar", label: "문법" },
    { key: "spelling", label: "맞춤법" },
    { key: "sentence", label: "문장 구조" },
    { key: "structure", label: "글 구조" },
    { key: "vocab", label: "어휘" },
  ];

  const DUMMY_ANALYSIS = {
    grammar: "문법이 전반적으로 우수합니다. 일부 시제 일치에 주의가 필요합니다.",
    spelling: "맞춤법 오류가 거의 없습니다. 띄어쓰기에 조금 더 신경써주세요.",
    sentence: "문장 구조가 다양하며 자연스럽습니다.",
    structure: "글의 전체 구조가 논리적입니다. 도입-전개-결론이 잘 구분되어 있습니다.",
    vocab: "어휘 선택이 풍부하고 적절합니다.",
  };
  const [analysisReady, setAnalysisReady] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [revisedCount, setRevisedCount] = useState(0)
  const [analysisLoading, setAnalysisLoading] = useState(false); // 분석 중 로딩 상태
  const [analysisResult, setAnalysisResult] = useState<any | null>(null); // 실제 분석 결과
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string, content: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [eSubmissions, setESubmissions] = useState<any[]>([]);
  const [eSubLoading, setESubLoading] = useState(false);
  const [eSubEvaluations, setESubEvaluations] = useState<{ [evaluationId: number]: string }>({});

  // Add state for expanded rows at the top of the component
  const [expandedAssignmentRows, setExpandedAssignmentRows] = useState<number[]>([]);
  const [expandedEvaluationRows, setExpandedEvaluationRows] = useState<number[]>([]);

  const handleDownloadCSV = () => {
    if (submissions.length === 0 && eSubmissions.length === 0) {
      toast.error('다운로드할 데이터가 없습니다.');
      return;
    }
    
    const csvData = convertStudentHistoryToCSV(submissions, eSubmissions, eSubEvaluations);
    downloadCSV(csvData, `학생_제출_이력_${new Date().toISOString().split('T')[0]}`);
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  const handleDownloadAssignmentCSV = () => {
    if (submissions.length === 0) {
      toast.error('과제 제출 이력이 없습니다.');
      return;
    }
    
    const csvData = convertStudentAssignmentHistoryToCSV(submissions);
    downloadCSV(csvData, `학생_과제_제출_이력_${new Date().toISOString().split('T')[0]}`);
    toast.success('과제 제출 이력 CSV 파일이 다운로드되었습니다.');
  };

  const handleDownloadEvaluationCSV = () => {
    if (eSubmissions.length === 0) {
      toast.error('평가 제출 이력이 없습니다.');
      return;
    }
    
    const csvData = convertStudentEvaluationHistoryToCSV(eSubmissions, eSubEvaluations);
    downloadCSV(csvData, `학생_평가_제출_이력_${new Date().toISOString().split('T')[0]}`);
    toast.success('평가 제출 이력 CSV 파일이 다운로드되었습니다.');
  };

  // 모달 바깥 클릭 시 닫기
  useEffect(() => {
    if (!modalOpen) return;
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [modalOpen]);

  // 학생 토큰이 없으면 뒤로
  useEffect(() => {
    if (!studentId) router.push("/classes");
  }, [studentId, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) return;

      setLoading(true);

      // 종합 분석 데이터 fetch
      const analysisPromise = (async () => {
        try {
          const { data } = await getStudentAnalysis({ student_id: studentId });
          const analysisResult = data[0];
          return {
            analysis_result: analysisResult.analysis_result || [],
            grade: analysisResult.class_?.grade,
            school_level: analysisResult.class_?.school_level
          };
        } catch (e) {
          return null;
        }
      })();


      // 제출 이력 데이터 fetch
      const submissionsPromise = (async () => {
        try {
          const { data: submissions } = await getASubmission({ student_id: studentId });
          const submissionsWithAssignment = await Promise.all(
            (submissions as any[]).map(async (sub: any) => {
              const { data: assignment } = await getAssignment(sub.assignment_id);
              return {
                id: sub.id,
                student_id: sub.student_id,
                assignment_title: assignment.name,
                submitted_at: sub.submitted_at,
                revised_content: sub.revised_content,
                content: sub.content,
                feedback: sub.assign_feedback,
              };
            })
          );
          return submissionsWithAssignment;
        } catch (e) {
          return [];
        }
      })();

      // 평가 제출 이력 fetch
      const eSubPromise = (async () => {
        try {
          setESubLoading(true);
          const { data: esubs } = await getESubmission({ student_id: studentId });
          // 평가명도 같이 가져오기
          const evalNames: { [evaluationId: number]: string } = {};
          await Promise.all(
            (esubs as any[]).map(async (sub: any) => {
              if (sub.evaluation_id && !evalNames[sub.evaluation_id]) {
                const { data: evaluation } = await getEvaluation(sub.evaluation_id);
                evalNames[sub.evaluation_id] = evaluation.name;
              }
            })
          );
          setESubEvaluations(evalNames);
          setESubmissions(esubs);
        } finally {
          setESubLoading(false);
        }
      })();

      // 동시에 데이터를 가져오고 상태 업데이트
      try {
        const [analysisResultData, submissionsData] = await Promise.all([analysisPromise, submissionsPromise, eSubPromise]);
        
        setAnalysis(analysisResultData);
        setSubmissions(submissionsData);
        setRevisedCount(submissionsData.filter(s => s.revised_content && s.revised_content.trim() !== "").length);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const handleAnalysis = async () => {
    if (!studentId) return;
    const analysis_source = {
      "student_id": studentId,
      "level": analysis?.school_level!,
      "grade": analysis?.grade!, // 혹은 적절한 grade 값
      "submissions": submissions
        .filter(s => s.revised_content && s.revised_content.trim() !== "")
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, 5)
        .map(s => s.revised_content),
    }
    setAnalysisLoading(true);
    setShowAnalysis(true);
    setLastAnalysisTime(new Date());
    try {
      const result = await createStudentAnalysis(analysis_source);
      console.log("줘봐라", result.data)
      setAnalysisResult(result.data); // result.data에 분석 결과가 있다고 가정
    } catch (e) {
      setAnalysisResult(null);
    } finally {
      setAnalysisLoading(false);
    }
  }

  // revised_content가 비어있지 않은 제출물 3개 이상인지 체크

  return (
    <div className="p-8 w-full mx-auto">
      <h1 className="text-2xl font-extrabold mb-6 text-blue-700 tracking-tight">학생 상세</h1>
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-4">
          <button
            className={`px-6 py-2 rounded-t-lg font-bold border-b-2 transition-all ${tab === "analysis" ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-gray-500 bg-white"}`}
            onClick={() => setTab("analysis")}
          >
            종합 분석
          </button>
          <button
            className={`px-6 py-2 rounded-t-lg font-bold border-b-2 transition-all ${tab === "a_history" ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-gray-500 bg-white"}`}
            onClick={() => setTab("a_history")}
          >
            과제 제출 이력
          </button>
          <button
            className={`px-6 py-2 rounded-t-lg font-bold border-b-2 transition-all ${tab === "e_history" ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-gray-500 bg-white"}`}
            onClick={() => setTab("e_history")}
          >
            평가 제출 이력
          </button>
        </div>
        <div className="flex gap-2">
          {tab === "a_history" && (
            <button
              className="px-6 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-2"
              onClick={handleDownloadAssignmentCSV}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              과제 이력 다운로드
            </button>
          )}
          {tab === "e_history" && (
            <button
              className="px-6 py-2 rounded-lg font-bold bg-pink-600 hover:bg-pink-700 text-white transition-all flex items-center gap-2"
              onClick={handleDownloadEvaluationCSV}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              평가 이력 다운로드
            </button>
          )}
          {tab === "analysis" && (
            <button
              className="px-6 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-2"
              onClick={handleDownloadCSV}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              전체 이력 다운로드
            </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow p-6 min-h-[300px]">
        {loading ? (
          <div className="text-center text-blue-500 font-semibold">로딩 중...</div>
        ) : tab === "analysis" ? (
          <div className="relative">
            {/* 분석 카드 영역 */}
            <div className="relative min-h-[500px]">
              {/* 블러 처리된 카드 (분석 전) */}
              {!showAnalysis && (
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                  <div className="w-full opacity-40 blur-sm select-none">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
                      {ANALYSIS_AREAS.map(area => (
                        <div key={area.key} className="bg-white rounded-2xl shadow-lg border-t-4 border-blue-500 flex flex-col items-center p-6 min-h-[180px]">
                          <div className="text-lg font-bold text-blue-700 mb-2">{area.label}</div>
                          <div className="text-gray-700 text-center whitespace-pre-line">
                            <ReactMarkdown>{DUMMY_ANALYSIS[area.key as keyof typeof DUMMY_ANALYSIS]}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 여기를 같이 포함해서 blur */}
                    <div className="bg-blue-50 rounded-xl shadow p-6 text-center">
                      <div className="text-xl font-bold text-blue-800 mb-2">집중 연습이 필요한 영역</div>
                      <div className="text-lg text-gray-700 mb-2">맞춤법, 문법 영역에서 일부 오류가 반복적으로 나타나고 있습니다.</div>
                      <div className="text-gray-600">
                        특히 <span className="font-bold text-red-600">띄어쓰기</span>와 <span className="font-bold text-blue-700">시제 일치</span>에 주의하여 연습해보세요.<br />
                        다음 과제에서는 이 부분을 집중적으로 개선해보는 것을 추천합니다.
                      </div>
                    </div>
                  </div>
                </div>

              )}
              {/* 분석 시작 안내 및 버튼 (카드 위에 오버레이) */}
              {!showAnalysis && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  {revisedCount < 3 ? (
                    <div className="text-2xl font-bold text-red-600 mb-4 text-center bg-white/80 px-8 py-6 rounded-xl shadow-lg">인공지능 학생 분석을 위해서는<br />3개 이상의 최종제출물이 필요합니다!</div>
                  ) : (
                    <>
                      <div className="text-xl font-semibold text-blue-700 mb-6 text-center bg-white/80 px-8 py-4 rounded-xl shadow">학생의 글쓰기 분석 결과를 확인해보시겠어요?</div>
                      <button
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg px-8 py-4 font-bold text-lg shadow hover:from-blue-600 hover:to-indigo-600 transition"
                        onClick={handleAnalysis}
                      >
                        AI 분석 시작
                      </button>
                    </>
                  )}
                </div>
              )}
              {/* 분석 결과 카드 (분석 후) */}
              {showAnalysis && (
                analysisLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] h-[400px] w-full">
                    <div className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                    <div className="text-blue-700 font-bold text-lg mb-2">AI가 학생의 글을 분석 중입니다...</div>
                    <div className="text-gray-500 text-base">분석은 20초가량이 소요됩니다.</div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <button
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg px-4 py-2 font-bold shadow hover:from-blue-600 hover:to-indigo-600 transition"
                        onClick={() => setShowAnalysis(false)}
                        title="1주일에 1번만 분석 가능 (추후 구현)"
                      >
                        AI 분석 다시하기
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      {ANALYSIS_AREAS.map((area, idx) => {
                        const content =
                          analysisResult && analysisResult[`${area.key}_result`]
                            ? analysisResult[`${area.key}_result`]
                            : DUMMY_ANALYSIS[area.key as keyof typeof DUMMY_ANALYSIS];
                        return (
                          <div
                            key={area.key}
                            className="bg-white rounded-2xl shadow-lg border-t-4 border-blue-500 flex flex-col items-center p-6 min-h-[180px] transition hover:shadow-2xl relative max-h-60 overflow-hidden cursor-pointer group"
                            onClick={() => {
                              setModalContent({ title: area.label, content });
                              setModalOpen(true);
                            }}
                          >
                            <div className="text-lg font-bold text-blue-700 mb-2">{area.label}</div>
                            <div className="text-gray-700 text-left w-full">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown>
                            </div>
                            {/* 블러 오버레이 */}
                            <div className="absolute bottom-0 left-0 w-full h-10 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent opacity-100 group-hover:opacity-0" style={{ transition: 'opacity 0.2s' }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-10 bg-blue-100 rounded-xl shadow p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 뛰어난 점 */}
                        <div className="bg-white rounded-xl shadow p-6">
                          <div className="text-lg font-bold text-blue-700 mb-2">뛰어난 점</div>
                          <div className="prose max-w-none text-gray-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {analysisResult.comprehensive_result?.strength}
                            </ReactMarkdown>
                          </div>
                        </div>
                        {/* 아쉬운 점 */}
                        <div className="bg-white rounded-xl shadow p-6">
                          <div className="text-lg font-bold text-red-700 mb-2">아쉬운 점</div>
                          <div className="prose max-w-none text-gray-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {analysisResult.comprehensive_result?.weakness}
                            </ReactMarkdown>
                          </div>
                        </div>
                        {/* 총평 (2칸 span) */}
                        <div className="bg-blue-50 rounded-xl shadow p-6 col-span-1 md:col-span-2 mt-2">
                          <div className="text-xl font-bold text-blue-900 mb-4">총평</div>
                          <div className="prose max-w-none text-gray-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                              {analysisResult.comprehensive_result?.overall}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )
              )}
            </div>

          </div>
        ) : tab === "a_history" ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-blue-700">과제 제출 이력</h2>
            {submissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-blue-900 border-separate border-spacing-y-1">
                  <thead className="sticky top-0 z-10 text-xs text-blue-700 uppercase bg-blue-50 border-b shadow-sm">
                    <tr>
                      <th className="w-1/6 px-4 py-3 text-center font-bold tracking-wide">과제명</th>
                      <th className="w-2/6 px-4 py-3 text-center font-bold tracking-wide">1차 제출</th>
                      <th className="w-1/6 px-4 py-3 text-center font-bold tracking-wide">피드백</th>
                      <th className="w-2/6 px-4 py-3 text-center font-bold tracking-wide">최종 제출</th>
                      <th className="w-1/6 px-4 py-3 text-center font-bold tracking-wide">제출 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      console.log("제출", sub)
                      const expanded = expandedAssignmentRows.includes(sub.id);
                      return (
                        <tr key={sub.id} className={`border rounded-lg bg-white hover:bg-blue-50 transition shadow-sm cursor-pointer ${expanded ? 'ring-2 ring-blue-300' : ''}`}
                          onClick={() => {
                            
                            setExpandedAssignmentRows((prev) =>
                              prev.includes(sub.id)
                                ? prev.filter((id) => id !== sub.id)
                                : [...prev, sub.id]
                            );
                          }}
                        >
                          <td className="px-4 py-2 text-center font-semibold text-blue-800 truncate max-w-[120px]" title={sub.assignment_title}>
                            {sub.assignment_title}
                          </td>
                          <td className={`px-4 py-2 text-blue-900 max-w-[200px] text-center whitespace-pre-line ${expanded ? '' : 'truncate'}`} title={sub.content || "-"}>
                            {expanded ? (sub.content || "제출 내용 없음") : (sub.content && sub.content.length > 40 ? sub.content.slice(0, 40) + '...' : (sub.content || '-'))}
                          </td>
                          <td className={`px-4 py-2 text-blue-700 max-w-[120px] text-center whitespace-pre-line ${expanded ? '' : 'truncate'}`} title={sub.feedback?.[0]?.content ?? "-"}>
                            {expanded ? (sub.feedback?.[0]?.content ?? "피드백 없음") : (sub.feedback?.[0]?.content && sub.feedback?.[0]?.content.length > 20 ? sub.feedback[0].content.slice(0, 20) + '...' : (sub.feedback?.[0]?.content ?? '-'))}
                          </td>
                          <td className={`px-4 py-2 text-blue-900 max-w-[200px] text-center whitespace-pre-line ${expanded ? '' : 'truncate'}`} title={sub.revised_content || "-"}>
                            {expanded ? (sub.revised_content ? sub.revised_content : "최종 제출 없음") : (sub.revised_content && sub.revised_content.length > 40 ? sub.revised_content.slice(0, 40) + '...' : (sub.revised_content || '-'))}
                          </td>
                          <td className="px-4 py-2 text-center text-blue-400 whitespace-nowrap">
                            {new Date(sub.submitted_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-blue-400">과제 제출 이력이 없습니다.</div>
            )}
          </div>
        ) : tab === "e_history" ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-pink-700">평가 제출 이력</h2>
            {eSubLoading ? (
              <div className="text-center text-pink-500 font-semibold">로딩 중...</div>
            ) : eSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700 border-separate border-spacing-y-1">
                  <thead className="sticky top-0 z-10 text-xs text-pink-700 uppercase bg-pink-50 border-b shadow-sm">
                    <tr>
                      <th className="w-1/6 px-4 py-3 text-center font-bold tracking-wide">평가명</th>
                      <th className="w-2/6 px-4 py-3 text-center font-bold tracking-wide">제출 내용</th>
                      <th className="w-1/6 px-4 py-3 text-center font-bold tracking-wide">점수</th>
                      <th className="w-1/6 px-4 py-3 text-center font-bold tracking-wide">제출 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eSubmissions.map((sub) => {
                      const expanded = expandedEvaluationRows.includes(sub.id);
                      return (
                        <tr key={sub.id} className={`border rounded-lg bg-white hover:bg-pink-50 transition shadow-sm cursor-pointer ${expanded ? 'ring-2 ring-pink-300' : ''}`}
                          onClick={() => {
                            setExpandedEvaluationRows((prev) =>
                              prev.includes(sub.id)
                                ? prev.filter((id) => id !== sub.id)
                                : [...prev, sub.id]
                            );
                          }}
                        >
                          <td className="px-4 py-2 text-center font-semibold text-pink-700 truncate max-w-[120px]" title={eSubEvaluations[sub.evaluation_id] || sub.evaluation_id}>
                            {eSubEvaluations[sub.evaluation_id] || sub.evaluation_id}
                          </td>
                          <td className={`px-4 py-2 text-gray-800 max-w-[320px] text-center whitespace-pre-line ${expanded ? '' : 'truncate'}`} title={sub.content || "-"}>
                            {expanded ? (sub.content || "-") : (sub.content && sub.content.length > 40 ? sub.content.slice(0, 40) + '...' : (sub.content || '-'))}
                          </td>
                          <td className="px-4 py-2 text-center text-gray-700">
                            {sub.score ? sub.score : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-2 text-center text-gray-500 whitespace-nowrap">
                            {new Date(sub.submitted_at || sub.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500">평가 제출 이력이 없습니다.</div>
            )}
          </div>
        ) : null}
      </div>
      {/* 모달 */}
      {modalOpen && modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" style={{ backdropFilter: 'blur(2px)' }}>
          <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-fadeIn">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => setModalOpen(false)} aria-label="닫기">×</button>
            <div className="text-xl font-bold text-blue-700 mb-4">{modalContent.title}</div>
            <div className="text-gray-800 max-h-[60vh] overflow-auto text-left">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{modalContent.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
