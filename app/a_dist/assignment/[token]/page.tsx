"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { encodeAssignmentStudentToken, decodeAssignmentToken } from "../../../lib/hashids";
import { getStudents, getAssignment, getASubmission } from "../../../lib/api";
import QRCode from "react-qr-code";
import { toast } from "react-toastify";

interface Assignment {
  id: number;
  name: string;
  condition?: string;
  guide?: string;
}

interface Student {
  id: number;
  name: string;
}

interface Submission {
  id: number;
  student_id: number;
  assignment_id: number;
  status: string;
}

export default function DistributePage() {
  const { token } = useParams();
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const router = useRouter();

  // 전체 제출 URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const distributeUrl = `${baseUrl}/a_dist/assignment/${token}`;

  useEffect(() => {
    if (typeof token === "string") {
      const decoded = decodeAssignmentToken(token);
      if (!decoded) {
        toast.error("잘못된 링크입니다.");
        return;
      }
      const [aid, cid] = decoded;
      setAssignmentId(aid);
      setClassId(cid);

      setLoading(true);
      Promise.all([
        getAssignment(aid),
        getStudents(cid),
        getASubmission({assignment_id : aid}),
      ])
        .then(([assignmentRes, studentsRes, submissionsRes]) => {
          setAssignment(assignmentRes.data);
          setStudents(studentsRes.data);
          setSubmissions(submissionsRes.data);
        })
        .catch(() => {
          toast.error("과제 정보 또는 학생 정보를 불러올 수 없습니다.");
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(distributeUrl);
    toast.success("URL이 복사되었습니다!");
  };

  const handleDownloadQR = () => {
    // QR코드 SVG를 PNG로 변환하여 다운로드 (여백 추가)
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const tempImg = new window.Image();
    const margin = 24; // px
    tempImg.onload = function () {
      const size = Math.max(tempImg.width, tempImg.height);
      const canvas = document.createElement('canvas');
      canvas.width = size + margin * 2;
      canvas.height = size + margin * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempImg, margin, margin, size, size);
        const pngFile = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngFile;
        a.download = 'qrcode.png';
        a.click();
      }
    };
    tempImg.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
  };

  // 학생별 제출 상태 찾기
  const getStudentStatus = (studentId: number) => {
    const submission = submissions.find(s => s.student_id === studentId);
    if (!submission) return "미제출";
    switch (submission.status) {
      case "in_progress": return "작성 중";
      case "first_submitted": return "제출 완료";
      case "feedback_done": return "피드백 완료";
      case "final_submitted": return "최종 제출";
      default: return submission.status;
    }
  };

  // 상태별 카드 스타일/아이콘/텍스트 함수 개선
  const getCardVisual = (status: string) => {
    switch (status) {
      case "작성 중":
        return {
          bg: "bg-yellow-50 border-yellow-200 hover:border-yellow-400",
          badge: "bg-yellow-400 text-yellow-900",
          icon: (
            <svg className="w-7 h-7 text-yellow-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
          ),
          text: "작성 중"
        };
      case "제출 완료":
        return {
          bg: "bg-blue-50 border-blue-200 hover:border-blue-400",
          badge: "bg-blue-600 text-white",
          icon: (
            <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ),
          text: "제출 완료"
        };
      case "피드백 완료":
        return {
          bg: "bg-purple-50 border-purple-200 hover:border-purple-400",
          badge: "bg-purple-600 text-white",
          icon: (
            <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m10 0V6a4 4 0 00-8 0v2m8 0H7" /></svg>
          ),
          text: "피드백 완료"
        };
      case "최종 제출":
        return {
          bg: "bg-green-50 border-green-200 hover:border-green-400",
          badge: "bg-green-600 text-white",
          icon: (
            <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 17.75l-6.172 3.245 1.179-6.873L2 9.505l6.908-1.004L12 2.75l3.092 5.751L22 9.505l-5.007 4.617 1.179 6.873z" /></svg>
          ),
          text: "최종 제출"
        };
      case "미제출":
      default:
        return {
          bg: "bg-gray-50 border-gray-200 hover:border-gray-400",
          badge: "bg-gray-400 text-white",
          icon: (
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ),
          text: "미제출"
        };
    }
  };

  const handleCardClick = (student: Student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleConfirm = () => {
    if (assignmentId !== null && classId !== null && selectedStudent) {
      const token = encodeAssignmentStudentToken(assignmentId, classId, selectedStudent.id);

      router.push(`/a_dist/student_submit/${token}`);
    }
    setModalOpen(false);
    setSelectedStudent(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-indigo-500 font-semibold">로딩 중...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* 상단: 과제 정보 + QR/URL */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* 좌측: 과제 정보 */}
        <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-100 p-8 min-h-[260px] flex items-center justify-center">
          {assignment && (
            <div className="w-full">
              <h1 className="text-2xl font-bold text-indigo-700 mb-4">{assignment.name}</h1>
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">📝 과제 조건 / 문항</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap min-h-[48px]">
                  {assignment.condition || "없음"}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">💡 전달사항</h3>
                <div className="bg-blue-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap min-h-[48px]">
                  {assignment.guide || "없음"}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* 우측: QR+URL */}
        <div className="w-full md:w-1/3 bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex flex-col items-center justify-between min-h-[260px]">
          <div className="w-full flex flex-col items-center">
            <div ref={qrRef} className="bg-white p-2 rounded-xl border border-gray-200 shadow mb-4">
              <QRCode value={distributeUrl} size={140} />
            </div>
            <div className="w-full flex flex-col items-center">
              <input
                type="text"
                value={distributeUrl}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm font-mono mb-2 text-center"
              />
              <div className="flex gap-2 w-full justify-center">
                <button
                  onClick={handleCopyUrl}
                  className="bg-indigo-600 hover:bg-indigo-700 text-sm text-white px-4 py-2 rounded-lg font-semibold shadow w-28"
                >
                  URL 복사
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-semibold shadow w-28"
                >
                  QR 다운로드
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 학생별 카드 (1행 4열) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {students.map((student) => {
          const status = getStudentStatus(student.id);
          const visual = getCardVisual(status);
          return (
            <div
              key={student.id}
              className={`rounded-2xl shadow-lg border-2 p-6 flex flex-col items-center cursor-pointer transition-all duration-200 group ${visual.bg} hover:scale-105`}
              onClick={() => handleCardClick(student)}
              style={{ minHeight: 170 }}
            >
              <div className="mb-3 flex items-center justify-center">{visual.icon}</div>
              <div className="text-lg font-extrabold mb-2 text-gray-900 group-hover:text-indigo-700 transition-colors">{student.name}</div>
              <span className={`inline-block px-4 py-1 rounded-full text-base font-bold mt-2 shadow ${visual.badge}`}>{visual.text}</span>
            </div>
          );
        })}
      </div>

      {/* 본인 확인 모달 */}
      {modalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-xs w-full shadow-xl flex flex-col items-center">
            <div className="text-xl font-bold mb-4 text-gray-800">본인 확인</div>
            <div className="mb-6 text-gray-700 text-center">
              <span className="font-semibold text-indigo-600">{selectedStudent.name}</span> 학생이 맞습니까?
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 font-bold text-lg shadow"
              >
                맞습니다
              </button>
              <button
                onClick={() => { setModalOpen(false); setSelectedStudent(null); }}
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
