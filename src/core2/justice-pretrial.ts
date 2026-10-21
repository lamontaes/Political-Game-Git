/**
 * Waiting for trial. A charged defendant who does not plead waits for the
 * trial date at home if they can post bail, and in custody if they cannot.
 * Where the place has ended cash bail, nobody waits in custody for want of
 * money. One reader for every place: the law comes from the laws engine.
 */
import type { ModuleRow } from "./module-data";
import { justiceParameter } from "./justice-law";
import { holdInCustody, releaseFromCustody } from "./justice-custody";
import { lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import type { CoreAPI, PersonId } from "./types";

export const END_CASH_BAIL =
  "us-policy-positions:justice-public-safety.end-cash-bail";

export interface PretrialRow {
  readonly id: string;
  readonly caseId: string;
  readonly personId: PersonId;
  readonly bailMinor: number;
  readonly liquidMinor: number;
  /** The statute that ended bail, when one governs. */
  readonly lawId: string | null;
  readonly decision: "held" | "posted" | "released-no-bail-law";
  readonly from: string;
  readonly status: "waiting" | "released";
  readonly priorEligible: boolean | null;
}

const rows = (api: CoreAPI, table: string, moduleId: string) =>
  api.moduleState(moduleId).table(table);

/** Decide how a defendant waits for trial; reads the bail law and their cash. */
export function decidePretrial(
  api: CoreAPI,
  moduleId: string,
  caseId: string,
  personId: PersonId,
): PretrialRow | null {
  const person = api.state.people.get(personId);
  if (!person?.alive) return null;
  const law = api.state.modules.has(LAWS_MODULE_ID)
    ? lawInForce(api, END_CASH_BAIL)
    : null;
  const ended = law?.value === 1 && !!law.governing;
  const bailMinor = justiceParameter(api, "pretrialBailMinor");
  const liquidMinor = person.liquidMinor ?? 0;
  const decision: PretrialRow["decision"] = ended
    ? "released-no-bail-law"
    : liquidMinor >= bailMinor
      ? "posted"
      : "held";
  const prior = decision === "held" ? holdInCustody(api, personId) : undefined;
  const row: PretrialRow = {
    id: `pretrial:${caseId}`,
    caseId,
    personId,
    bailMinor,
    liquidMinor,
    lawId: ended ? law!.governing!.id : null,
    decision,
    from: api.state.date,
    status: decision === "held" ? "waiting" : "released",
    priorEligible: prior ?? null,
  };
  rows(api, "pretrial", moduleId).put(row as unknown as ModuleRow);
  return row;
}

/** The trial opens or the case ends: a defendant held for want of bail goes home. */
export function endPretrial(
  api: CoreAPI,
  moduleId: string,
  caseId: string,
): void {
  const table = rows(api, "pretrial", moduleId);
  const row = table.get(`pretrial:${caseId}`) as unknown as
    PretrialRow | undefined;
  if (!row || row.status !== "waiting") return;
  if (api.state.people.has(row.personId))
    releaseFromCustody(api, row.personId, row.priorEligible ?? undefined);
  table.put({ ...row, status: "released" } as unknown as ModuleRow);
}
