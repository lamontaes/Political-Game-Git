/**
 * Elections in the two-level world: the town's counted residents vote from
 * their own records (they see party labels on the ballot, no campaign reached
 * them), the rest of the district or state votes on the same engine at a
 * coarser level from its real 2024 vote, and no candidate wins every vote
 * for want of named supporters.
 */
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  openElections,
  runningMateOf,
  ticketGovernorContest,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  countedBallotsOf,
  openVoting,
  resultOf,
  secondElection,
  VOTING_MODULE_ID,
} from "./modules/voting";
import { breakElectionTie } from "./election-ties";
import tieRules from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import { partySide } from "./appointments";
import { partiesHere } from "./modules/parties";
import { countedChoice, countedResidents } from "./electorate";
import { electorateParameter } from "./electorate-inputs";
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };

const START = "2026-10-20";
/**
 * The places this test plays, one per seed, found once by
 * scripts/elections/two-level-places.ts (Nov 16): each seed's first draw with
 * a race of both parties on Nov 3, 2026. tl-b's first draw, Utah 4923420, had
 * none and was passed over. Built directly, with no draw at run time.
 */
// Each limit is near twice the case's slower time: alone, or beside
// voting-winner-person, group-quarters-electorate and voter-groups on four
// workers (Nov 16). tl-c 18.1 s and 23.2 s; tl-a 9.1 s and 9.7 s; tl-b
// 10.0 s and 10.4 s; tl-d 9.8 s and 9.8 s.
const CASES = [
  { seed: "tl-c", state: "US-VT", key: "5005725", limit: 45_000 },
  { seed: "tl-a", state: "US-NM", key: "3546100", limit: 20_000 },
  { seed: "tl-b", state: "US-KS", key: "2061875", limit: 20_000 },
  { seed: "tl-d", state: "US-WY", key: "5684852", limit: 20_000 },
] as const;
const presidential = new Map(
  (
    calibration as unknown as {
      presidentialByState: {
        stateUsps: string;
        democraticTwoPartyShare: number;
      }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s.democraticTwoPartyShare]),
);

/**
 * One named place played through election day: every contest decided on
 * November 3 checked, and how many of them had both parties on the ballot.
 */
