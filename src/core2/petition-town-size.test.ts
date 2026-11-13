import { describe, expect, it } from "vitest";
import placeCitizenship from "./data/place-citizenship-2024.json" with { type: "json" };
import {
  ELECTIONS_MODULE_ID,
  filingRequirements,
  petitionSignatures,
  type ContestRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { VOTING_MODULE_ID, recordedBase } from "./modules/voting";
import type { CoreAPI } from "./types";
import { corePlaceStateIdentities, searchCorePlaces } from "./place-lookup";

// A council petition is never larger than the town (elections-petition-
// larger-than-the-town): Johnson, Minnesota once asked 30 signatures of a
// town of a few dozen adults, and the player never made the ballot.
const byPlace = (
  placeCitizenship as unknown as {
    byPlace: Record<string, readonly [number, number]>;
  }
).byPlace;

describe("a local petition fits the town", () => {
  it("no locality in any place asks more council signatures than its citizen adults", () => {
    const places = [...corePlaceStateIdentities()].flatMap((state) => [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      }),
    ]);
    let checked = 0;
    let largerThanTownBefore = 0;
    const states = new Set<string>();
    for (const place of places) {
      const geoid = place.sourceGeoid ?? place.key;
      const adults = byPlace[geoid]?.[0];
      if (!place.stateJurisdictionKey || !adults) continue;
      const count = filingRequirements(
        place.stateJurisdictionKey,
        "municipalOffice",
        "party",
      ).petition.count;
      if (count > adults) largerThanTownBefore += 1;
      const rule = filingRequirements(
        place.stateJurisdictionKey,
        "municipalOffice",
        "party",
      ).petition;
      const needed = rule.scale
        ? petitionSignatures(rule.scale, {
            eligible: adults,
            population: adults,
          })
        : Math.min(count, adults);
      expect(
        needed,
        `${place.displayName} (${geoid}): ${needed} of ${adults} citizen adults`,
      ).toBeLessThanOrEqual(adults);
      if (count > 0) expect(needed, place.displayName).toBeGreaterThan(0);
      checked += 1;
      states.add(place.stateJurisdictionKey);
    }
    process.stdout.write(
      `PETITION TOWN SIZE: ${checked} localities in ${states.size} places checked; ${largerThanTownBefore} had a fixed count above their citizen adults\n`,
    );
    expect(checked).toBeGreaterThan(10_000);
    expect(states.size).toBeGreaterThanOrEqual(52);
  });

  it("where the petition is only a way around the fee, none is required (Minnesota's towns)", () => {
    const rule = filingRequirements("US-MN", "municipalOffice", "party");
    expect(rule.petition.count).toBe(0);
    expect(rule.petition.basis).toBe("none-in-law");
    // A place whose law asks signatures and a fee both keeps its petition.
    expect(
      filingRequirements("US-OH", "municipalOffice", "party").petition.count,
    ).toBeGreaterThan(0);
  });

  const asked = (
    usps: string,
    side: "party" | "independent",
    eligible: number,
    population = eligible,
  ) => {
    const rule = filingRequirements(
      `US-${usps}`,
      "municipalOffice",
      side,
    ).petition;
    expect(rule.basis, `${usps} ${side}`).toBe("scaled");
    return petitionSignatures(rule.scale!, { eligible, population });
  };

  it("a floor binds in a small town and a ceiling in a large one (Iowa 2% minimum 10; North Dakota 10% maximum 300; Massachusetts 1% between 20 and 50)", () => {
    expect(asked("IA", "party", 100)).toBe(10);
    expect(asked("ND", "party", 1_000_000)).toBe(300);
    expect(asked("MA", "party", 100)).toBe(20);
    expect(asked("MA", "party", 100_000)).toBe(50);
  });

  it("Vermont asks 30 or 1% of the town's voters, whichever is less", () => {
    expect(asked("VT", "party", 100)).toBe(1);
    expect(asked("VT", "party", 10_000)).toBe(30);
  });

  it("each place's own share scales the count, not one share for every place", () => {
    // Iowa 2% and North Dakota 10% of the same 10,000 voters differ: a flat
    // share would ask both the same.
    const iowa = asked("IA", "party", 10_000);
    const dakota = asked("ND", "party", 10_000);
    expect(dakota).toBe(300);
    expect(iowa).toBe(92);
    expect(iowa).toBeLessThan(dakota);
    expect(asked("IA", "party", 20_000)).toBeGreaterThan(iowa);
  });

  it("a votes base reads the office's recorded votes when the world has them", () => {
    const rule = filingRequirements(
      "US-IA",
      "municipalOffice",
      "party",
    ).petition;
    const town = { eligible: 10_000, population: 15_000 };
    expect(petitionSignatures(rule.scale!, { ...town, votesCast: 1_000 })).toBe(
      20,
    );
    // Without a recorded election the votes are estimated from the town's
    // people times the real votes-cast share (0.46), not from registered voters.
    expect(petitionSignatures(rule.scale!, town)).toBe(138);
    // A registered-voters base stays on registered voters (Georgia's independents: 5%).
    const georgia = filingRequirements(
      "US-GA",
      "municipalOffice",
      "independent",
    ).petition;
    expect(petitionSignatures(georgia.scale!, town)).toBe(368);
  });

  it("a votes base names its election: this office's, the level's, or another kind of office's", () => {
    const election = (usps: string, side: "party" | "independent") =>
      filingRequirements(`US-${usps}`, "municipalOffice", side).petition.scale!
        .election;
    expect(election("IA", "party")).toBe("office");
    expect(election("SD", "party")).toBe("level");
    // Massachusetts' base is the governor's vote in the town, not the council's.
    expect(election("MA", "party")).toBe("governor");
    expect(election("IN", "independent")).toBe("secretary-of-state");
    expect(election("NJ", "independent")).toBe("legislature-lower");
    expect(election("NY", "independent")).toBe("governor");
    expect(election("PA", "independent")).toBe("level");
  });

  it("a rule reads the election it names, not whichever one the town recorded", () => {
    // The town recorded 1,000 votes for its council seat; its own residents
    // cast 3,000 for governor (2,000 named, 1,000 counted) and the rest of
    // the state cast 900,000 more, which are not the town's.
    const contests = new Map<string, unknown>([
      [
        "c:council",
        { id: "c:council", officeId: "office:council", level: "local" },
      ],
      [
        "c:governor",
        { id: "c:governor", officeId: "office:governor", level: "state" },
      ],
    ]);
    const offices = new Map<string, unknown>([
      ["office:council", { id: "office:council", kind: "council" }],
      ["office:governor", { id: "office:governor", kind: "governor" }],
    ]);
    const result = (
      id: string,
      contestId: string,
      named: number,
      counted: number,
      places = 0,
    ) => ({
      id,
      contestId,
      date: "2026-11-03",
      namedVotes: { a: named },
      countedVotes: { a: counted },
      placeVotes: { elsewhere: places },
      totals: { a: named + counted + places },
    });
    const withResults = (rows: readonly unknown[]) => {
      const tables: Record<string, Record<string, unknown>> = {
        [ELECTIONS_MODULE_ID]: {
          contests: { get: (id: string) => contests.get(id) },
        },
        [OFFICES_MODULE_ID]: {
          offices: { get: (id: string) => offices.get(id) },
        },
        [VOTING_MODULE_ID]: { results: { rows: () => rows } },
      };
      return {
        state: { modules: new Set([VOTING_MODULE_ID]) },
        moduleState: (id: string) => ({
          table: (name: string) => tables[id]![name],
        }),
      } as unknown as CoreAPI;
    };
    const api = withResults([
      result("r:council", "c:council", 600, 400),
      result("r:governor", "c:governor", 2_000, 1_000, 900_000),
    ]);
    const council = contests.get("c:council") as ContestRow;
    const scaleOf = (usps: string, side: "party" | "independent") =>
      filingRequirements(`US-${usps}`, "municipalOffice", side).petition.scale!;
    // Iowa: the votes for the office sought. Pennsylvania's independents and
    // South Dakota: the last municipal election's most votes.
    expect(recordedBase(api, council, scaleOf("IA", "party"))).toBe(1_000);
    expect(recordedBase(api, council, scaleOf("PA", "independent"))).toBe(
      1_000,
    );
    expect(recordedBase(api, council, scaleOf("SD", "party"))).toBe(1_000);
    // Massachusetts: 1% of the governor's vote in the town. The town's 3,000,
    // not the council's 1,000 and not the state's 900,000 more.
    const ma = scaleOf("MA", "party");
    const town = { eligible: 20_000, population: 30_000 };
    const governor = recordedBase(api, council, ma);
    expect(governor).toBe(3_000);
    expect(petitionSignatures(ma, { ...town, votesCast: governor })).toBe(30);
    // With the council's votes as the base it would be 20 (the floor).
    expect(petitionSignatures(ma, { ...town, votesCast: 1_000 })).toBe(20);
    // No governor race held yet: nothing recorded, so the estimate stands
    // (30,000 people × 0.46 = 13,800; 1% is 138, held to the ceiling of 50).
    const early = withResults([result("r:council", "c:council", 600, 400)]);
    expect(recordedBase(early, council, ma)).toBeUndefined();
    expect(petitionSignatures(ma, town)).toBe(50);
    // The merger's inputs: 10,000 recorded governor votes in town → 50.
    expect(petitionSignatures(ma, { ...town, votesCast: 10_000 })).toBe(50);
  });

  it("a count by town size follows the town's people (Ohio 10 in a village, 50 in a city)", () => {
    expect(asked("OH", "party", 300, 900)).toBe(10);
    expect(asked("OH", "party", 8_000, 12_000)).toBe(50);
  });

  it("every scaled rule asks between one and the town's voters, in towns of every size", () => {
    for (const usps of [
      "AZ",
      "CO",
      "CT",
      "GA",
      "IA",
      "IN",
      "MA",
      "MP",
      "MS",
      "ND",
      "NJ",
      "NY",
      "OH",
      "PA",
      "SD",
      "VT",
    ])
      for (const side of ["party", "independent"] as const) {
        const rule = filingRequirements(
          `US-${usps}`,
          "municipalOffice",
          side,
        ).petition;
        if (!rule.scale) continue;
        for (const eligible of [1, 5, 40, 400, 4_000, 400_000]) {
          const n = petitionSignatures(rule.scale, {
            eligible,
            population: eligible * 2,
          });
          expect(n, `${usps} ${side} ${eligible}`).toBeGreaterThanOrEqual(1);
          expect(n, `${usps} ${side} ${eligible}`).toBeLessThanOrEqual(
            eligible,
          );
        }
      }
  });
});
