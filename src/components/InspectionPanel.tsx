"use client";

import { useRouter } from "next/navigation";
import { fmtPct, fmtPp } from "@/lib/format";
import { useApp } from "@/state/AppState";
import type { Aggregate, SiteMetrics } from "@/lib/types";
import { Card, StatusBadge } from "./Common";

export function InspectionPanel({ agg, inspection }: { agg: Aggregate; inspection: SiteMetrics[] }) {
  const router = useRouter();
  const { openSite } = useApp();

  function go(siteId: string) {
    openSite(siteId);
    router.push("/compare");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-bold text-slate-900">집중 점검 대상 현장 순위</h2>
          <span className="text-xs text-slate-500">공정차이 -5.0pp 이하 · 차이가 큰 순</span>
        </div>
        {agg.siteCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="status-counts">
            <span className="text-slate-500">현장 상태</span>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">정상 {agg.counts.정상}곳</span>
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-700">주의 {agg.counts.주의}곳</span>
            <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-red-700">점검 {agg.counts.점검}곳</span>
          </div>
        )}
      </div>

      {agg.siteCount === 0 ? (
        <p className="mt-4 rounded border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600" data-testid="inspection-nodata">
          선택한 범위에 자료가 없습니다.
        </p>
      ) : inspection.length === 0 ? (
        <div className="mt-4 rounded border border-dashed border-emerald-300 bg-emerald-50/50 p-5 text-center" data-testid="inspection-empty">
          <div className="text-base font-bold text-emerald-800">점검 대상 없음</div>
          <p className="mt-1 text-sm text-slate-600">
            선택한 범위에는 점검이 필요한 현장이 없습니다.{agg.counts.주의 > 0 ? ` 주의 ${agg.counts.주의}곳은 비교표에서 확인할 수 있습니다.` : ""}
          </p>
        </div>
      ) : (
        <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="inspection-list">
          {inspection.map((m, i) => (
            <li key={m.row.siteId}>
              <button
                type="button"
                onClick={() => go(m.row.siteId)}
                data-testid={`inspection-${m.row.siteId}`}
                className="block w-full rounded-lg border border-red-200 bg-white p-4 text-left hover:border-red-400 hover:bg-red-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-sm font-bold text-white">{i + 1}</span>
                    <div>
                      <div className="text-xs text-slate-500">현장 {m.row.siteId}</div>
                      <div className="text-base font-bold text-slate-900">{m.row.siteName.replace("[가상] ", "")}</div>
                    </div>
                  </div>
                  <StatusBadge status="점검">
                    <span className="num ml-1">({fmtPp(m.gap)})</span>
                  </StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-3 rounded bg-slate-50 py-2 text-center">
                  <div>
                    <div className="text-xs text-slate-500">계획</div>
                    <div className="num text-base font-bold">{fmtPct(m.row.plannedProgress)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">실제</div>
                    <div className="num text-base font-bold">{fmtPct(m.row.actualProgress)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">기성률</div>
                    <div className="num text-base font-bold text-blue-700">{fmtPct(m.rate)}</div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                  <span className="font-bold">기록된 상황 · </span>
                  {m.row.issueSummary}
                </p>
                <div className="mt-3 text-center text-sm font-bold text-blue-700">비교표에서 세부내역 확인 →</div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
