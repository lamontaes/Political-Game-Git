/**
 * The votes family's two carried links act in a played world
 * (web-reach-civic). The web does not run economy-to-approval or
 * exposed-corruption-to-reelection: the voting engine weighs each cause voter
 * by voter. This plays a drawn bench world day by day, with nothing laid on
 * by hand, through the first partisan race whose standing carries the
 * economy term, and follows that term from the national economy's monthly
 * records to the race's own record of what voters weighed and to the ballots
 * that chose from it. A scandal reaches a voter only through a real route (a
 * bribe someone tells about, or a conviction), so the run reports each
 * scandal story it finds and checks that every ballot it reached carries the
 * scandal term. Ballots keep their reasons only with bookkeeping on (a debug
 * switch, off for speed), so it is on for each election day. Played in a
 * place drawn from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { appealOfShare, nationalEconomyChange } from "./electorate-inputs";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CORRUPTION_MODULE_ID } from "./modules/corruption";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { newsKey } from "./modules/news";
import { scandalStoriesOf, VOTING_MODULE_ID } from "./modules/voting";
import { coreAPI } from "./state";
import type { CandidateReasons } from "./electorate-inputs";
import type { CoreState } from "./types";

const seed = process.env.CIVIC_PLAYED_SEED || randomBytes(8).toString("hex");
/** The November 2026 general election is the first partisan race in most places. */
const UNTIL = process.env.CIVIC_PLAYED_UNTIL || "2026-11-30";
const DRAWS = 3;

interface Result {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly electorateReasons?: readonly CandidateReasons[];
}
interface Ballot {
  readonly id: string;
  readonly contestId: string;
  readonly voterId: string;
  readonly choice: string | null;
  readonly appeal?: Readonly<
    Record<string, { total: number; standing: number; scandal: number }>
  >;
}

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "civic-played");
  const world = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const results = api.moduleState(VOTING_MODULE_ID).table("results");
  const electionDays = () =>
    new Set(
      (contests.rows() as unknown as { electionDate: string }[]).map(
        (row) => row.electionDate,
      ),
    );
  const witness = () =>
    (results.rows() as unknown as Result[]).find((row) =>
      (row.electorateReasons ?? []).some((r) => r.economy !== 0),
    );
  /** The national economy's change the electorate read, on each election day. */
  const economyOn = new Map<string, ReturnType<typeof nationalEconomyChange>>();
  let day = makeIsoDate(core.date);
  const ballots = api.moduleState(VOTING_MODULE_ID).table("ballots");
  const scandalBallot = () =>
    (ballots.rows() as unknown as Ballot[]).some(
      (b) => b.appeal && Object.values(b.appeal).some((a) => a.scandal !== 0),
    );
  // Play to the first race carrying the economy term, and on to the end
  // date unless a kept ballot already carries a scandal term.
  while (day < UNTIL && !(witness() && scandalBallot())) {
    const next = addDays(day, 1);
    const voting = electionDays().has(next);
    if (voting) {
      setBookkeeping(true);
      economyOn.set(next, nationalEconomyChange(api));
    }
    advanceCore(core, next);
    if (voting) setBookkeeping(false);
    day = next;
  }
  // The corruption engine's chain, for the report: bribes taken, those told
  // to someone, and those taken to the press.
  const corruption = api.state.modules.has(CORRUPTION_MODULE_ID)
    ? Object.fromEntries(
        ["crimes", "surfaced", "reported"].map((name) => [
          name,
          api.moduleState(CORRUPTION_MODULE_ID).table(name).rows().length,
        ]),
      )
    : {};
  const macro = api.moduleState("macro");
  const state = macro.table("state").get("macro:state") as unknown as
    { openingMonth: string; latestMonth: string } | undefined;
  return {
    core,
    place,
    date: day,
    result: witness(),
    results: results.rows() as unknown as Result[],
    ballots: ballots.rows() as unknown as Ballot[],
    corruption,
    economyOn,
    macro: state,
  };
}

/** A partisan race had a candidate of the president's party: one whose standing carries the midterm or economy term. */
const hasPresidentsParty = (run: ReturnType<typeof play>) =>
  run.results.some((row) =>
    (row.electorateReasons ?? []).some(
      (r) => r.midterm !== 0 || r.economy !== 0,
    ),
  );

