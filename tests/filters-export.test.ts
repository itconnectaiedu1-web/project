import { describe, expect, it } from "vitest";
import { applyFilterChange, defaultFilters, siteChoices, monthOptions, regionOptions, typeOptions } from "@/lib/filters";
import { buildCsv, csvFileName, EXPORT_COMPUTED_HEADERS } from "@/lib/exportCsv";
import { parseCsvText } from "@/lib/parse";
import { FIELDS, ALL, type Filters } from "@/lib/types";
import { loadRows } from "./helpers";

const rows = loadRows();
const f = (over: Partial<Filters> = {}): Filters => ({ month: "2026-09", region: ALL, projectType: ALL, siteId: ALL, ...over });

describe("필터", () => {
  it("처음에는 2026-09·전체", () => {
    expect(defaultFilters(rows)).toEqual({ month: "2026-09", region: "all", projectType: "all", siteId: "all" });
  });

  it("월 12개, 지역 7개, 유형 5개", () => {
    expect(monthOptions(rows)).toHaveLength(12);
    expect(regionOptions(rows)).toEqual(["인천", "경기", "충남", "충북", "세종", "강원", "대전"]);
    expect(typeOptions(rows)).toHaveLength(5);
  });

  it("인천·공동주택이면 현장 선택에 A, G만 나온다", () => {
    expect(siteChoices(rows, "인천", "공동주택").map((s) => s.siteId)).toEqual(["A", "G"]);
  });

  it("지역을 바꿔 고른 현장이 범위에서 빠지면 현장을 전체로 되돌린다", () => {
    const r = applyFilterChange(rows, f({ siteId: "D" }), { region: "인천" });
    expect(r.filters.siteId).toBe("all");
    expect(r.siteReset).toBe(true);
    expect(r.filters.region).toBe("인천");
  });

  it("범위에 남아 있으면 현장을 유지한다", () => {
    const r = applyFilterChange(rows, f({ siteId: "D" }), { region: "경기" });
    expect(r.filters.siteId).toBe("D");
    expect(r.siteReset).toBe(false);
  });

  it("월만 바꾸면 현장을 건드리지 않는다", () => {
    const r = applyFilterChange(rows, f({ siteId: "D" }), { month: "2026-07" });
    expect(r.filters.siteId).toBe("D");
  });
});

describe("CSV 내보내기", () => {
  const parse = (text: string) => parseCsvText(text).map((r) => r.cells);

  it("BOM, 열 19개, 9월 전체는 데이터 12행", () => {
    const { text, dataRows } = buildCsv(rows, f());
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain("\r\n");
    const t = parse(text);
    expect(dataRows).toBe(12);
    expect(t).toHaveLength(13);
    expect(t[0]).toEqual([...FIELDS, ...EXPORT_COMPUTED_HEADERS]);
    expect(t[0]).toHaveLength(19);
  });

  it("9월 D만 고르면 데이터 1행, 계산 열은 69.4 · -10.7 · 점검 · 3339.6", () => {
    const { text, dataRows } = buildCsv(rows, f({ siteId: "D" }));
    expect(dataRows).toBe(1);
    const t = parse(text);
    expect(t).toHaveLength(2);
    expect(t[1].slice(15)).toEqual(["69.4", "-10.7", "점검", "3339.6"]);
    expect(t[1][1]).toBe("D");
  });

  it("9월 인천·공동주택이면 A, G 2행", () => {
    const { text, dataRows } = buildCsv(rows, f({ region: "인천", projectType: "공동주택" }));
    expect(dataRows).toBe(2);
    expect(parse(text).slice(1).map((r) => r[1])).toEqual(["A", "G"]);
  });

  it("2025-10은 당월기성액이 '계산 불가'", () => {
    const t = parse(buildCsv(rows, f({ month: "2025-10", siteId: "A" })).text);
    expect(t[1][18]).toBe("계산 불가");
  });

  it("J의 7월 당월기성액은 0.0", () => {
    const t = parse(buildCsv(rows, f({ month: "2026-07", siteId: "J" })).text);
    expect(t[1][18]).toBe("0.0");
  });

  it("원본 15개 열은 가져온 값 그대로 (쉼표·한글 포함)", () => {
    const t = parse(buildCsv(rows, f({ siteId: "D" })).text);
    const src = rows.find((r) => r.month === "2026-09" && r.siteId === "D")!;
    expect(t[1].slice(0, 15)).toEqual(FIELDS.map((k) => src.raw[k]));
    expect(t[1][11]).toBe("외장·내부마감");
  });

  it("범위에 자료가 없으면 0행", () => {
    expect(buildCsv(rows, f({ region: "인천", projectType: "생산시설" })).dataRows).toBe(0);
  });

  it("파일 이름에 범위가 들어간다", () => {
    expect(csvFileName(f({ siteId: "D" }))).toBe("현장공정기성_2026-09_전체지역_전체유형_현장D.csv");
  });
});
