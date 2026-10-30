import { describe, expect, it } from "vitest";
import { aggregate, buildIndex, inspectionList, siteTable, statusOf, trend } from "@/lib/metrics";
import { fmtNum, fmtPct, fmtPp, round1 } from "@/lib/format";
import { ALL, type Filters } from "@/lib/types";
import { loadRows } from "./helpers";

const rows = loadRows();
const index = buildIndex(rows);
const f = (over: Partial<Filters> = {}): Filters => ({ month: "2026-09", region: ALL, projectType: ALL, siteId: ALL, ...over });

describe("표시 형식", () => {
  it("소수 첫째 자리 반올림과 단위", () => {
    expect(round1(67.15)).toBe(67.2);
    expect(round1(-0.04)).toBe(0);
    expect(Object.is(round1(-0.04), -0)).toBe(false);
    expect(fmtNum(424063.4)).toBe("424,063.4");
    expect(fmtPct(67.2)).toBe("67.2%");
    expect(fmtPp(-2)).toBe("-2.0pp");
    expect(fmtPp(1.74)).toBe("+1.7pp");
    expect(fmtPp(0)).toBe("0.0pp");
    expect(fmtNum(null)).toBe("계산 불가");
    expect(fmtPct(null)).toBe("계산 불가");
  });
});

describe("상태 판정은 공정차이로만", () => {
  it("경계값", () => {
    expect(statusOf(0)).toBe("정상");
    expect(statusOf(70 - 70)).toBe("정상");
    expect(statusOf(65.1 - 70)).toBe("주의");
    expect(statusOf(65 - 70)).toBe("점검");
    expect(statusOf(-5)).toBe("점검");
    expect(statusOf(-4.99)).toBe("주의");
    expect(statusOf(-0.0001)).toBe("주의");
    // 소수 계산 오차가 있어도 -5.0은 점검
    expect(statusOf(76.3 - 81.3)).toBe("점검");
    expect(statusOf(81.3 - 81.3)).toBe("정상");
  });
});

describe("월별 전체 현장 (검산표)", () => {
  const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  const earned = [105449.7, 125857.8, 148530.2, 173599.9, 202848.9, 233981.1, 266640.0, 300878.0, 335344.9, 364718.5, 395184.7, 424063.4];
  const rate = [16.7, 20.0, 23.6, 27.5, 32.2, 37.1, 42.3, 47.7, 53.2, 57.8, 62.7, 67.2];
  const planned = [19.4, 22.8, 26.9, 31.4, 36.7, 42.4, 48.6, 54.8, 60.7, 65.8, 69.9, 73.2];
  const actual = [19.6, 23.2, 27.0, 31.3, 36.2, 41.6, 47.1, 52.9, 58.3, 63.2, 67.6, 71.2];
  const gap = [0.2, 0.3, 0.2, -0.1, -0.4, -0.8, -1.5, -1.9, -2.4, -2.6, -2.3, -2.0];
  const monthly = [null, 20408.1, 22672.4, 25069.7, 29249.0, 31132.2, 32658.9, 34238.0, 34466.9, 29373.6, 30466.2, 28878.7];
  const counts = [[10, 2, 0], [10, 2, 0], [9, 3, 0], [9, 3, 0], [8, 4, 0], [8, 3, 1], [8, 2, 2], [8, 1, 3], [7, 2, 3], [6, 2, 4], [6, 2, 4], [6, 3, 3]];

  months.forEach((m, i) => {
    it(`${m}`, () => {
      const a = aggregate(rows, f({ month: m }), m, index);
      expect(a.contract).toBe(630700);
      expect(round1(a.earned!)).toBe(earned[i]);
      expect(round1(a.rate!)).toBe(rate[i]);
      expect(round1(a.planned!)).toBe(planned[i]);
      expect(round1(a.actual!)).toBe(actual[i]);
      expect(round1(a.gap!)).toBe(gap[i]);
      expect(a.monthlyEarned === null ? null : round1(a.monthlyEarned)).toBe(monthly[i]);
      expect([a.counts.정상, a.counts.주의, a.counts.점검]).toEqual(counts[i]);
    });
  });

  it("2025-10은 당월기성액이 계산 불가이고 누적액으로 대신하지 않는다", () => {
    const a = aggregate(rows, f({ month: "2025-10" }), "2025-10", index);
    expect(a.monthlyEarned).toBeNull();
    expect(a.prevEarned).toBeNull();
    expect(a.earned).not.toBeNull();
  });
});

