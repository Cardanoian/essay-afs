"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    decodeEvaluationToken,
} from "../../../lib/hashids";
import { getStudents, getESubmission, getEvaluation, updateESubmission, getAIScore } from "../../../lib/api";
import { toast } from "react-toastify";
import { downloadCSV, convertEvaluationDataToCSV } from "../../../lib/utils";

interface Student {
    id: number;
    name: string;
}

interface Submission {
    id: number;
    student_id: number;
    content: string;
    revised_content: string;
    submitted_at: string;
    feedbacks?: { content: string }[];
    status?: string;
    score?: string; // Added score to Submission interface
}

interface Evaluation {
    id: number;
    name: string;
    item?: string;
    criteria?: { [key: string]: string };
}

export default function DistributePage() {
    const { token } = useParams();
    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingFeedback, setLoadingFeedback] = useState(false)

    const [checkedItems, setCheckedItems] = useState<number[]>([]);
    const [scores, setScores] = useState<{ [studentId: number]: string }>({});
    const [statuses, setStatuses] = useState<{ [studentId: number]: string }>({});

    const toggleAll = () => {
        if (checkedItems.length === students.length) {
            setCheckedItems([]);
        } else {
            setCheckedItems(students.map((s) => s.id));
        }
    };

    const goToDashboard = () => {
        router.push(`/evaluation`)
    }

    const toggleOne = (id: number) => {
        if (checkedItems.includes(id)) {
            setCheckedItems((prev) => prev.filter((item) => item !== id));
        } else {
            setCheckedItems((prev) => [...prev, id]);
        }
    };

    const isAllChecked = students.length > 0 && checkedItems.length === students.length;

    useEffect(() => {
        if (typeof token === "string") {
            const decoded = decodeEvaluationToken(token);
            if (!decoded) {
                toast.error("잘못된 링크입니다.");
                return;
            }
            const [eid, cid] = decoded;
            Promise.all([
                getStudents(cid),
                getESubmission({ evaluation_id: eid }),
                getEvaluation(eid)
            ]).then(
                ([studentRes, submissionRes, evaluationRes]) => {
                    setStudents(studentRes.data);
                    setSubmissions(submissionRes.data);
                    setEvaluation(evaluationRes.data);
                    setLoading(false);
                }
            );
        }
    }, [token]);

    // scores는 AI 채점 결과를 저장
    useEffect(() => {
        if (submissions.length > 0) {
            const initialScores: { [studentId: number]: string } = {};
            const initialStatuses: { [studentId: number]: string } = {};
            submissions.forEach(sub => {
                if (sub.student_id && sub.score) {
                    initialScores[sub.student_id] = sub.score;
                }
                if (sub.student_id && sub.status) {
                    initialStatuses[sub.student_id] = sub.status;
                }
            });
            setScores(prev => ({ ...initialScores, ...prev }));
            setStatuses(prev => ({ ...initialStatuses, ...prev }));
        }
    }, [submissions]);


    const getSubmissionByStudent = (studentId: number) =>
        submissions.find((s) => s.student_id === studentId);

    const handleAIScore = async () => {
        if (checkedItems.length === 0) {
            toast.error('원하는 학생을 체크하세요');
            return;
        }
        setLoadingFeedback(true);
        const newScores = { ...scores };
        for (const studentId of checkedItems) {
            const submission = getSubmissionByStudent(studentId);
            if (!submission) continue;
            try {
                const res = await getAIScore({
                    content: submission.content,
                    guide: evaluation?.item || '',
                    criteria: evaluation?.criteria || {},
                    studentId: studentId,
                });
                newScores[studentId] = res.data.result;
            } catch (error) {
                newScores[studentId] = 'AI 채점 실패';
                toast.error('AI 채점 실패');
            }
        }
        setScores(newScores);
        setLoadingFeedback(false);
    };

    const handleFeedbackDone = async () => {
        if (checkedItems.length === 0) {
            toast.error('원하는 학생을 체크하세요');
            return;
        }
        if (!evaluation) {
            toast.error('평가 정보가 없습니다.');
            return;
        }
        for (const studentId of checkedItems) {
            const score = scores[studentId] || "";
            const status = statuses[studentId] || "in_progress";
            const submission = getSubmissionByStudent(studentId);
            if (submission) {
                await updateESubmission({
                    evaluation_id: evaluation.id,
                    student_id: studentId,
                    score: score,
                    status: status
                });
            }
        }
        toast.success("평가 결과가 저장되었습니다!");
        // 필요하다면 목록 새로고침 등
    };

    const handleDownloadCSV = () => {
        if (!evaluation || students.length === 0) {
            toast.error('다운로드할 데이터가 없습니다.');
            return;
        }
        
        const csvData = convertEvaluationDataToCSV(students, submissions, evaluation);
        downloadCSV(csvData, `${evaluation.name}_평가_결과_${new Date().toISOString().split('T')[0]}`);
        toast.success('CSV 파일이 다운로드되었습니다.');
    };

    return (
        <div className="p-8">
            <button
                onClick={goToDashboard}
                className="mb-6 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg text-lg transition-all hover:from-indigo-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
                <span className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    대시보드로 돌아가기
                </span>
            </button>
            <h1 className="text-xl font-bold mb-4 text-indigo-700">제출물 관리</h1>
            {evaluation && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{evaluation.name}</h2>
                    {/* 문항/기준을 한 줄에 가로로 배치 */}
                    <div className="flex flex-row gap-8">
                        {/* 평가 문항 */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">📝 평가 문항</h3>
                            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap min-h-[48px]">
                                {evaluation.item || "없음"}
                            </div>
                        </div>
                        {/* 평가 기준 */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">💡 평가 기준</h3>
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
            )}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">📋 제출 테이블</h2>
                    <div className="flex gap-2">
                        <button
                            className={`px-7 py-2 rounded-2xl font-bold text-lg shadow-md transition-transform transform flex items-center gap-2
                                ${loadingFeedback ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 text-white'}
                            `}
                            onClick={handleAIScore}
                            disabled={loadingFeedback}
                        >
                            {loadingFeedback ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5 text-white mr-2"
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
                                    채점 중...
                                </>
                            ) : (
                                'AI 채점 요청'
                            )}
                        </button>
                        <button
                            className={`px-7 py-2 rounded-2xl font-bold text-lg shadow-md transition-transform transform flex items-center gap-2
                                ${loadingFeedback ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-105 text-white'}
                            `}
                            onClick={handleFeedbackDone}
                            disabled={loadingFeedback}
                        >
                            결과 저장하기
                        </button>
                        <button
                            className="px-7 py-2 rounded-2xl font-bold text-lg shadow-md transition-transform transform flex items-center gap-2 bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white"
                            onClick={handleDownloadCSV}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            CSV 다운로드
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-700 table-fixed">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="w-12 px-3 py-3 text-center">{/* 체크박스 */}
                                    <input
                                        type="checkbox"
                                        checked={isAllChecked}
                                        onChange={toggleAll}
                                        className="w-5 h-5"
                                    />
                                </th>
                                <th className="w-8 text-lg font-semibold px-1 py-3 text-center">번호</th>
                                <th className="w-20 text-lg font-semibold px-2 py-3 text-center">학생 이름</th>
                                <th className="w-48 text-lg font-semibold px-4 py-3 text-center">제출물</th>
                                <th className="w-20 text-lg font-semibold px-4 py-3 text-center">평가 결과</th>
                                <th className="w-24 text-lg font-semibold px-4 py-3 text-center">상태</th>
                                <th className="w-24 text-lg font-semibold px-2 py-3 text-center">제출 시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => {
                                const matched = getSubmissionByStudent(student.id);
                                const isChecked = checkedItems.includes(student.id);
                                return (
                                    <tr
                                        key={student.id}
                                        className="hover:bg-gray-50 transition-colors border-b"
                                    >
                                        <td className="w-12 px-3 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleOne(student.id)}
                                                className="w-5 h-5"
                                            />
                                        </td>
                                        <td className="w-8 px-1 py-3 text-center font-semibold">{idx + 1}</td>
                                        <td className="w-20 px-2 py-3 text-center">{student.name}</td>
                                        <td className="w-48 px-4 py-3 whitespace-pre-wrap max-w-xs">
                                            {matched ? matched.content : "미제출"}
                                        </td>
                                        <td className="w-20 px-4 py-3 whitespace-pre-wrap max-w-[80px]">
                                            {evaluation && evaluation.criteria && Object.keys(evaluation.criteria).length > 0 ? (
                                                <select
                                                    className="w-full border rounded-lg px-2 py-1 text-sm"
                                                    value={scores[student.id] || ""}
                                                    onChange={e => {
                                                        const value = e.target.value;
                                                        setScores(prev => ({ ...prev, [student.id]: value }));
                                                    }}
                                                >
                                                    <option value="">선택</option>
                                                    {Object.keys(evaluation.criteria).map((key) => (
                                                        <option key={key} value={key}>{key}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="w-24 px-4 py-3 text-center">
                                            <select
                                                className="w-full border rounded-lg px-2 py-1 text-sm"
                                                value={statuses[student.id] || matched?.status || "in_progress"}
                                                onChange={e => {
                                                    const value = e.target.value;
                                                    setStatuses(prev => ({ ...prev, [student.id]: value }));
                                                }}
                                            >
                                                <option value="in_progress">작성 중</option>
                                                <option value="submitted">제출 완료</option>
                                            </select>
                                        </td>
                                        <td className="w-24 px-2 py-3 text-center">
                                            {matched?.submitted_at ? (() => {
                                                const utcDate = new Date(matched.submitted_at);
                                                const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // UTC+9
                                                return (
                                                    <>
                                                        {kstDate.toLocaleDateString("ko-KR")}
                                                        <br />
                                                        {kstDate.toLocaleTimeString("ko-KR", {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: false
                                                        })}
                                                    </>
                                                );
                                            })() : "-"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
