"use client";

import { useApp } from "@/state/AppState";
import { AskPanel } from "@/components/AskPanel";
import { NoData } from "@/components/Common";

export default function AskPage() {
  const { rows } = useApp();
  if (!rows) return <NoData />;
  return <AskPanel />;
}
