/**
 * The world has a past (owner, Oct 14, 2026): the records of what happened
 * before day one, kept in one module so other engines read them by id.
 *
 * - `laws`: each law row's history (enactment, body, session, roll call,
 *   sponsor, signer, amendments), keyed `law-history:<law row id>`.
 * - `bills`: each body's recorded votes of the prior term, the bills behind
 *   them, and who sponsored them.
 * - `elections`: the election that seated each officeholder, with both
 *   candidates, the votes, turnout and the town's voter groups' split.
 * - `closures`: each business of the town that closed in the year before day
 *   one, with its kind, former owner, workers and date.
 * - `figures`: what the public knows about each public figure: office,
 *   positions, record, prior election and the reputation a public sees.
 *
 * The votes themselves go to the record engine's table and the promises to
 * the campaigns engine's, where voting reads them; the archive goes to the
 * news engine's stories. Nothing here is decided in play: who existed and
 * what happened is generated once from the world's seed, and every choice in
 * it (a vote, a split) follows a person's or group's recorded lean.
 */
import { createHash } from "node:crypto";
import rows from "./data/past/parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import { registerModule } from "./state";
import type { CoreAPI, CoreModule, CoreState } from "./types";
import type { ModuleRow } from "./module-data";

export const PAST_MODULE_ID = "core2-past-v1";

const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

/** A past parameter's value, registering its stopgap when it carries one. */
export function pastParameter(api: CoreAPI | null, key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown past parameter: ${key}`);
  if (row.stopgapId) api?.stopgap(row.stopgapId);
  return row.value;
}

export const PAST_MODULE: CoreModule = {
  id: PAST_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      laws: { indexes: { byLaw: { fields: ["lawId"] } } },
      bills: { indexes: { byBody: { fields: ["body"] } } },
      elections: { indexes: { bySeat: { fields: ["seatId"] } } },
      figures: { indexes: { byPerson: { fields: ["personId"] } } },
      closures: { indexes: { byOwner: { fields: ["ownerId"] } } },
      loaded: {},
    },
  },
};

export function openPastModule(core: CoreState): void {
  if (!core.modules.has(PAST_MODULE_ID)) registerModule(core, PAST_MODULE);
}

export function pastTable(api: CoreAPI, name: string) {
  return api.moduleState(PAST_MODULE_ID).table(name);
}

export function putPast(api: CoreAPI, name: string, row: object): void {
  pastTable(api, name).put(row as unknown as ModuleRow);
}

/**
 * A number in [0, 1) fixed by the world's seed and a key: generation of who
 * existed and what happened before day one, never a choice in play.
 */
export function seededUnit(seed: string, key: string): number {
  const hex = createHash("sha256").update(`${seed}:${key}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16) / 0x1_0000_0000;
}

/** A value inside [low, high], fixed by the seed and key. */
export function seededBetween(
  seed: string,
  key: string,
  low: number,
  high: number,
): number {
  return low + (high - low) * seededUnit(seed, key);
}

export function shiftDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** A candidate in a past election: a person in the world, or a named identity. */
export interface PastCandidate {
  readonly personId: string | null;
  readonly name: string;
  readonly party: string | null;
  readonly lean: number;
  readonly votes: number;
  readonly share: number;
  readonly incumbent: boolean;
}

export interface PastElectionRow {
  readonly id: string;
  readonly seatId: string;
  readonly officeId: string;
  readonly date: string;
  readonly termId: string;
  readonly winnerId: string;
  readonly candidates: readonly PastCandidate[];
  readonly totalVotes: number;
  /** The town's voter groups: their ballots and the winner's share of them. */
  readonly townGroups: readonly {
    readonly groupId: string;
    readonly ballots: number;
    readonly winnerShare: number;
  }[];
  readonly promiseIds: readonly string[];
  /** The questions those promises spoke to, in the same order. */
  readonly promiseQuestions: readonly string[];
  readonly source: { readonly tag: string; readonly citation: string };
}

export interface RollCall {
  readonly body: string;
  readonly yes: number;
  readonly no: number;
  /** Members of the world who voted, by person id. */
  readonly yesIds: readonly string[];
  readonly noIds: readonly string[];
  /** Seats then held by people who left before day one. */
  readonly predecessors: number;
}

export interface PastBillRow {
  readonly id: string;
  readonly body: string;
  readonly date: string;
  readonly question: string;
  readonly position: number;
  readonly sponsorId: string | null;
  readonly sponsorName: string;
  readonly rollCall: RollCall;
  readonly passed: boolean;
  /** The law row this bill enacted, where it is a law in force. */
  readonly lawIds: readonly string[];
}

export interface LawHistoryRow {
  readonly id: string;
  readonly lawId: string;
  readonly lawIds: readonly string[];
  readonly jurisdiction: string;
  readonly level: string;
  readonly series: string;
  readonly effectiveDate: string;
  readonly enactedOn: string;
  readonly enactedFrom: "effective-date" | "undated";
  readonly body: string;
  readonly session: Readonly<Record<string, string>>;
  readonly billId: string;
  readonly rollCalls: readonly RollCall[];
  readonly sponsorId: string | null;
  readonly sponsorName: string;
  readonly signedBy: string | null;
  readonly signerName: string;
  readonly amends: string | null;
  readonly amendedBy: string | null;
  readonly source: { readonly tag: string; readonly citation: string };
}

export interface PublicFigureRow {
  readonly id: string;
  readonly personId: string;
  readonly officeId: string;
  readonly seatId: string;
  /** Who would know: everyone, a state, or the town (a place id). */
  readonly scope: string;
  readonly party: string | null;
  readonly serviceStart: string;
  readonly positions: readonly { question: string; position: number }[];
  readonly reputation: readonly { trait: string; strength: number }[];
  readonly votesOnRecord: number;
  readonly lawsSponsored: number;
  readonly lawsSigned: number;
  readonly electionId: string | null;
  readonly promiseIds: readonly string[];
}

/** A law row's history, by the law row's id. */
export function lawHistory(
  api: CoreAPI,
  lawId: string,
): LawHistoryRow | undefined {
  if (!api.state.modules.has(PAST_MODULE_ID)) return undefined;
  return (
    pastTable(api, "laws").query("byLaw", [lawId]) as unknown as
      LawHistoryRow[] | undefined
  )?.[0];
}

/** The elections that seated a seat's holders before day one, oldest first. */
export function priorElections(
  api: CoreAPI,
  seatId: string,
): readonly PastElectionRow[] {
  if (!api.state.modules.has(PAST_MODULE_ID)) return [];
  return (
    pastTable(api, "elections").query("bySeat", [
      seatId,
    ]) as unknown as PastElectionRow[]
  )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** A body's recorded bills of the prior term. */
export function pastBills(api: CoreAPI, body: string): readonly PastBillRow[] {
  if (!api.state.modules.has(PAST_MODULE_ID)) return [];
  return pastTable(api, "bills").query("byBody", [
    body,
  ]) as unknown as PastBillRow[];
}
