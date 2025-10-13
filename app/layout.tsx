import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "./AppLayout";

export const metadata: Metadata = {
  title: "온글",
  description: "교사용 글쓰기 과제 관리 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
