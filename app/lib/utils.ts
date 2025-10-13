// CSV 다운로드 유틸리티 함수들
export const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  // CSV 헤더 생성
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 값에 쉼표나 줄바꿈이 있으면 따옴표로 감싸기
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  // BOM 추가 (한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 다운로드 링크 생성
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 과제 제출물 데이터를 CSV 형식으로 변환
export const convertAssignmentDataToCSV = (students: any[], submissions: any[], assignment: any) => {
  return students.map((student, idx) => {
    const submission = submissions.find(s => s.student_id === student.id);
    const utcDate = submission?.submitted_at ? new Date(submission.submitted_at) : null;
    const kstDate = utcDate ? new Date(utcDate.getTime() + 9 * 60 * 60 * 1000) : null;
    
    return {
      '번호': idx + 1,
      '학생이름': student.name,
      '1차제출물': submission?.content || '미제출',
      '피드백': submission?.assign_feedback?.[0]?.content || '',
      '2차제출물': submission?.revised_content || '미제출',
      '상태': submission?.status || 'in_progress',
      '제출시간': kstDate ? `${kstDate.toLocaleDateString("ko-KR")} ${kstDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}` : '-',
      '과제명': assignment?.name || '',
      '과제조건': assignment?.condition || '',
      '과제가이드': assignment?.guide || ''
    };
  });
};

// 평가 제출물 데이터를 CSV 형식으로 변환
export const convertEvaluationDataToCSV = (students: any[], submissions: any[], evaluation: any) => {
  return students.map((student, idx) => {
    const submission = submissions.find(s => s.student_id === student.id);
    const utcDate = submission?.submitted_at ? new Date(submission.submitted_at) : null;
    const kstDate = utcDate ? new Date(utcDate.getTime() + 9 * 60 * 60 * 1000) : null;
    
    return {
      '번호': idx + 1,
      '학생이름': student.name,
      '제출물': submission?.content || '미제출',
      '평가결과': submission?.score || '',
      '상태': submission?.status || 'in_progress',
      '제출시간': kstDate ? `${kstDate.toLocaleDateString("ko-KR")} ${kstDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}` : '-',
      '평가명': evaluation?.name || '',
      '평가문항': evaluation?.item || '',
      '평가기준': evaluation?.criteria ? Object.entries(evaluation.criteria).map(([k, v]) => `${k}: ${v}`).join('; ') : ''
    };
  });
};

// 학생별 과제/평가 이력을 CSV 형식으로 변환
export const convertStudentHistoryToCSV = (submissions: any[], eSubmissions: any[], eSubEvaluations: { [evaluationId: number]: string }) => {
  const assignmentData = submissions.map((sub, idx) => ({
    '구분': '과제',
    '번호': idx + 1,
    '과제명': sub.assignment_title,
    '1차제출': sub.content || '제출 내용 없음',
    '피드백': sub.feedback?.[0]?.content || '피드백 없음',
    '최종제출': sub.revised_content || '최종 제출 없음',
    '제출시간': new Date(sub.submitted_at).toLocaleString()
  }));

  const evaluationData = eSubmissions.map((sub, idx) => ({
    '구분': '평가',
    '번호': idx + 1,
    '평가명': eSubEvaluations[sub.evaluation_id] || sub.evaluation_id,
    '제출내용': sub.content || '-',
    '점수': sub.score || '-',
    '최종제출': '', // 평가는 1차 제출만 있음
    '제출시간': new Date(sub.submitted_at || sub.created_at).toLocaleString()
  }));

  return [...assignmentData, ...evaluationData];
};

// 학생별 과제 이력만 CSV 형식으로 변환
export const convertStudentAssignmentHistoryToCSV = (submissions: any[]) => {
  return submissions.map((sub, idx) => ({
    '번호': idx + 1,
    '과제명': sub.assignment_title,
    '1차제출': sub.content || '제출 내용 없음',
    '피드백': sub.feedback?.[0]?.content || '피드백 없음',
    '최종제출': sub.revised_content || '최종 제출 없음',
    '제출시간': new Date(sub.submitted_at).toLocaleString()
  }));
};

// 학생별 평가 이력만 CSV 형식으로 변환
export const convertStudentEvaluationHistoryToCSV = (eSubmissions: any[], eSubEvaluations: { [evaluationId: number]: string }) => {
  return eSubmissions.map((sub, idx) => ({
    '번호': idx + 1,
    '평가명': eSubEvaluations[sub.evaluation_id] || sub.evaluation_id,
    '제출내용': sub.content || '-',
    '점수': sub.score || '-',
    '제출시간': new Date(sub.submitted_at || sub.created_at).toLocaleString()
  }));
}; 