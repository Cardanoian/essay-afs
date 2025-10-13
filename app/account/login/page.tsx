"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login as loginApi } from "../../lib/api";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
      const token = localStorage.getItem("token");
      if (token) {
        router.push("/dashboard");
      }
    }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi(email, password);
      localStorage.setItem("token", res.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 shadow-2xl rounded-2xl px-10 pt-10 pb-8 w-full max-w-md flex flex-col gap-5 border border-gray-100"
      >
        <div className="flex justify-center mb-2">
          <Image src="/logo_.png" alt="로고" width={80} height={80} />
        </div>
        <p className="text-center text-gray-500 mb-4">교사용 글쓰기 과제 관리 서비스</p>
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
        {error && (
          <div className="text-red-500 text-sm text-center">
            {Array.isArray(error)
              ? error.map((e, i) => <div key={i}>{e.msg || JSON.stringify(e)}</div>)
              : typeof error === "object"
                ? JSON.stringify(error)
                : error}
          </div>
        )}
        <button
          type="submit"
          className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-lg py-3 font-bold text-lg shadow hover:from-blue-700 hover:to-indigo-600 transition flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          ) : null}
          {loading ? "로그인 중..." : "로그인"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/account/signup")}
          className="w-full mt-2 py-3 rounded-lg border border-blue-400 text-blue-700 font-semibold bg-white hover:bg-blue-50 transition"
        >
          회원가입
        </button>
      </form>
    </div>
  );
} 