"use client";

import { Fragment, useEffect } from "react";
import { fmtNum, fmtPct, fmtPp, NA } from "@/lib/format";
import { useApp } from "@/state/AppState";
import type { Aggregate, SiteMetrics } from "@/lib/types";
import { Card, StatusBadge } from "./Common";

const GAP_COLOR = { 정상: "text-slate-800", 주의: "text-amber-700", 점검: "text-red-700" } as const;

function Detail({ m }: { m: SiteMetrics }) {
  const r = m.row;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4" data-testid={`detail-${r.siteId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {r.siteName} — 기록 확인 <span className="ml-1 text-xs font-normal text-slate-500">({r.month})</span>
          </h3>
          <p className="num mt-1 text-sm text-slate-600">
            공사기간 {r.startDate} ~ {r.contractEndDate} <span className="text-xs text-slate-500">(계약상 준공일, 예정 일정)</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="rounded bg-slate-50 px-3 py-1.5 text-right">
            <div className="text-xs text-slate-500">계약금액</div>
            <div className="num font-bold">{fmtNum(r.contractAmount)} 백만원</div>
          </div>
          <div className="rounded bg-slate-50 px-3 py-1.5 text-right">
            <div className="text-xs text-slate-500">누적기성액</div>
            <div className="num font-bold">{fmtNum(r.cumulativeEarned)} 백만원</div>
          </div>
          <div className="rounded bg-blue-50 px-3 py-1.5 text-right">
            <div className="text-xs text-blue-700">당월기성액</div>
            <div className="num font-bold text-blue-800">{m.monthlyEarned === null ? NA : `${fmtNum(m.monthlyEarned)} 백만원`}</div>
          </div>
          <div className="rounded bg-slate-50 px-3 py-1.5 text-right">
            <div className="text-xs text-slate-500">공정차이</div>
            <div className={`num font-bold ${GAP_COLOR[m.status]}`}>{fmtPp(m.gap)}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-500">
            기록된 상황 <span className="ml-1 rounded bg-white px-1.5 py-0.5 font-normal">특이사항 분류: {r.issueCategory}</span>
          </div>
          <p className="mt-1 text-sm text-slate-800">{r.issueSummary}</p>
          <p className="mt-2 text-xs text-slate-500">당월 주요 공종: {r.currentWork}</p>
        </div>
        <div className="rounded border border-blue-100 bg-blue-50/50 p-3">
          <div className="text-xs font-bold text-blue-700">기록된 대응 계획</div>
          <p className="mt-1 text-sm text-slate-800">{r.actionPlan}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        현장 보고 기록이며 완료 사실이나 원인 확정이 아닙니다. 계약상 준공일은 예정일이고 실제 완료일이 아닙니다. 실제 완료일과 미수금은 이 자료에 없습니다. 누적기성액은 수금액이 아닙니다.
      </p>
    </div>
  );
}

