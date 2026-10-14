/**
 * Elections in the two-level world: the town's counted residents vote from
 * their own records (they see party labels on the ballot, no campaign reached
 * them), the rest of the district or state votes as groups around its real
 * lean, and no candidate wins every vote for want of named supporters.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { withCountedVoterGroups } from "./opening-voter-groups";
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
  openVoting,
  resultOf,
  VOTING_MODULE_ID,
  type TieLotRow,
} from "./modules/voting";
import tieRules from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import { partySide } from "./appointments";
import { countedResidents } from "./electorate";
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-10-20";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`two-level:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...lifePlaceStateIdentities()]
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
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
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
      withCountedVoterGroups(
        collapseToTwoLevels({ ...full, playerId: player.id }),
      ),
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
        expect(Math.abs(share - real), contest.title).toBeLessThan(0.15);
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
    // A tie is settled the state's way (audit 3, item 10): a recorded lot, a
    // legislature or board choosing, or a second election between the tied
    // candidates.
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
      if (method === "lot") {
        expect(tied, `${contest.title} lot`).toContain(winner);
        expect(
          api.moduleState(VOTING_MODULE_ID).table("lots").get(contest.id),
        ).toMatchObject({ winnerId: winner, tied: [...tied].sort() });
      } else if (winner === null)
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

  it("an exact tie in a lot state is settled by the recorded lot, the same for the same seed", () => {
    // A random state whose law settles a local or general tie by lot.
    const lotStates = states.filter((k) => {
      const r = (
        tieRules as unknown as {
          states: Record<string, Record<string, { method: string }>>;
        }
      ).states[k];
      return (
        r?.localTie?.method === "lot" || r?.generalElectionTie?.method === "lot"
      );
    });
    const state = pick(lotStates, "lot-state");
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "lot-place").key;
    const draw = (): readonly TieLotRow[] => {
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openVoting(core);
      const api = coreAPI(core);
      const rules = (
        tieRules as unknown as {
          states: Record<string, Record<string, { method: string }>>;
        }
      ).states[state]!;
      const lots: TieLotRow[] = [];
      for (const contest of [
        ...(api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]),
      ].sort((a, b) => a.id.localeCompare(b.id))) {
        const field =
          contest.family === "statewideExecutive"
            ? "statewideExecutiveTie"
            : contest.family === "stateLegislative"
              ? "legislativeTie"
              : contest.family === "countyOffice" ||
                  contest.family === "municipalOffice"
                ? "localTie"
                : "generalElectionTie";
        if ((rules[field]?.method ?? "lot") !== "lot") continue;
        // Two residents tied exactly (the count's result, set up here).
        const tied = [...core.people.keys()].sort().slice(0, 2);
        const winner = breakElectionTie(api, contest, tied);
        const lot = api
          .moduleState(VOTING_MODULE_ID)
          .table("lots")
          .get(contest.id) as unknown as TieLotRow;
        // The law's own procedure decided it, on the record; no second
        // election was called.
        expect(winner, contest.title).not.toBeNull();
        expect(lot.winnerId).toBe(winner);
        expect(lot.procedure.length).toBeGreaterThan(0);
        expect(lot.citation.length).toBeGreaterThan(0);
        expect(
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .get(`${contest.id}:second`),
        ).toBeUndefined();
        lots.push(lot);
      }
      return lots;
    };
    const first = draw();
    expect(first.length, `seed ${seed}, ${state} ${key}`).toBeGreaterThan(0);
    // The same world draws the same names.
    expect(draw().map((l) => [l.contestId, l.winnerId])).toEqual(
      first.map((l) => [l.contestId, l.winnerId]),
    );
    govReport(
      "two-level-elections",
      JSON.stringify({ seed, state, place: key, lots: first.length }),
    );
  });
});
