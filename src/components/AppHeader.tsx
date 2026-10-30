"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/state/AppState";
import { buildCsv, csvFileName } from "@/lib/exportCsv";
import { scopeRows } from "@/lib/metrics";

const NAV = [
  { href: "/", label: "현황 요약" },
  { href: "/compare", label: "현장별 비교표" },
  { href: "/import", label: "자료 가져오기" },
  { href: "/ask", label: "AI 현장 진단" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { rows, filters } = useApp();
  const count = useMemo(() => (rows ? scopeRows(rows, filters).length : 0), [rows, filters]);
  const canExport = !!rows && count > 0;

  function download() {
    if (!rows || !canExport) return;
    const { text } = buildCsv(rows, filters);
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(filters);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-900 text-sm font-bold text-white">공정</div>
          <div>
            <div className="text-base font-bold leading-tight text-slate-900">현장별 공정·기성 대시보드</div>
            <div className="text-xs text-slate-500">교육용 가상 자료</div>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="주 메뉴">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded px-4 py-2 text-sm font-semibold ${
                  active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {rows && <span className="num text-xs text-slate-500">{count > 0 ? `${count}행 + 계산 4열` : "내보낼 자료가 없습니다"}</span>}
          <button
            type="button"
            onClick={download}
            disabled={!canExport}
            className="rounded border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            CSV 내보내기
          </button>
        </div>
      </div>
    </header>
  );
}
