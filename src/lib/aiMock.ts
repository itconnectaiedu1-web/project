import type { AskPayload } from "./aiPayload";
import type { AiAnswer } from "./aiResponse";

/** 키 없이 화면과 자동 검사를 확인하기 위한 모의 답변. 실제 AI가 아니다. */
export function buildMockAnswer(payload: AskPayload): AiAnswer {
  const q = payload.question;
  if (/준공일|미수금|수금|예측/.test(q)) {
    return {
      answer:
        "[모의 응답] 실제 준공일과 미수금은 자료에 없어 알 수 없습니다. 자료에 있는 준공일은 계약상 준공일(예정 일정)이며 실제 완료일이나 예측이 아닙니다.",
      references: [],
    };
  }
  const worst = [...payload.computed.sites].sort((a, b) => a.gap - b.gap)[0];
  if (!worst) {
    return { answer: "[모의 응답] 선택한 범위에 전달된 자료가 없습니다.", references: [] };
  }
  return {
    answer: `[모의 응답] ${payload.scope.month} 기준 공정차이가 가장 큰 현장은 ${worst.siteId}(${worst.gap}pp, ${worst.status})입니다. 기록된 상황과 대응 계획은 아래 근거 항목을 확인하세요.`,
    references: [
      { month: payload.scope.month, siteId: worst.siteId, fields: ["issueSummary", "actionPlan", "metrics"] },
    ],
  };
}