function playTo({ seed, state, key }: (typeof CASES)[number]) {
  const full = buildPopulation({
    seed,
    placeKey: key,
    startedAt: START,
    minimumPeople: 400,
  });
  const player = [...full.people]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const core = createLifeCore(
    collapseToTwoLevels({ ...full, playerId: player.id }),
  );
  openLaws(core);
  openOffices(core, seed, core.date);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  const api = coreAPI(core);
  const counted = countedResidents(core).length;
  expect(counted, `${state} ${key}`).toBeGreaterThan(core.people.size);
  advanceCore(core, "2026-11-04");
  // A party primary chooses one nominee a party, so a general ballot holds two
  // of one party only where the state's primary sends its top finishers on.
  const method = partiesHere(api)[0]?.nominationMethod ?? "party-primary";
  const report: string[] = [];
  let partisan = 0;
  for (const contest of (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter((c) => c.electionDate === "2026-11-03")) {
    const result = resultOf(api, contest.id);
    if (!result) continue;
    // No one wins on no votes (audit 2, item 4).
    if (Object.values(result.totals).every((n) => n === 0))
      expect(result.winnerId, contest.title).toBeNull();
    const filings = ballot(api, contest.id);
    if (method !== "top-two" && method !== "top-four") {
      const parties = filings.map((f) => f.party).filter(Boolean);
      expect(
        parties.length,
        `${state} ${key}, seed ${seed}: ${contest.title} has two filings of one party on its general ballot (${filings.map((f) => `${f.personId} ${f.party}`).join(", ")})`,
      ).toBe(new Set(parties).size);
    }
    expect(result.countedEligible).toBeGreaterThan(0);
    // Every counted resident's ballot is kept with its reasons, and each
    // record's people divide as its own appeal has them (CTO, Nov 1): on a
    // ballot with party labels whole to its first place, on one without by
    // each candidate's logistic share at appealPerShare's slope, worked
    // out here; a household that gave its word at a door votes whole on it.
    // A ticket office (a lieutenant governor elected on the governor's
    // ticket) is decided by its governor race's count (`decideTicket`): its
    // counted ballots are that race's, each governor candidate's votes going
    // to their running mate.
    const governor = ticketGovernorContest(api, contest);
    const counting = governor ?? contest;
    const kept = countedBallotsOf(api, counting.id);
    expect(kept.length, contest.title).toBeGreaterThan(0);
    const row = api
      .moduleState(VOTING_MODULE_ID)
      .table("countedBallots")
      .get(`counted:${counting.id}`) as unknown as {
      readonly field: readonly {
        readonly id: string;
        readonly side: number;
      }[];
      readonly pledges: readonly (Readonly<Record<string, number>> | null)[];
      readonly pledgedChoice: readonly number[];
    };
    const labeled = row.field.some((f) => f.side !== 0);
    const k = 4 / electorateParameter("appealPerShare");
    for (const [i, b] of kept.entries()) {
      const ids = Object.keys(b.appeal);
      const expected: Record<string, number> = {};
      const first = countedChoice(b.appeal);
      if (row.pledges[i]) {
        if (first) expected[first] = b.weight;
      } else {
        const pledgedAt = row.pledgedChoice[i]!;
        const rest = pledgedAt >= 0 ? b.weight - 1 : b.weight;
        if (pledgedAt >= 0) expected[row.field[pledgedAt]!.id] = 1;
        if (labeled || ids.length === 1) {
          if (first) expected[first] = (expected[first] ?? 0) + rest;
        } else {
          const sum = ids.reduce(
            (n, id) => n + Math.exp(k * b.appeal[id]!.total),
            0,
          );
          for (const id of ids)
            expected[id] =
              (expected[id] ?? 0) +
              (rest * Math.exp(k * b.appeal[id]!.total)) / sum;
        }
      }
      for (const id of ids)
        expect(b.split[id] ?? 0, `${b.id} for ${id}`).toBeCloseTo(
          expected[id] ?? 0,
          9,
        );
      // Each stands for the town's people like them: their votes count at
      // their turnout propensity, which slides strictly between never and
      // always (turnout.ts).
      expect(b.turnout, b.id).toBeGreaterThan(0);
      expect(b.turnout, b.id).toBeLessThan(1);
    }
    const sides = filings.map((f) => partySide(f.party ?? null));
    const contested =
      filings.length > 1 && sides.includes(1) && sides.includes(-1);
    if (!contested) continue;
    partisan += 1;
    // Both major-party candidates get real votes. A candidate of no party
    // stands on the labeled ballot without a side, and a voter goes whole to
    // the first in their own appeal (countedShareRule): one with no votes is
    // one no kept ballot put first, read from the ballots themselves.
    // On a ticket office's ballot, the governor candidate each filing runs with.
    const runsWith = new Map(
      governor
        ? ballot(api, governor.id).flatMap((g) => {
            const mate = runningMateOf(api, g, contest);
            return mate ? [[mate.personId, g.personId] as const] : [];
          })
        : filings.map((f) => [f.personId, f.personId] as const),
    );
    for (const f of filings) {
      const got = result.totals[f.personId] ?? 0;
      if (f.party || got > 0) {
        expect(got, `${contest.title} ${f.party}`).toBeGreaterThan(0);
        continue;
      }
      expect(
        kept.filter(
          (b) =>
            countedChoice(b.appeal) ===
            (runsWith.get(f.personId) ?? f.personId),
        ).length,
        `${state} ${key}, seed ${seed}: ${contest.title}: ${f.personId} of no party got no votes though a kept ballot put them first`,
      ).toBe(0);
    }
    let r = 0;
    let d = 0;
    for (const f of filings) {
      if (partySide(f.party ?? null) > 0) r += result.totals[f.personId] ?? 0;
      if (partySide(f.party ?? null) < 0) d += result.totals[f.personId] ?? 0;
    }
    const share = r / (r + d);
    if (contest.family === "statewideExecutive") {
      const real = 1 - presidential.get(state.slice(3))!;
      // The state's result follows the state, not the town's sample.
      expect(
        Math.abs(share - real),
        `${contest.title}: ${state} ${key}, seed ${seed}, share ${share.toFixed(3)} against the state's ${real.toFixed(3)}`,
      ).toBeLessThan(0.15);
    }
    report.push(
      `${contest.title}: R ${share.toFixed(3)} of ${r + d} (counted ${result.countedTurnout}/${result.countedEligible}, named ${result.namedTurnout}/${result.namedEligible})${governor ? ", on the governor's ticket" : ""}`,
    );
  }
  return { seed, state, key, core, api, counted, report, partisan };
}

describe("elections in the two-level world", () => {
  for (const named of CASES)
    it(
      `counted residents vote, challengers get real votes, and statewide results track the state (${named.state} ${named.key}, seed ${named.seed})`,
      () => {
        const world = playTo(named);
        // The place was found to have a race of both parties; a change that loses
        // it fails here rather than passing on nothing.
        expect(
          world.partisan,
          `${named.state} ${named.key}, seed ${named.seed}: no race of both parties on 2026-11-03`,
        ).toBeGreaterThan(0);
        const { seed, state, key, core, api, counted, report } = world;

        // Each decided seat opens its next cycle's contest once its winner is
        // seated (audit 2, item 2): one contest per seat would end the record.
        // A race no one won opens it when the empty race is settled by the
        // state's law on its due day, the term's start (`resolveEmptyRace`), so
        // the wait is the later of the two.
        const emptyRaces = api
          .moduleState(VOTING_MODULE_ID)
          .table("emptyRaces");
        const seatedBy = (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .rows() as unknown as ContestRow[]
        )
          .filter((c) => c.electionDate === "2026-11-03")
          .map(
            (c) =>
              resultOf(api, c.id)?.takesOffice ??
              (emptyRaces.get(`empty:${c.id}`)?.due as string | undefined) ??
              "2026-11-04",
          )
          .sort()
          .at(-1)!;
        const after = new Date(Date.parse(`${seatedBy}T00:00:00Z`) + 86_400_000)
          .toISOString()
          .slice(0, 10);
        advanceCore(core, after > "2026-11-04" ? after : "2026-11-05");
        const all = api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[];
        const decided = all.filter((c) => c.electionDate === "2026-11-03");
        for (const c of decided)
          expect(
            all.some(
              (n) => n.seatId === c.seatId && n.electionDate > c.electionDate,
            ),
            `${c.title} ${c.seatId}`,
          ).toBe(true);
        // A tie is settled the state's way (audit 3, item 10): a legislature or
        // board choosing, or a second election between the tied candidates.
        const rules = (
          tieRules as unknown as {
            states: Record<string, Record<string, { method: string }>>;
          }
        ).states[state]!;
        for (const contest of (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .rows() as unknown as ContestRow[]
        ).filter(
          (c) =>
            c.electionDate > api.state.date && ballot(api, c.id).length >= 2,
        )) {
          const tied = ballot(api, contest.id)
            .slice(0, 2)
            .map((f) => f.personId);
          const field =
            contest.family === "statewideExecutive"
              ? "statewideExecutiveTie"
              : contest.family === "stateLegislative"
                ? "legislativeTie"
                : contest.family === "countyOffice" ||
                    contest.family === "municipalOffice"
                  ? "localTie"
                  : "generalElectionTie";
          const winner = breakElectionTie(api, contest, tied, secondElection);
          const method = rules[field]?.method ?? "lot";
          if (winner === null)
            expect(
              api
                .moduleState(ELECTIONS_MODULE_ID)
                .table("contests")
                .get(`${contest.id}:second`),
              `${contest.title} ${method}`,
            ).toBeDefined();
          else {
            // The state's rule names a winner: its legislature or board, or a lot
            // drawn by law (election-ties.ts), always one of the two tied.
            expect(["legislature-decides", "board-decides", "lot"]).toContain(
              method,
            );
            expect(tied, `${contest.title} ${method}`).toContain(winner);
          }
          break;
        }
        govReport(
          "two-level-elections",
          JSON.stringify({
            seed,
            state,
            place: key,
            counted,
            named: core.people.size,
            report,
          }),
        );
      },
      named.limit,
    );
});
