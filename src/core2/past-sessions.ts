/**
 * The played state's last regular sitting before day one runs through the real bill engine (owner,
 * Nov 26, 2026, row 14: "Last few sessions"; stand-in SG-HIST-century-law-sessions).
 *
 * The century keeps who sat for that sitting (`pastSessionPlan`: each legislative seat's side after
 * the last even November before it) and drops its own law session for it. Here a small world, the
 * one the state's legislature has in its own tests (the town's state and Congress's offices, the
 * record and the legislature, and only this state's session on the calendar), starts the day the
 * year's sitting begins, seats whoever the century says sat, and the real engine drafts, takes
 * through committee, votes on the floor and puts before the governor what the members file. What it
 * enacts is handed to the day-one world (`applyPastSessionLaws`), dated as the engine dated it. The
 * small world reads the real day-one date for the century, so no second century is run.
 */
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { chamberLabel, pastSessionPlan } from "./electorate-century";
import { enactLaw, LAWS_MODULE_ID, openLaws } from "./modules/laws";
import {
  openOffices,
  OFFICES_MODULE_ID,
  type TermRow,
} from "./modules/offices";
import { openRecord } from "./modules/record";
import { openLegislature } from "./modules/legislature";
import { openWorldLegislating } from "./modules/world-legislating";
import { coreAPI } from "./state";
import { parameter } from "./parameters";
import { pastParameter } from "./past-module";
import type { LawRowInput } from "./laws-starting";
import type { CoreState } from "./types";

/** The laws the engine's sitting enacted, as rows the day-one world can take. */
export function pastSessionLaws(
  seed: string,
  placeKey: string,
  startDate: string,
): readonly LawRowInput[] {
  const plan = pastSessionPlan(seed);
  if (!plan) return [];
  const opens = `${plan.sittingYear}-01-01`;
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey,
      startedAt: opens,
      minimumPeople: pastParameter(null, "pastSessionMinimumPeople"),
    }),
  );
  openLaws(core);
  // The century's day-one date, not the small world's clock, so the century is read once.
  openOffices(core, seed, startDate);
  openRecord(core);
  openLegislature(core);
  const api = coreAPI(core);
  // Whoever the century says sat, seated from the first day.
  const offices = new Map(
    (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    ).map((office) => [office.id, office]),
  );
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  for (const term of terms.rows() as unknown as TermRow[]) {
    const sat = plan.roster.get(term.seatId);
    if (!sat || !offices.get(term.officeId)?.kind.startsWith("legislature-"))
      continue;
    terms.put({
      ...term,
      party: chamberLabel(plan.stateKey, sat.rosterChamber, sat.side),
      startDate: opens,
      endDate: addDays(
        makeIsoDate(plan.adjournAt),
        Math.ceil(parameter("daysPerMeanYear")),
      ),
    } as never);
  }
  openWorldLegislating(core, plan.stateKey);
  const lawsTable = api.moduleState(LAWS_MODULE_ID).table("laws");
  const before = new Set(lawsTable.rows().map((row) => String(row.id)));
  // Through the weeks the governor's desk takes after adjournment (a month).
  advanceCore(
    core,
    addDays(
      makeIsoDate(plan.adjournAt),
      Math.ceil(parameter("daysPerMeanYear") / parameter("monthsPerYear")),
    ),
  );
  return (lawsTable.rows() as unknown as LawRowInput[]).filter(
    (row) => !before.has(row.id),
  );
}

/** The day-one world takes the laws the engine's sitting enacted, dated as they were. */
export function applyPastSessionLaws(
  core: CoreState,
  laws: readonly LawRowInput[],
): void {
  const api = coreAPI(core);
  for (const row of laws)
    enactLaw(api, {
      jurisdiction: row.jurisdiction,
      level: row.level,
      series: row.series,
      value: row.value ?? 0,
      ...(row.unit ? { unit: row.unit } : {}),
      effectiveDate: row.effectiveDate,
      measureId: String(row.terms?.enactedBy ?? row.id),
      citation: row.source,
      ...(row.estimate ? { estimate: true } : {}),
      terms: row.terms,
    });
}
