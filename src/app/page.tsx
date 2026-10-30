"use client";

import { useMemo } from "react";
import { useApp } from "@/state/AppState";
import { useScopeData } from "@/state/useScopeData";
import { monthOptions } from "@/lib/filters";
import { MetricCards } from "@/components/MetricCards";
import { InspectionPanel } from "@/components/InspectionPanel";
import { MonthlyBars, TrendChart } from "@/components/Charts";
import { EmptyScope, NoData } from "@/components/Common";

export default function SummaryPage() {
  const { rows, filters } = useApp();
  const data = useScopeData();
  const allMonths = useMemo(() => (rows ? monthOptions(rows) : []), [rows]);

  if (!rows || !data) return <NoData />;

  return (
    <div className="space-y-4" data-testid="summary-page">
      {data.agg.siteCount === 0 && <EmptyScope />}
      <MetricCards agg={data.agg} month={filters.month} />
      <InspectionPanel agg={data.agg} inspection={data.inspection} />
      <div className="grid gap-4 xl:grid-cols-2">
        <TrendChart points={data.trend} allMonths={allMonths} />
        <MonthlyBars points={data.trend} allMonths={allMonths} />
      </div>
    </div>
  );
}
