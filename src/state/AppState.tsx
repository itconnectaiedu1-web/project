"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { applyFilterChange, defaultFilters, filtersKey, siteChoices } from "@/lib/filters";
import { buildIndex, type RowIndex } from "@/lib/metrics";
import { buildAskPayload } from "@/lib/aiPayload";
import type { AiReference } from "@/lib/aiResponse";
import type { Filters, SiteRow } from "@/lib/types";
import { ALL } from "@/lib/types";

export interface DataInfo {
  fileName: string;
  rowCount: number;
}

export interface AskItem {
  id: number;
  question: string;
  status: "pending" | "done" | "error";
  answer?: string;
  references?: AiReference[];
  mock?: boolean;
  errorMessage?: string;
}

interface AppState {
  rows: SiteRow[] | null;
  index: RowIndex;
  info: DataInfo | null;
  replaceRows: (rows: SiteRow[], info: DataInfo) => void;

  filters: Filters;
  notice: string | null;
  changeFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  highlightSiteId: string | null;
  expanded: Set<string>;
  toggleExpanded: (siteId: string) => void;
  openSite: (siteId: string) => void;

  ask: AskItem[];
  askPending: boolean;
  submitQuestion: (question: string) => void;
  retryQuestion: (id: number) => void;
}

const FALLBACK_FILTERS: Filters = { month: "2026-09", region: ALL, projectType: ALL, siteId: ALL };
const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppStateProvider 안에서만 쓸 수 있습니다.");
  return v;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<SiteRow[] | null>(null);
  const [info, setInfo] = useState<DataInfo | null>(null);
  const [filters, setFilters] = useState<Filters>(FALLBACK_FILTERS);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightSiteId, setHighlight] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<AskItem[]>([]);

  const index = useMemo(() => buildIndex(rows ?? []), [rows]);

  // 요청이 돌아왔을 때 "그때의 범위"가 지금과 같은지 비교하기 위한 값들
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAsk = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAsk([]);
  }, []);

  const showNotice = useCallback((msg: string | null) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (msg) noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }, []);

  const replaceRows = useCallback(
    (next: SiteRow[], meta: DataInfo) => {
      // 더하지 않고 통째로 바꾼다
      setRows(next);
      setInfo(meta);
      setFilters(defaultFilters(next));
      setHighlight(null);
      setExpanded(new Set());
      clearAsk();
      showNotice(null);
    },
    [clearAsk, showNotice],
  );

  const changeFilters = useCallback(
    (patch: Partial<Filters>) => {
      const data = rowsRef.current;
      if (!data) return;
      const { filters: next, siteReset } = applyFilterChange(data, filtersRef.current, patch);
      if (filtersKey(next) === filtersKey(filtersRef.current)) return;
      setFilters(next);
      clearAsk(); // 범위가 바뀌면 이전 답변을 지우고, 기다리던 요청도 취소한다
      showNotice(siteReset ? "고른 현장이 범위에서 빠져 현장을 '전체'로 바꿨습니다." : null);
      setHighlight((h) => (h && siteChoices(data, next.region, next.projectType).some((s) => s.siteId === h) ? h : null));
    },
    [clearAsk, showNotice],
  );

  const resetFilters = useCallback(() => {
    const data = rowsRef.current;
    if (!data) return;
    const next = defaultFilters(data);
    setHighlight(null); // 필터가 이미 처음 상태여도 강조는 푼다
    if (filtersKey(next) === filtersKey(filtersRef.current)) return;
    setFilters(next);
    clearAsk();
    showNotice(null);
  }, [clearAsk, showNotice]);

  const toggleExpanded = useCallback((siteId: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(siteId)) n.delete(siteId);
      else n.add(siteId);
      return n;
    });
  }, []);

  const openSite = useCallback((siteId: string) => {
    setHighlight(siteId);
    setExpanded((prev) => new Set(prev).add(siteId));
  }, []);

  const send = useCallback(
    async (id: number, question: string) => {
      const data = rowsRef.current;
      if (!data) return;
      const key = filtersKey(filtersRef.current);
      const payload = buildAskPayload(data, filtersRef.current, question);
      const controller = new AbortController();
      abortRef.current = controller;

      const update = (patch: Partial<AskItem>) => {
        // 범위가 바뀌었거나 지워진 요청의 응답은 표시하지 않는다
        if (filtersKey(filtersRef.current) !== key) return;
        setAsk((items) => items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      };

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (json && json.ok) {
          update({ status: "done", answer: json.answer, references: json.references ?? [], mock: !!json.mock });
        } else {
          update({ status: "error", errorMessage: json?.message ?? "답변을 받지 못했습니다." });
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        update({ status: "error", errorMessage: "서버에 연결하지 못했습니다." });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [],
  );

  const askPending = ask.some((a) => a.status === "pending");

  const submitQuestion = useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q || !rowsRef.current) return;
      const id = ++idRef.current;
      setAsk((items) => [...items, { id, question: q, status: "pending" }]);
      void send(id, q);
    },
    [send],
  );

  const retryQuestion = useCallback(
    (id: number) => {
      setAsk((items) => items.map((it) => (it.id === id ? { ...it, status: "pending", errorMessage: undefined } : it)));
      const item = ask.find((a) => a.id === id);
      if (item) void send(id, item.question);
    },
    [ask, send],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  const value: AppState = {
    rows,
    index,
    info,
    replaceRows,
    filters,
    notice,
    changeFilters,
    resetFilters,
    highlightSiteId,
    expanded,
    toggleExpanded,
    openSite,
    ask,
    askPending,
    submitQuestion,
    retryQuestion,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