describe(`the voting engine weighs the economy and scandals in a played race (seed ${seed})`, () => {
  it("a partisan race's record carries the economy term from the national economy's records, and the ballots chose from it", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      // The economy term weighs only the president's party's candidates in
      // partisan state and federal races; a place with no such candidate on
      // its ballot by the end date (Washington, D.C., for one) is drawn
      // again, a bounded number of times.
      const tried: string[] = [];
      let drawSeed = seed;
      let run = play(drawSeed);
      for (let draw = 1; draw < DRAWS && !hasPresidentsParty(run); draw += 1) {
        tried.push(`${run.place.name}, ${run.place.state} (${drawSeed})`);
        drawSeed = `${seed}-${draw}`;
        run = play(drawSeed);
      }
      const where = `${run.place.name}, ${run.place.state}, seed ${drawSeed}${tried.length ? ` (drawn again after ${tried.join("; ")}: no candidate of the president's party in a partisan race)` : ""}`;
      const api = coreAPI(run.core);
      expect(
        run.result,
        `${where}: a race whose standing carries the economy term by ${UNTIL} (${run.results.length} results)`,
      ).toBeDefined();
      const result = run.result!;
      const moved = result.electorateReasons!.filter((r) => r.economy !== 0);
      // The term is the national economy's change from the opening, read
      // from the macro engine's months on election day.
      const economy = run.economyOn.get(result.date);
      expect(
        economy,
        `${where}: the economy read on ${result.date}`,
      ).toBeDefined();
      expect(
        Math.abs(economy!.unemploymentChange) +
          Math.abs(economy!.inflationChange),
        `${where}: the national economy moved by ${result.date}`,
      ).toBeGreaterThan(0);
      // It is part of each moved candidate's standing.
      for (const reasons of moved) {
        const sum =
          reasons.incumbency +
          reasons.experience +
          reasons.spending +
          reasons.record +
          reasons.economy +
          reasons.midterm;
        expect(reasons.total, `${result.id}: ${reasons.id}`).toBeCloseTo(
          sum,
          12,
        );
      }
      // The ballots of the race chose from appeal that carries each moved
      // candidate's standing.
      const ballots = run.ballots.filter(
        (b) => b.contestId === result.contestId && b.appeal,
      );
      const weighed = ballots.filter((b) =>
        moved.some((r) => b.appeal![r.id] !== undefined),
      );
      expect(
        weighed.length,
        `${where}: ballots of ${result.contestId} kept with their reasons (${ballots.length})`,
      ).toBeGreaterThan(0);
      // Each weighed ballot's standing for a moved candidate is that
      // candidate's standing in the race record, economy term included, with
      // its local standing (less the record's part where the voter weighed
      // the incumbent's record themselves), and differs from the same
      // standing with the economy term taken out: dropping the economy from
      // appeal fails here.
      for (const b of weighed)
        for (const r of moved) {
          const parts = b.appeal![r.id];
          if (!parts) continue;
          // A town's own voter weighs the candidate's local standing too.
          const full = appealOfShare(r.total) + appealOfShare(r.local);
          const ownRecord = full - appealOfShare(r.record);
          const at = `${where}: ${b.id} on ${r.id}`;
          expect(
            Math.min(
              Math.abs(parts.standing - full),
              Math.abs(parts.standing - ownRecord),
            ),
            `${at}: standing ${parts.standing} against the record's ${full}`,
          ).toBeLessThan(1e-9);
          const withoutEconomy = [
            full - appealOfShare(r.economy),
            ownRecord - appealOfShare(r.economy),
          ];
          for (const other of withoutEconomy)
            expect(
              Math.abs(parts.standing - other),
              `${at}: standing without the economy term`,
            ).toBeGreaterThan(1e-12);
        }

      // A scandal reaches a voter only through a real route: every kept
      // ballot whose voter heard a scandal story about a candidate carries
      // the scandal term for that candidate.
      const kept = run.ballots.filter((b) => b.appeal);
      const scandals = kept.flatMap((b) =>
        Object.entries(b.appeal!).flatMap(([candidateId, parts]) =>
          parts.scandal !== 0 ? [{ ballot: b.id, candidateId, parts }] : [],
        ),
      );
      const stories = [
        ...new Set(
          kept.flatMap((b) =>
            Object.keys(b.appeal!).flatMap((candidateId) =>
              scandalStoriesOf(api, candidateId, run.date),
            ),
          ),
        ),
      ];
      if (!stories.length) expect(scandals).toEqual([]);
      // Ballot by ballot: a voter who had heard a story about a candidate by
      // the race's day carries a scandal term for them that is not positive,
      // and a nonzero scandal term only ever sits with a voter who had.
      const dayOf = new Map(
        run.results.map((row) => [row.contestId, row.date]),
      );
      let heardBallots = 0;
      for (const b of kept) {
        const day = dayOf.get(b.contestId);
        expect(
          day,
          `${where}: ${b.id} belongs to a decided race`,
        ).toBeDefined();
        for (const [candidateId, parts] of Object.entries(b.appeal!)) {
          const heard = scandalStoriesOf(api, candidateId, day!).some(
            (storyId) => {
              const fact = api.knows(b.voterId, newsKey(storyId));
              return !!fact && fact.learnedAt <= day!;
            },
          );
          if (heard) {
            heardBallots += 1;
            expect(
              parts.scandal,
              `${where}: ${b.id} heard a story about ${candidateId}`,
            ).toBeLessThanOrEqual(0);
          } else
            expect(
              parts.scandal,
              `${where}: ${b.id} heard no story about ${candidateId}`,
            ).toBe(0);
        }
      }

      const one = weighed.find((b) => b.choice) ?? weighed[0]!;
      const r = moved[0]!;
      console.log(
        [
          `civic played: ${where}; played to ${run.date}; ${run.results.length} race results`,
          `economy: ${result.id} on ${result.date}: ${moved.map((m) => `${m.id} (${m.party}) economy ${m.economy.toFixed(5)}, standing ${m.total.toFixed(5)}`).join("; ")}`,
          `the national economy read: unemployment ${economy!.unemploymentChange.toFixed(3)} points and inflation ${economy!.inflationChange.toFixed(3)} points from macro-month:${run.macro?.openingMonth} to macro-month:${run.macro?.latestMonth}`,
          `ballots: ${weighed.length} of ${ballots.length} kept ballots weighed it, e.g. ${one.id} chose ${one.choice ?? "no one"}; standing of ${r.id} there ${one.appeal![r.id]!.standing.toFixed(5)}, total appeal ${one.appeal![r.id]!.total.toFixed(5)}`,
          `scandals: ${stories.length ? stories.join(", ") : "no scandal story about a candidate"}; ${heardBallots} ballot-candidate pairs whose voter had heard a story; ${scandals.length} kept ballots carry a scandal term${scandals[0] ? `, e.g. ${scandals[0].ballot} on ${scandals[0].candidateId} (${scandals[0].parts.scandal})` : ""}; corruption chain: ${JSON.stringify(run.corruption)}`,
        ].join("\n"),
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 3_600_000);
});
