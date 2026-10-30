"use client";

import { useState } from "react";
import { fmtPct, fmtPp } from "@/lib/format";
import { aggregate } from "@/lib/metrics";
import { MAX_QUESTION_LENGTH } from "@/lib/aiPayload";
import { ALL_SITES_LABEL, type AiReference, type ReferenceField } from "@/lib/aiResponse";
import { siteMetrics } from "@/lib/metrics";
import { useApp, type AskItem } from "@/state/AppState";
import { useScopeData } from "@/state/useScopeData";
import { ALL } from "@/lib/types";
import { Card } from "./Common";

const QUICK = ["D가 늦어진 원인과 대응은?", "점검 현장은 어디인가요?", "D는 회복 중인가요?", "실제 준공일과 미수금 현황은?"];

const FIELD_LABEL: Record<ReferenceField, string> = {
  issueSummary: "기록된 상황",
  actionPlan: "기록된 대응 계획",
  currentWork: "당월 주요 공종",
  issueCategory: "특이사항 분류",
  metrics: "계산된 지표",
  trend: "월별 요약",
};

function ReferenceView({ r }: { r: AiReference }) {
  const { rows, index, filters } = useApp();
  let numbers = "";
  if (rows) {
    if (r.siteId === ALL_SITES_LABEL) {
      const a = aggregate(rows, filters, r.month, index);
      numbers = `기성률 ${fmtPct(a.rate)} · 계획 ${fmtPct(a.planned)} · 실제 ${fmtPct(a.actual)} · 공정차이 ${fmtPp(a.gap)}`;
    } else {
      const row = index.get(`${r.month}/${r.siteId}`);
      if (row) {
        const m = siteMetrics(row, index);
        numbers = `계획 ${fmtPct(row.plannedProgress)} · 실제 ${fmtPct(row.actualProgress)} · 공정차이 ${fmtPp(m.gap)} · 기성률 ${fmtPct(m.rate)}`;
      }
    }
  }
  return (
    <li className="rounded border border-slate-200 bg-white px-3 py-2 text-xs" data-testid="reference">
      <div className="font-bold text-slate-800">
        기준 {r.month} / {r.siteId === ALL_SITES_LABEL ? "범위 전체" : `현장 ${r.siteId}`}
      </div>
      {numbers && <div className="num mt-0.5 text-slate-700">근거 숫자: {numbers}</div>}
      <div className="mt-1 flex flex-wrap gap-1">
        {r.fields.map((f) => (
          <span key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
            참고: {FIELD_LABEL[f]}
          </span>
        ))}
      </div>
    </li>
  );
}

