/**
 * M2-02 and the engine half of M2-03: election calendars, filing rules, and
 * filing in a random place.
 *
 * - The next local, state and federal contests carry that place's real dates
 *   (general election, primary, filing deadline) from the data files, and
 *   filing requires what that place's rules require.
 * - A resident files once, at no charge: the filing is a petition and the
 *   candidate stands in the race while it circulates (the clerk's check is
 *   the voting engine's; `petition-filing.test.ts`).
 * - An ineligible person gets the rule that stops them, as a structured reason.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  checkEligibility,
  fileCandidacy,
  filingRequirements,
  openContests,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { novemberGeneralElectionDay } from "./gov-rules/town-election-calendar";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`filing:${Date.now()}`).digest("hex");
const nomination = JSON.parse(
  readFileSync(
    "data/research/elections/party-nomination-rules-2026.json",
    "utf8",
  ),
).places;
const filingRequirementsRead = JSON.parse(
  readFileSync("data/research/elections/filing-requirements.json", "utf8"),
).places as Record<
  string,
  Record<string, { independent?: { deadline2026?: string } }>
>;
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
function randomPlace(salt: string) {
  const state = pick(states, `${salt}:state`);
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return pick(places, `${salt}:place`);
}
function world(placeKey: string) {
  const core = createLifeCore(
    buildPopulation({ seed, placeKey, startedAt: START, minimumPeople: 200 }),
  );
  openOffices(core, seed);
  openElections(core);
  return core;
}
const contests = (api: ReturnType<typeof coreAPI>) =>
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];

describe("M2-02 election calendars and filing rules", () => {
  it("the next local, state and federal contests carry the place's real dates and rules", () => {
    const placeKey =
      process.env.GOLDEN_PATH_PLACE_KEY ?? randomPlace("calendar").key;
    const core = world(placeKey);
    const api = coreAPI(core);
    const all = contests(api);
    const stateKey = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as {
        stateKey: string;
      }
    ).stateKey;
    const levels = new Set(all.map((c) => c.level));
    expect(levels.has("federal")).toBe(true);
    expect(levels.has("state")).toBe(true);
    for (const contest of all) {
      expect(contest.filingDeadline <= contest.electionDate).toBe(true);
      if (contest.level === "federal" || contest.level === "state") {
        const year = Number(contest.electionDate.slice(0, 4));
        expect(contest.electionDate).toBe(novemberGeneralElectionDay(year));
        const read = nomination[stateKey];
        if (year === 2026 && contest.family === "usHouse") {
          const primary =
            read.primary.dates2026?.["us-house"] ?? read.primary.dates2026?.all;
          if (primary) expect(contest.primaryDate).toBe(primary);
          const deadline =
            read.filing.deadlines2026?.["us-house"] ??
            read.filing.deadlines2026?.all;
          if (deadline) expect(contest.filingDeadline).toBe(deadline);
        }
      }
      const rules = filingRequirements(stateKey, contest.family);
      expect(rules.minimumAge).toBeGreaterThanOrEqual(18);
      expect(rules.filedWith.length).toBeGreaterThan(0);
      // An independent files by the independent route's own deadline,
      // where the place's law sets one apart.
      const own =
        filingRequirementsRead[stateKey]?.[contest.family]?.independent
          ?.deadline2026;
      if (own)
        expect(
          filingRequirements(stateKey, contest.family, "independent").deadline,
        ).toBe(own);
    }
    govReport(
      "elections-filing",
      JSON.stringify({
        placeKey,
        seed,
        contests: all
          .slice(0, 12)
          .map(
            (c) =>
              `${c.title}${c.district ? ` ${c.district}` : ""}: election ${c.electionDate}, primary ${c.primaryDate ?? "none"}, filing closes ${c.filingDeadline} (${c.basis}); file with ${filingRequirements(stateKey, c.family).filedWith}`,
          ),
      }),
    );
  });
});

describe("M2-03 filing (engine)", () => {
  it("a resident files once, at no charge, and stands in the race while the petition circulates; an ineligible person is told the rule", () => {
    const core = world(randomPlace("file").key);
    const api = coreAPI(core);
    const open = openContests(api);
    expect(open.length).toBeGreaterThan(0);
    const contest = open.find((c) => c.level !== "federal") ?? open[0]!;
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 40,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const candidate = pick(adults, "candidate");
    const eligibility = checkEligibility(api, candidate.id, contest.id);
    const unmetBefore = eligibility.filter((c) => !c.met).map((c) => c.rule);
    const cashBefore = core.people.get(candidate.id)!.liquidMinor;
    const result = fileCandidacy(api, {
      personId: candidate.id,
      contestId: contest.id,
      platform: ["fixture-platform"],
    });
    if (result.status === "refused") {
      // Refused only for a stated rule.
      expect(result.unmet.length).toBeGreaterThan(0);
      expect(unmetBefore.length + result.unmet.length).toBeGreaterThan(0);
      return;
    }
    // Filing costs nothing.
    expect(core.people.get(candidate.id)!.liquidMinor).toBe(cashBefore);
    const filing = result.filing;
    expect(filing.status).toBe("petitioning");
    expect(ballot(api, contest.id).map((f) => f.personId)).toContain(
      candidate.id,
    );
    // File once.
    const again = fileCandidacy(api, {
      personId: candidate.id,
      contestId: contest.id,
      platform: [],
    });
    expect(again.status).toBe("refused");
    // A child can't file, and is told the age rule.
    const child = [...core.people.values()].find(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) < 16,
    );
    if (child) {
      const refused = fileCandidacy(api, {
        personId: child.id,
        contestId: contest.id,
        platform: [],
      });
      expect(refused.status).toBe("refused");
      if (refused.status === "refused")
        expect(refused.unmet.map((u) => u.rule)).toContain("minimum-age");
    }
    govReport(
      "elections-filing",
      JSON.stringify({
        contest: contest.title,
        filedWith: filing.filedWith,
        status: filing.status,
      }),
    );
  });
});
