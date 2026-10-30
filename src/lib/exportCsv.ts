import { FIELDS, type Filters, type SiteRow } from "./types";
import { buildIndex, scopeRows, siteMetrics } from "./metrics";
import { NA, plain1 } from "./format";

export const EXPORT_COMPUTED_HEADERS = ["기성률(%)", "공정차이(pp)", "상태", "당월기성액(백만원)"];

function cell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 지금 고른 월·지역·유형·현장 범위의 행만 CSV 문자열로 만든다 (UTF-8 BOM, 줄 끝 \r\n) */
export function buildCsv(rows: SiteRow[], filters: Filters): { text: string; dataRows: number } {
  const index = buildIndex(rows);
  const inScope = scopeRows(rows, filters);
  const lines: string[] = [[...FIELDS, ...EXPORT_COMPUTED_HEADERS].map(cell).join(",")];
  for (const row of inScope) {
    const m = siteMetrics(row, index);
    const values = [
      ...FIELDS.map((f) => row.raw[f]),
      plain1(m.rate),
      plain1(m.gap),
      m.status,
      m.monthlyEarned === null ? NA : plain1(m.monthlyEarned),
    ];
    lines.push(values.map(cell).join(","));
  }
  return { text: "﻿" + lines.join("\r\n") + "\r\n", dataRows: inScope.length };
}

export function csvFileName(f: Filters): string {
  const parts = [f.month, f.region === "all" ? "전체지역" : f.region, f.projectType === "all" ? "전체유형" : f.projectType];
  if (f.siteId !== "all") parts.push(`현장${f.siteId}`);
  return `현장공정기성_${parts.join("_")}.csv`;
}
