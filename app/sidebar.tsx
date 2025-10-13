"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useRouter } from "next/navigation";

const navItems: { href: string; label: string }[] = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/classes", label: "학급 및 학생 관리" },
  { href: "/assignment", label: "글쓰기 과제" },
  { href: "/evaluation", label: "글쓰기 평가" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-56 min-h-screen bg-gray-100 border-r flex flex-col py-8 px-4">
      <div className="flex justify-center mb-8">
        <Image src="/logo_.png" alt="로고" width={48} height={48} />
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-blue-600 text-white"
                : "hover:bg-blue-100 text-gray-800"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
} 