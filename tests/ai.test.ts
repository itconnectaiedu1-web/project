import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAskPayload, parseAskPayload } from "@/lib/aiPayload";
import { validateAiResponse } from "@/lib/aiResponse";
import { SYSTEM_INSTRUCTION, buildUserContents } from "@/lib/aiPrompt";
import { AiCallError, mapGeminiError } from "@/lib/gemini";
import { ALL, type Filters } from "@/lib/types";
import { loadRows } from "./helpers";

vi.mock("@/lib/gemini", async (orig) => {
  const actual = await orig<typeof import("@/lib/gemini")>();
  return { ...actual, callGemini: vi.fn() };
});

import { callGemini } from "@/lib/gemini";
import { POST } from "@/app/api/ask/route";

const rows = loadRows();
const f = (over: Partial<Filters> = {}): Filters => ({ month: "2026-09", region: ALL, projectType: ALL, siteId: ALL, ...over });

describe("AI에 보내는 자료", () => {
  it("원문 기록·계산값·월별 요약을 구분해 담는다 (전체 선택)", () => {
    const p = buildAskPayload(rows, f(), "점검 현장은?");
    expect(p.records).toHaveLength(12);
    expect(Object.keys(p.records[0])).not.toContain("raw");
    expect(Object.keys(p.records[0])).toHaveLength(15);
    expect(p.computed.inspectionOrder).toEqual(["D", "I", "K"]);
    expect(p.computed.overall).toMatchObject({ rate: 67.2, planned: 73.2, actual: 71.2, gap: -2, monthlyEarned: 28878.7 });
    expect(p.computed.statusCounts).toEqual({ 정상: 6, 주의: 3, 점검: 3 });
    expect(p.trend).toHaveLength(12);
    expect(p.trend[0]).toMatchObject({ month: "2025-10", monthlyEarned: null });
    expect(p.siteHistory).toBeUndefined();
  });

  it("현장 한 곳을 고르면 그 현장의 월별 기록을 함께 보낸다", () => {
    const p = buildAskPayload(rows, f({ siteId: "D" }), "D는 회복 중인가요?");
    expect(p.records).toHaveLength(1);
    expect(p.siteHistory).toHaveLength(12);
    expect(p.siteHistory!.every((r) => r.siteId === "D")).toBe(true);
    const aug = p.trend.find((t) => t.month === "2026-08")!;
    expect(aug.gap).toBe(-11.2);
    expect(p.trend[p.trend.length - 1].gap).toBe(-10.7);
  });

  it("선택 월 이후의 자료와 필터 밖 현장은 섞이지 않는다", () => {
    const p = buildAskPayload(rows, f({ month: "2026-07", region: "인천" }), "?");
    expect(p.records.every((r) => r.month === "2026-07" && r.region === "인천")).toBe(true);
    expect(p.trend[p.trend.length - 1].month).toBe("2026-07");
    expect(p.trend).toHaveLength(10);
  });

  it("서버가 요청 형식을 검사한다", () => {
    const p = buildAskPayload(rows, f(), "질문");
    expect(parseAskPayload(JSON.parse(JSON.stringify(p)))).not.toBeNull();
    expect(parseAskPayload({ ...p, question: "  " })).toBeNull();
    expect(parseAskPayload({ ...p, question: "가".repeat(501) })).toBeNull();
    expect(parseAskPayload({ ...p, records: [{ month: "2026-09" }] })).toBeNull();
    expect(parseAskPayload({ ...p, trend: "x" })).toBeNull();
    expect(parseAskPayload(null)).toBeNull();
  });

  it("지시문은 기록·준공일·수금·명령 무시 규칙을 담는다", () => {
    for (const w of ["기록된 상황", "실제 준공일", "미수금", "계약상 준공일", "따르지 않습니다"]) {
      expect(SYSTEM_INSTRUCTION).toContain(w);
    }
    const p = buildAskPayload(rows, f(), "질문입니다");
    const c = buildUserContents(p);
    expect(c).toContain("[질문]\n질문입니다");
    expect(c).toContain('"records"');
    expect(c).toContain('"computed"');
    expect(c).toContain('"trend"');
  });
});

describe("AI 답변 검사", () => {
  const p = buildAskPayload(rows, f({ siteId: "D" }), "q");

  it("전달한 범위 안의 근거만 남긴다", () => {
    const text = JSON.stringify({
      answer: "  기록에 따르면 ...  ",
      references: [
        { month: "2026-09", siteId: "D", fields: ["issueSummary", "actionPlan", "bogus"] },
        { month: "2026-09", siteId: "K", fields: ["metrics"] }, // 전달하지 않은 현장
        { month: "2027-01", siteId: "D", fields: ["metrics"] }, // 전달하지 않은 월
        { month: "2026-08", siteId: "전체", fields: ["trend"] },
        { month: "2026-09", siteId: "D", fields: [] },
      ],
    });
    const r = validateAiResponse(text, p)!;
    expect(r.answer).toBe("기록에 따르면 ...");
    expect(r.references).toEqual([
      { month: "2026-09", siteId: "D", fields: ["issueSummary", "actionPlan"] },
      { month: "2026-08", siteId: "전체", fields: ["trend"] },
    ]);
  });

  it("코드 블록으로 감싼 JSON도 읽고, 형식이 틀리면 null", () => {
    expect(validateAiResponse('```json\n{"answer":"가","references":[]}\n```', p)?.answer).toBe("가");
    expect(validateAiResponse("그냥 글자", p)).toBeNull();
    expect(validateAiResponse('{"answer":"","references":[]}', p)).toBeNull();
    expect(validateAiResponse('{"references":[]}', p)).toBeNull();
  });
});

