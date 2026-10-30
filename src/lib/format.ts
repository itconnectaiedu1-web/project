export const NA = "계산 불가";

/** 소수 첫째 자리로 반올림(0.05 이상 올림). 계산 오차를 먼저 정리하고, -0은 0으로 만든다. */
export function round1(x: number): number {
  const scaled = Number((x * 10).toPrecision(12));
  const r = Math.sign(scaled) * Math.round(Math.abs(scaled));
  return (r === 0 ? 0 : r) / 10;
}

const nf = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 424,063.4 처럼 천 단위 쉼표와 소수 첫째 자리 */
export function fmtNum(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return NA;
  return nf.format(round1(x));
}

export function fmtPct(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return NA;
  return `${nf.format(round1(x))}%`;
}

/** 공정차이: 음수는 -, 양수는 +, 0은 부호 없음 */
export function fmtPp(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return NA;
  const r = round1(x);
  const sign = r > 0 ? "+" : "";
  return `${sign}${nf.format(r)}pp`;
}

/** CSV용: 쉼표 없는 소수 첫째 자리 */
export function plain1(x: number): string {
  return round1(x).toFixed(1);
}
