"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { updateFeedbackGuide } from "../lib/api";

interface FeedbackGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialGuide?: any;
}

interface FeedbackGuideItem {
  studentExample: string;
  teacherFeedback: string;
  score : number;
}

export default function FeedbackGuideModal({ isOpen, onClose, onComplete, initialGuide }: FeedbackGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const STUDENT_EXAMPLES = [
    `저는 이번 방학에 가족과 함께 제주도에 다녀왔습니다. 바다에서 수영도 하고 맛있는 음식도 많이 먹었습니다.`,
    `우리 반 친구들과 함께 즐거운 마음으로 학교 운동회에 참가했습니다.
     여러 종목 중에서 저는 특히 달리기에 참가했는데, 열심히 달려서 2등을 했습니다. 순위보다도 최선을 다했다는 점이 뿌듯했고, 친구들과 함께 응원하고 즐긴 시간이 정말 소중하게 느껴졌습니다.`,
    `나는 책 읽는 것을 좋아한다. 책을 읽으면 다른 사람의 삶을 간접적으로 경험할 수 있고, 평소에 하지 못한 생각들을 떠올리게 되기 때문이다. 책 속의 인물들과 이야기는 나에게 새로운 시각과 감정을 안겨준다.
     최근에 나는『어린 왕자』를 읽었다. 이 책은 단순히 어린아이의 이야기처럼 보이지만, 읽을수록 깊은 의미가 담겨 있다는 것을 알 수 있었다. 어린 왕자가 어른들을 이상하게 여기는 장면에서는, 어릴 적 나도 비슷한 생각을 했던 기억이 떠올랐다.
     가장 인상 깊었던 부분은 여우가 어린 왕자에게 '중요한 것은 눈에 보이지 않아.'라고 말하는 장면이었다. 이 문장을 읽고 나는 우리가 평소에 얼마나 겉모습만 보고 사람이나 사물을 판단하는지 돌아보게 되었다. 진심, 믿음, 우정 같은 보이지 않는 것들이 얼마나 소중한지 다시 생각하게 되었다. 
     『어린 왕자』는 얇은 책이지만 마음속에 깊은 울림을 주었다. 앞으로도 다양한 책을 읽으며, 이번처럼 나 자신을 돌아볼 수 있는 기회를 자주 만들고 싶다.`,
    "나는 주말에 부모님이랑 동물원 갔다. 코끼리도 있고 기린도 잇었다. 가까이서 봐서 신기했다.",
    `나는 장래에 과학자가 되고 싶다. 과학은 세상의 원리를 알아가는 과정이 재미있고, 궁금한 것을 직접 실험해 볼 수 있어서 흥미롭다. 그래서 평소에도 과학책을 자주 읽고 집에서 간단한 실험을 해보기도 한다.
    최근에는 종이로 만든 로켓을 날려보는 실험을 했는데, 어떻게 하면 더 멀리 날아가는지 여러 번 시도해 보았다. 실험을 하면서 실패도 있었지만, 원인을 생각하고 다시 시도하는 과정이 재미있었다.
    앞으로도 계속 노력해서 꼭 멋진 과학자가 되고 싶다.`
  ];
  const QUESTION_PROMPTS = [
    `1) 방학 중 가장 기억에 남는 일을 구체적으로 써보세요.\n2) 겪었던 일에 대한 자신의 기분이 잘 드러나도록 작성하세요`,
    `1) 학교에서 친구들과 함께한 특별한 경험을 구체적으로 묘사해보세요.\n2) 그 경험이 본인에게 어떤 의미였는지 덧붙여보세요`,
    `1) 최근에 읽은 책이나 인상 깊었던 이야기에 대해 자신의 생각을 포함해 써보세요.\n2) 책이나 이야기에서 인상 깊었던 부분을 구체적으로 설명하세요`,
    `1) 가족 또는 친구와 함께한 주말 활동을 간단히 적어보세요.\n2) 그 활동을 하며 느낀 점이나 배운 점을 함께 써보세요`,
    `1) 장래희망과 그 이유, 그리고 이를 위해 노력하는 점을 써보세요.\n2) 앞으로 어떤 목표를 세우고 싶은지도 적어보세요`
  ];
  const [feedbackGuide, setFeedbackGuide] = useState<Record<string, FeedbackGuideItem & { score: number | null }>>(() => {
    if (initialGuide) {
      // Convert initialGuide to the expected state shape (score는 null로)
      const obj: Record<string, FeedbackGuideItem & { score: number | null }> = {};
      for (let i = 1; i <= 5; i++) {
        const key = i.toString();
        obj[key] = {
          studentExample: STUDENT_EXAMPLES[i - 1],
          teacherFeedback: initialGuide[key]?.teacherFeedback || "",
          score: typeof initialGuide[key]?.score === 'number' ? initialGuide[key].score : 0,
        };
      }
      return obj;
    }
    return {
      "1": { studentExample: STUDENT_EXAMPLES[0], teacherFeedback: "", score: 0 },
      "2": { studentExample: STUDENT_EXAMPLES[1], teacherFeedback: "", score: 0 },
      "3": { studentExample: STUDENT_EXAMPLES[2], teacherFeedback: "", score: 0 },
      "4": { studentExample: STUDENT_EXAMPLES[3], teacherFeedback: "", score: 0 },
      "5": { studentExample: STUDENT_EXAMPLES[4], teacherFeedback: "", score: 0 },
    };
  });

  // Sync feedbackGuide with initialGuide when modal opens or initialGuide changes
  useEffect(() => {
    if (isOpen) {
      if (initialGuide) {
        const obj: Record<string, FeedbackGuideItem & { score: number | null }> = {};
        for (let i = 1; i <= 5; i++) {
          const key = i.toString();
          obj[key] = {
            studentExample: STUDENT_EXAMPLES[i - 1],
            teacherFeedback: initialGuide[key]?.teacherFeedback || "",
            score: typeof initialGuide[key]?.score === 'number' ? initialGuide[key].score : 0,
          };
        }
        setFeedbackGuide(obj);
      } else {
        setFeedbackGuide({
          "1": { studentExample: STUDENT_EXAMPLES[0], teacherFeedback: "", score: 0 },
          "2": { studentExample: STUDENT_EXAMPLES[1], teacherFeedback: "", score: 0 },
          "3": { studentExample: STUDENT_EXAMPLES[2], teacherFeedback: "", score: 0 },
          "4": { studentExample: STUDENT_EXAMPLES[3], teacherFeedback: "", score: 0 },
          "5": { studentExample: STUDENT_EXAMPLES[4], teacherFeedback: "", score: 0 },
        });
      }
      setCurrentStep(1);
    }
  }, [isOpen, initialGuide]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // 점수 필드는 저장하지 않고, 기존 구조로 변환
      const guideToSave = Object.fromEntries(
        Object.entries(feedbackGuide).map(([k, v]) => [k, { studentExample: v.studentExample, teacherFeedback: v.teacherFeedback, score : v.score }])
      );
      await updateFeedbackGuide(guideToSave);
      toast.success("피드백 가이드가 성공적으로 설정되었습니다!");
      onComplete();
      onClose();
      setCurrentStep(1);
    } catch (error) {
      console.error("피드백 가이드 업데이트 실패:", error);
      toast.error("피드백 가이드 설정에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const updateCurrentStep = (field: keyof FeedbackGuideItem | "score", value: string | number) => {
    setFeedbackGuide(prev => ({
      ...prev,
      [currentStep.toString()]: {
        ...prev[currentStep.toString()],
        [field]: value
      }
    }));
  };

  const isCurrentStepValid = () => {
    const current = feedbackGuide[currentStep.toString()];
    return current.score !== null && current.teacherFeedback.trim() !== "";
  };

  const isAllComplete = () => {
    return Object.values(feedbackGuide).every(item => 
      item.score !== null && item.teacherFeedback.trim() !== ""
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">피드백 가이드 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 진행 단계 표시 */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step < currentStep 
                    ? "bg-green-500 text-white" 
                    : step === currentStep 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {step < currentStep ? "✓" : step}
                </div>
                {step < 5 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 현재 단계 내용 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            {currentStep}번째 피드백 가이드 설정
          </h3>
          <div className="mb-4">
            <span className="block text-base font-bold text-indigo-700 mb-1">과제 문항</span>
            <div className="bg-indigo-50 text-indigo-800 rounded-lg px-4 py-2 mb-2 whitespace-pre-line">{QUESTION_PROMPTS[currentStep-1]}</div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                학생 예시 답안
              </label>
              <div className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 min-h-[80px] whitespace-pre-line">{feedbackGuide[currentStep.toString()].studentExample}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">점수 (1~5점)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(score => (
                  <button
                    key={score}
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 font-bold text-lg flex items-center justify-center transition-all ${feedbackGuide[currentStep.toString()].score === score ? "bg-blue-500 text-white border-blue-600" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
                    onClick={() => updateCurrentStep("score", score)}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                교사 피드백
              </label>
              <textarea
                value={feedbackGuide[currentStep.toString()].teacherFeedback}
                onChange={(e) => updateCurrentStep("teacherFeedback", e.target.value)}
                placeholder="해당 답안에 대한 교사의 피드백을 입력해주세요..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`px-6 py-2 rounded-lg font-medium ${
              currentStep === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-500 text-white hover:bg-gray-600"
            }`}
          >
            이전
          </button>
          
          <div className="flex gap-2">
            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!isCurrentStepValid()}
                className={`px-6 py-2 rounded-lg font-medium ${
                  !isCurrentStepValid()
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!isAllComplete()}
                className={`px-6 py-2 rounded-lg font-medium ${
                  !isAllComplete()
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                완료
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 