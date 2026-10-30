"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Status } from "@/lib/types";

const STATUS_STYLE: Record<Status, string> = {
  정상: "border-emerald-200 bg-emerald-50 text-emerald-700",
  주의: "border-amber-200 bg-amber-50 text-amber-700",
  점검: "border-red-200 bg-red-50 text-red-700",
};
const STATUS_DOT: Record<Status, string> = { 정상: "bg-emerald-600", 주의: "bg-amber-600", 점검: "bg-red-600" };

/** 색과 글자를 함께 써서 구분한다 */
export function StatusBadge({ status, children }: { status: Status; children?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[status]}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
      {status}
      {children}
    </span>
  );
}

export function NoData() {
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center" data-testid="no-data">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded border-2 border-slate-300 text-2xl text-slate-400" aria-hidden>
        ▦
      </div>
      <h2 className="text-lg font-bold text-slate-900">아직 가져온 자료가 없습니다</h2>
      <p className="mt-2 text-sm text-slate-600">새로고침하면 파일을 다시 가져와야 합니다. 자료는 저장되지 않습니다.</p>
      <Link
        href="/import"
        className="mt-5 inline-block rounded bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
      >
        자료 가져오기
      </Link>
    </div>
  );
}

export function EmptyScope() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center" data-testid="empty-scope">
      <div className="text-base font-bold text-slate-800">선택한 범위에 자료가 없습니다</div>
      <p className="mt-1 text-sm text-slate-600">지역·공사 유형·현장 조건을 바꿔 보세요. 숫자는 0이 아니라 “계산 불가”로 표시합니다.</p>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}
