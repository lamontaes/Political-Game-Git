import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../presentation/ordinary-life";
import { declareHazardEpisode } from "../crisis/disaster";
import { crisisRepairFundingRequests } from "../crisis/notices";
import { deserializeWorld, serializeWorld } from "../serialization";
import { stateJurisdictionForKey } from "../life-places";
import { money } from "../resources";
import type { World } from "../types";
import { recordAdoptedAppropriation } from "./program-governing";
import { repairFundingAnswers } from "./repair-funding";

/**
 * CRISIS records the damage and the aid decision, with no money in it.
 * GOVERNING answers whether any adopted appropriation could pay for the work,
 * once per request, and records the truth either way.
 */

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

function flood(world: World, stateUsps: string, key: string): World {
  const home = world.people[world.personOrder[0]!]!.homeJurisdictionId;
  return declareHazardEpisode(world, {
    stableKey: key,
    family: "flood",
    magnitude: "major",
    stateUsps,
    jurisdictionIds: [home],
    durationDays: 3,
    basis: "Declared test episode; not a local hazard prediction.",
    sourceReference: null,
  });
}

describe("GOVERNING D2: what a disaster declaration means for public money", () => {
  it("records that nothing covers the work when no appropriation is adopted", () => {
    let world = flood(openingWorld("repair-funding-none"), "KY", "flood-none");
    world = passOrdinaryDays(world, 30);
    const requests = crisisRepairFundingRequests(world);
    expect(requests.length).toBeGreaterThan(0);
    // CRISIS carries no money figure, and I do not invent one.
    expect(requests.every((request) => request.amount === null)).toBe(true);

    const answers = repairFundingAnswers(world);
    expect(answers.length).toBe(requests.length);
    expect(answers.every((answer) => !answer.covered)).toBe(true);
    const event = world.history.events.find(
      (row) => row.id === answers[0]!.eventId,
    )!;
    expect(event.summary).toMatch(/No adopted appropriation covers it/);
    expect(event.summary).toMatch(/no public money moves/);
    // Repair units stay physical work; no dollar figure is stated.
    expect(event.summary).not.toMatch(/\$/);

    // Answered once, however far the clock runs afterwards.
    const later = passOrdinaryDays(world, 120);
    expect(repairFundingAnswers(later).length).toBe(answers.length);
    const reopened = deserializeWorld(serializeWorld(later));
    expect(repairFundingAnswers(reopened).length).toBe(answers.length);
  }, 900_000);

  it("points the office at money the government has actually adopted", () => {
    const base = openingWorld("repair-funding-adopted");
    const stateId = stateJurisdictionForKey("US-KY")!.id;
    const adopted = recordAdoptedAppropriation(base, {
      familyKey: "disaster-recovery",
      stateUsps: "KY",
      jurisdictionId: stateId,
      amountMinorUnits: money(500_000_00, "USD").minorUnits,
      adoptedOn: base.currentDate,
      edition: "test-adopted",
      basisNote:
        "Authored test appropriation, adopted before the hazard; not a real budget.",
    })!;
    let world = flood(adopted.world, "KY", "flood-adopted");
    world = passOrdinaryDays(world, 30);

    const answers = repairFundingAnswers(world);
    expect(answers.length).toBeGreaterThan(0);
    expect(answers.some((answer) => answer.covered)).toBe(true);
    const covered = world.history.events.find(
      (row) => row.id === answers.find((answer) => answer.covered)!.eventId,
    )!;
    expect(covered.summary).toMatch(/adopted appropriation/);
    expect(covered.summary).toMatch(/the office's decision/);
    // Naming the money is not spending it.
    expect(covered.summary).not.toMatch(/paid|spent/);
  }, 900_000);
});
