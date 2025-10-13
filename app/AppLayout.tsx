"use client";
import Sidebar from "./sidebar";
import { usePathname, useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";
import Modal from "./components/Modal";

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const router = useRouter();
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      router.push('/account/login');
    }
  };
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold shadow transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" /></svg>
        계정관리
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <button
            onClick={() => { setShowProfileModal(true); setOpen(false); }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-800"
          >
            정보수정
          </button>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
          >
            로그아웃
          </button>
        </div>
      )}
      <Modal open={showProfileModal} onClose={() => setShowProfileModal(false)} className="max-w-md">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">정보수정 (더미)</h2>
          <p className="text-gray-600">여기에 정보수정 폼이 들어갈 예정입니다.</p>
          <button onClick={() => setShowProfileModal(false)} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg shadow">닫기</button>
        </div>
      </Modal>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // 로그인, 회원가입, 약관/정책 화면에서는 사이드바/메인 레이아웃 없이 children만 렌더링
  if (["/account/login", "/account/signup", "/account/privacy-policy", "/account/terms-of-service"].includes(pathname)
    || pathname.startsWith("/e_dist")
    || pathname.startsWith("/a_dist")
  ) {
    return (
      <>
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </>
    );
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 relative">
        <div className="absolute top-0 right-0 p-6 z-40">
          <AccountMenu />
        </div>
        <div>{children}</div>
      </main>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
} 