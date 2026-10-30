import { GoogleGenAI, Type } from "@google/genai";
import type { AskPayload } from "./aiPayload";
import { AI_MODEL, SYSTEM_INSTRUCTION, buildUserContents } from "./aiPrompt";
import type { AiErrorCode } from "./aiResponse";

export const AI_TIMEOUT_MS = 20_000;

export class AiCallError extends Error {
  constructor(
    public code: AiErrorCode,
    public detail: string,
  ) {
    super(code);
  }
}

/** 키 값이 오류 문구에 섞여 나가지 않게 가린다 */
export function scrub(text: string, key: string): string {
  return key ? text.split(key).join("***") : text;
}

export function mapGeminiError(e: unknown, key: string): AiCallError {
  if (e instanceof AiCallError) return e;
  const err = e as { status?: number; code?: number; message?: string; name?: string } | undefined;
  const status = Number(err?.status ?? err?.code ?? 0);
  const msg = scrub(String(err?.message ?? err ?? ""), key).slice(0, 300);
  if (err?.name === "AbortError") return new AiCallError("AI_TIMEOUT", msg);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg)) return new AiCallError("AI_RATE_LIMIT", msg);
  if (status === 401 || status === 403 || /API.?KEY|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg)) {
    return new AiCallError("AI_KEY_INVALID", msg);
  }
  return new AiCallError("AI_FAILED", msg);
}

/** Gemini를 한 번 호출해 답변 글자(JSON)를 돌려준다. 서버에서만 부른다. */
export async function callGemini(apiKey: string, payload: AskPayload): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model: AI_MODEL,
        contents: buildUserContents(payload),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              references: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.STRING },
                    siteId: { type: Type.STRING },
                    fields: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["month", "siteId", "fields"],
                },
              },
            },
            required: ["answer", "references"],
          },
          temperature: 0.2,
          abortSignal: controller.signal,
        },
      }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new AiCallError("AI_TIMEOUT", "timeout")));
      }),
    ]);
    const text = res.text;
    if (!text) throw new AiCallError("AI_FAILED", "빈 응답");
    return text;
  } catch (e) {
    throw mapGeminiError(e, apiKey);
  } finally {
    clearTimeout(timer);
  }
}
