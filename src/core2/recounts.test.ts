/**
 * A close race recounts by its own state's rule (owner, Nov 10, 2026:
 * "Recount by own states rules"). The rule's tiers are read as the table
 * says, and in a played world drawn from all 56 a count inside the place's
 * automatic margin opens a recount record on its result, the paper carries
 * it, the recount certifies the result on the day it ends, and the winner is
 * seated no earlier than that day.
 *
 * The margin is set inside the place's automatic margin by setting that
 * place's automatic rule to any margin for the run (dev mode's way of putting
 * a count inside it); everything else is the played world's own count.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import rules from "../../data/research/elections/recount-rules-2026.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { PRESS_MODULE_ID } from "./modules/press";
import { recountOf, resultOf, VOTING_MODULE_ID } from "./modules/voting";
import {
  countMargin,
  insideRecountMargin,
  recountRuleFor,
  type RecountTier,
} from "./recount-rules";
import { coreAPI } from "./state";

const seed = process.env.RECOUNT_SEED ?? randomBytes(8).toString("hex");
/** Two weeks before the 2026 general election: the count comes quickly. */
const START = "2026-10-20";
const ELECTION = "2026-11-03";
const DRAWS = 8;

describe("recount rules", () => {
  it("covers all 56 places and reads each tier as its statute says", () => {
    expect(Object.keys(rules.places)).toHaveLength(56);
    const at = (margin: number, cast: number, base = cast) => ({
      margin,
      cast,
      base,
    });
    // Connecticut: under 0.5% capped at 2,000 votes, or under 20 votes.
    const ct = recountRuleFor("US-CT")!;
    expect(insideRecountMargin(ct.automatic, at(19, 1_000_000))).toBe(true);
    expect(insideRecountMargin(ct.automatic, at(2_500, 1_000_000))).toBe(false);
    expect(insideRecountMargin(ct.automatic, at(40, 10_000))).toBe(true);
    expect(insideRecountMargin(ct.request, at(1, 10_000))).toBe(false);
    // Rhode Island: a small race may ask within 2% or 200 votes.
    const ri = recountRuleFor("US-RI")!;
    expect(insideRecountMargin(ri.request, at(150, 15_000))).toBe(true);
    expect(insideRecountMargin(ri.request, at(600, 150_000))).toBe(true);
    expect(insideRecountMargin(ri.request, at(2_000, 150_000))).toBe(false);
    // A tie only: a share of nothing.
    const tie: RecountTier[] = [{ share: 0 }];
    expect(insideRecountMargin(tie, at(0, 100))).toBe(true);
    expect(insideRecountMargin(tie, at(1, 100))).toBe(false);
    // Colorado measures against the winner's votes.
    const co = countMargin(
      [
        ["a", 1000],
        ["b", 996],
        ["c", 500],
      ],
      recountRuleFor("US-CO")!,
    )!;
    expect(co).toMatchObject({ margin: 4, base: 1000, cast: 2496 });
    expect(insideRecountMargin(recountRuleFor("US-CO")!.automatic, co)).toBe(
      true,
    );
  });
});

