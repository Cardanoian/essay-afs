"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { decodeAssignmentStudentToken } from "../../../lib/hashids";
import { getAssignment, updateASubmission, getASubmission, getMidFeedback } from "../../../lib/api";
import ReactMarkdown from 'react-markdown';


interface Assignment {
    id: number;
    name: string;
    condition?: string;
    guide?: string;
}

interface Submission {
    id: number;
    content?: string;
    revised_content?: string;
    status?: string;
    assign_feedback?: { content: string }[]; 
}

export default function StudentSubmitPage() {
    const { token } = useParams();
    const [assignmentId, setAssignmentId] = useState<number | null>(null);
    const [studentId, setStudentId] = useState<number | null>(null);
    const [classId, setClassId] = useState<number | null>(null);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submissionInfo, setSubmissionInfo] = useState<Submission | null>(null);

    const [content, setContent] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);

    const [aiHint, setAiHint] = useState("")
    const [hintCount, seHintCount] = useState(2)
    const [lastHint, setLastHint] = useState("")
    const [loadingHint, setLoadingHint] = useState(false)
    const [hintCooldown, setHintCooldown] = useState(0); // 쿨타임(초)


    useEffect(() => {
        if (typeof token !== "string") return;
        const decoded = decodeAssignmentStudentToken(token);
        if (!decoded) {
            alert("잘못된 링크입니다.");
            return;
        }
        const [aid, cid, sid] = decoded;
        setAssignmentId(aid);
        setClassId(cid);
        setStudentId(sid);
        setLoading(true);
        Promise.all([
            getAssignment(aid),
            getASubmission({ assignment_id: aid, student_id: sid })
        ]).then(([assignmentRes, submissionRes]) => {
            setAssignment(assignmentRes.data);
            console.log(submissionRes.data)
            setSubmissionInfo(submissionRes.data?.[0] || submissionRes.data); // 배열/객체 모두 대응
            setContent(submissionRes.data?.[0]?.revised_content || submissionRes.data?.[0]?.content || submissionRes.data?.revised_content || submissionRes.data?.content || "");
        }).catch(() => {
            alert("과제 또는 제출 정보를 불러올 수 없습니다.");
        }).finally(() => setLoading(false));
    }, [token]);

    // 제출 핸들러 (status별로 분기)
    const handleSubmit = async () => {
        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }
        let submission;
        if (submissionInfo?.status === "feedback_done") {
            submission = {
                assignment_id: assignmentId!,
                student_id: studentId!,
                revised_content: content,
                status: "final_submitted"
            };
        } else {
            submission = {
                assignment_id: assignmentId!,
                student_id: studentId!,
                content: content,
                status: "first_submitted"
            };
        }
        await updateASubmission(submission);
        setSubmitted(true);
    };

    const getfeedback = async () => {
        if (hintCount === 0) {
            alert("도움 횟수를 모두 소진했습니다!")
            return
        }
        if (hintCooldown > 0) return;
        
        setLoadingHint(true)
        setAiHint("")
        const feedbackInfo = {
            content: content,
            student_id : studentId,
            guide: assignment?.guide,
            condition: assignment?.condition,
            last_feedbacks: lastHint,
        }
        try {
            const res = await getMidFeedback(feedbackInfo);
            setAiHint(res.data.result);
            seHintCount(hintCount - 1);
            setLastHint(`학생 답변 : ${content} \n 그에 대한 지난 피드백 : ${res.data.result}`)
            setHintCooldown(300); // 5분 쿨타임 시작
        } catch (error) {
            alert("피드백을 가져오는 데 실패했습니다.");
        } finally {
            setLoadingHint(false);
        }
    };

    // 쿨타임 타이머
    useEffect(() => {
      if (hintCooldown > 0) {
        const timer = setInterval(() => {
          setHintCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      }
    }, [hintCooldown]);

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center text-indigo-500 font-semibold">로딩 중...</div>
            </div>
        );
    }

    // status별 UI 분기
    if (submissionInfo?.status === "first_submitted") {
        return (
            <div className="p-8">
                <div className="w-full mx-auto">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-blue-600 mb-2">1차 제출이 완료되었습니다!</h1>
                        <p className="text-gray-600 mb-4">선생님께서 확인하실 때까지 기다려주세요.</p>
                        <div className="bg-gray-50 rounded-xl p-6 text-left max-w-xl mx-auto">
                            <div className="font-semibold mb-2 text-gray-700">내가 제출한 글</div>
                            <div className="whitespace-pre-wrap text-gray-800">{submissionInfo.content}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (submissionInfo?.status === "final_submitted" || (submitted && submissionInfo?.status === "feedback_done")) {
        return (
            <div className="p-8">
                <div className="w-full mx-auto">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-green-600 mb-2">최종 제출이 완료되었습니다!</h1>
                        <p className="text-gray-600 mb-4">고생하셨습니다.</p>
                        <div className="bg-gray-50 rounded-xl p-6 text-left max-w-xl mx-auto">
                            <div className="font-semibold mb-2 text-gray-700">최종 제출 글</div>
                            <div className="whitespace-pre-wrap text-gray-800">{submissionInfo.revised_content || content}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2차 제출(수정 제출) 화면: 과제 조건/안내, AI 힌트 포함
    if (submissionInfo?.status === "feedback_done") {
        return (
            <div className="p-8">
                <div className="w-full mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-indigo-700">2차 과제 제출 </h1>
                    {/* 과제 정보 섹션 */}
                    {assignment && (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">{assignment.name}</h2>
                            {(assignment.condition || assignment.guide) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col space-y-2">
                                        <h3 className="text-lg font-semibold text-gray-800">📝 과제 조건 / 문항</h3>
                                        <div className="flex-1 bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap h-32 overflow-y-auto">
                                            {assignment.condition || "없음"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        <h3 className="text-lg font-semibold text-gray-800">💡 전달사항</h3>
                                        <div className="flex-1 bg-blue-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap h-32 overflow-y-auto">
                                            {assignment.guide || "없음"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex gap-6">
                        {/* 왼쪽: 글 수정 제출 */}
                        <div className="w-7/10 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">✍️ 글 수정 제출</h3>
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                <div className="font-semibold text-yellow-700 mb-2 mt-4">선생님 피드백</div>
                                <div className="whitespace-pre-wrap text-gray-800">{submissionInfo.assign_feedback?.[0]?.content || ""}</div>
                            </div>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full h-64 p-4 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                                placeholder="수정된 과제 내용을 입력하세요..."
                            />
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold text-base shadow-md transition-transform transform hover:scale-105 flex items-center gap-2"
                                >
                                    최종 제출
                                </button>
                            </div>
                        </div>
                        {/* 오른쪽: AI 힌트 */}
                        <div className="w-3/10 bg-gray-50 rounded-xl shadow-md border border-gray-200 p-4 relative pb-12">
                            <button
                                onClick={getfeedback}
                                disabled={loadingHint}
                                className={`w-full bottom-4 right-4 ${loadingHint ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
                                    } text-white px-6 py-3 rounded-lg font-semibold text-base shadow-md transition-transform transform hover:scale-105 flex items-center gap-2`}
                            >
                                {loadingHint ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v8H4z"
                                            ></path>
                                        </svg>
                                        힌트 받아오는 중...
                                    </>
                                ) : (
                                    <>글쓰기 힌트받기 {hintCount}/2</>
                                )}
                            </button>
                            <div className="text-bs text-gray-700 mb-8 p-4">
                                <ReactMarkdown
                                  components={{
                                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-indigo-700 mt-4 mb-2" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-600 mt-3 mb-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-indigo-500 mt-2 mb-1" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-2 text-gray-800 leading-relaxed" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-2 text-gray-800" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-2 text-gray-800" {...props} />,
                                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-purple-700" {...props} />,
                                    em: ({node, ...props}) => <em className="italic text-purple-500" {...props} />,
                                    code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-pink-600" {...props} />,
                                    pre: ({node, ...props}) => <pre className="bg-gray-900 text-white rounded p-3 overflow-x-auto my-2 text-sm" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-blue-700 bg-blue-50 py-2 my-2" {...props} />,
                                    a: ({node, ...props}) => <a className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer" {...props} />,
                                  }}
                                >
                                  {aiHint}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 기본(in_progress 등) 기존 제출 UI
    if (submitted) {
        return (
            <div className="p-8">
                <div className="w-full mx-auto">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-green-600 mb-2">제출이 완료되었습니다!</h1>
                        <p className="text-gray-600">과제 제출이 성공적으로 처리되었습니다.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="w-full mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-indigo-700">과제 제출</h1>
                {/* 과제 정보 섹션 */}
                {assignment && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{assignment.name}</h2>
                        {(assignment.condition || assignment.guide) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-2">
                                    <h3 className="text-lg font-semibold text-gray-800">📝 과제 조건 / 문항</h3>
                                    <div className="flex-1 bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap h-32 overflow-y-auto">
                                        {assignment.condition || "없음"}
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <h3 className="text-lg font-semibold text-gray-800">💡 전달사항</h3>
                                    <div className="flex-1 bg-blue-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap h-32 overflow-y-auto">
                                        {assignment.guide || "없음"}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex gap-6 items-stretch">
                    {/* 왼쪽: 과제 작성 (비율 8) */}
                    <div className="w-7/10 bg-white rounded-xl shadow-lg border border-gray-100 p-6 h-[500px] flex flex-col">
                        <div className="flex flex-col h-full">
                          <h3 className="text-xl font-bold text-gray-900 mb-4">✍️ 과제 작성</h3>
                          <div className="relative flex-1 flex flex-col min-h-0">
                            <textarea
                              value={content}
                              onChange={e => setContent(e.target.value)}
                              className="w-full flex-1 min-h-0 p-4 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                              placeholder="과제 내용을 입력하세요..."
                              style={{height: '100%', minHeight: 0, resize: 'none'}}
                            />
                            <div className="absolute bottom-4 right-6 text-sm text-gray-500 bg-white/80 px-2 py-0.5 rounded shadow-sm">
                              {content.length}자 입력됨
                            </div>
                          </div>
                        </div>
                    </div>
                    {/* 오른쪽: 새 정보 박스 (비율 2) */}
                    <div className="w-3/10 bg-gray-50 rounded-xl shadow-md border border-gray-200 p-4 relative pb-12 h-[500px] flex flex-col">
                        <button
                          onClick={getfeedback}
                          disabled={loadingHint || hintCooldown > 0}
                          className={`w-full bottom-4 right-4 ${loadingHint || hintCooldown > 0 ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"} text-white px-6 py-3 rounded-lg font-semibold text-base shadow-md transition-transform transform hover:scale-105 flex items-center gap-2`}
                        >
                          {loadingHint ? (
                            <>
                              <svg
                                className="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                ></path>
                              </svg>
                              피드백 생성 중...
                            </>
                          ) : hintCooldown > 0 ? (
                            <>다음 힌트는 5분뒤에 받을 수 있어요!</>
                          ) : (
                            <>글쓰기 도움받기 {hintCount}/2</>
                          )}
                        </button>
                        <div className="text-bs text-gray-700 mb-8 p-4">
                            <ReactMarkdown
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-indigo-700 mt-4 mb-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-600 mt-3 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-indigo-500 mt-2 mb-1" {...props} />,
                                p: ({node, ...props}) => <p className="mb-2 text-gray-800 leading-relaxed" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-2 text-gray-800" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-2 text-gray-800" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold text-purple-700" {...props} />,
                                em: ({node, ...props}) => <em className="italic text-purple-500" {...props} />,
                                code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-pink-600" {...props} />,
                                pre: ({node, ...props}) => <pre className="bg-gray-900 text-white rounded p-3 overflow-x-auto my-2 text-sm" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-blue-700 bg-blue-50 py-2 my-2" {...props} />,
                                a: ({node, ...props}) => <a className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer" {...props} />,
                              }}
                            >
                              {aiHint}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold text-base shadow-md transition-transform transform hover:scale-105 flex items-center gap-2"
                    >
                        제출 완료
                    </button>
                </div>
            </div>
        </div>
    );
}
