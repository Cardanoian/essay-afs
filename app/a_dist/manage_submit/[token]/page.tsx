"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    decodeAssignmentToken,
    encodeAssignmentStudentToken,
} from "../../../lib/hashids";
import { getStudents, getASubmission, getAssignment, getFinalFeedback, patchSubmissionFeedback, updateASubmission } from "../../../lib/api";
import { toast } from "react-toastify";
import { downloadCSV, convertAssignmentDataToCSV } from "../../../lib/utils";

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
    assign_feedback?: { content: string }[];
    status?: string;
}

interface Assignment {
    id: number;
    name: string;
    guide: string;
    condition: string;
}

export default function DistributePage() {
    const { token } = useParams();
    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingFeedback, setLoadingFeedback] = useState(false)

    const [checkedItems, setCheckedItems] = useState<number[]>([]);
    const [feedbacks, setFeedbacks] = useState<{ [studentId: number]: string }>({});
    const [statuses, setStatuses] = useState<{ [studentId: number]: string }>({});
    const [additionalInstructions, setAdditionalInstructions] = useState<{ [studentId: number]: string }>({});

    // 1. Remove the '강조할 점' column and input from the table.
    // 2. Add state: modalVisible, modalStudentIndex, modalInstructions, modalStudentIds
    const [modalVisible, setModalVisible] = useState(false);
    const [modalInstructions, setModalInstructions] = useState('');

    // Add a loading overlay state
    const [globalLoading, setGlobalLoading] = useState(false);

    const toggleAll = () => {
        if (checkedItems.length === students.length) {
            setCheckedItems([]);
        } else {
            setCheckedItems(students.map((s) => s.id));
        }
    };

    const goToDashboard = () => {
        router.push(`/assignment`)
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
            const decoded = decodeAssignmentToken(token);
            if (!decoded) {
                toast.error("잘못된 링크입니다.");
                return;
            }
            const [aid, cid] = decoded;

            // 병렬 요청
            Promise.all([getStudents(cid), getASubmission({ assignment_id: aid }), getAssignment(aid)]).then(
                ([studentRes, submissionRes, assignmentRes]) => {
                    setStudents(studentRes.data);
                    setSubmissions(submissionRes.data);
                    setAssignment(assignmentRes.data);
                    setLoading(false);
                    console.log("제출물 점검:", submissionRes)
                }
            );
        }
    }, [token]);

    useEffect(() => {
        if (submissions.length > 0) {
            const initialFeedbacks: { [studentId: number]: string } = {};
            const initialStatuses: { [studentId: number]: string } = {};
            const initialAdditionalInstructions: { [studentId: number]: string } = {};
            submissions.forEach(sub => {
                console.log("로드결과:", sub)
                // feedbacks 배열이 있고, 첫 번째 feedback이 있으면 content를 사용
                if (sub.assign_feedback && sub.assign_feedback.length > 0) {
                    initialFeedbacks[sub.student_id] = sub.assign_feedback[0].content || "";
                }
                if (sub.student_id && sub.status) {
                    initialStatuses[sub.student_id] = sub.status;
                }
                initialAdditionalInstructions[sub.student_id] = ""; // 초기값 설정
            });
            setFeedbacks(prev => ({ ...initialFeedbacks, ...prev })); // 이미 입력한 값은 보존
            setStatuses(prev => ({ ...initialStatuses, ...prev }));
            setAdditionalInstructions(prev => ({ ...initialAdditionalInstructions, ...prev }));
        }
    }, [submissions]);


    const getASubmissionByStudent = (studentId: number) =>
        submissions.find((s) => s.student_id === studentId);

    // 3. Update handleAIFeedback to open modal for all checked students
    const handleAIFeedback = () => {
        if (checkedItems.length === 0) {
            toast.error('원하는 학생을 체크하세요');
            return;
        }
        setModalInstructions('');
        setModalVisible(true);
    };

    // Modal confirm handler: apply 강조할 점 to all checked students
    const handleModalConfirm = async () => {
        setModalVisible(false);
        setGlobalLoading(true);
        setLoadingFeedback(true);
        for (const studentId of checkedItems) {
            const submission = getASubmissionByStudent(studentId);
            if (!submission || !submission.content || submission.content.trim() === "") {
                continue;
            }
            const feedbackInfo = {
                content: submission.content,
                guide: assignment?.guide,
                condition: assignment?.condition,
                studentId: studentId,
                additional_instructions: modalInstructions,
            };
            try {
                const res = await getFinalFeedback(feedbackInfo);
                setFeedbacks(prev => ({ ...prev, [studentId]: res.data.result }));
                setStatuses(prev => ({ ...prev, [studentId]: 'feedback_done' }));
            } catch (error) {
                setFeedbacks(prev => ({ ...prev, [studentId]: '피드백 생성 실패' }));
                toast.error('AI 피드백 생성 실패');
            }
        }
        setLoadingFeedback(false);
        setGlobalLoading(false);
        setModalInstructions('');
    };

    const handleFeedbackDone = async () => {
        if (checkedItems.length === 0) {
            toast.error('원하는 학생을 체크하세요');
            return;
        }
        if (!assignment) {
            toast.error('과제 정보가 없습니다.');
            return;
        }
        for (const studentId of checkedItems) {
            const feedback = feedbacks[studentId] || "";
            const status = statuses[studentId] || "in_progress";
            await patchSubmissionFeedback(assignment.id, studentId, feedback);
            // 상태도 함께 업데이트
            const submission = getASubmissionByStudent(studentId);
            if (submission) {
                await updateASubmission({
                    assignment_id: assignment.id,
                    student_id: studentId,
                    status: status
                });
            }
        }
        toast.success("피드백이 저장되었습니다!");
        // 필요하다면 목록 새로고침 등
    };

    const handleDownloadCSV = () => {
        if (!assignment || students.length === 0) {
            toast.error('다운로드할 데이터가 없습니다.');
            return;
        }
        
        const csvData = convertAssignmentDataToCSV(students, submissions, assignment);
        downloadCSV(csvData, `${assignment.name}_제출물_관리_${new Date().toISOString().split('T')[0]}`);
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
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">📋 제출 테이블</h2>
                    <div className="flex gap-2">
                        <button
                            className={`px-7 py-2 rounded-2xl font-bold text-lg shadow-md transition-transform transform flex items-center gap-2
                                ${loadingFeedback ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 text-white'}
                            `}
                            onClick={handleAIFeedback}
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
                                    피드백 생성 중...
                                </>
                            ) : (
                                'AI 피드백 요청'
                            )}
                        </button>
                        <button
                            className={`px-7 py-2 rounded-2xl font-bold text-lg shadow-md transition-transform transform flex items-center gap-2
                                ${loadingFeedback ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-105 text-white'}
                            `}
                            onClick={handleFeedbackDone}
                            disabled={loadingFeedback}
                        >
                            저장하기
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
                                <th className="w-12 text-lg font-semibold px-2 py-3 text-center">번호</th>
                                <th className="w-28 text-lg font-semibold px-4 py-3 text-center">학생 이름</th>
                                <th className="w-48 text-lg font-semibold px-4 py-3 text-center">1차 제출물</th>
                                <th className="w-64 text-lg font-semibold px-4 py-3 text-center">피드백</th>
                                <th className="w-48 text-lg font-semibold px-4 py-3 text-center">2차 제출물</th>
                                <th className="w-24 text-lg font-semibold px-4 py-3 text-center">상태</th>
                                <th className="w-32 text-lg font-semibold px-4 py-3 text-center">제출 시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => {
                                const matched = getASubmissionByStudent(student.id);
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
                                        <td className="w-12 px-2 py-3 text-center font-semibold">{idx + 1}</td>
                                        <td className="w-28 px-4 py-3 text-center">{student.name}</td>
                                        <td className="w-48 px-4 py-3 whitespace-pre-wrap max-w-xs">{matched ? matched.content : "미제출"}</td>
                                        <td className="w-64 px-4 py-3">
                                            <textarea
                                                className={`w-full min-h-[300px] border rounded-lg p-3 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition bg-white ${loadingFeedback ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                                placeholder="피드백을 직접 작성하거나 AI에게 초고 작성을 맡겨보세요!"
                                                value={feedbacks[student.id] || ''}
                                                onChange={e => setFeedbacks(f => ({ ...f, [student.id]: e.target.value }))}
                                                disabled={loadingFeedback}
                                            />
                                        </td>
                                        <td className="w-48 px-4 py-3 whitespace-pre-wrap max-w-xs">{matched ? matched.revised_content : "미제출"}</td>
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
                                                <option value="feedback_done">피드백 완료</option>
                                                <option value="final_submitted">최종 제출</option>
                                            </select>
                                        </td>
                                        <td className="w-32 px-4 py-3 text-center">
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
            {modalVisible && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-indigo-700 mb-4">AI 피드백 요청 - 강조할 점 입력</h3>
                        <div className="mb-2 text-gray-700 text-base">피드백 시 AI에게 강조하고 싶은 내용을 적어주세요!</div>
                        <textarea
                            className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none mb-4"
                            placeholder="강조할 점 (선택)"
                            value={modalInstructions}
                            onChange={e => setModalInstructions(e.target.value)}
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setModalVisible(false);
                                    setModalInstructions('');
                                }}
                                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleModalConfirm}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                                disabled={loadingFeedback}
                            >
                                피드백 요청
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {globalLoading && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-auto" style={{background: 'none'}}>
                    <div className="flex flex-col items-center bg-white bg-opacity-90 rounded-xl shadow-xl px-8 py-8 border border-blue-200">
                        <div className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                        <div className="text-blue-700 font-bold text-lg">AI 피드백을 생성 중입니다...<br/>잠시만 기다려주세요.</div>
                    </div>
                </div>
            )}
        </div>
    );
}