function Answer({ item }: { item: AskItem }) {
  const { retryQuestion } = useApp();
  return (
    <div className="space-y-2" data-testid="ask-item">
      <div className="ml-auto max-w-[85%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white" data-testid="ask-question">
        {item.question}
      </div>
      {item.status === "pending" && (
        <div className="max-w-[85%] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" role="status" data-testid="ask-pending">
          AI 답변을 기다리는 중…
        </div>
      )}
      {item.status === "error" && (
        <div className="max-w-[90%] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert" data-testid="ask-error">
          <div className="font-bold">AI 연결 실패: {item.errorMessage}</div>
          <p className="mt-1 text-xs">대시보드와 CSV는 계속 쓸 수 있습니다.</p>
          <button type="button" onClick={() => retryQuestion(item.id)} className="mt-2 rounded border border-red-300 bg-white px-3 py-1 text-xs font-bold hover:bg-red-100">
            다시 시도
          </button>
        </div>
      )}
      {item.status === "done" && (
        <div className="max-w-[90%] rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm" data-testid="ask-answer">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">AI 답변</span>
            {item.mock && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800" data-testid="mock-badge">모의 응답</span>}
          </div>
          <p className="whitespace-pre-wrap text-slate-900" data-testid="ask-answer-text">{item.answer}</p>
          {item.references && item.references.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {item.references.map((r, i) => (
                <ReferenceView key={i} r={r} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">이 답변에는 표시할 근거 항목이 없습니다.</p>
          )}
          <p className="mt-3 text-xs text-slate-500">※ 기록된 내용이며 완료 사실이나 원인 확정이 아닙니다.</p>
        </div>
      )}
    </div>
  );
}

export function AskPanel() {
  const { filters, ask, askPending, submitQuestion } = useApp();
  const data = useScopeData();
  const [input, setInput] = useState("");

  if (!data) return null;
  const { agg, table } = data;
  const inspectionIds = data.inspection.map((m) => m.row.siteId);
  const focusSite = filters.siteId !== ALL ? table.find((t) => t.row.siteId === filters.siteId) : undefined;

  function send() {
    if (!input.trim() || askPending) return;
    submitQuestion(input);
    setInput("");
  }

  return (
    <div className="space-y-4" data-testid="ask-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI 현장 진단 · 기록 질의</h1>
        <p className="mt-1 text-sm text-slate-600">계산은 프로그램이 하고, AI는 그 숫자와 기록된 상황·대응 계획을 근거로 설명합니다.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="text-base font-bold text-slate-900">현재 질의 기준 범위</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm" data-testid="ask-scope">
              <div className="rounded bg-slate-50 p-2">
                <dt className="text-xs text-slate-500">기준월</dt>
                <dd className="num font-bold">{filters.month}</dd>
              </div>
              <div className="rounded bg-slate-50 p-2">
                <dt className="text-xs text-slate-500">대상 현장</dt>
                <dd className="font-bold">
                  {filters.siteId === ALL ? `${agg.siteCount}개 현장` : `현장 ${filters.siteId}`}
                  {filters.siteId !== ALL && <span className="ml-1 rounded bg-blue-100 px-1.5 text-xs text-blue-700">{focusSite ? "포커스" : ""}</span>}
                </dd>
              </div>
              <div className="rounded bg-slate-50 p-2">
                <dt className="text-xs text-slate-500">지역</dt>
                <dd className="font-bold">{filters.region === ALL ? "전체" : filters.region}</dd>
              </div>
              <div className="rounded bg-slate-50 p-2">
                <dt className="text-xs text-slate-500">공사 유형</dt>
                <dd className="font-bold">{filters.projectType === ALL ? "전체" : filters.projectType}</dd>
              </div>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded border border-slate-200 p-2">
                <div className="text-xs text-slate-500">전체 기성률</div>
                <div className="num text-xl font-bold">{fmtPct(agg.rate)}</div>
              </div>
              <div className="rounded border border-slate-200 p-2">
                <div className="text-xs text-slate-500">공정차이</div>
                <div className="num text-xl font-bold text-red-700">{fmtPp(agg.gap)}</div>
              </div>
            </div>
            {inspectionIds.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1 rounded border border-red-100 bg-red-50 p-2 text-xs">
                <span className="font-bold text-red-800">점검 현장 ({inspectionIds.length}곳)</span>
                {inspectionIds.map((id) => (
                  <span key={id} className="rounded bg-white px-1.5 py-0.5 font-bold text-red-700">현장 {id}</span>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-bold text-slate-900">AI 응답 원칙</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>숫자는 프로그램이 계산한 값만 인용합니다.</li>
              <li>기록된 상황·대응 계획은 완료나 원인 확정이 아닙니다.</li>
              <li>실제 준공일·미수금 등 자료에 없는 내용은 “알 수 없다”고 답합니다.</li>
              <li>월·지역·유형·현장을 바꾸면 이전 답변이 지워집니다.</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-bold text-slate-900">예시 질문</h2>
            <ul className="mt-2 space-y-1">
              {QUICK.map((q, i) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => setInput(q)}
                    data-testid={`quick-${i + 1}`}
                    className="w-full rounded border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {i + 1}. {q}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">누르면 입력창에 채워집니다. 현장을 고르지 않아도 전체 범위로 묻습니다.</p>
          </Card>
        </div>

        <Card className="flex min-h-[32rem] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto" data-testid="ask-log" aria-live="polite">
            {ask.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">
                {filters.month} 기준 질문을 입력하세요. 예: “D가 늦어진 원인과 대응은?”
              </p>
            ) : (
              ask.map((it) => <Answer key={it.id} item={it} />)
            )}
          </div>
          <form
            className="mt-4 flex gap-2 border-t border-slate-200 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              aria-label="질문 입력"
              value={input}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`현재 범위(${filters.month})에 대해 질문하세요… (예: D가 늦어진 원인과 대응은?)`}
              className="h-11 flex-1 rounded border border-slate-300 px-3 text-sm"
              data-testid="ask-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || askPending}
              className="rounded bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              data-testid="ask-send"
            >
              전송
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
