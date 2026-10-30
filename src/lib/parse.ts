/** 파일에서 읽은 한 건. 검사 전의 값이라 모두 문자열 또는 JSON 원래 값이다. */
export interface RawRecord {
  /** CSV: 파일 줄 번호(머리글이 1행), JSON: 항목 번호(1부터) */
  line: number;
  values: Record<string, unknown>;
}

export interface ParsedFile {
  kind: "csv" | "json";
  columns: string[] | null; // CSV 머리글 (JSON은 null)
  records: RawRecord[];
  metadata: Record<string, unknown> | null;
  fatal: string | null; // 파일 형식 자체가 잘못된 경우
}

/** 따옴표·쉼표·줄바꿈을 처리하는 CSV 읽기. 각 레코드가 시작한 파일 줄 번호를 함께 돌려준다. */
export function parseCsvText(text: string): { line: number; cells: string[] }[] {
  const src = text.replace(/^﻿/, "");
  const out: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let touched = false;

  const endCell = () => {
    cells.push(cell);
    cell = "";
  };
  const endRecord = () => {
    endCell();
    const blank = cells.length === 1 && cells[0] === "" && !touched;
    if (!blank) out.push({ line: recordLine, cells });
    cells = [];
    touched = false;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      touched = true;
    } else if (ch === ",") {
      touched = true;
      endCell();
    } else if (ch === "\r") {
      // \r\n 의 \r 은 무시
    } else if (ch === "\n") {
      endRecord();
      line++;
      recordLine = line;
    } else {
      touched = true;
      cell += ch;
    }
  }
  if (cell !== "" || cells.length > 0 || touched) endRecord();
  return out;
}

export function parseCsvFile(text: string): ParsedFile {
  const table = parseCsvText(text);
  if (table.length === 0) {
    return { kind: "csv", columns: null, records: [], metadata: null, fatal: "파일이 비어 있습니다." };
  }
  const columns = table[0].cells.map((c) => c.trim());
  const records: RawRecord[] = table.slice(1).map((r) => {
    const values: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      values[col] = i < r.cells.length ? r.cells[i] : undefined;
    });
    return { line: r.line, values };
  });
  return { kind: "csv", columns, records, metadata: null, fatal: null };
}

export function parseJsonFile(text: string): ParsedFile {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { kind: "json", columns: null, records: [], metadata: null, fatal: "JSON 형식이 올바르지 않아 읽을 수 없습니다." };
  }
  let list: unknown;
  let metadata: Record<string, unknown> | null = null;
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    list = obj.records;
    if (obj.metadata && typeof obj.metadata === "object") {
      metadata = obj.metadata as Record<string, unknown>;
    }
  }
  if (!Array.isArray(list)) {
    return { kind: "json", columns: null, records: [], metadata, fatal: "JSON에서 records 목록을 찾을 수 없습니다." };
  }
  const records: RawRecord[] = list.map((item, i) => ({
    line: i + 1,
    values: item && typeof item === "object" ? (item as Record<string, unknown>) : {},
  }));
  return { kind: "json", columns: null, records, metadata, fatal: null };
}

/** 이름과 내용으로 CSV·JSON을 구분해 읽는다. */
export function parseFile(fileName: string, text: string): ParsedFile | { fatal: string } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsvFile(text);
  if (lower.endsWith(".json")) return parseJsonFile(text);
  return { fatal: "CSV 또는 JSON 파일만 가져올 수 있습니다." };
}
