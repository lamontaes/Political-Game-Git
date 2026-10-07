import { describe, expect, it } from "vitest";
import {
  composeFromBank,
  readMeetingBank,
  readMinutesBank,
  readLegislationBank,
  type EnglishBank,
} from "./bank-english";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { placeFor, rng } from "../../scripts/playtest/mass-play/driver";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { explicitNewGameSetup } from "./new-game-geography";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { governmentUnitJurisdictionId } from "../simulation/government-units";

const bank: EnglishBank = {
  parts: [
    {
      key: "a",
      move: "m",
      kind: "k",
      text: "Hello {who} on {day}.",
      shippable: true,
    },
    {
      key: "b",
      move: "m",
      kind: "k",
      text: "Greetings {who}.",
      shippable: true,
    },
    {
      key: "c",
      move: "m",
      kind: "k",
      text: "Unshipped {who}.",
      shippable: false,
    },
    {
      key: "d",
      move: "n",
      kind: "k",
      text: "Needs {missing}.",
      shippable: true,
    },
  ],
};

describe("composeFromBank", () => {
  it("fills slots and leaves no braces", () => {
    const made = composeFromBank(bank, "m", { who: "Ana", day: "Monday" }, "x");
    expect(made?.text).toMatch(/Ana/);
    expect(made?.text).not.toContain("{");
    expect(made?.partKey).not.toBe("c");
  });
  it("returns null when a slot has no fact", () => {
    expect(composeFromBank(bank, "n", { who: "Ana" }, "x")).toBeNull();
    expect(composeFromBank(bank, "m", { who: "" }, "x")).toBeNull();
  });
  it("is deterministic for the same pickKey", () => {
    const facts = { who: "Ana", day: "Monday" };
    expect(composeFromBank(bank, "m", facts, "k1")).toEqual(
      composeFromBank(bank, "m", facts, "k1"),
    );
  });
});

describe("generated world", () => {
  it("gives meeting and minutes items or a named reason", () => {
    const random = rng("bank-1");
    const states = lifePlaceStateIdentities();
    let place: ReturnType<typeof placeFor> = null;
    while (!place)
      place = placeFor(
        states[Math.floor(random() * states.length)]!.usps,
        random,
      );
    const setup = explicitNewGameSetup({
      placeKey: place.key,
      seed: "bank-1",
      startAge: 34 as never,
      depth: "summarize-earlier-life",
    });
    const game = createOpeningLifeController(setup).finishTransition().game!;
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const unit = homeLocalGovernmentUnits(world, game.playerPersonId)
      .municipal[0];
    const filed = world.history.legislativeMeasures?.[0];
    if (unit && filed) {
      const measure = {
        ...filed,
        jurisdictionId: governmentUnitJurisdictionId(unit),
      };
      const provision = {
        id: "test-local-provision",
        stableKey: "test-local-provision",
        sequence: 1,
        measureId: measure.id,
        provisionKey: "section-1",
        sectionNumber: 1,
        heading: "WHAT IT WOULD DO",
        text: "Keep the library open until 8 p.m.",
        beneficiary: "public",
        applicationScope: { jurisdictionId: measure.jurisdictionId },
        fiscalExposureLabel: null,
        fiscalExposureMinorUnits: null,
        recordedAt: measure.introducedAt,
        supersedesProvisionId: null,
        originAmendmentId: null,
        eventId: "test-local-event",
      } as NonNullable<typeof world.history.legislativeProvisions>[number];
      const localWorld = {
        ...world,
        history: {
          ...world.history,
          legislativeMeasures: [
            measure,
            ...(world.history.legislativeMeasures ?? []).slice(1),
          ],
          legislativeProvisions: [provision],
        },
      };
      const legislation = readLegislationBank(localWorld, game.playerPersonId);
      expect(Array.isArray(legislation)).toBe(true);
      if (Array.isArray(legislation)) {
        expect(legislation[0]?.text).toContain("An Ordinance concerning");
        expect(legislation[0]?.text).toContain(
          "Keep the library open until 8 p.m.",
        );
        expect(legislation[0]?.text).not.toContain("{");
      }
    }
    for (const reading of [
      readMeetingBank(world, game.playerPersonId),
      readMinutesBank(world, game.playerPersonId),
    ]) {
      if (typeof reading === "string")
        expect(reading.length).toBeGreaterThan(10);
      else for (const line of reading) expect(line.text).not.toContain("{");
    }
  }, 240000);
});
