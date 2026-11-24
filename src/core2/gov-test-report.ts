/**
 * Where OPUS-GOV's generated-world tests leave their readable record (place,
 * seed, record ids, results): a file in GOV_REPORT_DIR when it's set, the
 * console otherwise.
 */
import { appendFileSync } from "node:fs";
import { join } from "node:path";

export function govReport(name: string, text: string): void {
  const dir = process.env.GOV_REPORT_DIR;
  if (dir) appendFileSync(join(dir, `${name}.jsonl`), `${text}\n`);
  else console.log(text);
}