describe("2026-09 정답 숫자", () => {
  it("전체", () => {
    const a = aggregate(rows, f(), "2026-09", index);
    expect(fmtPct(a.rate)).toBe("67.2%");
    expect(fmtPct(a.planned)).toBe("73.2%");
    expect(fmtPct(a.actual)).toBe("71.2%");
    expect(fmtPp(a.gap)).toBe("-2.0pp");
    expect(fmtNum(a.monthlyEarned)).toBe("28,878.7");
    expect(fmtNum(a.earned)).toBe("424,063.4");
  });

  it("전체 공정차이는 반올림 전 값으로 계산한다", () => {
    const a = aggregate(rows, f(), "2026-09", index);
    expect(a.gap).toBeCloseTo(a.actual! - a.planned!, 10);
  });

  it("점검 순서 D → I → K", () => {
    const t = siteTable(rows, f(), index);
    expect(t).toHaveLength(12);
    const ins = inspectionList(t);
    expect(ins.map((m) => m.row.siteId)).toEqual(["D", "I", "K"]);
    expect(ins.map((m) => round1(m.gap))).toEqual([-10.7, -7.6, -5.4]);
    expect(t[0].row.siteId).toBe("D");
  });

  it("현장별 값", () => {
    const t = new Map(siteTable(rows, f(), index).map((m) => [m.row.siteId, m]));
    const d = t.get("D")!;
    expect(fmtPct(d.rate)).toBe("69.4%");
    expect(fmtNum(d.monthlyEarned)).toBe("3,339.6");
    expect(d.status).toBe("점검");
    const a = t.get("A")!;
    expect(fmtPp(a.gap)).toBe("+1.7pp");
    expect(fmtPct(a.rate)).toBe("73.8%");
    expect(fmtNum(a.monthlyEarned)).toBe("4,665.6");
    expect(t.get("F")!.status).toBe("주의");
    expect(fmtPct(t.get("F")!.rate)).toBe("60.5%");
    expect(t.get("K")!.status).toBe("점검");
  });

  it("J의 7월 당월기성액은 계산 불가가 아니라 0.0", () => {
    const t = siteTable(rows, f({ month: "2026-07", siteId: "J" }), index);
    expect(t).toHaveLength(1);
    expect(t[0].monthlyEarned).toBe(0);
    expect(fmtNum(t[0].monthlyEarned)).toBe("0.0");
  });

  it("7월은 점검 4곳", () => {
    expect(inspectionList(siteTable(rows, f({ month: "2026-07" }), index))).toHaveLength(4);
  });

  it("D의 최근 공정차이 8월 -11.2pp → 9월 -10.7pp", () => {
    const aug = aggregate(rows, f({ month: "2026-08", siteId: "D" }), "2026-08", index);
    const sep = aggregate(rows, f({ siteId: "D" }), "2026-09", index);
    expect(round1(aug.gap!)).toBe(-11.2);
    expect(round1(sep.gap!)).toBe(-10.7);
  });
});

describe("필터 범위", () => {
  it("지역별 합계", () => {
    const inch = aggregate(rows, f({ region: "인천" }), "2026-09", index);
    expect(inch.siteCount).toBe(2);
    expect(inch.contract).toBe(185100);
    expect(round1(inch.earned!)).toBe(113211.9);
    expect(round1(inch.rate!)).toBe(61.2);
    expect(inch.counts).toEqual({ 정상: 2, 주의: 0, 점검: 0 });
    expect(inspectionList(siteTable(rows, f({ region: "인천" }), index))).toHaveLength(0);
    const gy = aggregate(rows, f({ region: "경기" }), "2026-09", index);
    expect(round1(gy.rate!)).toBe(68.5);
    expect(gy.counts).toEqual({ 정상: 2, 주의: 1, 점검: 1 });
  });

  it("인천·공동주택은 A, G 2곳", () => {
    const t = siteTable(rows, f({ region: "인천", projectType: "공동주택" }), index);
    expect(t.map((m) => m.row.siteId).sort()).toEqual(["A", "G"]);
  });

  it("범위에 현장이 없으면 모두 계산 불가이고 0%가 아니다", () => {
    const a = aggregate(rows, f({ region: "인천", projectType: "생산시설" }), "2026-09", index);
    expect(a.siteCount).toBe(0);
    expect(a.rate).toBeNull();
    expect(a.gap).toBeNull();
    expect(a.monthlyEarned).toBeNull();
    expect(fmtPct(a.rate)).toBe("계산 불가");
  });
});

describe("월별 추이", () => {
  it("선택 월까지만, 매월 따로 집계한다", () => {
    expect(trend(rows, f(), index)).toHaveLength(12);
    expect(trend(rows, f({ month: "2026-07" }), index)).toHaveLength(10);
    const t = trend(rows, f({ month: "2026-07" }), index);
    expect(t[t.length - 1].month).toBe("2026-07");
    expect(round1(t[0].agg.earned!)).toBe(105449.7);
  });

  it("막대의 아랫부분(전월 누적) + 당월 = 누적", () => {
    const a = aggregate(rows, f(), "2026-09", index);
    expect(a.prevEarned! + a.monthlyEarned!).toBeCloseTo(a.earned!, 6);
    expect(round1(a.prevEarned!)).toBe(395184.7);
  });
});
