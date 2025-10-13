'use client';
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup } from "../../lib/api";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("")
  const [schoolLevel, setSchoolLevel] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
  
    if (!email || !password || !name) {
      setError("이메일과 비밀번호를 입력하세요.");
      toast.error("이메일, 비밀번호, 이름을 모두 입력하세요.");
      return;
    }
    if (!schoolLevel) {
      setError("학교급을 선택하세요.");
      toast.error("학교급을 선택하세요.");
      return;
    }
  
    try {
      await signup({ 
        email : email, 
        password : password, 
        name : name, 
        school_level :schoolLevel 
      });
      toast.success("회원가입이 완료되었습니다.");
      setTimeout(() => router.push("/account/login"), 1200);
    } catch (err) {
      if (err?.response?.data?.detail) setError(err.response.data.detail);
      else setError("회원가입에 실패했습니다.");
      toast.error(err?.response?.data?.detail || "회원가입에 실패했습니다.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
      <ToastContainer position="top-center" autoClose={2000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 shadow-2xl rounded-2xl px-10 pt-10 pb-8 w-full max-w-md flex flex-col gap-5 border border-gray-100"
      >
        <h1 className="text-3xl font-extrabold text-center mb-2 text-blue-700 tracking-tight drop-shadow-sm">회원가입</h1>
        <p className="text-center text-gray-500 mb-4">이메일로 간편하게 시작하세요</p>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg transition"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg transition"
        />
        <input
          placeholder="이름"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg transition"
        />
        {/* 학교급 선택 */}
        <select
          value={schoolLevel}
          onChange={e => setSchoolLevel(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg transition"
          required
        >
          <option value="" disabled>학교급 선택</option>
          <option value="초등학교">초등학교</option>
          <option value="중학교">중학교</option>
          <option value="고등학교">고등학교</option>
        </select>
        <div className="flex flex-col gap-2">
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={e => setAgreeTerms(e.target.checked)}
              className="mr-2 accent-blue-600"
            />
            [필수] 서비스 이용 약관
            <Link href="/terms-of-service" target="_blank" className="ml-2 text-blue-500 underline text-xs">[보기]</Link>
          </label>
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={e => setAgreePrivacy(e.target.checked)}
              className="mr-2 accent-blue-600"
            />
            [필수] 개인정보 처리방침
            <Link href="/privacy-policy" target="_blank" className="ml-2 text-blue-500 underline text-xs">[보기]</Link>
          </label>
        </div>
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        <button
          type="submit"
          disabled={!(agreeTerms && agreePrivacy)}
          className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-lg py-3 font-bold text-lg shadow hover:from-blue-700 hover:to-indigo-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          회원가입
        </button>
        <div className="text-center mt-4">
          <Link href="/account/login" className="text-blue-600 hover:underline text-sm">이미 계정이 있으신가요? 로그인</Link>
        </div>
      </form>
    </div>
  );
} 