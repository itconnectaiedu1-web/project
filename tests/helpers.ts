import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFile } from "@/lib/parse";
import { validateParsed, validateFatal, type ValidationResult } from "@/lib/validate";
import type { SiteRow } from "@/lib/types";

const DATA = join(process.cwd(), "data");

/** data 폴더의 파일은 읽기만 한다 */
export function readData(...parts: string[]): string {
  return readFileSync(join(DATA, ...parts), "utf8");
}

export function validateText(fileName: string, text: string): ValidationResult {
  const parsed = parseFile(fileName, text);
  if ("fatal" in parsed && !("kind" in parsed)) return validateFatal(parsed.fatal);
  return validateParsed(parsed as Exclude<typeof parsed, { fatal: string }>);
}

export function loadRows(fileName = "현장공정기성.csv"): SiteRow[] {
  const res = validateText(fileName, readData(fileName));
  if (!res.ok) throw new Error(`정상 자료가 거부됨: ${JSON.stringify(res.issues.slice(0, 3))}`);
  return res.rows;
}
