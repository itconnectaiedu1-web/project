"use client";

import { useMemo } from "react";
import { useApp } from "./AppState";
import { aggregate, inspectionList, siteTable, trend } from "@/lib/metrics";

/** 지금 고른 필터 범위로 계산한 값들. 모든 화면이 이 값을 함께 쓴다. */
export function useScopeData() {
  const { rows, index, filters } = useApp();
  return useMemo(() => {
    if (!rows) return null;
    const agg = aggregate(rows, filters, filters.month, index);
    const table = siteTable(rows, filters, index);
    return {
      agg,
      table,
      inspection: inspectionList(table),
      trend: trend(rows, filters, index),
    };
  }, [rows, index, filters]);
}
