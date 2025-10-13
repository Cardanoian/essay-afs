"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { decodeEvaluationStudentToken } from "../../../lib/hashids";
import { getEvaluation, updateESubmission, getESubmission } from "../../../lib/api";


interface Evaluation {
    id: number;
    name: string;
    item?: string;
    criteria?: object;
}

interface Submission {
    id: number;
    content?: string;
    revised_content?: string;
    status?: string;
    feedbacks?: { content: string }[]; 
}

export default function EvaluationStudentSubmitPage() {
    const { token } = useParams();
    const [evaluationId, setEvaluationId] = useState<number | null>(null);
    const [studentId, setStudentId] = useState<number | null>(null);
    const [classId, setClassId] = useState<number | null>(null);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [submissionInfo, setSubmissionInfo] = useState<any | null>(null);
    const [content, setContent] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        if (typeof token !== "string") return;
        const decoded = decodeEvaluationStudentToken(token);
        if (!decoded) {
            alert("잘못된 링크입니다.");
            return;
        }
        const [eid, cid, sid] = decoded;
        setEvaluationId(eid);
        setClassId(cid);
        setStudentId(sid);
        setLoading(true);
        Promise.all([
            getEvaluation(eid),
            getESubmission({ evaluation_id: eid, student_id: sid })
        ]).then(([evaluationRes, submissionRes]) => {
            setEvaluation(evaluationRes.data);
            setSubmissionInfo(submissionRes.data?.[0] || submissionRes.data);
            setContent(submissionRes.data?.[0]?.revised_content || submissionRes.data?.[0]?.content || submissionRes.data?.revised_content || submissionRes.data?.content || "");
        }).catch(() => {
            alert("평가 또는 제출 정보를 불러올 수 없습니다.");
        }).finally(() => setLoading(false));
    }, [token]);

    // 제출 핸들러 (status별로 분기)
    const handleSubmit = async () => {
        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        let submission = {
            evaluation_id: evaluationId!,
            student_id: studentId!,
            content: content,
            status: "submitted"
        };
        await updateESubmission(submission);
        setSubmitted(true);
        setShowConfirmModal(false);
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center text-indigo-500 font-semibold">로딩 중...</div>
            </div>
        );
    }

    // status별 UI 분기
    if (submitted || submissionInfo?.status === "submitted") {
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
                        <p className="text-gray-600 mb-4">평가 제출이 성공적으로 처리되었습니다.</p>
                        <div className="bg-gray-50 rounded-xl p-6 text-left max-w-xl mx-auto">
                            <div className="font-semibold mb-2 text-gray-700">내가 제출한 글</div>
                            <div className="whitespace-pre-wrap text-gray-800">{content}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="w-full mx-auto">
                <h1 className="text-3xl font-bold mb-6 text-indigo-700">평가 제출</h1>
                {/* 평가 정보 섹션 */}
                {evaluation && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{evaluation.name}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col space-y-2">
                                <h3 className="text-lg font-semibold text-gray-800">📝 평가 문항</h3>
                                <div className="flex-1 bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap h-32 overflow-y-auto">
                                    {evaluation.item || "없음"}
                                </div>
                            </div>
                            <div className="flex flex-col space-y-2">
                                <h3 className="text-lg font-semibold text-gray-800">💡 평가 기준</h3>
                                <div className="flex-1 bg-blue-50 rounded-lg p-4 h-32 overflow-y-auto">
                                  {evaluation.criteria && Object.keys(evaluation.criteria).length > 0 ? (
                                    <table className="w-full text-sm text-left border-separate border-spacing-y-1">
                                      <thead>
                                        <tr>
                                          <th className="px-3 py-2 bg-blue-100 rounded-l-lg text-blue-800 font-bold w-24 min-w-[60px] max-w-[100px]">단계</th>
                                          <th className="px-3 py-2 bg-blue-100 rounded-r-lg text-blue-800 font-bold">수준</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(evaluation.criteria).map(([k, v], idx) => (
                                          <tr key={k}>
                                            <td className="px-3 py-2 bg-white rounded-l-lg border border-blue-100 font-semibold text-blue-700">{k}</td>
                                            <td className="px-3 py-2 bg-white rounded-r-lg border border-blue-100 text-gray-700">{v as string}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <span className="text-gray-500">없음</span>
                                  )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex gap-6">
                    {/* 평가 작성 */}
                    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">✍️ 평가 작성</h3>
                        <div className="relative">
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full h-64 p-4 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                                placeholder="평가 내용을 입력하세요..."
                            />
                            <div className="absolute bottom-4 right-6 text-sm text-gray-500 bg-white/80 px-2 py-0.5 rounded shadow-sm">
                                {content.length}자 입력됨
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
            </div>
            {/* 제출 확인 모달 */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-xs w-full shadow-xl flex flex-col items-center">
                        <div className="text-xl font-bold mb-4 text-gray-800">제출 확인</div>
                        <div className="mb-6 text-gray-700 text-center">
                            <span className="font-semibold text-red-600">제출하면 다시 수정할 수 없습니다!<br/>신중하게 제출해주세요!</span>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={handleConfirmSubmit}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 font-bold text-lg shadow"
                            >
                                제출
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white rounded-lg py-3 font-bold text-lg shadow"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
