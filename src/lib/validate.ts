import {
  FIELDS,
  FIRST_MONTH,
  LAST_MONTH,
  NUMERIC_FIELDS,
  PROJECT_TYPES,
  REGIONS,
  type FieldKey,
  type SiteRow,
} from "./types";
import type { ParsedFile, RawRecord } from "./parse";

export type IssueCategory =
  | "file"
  | "columns"
  | "metadata"
  | "values"
  | "dates"
  | "duplicate"
  | "consistency"
  | "monotonic";

export interface ImportIssue {
  /** 예: "파일 134행", "3번째 항목" */
  label: string;
  column?: string;
  message: string;
  category: IssueCategory;
}

export interface ImportCheck {
  name: string;
  passed: boolean;
  count: number;
}

export interface ValidationResult {
  ok: boolean;
  kind: "csv" | "json" | "unknown";
  issues: ImportIssue[];
  warnings: string[];
  notes: string[];
  checks: ImportCheck[];
  rows: SiteRow[];
  summary: {
    rowCount: number;
    columnCount: number;
    firstMonth: string | null;
    lastMonth: string | null;
    siteCount: number;
  };
}

const CHECK_NAMES: { category: IssueCategory; name: string }[] = [
  { category: "file", name: "파일 형식과 행 수" },
  { category: "columns", name: "필수 15개 열" },
  { category: "metadata", name: "JSON 메타데이터(단위·버전)" },
  { category: "values", name: "필수값·숫자·유효 범위" },
  { category: "dates", name: "날짜 형식과 착공일·준공일 순서" },
  { category: "duplicate", name: "같은 월·현장 중복 없음" },
  { category: "consistency", name: "같은 현장 정보 일치" },
  { category: "monotonic", name: "누적 공정률·기성액 감소 없음" },
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const NUMBER = /^-?\d+(\.\d+)?$/;

function validDate(s: string): boolean {
  const m = ISO_DATE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function lastDayOf(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(d).padStart(2, "0")}`;
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function emptyResult(kind: ValidationResult["kind"], issues: ImportIssue[]): ValidationResult {
  return finish(kind, issues, [], [], [], 0, 0);
}

function finish(
  kind: ValidationResult["kind"],
  issues: ImportIssue[],
  warnings: string[],
  notes: string[],
  rows: SiteRow[],
  recordCount: number,
  columnCount: number,
): ValidationResult {
  const checks: ImportCheck[] = CHECK_NAMES.filter((c) => c.category !== "metadata" || kind === "json").map((c) => {
    const count = issues.filter((i) => i.category === c.category).length;
    return { name: c.name, passed: count === 0, count };
  });
  const months = rows.map((r) => r.month).sort();
  return {
    ok: issues.length === 0 && rows.length > 0,
    kind,
    issues,
    warnings,
    notes,
    checks,
    rows,
    summary: {
      rowCount: recordCount,
      columnCount,
      firstMonth: months[0] ?? null,
      lastMonth: months[months.length - 1] ?? null,
      siteCount: new Set(rows.map((r) => r.siteId)).size,
    },
  };
}

export function validateFatal(message: string): ValidationResult {
  return emptyResult("unknown", [{ label: "파일", message, category: "file" }]);
}

export function validateParsed(p: ParsedFile): ValidationResult {
  const kind = p.kind;
  const labelOf = (rec: RawRecord) => (kind === "csv" ? `파일 ${rec.line}행` : `${rec.line}번째 항목`);
  const issues: ImportIssue[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  if (p.fatal) return emptyResult(kind, [{ label: "파일", message: p.fatal, category: "file" }]);

  if (kind === "csv") {
    notes.push("CSV에는 메타데이터가 없어 데이터 설명서의 단위(금액 백만원, 공정률 %)를 적용합니다.");
    const cols = p.columns ?? [];
    const missing = FIELDS.filter((f) => !cols.includes(f));
    if (missing.length > 0) {
      issues.push({
        label: "머리글(1행)",
        message: `필수 열이 없습니다: ${missing.join(", ")}`,
        category: "columns",
      });
      return finish(kind, issues, warnings, notes, [], p.records.length, cols.length);
    }
  } else {
    const md = p.metadata;
    if (!md) {
      notes.push("JSON에 메타데이터가 없어 데이터 설명서의 단위(금액 백만원, 공정률 %)를 적용합니다.");
    } else {
      if (md.schemaVersion !== "2.0") {
        issues.push({ label: "metadata", column: "schemaVersion", message: `버전이 2.0이 아닙니다 (값: ${String(md.schemaVersion)})`, category: "metadata" });
      }
      if (md.moneyUnit !== "백만원") {
        issues.push({ label: "metadata", column: "moneyUnit", message: `금액 단위가 백만원이 아닙니다 (값: ${String(md.moneyUnit)})`, category: "metadata" });
      }
      if (md.progressUnit !== "percent_0_100") {
        issues.push({ label: "metadata", column: "progressUnit", message: `공정률 단위가 percent_0_100이 아닙니다 (값: ${String(md.progressUnit)})`, category: "metadata" });
      }
      const rf = md.requiredFields;
      const missingFields = Array.isArray(rf) ? FIELDS.filter((f) => !rf.includes(f)) : [...FIELDS];
      if (missingFields.length > 0) {
        issues.push({ label: "metadata", column: "requiredFields", message: `필수 필드 목록이 올바르지 않습니다 (빠진 것: ${missingFields.join(", ")})`, category: "metadata" });
      }
    }
  }

  if (p.records.length === 0) {
    issues.push({ label: "파일", message: "데이터 행이 없습니다.", category: "file" });
    return finish(kind, issues, warnings, notes, [], 0, p.columns?.length ?? FIELDS.length);
  }

  // 1단계: 한 줄씩 검사하고 SiteRow 로 바꾼다
  interface Built {
    rec: RawRecord;
    row: SiteRow;
  }
  const built: Built[] = [];

  for (const rec of p.records) {
    const label = labelOf(rec);
    const before = issues.length;
    const add = (column: string, message: string, category: IssueCategory = "values") =>
      issues.push({ label, column, message, category });

    const raw = {} as Record<FieldKey, string>;
    const num: Partial<Record<FieldKey, number>> = {};
    const txt: Partial<Record<FieldKey, string>> = {};

    for (const f of FIELDS) {
      const v = rec.values[f];
      if (isEmpty(v)) {
        add(f, "필수값이 비어 있습니다 (빈칸을 0으로 바꾸지 않습니다)");
        continue;
      }
      if (NUMERIC_FIELDS.includes(f)) {
        let n: number;
        if (typeof v === "number") n = v;
        else if (typeof v === "string" && NUMBER.test(v.trim())) n = Number(v.trim());
        else n = NaN;
        if (!Number.isFinite(n)) {
          add(f, `숫자가 아닙니다 (값: ${String(v)})`);
          continue;
        }
        num[f] = n;
        raw[f] = typeof v === "string" ? v.trim() : String(v);
      } else {
        if (typeof v !== "string") {
          add(f, `문자 값이 아닙니다 (값: ${String(v)})`);
          continue;
        }
        txt[f] = v.trim();
        raw[f] = v.trim();
      }
    }

    // 값이 모두 읽힌 경우에만 범위·형식을 본다
    const ca = num.contractAmount;
    if (ca !== undefined && !(ca > 0)) add("contractAmount", `0보다 커야 합니다 (값: ${ca})`);
    for (const f of ["plannedProgress", "actualProgress"] as const) {
      const n = num[f];
      if (n !== undefined && (n < 0 || n > 100)) add(f, `0~100 범위를 벗어났습니다 (값: ${n})`);
    }
    const ce = num.cumulativeEarned;
    if (ce !== undefined) {
      if (ce < 0) add("cumulativeEarned", `0 이상이어야 합니다 (값: ${ce})`);
      else if (ca !== undefined && ca > 0 && ce > ca) add("cumulativeEarned", `계약금액(${ca})보다 클 수 없습니다 (값: ${ce})`);
    }
    const month = txt.month;
    if (month !== undefined) {
      if (!MONTH.test(month)) add("month", `YYYY-MM 형식이 아닙니다 (값: ${month})`);
      else if (month < FIRST_MONTH || month > LAST_MONTH) add("month", `${FIRST_MONTH}~${LAST_MONTH} 범위를 벗어났습니다 (값: ${month})`);
    }
    if (txt.siteId !== undefined && !/^[A-L]$/.test(txt.siteId)) add("siteId", `A~L 중 하나여야 합니다 (값: ${txt.siteId})`);
    if (txt.siteName !== undefined && !txt.siteName.includes("[가상]")) add("siteName", "현장명에 [가상] 표시가 없습니다");
    if (txt.region !== undefined && !REGIONS.includes(txt.region)) add("region", `지역이 올바르지 않습니다 (값: ${txt.region})`);
    if (txt.projectType !== undefined && !PROJECT_TYPES.includes(txt.projectType)) add("projectType", `공사 유형이 올바르지 않습니다 (값: ${txt.projectType})`);

    for (const f of ["startDate", "contractEndDate"] as const) {
      const d = txt[f];
      if (d !== undefined && !validDate(d)) add(f, `YYYY-MM-DD 형식의 올바른 날짜가 아닙니다 (값: ${d})`, "dates");
    }
    if (
      txt.startDate && txt.contractEndDate && validDate(txt.startDate) && validDate(txt.contractEndDate) &&
      !(txt.startDate < txt.contractEndDate)
    ) {
      add("startDate", "착공일이 계약상 준공일보다 늦거나 같습니다", "dates");
    }
    if (month && MONTH.test(month) && txt.startDate && validDate(txt.startDate) && lastDayOf(month) < txt.startDate) {
      add("month", `기준 월(${month})의 월말이 착공일(${txt.startDate})보다 이릅니다`, "dates");
    }

    if (issues.length === before) {
      built.push({
        rec,
        row: {
          month: txt.month!,
          siteId: txt.siteId!,
          siteName: txt.siteName!,
          contractAmount: num.contractAmount!,
          plannedProgress: num.plannedProgress!,
          actualProgress: num.actualProgress!,
          cumulativeEarned: num.cumulativeEarned!,
          region: txt.region!,
          projectType: txt.projectType!,
          startDate: txt.startDate!,
          contractEndDate: txt.contractEndDate!,
          currentWork: txt.currentWork!,
          issueCategory: txt.issueCategory!,
          issueSummary: txt.issueSummary!,
          actionPlan: txt.actionPlan!,
          raw,
        },
      });
    }
  }

  // 2단계: 줄과 줄 사이의 검사 (오류가 없는 줄만)
  const firstByKey = new Map<string, Built>();
  const firstBySite = new Map<string, Built>();
  const unique: Built[] = [];
  const CONSISTENT: FieldKey[] = ["siteName", "contractAmount", "region", "projectType", "startDate", "contractEndDate"];

  for (const b of built) {
    const key = `${b.row.month}/${b.row.siteId}`;
    const dup = firstByKey.get(key);
    if (dup) {
      issues.push({
        label: labelOf(b.rec),
        column: "month+siteId",
        message: `중복 키(${key})입니다 — ${labelOf(dup.rec)}과 같습니다`,
        category: "duplicate",
      });
      continue;
    }
    firstByKey.set(key, b);
    const base = firstBySite.get(b.row.siteId);
    if (!base) {
      firstBySite.set(b.row.siteId, b);
    } else {
      for (const f of CONSISTENT) {
        if (String(base.row[f]) !== String(b.row[f])) {
          issues.push({
            label: labelOf(b.rec),
            column: f,
            message: `같은 현장(${b.row.siteId})의 ${f} 값이 첫 기록(${labelOf(base.rec)})과 다릅니다`,
            category: "consistency",
          });
        }
      }
    }
    unique.push(b);
  }

  const bySite = new Map<string, Built[]>();
  for (const b of unique) {
    const list = bySite.get(b.row.siteId) ?? [];
    list.push(b);
    bySite.set(b.row.siteId, list);
  }
  for (const list of bySite.values()) {
    list.sort((a, b) => a.row.month.localeCompare(b.row.month));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1].row;
      const cur = list[i].row;
      for (const f of ["plannedProgress", "actualProgress", "cumulativeEarned"] as const) {
        if (cur[f] < prev[f]) {
          issues.push({
            label: labelOf(list[i].rec),
            column: f,
            message: `누적값이 전월(${prev.month})보다 줄었습니다 (${prev[f]} → ${cur[f]})`,
            category: "monotonic",
          });
        }
      }
    }
  }

  // 누락 경고
  if (unique.length > 0) {
    const months = [...new Set(unique.map((b) => b.row.month))].sort();
    const sites = [...bySite.keys()].sort();
    let missing = 0;
    const [fy, fm] = months[0].split("-").map(Number);
    const [ly, lm] = months[months.length - 1].split("-").map(Number);
    const span: string[] = [];
    for (let y = fy, m = fm; y < ly || (y === ly && m <= lm); m++) {
      if (m > 12) {
        m = 1;
        y++;
      }
      span.push(`${y}-${String(m).padStart(2, "0")}`);
      if (y === ly && m === lm) break;
    }
    for (const s of sites) {
      for (const mo of span) {
        if (!firstByKey.has(`${mo}/${s}`)) missing++;
      }
    }
    if (missing > 0) {
      warnings.push(`월·현장 자료 ${missing}건이 없습니다. 확인 가능한 행만 집계합니다.`);
    }
  }

  const rows = issues.length === 0 ? unique.map((b) => b.row) : [];
  return finish(kind, issues, warnings, notes, rows, p.records.length, p.columns?.length ?? FIELDS.length);
}
