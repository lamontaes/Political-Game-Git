/**
 * How a council is elected, read from data (gov-council-election-method).
 *
 * Every active municipal government in the Census listing gets a method that
 * adds up; one with no record of its method is estimated at large. In a drawn place whose
 * council has seats chosen by part of town, a ward seat's count takes the
 * voters of its part alone and an at-large seat's takes the whole town.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting, resultOf } from "./modules/voting";
import { councilElectionMethod } from "./gov-rules/council-election-method";
import { allGovernmentUnits } from "./reference/government-units";
import { localOfficesForPlace } from "./offices-local";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`council-method:${Date.now()}`).digest("hex");
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
const councilOf = (placeKey: string) =>
  localOfficesForPlace(placeKey).find((o) => o.kind === "council");

describe("council election method", () => {
  it("adds up for every active municipal government; a council with no record is estimated at large", () => {
    let towns = 0,
      charter = 0;
    for (const unit of allGovernmentUnits()) {
      if (unit.unitType !== "municipality" || !unit.functionalActive) continue;
      const method = councilElectionMethod(unit);
      if (!method) continue;
      towns += 1;
      expect(method.wardSeats + method.atLargeSeats, unit.id).toBe(
        method.seats,
      );
      expect(method.wardSeats, unit.id).toBeGreaterThanOrEqual(0);
      expect(method.atLargeSeats, unit.id).toBeGreaterThanOrEqual(0);
      expect(method.citation, unit.id).toBeTruthy();
      if (method.basis === "charter") {
        charter += 1;
        continue;
      }
      // No record of the method: at large, and the word is "district" (owner
      // ruling, Oct 15); "ward" is the word only where the charter says it.
      expect(method.wardSeats, unit.id).toBe(0);
      expect(method.seatTerm, unit.id).toBe("district");
    }
    expect(towns).toBeGreaterThan(0);
    expect(charter, "some councils are read from a charter").toBeGreaterThan(0);
  });

  it("numbers a council's ward seats and leaves its other seats at large", () => {
    for (let n = 0; n < 40; n += 1) {
      const key = randomPlace(`seats:${n}`).key;
      const council = councilOf(key);
      if (!council) continue;
      const method = council.method;
      expect(method, key).toBeDefined();
      expect(council.wardSeats ?? 0, key).toBeLessThanOrEqual(council.seats);
      expect(council.districted, key).toBe((council.wardSeats ?? 0) > 0);
    }
  });

  it("counts a ward seat's election from its own ward's voters", () => {
    // A drawn place whose council elects some seats by part of town and has a
    // ward seat open at the start; the draw walks on until one does.
    let found:
      | {
          key: string;
          core: ReturnType<typeof createLifeCore>;
          contest: ContestRow;
          wards: number;
        }
      | undefined;
    // Only a council whose own charter sets ward seats is districted.
    const wardPlaces = allGovernmentUnits()
      .filter((unit) => {
        if (unit.unitType !== "municipality" || !unit.functionalActive)
          return false;
        const method = councilElectionMethod(unit);
        return method?.basis === "charter" && method.wardSeats > 0;
      })
      .map((unit) => unit.placeGeoid)
      .filter((key): key is string => !!key)
      .sort();
    expect(wardPlaces.length, "charters with ward seats").toBeGreaterThan(0);
    for (let n = 0; n < 40 && !found; n += 1) {
      const key =
        process.env.GOLDEN_PATH_PLACE_KEY && n === 0
          ? process.env.GOLDEN_PATH_PLACE_KEY
          : pick(wardPlaces, `world:${n}`);
      const council = councilOf(key);
      if (!council?.wardSeats) continue;
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 80,
        }),
      );
      openOffices(core, seed);
      openElections(core);
      const contest = openContests(coreAPI(core)).find(
        (c) => c.family === "municipalOffice" && c.district !== null,
      );
      if (contest) found = { key, core, contest, wards: council.wardSeats };
    }
    expect(found, "no drawn place had a ward seat open").toBeDefined();
    const { key, core, contest, wards } = found!;
    const api = coreAPI(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    // A resident outside the ward is refused for the seat for its recorded
    // reason; two residents inside it file and are on the ballot.
    const unmetBy = (personId: string) =>
      checkEligibility(api, personId, contest.id, null)
        .filter((row) => !row.met)
        .map((row) => row.rule);
    let outside: string | undefined;
    let on = 0;
    for (const person of adults) {
      const unmet = unmetBy(person.id);
      if (unmet.length === 1 && unmet[0] === "district-residency") {
        outside ??= person.id;
        continue;
      }
      if (unmet.length) continue;
      const filed = fileCandidacy(api, {
        personId: person.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        filed.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
      )
        on += 1;
      if (on === 2 && outside) break;
    }
    expect(
      on,
      `${key}: two residents of the ward filed for ${contest.id}`,
    ).toBe(2);
    expect(
      outside,
      `${key}: a resident of another ward for ${contest.id}`,
    ).toBeDefined();
    const refused = fileCandidacy(api, {
      personId: outside!,
      contestId: contest.id,
      platform: [],
    });
    expect(refused.status, `${key}: ${outside}`).toBe("refused");
    if (refused.status === "refused") {
      expect(
        refused.unmet.map((row) => row.rule),
        `${key}: ${outside}`,
      ).toContain("district-residency");
      // The refusal carries the two wards as record data, not worded text.
      const row = refused.unmet.find((r) => r.rule === "district-residency")!;
      expect(row.required, key).toBe(String(contest.district));
      expect(row.actual, key).toMatch(/^\d+$/);
      expect(row.actual, key).not.toBe(row.required);
    }
    const after = new Date(
      Date.parse(`${contest.electionDate}T00:00:00Z`) + 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    advanceCore(core, after);
    const result = resultOf(api, contest.id)!;
    const { townPlaceId } = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string };
    const townAdults = [...core.people.values()].filter(
      (p) =>
        p.alive &&
        p.placeId === townPlaceId &&
        Number(contest.electionDate.slice(0, 4)) -
          Number(p.birthDate.slice(0, 4)) >=
          18,
    ).length;
    // The ward holds an equal run of the town's households, so at most its
    // share of the town's adults, rounded up (a household straddles a cut).
    console.info(
      `council-method ${key} seed ${seed.slice(0, 12)} ${contest.id}: ${wards} wards, ${result.namedEligible} of ${townAdults} named adults counted`,
    );
    expect(result.namedEligible, `${key} ${contest.id}`).toBeGreaterThan(0);
    expect(result.namedEligible, `${key} ${contest.id}`).toBeLessThanOrEqual(
      Math.ceil(townAdults / wards) + 1,
    );
    expect(
      api.moduleState(ELECTIONS_MODULE_ID).table("contests").get(contest.id),
    ).toBeDefined();
  }, 240_000);
});
