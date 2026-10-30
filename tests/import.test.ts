import { describe, expect, it } from "vitest";
import { parseCsvText, parseFile } from "@/lib/parse";
import { readData, validateText, loadRows } from "./helpers";

describe("CSV 읽기", () => {
  it("따옴표·쉼표·줄바꿈·줄 번호를 처리한다", () => {
    const t = parseCsvText('a,b\r\n"x,y","he said ""hi"""\r\n\r\n"줄\n바꿈",z\r\n');
    expect(t[0]).toEqual({ line: 1, cells: ["a", "b"] });
    expect(t[1]).toEqual({ line: 2, cells: ["x,y", 'he said "hi"'] });
    expect(t[2]).toEqual({ line: 4, cells: ["줄\n바꿈", "z"] });
    expect(t).toHaveLength(3);
  });
});

describe("정상 자료 가져오기", () => {
  it("CSV는 144행·15개 열로 통과한다", () => {
    const res = validateText("현장공정기성.csv", readData("현장공정기성.csv"));
    expect(res.issues).toEqual([]);
    expect(res.ok).toBe(true);
    expect(res.rows).toHaveLength(144);
    expect(res.summary).toMatchObject({ rowCount: 144, columnCount: 15, firstMonth: "2025-10", lastMonth: "2026-09", siteCount: 12 });
    expect(res.warnings).toEqual([]);
    expect(res.notes.join(" ")).toContain("메타데이터가 없어");
  });

  it("JSON도 144행으로 통과하고 CSV와 같은 값이다", () => {
    const csv = loadRows("현장공정기성.csv");
    const json = loadRows("현장공정기성.json");
    expect(json).toHaveLength(144);
    const key = (r: { month: string; siteId: string }) => `${r.month}/${r.siteId}`;
    const byKey = new Map(json.map((r) => [key(r), r]));
    for (const c of csv) {
      const j = byKey.get(key(c))!;
      expect(j).toBeDefined();
      expect(j.cumulativeEarned).toBe(c.cumulativeEarned);
      expect(j.plannedProgress).toBe(c.plannedProgress);
      expect(j.issueSummary).toBe(c.issueSummary);
      expect(j.raw.cumulativeEarned).toBe(c.raw.cumulativeEarned);
    }
  });

  it("지원하지 않는 파일 형식은 거부한다", () => {
    const p = parseFile("자료.xlsx", "abc");
    expect("fatal" in p && p.fatal).toContain("CSV 또는 JSON");
  });
});

describe("오류 파일 3종은 거부하고 위치를 알려 준다", () => {
  it("공정률 101 → 파일 134행 범위 오류", () => {
    const res = validateText("오류_공정률101.csv", readData("검증용_오류데이터", "오류_공정률101.csv"));
    expect(res.ok).toBe(false);
    expect(res.rows).toHaveLength(0);
    expect(res.issues).toHaveLength(1);
    expect(res.issues[0]).toMatchObject({ label: "파일 134행", column: "actualProgress", category: "values" });
    expect(res.issues[0].message).toContain("0~100");
  });

  it("공정률 빈값 → 파일 134행 필수값 오류, 0으로 바꾸지 않는다", () => {
    const res = validateText("오류_공정률빈값.csv", readData("검증용_오류데이터", "오류_공정률빈값.csv"));
    expect(res.ok).toBe(false);
    expect(res.issues).toHaveLength(1);
    expect(res.issues[0]).toMatchObject({ label: "파일 134행", column: "actualProgress" });
    expect(res.issues[0].message).toContain("비어 있습니다");
  });

  it("중복 키 → 파일 146행", () => {
    const res = validateText("오류_중복키.csv", readData("검증용_오류데이터", "오류_중복키.csv"));
    expect(res.ok).toBe(false);
    expect(res.issues).toHaveLength(1);
    expect(res.issues[0]).toMatchObject({ label: "파일 146행", category: "duplicate" });
    expect(res.issues[0].message).toContain("2026-09/D");
  });
});

describe("그 밖의 검사", () => {
  const base = readData("현장공정기성.csv");
  const lines = base.split(/\r?\n/);

  const withLine = (n: number, fn: (s: string) => string) => {
    const copy = [...lines];
    copy[n - 1] = fn(copy[n - 1]);
    return copy.join("\n");
  };

  it("계약금액 0은 거부한다 (파일 2행)", () => {
    const res = validateText("a.csv", withLine(2, (s) => s.replace(",86400,", ",0,")));
    expect(res.issues.some((i) => i.label === "파일 2행" && i.column === "contractAmount")).toBe(true);
  });

  it("누적기성액이 줄면 거부한다 (2026-09 A, 파일 134행)", () => {
    const res = validateText("a.csv", withLine(134, (s) => s.replace(",63763.2,", ",1000,")));
    expect(res.issues.some((i) => i.category === "monotonic" && i.label === "파일 134행" && i.column === "cumulativeEarned")).toBe(true);
  });

  it("같은 현장의 지역이 다르면 거부한다", () => {
    const res = validateText("a.csv", withLine(134, (s) => s.replace(",인천,", ",경기,")));
    expect(res.issues.some((i) => i.category === "consistency" && i.column === "region")).toBe(true);
  });

  it("날짜가 올바르지 않으면 거부한다", () => {
    const res = validateText("a.csv", withLine(2, (s) => s.replace("2024-11-01", "2024-13-45")));
    expect(res.issues.some((i) => i.category === "dates" && i.column === "startDate")).toBe(true);
  });

  it("필수 열이 없으면 머리글 오류로 거부한다", () => {
    const res = validateText("a.csv", base.replace("actionPlan", "x"));
    expect(res.ok).toBe(false);
    expect(res.issues[0].category).toBe("columns");
    expect(res.issues[0].message).toContain("actionPlan");
  });

  it("월·현장 일부가 빠진 자료는 경고하고 확인 가능한 행만 쓴다", () => {
    const cut = [lines[0], ...lines.slice(1).filter((l) => !l.startsWith("2026-03,C,"))].join("\n");
    const res = validateText("a.csv", cut);
    expect(res.ok).toBe(true);
    expect(res.rows).toHaveLength(143);
    expect(res.warnings.join(" ")).toContain("1건");
  });

  it("JSON 메타데이터 버전이 다르면 거부한다", () => {
    const j = readData("현장공정기성.json").replace('"schemaVersion": "2.0"', '"schemaVersion": "3.0"');
    const res = validateText("a.json", j);
    expect(res.ok).toBe(false);
    expect(res.issues[0]).toMatchObject({ category: "metadata", column: "schemaVersion" });
  });

  it("JSON 오류는 'N번째 항목'으로 알려 준다", () => {
    const j = JSON.parse(readData("현장공정기성.json"));
    j.records[132].actualProgress = 101;
    const res = validateText("a.json", JSON.stringify(j));
    expect(res.issues[0]).toMatchObject({ label: "133번째 항목", column: "actualProgress" });
  });

  it("깨진 JSON·빈 파일은 거부한다", () => {
    expect(validateText("a.json", "{깨짐").ok).toBe(false);
    expect(validateText("a.csv", "").ok).toBe(false);
    expect(validateText("a.csv", base.split("\n")[0]).ok).toBe(false);
  });
});
