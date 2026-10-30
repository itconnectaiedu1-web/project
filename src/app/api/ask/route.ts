import { parseAskPayload } from "@/lib/aiPayload";
import { AI_ERROR_MESSAGES, validateAiResponse, type AiErrorCode } from "@/lib/aiResponse";
import { AI_MODEL } from "@/lib/aiPrompt";
import { buildMockAnswer } from "@/lib/aiMock";
import { AiCallError, callGemini, mapGeminiError, scrub } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 200_000;

const STATUS: Record<AiErrorCode, number> = {
  AI_KEY_MISSING: 503,
  AI_KEY_INVALID: 502,
  AI_RATE_LIMIT: 429,
  AI_TIMEOUT: 504,
  AI_FAILED: 502,
  BAD_REQUEST: 400,
};

function fail(code: AiErrorCode) {
  return Response.json({ ok: false, code, message: AI_ERROR_MESSAGES[code] }, { status: STATUS[code] });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return fail("BAD_REQUEST");

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail("BAD_REQUEST");
    body = JSON.parse(text);
  } catch {
    return fail("BAD_REQUEST");
  }
  const payload = parseAskPayload(body);
  if (!payload) return fail("BAD_REQUEST");

  // 개발·자동 검사용 모의 모드. 실제 AI 호출이 아니다.
  const mock = process.env.GEMINI_MOCK;
  if (mock === "error") return fail("AI_FAILED");
  if (mock === "1") {
    const m = buildMockAnswer(payload);
    return Response.json({ ok: true, mock: true, model: "mock", ...m });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fail("AI_KEY_MISSING");

  try {
    const text = await callGemini(apiKey, payload);
    const answer = validateAiResponse(text, payload);
    if (!answer) throw new AiCallError("AI_FAILED", "답변 형식 오류");
    return Response.json({ ok: true, mock: false, model: AI_MODEL, ...answer });
  } catch (e) {
    const err = mapGeminiError(e, apiKey);
    // 서버 콘솔에만 남긴다. 키는 가려서 기록하고 화면에는 보내지 않는다.
    console.error(`[ask] AI 호출 실패 code=${err.code} detail=${scrub(err.detail, apiKey)}`);
    return fail(err.code);
  }
}
