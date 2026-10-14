/**
 * M3-10: a real 2026 ballot measure runs where the state's law put one on the
 * ballot. Named voters in a random town decide it for their own recorded
 * reasons, the rest of the state votes as groups around its 2024 lean, and an
 * approved measure becomes state law on its effective date.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { LAWS_MODULE_ID, openLaws } from "./modules/laws";
import { openCampaigns } from "./modules/campaigns";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import {
  measureResult,
  measuresOf,
  measureVoteOf,
  openBallotMeasures,
} from "./modules/ballot-measures";
import measures from "./data/elections/ballot-measures.json" with { type: "json" };
import { searchCorePlaces } from "./place-lookup";

const START = "2026-10-26";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`measures:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [
  ...new Set(
    measures.measures
      .filter((m) => m.electionDate > START)
      .map((m) => m.stateKey),
  ),
].sort();

describe("M3-10 ballot measures", () => {
  it("a real measure is decided by named voters and the rest of the state, and passing makes it law", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
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
    openCampaigns(core);
    openBallotMeasures(core);
    const api = coreAPI(core);
    const onBallot = measuresOf(api);
    expect(onBallot.length, `${state} ${key}`).toBeGreaterThan(0);
    // Only the town's own state's measures are on its ballot.
    expect(onBallot.every((m) => m.stateKey === state)).toBe(true);
    advanceCore(core, "2026-11-04");
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const report = onBallot.map((m) => {
      const result = measureResult(api, m.id)!;
      expect(result, m.title).not.toBeNull();
      expect(
        result.named.yes + result.named.no + result.named.blank,
      ).toBeGreaterThan(0);
      const voter = [...core.people.keys()]
        .map(
          (id) =>
            measureVoteOf(api, m.id, id) as {
              choice: string | null;
              reasons: { support: number };
            } | null,
        )
        .find((v) => v?.choice === "yes" || v?.choice === "no")!;
      // A voter's choice follows their own view of the question.
      expect(Math.sign(voter.reasons.support)).toBe(
        voter.choice === "yes" ? 1 : -1,
      );
      const enacted = (
        laws.query("bySeries", [state, m.question]) as unknown as {
          terms?: { enactedBy?: string };
        }[]
      ).some((r) => r.terms?.enactedBy === m.id);
      expect(enacted).toBe(result.approved && m.enactsOnApproval);
      return {
        title: m.title,
        question: m.question,
        yesMeans: m.yesMeans,
        named: result.named,
        groups: result.groups,
        yesShare: Math.round(result.yesShare * 1000) / 10,
        approved: result.approved,
        effectiveDate: result.effectiveDate,
      };
    });
    govReport(
      "ballot-measures",
      JSON.stringify({ seed, state, place: key, measures: report }),
    );
  });
});
