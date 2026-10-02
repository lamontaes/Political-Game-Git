/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  LOCAL_BUSINESS_KINDS,
  LOCAL_BUSINESS_PLACEHOLDER,
  localBusinessWageMinor,
} from "./local-economy";
import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "./life-places";
import { SeededRng, pickDistinct } from "./rng";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";

describe("what a local business pays its staff", () => {
  it("is the published wage for the worker's occupation where the town is", () => {
    const town = lifePlaceByKey("3260600")!.context.jurisdiction.id;
    for (const kind of LOCAL_BUSINESS_KINDS) {
      const wage = localBusinessWageMinor(kind, town);
      expect(wage.sourced).toBe(true);
      expect(wage.monthlyMinor).toBeGreaterThan(0);
    }
  });

  it("says so when no wage is published, and uses the marked placeholder", () => {
    const wage = localBusinessWageMinor(LOCAL_BUSINESS_KINDS[0]!, null);
    expect(wage.sourced).toBe(false);
    expect(wage.monthlyMinor).toBe(LOCAL_BUSINESS_PLACEHOLDER.monthlyWageMinor);
  });
});

it("opens one new game in a sampled place with recorded wage hours", () => {
  const seed = "standby3-recorded-worker-hours-opening";
  const rng = new SeededRng(seed);
  const state = pickDistinct(rng, lifePlaceStateIdentities(), 1)[0]!;
  const place = pickDistinct(
    rng,
    searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
      scope: "locality",
      stateJurisdictionKey: state.jurisdictionKey,
    }),
    1,
  )[0]!;
  console.info("STANDBY3_NEW_GAME_START", {
    seed,
    placeKey: place.key,
    place: place.context.jurisdiction.name,
  });
  const opened = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      questionnaire: "skipped",
    }),
  ).game;
  expect(opened).not.toBeNull();
  expect(opened!.world.control).toEqual({
    kind: "person",
    personId: opened!.playerPersonId,
  });
  writeFileSync(
    "/tmp/standby3-worker-hours-opening.json",
    JSON.stringify(
      {
        seed,
        state: state.jurisdictionKey,
        placeKey: place.key,
        place: place.context.jurisdiction.name,
        date: opened!.world.currentDate,
        personId: opened!.playerPersonId,
        workRecords: opened!.world.history.workRelationships.length,
      },
      null,
      2,
    ),
  );
});