it("a count inside the place's automatic margin opens a recount, certified before the winner is seated", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(seed, `recounts:${draw}`);
    const where = `${place.name} (${place.key}), seed ${seed} draw ${draw}`;
    const world = buildBenchWorld(place.seed, START, {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const stateKey = lawChain(api).stateKey;
    const contests = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter((c) => c.electionDate === ELECTION);
    if (!contests.length) {
      passed.push(`${where}: no race on ${ELECTION}`);
      continue;
    }
    const row = (
      rules.places as unknown as Record<string, { automatic: unknown }>
    )[stateKey]!;
    const kept = row.automatic;
    row.automatic = [{ share: 1 }];
    try {
      advanceCore(world.core, makeIsoDate("2026-11-04"));
      const counted = contests.filter((c) => {
        const result = resultOf(api, c.id);
        const ranked = Object.values(result?.totals ?? {}).filter((n) => n > 0);
        return result?.winnerCandidateId && ranked.length >= 2;
      });
      if (!counted.length) {
        passed.push(`${where}: no race with two candidates on the count`);
        continue;
      }
      const wire = api.moduleState(PRESS_MODULE_ID).table("wire");
      for (const contest of counted) {
        const result = resultOf(api, contest.id)!;
        const recount = recountOf(api, contest.id);
        expect(
          recount,
          `${where}: ${contest.title} counted inside the automatic margin and opened no recount`,
        ).not.toBeNull();
        expect(recount!.kind).toBe("automatic");
        expect(recount!.status).toBe("open");
        expect(result.recountId).toBe(recount!.id);
        expect(
          wire.get(`recount-opened:${contest.id}`),
          `${where}: the paper's wire carries ${contest.title}'s recount`,
        ).toBeTruthy();
        if (result.takesOffice)
          expect(result.takesOffice >= recount!.ends).toBe(true);
      }
      // The player's ask (an edge case, set by hand): a recount offered to
      // the candidate behind opens when their concession call ends without
      // conceding, the reply the press puts on the record.
      const asked = counted[0]!;
      const offered = recountOf(api, asked.id)!;
      api
        .moduleState(VOTING_MODULE_ID)
        .table("recounts")
        .put({ ...offered, kind: "requested", status: "offered" } as never);
      api.emit({
        id: `concession:${asked.id}:${offered.trailingId}:no`,
        date: world.core.date,
        kind: "concession",
        personIds: [offered.trailingId, offered.leaderId],
        placeId: lawChain(api).townPlaceId,
        source: {
          tag: "SOURCED",
          citation: "recounts.test",
          asOf: world.core.date,
        },
        facts: {
          contestId: asked.id,
          loserId: offered.trailingId,
          winnerId: offered.leaderId,
          conceded: "no",
          replyId: "scene.reply:recounts.test",
        },
      });
      expect(recountOf(api, asked.id), `${where}: the ask`).toMatchObject({
        status: "open",
        requestedBy: offered.trailingId,
      });
      const last = counted
        .map((c) => recountOf(api, c.id)!.ends)
        .sort()
        .at(-1)!;
      advanceCore(world.core, addDays(makeIsoDate(last), 1));
      for (const contest of counted) {
        const recount = recountOf(api, contest.id)!;
        const result = resultOf(api, contest.id)!;
        expect(recount.status, `${where}: ${contest.title}`).toBe("confirmed");
        expect(recount.certifiedOn).toBe(recount.ends);
        expect(result.certifiedOn).toBe(recount.ends);
        expect(
          world.core.durableLog.get(`recount-certified:${contest.id}`)?.facts
            ?.recountId,
        ).toBe(recount.id);
      }
      // The winner is seated no earlier than the recount's end: a seat whose
      // term would have begun before the recount ended waits for its end.
      const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
      for (const contest of counted) {
        const result = resultOf(api, contest.id)!;
        const ends = recountOf(api, contest.id)!.ends;
        const term = (
          terms.query("bySeatStatus", [
            contest.seatId,
            "serving",
          ]) as unknown as TermRow[]
        )[0];
        if (
          term &&
          term.personId === result.winnerId &&
          term.startDate > ELECTION
        )
          expect(
            term.startDate >= ends,
            `${where}: ${contest.title} seated before its recount ended`,
          ).toBe(true);
      }
      passed.push(
        `${where}: ${counted.length} recounts (${counted.map((c) => recountOf(api, c.id)!.id).join(", ")})`,
      );
      process.stderr.write(`${passed.join("\n")}\n`);
      return;
    } finally {
      row.automatic = kept;
    }
  }
  throw new Error(`No drawn place counted a race:\n${passed.join("\n")}`);
}, 1_800_000);
