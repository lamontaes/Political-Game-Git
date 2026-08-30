import * as fs from "fs";
import * as path from "path";
import { validateEducationCorpus } from "./education-corpus";
import type { EducationCorpusSnapshot } from "./types";

let cachedCorpus: EducationCorpusSnapshot | null = null;

export function getCorpusFilePath(): string {
  return path.join(
    process.cwd(),
    "data",
    "education",
    "us-education-corpus.json",
  );
}

export function loadEducationCorpusFromFile(
  filePath?: string,
): EducationCorpusSnapshot {
  const targetPath = filePath ?? getCorpusFilePath();
  if (cachedCorpus && !filePath) {
    return cachedCorpus;
  }
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Education corpus file missing at: ${targetPath}`);
  }
  const raw = fs.readFileSync(targetPath, "utf8");
  const parsed = JSON.parse(raw) as EducationCorpusSnapshot;
  validateEducationCorpus(parsed);
  if (!filePath) {
    cachedCorpus = parsed;
  }
  return parsed;
}