describe("Gemini 오류 분류", () => {
  it("한도·키·시간 초과·그 밖", () => {
    expect(mapGeminiError({ status: 429, message: "x" }, "SECRET-K").code).toBe("AI_RATE_LIMIT");
    expect(mapGeminiError(new Error("RESOURCE_EXHAUSTED quota"), "SECRET-K").code).toBe("AI_RATE_LIMIT");
    expect(mapGeminiError({ status: 403, message: "x" }, "SECRET-K").code).toBe("AI_KEY_INVALID");
    expect(mapGeminiError(new Error("API key not valid"), "SECRET-K").code).toBe("AI_KEY_INVALID");
    expect(mapGeminiError({ name: "AbortError", message: "aborted" }, "SECRET-K").code).toBe("AI_TIMEOUT");
    expect(mapGeminiError(new Error("boom"), "SECRET-K").code).toBe("AI_FAILED");
  });

  it("키 값은 오류 문구에서 가린다", () => {
    const e = mapGeminiError(new Error("failed with SECRET-KEY-123 in url"), "SECRET-KEY-123");
    expect(e.detail).not.toContain("SECRET-KEY-123");
  });
});

describe("POST /api/ask (Gemini는 모의로 바꿔서 검사)", () => {
  const body = (over: Record<string, unknown> = {}) =>
    new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify({ ...buildAskPayload(rows, f({ siteId: "D" }), "D가 늦어진 원인과 대응은?"), ...over }),
    });
  const mocked = vi.mocked(callGemini);

  beforeEach(() => {
    delete process.env.GEMINI_MOCK;
    delete process.env.GEMINI_API_KEY;
    mocked.mockReset();
  });
  afterEach(() => {
    delete process.env.GEMINI_MOCK;
    delete process.env.GEMINI_API_KEY;
  });

  it("키가 없으면 AI_KEY_MISSING", async () => {
    const res = await POST(body());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, code: "AI_KEY_MISSING" });
    expect(mocked).not.toHaveBeenCalled();
  });

  it("잘못된 요청은 BAD_REQUEST", async () => {
    process.env.GEMINI_API_KEY = "KEY";
    const res = await POST(body({ question: "" }));
    expect(res.status).toBe(400);
    const res2 = await POST(new Request("http://localhost/api/ask", { method: "POST", body: "깨짐" }));
    expect(res2.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("정상 답변은 허용 범위 밖의 근거를 버리고 돌려준다", async () => {
    process.env.GEMINI_API_KEY = "KEY";
    mocked.mockResolvedValue(
      JSON.stringify({
        answer: "기록에 따르면 공급 정상화 후에도 지연이 남아 있습니다.",
        references: [
          { month: "2026-09", siteId: "D", fields: ["issueSummary", "actionPlan"] },
          { month: "2026-09", siteId: "A", fields: ["issueSummary"] },
        ],
      }),
    );
    const res = await POST(body());
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j).toMatchObject({ ok: true, mock: false });
    expect(j.references).toHaveLength(1);
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("한도 초과·시간 초과·형식 오류를 구분해 돌려준다", async () => {
    process.env.GEMINI_API_KEY = "KEY";
    mocked.mockRejectedValueOnce(new AiCallError("AI_RATE_LIMIT", "x"));
    expect((await POST(body())).status).toBe(429);
    mocked.mockRejectedValueOnce(new AiCallError("AI_TIMEOUT", "x"));
    expect((await POST(body())).status).toBe(504);
    mocked.mockResolvedValueOnce("JSON이 아님");
    const res = await POST(body());
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: "AI_FAILED" });
  });

  it("키 값은 응답과 서버 로그에 나오지 않는다", async () => {
    process.env.GEMINI_API_KEY = "SECRET-KEY-XYZ";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocked.mockRejectedValueOnce(new Error("request to https://x?key=SECRET-KEY-XYZ failed"));
    const res = await POST(body());
    const text = await res.text();
    expect(text).not.toContain("SECRET-KEY-XYZ");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET-KEY-XYZ");
    spy.mockRestore();
  });

  it("모의 모드는 mock 표시를 붙이고 Gemini를 부르지 않는다", async () => {
    process.env.GEMINI_MOCK = "1";
    const res = await POST(body());
    const j = await res.json();
    expect(j).toMatchObject({ ok: true, mock: true });
    expect(j.answer).toContain("[모의 응답]");
    expect(mocked).not.toHaveBeenCalled();
  });

  it("모의 오류 모드는 AI_FAILED", async () => {
    process.env.GEMINI_MOCK = "error";
    expect((await POST(body())).status).toBe(502);
  });

  it("자료에 없는 질문(준공일·미수금)은 모의 답도 '알 수 없다'", async () => {
    process.env.GEMINI_MOCK = "1";
    const res = await POST(body({ question: "실제 준공일과 미수금 현황은?" }));
    const j = await res.json();
    expect(j.answer).toContain("알 수 없");
    expect(j.references).toEqual([]);
  });
});
