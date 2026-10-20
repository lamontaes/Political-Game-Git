import { coreAPI } from "../core2/state";
import { resultOf } from "../core2/modules/voting";
import type { FilingRow } from "../core2/modules/elections";
import type { BallotRow } from "../core2/modules/voting";
import type { BillRow } from "../core2/modules/legislature";
import type { CoreState } from "../core2/types";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import { storyOfReadEvent } from "../core2/modules/news";
import { changesKnownTo } from "../director/bring-it-up";

const has = (core: CoreState, id: string) => core.modules.has(id);

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
    const held = filings
      .map((f) => resultOf(api, f.contestId))
      .filter((r) => r !== null);
    if (held.length) out.push({ step: 5, recordIds: held.map((r) => r!.id) });
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
    // Step 9, the town changes: a law the bill made has taken effect.
    const tookEffect = [...(core.logByKind.get("law-took-effect") ?? [])]
      .map(
        (id) =>
          (core.durableLog.get(id) as { facts?: { lawId?: string } })?.facts
            ?.lawId ?? "",
      )
      .filter(Boolean);
    const enacted = bills.filter(
      (b) =>
        (b.status === "enacted" || b.status === "overridden") &&
        tookEffect.some((lawId) => lawId.endsWith(`:${b.number}`)),
    );
    if (enacted.length)
      out.push({ step: 9, recordIds: enacted.map((b) => b.id) });
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
