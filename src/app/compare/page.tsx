"use client";

import { useApp } from "@/state/AppState";
import { useScopeData } from "@/state/useScopeData";
import { CompareTable } from "@/components/CompareTable";
import { EmptyScope, NoData } from "@/components/Common";

export default function ComparePage() {
  const { rows } = useApp();
  const data = useScopeData();
  if (!rows || !data) return <NoData />;
  if (data.agg.siteCount === 0) return <EmptyScope />;
  return <CompareTable table={data.table} agg={data.agg} />;
}
