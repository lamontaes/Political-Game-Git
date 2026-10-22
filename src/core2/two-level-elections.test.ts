/**
 * Elections in the two-level world: the town's counted residents vote from
 * their own records (they see party labels on the ballot, no campaign reached
 * them), the rest of the district or state votes on the same engine at a
 * coarser level from its real 2024 vote, and no candidate wins every vote
 * for want of named supporters.
 */
import { createHash } from "node:crypto";
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
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  breakElectionTie,
  countedBallotsOf,
  openVoting,
  resultOf,
} from "./modules/voting";
import tieRules from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import { partySide } from "./appointments";
import { countedChoice, countedResidents } from "./electorate";
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-10-20";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`two-level:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter(
    (k) => !["US-AS", "US-GU", "US-MP", "US-VI", "US-PR", "US-DC"].includes(k),
  )
  .sort();
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

describe("elections in the two-level world", () => {
  it("counted residents vote, challengers get real votes, and statewide results track the state", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const full = buildPopulation({
      seed,
      placeKey: key,
      startedAt: START,
      minimumPeople: 400,
    });
    const player = [...full.people]
      .filter(
        (p) =>
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    const counted = countedResidents(core).length;
    expect(counted, `${state} ${key}`).toBeGreaterThan(core.people.size);
    advanceCore(core, "2026-11-04");
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
      expect(result.countedEligible).toBeGreaterThan(0);
      // Every counted resident's ballot is kept with its reasons, and each
      // choice is the one its own appeal ranks first.
      const kept = countedBallotsOf(api, contest.id);
      expect(kept.length, contest.title).toBeGreaterThan(0);
      for (const b of kept) {
        // Each stands for the town's people like them: their choice counts
        // at their turnout propensity, which slides strictly between never
        // and always (turnout.ts).
        expect(b.choice, b.id).toBe(countedChoice(b.appeal));
        expect(b.turnout, b.id).toBeGreaterThan(0);
        expect(b.turnout, b.id).toBeLessThan(1);
      }
      const sides = filings.map((f) => partySide(f.party ?? null));
      const contested =
        filings.length > 1 && sides.includes(1) && sides.includes(-1);
      if (!contested) continue;
      partisan += 1;
      // Both major-party candidates get real votes.
      for (const f of filings)
        expect(
          result.totals[f.personId] ?? 0,
          `${contest.title} ${f.party}`,
        ).toBeGreaterThan(0);
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
        `${contest.title}: R ${share.toFixed(3)} of ${r + d} (counted ${result.countedTurnout}/${result.countedEligible}, named ${result.namedTurnout}/${result.namedEligible})`,
      );
    }
    expect(partisan, "no two-party race this November").toBeGreaterThan(0);
    // Each decided seat opens its next cycle's contest once its winner is
    // seated (audit 2, item 2): one contest per seat would end the record.
    const seatedBy = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter((c) => c.electionDate === "2026-11-03")
      .map((c) => resultOf(api, c.id)?.takesOffice ?? "2026-11-04")
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
      (c) => c.electionDate > api.state.date && ballot(api, c.id).length >= 2,
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
      const winner = breakElectionTie(api, contest, tied);
      const method = rules[field]?.method ?? "lot";
      if (winner === null)
        expect(
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .get(`${contest.id}:second`),
          `${contest.title} ${method}`,
        ).toBeDefined();
      else expect(["legislature-decides", "board-decides"]).toContain(method);
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
  });
});