export function CompareTable({ table, agg }: { table: SiteMetrics[]; agg: Aggregate }) {
  const { highlightSiteId, expanded, toggleExpanded } = useApp();

  useEffect(() => {
    if (!highlightSiteId) return;
    const el = document.querySelector(`[data-row="${highlightSiteId}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightSiteId, table.length]);

  const total = table.length;
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">현장별 비교표</h2>
          <p className="text-xs text-slate-500">공정차이가 작은 순(같으면 현장 ID 순) · 행을 누르면 기록이 펼쳐집니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="compare-counts">
          <span className="text-slate-500">전체 현장 {total}곳</span>
          <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-red-700">점검 {agg.counts.점검}곳</span>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-700">주의 {agg.counts.주의}곳</span>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">정상 {agg.counts.정상}곳</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm" data-testid="compare-table">
          <thead>
            <tr className="bg-slate-100 text-xs font-bold text-slate-600">
              <th className="px-3 py-2 text-left">NO</th>
              <th className="px-3 py-2 text-left">현장</th>
              <th className="px-3 py-2 text-left">지역</th>
              <th className="px-3 py-2 text-left">공사 유형</th>
              <th className="px-3 py-2 text-left">당월 주요 공종</th>
              <th className="px-3 py-2 text-right">계약금액<br />(백만원)</th>
              <th className="px-3 py-2 text-right">누적기성액<br />(백만원)</th>
              <th className="px-3 py-2 text-right">기성률</th>
              <th className="px-3 py-2 text-right">계획공정률</th>
              <th className="px-3 py-2 text-right">실제공정률</th>
              <th className="px-3 py-2 text-right">공정차이</th>
              <th className="px-3 py-2 text-center">상태</th>
              <th className="px-3 py-2 text-center">기록</th>
            </tr>
          </thead>
          <tbody>
            {table.map((m, i) => {
              const r = m.row;
              const open = expanded.has(r.siteId);
              const hl = highlightSiteId === r.siteId;
              return (
                <Fragment key={r.siteId}>
                  <tr
                    data-row={r.siteId}
                    data-highlight={hl ? "true" : undefined}
                    onClick={() => toggleExpanded(r.siteId)}
                    className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${hl ? "bg-blue-50 outline outline-2 -outline-offset-2 outline-blue-500" : ""}`}
                  >
                    <td className="num px-3 py-2 text-slate-500">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">{r.siteId}</span>
                        <span className="font-semibold text-slate-900">{r.siteName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.region}</td>
                    <td className="px-3 py-2">{r.projectType}</td>
                    <td className="px-3 py-2">{r.currentWork}</td>
                    <td className="num px-3 py-2 text-right">{fmtNum(r.contractAmount)}</td>
                    <td className="num px-3 py-2 text-right">{fmtNum(r.cumulativeEarned)}</td>
                    <td className="num px-3 py-2 text-right font-bold text-blue-700">{fmtPct(m.rate)}</td>
                    <td className="num px-3 py-2 text-right">{fmtPct(r.plannedProgress)}</td>
                    <td className="num px-3 py-2 text-right">{fmtPct(r.actualProgress)}</td>
                    <td className={`num px-3 py-2 text-right font-bold ${GAP_COLOR[m.status]}`}>{fmtPp(m.gap)}</td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`${r.siteId} 기록 ${open ? "접기" : "펼치기"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(r.siteId);
                        }}
                        className="rounded px-2 py-1 text-slate-600 hover:bg-slate-200"
                      >
                        <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
                          ▾
                        </span>
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td colSpan={13} className="px-3 py-3">
                        <Detail m={m} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 font-bold text-slate-900" data-testid="compare-total">
              <td className="px-3 py-3" colSpan={5}>
                합계 및 가중 평균 ({agg.siteCount}개 현장)
              </td>
              <td className="num px-3 py-3 text-right">{fmtNum(agg.contract)}</td>
              <td className="num px-3 py-3 text-right text-blue-700">{fmtNum(agg.earned)}</td>
              <td className="num px-3 py-3 text-right">{fmtPct(agg.rate)}</td>
              <td className="num px-3 py-3 text-right">{fmtPct(agg.planned)}</td>
              <td className="num px-3 py-3 text-right">{fmtPct(agg.actual)}</td>
              <td className="num px-3 py-3 text-right">{fmtPp(agg.gap)}</td>
              <td className="px-3 py-3 text-center text-xs" colSpan={2}>
                정상 {agg.counts.정상} · 주의 {agg.counts.주의} · 점검 {agg.counts.점검}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="grid gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 md:grid-cols-3">
        <p>기성률(%) = 누적기성액 ÷ 계약금액 × 100 (금액 기준)</p>
        <p>공정차이 = 실제공정률 − 계획공정률. -5.0pp 이하 점검, 0pp 미만 주의, 0pp 이상 정상</p>
        <p>이 상태 판정은 교육용 규칙이며 공식 관리 기준이 아닙니다.</p>
      </div>
    </Card>
  );
}
