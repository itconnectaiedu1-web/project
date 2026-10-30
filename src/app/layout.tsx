import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppStateProvider } from "@/state/AppState";
import { AppHeader } from "@/components/AppHeader";
import { FilterBar } from "@/components/FilterBar";

export const metadata: Metadata = {
  title: "현장별 공정·기성 대시보드",
  description: "교육용 가상 자료로 만든 현장별 공정·기성 현황 대시보드",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <AppStateProvider>
          <AppHeader />
          <FilterBar />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-5 lg:px-6">{children}</main>
          <footer className="mx-auto w-full max-w-[1600px] border-t border-slate-200 px-4 py-4 text-xs text-slate-500 lg:px-6">
            교육용 가상 자료입니다. 실제 회사의 계약·현장·청구 자료가 아니며, 상태 판정과 가중 공정률은 교육용 규칙입니다.
          </footer>
        </AppStateProvider>
      </body>
    </html>
  );
}
