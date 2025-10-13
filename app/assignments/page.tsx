'use client';
import { useState } from 'react';
import Modal from '../components/Modal';

interface Class {
  id: number;
  name: string;
}
interface Assignment {
  id: number;
  name: string;
  type: string;
  className: string;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
}

const dummyClasses: Class[] = [
  { id: 1, name: '1학년 1반' },
  { id: 2, name: '2학년 2반' },
];
const dummyAssignments: Assignment[] = [
  {
    id: 1,
    name: '글쓰기 과제1',
    type: '교육활동',
    className: '1학년 1반',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
  {
    id: 2,
    name: '글쓰기 평가',
    type: '평가활동',
    className: '2학년 2반',
    status: 'pending',
    started_at: null,
    completed_at: null,
  },
];

export default function AssignmentsPage() {
  const [assignments, setAssignments] =
    useState<Assignment[]>(dummyAssignments);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('교육활동');
  const [classId, setClassId] = useState(dummyClasses[0].id);
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const className = dummyClasses.find((c) => c.id === classId)?.name || '';
    setAssignments([
      ...assignments,
      {
        id: Date.now(),
        name,
        type,
        className,
        status: 'pending',
        started_at: null,
        completed_at: null,
      },
    ]);
    setName('');
    setType('교육활동');
    setClassId(dummyClasses[0].id);
    setShowAdd(false);
  };

  // 배부하기 버튼 클릭 시
  const handleDistribute = (id: number) => {
    setTargetId(id);
    setShowConfirm(true);
  };

  // 확인창에서 '예' 클릭 시
  const confirmDistribute = () => {
    if (targetId === null) return;
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === targetId
          ? {
              ...a,
              status: 'in_progress',
              started_at: new Date().toISOString(),
            }
          : a
      )
    );
    setShowConfirm(false);
    setTargetId(null);
  };

  // 상태별 배경색
  const getRowColor = (status: string) => {
    if (status === 'pending') return 'bg-gray-100';
    if (status === 'in_progress') return 'bg-blue-100';
    if (status === 'completed') return 'bg-green-100';
    return '';
  };

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-extrabold mb-6 text-indigo-700 tracking-tight'>
        과제 관리
      </h1>
      <button
        onClick={() => setShowAdd(true)}
        className='bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg px-5 py-2 font-bold shadow hover:from-indigo-600 hover:to-blue-600 transition mb-6'
      >
        + 과제 추가
      </button>
      <div className='overflow-x-auto rounded-xl shadow'>
        <table className='w-full bg-white rounded-xl'>
          <thead className='bg-indigo-50'>
            <tr>
              <th className='p-3'>이름</th>
              <th className='p-3'>종류</th>
              <th className='p-3'>할당 학급</th>
              <th className='p-3'>상태</th>
              <th className='p-3'>배부</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr
                key={a.id}
                className={`border-t hover:bg-indigo-50 ${getRowColor(
                  a.status
                )}`}
              >
                <td className='p-3'>{a.name}</td>
                <td className='p-3'>{a.type}</td>
                <td className='p-3'>{a.className}</td>
                <td className='p-3'>
                  {a.status === 'pending' && (
                    <span className='text-gray-600 font-semibold'>대기중</span>
                  )}
                  {a.status === 'in_progress' && (
                    <span className='text-blue-700 font-semibold'>진행중</span>
                  )}
                  {a.status === 'completed' && (
                    <span className='text-green-700 font-semibold'>완료</span>
                  )}
                </td>
                <td className='p-3'>
                  {a.status === 'pending' ? (
                    <button
                      className='bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-1 font-semibold shadow-sm transition'
                      onClick={() => handleDistribute(a.id)}
                    >
                      배부하기
                    </button>
                  ) : (
                    <span className='text-gray-400'>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 과제 추가 모달 */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)}>
        <h2 className='text-xl font-bold mb-4 text-indigo-700'>과제 추가</h2>
        <form onSubmit={handleAddAssignment} className='flex flex-col gap-4'>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className='border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg'
          >
            <option value='교육활동'>교육활동</option>
            <option value='평가활동'>평가활동</option>
          </select>
          <input
            type='text'
            placeholder='과제 이름'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg'
            autoFocus
          />
          <select
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            className='border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-lg'
          >
            {dummyClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <button
            type='submit'
            className='bg-indigo-600 text-white rounded-lg py-3 font-bold text-lg shadow hover:bg-indigo-700 transition'
          >
            추가
          </button>
        </form>
      </Modal>
      {/* 배부 확인 모달 */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)}>
        <h2 className='text-xl font-bold mb-4 text-blue-700'>
          학생들에게 배부하시겠습니까?
        </h2>
        <div className='flex gap-4 justify-end'>
          <button
            className='px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300'
            onClick={() => setShowConfirm(false)}
          >
            취소
          </button>
          <button
            className='px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700'
            onClick={confirmDistribute}
          >
            예
          </button>
        </div>
      </Modal>
    </div>
  );
}
