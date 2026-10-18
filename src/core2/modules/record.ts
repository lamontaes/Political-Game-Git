/**
 * The record follows you (golden path step 11, M4-06): every officeholder's
 * votes, promises and what came of them stay on the record, and the next
 * election reads it.
 *
 * - Promises come from campaign speeches (`campaigns.ts` records them).
 * - Votes come from the bodies that vote: councils, legislatures and their
 *   committees call `recordVote` (M3 wires councils; until then nothing else
 *   writes votes).
 * - A promise is kept when a later vote on the same question goes the
 *   promised way, broken when it goes the other way, open otherwise.
 *
 * A voter who knows an incumbent weighs the record for their own reasons: how
 * close each vote sits to their own view of that question, and, for a promise
 * they heard and agreed with, whether it was kept. Each part of that is kept
 * on the voter's ballot as a reason. An attack ad carries a rival's record to
 * the people it reaches.
 */
import { declareSnapshotCovered } from "../snapshot";
import { votesAreTownNews } from "./officials";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter, type Stance } from "../campaign-views";
import { viewOn } from "./views";
import { CAMPAIGNS_MODULE_ID, type PromiseRow } from "./campaigns";

export const RECORD_MODULE_ID = "core2-record-v1";

export interface VoteRecordRow {
  readonly id: string;
  readonly personId: string;
  readonly date: string;
  readonly body: string;
  readonly measureId: string;
  readonly stance: Stance;
  readonly passed: boolean | null;
}

export interface PromiseStatus {
  readonly promise: PromiseRow;
  readonly status: "kept" | "broken" | "open";
  readonly voteId: string | null;
}

/** One record item as one voter weighs it. */
export interface RecordReason {
  readonly kind: "vote" | "kept-promise" | "broken-promise";
  readonly itemId: string;
  readonly question: string;
  readonly effect: number;
}

export const RECORD_MODULE: CoreModule = {
  id: RECORD_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      votes: { indexes: { byPerson: { fields: ["personId"] } } },
    },
  },
};

export function openRecord(core: CoreState): void {
  if (!core.modules.has(RECORD_MODULE_ID)) registerModule(core, RECORD_MODULE);
}

/** A body's vote, on the record: who, on what question, which way. */
export function recordVote(
  api: CoreAPI,
  vote: Omit<VoteRecordRow, "id" | "date">,
): VoteRecordRow {
  const row: VoteRecordRow = {
    ...vote,
    id: `vote:${vote.measureId}:${vote.personId}`,
    date: api.state.date,
  };
  api
    .moduleState(RECORD_MODULE_ID)
    .table("votes")
    .put(row as unknown as ModuleRow);
  // A member from elsewhere (a state legislator or member of Congress whose
  // seat doesn't cover the town, a person or not) is on the record above; the
  // roll call's own story carries the count, so their vote is not a separate
  // story in every town.
  if (
    !api.state.people.has(vote.personId) ||
    !votesAreTownNews(api, vote.personId)
  )
    return row;
  api.emit({
    id: `vote-recorded:${row.id}`,
    date: row.date,
    kind: "vote-recorded",
    personIds: [vote.personId],
    placeId: [...(api.state as CoreState).visiblePlaceIds][0] ?? "",
    source: {
      tag: "SOURCED",
      citation: `${vote.body} vote on ${vote.measureId}`,
      asOf: row.date,
    },
    publicRecord: true,
    facts: {
      measureId: vote.measureId,
      question: vote.stance.question,
      position: String(vote.stance.position),
    },
  });
  return row;
}

export function votesOf(
  api: CoreAPI,
  personId: string,
): readonly VoteRecordRow[] {
  if (!api.state.modules.has(RECORD_MODULE_ID)) return [];
  return (
    api
      .moduleState(RECORD_MODULE_ID)
      .table("votes")
      .query("byPerson", [personId]) as unknown as VoteRecordRow[]
  )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Each promise an officeholder made, and whether their votes since kept it. */
export function promisesOf(
  api: CoreAPI,
  personId: string,
): readonly PromiseStatus[] {
  const promises = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? (api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("promises")
        .query("byCandidate", [personId]) as unknown as PromiseRow[])
    : [];
  const votes = votesOf(api, personId);
  return promises.map((promise) => {
    const later = votes.filter(
      (v) =>
        v.date >= promise.date && v.stance.question === promise.stance.question,
    );
    const last = later[later.length - 1];
    if (!last) return { promise, status: "open", voteId: null };
    return {
      promise,
      status:
        Math.sign(last.stance.position) === Math.sign(promise.stance.position)
          ? "kept"
          : "broken",
      voteId: last.id,
    };
  });
}

/**
 * How one voter weighs an officeholder's record, if they know the
 * officeholder: each vote by how far it goes their own way on its question
 * (their own stance times the vote's position: a vote they'd have cast counts
 * for, one against their view counts against, and a question they hold no
 * view on barely counts); each promise they heard and agreed with, kept or
 * broken. The record is an average, not a sum: a long record weighs more
 * than a short one only by how much more the voter has to go on, leveling
 * off (`recordFamiliarityItems`), so it stays within the size of a voter's
 * other reasons. Each item's share of the total is kept as a reason.
 */
export function recordAppeal(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  officeholderId: string,
  lean: number,
  knows: boolean,
  /** An ad or news story that puts the public record in front of them, promises included. */
  shown = false,
): { readonly total: number; readonly reasons: readonly RecordReason[] } {
  if (!knows) return { total: 0, reasons: [] };
  const votes = votesOf(api, officeholderId);
  const promises = promisesOf(api, officeholderId).filter((status) => {
    if (status.status === "open") return false;
    // A promise only counts with a voter who heard it made.
    if (!shown && !api.knows(voter.id, status.promise.id)) return false;
    const own = viewOn(api, voter.id, status.promise.stance.question, lean);
    return (
      Math.sign(own) === Math.sign(status.promise.stance.position) && own !== 0
    );
  });
  if (!votes.length && !promises.length) return { total: 0, reasons: [] };
  // Each vote's share: the average over the votes, by how much the record
  // gives the voter to go on. A promise they heard made and saw kept or
  // broken they know in full: promises average among themselves.
  const voteShare =
    1 / (votes.length + campaignParameter("recordFamiliarityItems"));
  const promiseShare = 1 / Math.max(1, promises.length);
  const weight = campaignParameter("recordVoteWeight");
  const reasons: RecordReason[] = [];
  for (const vote of votes)
    reasons.push({
      kind: "vote",
      itemId: vote.id,
      question: vote.stance.question,
      effect:
        weight *
        voteShare *
        viewOn(api, voter.id, vote.stance.question, lean) *
        vote.stance.position,
    });
  for (const status of promises)
    reasons.push({
      kind: status.status === "kept" ? "kept-promise" : "broken-promise",
      itemId: status.promise.id,
      question: status.promise.stance.question,
      effect:
        promiseShare *
        campaignParameter(
          status.status === "kept"
            ? "keptPromiseWeight"
            : "brokenPromiseWeight",
        ),
    });
  return { total: reasons.reduce((sum, r) => sum + r.effect, 0), reasons };
}

export { coreAPI };

// Every table this engine keeps is in the snapshot; see scripts/core2-guard/snapshot-roundtrip.mjs.
declareSnapshotCovered("core2-record-v1");
