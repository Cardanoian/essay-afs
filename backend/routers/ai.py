from fastapi import APIRouter, Depends, HTTPException

from dotenv import load_dotenv
from routers.auth import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
import crud, database, models

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
from pydantic import SecretStr


load_dotenv()


router = APIRouter(prefix="/ai", tags=['ai'])

def merge_feedback_guide(feedback_guide) :
    result = ""
    for i in range(1,6) :
        ex = feedback_guide[str(i)]

        result += (
            "---------------------------\n"
            f"student_response : {ex['studentExample']}\n"
            f"teacher_feedback : {ex['teacherFeedback']}\n"
            f"teacher_score : {ex['score']}\n"
        )
    
    return result



@router.post("/mid_feedback")
async def generate_mid_feedback(
    feedback_data : dict,
    db: AsyncSession = Depends(database.get_db)
    ) :
    # 1. 학생 → 학급 → 교사 → feedback_guide
    student = await db.get(models.Student, feedback_data['student_id'])
    if not student:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    school_class = await db.get(models.SchoolClass, student.class_id)
    if not school_class:
        raise HTTPException(404, '학급을 찾을 수 없습니다.')
    user = await db.get(models.User, school_class.user_id)
    if not user:
        raise HTTPException(404, '교사를 찾을 수 없습니다.')
    feedback_guide = user.feedback_guide
    
    llm = ChatOpenAI(
        temperature=0.3,
        model='gpt-4o-mini',
        verbose=False
    )
    print(feedback_data)
    grade = await crud.get_grade_by_student_id(
        db, 
        feedback_data['student_id']
        )
    
    mid_feedback_prompt = ChatPromptTemplate.from_messages([
        ("system", """

The followings are real teacher feedback examples.
Imitate the tone and expression style of those examples when writing your own feedback :

{feedback_guide}
----

You are a helpful writing assistant providing feedback to a grade 5 student who is currently writing their draft.
Your goal is to guide the student in a warm and supportive way by giving them one big guiding question based on their current draft, writing condition, and teacher guide.

When giving feedback, follow these instructions:
0. Always write in Korean. And Try to be Familiar. 
1. Adjust the vocabulary and sentence complexity based on the student's elementary {grade} to ensure the feedback is age-appropriate and easy to understand.
2. Do not give general praise or multiple comments. Instead, focus on **one main question** that can help the student clearly improve their writing.
3. Format the output like this:

## [ONE BIG QUESTION]  
(And below the question, provide 2~3 explanatory sentences that support it.
Give helpful example that guide the student to clarify the direction of their writing.
Make sure to reflect the writing condition, guide)
         
         """),
        ("human", """
Based on the following information, provide detailed feedback on the student's writing.

# Condition: 
{condition}

# Guide: 
{guide}

# Student's Writing: 
{content}

# Additional Instructions: 
{additional_instructions}
         """)
    ])

    chain = (
    mid_feedback_prompt
    |llm
    |StrOutputParser()
    )

    result = await chain.ainvoke({
        "grade" : grade,
        "condition" : feedback_data['condition'],
        "guide" : feedback_data['guide'],
        "content" : feedback_data['content'],
        "feedback_guide" : feedback_guide,
        "additional_instructions" : feedback_data.get('additional_instructions', '')
    })
    
    response = {"status": "success", "result": result}
    return response

@router.post("/final_feedback")
async def generate_final_feedback(
    feedback_data : dict,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
    ) :

    merged_feedback_guide = merge_feedback_guide(user.feedback_guide)

    student_id = feedback_data['studentId']

    grade = await crud.get_grade_by_student_id(db, student_id)

    llm = ChatOpenAI(
        temperature=0.3,
        model='gpt-4o-mini',
        verbose=False
    )

    final_feedback_prompt = ChatPromptTemplate.from_messages([
        ("system", """
The followings are real teacher feedback examples.
Imitate the tone and expression style of those examples when writing your own feedback :

{feedback_guide}
----

Your goal is to help the student reflect on what they did well and what they could improve next time, based on the writing condition and guide.

When providing final feedback, always follow these rules:
0. Adjust the vocabulary and sentence complexity based on the student's {school_level} and {grade} to ensure the feedback is age-appropriate and easy to understand.
1. Always Write in Korean.
2. Clearly point out one or two things that could be improved, especially based on the writing condition and guide.
3. Then praise specific parts of the writing that were done well, linking them to the condition or guide.
4. Comment on how well the student responded to past feedback from “last_feedbacks.”. If There's nothing on "last_feedbacks", Do NOT mention it.
5. Give one kind and helpful suggestion (feed-forward) the student can try in their next writing.
6. **DO NOT GIVE ANY MEANINGLESS PRAISES**
7. Return only Feedbacks - Not other items(score)
        """),
        ("human", """
Based on the following information, write final feedback on the student's writing.

# Condition: 
{condition}

# Guide: 
{guide}

# Student's Writing: 
{content}
        """)
    ])

    chain = (
        final_feedback_prompt
        | llm
        | StrOutputParser()
    )

    result = await chain.ainvoke({
        "school_level" : user.school_level,
        "grade" : grade,
        "condition": feedback_data['condition'],
        "guide": feedback_data['guide'],
        "content": feedback_data['content'],
        "feedback_guide" : merged_feedback_guide,
        "additional_instructions": feedback_data.get('additional_instructions', '')
    })

    result = result.replace("teacher_feedback :", "")


    response = {"status": "success", "result": result}
    return response

def criteria_dict_to_table(criteria: dict) -> str:

    lines = []
    for key, value in criteria.items():
        lines.append(f"{key} | {value}")
    return "\n".join(lines)


@router.post("/score")
async def ai_score(
    score_data: dict,
    db: AsyncSession = Depends(database.get_db)
):
    print("채점데이터 :", score_data)
    # 1. 학생 → 학급 → 교사 → feedback_guide
    student = await db.get(models.Student, score_data['studentId'])
    if not student:
        raise HTTPException(404, '학생을 찾을 수 없습니다.')
    school_class = await db.get(models.SchoolClass, student.class_id)
    if not school_class:
        raise HTTPException(404, '학급을 찾을 수 없습니다.')
    user = await db.get(models.User, school_class.user_id)
    if not user:
        raise HTTPException(404, '교사를 찾을 수 없습니다.')
    feedback_guide = user.feedback_guide

    criteria = criteria_dict_to_table(score_data['criteria'])

    llm = ChatOpenAI(
        temperature=0.3,
        model='gpt-4o-mini',
        verbose=False
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", '''
다음은 실제 교사의 평가 예시입니다. 이 스타일을 참고하여 채점하세요:
{feedback_guide}

당신은 초등학생 글쓰기 평가를 담당하는 AI 채점관입니다.
아래 평가 문항과 평가 기준을 참고하여, 학생의 답변을 평가 기준 중 **가장 적합한 단계 하나만** 골라 반환하세요.

- 반드시 평가 기준의 단계명(예: "상", "중", "하") 중 하나만 반환하세요.
- 그 외의 설명, 코멘트, 점수 등은 절대 포함하지 마세요.

평가 문항: {item}
평가 기준: {criteria}
        '''),
        ("human", """
학생 답변: {content}
        """)
    ])
    chain = (
        prompt 
        | llm 
        | StrOutputParser()
        )

    result = await chain.ainvoke({
    "feedback_guide": feedback_guide,
    "item": score_data.get("guide", ""),
    "criteria": criteria,
    "content": score_data.get("content", "")        
    })

    return {"result": result.strip()}
