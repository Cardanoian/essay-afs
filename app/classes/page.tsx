'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import {
  getClasses,
  addClass,
  getStudents,
  addStudent,
  uploadStudentsCSV,
  deleteStudent,
} from '../lib/api';
import { useRouter } from 'next/navigation';
import useAuth from '../hooks/auth';
import { loginCheck } from '../hooks';
import { encodeStudentToken } from '../lib/hashids';

interface Class {
  id: number;
  name: string;
}
interface Student {
  id: number;
  number: number;
  name: string;
  email: string;
  class_id: number;
  feedback?: string;
}

export default function ClassesPage() {
  loginCheck();

  const { user, userLoading } = useAuth();

  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [className, setClassName] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const router = useRouter();

  // 학급 목록 불러오기
  useEffect(() => {
    setLoading(true);
    getClasses()
      .then((res) => {
        setClasses(res.data);
        if (res.data.length > 0) setSelectedClass(res.data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  // 학급 선택 시 학생 목록 불러오기
  useEffect(() => {
    if (selectedClass) {
      setLoading(true);
      getStudents(selectedClass)
        .then((res) => {
          const sorted = res.data.sort(
            (a: Student, b: Student) => a.number - b.number
          ); // ✅ number 기준 오름차순 정렬
          setStudents(sorted);
        })
        .finally(() => setLoading(false));
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  // 학급 추가
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;
    setLoading(true);

    try {
      const class_info = {
        name: className,
      };
      await addClass(class_info);
      const res = await getClasses();
      setClasses(res.data);
      setClassName('');
      setShowAddClass(false);
      toast.success('학급이 성공적으로 추가되었습니다!');
    } catch (error) {
      console.error('학급 추가 실패:', error);
      toast.error('학급 추가에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 학생 직접 추가
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentNumber || !selectedClass) return;

    // 같은 번호를 가진 학생이 이미 존재하는지 확인
    const existingStudent = students.find(
      (student) => student.number === Number(studentNumber)
    );
    if (existingStudent) {
      toast.error(`번호 ${studentNumber}번을 가진 학생이 이미 존재합니다.`);
      return;
    }

    setLoading(true);

    const studentInfo = {
      number: Number(studentNumber),
      name: studentName,
      email: studentEmail,
      class_id: selectedClass,
    };

    console.log(studentInfo);

    try {
      await addStudent(studentInfo);
      const res = await getStudents(selectedClass);
      const sorted = res.data.sort(
        (a: Student, b: Student) => a.number - b.number
      );
      setStudents(sorted);

      setStudentName('');
      setStudentNumber('');
      setStudentEmail('');
      setShowAddStudent(false);
      toast.success('학생이 성공적으로 추가되었습니다!');
    } catch (error) {
      console.error('학생 추가 실패:', error);
      toast.error('학생 추가에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 학생 CSV 업로드
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedClass) return;
    setLoading(true);

    try {
      await uploadStudentsCSV(selectedClass, uploadFile);
      const res = await getStudents(selectedClass);
      setStudents(res.data);
      setShowUpload(false);
      setUploadFile(null);
      toast.success('학생들이 성공적으로 업로드되었습니다!');
    } catch (error) {
      console.error('학생 업로드 실패:', error);
      toast.error('학생 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const csv =
      'number,name,email\n1,홍길동,hong@school.com\n2,김철수,kim@school.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '학생업로드예시.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 학생 삭제 확인 모달 열기
  const handleDeleteClick = (student: Student) => {
    setDeleteTarget(student);
    setShowDeleteConfirm(true);
  };

  // 학생 삭제 실행
  const handleDeleteStudent = async () => {
    if (!deleteTarget || !selectedClass) return;

    const studentInfo = {
      number: deleteTarget.number,
      name: deleteTarget.name,
      email: deleteTarget.email || '',
      class_id: selectedClass,
    };

    setLoading(true);
    try {
      await deleteStudent(studentInfo);
      const res = await getStudents(selectedClass);
      const sorted = res.data.sort(
        (a: Student, b: Student) => a.number - b.number
      );
      setStudents(sorted);
      toast.success('학생이 성공적으로 삭제되었습니다!');
    } catch (error) {
      console.error('학생 삭제 실패:', error);
      toast.error('학생 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-extrabold mb-6 text-blue-700 tracking-tight'>
        학생 관리
      </h1>
      <div className='flex gap-4 mb-6 flex-wrap'>
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClass(cls.id)}
            className={`px-4 py-2 rounded-lg border font-semibold shadow-sm transition-all ${
              selectedClass === cls.id
                ? 'bg-blue-600 text-white scale-105'
                : 'bg-white hover:bg-blue-50'
            }`}
          >
            {cls.name}
          </button>
        ))}
      </div>
      {loading && (
        <div className='text-center text-blue-500 font-semibold'>
          로딩 중...
        </div>
      )}
      <div className='mt-6'>
        <div className='flex items-center justify-between mb-2'>
          <h2 className='text-lg font-bold mb-2 text-gray-700'>
            {selectedClass
              ? '학생 목록'
              : '학급을 선택하면 학생 목록이 표시됩니다'}
          </h2>
          <div className='flex gap-2'>
            <button
              onClick={() => setShowAddStudent(true)}
              disabled={!selectedClass}
              className={`rounded-lg px-5 py-2 font-bold shadow transition ${
                selectedClass
                  ? 'bg-gradient-to-r from-green-400 to-blue-400 text-white hover:from-green-500 hover:to-blue-500'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              + 학생 직접 추가
            </button>
            <button
              onClick={() => setShowUpload(true)}
              disabled={!selectedClass}
              className={`rounded-lg px-5 py-2 font-bold shadow transition ${
                selectedClass
                  ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:from-purple-500 hover:to-pink-500'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              학생 CSV 업로드
            </button>
          </div>
        </div>
        <div className='overflow-x-auto rounded-xl shadow'>
          <table
            className='w-full bg-white rounded-xl'
            style={{ tableLayout: 'fixed' }}
          >
            <thead className='bg-blue-50'>
              <tr>
                <th className='p-3 text-center w-1/4'>번호</th>
                <th className='p-3 text-center w-1/3'>이름</th>
                <th className='p-3 text-center w-1/3'>이메일</th>
                <th className='p-3 text-center w-1/6'>삭제</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((stu) => (
                  <tr
                    key={stu.id}
                    className='border-t hover:bg-blue-50 cursor-pointer'
                    onClick={() =>
                      router.push(`/students/${encodeStudentToken(stu.id)}`)
                    }
                  >
                    <td className='p-3 text-center w-1/4'>{stu.number}</td>
                    <td className='p-3 text-center w-1/3'>{stu.name}</td>
                    <td className='p-3 text-center w-1/3'>{stu.email}</td>
                    <td className='p-3 text-center w-1/6'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(stu);
                        }}
                        className='bg-red-500 hover:bg-red-600 text-white rounded-full px-3 py-1 font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-red-300'
                        title='학생 삭제'
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className='p-8 text-center text-gray-500'>
                    {selectedClass
                      ? '등록된 학생이 없습니다'
                      : '학급을 선택해주세요'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* 학급 추가 모달 */}
      <Modal open={showAddClass} onClose={() => setShowAddClass(false)}>
        <h2 className='text-xl font-bold mb-4 text-blue-700'>학급 추가</h2>
        <form onSubmit={handleAddClass} className='flex flex-col gap-4'>
          <input
            type='text'
            placeholder='학급 이름'
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className='border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg'
            autoFocus
          />
          <button
            type='submit'
            className='bg-blue-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-blue-700 transition'
          >
            추가
          </button>
        </form>
      </Modal>
      {/* 학생 직접 추가 모달 */}
      <Modal open={showAddStudent} onClose={() => setShowAddStudent(false)}>
        <h2 className='text-xl font-bold mb-4 text-green-700'>
          학생 직접 추가
        </h2>
        <form onSubmit={handleAddStudent} className='flex flex-col gap-4'>
          <input
            type='number'
            placeholder='번호'
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            className='border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg'
            autoFocus
          />
          <input
            type='text'
            placeholder='이름'
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className='border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg'
          />
          <input
            type='email'
            placeholder='이메일'
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            className='border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg'
          />
          <button
            type='submit'
            className='bg-green-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-green-700 transition'
          >
            추가
          </button>
        </form>
      </Modal>
      {/* 학생 CSV 업로드 모달 */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)}>
        <h2 className='text-xl font-bold mb-4 text-purple-700'>
          학생 CSV 업로드
        </h2>
        <form onSubmit={handleUpload} className='flex flex-col gap-4'>
          <button
            type='button'
            onClick={handleDownloadSample}
            className='bg-purple-500 text-white rounded-lg py-2 px-4 font-semibold hover:bg-purple-600 transition self-start'
          >
            예시 파일 다운로드
          </button>
          <input
            type='file'
            accept='.csv'
            className='border rounded-lg px-4 py-3'
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
          <p className='text-gray-500 text-sm'>
            CSV 파일 형식: 번호,이름,이메일 (첫 행은 헤더)
          </p>
          <button
            type='submit'
            className='bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg py-3 font-bold text-lg shadow hover:from-purple-600 hover:to-pink-600 transition'
          >
            업로드
          </button>
        </form>
      </Modal>

      {/* 학생 삭제 확인 모달 */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
      >
        <div className='text-center'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-8 h-8 text-red-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h2 className='text-xl font-bold mb-2 text-gray-900'>학생 삭제</h2>
          <p className='text-gray-600 mb-6'>
            <span className='font-semibold text-red-600'>
              "{deleteTarget?.name}"
            </span>{' '}
            학생을 삭제하시겠습니까?
          </p>
          <p className='text-sm text-gray-500 mb-6'>
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className='flex gap-3'>
            <button
              onClick={handleDeleteStudent}
              className='flex-1 bg-red-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-red-700 transition'
            >
              삭제
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteTarget(null);
              }}
              className='flex-1 bg-gray-400 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-gray-500 transition'
            >
              취소
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
