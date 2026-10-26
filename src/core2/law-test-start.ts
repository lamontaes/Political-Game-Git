/**
 * Law tests that walk a policy from "no" to "yes" and back start from "no":
 * the state's researched answers are law at the opening, so a test repeals
 * the ones in force first (test helper; no play code reads this).
 */
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { enactLaw, LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import { addDays, makeIsoDate } from "./kernel/dates";

export function repealStartingAnswers(core: CoreState): readonly string[] {
  const api = coreAPI(core);
  const rows = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[]
  )
    .filter((r) => r.id.endsWith(":starting") && r.value === 1)
    .sort((a, b) => a.id.localeCompare(b.id));
  const tomorrow = addDays(makeIsoDate(core.date), 1);
  for (const row of rows)
    enactLaw(api, {
      jurisdiction: row.jurisdiction,
      level: row.level,
      series: row.series,
      value: 0,
      effectiveDate: tomorrow,
      measureId: "test-start-from-no",
      citation: "Test setup: start from no",
    });
  if (rows.length) advanceCore(core, addDays(makeIsoDate(tomorrow), 1));
  return rows.map((r) => r.series);
}
