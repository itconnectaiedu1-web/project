import { sitesInScope, monthOptions } from "./filters";
import type { Aggregate, Filters, SiteMetrics, SiteRow, Status } from "./types";

const EPS = 1e-9;

export type RowIndex = Map<string, SiteRow>;

export function buildIndex(rows: SiteRow[]): RowIndex {
  const idx: RowIndex = new Map();
  for (const r of rows) idx.set(`${r.month}/${r.siteId}`, r);
  return idx;
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** 공정차이(pp)로만 판정한다. 0 이상 정상, -5 초과 0 미만 주의, -5 이하 점검 */
export function statusOf(gap: number): Status {
  if (gap >= -EPS) return "정상";
  if (gap <= -5 + EPS) return "점검";
  return "주의";
}

/** 전월 행이 있을 때만 당월기성액을 계산한다. 없으면 null (0이나 누적액으로 대신하지 않음) */
export function monthlyEarnedOf(row: SiteRow, index: RowIndex): number | null {
  const prev = index.get(`${prevMonth(row.month)}/${row.siteId}`);
  return prev ? row.cumulativeEarned - prev.cumulativeEarned : null;
}

export function siteMetrics(row: SiteRow, index: RowIndex): SiteMetrics {
  const gap = row.actualProgress - row.plannedProgress;
  return {
    row,
    rate: (row.cumulativeEarned / row.contractAmount) * 100,
    gap,
    status: statusOf(gap),
    monthlyEarned: monthlyEarnedOf(row, index),
  };
}

/** 선택 범위(지역·유형·현장)에 해당하는 한 달치 원본 행 (현장 ID 순) */
export function scopeRows(rows: SiteRow[], filters: Filters, month: string = filters.month): SiteRow[] {
  const ids = new Set(sitesInScope(rows, filters).map((s) => s.siteId));
  return rows
    .filter((r) => r.month === month && ids.has(r.siteId))
    .sort((a, b) => a.siteId.localeCompare(b.siteId));
}

const EMPTY_COUNTS: Record<Status, number> = { 정상: 0, 주의: 0, 점검: 0 };

export function emptyAggregate(): Aggregate {
  return {
    siteCount: 0,
    contract: null,
    earned: null,
    rate: null,
    planned: null,
    actual: null,
    gap: null,
    monthlyEarned: null,
    prevEarned: null,
    counts: { ...EMPTY_COUNTS },
  };
}

/** 한 달·한 범위의 합계 지표. 계약금액으로 가중평균한다. */
export function aggregate(rows: SiteRow[], filters: Filters, month: string, index: RowIndex): Aggregate {
  const cur = scopeRows(rows, filters, month);
  if (cur.length === 0) return emptyAggregate();

  const contract = cur.reduce((s, r) => s + r.contractAmount, 0);
  const earned = cur.reduce((s, r) => s + r.cumulativeEarned, 0);
  const counts = { ...EMPTY_COUNTS };
  for (const r of cur) counts[statusOf(r.actualProgress - r.plannedProgress)]++;

  const hasContract = contract > 0;
  const planned = hasContract ? cur.reduce((s, r) => s + r.contractAmount * r.plannedProgress, 0) / contract : null;
  const actual = hasContract ? cur.reduce((s, r) => s + r.contractAmount * r.actualProgress, 0) / contract : null;

  // 범위의 모든 현장에 이번 달과 바로 전월 값이 있을 때만 당월기성액을 합산한다.
  const scopeIds = sitesInScope(rows, filters).map((s) => s.siteId);
  let monthly: number | null = 0;
  let prevSum: number | null = 0;
  for (const id of scopeIds) {
    const c = index.get(`${month}/${id}`);
    const p = index.get(`${prevMonth(month)}/${id}`);
    if (!c || !p) {
      monthly = null;
      prevSum = null;
      break;
    }
    monthly! += c.cumulativeEarned - p.cumulativeEarned;
    prevSum! += p.cumulativeEarned;
  }

  return {
    siteCount: cur.length,
    contract,
    earned,
    rate: hasContract ? (earned / contract) * 100 : null,
    planned,
    actual,
    gap: planned !== null && actual !== null ? actual - planned : null,
    monthlyEarned: monthly,
    prevEarned: prevSum,
    counts,
  };
}

/** 자료의 첫 달부터 선택 월까지, 매월 따로 집계한 추이 */
export function trend(rows: SiteRow[], filters: Filters, index: RowIndex): { month: string; agg: Aggregate }[] {
  return monthOptions(rows)
    .filter((m) => m <= filters.month)
    .map((month) => ({ month, agg: aggregate(rows, filters, month, index) }));
}

/** 비교표: 공정차이 작은 순, 같으면 현장 ID 순 */
export function siteTable(rows: SiteRow[], filters: Filters, index: RowIndex): SiteMetrics[] {
  return scopeRows(rows, filters)
    .map((r) => siteMetrics(r, index))
    .sort((a, b) => {
      const d = a.gap - b.gap;
      if (Math.abs(d) > EPS) return d;
      return a.row.siteId.localeCompare(b.row.siteId);
    });
}

export function inspectionList(table: SiteMetrics[]): SiteMetrics[] {
  return table.filter((m) => m.status === "점검");
}
