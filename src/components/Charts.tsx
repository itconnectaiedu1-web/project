"use client";

import { useState } from "react";
import { fmtNum, fmtPct, fmtPp, NA } from "@/lib/format";
import type { Aggregate } from "@/lib/types";
import { Card } from "./Common";

interface Point {
  month: string;
  agg: Aggregate;
}

const W = 640;
const H = 280;
const L = 48;
const R = 16;
const T = 16;
const B = 32;
const PW = W - L - R;
const PH = H - T - B;

const shortMonth = (m: string) => `${m.slice(2, 4)}.${m.slice(5)}`;

/** 1·2·5 × 10^n 꼴의 보기 좋은 눈금 간격 */
function niceStep(x: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function slotX(i: number, n: number) {
  return L + (n <= 1 ? PW / 2 : (PW * (i + 0.5)) / n);
}

/** 선택 월까지의 계획·실제 누적 공정률 선 그래프 */
export function TrendChart({ points, allMonths }: { points: Point[]; allMonths: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = allMonths.length;
  const y = (v: number) => T + PH - (PH * v) / 100;
  const idxOf = (m: string) => allMonths.indexOf(m);

  const line = (pick: (a: Aggregate) => number | null) => {
    let d = "";
    let pen = false;
    for (const p of points) {
      const v = pick(p.agg);
      if (v === null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${slotX(idxOf(p.month), n).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    }
    return d.trim();
  };

  const shown = points.filter((p) => p.agg.siteCount > 0);
  const focus = hover !== null ? points[hover] : points[points.length - 1];
  const missing = points.some((p) => p.agg.siteCount === 0);
  const last = points[points.length - 1];

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">월별 누적 공정률 추이</h2>
        <span className="num text-xs text-slate-500">
          {allMonths[0]} ~ {last?.month ?? ""}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="#64748b" strokeWidth="2" strokeDasharray="4 3" /></svg>
          계획
        </span>
        <span className="flex items-center gap-1">
          <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="#2563eb" strokeWidth="3" /></svg>
          실제
        </span>
      </div>

      <div className="mt-2 min-h-[2.5rem] rounded bg-slate-50 px-3 py-2 text-sm" data-testid="trend-info" aria-live="polite">
        {focus && focus.agg.siteCount > 0 ? (
          <span className="num">
            <b>{focus.month}</b> · 계획 {fmtPct(focus.agg.planned)} · 실제 {fmtPct(focus.agg.actual)} · 공정차이 {fmtPp(focus.agg.gap)}
          </span>
        ) : (
          <span className="text-slate-500">{focus ? `${focus.month} · 자료 없음` : "자료 없음"}</span>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="mt-3 rounded border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">자료 없음</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="월별 누적 계획·실제 공정률 선 그래프" data-testid="trend-chart" data-points={shown.length}>
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e2e8f0" />
              <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#64748b">{g}%</text>
            </g>
          ))}
          {allMonths.map((m, i) => (
            <text key={m} x={slotX(i, n)} y={H - 10} textAnchor="middle" fontSize="11" fill={i <= idxOf(last?.month ?? "") ? "#475569" : "#cbd5e1"}>
              {shortMonth(m)}
            </text>
          ))}
          <path d={line((a) => a.planned)} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="5 4" />
          <path d={line((a) => a.actual)} fill="none" stroke="#2563eb" strokeWidth="3" />
          {points.map((p, i) =>
            p.agg.actual === null ? null : (
              <circle key={p.month} cx={slotX(idxOf(p.month), n)} cy={y(p.agg.actual)} r={hover === i ? 5 : 3} fill="#2563eb" />
            ),
          )}
          {points.map((p, i) => (
            <rect
              key={`h${p.month}`}
              x={slotX(idxOf(p.month), n) - PW / n / 2}
              y={T}
              width={PW / n}
              height={PH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
      )}
      {missing && <p className="mt-2 text-xs text-amber-700">선택한 범위에 자료가 없는 월이 있습니다.</p>}
      <p className="mt-1 text-xs text-slate-500">매월 말 누적 기준 · 선택한 월까지만 표시합니다.</p>
    </Card>
  );
}

/** 월별 기성: 막대 전체 = 그 월 누적기성액, 진한 윗부분 = 당월기성액, 옅은 아랫부분 = 전월까지 누적 */
export function MonthlyBars({ points, allMonths }: { points: Point[]; allMonths: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = allMonths.length;
  const shown = points.filter((p) => p.agg.siteCount > 0);
  const rawMax = Math.max(1, ...shown.map((p) => p.agg.earned ?? 0));
  const step = niceStep(rawMax / 4);
  const maxV = Math.ceil((rawMax * 1.02) / step) * step;
  const y = (v: number) => T + PH - (PH * v) / maxV;
  const idxOf = (m: string) => allMonths.indexOf(m);
  const bw = Math.min(34, (PW / n) * 0.62);
  const focus = hover !== null ? points[hover] : points[points.length - 1];
  const last = points[points.length - 1];
  const ticks = Array.from({ length: Math.round(maxV / step) + 1 }, (_, i) => i * step);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">월별 기성액 집계</h2>
        <span className="text-xs text-slate-500">단위: 백만원</span>
      </div>
      <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-100" aria-hidden /> 전월까지 누적
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-700" aria-hidden /> 당월기성액
        </span>
      </div>

      <div className="mt-2 min-h-[2.5rem] rounded bg-slate-50 px-3 py-2 text-sm" data-testid="bars-info" aria-live="polite">
        {focus && focus.agg.siteCount > 0 ? (
          <span className="num">
            <b>{focus.month}</b> · 누적기성액 {fmtNum(focus.agg.earned)} · 당월기성액{" "}
            <b className="text-blue-700">{focus.agg.monthlyEarned === null ? NA : fmtNum(focus.agg.monthlyEarned)}</b>
          </span>
        ) : (
          <span className="text-slate-500">{focus ? `${focus.month} · 자료 없음` : "자료 없음"}</span>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="mt-3 rounded border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">자료 없음</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="월별 누적기성액과 당월기성액 막대 그래프" data-testid="bars-chart" data-bars={shown.length}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                {t >= 1000 ? `${Math.round(t / 1000)}k` : Math.round(t)}
              </text>
            </g>
          ))}
          {allMonths.map((m, i) => (
            <text key={m} x={slotX(i, n)} y={H - 10} textAnchor="middle" fontSize="11" fill={i <= idxOf(last?.month ?? "") ? "#475569" : "#cbd5e1"}>
              {shortMonth(m)}
              {i === 0 ? "*" : ""}
            </text>
          ))}
          {points.map((p, i) => {
            if (p.agg.siteCount === 0 || p.agg.earned === null) return null;
            const cx = slotX(idxOf(p.month), n);
            const total = p.agg.earned;
            const monthly = p.agg.monthlyEarned;
            const prev = monthly === null ? total : (p.agg.prevEarned ?? total);
            const active = hover === i;
            return (
              <g key={p.month} data-month={p.month}>
                <rect x={cx - bw / 2} y={y(prev)} width={bw} height={Math.max(0, y(0) - y(prev))} fill={active ? "#bfdbfe" : "#dbeafe"} />
                {monthly !== null && (
                  <rect
                    x={cx - bw / 2}
                    y={y(total)}
                    width={bw}
                    height={Math.max(monthly === 0 ? 0 : 1, y(prev) - y(total))}
                    fill="#1d4ed8"
                  />
                )}
                {monthly === 0 && <line x1={cx - bw / 2} x2={cx + bw / 2} y1={y(total)} y2={y(total)} stroke="#1d4ed8" strokeWidth="2" />}
                <rect x={cx - PW / n / 2} y={T} width={PW / n} height={PH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            );
          })}
        </svg>
      )}
      <p className="mt-1 text-xs text-slate-500">
        * 첫 달(2025-10)은 전월 자료가 없어 당월기성액을 계산할 수 없습니다. 누적기성액을 당월액으로 대신하지 않습니다.
      </p>
    </Card>
  );
}
