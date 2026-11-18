/**
 * A race needs the signatures its own law sets for its own electorate
 * (owner, Nov 14: "obviously one signature U.S. senator, that shouldn't
 * happen"). A statewide or district petition asks the law's whole count, or
 * its formula computed from the race's voters, never the town's share of it;
 * the signatures the town cannot give are gathered among the race's voters
 * outside the town by the campaign's paid circulators, paid on the journal,
 * arriving over the days the petition circulates, and counted by the clerk.
 *
 * Pinned places and seeds (never a draw): Edgar, Wisconsin (5522550), seed
 * edgar-petition-1, where a special U.S. Senate race once asked one
 * signature; Fort Payne, Alabama (0127616), seed fort-payne-petition-1, where
 * an independent for governor reads Alabama's formula (3% of the votes cast
 * for governor, at a midterm's turnout).
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import filingResearch from "../../data/research/elections/filing-requirements.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  campaignFor,
  circulatorsCanWork,
  contributeOwnMoney,
  hireCirculators,
  signaturesToGather,
  unitPrice,
} from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  filingRequirements,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { vacateSeat } from "./modules/offices";
import {
  cycleTurnout,
  electorateRoll,
  petitionNeededHere,
} from "./modules/voting";
import { wideElectorate } from "./race-places";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const FAMILIES = [
  "statewideExecutive",
  "stateLegislative",
  "countyOffice",
  "municipalOffice",
  "usHouse",
] as const;

/** The town's adults of at least `age`, the most cash first: who can file for a Senate seat and fund a petition. */
function filersOf(core: CoreState, age: number) {
  const api = coreAPI(core);
  const town = (
    api.moduleState(ELECTIONS_MODULE_ID).table("town").get("town") as {
      townPlaceId: string;
    }
  ).townPlaceId;
  const year = Number(core.date.slice(0, 4));
  return [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        p.id !== core.playerId &&
        year - Number(p.birthDate.slice(0, 4)) > age,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
}

/** File the first of the town's adults the clerk accepts. */
function fileFirst(
  api: CoreAPI,
  core: CoreState,
  contestId: string,
  age: number,
): FilingRow {
  for (const person of filersOf(core, age)) {
    const result = fileCandidacy(api, {
      personId: person.id,
      contestId,
      platform: [],
      party: null,
    });
    if (result.status !== "refused") return result.filing;
  }
  throw new Error(`No one in town could file for ${contestId}`);
}

describe("a petition asks its own electorate's count", () => {
  it("every place's rule for every office reads a count, a formula or none, never a median", () => {
    const places = Object.keys(
      (filingResearch as { places: Record<string, unknown> }).places,
    );
    expect(places.length).toBe(56);
    for (const place of places)
      for (const family of FAMILIES)
        for (const side of ["party", "independent"] as const) {
          const rule = filingRequirements(place, family, side).petition;
          expect(
            ["read", "scaled", "none-in-law"],
            `${place} ${family} ${side}`,
          ).toContain(rule.basis);
          if (rule.basis === "scaled")
            expect(rule.scale, `${place} ${family} ${side}`).toBeTruthy();
        }
  });

  it("Edgar, Wisconsin: a special U.S. Senate petition asks the state's 2,000, and paid circulators gather it across the state", () => {
    const { core } = buildBenchWorld("edgar-petition-1", gameStartDate(), {
      twoLevel: true,
      placeKey: "5522550",
    });
    const api = coreAPI(core);
    expect(vacateSeat(api, "seat:US-WI:us-senate:1", "resigned")).toBeTruthy();
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const contest = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find((c) => c.special && c.seatId === "seat:US-WI:us-senate:1");
    expect(contest, "the special Senate race opens").toBeTruthy();
    const filing = fileFirst(api, core, contest!.id, 30);
    const petition = petitionOf(api, filing.id)!;
    // Wisconsin's law: 2,000 signatures statewide (the research row), not
    // the town's share of them (it was one).
    expect(petition.rule.basis).toBe("read");
    expect(petition.needed).toBe(2000);
    expect(circulatorsCanWork(api, filing.id)).toBe(true);
    // A campaign with nothing raised can hire no one.
    const empty = campaignFor(api, filing.id);
    if (empty.raisedMinor - empty.spentMinor <= 0)
      expect(hireCirculators(api, filing.id, 1_000_000)).toBe(0);
    const price = unitPrice(api, "petition-signature");
    const given = contributeOwnMoney(
      api,
      filing.id,
      signaturesToGather(petition.needed) * price,
    );
    expect(given).toBeGreaterThan(0);
    expect(hireCirculators(api, filing.id, given)).toBeGreaterThan(0);
    // The signatures arrive over the days the petition circulates: a week
    // in, part of them, not all.
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const week = petitionOf(api, filing.id)!;
    const weekOutside = Object.values(week.outsideSigned ?? {}).reduce(
      (n, k) => n + k,
      0,
    );
    expect(weekOutside).toBeGreaterThan(0);
    advanceCore(core, addDays(makeIsoDate(petition.due), 2));
    const checked = petitionOf(api, filing.id)!;
    const outside = Object.values(checked.outsideSigned ?? {}).reduce(
      (n, k) => n + k,
      0,
    );
    expect(outside).toBeGreaterThan(weekOutside);
    // Signatures come from the state's counties outside the town.
    expect(Object.keys(checked.outsideSigned ?? {}).length).toBeGreaterThan(10);
    for (const id of Object.keys(checked.outsideSigned ?? {}))
      expect(id.startsWith("county:WI|")).toBe(true);
    // Paid on the journal at the per-signature price.
    expect(campaignFor(api, filing.id).spentByKind?.circulators).toBe(
      outside * price,
    );
    // The clerk counts them as it counts door signatures.
    expect(checked.check?.valid).toBeGreaterThanOrEqual(outside);
    expect(checked.check!.valid).toBeGreaterThanOrEqual(2000);
  }, 240_000);

  it("Fort Payne, Alabama: an independent for governor needs 3% of the state's votes for governor", () => {
    const { core } = buildBenchWorld("fort-payne-petition-1", gameStartDate(), {
      twoLevel: true,
      placeKey: "0127616",
    });
    const api = coreAPI(core);
    const contest = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find((c) => c.seatId === "seat:US-AL:governor");
    expect(contest, "the governor's race is open").toBeTruthy();
    const rule = filingRequirements(
      "US-AL",
      "statewideExecutive",
      "independent",
    ).petition;
    expect(rule.basis).toBe("scaled");
    const voters = electorateRoll(api).reduce((n, v) => n + v.count, 0);
    const wide = wideElectorate(api, contest!, {
      voters,
      population: Number(core.placeMetadata.referencePopulation) || 0,
    })!;
    expect(wide.outside.length).toBeGreaterThan(10);
    // The 2024 votes of the state's places at a midterm's turnout (the
    // governor's race is in 2026), 3% of them.
    const expected = Math.ceil(
      wide.votes * cycleTurnout(contest!.electionDate).share * 0.03,
    );
    // Thousands across the state, never a town's share of it.
    expect(expected).toBeGreaterThan(10_000);
    // The count the clerk will check of an independent's filing.
    expect(petitionNeededHere(api, contest!, rule, null)).toBe(expected);
  }, 120_000);
});
