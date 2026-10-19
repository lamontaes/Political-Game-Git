/**
 * Public projects (pool item office-cut-a-ribbon-needs-a-record-of): a budget
 * line that buys from the town's builders becomes a project for the fiscal
 * year. Every payment the treasury makes to a contractor on that line is kept
 * on the project's record, by payment id; when the fiscal year ends the
 * project is finished, a public and newsworthy record the office day reads
 * for a ribbon-cutting. Nothing is rolled: a project is finished by the year
 * it was funded for, with the share of its plan the treasury could pay.
 */
import type { CoreAPI } from "./types";
import type { ModuleRow } from "./module-data";
import { BUDGETS_MODULE_ID, type GovernmentRow } from "./modules/budgets";
import { lawChain } from "./modules/laws";

/** The classification a budget line must buy from to build something. */
const BUILDER = "enterprise:construction";

export interface ProjectRow {
  readonly id: string;
  readonly governmentId: string;
  readonly line: string;
  readonly fiscalYear: number;
  readonly startedOn: string;
  /** What the treasury has paid contractors on the project so far. */
  readonly paidMinor: number;
  /** The contractors paid, by organization id. */
  readonly contractorIds: readonly string[];
  /** The payments to contractors, by id. */
  readonly paymentIds: readonly string[];
  readonly finishedOn: string | null;
  /** The official who cut the ribbon, and the day. */
  readonly openedBy: string | null;
  readonly openedOn: string | null;
}

const table = (api: CoreAPI) =>
  api.moduleState(BUDGETS_MODULE_ID).table("projects");

/** Whether a line's purchases go to builders, from the providers data. */
export function buildsThings(classifications: readonly string[]): boolean {
  return classifications.includes(BUILDER);
}

/** The treasury paid contractors on a line this month: the project grows. */
export function noteProjectWork(
  api: CoreAPI,
  input: {
    readonly gov: GovernmentRow;
    readonly line: string;
    readonly fiscalYear: number;
    readonly date: string;
    readonly payments: readonly {
      readonly id: string;
      readonly orgId: string;
      readonly minor: number;
    }[];
  },
): void {
  const paid = input.payments.filter((p) => p.minor > 0);
  if (!paid.length) return;
  const id = `project:${input.gov.id}:${input.line}:${input.fiscalYear}`;
  const had = table(api).get(id) as unknown as ProjectRow | undefined;
  if (had?.finishedOn) return;
  const row: ProjectRow = {
    id,
    governmentId: input.gov.id,
    line: input.line,
    fiscalYear: input.fiscalYear,
    startedOn: had?.startedOn ?? input.date,
    paidMinor: (had?.paidMinor ?? 0) + paid.reduce((s, p) => s + p.minor, 0),
    contractorIds: [
      ...new Set([...(had?.contractorIds ?? []), ...paid.map((p) => p.orgId)]),
    ].sort(),
    paymentIds: [...(had?.paymentIds ?? []), ...paid.map((p) => p.id)],
    finishedOn: null,
    openedBy: null,
    openedOn: null,
  };
  table(api).put(row as unknown as ModuleRow);
}

/** A government's projects from fiscal years before this one are finished on this close. */
export function finishProjects(
  api: CoreAPI,
  gov: GovernmentRow,
  fiscalYear: number,
  date: string,
): void {
  for (const row of table(api).query("byGovernment", [
    gov.id,
  ]) as unknown as ProjectRow[]) {
    if (row.finishedOn || row.fiscalYear >= fiscalYear) continue;
    table(api).put({ ...row, finishedOn: date } as unknown as ModuleRow);
    api.emit({
      id: `project-finished:${row.id}`,
      date,
      kind: "project-finished",
      personIds: [],
      placeId: lawChain(api).townPlaceId,
      source: {
        tag: "SOURCED",
        citation: `${gov.name}'s ${row.line} line, fiscal year ${row.fiscalYear}: ${row.paymentIds.length} payments to contractors`,
        asOf: date,
      },
      publicRecord: true,
      news: true,
      facts: {
        projectId: row.id,
        governmentId: gov.id,
        level: gov.level,
        line: row.line,
        paidMinor: String(row.paidMinor),
      },
    });
  }
}

/** A government's projects, finished or not. */
export function projectsOf(
  api: CoreAPI,
  governmentId: string,
): readonly ProjectRow[] {
  return [
    ...(table(api).query("byGovernment", [
      governmentId,
    ]) as unknown as ProjectRow[]),
  ].sort((a, b) => a.id.localeCompare(b.id));
}

/** Finished projects nobody has cut the ribbon on yet. */
export function awaitingRibbon(
  api: CoreAPI,
  governmentId: string,
): readonly ProjectRow[] {
  return projectsOf(api, governmentId).filter(
    (row) => row.finishedOn && !row.openedOn,
  );
}

/** An official cuts the ribbon on a finished project; the ceremony is on its record. */
export function cutRibbon(
  api: CoreAPI,
  projectId: string,
  officialId: string,
): ProjectRow | null {
  const row = table(api).get(projectId) as unknown as ProjectRow | undefined;
  if (!row || !row.finishedOn || row.openedOn) return null;
  const next: ProjectRow = {
    ...row,
    openedBy: officialId,
    openedOn: api.state.date,
  };
  table(api).put(next as unknown as ModuleRow);
  api.emit({
    id: `ribbon-cut:${row.id}`,
    date: api.state.date,
    kind: "ribbon-cut",
    personIds: [officialId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Ceremony for ${row.id}, finished ${row.finishedOn}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      projectId: row.id,
      governmentId: row.governmentId,
      line: row.line,
      paidMinor: String(row.paidMinor),
    },
  });
  return next;
}
