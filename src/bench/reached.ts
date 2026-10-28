import { coreAPI } from "../core2/state";
import { resultOf } from "../core2/modules/voting";
import type { FilingRow } from "../core2/modules/elections";
import type { BallotRow } from "../core2/modules/voting";
import type { BillRow } from "../core2/modules/legislature";
import type { CoreState } from "../core2/types";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import { storyOfReadEvent } from "../core2/modules/news";
import { changesKnownTo } from "../director/bring-it-up";
import { reachedBy } from "../core2/law-reach/host";

const has = (core: CoreState, id: string) => core.modules.has(id);

export interface TookEffectFacts {
  lawId: string;
  series?: string;
}

/**
 * Step 9's evidence: for each enacted bill whose law took effect, the records
 * of another engine reading that law (who it reached). A law that took effect
 * and was read by no one yields nothing, so the step is not reached.
 */
export function townReads(
  enacted: readonly { id: string; number: number | string }[],
  tookEffect: readonly TookEffectFacts[],
  readers: (facts: TookEffectFacts) => readonly { personId: string }[],
): string[] {
  return enacted.flatMap((bill) =>
    tookEffect
      .filter((facts) => facts.lawId.endsWith(`:${bill.number}`))
      .flatMap((facts) =>
        readers(facts).map(
          (row) => `${bill.id}:${facts.lawId}:${row.personId}`,
        ),
      ),
  );
}

/**
 * The golden-path steps a person has actually played, each with the records
 * that show it. Read-only; opening history never counts.
 */
export function reachedSteps(
  core: CoreState,
  personId: string,
  /** Only bills introduced on or after this date count (a check that plays one bill of its own). */
  since?: string,
) {
  const api = coreAPI(core);
  const out: { step: number; recordIds: string[] }[] = [];
  const everyFiling = has(core, "core2-elections-v1")
    ? (api
        .moduleState("core2-elections-v1")
        .table("filings")
        .query("byPerson", [personId]) as unknown as FilingRow[])
    : [];
  const filings = everyFiling.filter(
    (row) => row.filedWith !== "incumbent stands again",
  );
  if (filings.length)
    out.push({ step: 3, recordIds: filings.map((f) => f.id) });
  if (has(core, "core2-campaigns-v1")) {
    const campaigns = filings
      .map(
        (f) =>
          api.moduleState("core2-campaigns-v1").table("campaigns").get(f.id) as
            | {
                id: string;
                doorsKnockedCount?: number;
                volunteerIds: string[];
                raisedMinor: number;
              }
            | undefined,
      )
      .filter(
        (c) =>
          c &&
          ((c.doorsKnockedCount ?? 0) ||
            c.volunteerIds.length ||
            c.raisedMinor),
      );
    if (campaigns.length)
      out.push({ step: 4, recordIds: campaigns.map((c) => c!.id) });
  }
  if (has(core, "core2-voting-v1")) {
    // Step 5 is a win: a race the person entered and the voters gave them.
    const won = filings
      .map((f) => resultOf(api, f.contestId))
      .filter((r) => r !== null && r.winnerId === personId);
    if (won.length) out.push({ step: 5, recordIds: won.map((r) => r!.id) });
  }
  if (has(core, "core2-legislature-v1")) {
    const bills = (
      api
        .moduleState("core2-legislature-v1")
        .table("bills")
        .rows() as unknown as BillRow[]
    ).filter(
      (b) => b.sponsorId === personId && (!since || b.introduced >= since),
    );
    if (bills.length) out.push({ step: 6, recordIds: bills.map((b) => b.id) });
    const dealt = bills.filter((b) => b.deals.length);
    if (dealt.length) out.push({ step: 7, recordIds: dealt.map((b) => b.id) });
    const decided = bills.filter((b) => b.status !== "drafted");
    if (decided.length)
      out.push({ step: 8, recordIds: decided.map((b) => b.id) });
    // A law the bill made has taken effect (steps 10 and 11 start here).
    const tookEffectFacts = [...(core.logByKind.get("law-took-effect") ?? [])]
      .map(
        (id) =>
          (
            core.durableLog.get(id) as {
              facts?: { lawId?: string; series?: string };
            }
          )?.facts,
      )
      .filter((facts) => facts?.lawId);
    const tookEffect = tookEffectFacts.map((facts) => facts!.lawId!);
    const enacted = bills.filter(
      (b) =>
        (b.status === "enacted" || b.status === "overridden") &&
        tookEffect.some((lawId) => lawId.endsWith(`:${b.number}`)),
    );
    // Step 9, the town visibly changes: an event is a record, not an effect.
    // The step counts only when law reach (another engine) read the law and
    // recorded who or what it reached; those records are the step's evidence.
    const read = townReads(
      enacted,
      tookEffectFacts as readonly TookEffectFacts[],
      (facts) => reachedBy(api, facts.series ?? "", facts.lawId),
    );
    if (read.length) out.push({ step: 9, recordIds: read });
    // Step 10, people bring it up: the town's press printed the law taking
    // effect and someone in town read it, so they can bring it up.
    if (enacted.length && has(core, PRESS_MODULE_ID)) {
      const stories = enacted.flatMap((b) =>
        tookEffect
          .filter((lawId) => lawId.endsWith(`:${b.number}`))
          .flatMap(
            (lawId) =>
              api
                .moduleState(PRESS_MODULE_ID)
                .table("stories")
                .query("byWire", [`law-took-effect:${lawId}`]) as unknown as {
                id: string;
              }[],
          ),
      );
      const storyIds = new Set(stories.map((story) => story.id));
      const readers: string[] = [];
      if (storyIds.size)
        for (const id of core.people.keys())
          if (
            changesKnownTo(core, id).some((change) => {
              const story = storyOfReadEvent(change.eventId);
              return story !== null && storyIds.has(story);
            })
          )
            readers.push(id);
      if (readers.length)
        out.push({
          step: 10,
          recordIds: [...storyIds, ...readers.slice(0, 5)],
        });
    }
    // Step 11, the next election uses the record: after a bill of theirs took
    // effect, a voter weighing this person on a ballot for the seat gave the
    // bill's vote as a reason (kept on ballots for the player's circle, and
    // for everyone when bookkeeping is on).
    if (enacted.length && has(core, "core2-voting-v1")) {
      const ballots = api.moduleState("core2-voting-v1").table("ballots");
      const tookEffectOn = (b: BillRow) =>
        [...(core.logByKind.get("law-took-effect") ?? [])]
          .map(
            (id) =>
              core.durableLog.get(id) as
                { date: string; facts?: { lawId?: string } } | undefined,
          )
          .filter((e) => e?.facts?.lawId?.endsWith(`:${b.number}`))
          .map((e) => e!.date)
          .sort()[0] ?? null;
      for (const b of enacted) {
        const item = `vote:${b.number}:${personId}`;
        const since = tookEffectOn(b);
        const hit = everyFiling
          .flatMap(
            (f) =>
              ballots.query("byContest", [
                f.contestId,
              ]) as unknown as BallotRow[],
          )
          .find(
            (ballot) =>
              since !== null &&
              ballot.date >= since &&
              ballot.recordReasons?.[personId]?.some((r) => r.itemId === item),
          );
        if (hit) {
          out.push({ step: 11, recordIds: [hit.id, item] });
          break;
        }
      }
    }
  }
  return out;
}
