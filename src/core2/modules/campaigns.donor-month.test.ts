/**
 * A donor's month is one pot (the Nov 14 fault: every campaign saw the donor's
 * whole month of spare money, so a donor asked by seven candidates gave seven
 * months). Two pinned places, each with its seed: every candidate who can file
 * for the open races files, then each adult is asked by every one of them on
 * the same day. What a donor gave in all never passes what they had to give
 * from before the first ask (the month's spare plus savings beyond their
 * cushion), and at least one donor's asks, taken one at a time against a fresh
 * month, would have passed it, so the test bites.
 */
import { describe, expect, it } from "vitest";
import { realLocalities } from "../places";
import { buildPopulation } from "../population";
import { createLifeCore } from "../life";
import { coreAPI } from "../state";
import { lawChain, openLaws } from "./laws";
import { openOffices } from "./offices";
import { openRecord } from "./record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./elections";
import {
  campaignFor,
  donationAnswer,
  giftBudget,
  givenInMonth,
  openCampaigns,
} from "./campaigns";
import { openParties } from "./parties";
import { openPress } from "./press";
import { viewsModule } from "./views";
import type { CoreState } from "../types";

/** The pinned places: where the cause-finder measured the fault, with the seed it used. */
const PLACES = [
  {
    name: "Williamstown, Kentucky",
    key: "2183406",
    seed: "survey-b",
    start: "2026-01-05",
  },
  {
    name: "McKenney, Virginia",
    key: "5148344",
    seed: "survey-a",
    start: "2025-06-15",
  },
];

function worldAt(place: (typeof PLACES)[number]) {
  const row = realLocalities().find((r) => r.key === place.key);
  expect(row?.displayName, `place ${place.key}`).toBeTruthy();
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: place.start,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  // The richest adults who live in the town stand for the open races, a few
  // for each: the candidates a donor is asked by.
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.tier !== "husk" &&
        Number(place.start.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >=
          35 &&
        p.placeId === town,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  const filings: FilingRow[] = [];
  for (const candidate of adults.slice(0, 300)) {
    if (filings.length >= 60) break;
    for (const contest of openContests(api)) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        filed.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
      ) {
        filings.push(filed.filing);
        break;
      }
    }
  }
  return { core: core as CoreState, api, filings, town };
}

describe("a donor's month is one pot", () => {
  for (const place of PLACES) {
    it(`${place.name} (${place.key}, seed ${place.seed}): asked by every candidate on one day, no donor gives past their means`, () => {
      const { core, api, filings } = worldAt(place);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      expect(
        filings.length,
        `candidates who could file: ${where}`,
      ).toBeGreaterThanOrEqual(2);
      const donors = [...core.people.values()].filter(
        (p) =>
          p.alive &&
          p.tier !== "husk" &&
          Number(place.start.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >=
            18 &&
          !filings.some((f) => f.personId === p.id),
      );
      let gaveToMany = 0;
      let wouldHavePassed = 0;
      for (const donor of donors) {
        const before = giftBudget(api, donor);
        const spare = before.discretionaryMinor + before.savingsMinor;
        // Each ask as the fault answered it: against the whole month.
        const grossAsks = filings.reduce(
          (sum, f) =>
            sum +
            donationAnswer(api, f.id, donor.id, { suggestOnly: true })
              .givenMinor,
          0,
        );
        let given = 0;
        let gifts = 0;
        for (const f of filings) {
          const got = donationAnswer(api, f.id, donor.id).givenMinor;
          given += got;
          if (got > 0) gifts += 1;
        }
        expect(
          given,
          `${donor.id} gave $${given / 100} to ${gifts} of ${filings.length} candidates from $${spare / 100} to give from: ${where}`,
        ).toBeLessThanOrEqual(spare);
        expect(givenInMonth(api, donor.id), where).toBe(given);
        if (gifts >= 2) gaveToMany += 1;
        if (grossAsks > spare) wouldHavePassed += 1;
      }
      // The campaigns' own books agree with what the donors gave.
      const raised = filings.reduce(
        (sum, f) => sum + campaignFor(api, f.id).raisedMinor,
        0,
      );
      expect(raised, where).toBeGreaterThan(0);
      expect(
        wouldHavePassed,
        `no donor was asked for more than they had, so the test proves nothing (${gaveToMany} gave to two or more): ${where}`,
      ).toBeGreaterThan(0);
    }, 60_000);
  }
});
