'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FeedbackGuideModal from '../components/FeedbackGuideModal';
import Modal from '../components/Modal';
import { addClass, updateClass, deleteClass } from '../lib/api';
import {
  getAssignments,
  getEvaluations,
  getASubmission,
  getESubmission,
  getUserFullInfo,
} from '../lib/api';
import { encodeAssignmentToken, encodeEvaluationToken } from '../lib/hashids';
import { loginCheck } from '../hooks';

export default function DashboardPage() {
  loginCheck();

  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  const router = useRouter();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [ongoingAssignments, setOngoingAssignments] = useState<any[]>([]);
  const [ongoingEvaluations, setOngoingEvaluations] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingEvaluations, setLoadingEvaluations] = useState(true);
  const [isFeedbackGuideComplete, setIsFeedbackGuideComplete] = useState(false);
  const [feedbackGuideInitial, setFeedbackGuideInitial] = useState<any>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [editClassId, setEditClassId] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClass, setLoadingClass] = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<number | null>(null);
  const [deleteClassName, setDeleteClassName] = useState<string>('');

  // 학급 목록 불러오기 (모달용)
  const fetchClasses = async () => {
    setLoadingClass(true);
    try {
      const res = await getUserFullInfo();
      setClasses(res.data.classes || []);
    } catch {}
    setLoadingClass(false);
  };

  // 유저 정보 불러오기 (대시보드 메인용)
  const fetchUserInfo = async () => {
    setUserLoading(true);
    try {
      const res = await getUserFullInfo();
      setUser(res.data);
    } catch {}
    setUserLoading(false);
  };

  // 모달 열릴 때 학급 목록 불러오기
  useEffect(() => {
    if (isClassModalOpen) fetchClasses();
  }, [isClassModalOpen]);

  // 학급 추가
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;
    setLoadingClass(true);
    try {
      await addClass({ name: className });
      await fetchClasses();
      await fetchUserInfo();
      setClassName('');
    } finally {
      setLoadingClass(false);
    }
  };
  // 학급 삭제
  const handleDeleteClass = async (id: number) => {
    const cls = classes.find((c) => c.id === id);
    setDeleteClassId(id);
    setDeleteClassName(cls?.name || '');
  };
  const handleDeleteClassConfirm = async () => {
    if (!deleteClassId) return;
    setLoadingClass(true);
    try {
      await deleteClass(deleteClassId);
      await fetchClasses();
      await fetchUserInfo();
    } finally {
      setLoadingClass(false);
      setDeleteClassId(null);
      setDeleteClassName('');
    }
  };
  // 학급 이름 수정
  const handleEditClass = (id: number) => {
    const cls = classes.find((c) => c.id === id);
    setEditClassId(id);
    setEditClassName(cls?.name || '');
  };
  const handleEditClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClassId) return;
    setLoadingClass(true);
    try {
      await updateClass(editClassId, { name: editClassName });
      await fetchClasses();
      await fetchUserInfo();
      setEditClassId(null);
      setEditClassName('');
    } finally {
      setLoadingClass(false);
    }
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await getUserFullInfo();
        const userInfo = res.data;
        setUser(userInfo);

        console.log('정보 :', userInfo);

        // 피드백 가이드 완료 여부 검사
        const complete =
          userInfo?.feedback_guide &&
          Object.keys(userInfo.feedback_guide).length === 5 &&
          Object.values(userInfo.feedback_guide).every(
            (item) =>
              item &&
              typeof item === 'object' &&
              'studentExample' in item &&
              'teacherFeedback' in item
          );
        setIsFeedbackGuideComplete(!!complete);

        if (!userInfo?.classes) return;

        setLoadingAssignments(true);
        setLoadingEvaluations(true);

        let allAssignments: any[] = [];
        let allEvaluations: any[] = [];

        for (const cls of userInfo.classes) {
          // 과제 데이터 가져오기
          const { data: assignments } = await getAssignments(cls.id);
          for (const a of assignments) {
            if (a.status === 'in_progress') {
              allAssignments.push({ ...a, className: cls.name });
            }
          }

          // 평가 데이터 가져오기
          const { data: evaluations } = await getEvaluations(cls.id);
          for (const e of evaluations) {
            if (e.status === 'in_progress') {
              allEvaluations.push({ ...e, className: cls.name });
            }
          }
        }

        // 과제 데이터 처리
        const assignmentsWithCounts = await Promise.all(
          allAssignments.map(async (a) => {
            const { data: submissions } = await getASubmission({
              assignment_id: a.id,
            });
            const inProgress = submissions.filter(
              (s: any) => s.status === 'in_progress'
            ).length;
            const firstSubmitted = submissions.filter(
              (s: any) => s.status === 'first_submitted'
            ).length;
            const feedbackDone = submissions.filter(
              (s: any) => s.status === 'feedback_done'
            ).length;
            const finalSubmitted = submissions.filter(
              (s: any) => s.status === 'final_submitted'
            ).length;
            return {
              ...a,
              inProgress,
              firstSubmitted,
              feedbackDone,
              finalSubmitted,
            };
          })
        );

        // 평가 데이터 처리
        const evaluationsWithCounts = await Promise.all(
          allEvaluations.map(async (e) => {
            const { data: submissions } = await getESubmission({
              evaluation_id: e.id,
            });
            const inProgress = submissions.filter(
              (s: any) => s.status === 'in_progress'
            ).length;
            const finalSubmitted = submissions.filter(
              (s: any) => s.status === 'submitted'
            ).length;
            return {
              ...e,
              inProgress,
              finalSubmitted,
            };
          })
        );

        setOngoingAssignments(assignmentsWithCounts);
        setOngoingEvaluations(evaluationsWithCounts);
      } catch (e) {
        console.error('에러 발생:', e);
      } finally {
        setLoadingAssignments(false);
        setLoadingEvaluations(false);
        setUserLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  if (userLoading) {
    return <div className='p-8 text-center text-gray-600'>로딩 중...</div>;
  }

  return (
    <div className='p-8 max-w-5xl mx-auto'>
      <h1 className='text-3xl font-extrabold mb-8 text-indigo-700 tracking-tight'>
        {user?.name} 선생님
      </h1>

      {/* 설정 상태 섹션 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
        {/* 학급 설정 상태 */}
        <div className='bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-md p-6 border border-purple-100'>
          <div className='flex items-center gap-3 mb-4'>
            <span className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-200 text-purple-700 text-2xl'>
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                />
              </svg>
            </span>
            <h2 className='text-xl font-bold text-purple-700'>학급 설정</h2>
          </div>
          {user?.classes && user.classes.length > 0 ? (
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-5 h-5 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={3}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <span className='text-green-600 font-bold text-xl'>
                  학급설정 완료
                </span>
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              <p className='text-gray-600'>
                아직 학급이 없습니다. 학급을 추가해 주세요!
              </p>
            </div>
          )}
          <button
            onClick={() => setIsClassModalOpen(true)}
            className='mt-4 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors w-full font-bold text-lg shadow'
          >
            학급 관리하기
          </button>
          <Modal
            open={isClassModalOpen}
            onClose={() => {
              setIsClassModalOpen(false);
              fetchUserInfo();
            }}
            className='max-w-lg'
          >
            <h2 className='text-2xl font-bold text-purple-700 mb-4 text-center'>
              학급 관리
            </h2>
            <form onSubmit={handleAddClass} className='flex gap-2 mb-4'>
              <input
                type='text'
                placeholder='새 학급 이름'
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className='flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg'
              />
              <button
                type='submit'
                className='bg-purple-600 text-white rounded-lg px-4 py-2 font-bold hover:bg-purple-700 transition'
              >
                추가
              </button>
            </form>
            <div className='space-y-2 max-h-60 overflow-y-auto'>
              {loadingClass ? (
                <div className='text-center text-purple-400'>로딩 중...</div>
              ) : classes.length === 0 ? (
                <div className='text-center text-gray-400'>
                  등록된 학급이 없습니다.
                </div>
              ) : (
                classes.map((cls) => (
                  <div
                    key={cls.id}
                    className='flex items-center gap-2 bg-purple-50 rounded-lg px-4 py-2'
                  >
                    {editClassId === cls.id ? (
                      <form
                        onSubmit={handleEditClassSubmit}
                        className='flex gap-2 flex-1'
                      >
                        <input
                          type='text'
                          value={editClassName}
                          onChange={(e) => setEditClassName(e.target.value)}
                          className='flex-1 border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400'
                          autoFocus
                        />
                        <button
                          type='submit'
                          className='bg-green-500 text-white rounded-lg px-3 py-1 font-bold hover:bg-green-600 transition'
                        >
                          저장
                        </button>
                        <button
                          type='button'
                          onClick={() => setEditClassId(null)}
                          className='bg-gray-300 text-gray-700 rounded-lg px-3 py-1 font-bold hover:bg-gray-400 transition'
                        >
                          취소
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className='flex-1 font-semibold text-purple-800'>
                          {cls.name}
                        </span>
                        <button
                          onClick={() => handleEditClass(cls.id)}
                          className='bg-yellow-400 text-white rounded-lg px-3 py-1 font-bold hover:bg-yellow-500 transition'
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className='bg-red-500 text-white rounded-lg px-3 py-1 font-bold hover:bg-red-600 transition'
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </Modal>
        </div>

        {/* 피드백 가이드 설정 상태 */}
        <div className='bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-md p-6 border border-orange-100'>
          <div className='flex items-center gap-3 mb-4'>
            <span className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-200 text-orange-700 text-2xl'>
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </span>
            <h2 className='text-xl font-bold text-orange-700'>
              AI 가이드 설정
            </h2>
          </div>
          {isFeedbackGuideComplete ? (
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-5 h-5 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={3}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <span className='text-green-600 font-bold text-xl'>
                  AI 가이드 설정 완료
                </span>
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              <p className='text-gray-600'>
                AI가 선생님의 피드백 스타일을 이해할 수 있도록 가이드를
                설정해주세요!
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setFeedbackGuideInitial(user.feedback_guide || null);
              setIsFeedbackModalOpen(true);
            }}
            className='mt-4 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors w-full font-bold text-lg shadow'
          >
            {isFeedbackGuideComplete ? '수정/보완하기' : 'AI 가이드 설정하기'}
          </button>
        </div>
      </div>

      {/* 진행중인 과제만 표시 */}
      <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-md p-8 flex flex-col gap-4 border border-blue-100 mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <span className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-200 text-blue-700 text-2xl'>
            <svg
              className='w-7 h-7'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3'
              />
            </svg>
          </span>
          <h2 className='text-2xl font-bold text-blue-700'>진행중인 과제</h2>
          <span className='ml-auto text-lg font-bold text-blue-600 bg-white rounded-full px-4 py-1 shadow'>
            {ongoingAssignments.length}
          </span>
        </div>
        <ul className='divide-y divide-blue-100 bg-white rounded-xl shadow p-4'>
          {loadingAssignments ? (
            <li className='py-4 text-center text-gray-400'>로딩 중...</li>
          ) : ongoingAssignments.length === 0 ? (
            <li className='py-4 text-center text-gray-400'>
              진행중인 과제가 없습니다.
            </li>
          ) : (
            ongoingAssignments.map((a, i) => (
              <li
                key={i}
                className='py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4'
              >
                <div className='flex-1 min-w-0'>
                  <span className='font-semibold text-gray-800 text-lg'>
                    {a.name}
                  </span>
                  <span className='ml-2 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-bold'>
                    {a.className}
                  </span>
                  <div className='flex gap-4 mt-2 text-sm'>
                    <span className='text-gray-700'>
                      초고 작성 중:{' '}
                      <span className='font-bold text-black-700'>
                        {a.inProgress}
                      </span>
                    </span>
                    <span className='text-gray-700'>
                      1차 작성 완료:{' '}
                      <span className='font-bold text-blue-700'>
                        {a.firstSubmitted}
                      </span>
                    </span>
                    <span className='text-gray-700'>
                      피드백 제공:{' '}
                      <span className='font-bold text-purple-700'>
                        {a.feedbackDone}
                      </span>
                    </span>
                    <span className='text-gray-700'>
                      최종 제출:{' '}
                      <span className='font-bold text-green-700'>
                        {a.finalSubmitted}
                      </span>
                    </span>
                  </div>
                </div>
                <div className='flex gap-2 min-w-[200px] justify-end'>
                  <button
                    className='bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg px-4 py-2 font-bold shadow hover:from-blue-600 hover:to-indigo-600 transition'
                    onClick={() =>
                      router.push(
                        `/a_dist/assignment/${encodeAssignmentToken(
                          a.id,
                          a.class_id
                        )}`
                      )
                    }
                  >
                    배부 페이지
                  </button>
                  <button
                    className='bg-gradient-to-r from-indigo-400 to-purple-400 text-white rounded-lg px-4 py-2 font-bold shadow hover:from-indigo-500 hover:to-purple-500 transition'
                    onClick={() =>
                      router.push(
                        `/a_dist/manage_submit/${encodeAssignmentToken(
                          a.id,
                          a.class_id
                        )}`
                      )
                    }
                  >
                    관리 페이지
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* 진행중인 평가만 표시 */}
      <div className='bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl shadow-md p-8 flex flex-col gap-4 border border-pink-100'>
        <div className='flex items-center gap-3 mb-2'>
          <span className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-pink-200 text-pink-700 text-2xl'>
            <svg
              className='w-7 h-7'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </span>
          <h2 className='text-2xl font-bold text-pink-700'>진행중인 평가</h2>
          <span className='ml-auto text-lg font-bold text-pink-600 bg-white rounded-full px-4 py-1 shadow'>
            {ongoingEvaluations.length}
          </span>
        </div>
        <ul className='divide-y divide-pink-100 bg-white rounded-xl shadow p-4'>
          {loadingEvaluations ? (
            <li className='py-4 text-center text-gray-400'>로딩 중...</li>
          ) : ongoingEvaluations.length === 0 ? (
            <li className='py-4 text-center text-gray-400'>
              진행중인 평가가 없습니다.
            </li>
          ) : (
            ongoingEvaluations.map((e, i) => (
              <li
                key={i}
                className='py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4'
              >
                <div className='flex-1 min-w-0'>
                  <span className='font-semibold text-gray-800 text-lg'>
                    {e.name}
                  </span>
                  <span className='ml-2 text-xs bg-pink-100 text-pink-700 rounded-full px-2 py-0.5 font-bold'>
                    {e.className}
                  </span>
                  <div className='flex gap-4 mt-2 text-sm'>
                    <span className='text-gray-700'>
                      평가 작성 중:{' '}
                      <span className='font-bold text-black-700'>
                        {e.inProgress}
                      </span>
                    </span>
                    <span className='text-gray-700'>
                      평가 완료:{' '}
                      <span className='font-bold text-pink-700'>
                        {e.finalSubmitted}
                      </span>
                    </span>
                  </div>
                </div>
                <div className='flex gap-2 min-w-[200px] justify-end'>
                  <button
                    className='bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg px-4 py-2 font-bold shadow hover:from-pink-600 hover:to-purple-600 transition'
                    onClick={() =>
                      router.push(
                        `/e_dist/evaluation/${encodeEvaluationToken(
                          e.id,
                          e.class_id
                        )}`
                      )
                    }
                  >
                    배부 페이지
                  </button>
                  <button
                    className='bg-gradient-to-r from-purple-400 to-indigo-400 text-white rounded-lg px-4 py-2 font-bold shadow hover:from-purple-500 hover:to-indigo-500 transition'
                    onClick={() =>
                      router.push(
                        `/e_dist/manage_submit/${encodeAssignmentToken(
                          e.id,
                          e.class_id
                        )}`
                      )
                    }
                  >
                    관리 페이지
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* 피드백 가이드 설정 모달 */}
      <FeedbackGuideModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onComplete={() => {
          // 피드백 가이드 설정 완료 후 페이지 새로고침
          window.location.reload();
        }}
        initialGuide={feedbackGuideInitial}
      />

      {/* 학급 삭제 확인 모달 */}
      <Modal
        open={!!deleteClassId}
        onClose={() => {
          setDeleteClassId(null);
          setDeleteClassName('');
        }}
        className='max-w-md'
      >
        <div className='p-6 text-center'>
          <div className='mb-4'>
            <svg
              className='mx-auto w-16 h-16 text-red-500'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z'
              />
            </svg>
          </div>
          <h3 className='text-xl font-bold text-red-600 mb-2'>
            정말 삭제하시겠습니까?
          </h3>
          <p className='mb-6 text-gray-700'>
            학급{' '}
            <span className='font-bold text-purple-700'>{deleteClassName}</span>
            을(를) 삭제하면 복구할 수 없습니다.
            <br />이 작업은 되돌릴 수 없습니다.
          </p>
          <div className='flex gap-4 justify-center'>
            <button
              onClick={handleDeleteClassConfirm}
              className='bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-lg shadow'
            >
              삭제
            </button>
            <button
              onClick={() => {
                setDeleteClassId(null);
                setDeleteClassName('');
              }}
              className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-6 py-2 rounded-lg shadow'
            >
              취소
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
