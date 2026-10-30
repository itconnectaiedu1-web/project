"use client";

import { fmtNum, fmtPct, fmtPp, NA } from "@/lib/format";
import { statusOf } from "@/lib/metrics";
import type { Aggregate } from "@/lib/types";

const GAP_STYLE = {
  정상: "border-emerald-300 bg-emerald-50 text-emerald-700",
  주의: "border-amber-300 bg-amber-50 text-amber-700",
  점검: "border-red-300 bg-red-50 text-red-700",
} as const;

function Big({ value, unit, testId }: { value: string; unit?: string; testId: string }) {
  const na = value === NA;
  return (
    <div className="mt-2 flex items-baseline gap-1" data-testid={testId}>
      <span className={`num font-bold leading-none ${na ? "text-2xl text-slate-400" : "text-4xl text-slate-900"}`}>{value}</span>
      {!na && unit && <span className="text-lg font-bold text-slate-500">{unit}</span>}
    </div>
  );
}

/** 큰 숫자 4개: 시안 순서(공정차이 → 실제 → 계획 → 기성률) */
export function MetricCards({ agg, month }: { agg: Aggregate; month: string }) {
  const gapStatus = agg.gap === null ? null : statusOf(agg.gap);
  const gapText = agg.gap === null ? NA : fmtPp(agg.gap).replace("pp", "");

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className={`rounded-lg border-2 p-4 ${gapStatus ? GAP_STYLE[gapStatus] : "border-slate-200 bg-white text-slate-500"}`}>
        <div className="flex items-center justify-between text-sm font-bold">
          <span>전체 공정차이 (실제 − 계획)</span>
          {gapStatus && <span className="rounded bg-white/70 px-2 py-0.5 text-xs">{gapStatus}</span>}
        </div>
        <Big value={gapText} unit="pp" testId="metric-gap" />
        <div className="mt-3 border-t border-current/20 pt-2 text-xs">
          {agg.actual !== null && agg.planned !== null
            ? `실제 ${fmtPct(agg.actual)} − 계획 ${fmtPct(agg.planned)} · 점검 기준 -5.0pp`
            : "선택한 범위에 자료가 없습니다"}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-600">누적 실제 공정률</div>
        <Big value={fmtPct(agg.actual).replace("%", "")} unit="%" testId="metric-actual" />
        <div className="mt-3 h-2 rounded bg-slate-100">
          <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, agg.actual ?? 0))}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">{month} 월말 · 계약금액 가중평균</div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-600">누적 계획 공정률</div>
        <Big value={fmtPct(agg.planned).replace("%", "")} unit="%" testId="metric-planned" />
        <div className="mt-3 h-2 rounded bg-slate-100">
          <div className="h-2 rounded bg-slate-400" style={{ width: `${Math.min(100, Math.max(0, agg.planned ?? 0))}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">{month} 월말 · 계약금액 가중평균</div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-600">전체 누적 기성률 (금액 기준)</div>
        <Big value={fmtPct(agg.rate).replace("%", "")} unit="%" testId="metric-rate" />
        <dl className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
          <div className="flex justify-between">
            <dt>누적기성액</dt>
            <dd className="num font-semibold" data-testid="metric-earned">{fmtNum(agg.earned)} 백만원</dd>
          </div>
          <div className="flex justify-between">
            <dt>계약금액</dt>
            <dd className="num font-semibold" data-testid="metric-contract">{fmtNum(agg.contract)} 백만원</dd>
          </div>
          <div className="flex justify-between">
            <dt>당월기성액</dt>
            <dd className="num font-bold text-blue-700" data-testid="metric-monthly">
              {agg.monthlyEarned === null ? NA : `${fmtNum(agg.monthlyEarned)} 백만원`}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
