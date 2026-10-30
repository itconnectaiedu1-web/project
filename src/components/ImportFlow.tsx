"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { parseFile } from "@/lib/parse";
import { validateFatal, validateParsed, type ValidationResult } from "@/lib/validate";
import { fmtNum, fmtPct } from "@/lib/format";
import { useApp } from "@/state/AppState";
import { Card } from "./Common";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SHOWN_ISSUES = 20;

interface Checked {
  fileName: string;
  sizeKb: number;
  result: ValidationResult;
}

export function ImportFlow() {
  const { rows, info, replaceRows } = useApp();
  const [checked, setChecked] = useState<Checked | null>(null);
  const [done, setDone] = useState<{ rowCount: number; fileName: string } | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setDone(null);
    setCancelled(false);
    let result: ValidationResult;
    if (file.size > MAX_BYTES) {
      result = validateFatal("파일이 너무 큽니다 (10MB 이하만 가져올 수 있습니다).");
    } else {
      try {
        const text = await file.text();
        const parsed = parseFile(file.name, text);
        result = "kind" in parsed ? validateParsed(parsed) : validateFatal(parsed.fatal);
      } catch {
        result = validateFatal("파일을 읽을 수 없습니다.");
      }
    }
    setChecked({ fileName: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), result });
    if (inputRef.current) inputRef.current.value = ""; // 같은 파일을 다시 골라도 동작하게
  }

  function apply() {
    if (!checked || !checked.result.ok) return;
    replaceRows(checked.result.rows, { fileName: checked.fileName, rowCount: checked.result.rows.length });
    setDone({ rowCount: checked.result.rows.length, fileName: checked.fileName });
    setChecked(null);
  }

  function cancel() {
    setChecked(null);
    setCancelled(true);
  }

  const res = checked?.result;
  const preview = res?.ok ? res.rows.slice(0, 5) : [];

  return (
    <div className="space-y-4" data-testid="import-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">현장 데이터 가져오기 (CSV / JSON)</h1>
        <p className="mt-1 text-sm text-slate-600">
          현장별 월말 공정·기성 자료를 검사하고 미리 본 뒤 전체를 바꿉니다. 검사를 통과하기 전에는 지금 자료가 바뀌지 않습니다.
        </p>
      </div>

      <div className="rounded border-l-4 border-blue-600 bg-white p-4 shadow-sm">
        <div className="font-bold text-slate-900">안전하게 교체합니다</div>
        <p className="mt-1 text-sm text-slate-600">
          가져오기에 실패하거나 취소하면 지금 자료는 그대로 유지됩니다. 새 자료는 더해지지 않고 전체를 바꿉니다(CSV 다음 JSON을 가져와도 144행).
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2" data-testid="current-data">
          <span className="text-sm font-bold text-slate-700">지금 자료</span>
          <span className="text-sm text-slate-700">
            {rows && info ? (
              <>
                <b className="num">{info.rowCount}행</b> · {info.fileName}
              </>
            ) : (
              "아직 가져온 자료가 없습니다"
            )}
          </span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-bold text-slate-900">1. 파일 고르기</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
            className={`mt-3 rounded-lg border-2 border-dashed p-8 text-center ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"}`}
          >
            <p className="font-bold text-slate-800">파일을 끌어다 놓거나 버튼을 눌러 고르세요</p>
            <p className="mt-1 text-xs text-slate-500">CSV 또는 JSON · UTF-8 · 최대 10MB</p>
            <input
              ref={inputRef}
              id="file-input"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              aria-label="가져올 파일 고르기"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              파일 고르기
            </button>
          </div>
          {checked && (
            <div className="mt-4 rounded border border-slate-200 p-3 text-sm" data-testid="file-summary">
              <div className="flex items-center justify-between">
                <b className="break-all">{checked.fileName}</b>
                <span className="num text-xs text-slate-500">{checked.sizeKb} KB</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                <dt>인식한 열</dt>
                <dd className="num text-right font-semibold">{res!.summary.columnCount}개 열</dd>
                <dt>총 레코드</dt>
                <dd className="num text-right font-semibold">{res!.summary.rowCount}행</dd>
                <dt>기간</dt>
                <dd className="num text-right font-semibold">
                  {res!.summary.firstMonth ? `${res!.summary.firstMonth} ~ ${res!.summary.lastMonth}` : "-"}
                </dd>
                <dt>현장 수</dt>
                <dd className="num text-right font-semibold">{res!.ok ? `${res!.summary.siteCount}개 현장` : "-"}</dd>
              </dl>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-bold text-slate-900">2. 검사 결과</h2>
          {!res ? (
            <p className="mt-3 text-sm text-slate-500">파일을 고르면 검사 결과가 여기에 나타납니다.</p>
          ) : (
            <div className="mt-3 space-y-3" data-testid="check-result">
              <div
                className={`rounded border px-3 py-2 text-sm font-bold ${
                  res.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
                }`}
                data-testid="check-verdict"
              >
                {res.ok
                  ? `전체 조건 충족 — 총 ${res.summary.rowCount}행 · ${res.summary.columnCount}개 열 · ${res.summary.siteCount}개 현장`
                  : `오류 ${res.issues.length}건 — 적용할 수 없습니다. 지금 자료는 그대로 유지됩니다.`}
              </div>
              <ul className="space-y-1 text-sm">
                {res.checks.map((c) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className={c.passed ? "text-emerald-600" : "text-red-600"} aria-hidden>
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <span>
                      <b>{c.passed ? "통과" : `오류 ${c.count}건`}</b> · {c.name}
                    </span>
                  </li>
                ))}
              </ul>
              {res.notes.map((n) => (
                <p key={n} className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-800">{n}</p>
              ))}
              {res.warnings.map((w) => (
                <p key={w} className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="import-warning">{w}</p>
              ))}
              {res.issues.length > 0 && (
                <div data-testid="issue-list">
                  <div className="text-xs font-bold text-slate-600">오류 위치와 이유</div>
                  <ul className="mt-1 space-y-1">
                    {res.issues.slice(0, MAX_SHOWN_ISSUES).map((it, i) => (
                      <li key={i} className="rounded border border-red-100 bg-red-50/60 px-3 py-1.5 text-sm text-red-900">
                        <b>{it.label}</b>
                        {it.column ? ` · ${it.column}` : ""} · {it.message}
                      </li>
                    ))}
                  </ul>
                  {res.issues.length > MAX_SHOWN_ISSUES && (
                    <p className="mt-1 text-xs text-slate-500">외 {res.issues.length - MAX_SHOWN_ISSUES}건</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {preview.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">3. 적용 전 미리보기</h2>
            <span className="num rounded bg-slate-100 px-2 py-1 text-xs font-semibold" data-testid="preview-range">
              {res!.rows.length}행 중 1~{preview.length}행
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm" data-testid="preview-table">
              <thead>
                <tr className="bg-slate-100 text-xs font-bold text-slate-600">
                  {["현장ID", "현장명", "기준월", "지역", "공사 유형", "계약금액(백만원)", "누적기성액(백만원)", "계획공정률", "실제공정률", "특이사항 분류"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={`${r.month}/${r.siteId}`} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-bold">{r.siteId}</td>
                    <td className="px-3 py-2">{r.siteName}</td>
                    <td className="num px-3 py-2">{r.month}</td>
                    <td className="px-3 py-2">{r.region}</td>
                    <td className="px-3 py-2">{r.projectType}</td>
                    <td className="num px-3 py-2 text-right">{fmtNum(r.contractAmount)}</td>
                    <td className="num px-3 py-2 text-right">{fmtNum(r.cumulativeEarned)}</td>
                    <td className="num px-3 py-2 text-right">{fmtPct(r.plannedProgress)}</td>
                    <td className="num px-3 py-2 text-right">{fmtPct(r.actualProgress)}</td>
                    <td className="px-3 py-2">{r.issueCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {checked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-900 p-4 text-white" data-testid="apply-bar">
          <div>
            <div className="font-bold">{res!.ok ? `데이터 갱신 대기 중 · ${res!.rows.length}건 준비 완료` : "오류가 있어 적용할 수 없습니다"}</div>
            <div className="text-xs text-slate-300">
              {res!.ok ? "“전체 교체 적용”을 누르면 지금 자료를 모두 바꿉니다(더하지 않습니다)." : "파일을 고친 뒤 다시 가져오세요. 취소해도 지금 자료는 유지됩니다."}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={cancel} className="rounded border border-slate-500 px-4 py-2 text-sm font-bold hover:bg-slate-700">
              취소 (지금 자료 유지)
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!res!.ok}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
            >
              데이터 전체 교체 적용
            </button>
          </div>
        </div>
      )}

      {done && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4" data-testid="import-done">
          <div>
            <div className="font-bold text-emerald-900">{done.rowCount}행으로 교체했습니다</div>
            <div className="text-sm text-emerald-800">{done.fileName} · 필터를 처음 상태(2026-09·전체)로 되돌렸습니다.</div>
          </div>
          <Link href="/" className="rounded bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">
            현황 요약 보기
          </Link>
        </div>
      )}
      {cancelled && !checked && !done && (
        <div role="status" className="rounded border border-slate-300 bg-white p-3 text-sm text-slate-700" data-testid="import-cancelled">
          취소했습니다. 지금 자료는 그대로 유지됩니다.
        </div>
      )}
    </div>
  );
}
