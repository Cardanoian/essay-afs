from fastapi import APIRouter, Depends, Body
from fastapi.responses import JSONResponse
from fastapi import Query
from sqlalchemy.ext.asyncio import AsyncSession
import crud, schemas, database
from typing import List
from routers.auth import get_current_user
from datetime import datetime
from fastapi import HTTPException


from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import SecretStr


def merge_submission(submissions) :
    result = []
    for i, s in enumerate(submissions) :
        result += f"""
------------------------------------
{i} student example :
{s} 

        """

    return result


router = APIRouter(prefix="/analysis", tags=["analysis"])
@router.get("/")
async def get_analysis_result(
    student_id: int = Query(..., description="Student ID"),
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
): 
    # 최신 분석 1개만 반환
    latest = await crud.get_latest_student_analysis(db, student_id)
    return latest

@router.post("/")
async def create_analysis_result(
    analysis_source : schemas.AnalysisCreate,
    db: AsyncSession = Depends(database.get_db),
    user=Depends(get_current_user)
    ): 
    source = analysis_source.analysis_source
    student_id = source.get('student_id')
    if not student_id:
        raise HTTPException(400, 'student_id is required in analysis_source')

    # 1. 7일 제한 체크
    # last_result = await crud.get_latest_student_analysis(db, student_id)
    # from datetime import datetime, timedelta
    # now = datetime.utcnow()
    # last_created_at = getattr(last_result, 'created_at', None) if last_result is not None else None
    # if last_created_at is not None and isinstance(last_created_at, datetime):
    #     if (now - last_created_at) < timedelta(days=7):
    #         raise HTTPException(429, detail=f"분석은 7일에 한 번만 가능합니다. (마지막 분석: {last_created_at})")

    # 2. 지난 분석 요약(압축본) 준비
    last_result = await crud.get_latest_student_analysis(db, student_id)
    last_summary = None
    last_analysis_result = getattr(last_result, 'analysis_result', None) if last_result is not None else None
    if last_analysis_result is not None and isinstance(last_analysis_result, dict):
        last_summary = last_analysis_result.get('overall') or str(last_analysis_result)
    else:
        last_summary = "이전 분석 없음"

    # 3. 최신 제출물 3개 추출
    latest_submissions = await crud.get_latest_student_submissions(db, student_id, n=3)

    # 4. 분석 입력 구성
    analysis_input = {
        'last_summary': last_summary,
        'submissions': latest_submissions
    }
    level = source.get('level')
    grade = source.get('grade')

    # 5. 기존 merge_submission 함수 활용
    submissions_merged = merge_submission(latest_submissions)

    llm = ChatOpenAI(
        temperature=0.2,
        model='gpt-4o',
        verbose=False
    )

    # 기존 프롬프트들 그대로 사용, 단 submissions=submissions_merged, last_summary 추가
    grammar_analysis_prompt = ChatPromptTemplate.from_messages([
        ("system", """
## Role:
You are a Korean teaching assistant specializing in grammar analysis.
## Task:
- Answer in KOREAN.
- Provide a comprehensive analysis of the student's grammar based on the submissions and the last_summary.
- Focus on the following two aspects:
  1. Overall strengths in grammar usage.
  2. Main areas for improvement in grammar.
- Summarize your analysis clearly and concisely, using specific examples if relevant.
## Format:
Please answer in the following format:
### 1. [장점을 한 개의 제목으로]
- 내용
### 2. [아쉬운 부분을 한 개의 제목으로]
- 내용
    """),
        ("human",  """
Analyze the student's grammar competence based on the following information:
## Student Grade
{level} - {grade} grade
## Last Analysis Summary
{last_summary}
## Student submissions
{submissions}
    """)
    ])
    # spelling, sentence, structure, vocab 프롬프트도 동일하게 last_summary 추가
    spelling_analysis_prompt = ChatPromptTemplate.from_messages([
        ("system", """
## Role:
You are a Korean teaching assistant specializing in spelling and punctuation analysis.
## Task:
- Answer in KOREAN.
- Provide a comprehensive analysis of the student's spelling and punctuation based on the submissions and the last_summary.
- Focus on the following two aspects:
  1. Overall strengths in spelling and punctuation.
  2. Main spelling and punctuation issues.
- Summarize your analysis clearly and concisely, using specific examples if relevant.
## Format:
Please answer in the following format:
### 1. [장점을 한 개의 제목으로]
- 내용
### 2. [아쉬운 부분을 한 개의 제목으로]
- 내용
    """),
        ("human",  """
Analyze the student's spelling and punctuation competence based on the following information:
## Student Grade
{level} - {grade} grade
## Last Analysis Summary
{last_summary}
## Student submissions
{submissions}
    """)
    ])
    sentence_analysis_prompt = ChatPromptTemplate.from_messages([
        ("system", """
## Role:
You are a Korean teaching assistant specializing in sentence construction and syntax analysis.
## Task:
- Answer in KOREAN.
- Provide a comprehensive analysis of the student's sentence construction based on the submissions and the last_summary.
- Focus on the following two aspects:
  1. Overall strengths in sentence construction.
  2. Main sentence construction issues.
- Summarize your analysis clearly and concisely, using specific examples if relevant.
## Format:
Please answer in the following format:
### 1. [장점을 한 개의 제목으로]
- 내용
### 2. [아쉬운 부분을 한 개의 제목으로]
- 내용
    """),
        ("human",  """
Analyze the student's sentence construction competence based on the following information:
## Student Grade
{level} - {grade} grade
## Last Analysis Summary
{last_summary}
## Student submissions
{submissions}
    """)
    ])
    structure_analysis_prompt = ChatPromptTemplate.from_messages([
        ("system", """
## Role:
You are a Korean teaching assistant specializing in text structure and organization analysis.
## Task:
- Answer in KOREAN.
- Provide a comprehensive analysis of the student's text structure based on the submissions and the last_summary.
- Focus on the following two aspects:
  1. Overall strengths in text structure and organization.
  2. Main areas for improvement in text structure and organization.
- Summarize your analysis clearly and concisely, using specific examples if relevant.
## Format:
Please answer in the following format:
### 1. [장점을 한 개의 제목으로]
- 내용
### 2. [아쉬운 부분을 한 개의 제목으로]
- 내용
    """),
        ("human",  """
Analyze the student's text structure competence based on the following information:
## Student Grade
{level} - {grade} grade
## Last Analysis Summary
{last_summary}
## Student submissions
{submissions}
    """)
    ])
    vocab_analysis_prompt = ChatPromptTemplate.from_messages([
        ("system", """
## Role:
You are a Korean teaching assistant specializing in vocabulary usage and word-choice evaluation.
## Task:
- Answer in KOREAN.
- Provide a comprehensive analysis of the student's vocabulary usage based on the submissions and the last_summary.
- Focus on the following two aspects:
  1. Overall strengths in vocabulary usage.
  2. Main areas for improvement in vocabulary usage.
- Summarize your analysis clearly and concisely, using specific examples if relevant.
## Format:
Please answer in the following format:
### 1. [장점을 한 개의 제목으로]
- 내용
### 2. [아쉬운 부분을 한 개의 제목으로]
- 내용
    """),
        ("human",  """
Analyze the student's vocabulary usage competence based on the following information:
## Student Grade
{level} - {grade} grade
## Last Analysis Summary
{last_summary}
## Student submissions
{submissions}
    """)
    ])

    # Define chains for each task
    grammar_chain = (
        grammar_analysis_prompt
        | llm
        | StrOutputParser()
    )
    spelling_chain = (
        spelling_analysis_prompt
        | llm
        | StrOutputParser()
    )
    sentence_chain = (
        sentence_analysis_prompt
        | llm
        | StrOutputParser()
    )
    structure_chain = (
        structure_analysis_prompt
        | llm
        | StrOutputParser()
    )
    vocab_chain = (
        vocab_analysis_prompt
        | llm
        | StrOutputParser()
    )
    parallel_analysis_chain = RunnableParallel(
        grammar_result=grammar_chain,
        spelling_result=spelling_chain,
        sentence_result=sentence_chain,
        structure_result= structure_chain,
        vocab_result= vocab_chain
    )
    # Execute all chains in parallel with their respective inputs
    results = await parallel_analysis_chain.ainvoke({
        "level" : level,
        "grade" : grade,
        "submissions" : submissions_merged,
        "last_summary": last_summary
    })
    # Generate comprehensive analysis
    comprehensive_prompt = ChatPromptTemplate.from_messages([
        ("system", """
## Role
You are a Korean teaching assistant.
## Task
Based on the following detailed analyses of a student's writing (grammar, spelling, sentence structure, text structure, vocabulary), synthesize the information to provide a comprehensive overall analysis in Korean. Clearly identify the student's strengths and areas for improvement, and conclude with a final summary. This evaluation is for the teacher's reference only; do not address or consider the student directly. Be specific and concise.
## Format
Write the analysis in the following three sections, each starting with a "###" heading. For each section, follow the English instruction provided (do not write the actual analysis):
### 뛰어난 점
[Summarize the most notable strengths and positive aspects observed in the student's writing.]
### 아쉬운 점
[Describe the main weaknesses, areas for improvement, or points that require attention in the student's writing.]
### 총평
[Based on the overall evaluation, specify which aspects the student should focus on and recommend effective learning strategies.]
        """),
        ("human", """
# Grammar Analysis
{grammar_result}
# Spelling Analysis
{spelling_result}
# Sentence Structure Analysis
{sentence_result}
# Text Structure Analysis
{structure_result}
# Vocabulary Analysis
{vocab_result}
        """)
    ])
    comprehensive_chain = (
        comprehensive_prompt 
        | llm 
        | StrOutputParser()
    )
    comprehensive_result = await comprehensive_chain.ainvoke({
        "grammar_result": results["grammar_result"],
        "spelling_result": results["spelling_result"],
        "sentence_result": results["sentence_result"],
        "structure_result": results["structure_result"],
        "vocab_result": results["vocab_result"]
    })
    comprehensive_results = comprehensive_result.split("###")
    comp_dict = {
        "strength" : comprehensive_results[1].replace("뛰어난 점", ""),
        "weakness" : comprehensive_results[2].replace("아쉬운 점", ""),
        "overall" : comprehensive_results[3].replace("총평", "")
        }
    results["comprehensive_result"] = comp_dict
    # 6. DB 저장
    await crud.create_student_analysis_result(db, student_id, analysis_input, results)
    return results