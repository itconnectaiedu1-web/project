import type { AskPayload } from "./aiPayload";

export const REFERENCE_FIELDS = ["issueSummary", "actionPlan", "currentWork", "issueCategory", "metrics", "trend"] as const;
export type ReferenceField = (typeof REFERENCE_FIELDS)[number];

export interface AiReference {
  month: string;
  siteId: string; // 현장 ID 또는 "전체"
  fields: ReferenceField[];
}

export interface AiAnswer {
  answer: string;
  references: AiReference[];
}

export const ALL_SITES_LABEL = "전체";

/** Gemini가 돌려준 글자를 읽고, 전달한 자료 범위 밖의 근거는 버린다. 형식이 틀리면 null. */
export function validateAiResponse(text: string, payload: AskPayload): AiAnswer | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.answer !== "string" || d.answer.trim() === "") return null;

  const months = new Set<string>([payload.scope.month, ...payload.trend.map((t) => t.month)]);
  const siteIds = new Set<string>([
    ALL_SITES_LABEL,
    ...payload.records.map((r) => String(r.siteId)),
    ...(payload.siteHistory ?? []).map((r) => String(r.siteId)),
  ]);

  const references: AiReference[] = [];
  if (Array.isArray(d.references)) {
    for (const ref of d.references) {
      if (!ref || typeof ref !== "object") continue;
      const r = ref as Record<string, unknown>;
      if (typeof r.month !== "string" || typeof r.siteId !== "string" || !Array.isArray(r.fields)) continue;
      if (!months.has(r.month) || !siteIds.has(r.siteId)) continue;
      const fields = r.fields.filter((f): f is ReferenceField => (REFERENCE_FIELDS as readonly string[]).includes(f as string));
      if (fields.length === 0) continue;
      references.push({ month: r.month, siteId: r.siteId, fields });
    }
  }
  return { answer: d.answer.trim(), references };
}

export type AiErrorCode =
  | "AI_KEY_MISSING"
  | "AI_KEY_INVALID"
  | "AI_RATE_LIMIT"
  | "AI_TIMEOUT"
  | "AI_FAILED"
  | "BAD_REQUEST";

export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  AI_KEY_MISSING: "AI 키가 설정되지 않았습니다.",
  AI_KEY_INVALID: "AI 키가 올바르지 않거나 사용 권한이 없습니다.",
  AI_RATE_LIMIT: "사용 한도를 넘었습니다. 잠시 뒤 다시 시도하세요.",
  AI_TIMEOUT: "응답이 오래 걸려 중단했습니다.",
  AI_FAILED: "답변을 받지 못했습니다.",
  BAD_REQUEST: "질문 형식이 올바르지 않습니다.",
};
