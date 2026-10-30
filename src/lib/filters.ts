import { ALL, DEFAULT_MONTH, PROJECT_TYPES, REGIONS, type Filters, type SiteRow } from "./types";

export function monthOptions(rows: SiteRow[]): string[] {
  return [...new Set(rows.map((r) => r.month))].sort();
}

export function regionOptions(rows: SiteRow[]): string[] {
  const present = new Set(rows.map((r) => r.region));
  return REGIONS.filter((r) => present.has(r));
}

export function typeOptions(rows: SiteRow[]): string[] {
  const present = new Set(rows.map((r) => r.projectType));
  return PROJECT_TYPES.filter((t) => present.has(t));
}

export function defaultFilters(rows: SiteRow[]): Filters {
  const months = monthOptions(rows);
  const month = months.includes(DEFAULT_MONTH) ? DEFAULT_MONTH : (months[months.length - 1] ?? DEFAULT_MONTH);
  return { month, region: ALL, projectType: ALL, siteId: ALL };
}

/** 지역·유형 범위 안의 현장 (월과 무관). 현장 ID 순. */
export function sitesInScope(
  rows: SiteRow[],
  filters: Pick<Filters, "region" | "projectType" | "siteId">,
): { siteId: string; siteName: string }[] {
  const map = new Map<string, string>();
  for (const r of rows) {
    if (filters.region !== ALL && r.region !== filters.region) continue;
    if (filters.projectType !== ALL && r.projectType !== filters.projectType) continue;
    if (filters.siteId !== ALL && r.siteId !== filters.siteId) continue;
    map.set(r.siteId, r.siteName);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([siteId, siteName]) => ({ siteId, siteName }));
}

/** 현장 선택 목록용: 현장 조건은 빼고 지역·유형만 적용 */
export function siteChoices(rows: SiteRow[], region: string, projectType: string) {
  return sitesInScope(rows, { region, projectType, siteId: ALL });
}

/**
 * 필터를 바꾼다. 지역·유형을 바꿔서 고른 현장이 범위에서 빠지면 현장을 "전체"로 되돌린다.
 */
export function applyFilterChange(
  rows: SiteRow[],
  current: Filters,
  patch: Partial<Filters>,
): { filters: Filters; siteReset: boolean } {
  const next: Filters = { ...current, ...patch };
  let siteReset = false;
  if (next.siteId !== ALL) {
    const inScope = siteChoices(rows, next.region, next.projectType).some((s) => s.siteId === next.siteId);
    if (!inScope) {
      next.siteId = ALL;
      siteReset = true;
    }
  }
  return { filters: next, siteReset };
}

export function filtersKey(f: Filters): string {
  return `${f.month}|${f.region}|${f.projectType}|${f.siteId}`;
}
