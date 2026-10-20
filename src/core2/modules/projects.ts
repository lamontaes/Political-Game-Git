/**
 * Public projects (office-cut-a-ribbon-needs-a-record-of). A government's
 * budget line that buys capital work is awarded to one of the town's firms for
 * the fiscal year (contracts.ts), and the treasury pays that firm each month.
 * That award is the project: it is built while its fiscal year runs, and it
 * is finished on the day the next fiscal year's budget takes over. A finished
 * project that was paid for is read by the office day, which offers the
 * officeholder its ribbon-cutting for a while after.
 *
 * Nothing is stored for the project itself: its cost, contractor and payment
 * records are the award's, and its dates are the budgets'. The only record
 * this module keeps is the ribbon (who cut it, and when).
 */
import rows from "../data/projects/parameters.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "../kernel/dates";
import { registerModule } from "../state";
import { declareSnapshotCovered } from "../snapshot";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import { BUDGETS_MODULE_ID, budgetsOf, governments } from "./budgets";
import { contractsOf, type ContractAwardRow } from "./contracts";
import { ownerOf } from "./business";
import { lawChain } from "./laws";

export const PROJECTS_MODULE_ID = "core2-public-projects-v1";
export const PROJECT_PARAMETERS = rows.parameters;
const LINES = new Set<string>(rows.lines);
const LOCAL = new Set(["city", "county"]);

export interface ProjectRow {
  readonly id: string;
  readonly governmentId: string;
  readonly line: string;
  readonly fiscalYear: number;
  readonly contractorId: string;
  readonly startedOn: string;
  readonly finishedOn: string;
  /** What the treasury has paid the contractor for it, in minor units. */
  readonly paidMinor: number;
  readonly paymentIds: readonly string[];
}

export interface RibbonRow {
  readonly id: string;
  readonly projectId: string;
  readonly cutBy: string;
  readonly cutOn: string;
}

const table = (api: CoreAPI) =>
  api.moduleState(PROJECTS_MODULE_ID).table("ribbons");

/** The projects a government has finished and paid for, newest first. */
export function finishedProjects(
  api: CoreAPI,
  governmentId: string,
): readonly ProjectRow[] {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return [];
  const budgets = budgetsOf(api, governmentId);
  const out: ProjectRow[] = [];
  for (const award of contractsOf(api, governmentId)) {
    if (!LINES.has(award.line)) continue;
    const next = budgets.find((b) => b.fiscalYear === award.fiscalYear + 1);
    if (!next || next.startsOn > api.state.date) continue;
    if (award.paidMinor < PROJECT_PARAMETERS.projectMinimumPaidMinor.value)
      continue;
    out.push(projectOf(award, next.startsOn));
  }
  return out.sort((a, b) => b.finishedOn.localeCompare(a.finishedOn));
}

function projectOf(award: ContractAwardRow, finishedOn: string): ProjectRow {
  return {
    id: award.id,
    governmentId: award.governmentId,
    line: award.line,
    fiscalYear: award.fiscalYear,
    contractorId: award.organizationId,
    startedOn: award.awardedOn,
    finishedOn,
    paidMinor: award.paidMinor,
    paymentIds: award.paymentIds,
  };
}

/** Whether a project's ribbon has been cut. */
export function ribbonOf(
  api: CoreAPI,
  projectId: string,
): RibbonRow | undefined {
  return api.state.modules.has(PROJECTS_MODULE_ID)
    ? (table(api).get(projectId) as unknown as RibbonRow | undefined)
    : undefined;
}

/**
 * The finished projects of the town's own governments whose ribbon is still
 * open: finished within the window and not yet cut.
 */
export function ribbonsToCut(api: CoreAPI): readonly ProjectRow[] {
  if (!api.state.modules.has(PROJECTS_MODULE_ID)) return [];
  const today = makeIsoDate(api.state.date);
  const window = PROJECT_PARAMETERS.ribbonWindowDays.value;
  return governments(api)
    .filter((g) => LOCAL.has(g.level))
    .flatMap((g) => finishedProjects(api, g.id))
    .filter(
      (p) =>
        !ribbonOf(api, p.id) &&
        daysBetween(makeIsoDate(p.finishedOn), today) <= window,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * An official cuts a finished project's ribbon: the ceremony is a public
 * record and a news item naming the project, its contractor and the official,
 * and the contractor's owner is there. Returns the ribbon, or null when the
 * project is not open for one.
 */
export function cutRibbon(
  api: CoreAPI,
  input: { projectId: string; cutBy: string },
): RibbonRow | null {
  const project = ribbonsToCut(api).find((p) => p.id === input.projectId);
  if (!project) return null;
  const row: RibbonRow = {
    id: project.id,
    projectId: project.id,
    cutBy: input.cutBy,
    cutOn: api.state.date,
  };
  table(api).put(row as unknown as ModuleRow);
  const owner = ownerOf(api, project.contractorId);
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: `Public project ${project.id}: the ${project.line} work of fiscal year ${project.fiscalYear}, paid for from the treasury to ${project.contractorId}.`,
    estimatedFrom: "The contract award and its recorded payments.",
  };
  api.emit({
    id: `ribbon-cut:${project.id}`,
    date: api.state.date,
    kind: "ribbon-cut",
    // The owner stands there too when they are a full person; a counted owner is only named in the facts.
    personIds: [
      input.cutBy,
      ...(owner && api.state.people.has(owner) ? [owner] : []),
    ],
    placeId: lawChain(api).townPlaceId,
    source,
    publicRecord: true,
    news: true,
    facts: {
      projectId: project.id,
      line: project.line,
      governmentId: project.governmentId,
      contractorId: project.contractorId,
      ...(owner ? { ownerId: owner } : {}),
      paidMinor: String(project.paidMinor),
    },
  } as unknown as Parameters<CoreAPI["emit"]>[0]);
  return row;
}

export const PROJECTS_MODULE: CoreModule = {
  id: PROJECTS_MODULE_ID,
  state: { schemaVersion: 1, tables: { ribbons: {} } },
};
declareSnapshotCovered(PROJECTS_MODULE.id);

export function openProjects(core: CoreState): void {
  if (!core.modules.has(PROJECTS_MODULE_ID))
    registerModule(core, PROJECTS_MODULE);
}
