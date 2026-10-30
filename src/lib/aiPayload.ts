import { FIELDS, ALL, type FieldKey, type Filters, type SiteRow, type Status } from "./types";
import { aggregate, buildIndex, inspectionList, siteTable, trend } from "./metrics";
import { round1 } from "./format";

/** AI에 보내는 원문 기록. 파일에서 읽은 값 그대로이며 계산값은 섞지 않는다. */
export type AiRecord = Record<FieldKey, string | number>;

export interface AiSiteComputed {
  siteId: string;
  rate: number;
  gap: number;
  status: Status;
  monthlyEarned: number | null;
}

export interface AiTrendPoint {
  month: string;
  siteCount: number;
  planned: number | null;
  actual: number | null;
  gap: number | null;
  rate: number | null;
  cumulativeEarned: number | null;
  monthlyEarned: number | null;
}

export interface AskPayload {
  question: string;
  scope: { month: string; region: string; projectType: string; siteId: string };
  records: AiRecord[];
  computed: {
    overall: {
      siteCount: number;
      contractAmount: number | null;
      cumulativeEarned: number | null;
      rate: number | null;
      planned: number | null;
      actual: number | null;
      gap: number | null;
      monthlyEarned: number | null;
    };
    statusCounts: Record<Status, number>;
    inspectionOrder: string[];
    sites: AiSiteComputed[];
  };
  trend: AiTrendPoint[];
  siteHistory?: AiRecord[];
}

const r1 = (x: number | null) => (x === null ? null : round1(x));

export function toAiRecord(row: SiteRow): AiRecord {
  const out = {} as AiRecord;
  for (const f of FIELDS) out[f] = row[f];
  return out;
}

export const MAX_QUESTION_LENGTH = 500;

export function buildAskPayload(rows: SiteRow[], filters: Filters, question: string): AskPayload {
  const index = buildIndex(rows);
  const table = siteTable(rows, filters, index);
  const agg = aggregate(rows, filters, filters.month, index);
  const tr = trend(rows, filters, index);

  const payload: AskPayload = {
    question: question.trim(),
    scope: {
      month: filters.month,
      region: filters.region,
      projectType: filters.projectType,
      siteId: filters.siteId,
    },
    records: table.map((m) => toAiRecord(m.row)),
    computed: {
      overall: {
        siteCount: agg.siteCount,
        contractAmount: r1(agg.contract),
        cumulativeEarned: r1(agg.earned),
        rate: r1(agg.rate),
        planned: r1(agg.planned),
        actual: r1(agg.actual),
        gap: r1(agg.gap),
        monthlyEarned: r1(agg.monthlyEarned),
      },
      statusCounts: agg.counts,
      inspectionOrder: inspectionList(table).map((m) => m.row.siteId),
      sites: table.map((m) => ({
        siteId: m.row.siteId,
        rate: round1(m.rate),
        gap: round1(m.gap),
        status: m.status,
        monthlyEarned: r1(m.monthlyEarned),
      })),
    },
    trend: tr
      .filter((t) => t.agg.siteCount > 0)
      .map((t) => ({
        month: t.month,
        siteCount: t.agg.siteCount,
        planned: r1(t.agg.planned),
        actual: r1(t.agg.actual),
        gap: r1(t.agg.gap),
        rate: r1(t.agg.rate),
        cumulativeEarned: r1(t.agg.earned),
        monthlyEarned: r1(t.agg.monthlyEarned),
      })),
  };

  // 현장 한 곳을 골랐을 때만, 그 현장의 시작 월~선택 월 원문 기록을 함께 보낸다.
  if (filters.siteId !== ALL) {
    payload.siteHistory = rows
      .filter((r) => r.siteId === filters.siteId && r.month <= filters.month)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(toAiRecord);
  }
  return payload;
}

/** 서버에서 요청 본문을 검사한다. 형식이 맞지 않으면 null. */
export function parseAskPayload(body: unknown): AskPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.question !== "string") return null;
  const question = b.question.trim();
  if (question.length === 0 || question.length > MAX_QUESTION_LENGTH) return null;

  const scope = b.scope as Record<string, unknown> | undefined;
  if (!scope || typeof scope !== "object") return null;
  for (const k of ["month", "region", "projectType", "siteId"]) {
    if (typeof scope[k] !== "string") return null;
  }

  const isRecordList = (v: unknown, max: number): v is AiRecord[] =>
    Array.isArray(v) &&
    v.length <= max &&
    v.every((r) => r && typeof r === "object" && FIELDS.every((f) => (r as Record<string, unknown>)[f] !== undefined));

  if (!isRecordList(b.records, 24)) return null;
  if (b.siteHistory !== undefined && !isRecordList(b.siteHistory, 24)) return null;

  const computed = b.computed as Record<string, unknown> | undefined;
  if (!computed || typeof computed !== "object") return null;
  if (!computed.overall || typeof computed.overall !== "object") return null;
  if (!Array.isArray(computed.sites) || computed.sites.length > 24) return null;
  if (!Array.isArray(computed.inspectionOrder) || computed.inspectionOrder.length > 24) return null;
  if (!computed.statusCounts || typeof computed.statusCounts !== "object") return null;
  if (!Array.isArray(b.trend) || b.trend.length > 24) return null;

  return {
    question,
    scope: scope as AskPayload["scope"],
    records: b.records,
    computed: computed as unknown as AskPayload["computed"],
    trend: b.trend as AiTrendPoint[],
    ...(b.siteHistory ? { siteHistory: b.siteHistory as AiRecord[] } : {}),
  };
}
