export const FIELDS = [
  "month",
  "siteId",
  "siteName",
  "contractAmount",
  "plannedProgress",
  "actualProgress",
  "cumulativeEarned",
  "region",
  "projectType",
  "startDate",
  "contractEndDate",
  "currentWork",
  "issueCategory",
  "issueSummary",
  "actionPlan",
] as const;

export type FieldKey = (typeof FIELDS)[number];

export const NUMERIC_FIELDS: FieldKey[] = [
  "contractAmount",
  "plannedProgress",
  "actualProgress",
  "cumulativeEarned",
];

export const REGIONS = ["인천", "경기", "충남", "충북", "세종", "강원", "대전"];
export const PROJECT_TYPES = ["공동주택", "물류시설", "업무시설", "상업시설", "생산시설"];

export const FIRST_MONTH = "2025-10";
export const LAST_MONTH = "2026-09";
export const DEFAULT_MONTH = "2026-09";

export type Status = "정상" | "주의" | "점검";

export interface SiteRow {
  month: string;
  siteId: string;
  siteName: string;
  contractAmount: number;
  plannedProgress: number;
  actualProgress: number;
  cumulativeEarned: number;
  region: string;
  projectType: string;
  startDate: string;
  contractEndDate: string;
  currentWork: string;
  issueCategory: string;
  issueSummary: string;
  actionPlan: string;
  /** 가져온 원본 문자열 (CSV 내보내기에서 그대로 쓴다) */
  raw: Record<FieldKey, string>;
}

export interface Filters {
  month: string;
  region: string; // "all" 또는 지역명
  projectType: string; // "all" 또는 공사 유형
  siteId: string; // "all" 또는 현장 ID
}

export const ALL = "all";

export interface SiteMetrics {
  row: SiteRow;
  rate: number; // 기성률 %
  gap: number; // 공정차이 pp
  status: Status;
  monthlyEarned: number | null; // 당월기성액, 전월이 없으면 null
}

export interface Aggregate {
  siteCount: number;
  contract: number | null;
  earned: number | null;
  rate: number | null;
  planned: number | null;
  actual: number | null;
  gap: number | null;
  monthlyEarned: number | null;
  prevEarned: number | null; // 전월 누적기성액 합계 (막대 아랫부분)
  counts: Record<Status, number>;
}
