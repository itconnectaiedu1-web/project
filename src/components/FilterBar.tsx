"use client";

import { useMemo } from "react";
import { useApp } from "@/state/AppState";
import { monthOptions, regionOptions, siteChoices, typeOptions } from "@/lib/filters";
import { sitesInScope } from "@/lib/filters";
import { ALL } from "@/lib/types";

const selectCls =
  "h-9 min-w-[7rem] rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export function FilterBar() {
  const { rows, filters, changeFilters, resetFilters, notice } = useApp();
  const disabled = !rows;

  const months = useMemo(() => (rows ? monthOptions(rows) : []), [rows]);
  const regions = useMemo(() => (rows ? regionOptions(rows) : []), [rows]);
  const types = useMemo(() => (rows ? typeOptions(rows) : []), [rows]);
  const sites = useMemo(() => (rows ? siteChoices(rows, filters.region, filters.projectType) : []), [rows, filters.region, filters.projectType]);
  const scopeCount = useMemo(() => (rows ? sitesInScope(rows, filters).length : 0), [rows, filters]);

  return (
    <div className="border-b border-slate-200 bg-white" role="group" aria-label="필터">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 lg:px-6">
        <span className="text-sm font-bold text-slate-700">필터 기준</span>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          조회월
          <select
            aria-label="조회월"
            className={selectCls}
            disabled={disabled}
            value={filters.month}
            onChange={(e) => changeFilters({ month: e.target.value })}
          >
            {disabled && <option value={filters.month}>{filters.month}</option>}
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          지역
          <select
            aria-label="지역"
            className={selectCls}
            disabled={disabled}
            value={filters.region}
            onChange={(e) => changeFilters({ region: e.target.value })}
          >
            <option value={ALL}>전체</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          공사 유형
          <select
            aria-label="공사 유형"
            className={selectCls}
            disabled={disabled}
            value={filters.projectType}
            onChange={(e) => changeFilters({ projectType: e.target.value })}
          >
            <option value={ALL}>전체</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          현장
          <select
            aria-label="현장"
            className={`${selectCls} max-w-[16rem]`}
            disabled={disabled}
            value={filters.siteId}
            onChange={(e) => changeFilters({ siteId: e.target.value })}
          >
            <option value={ALL}>전체</option>
            {sites.map((s) => (
              <option key={s.siteId} value={s.siteId}>
                {s.siteId} · {s.siteName.replace("[가상] ", "")}
              </option>
            ))}
          </select>
        </label>

        {rows && (
          <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700" data-testid="scope-count">
            대상 {scopeCount}개 현장
          </span>
        )}

        <button
          type="button"
          onClick={resetFilters}
          disabled={disabled}
          className="ml-auto text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          필터 초기화
        </button>
      </div>
      {notice && (
        <div role="status" className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 lg:px-6">
          {notice}
        </div>
      )}
    </div>
  );
}
