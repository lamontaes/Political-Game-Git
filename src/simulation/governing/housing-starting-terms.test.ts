/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { makeIsoDate } from "../dates";
import { lifePlaceByKey } from "../life-places";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { readFinalEnactedLawTerm } from "./final-law-term-query";
import { lawInForce, type LawInForce } from "./law-in-force";

const questionKey = "us-policy-positions:housing-land-use.rent-stabilization";
const row = startingLaw.questions[questionKey].answers["US-OR"];
const seed = "housing-starting-terms:ordinary-opening";
const places = PLACE_POPULATION_ROWS.split(";").map(
  (entry) => entry.split(":")[0]!,
);
const placeKey = places[new SeededRng(seed).integer(0, places.length - 1)]!;

function read(
  world: World,
  law: LawInForce,
  key: string,
  unit: "ratio" | "years",
) {
  return readFinalEnactedLawTerm(world, law, {
    questionKey,
    termKey: key,
    unit,
  });
}

describe("sourced Oregon annual rent terms", () => {
  it("selects the official annual cap without losing the construction exemption", () => {
    for (const phase of row.phases) {
      const world = { currentDate: makeIsoDate(phase.operativeAt) } as World;
      const law: LawInForce = {
        answer: "yes",
        origin: "in-force-at-start",
        measureId: `starting-law:US-OR:${questionKey}` as EntityId,
        operativeAt: world.currentDate,
        operativeBasis: "enacted-date",
        level: "state-statute",
      };
      const cap = phase.lawTerms.find((term) => term.key === "cap")!;
      expect(read(world, law, "cap", "ratio")?.value).toBe(cap.value);
      expect(
        read(world, law, "new-construction-exemption-years", "years")?.value,
      ).toBe(
        row.lawTerms.find(
          (term) => term.key === "new-construction-exemption-years",
        )!.value,
      );
      expect(phase.source).toBe(
        "https://www.oregon.gov/das/oea/pages/rent-stabilization.aspx",
      );
    }
    expect(
      row.phases
        .find((phase) => phase.operativeAt === "2026-01-01")
        ?.lawTerms.find((term) => term.key === "cap")?.value,
    ).toBe(0.095);
    expect(row.constructionSource).toContain("SB611/Enrolled");
  });

  const oregonPlaces = places.filter((key) => key.startsWith("41"));
  const oregonPlaceKey =
    oregonPlaces[new SeededRng(seed).integer(0, oregonPlaces.length - 1)]!;
  it.each([placeKey, oregonPlaceKey])(
    "retains the ordinary opening law across reload in %s",
    (openingPlaceKey) => {
      const opened = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: openingPlaceKey,
        seed,
      });
      const world = opened.world;
      const jurisdictionId =
        lifePlaceByKey(openingPlaceKey)!.context.jurisdiction.id;
      const propositionId = world.policyCatalog!.propositionOrder.find(
        (id) =>
          world.policyCatalog!.propositions[id]!.stableKey === questionKey,
      )!;
      expect(propositionId).toBeDefined();
      const law = lawInForce(world, jurisdictionId, propositionId);
      expect(law).not.toBeNull();
      if (openingPlaceKey === oregonPlaceKey) {
        expect(law?.answer).toBe("yes");
        expect(law && read(world, law, "cap", "ratio")?.value).toBe(0.095);
        expect(
          law &&
            read(world, law, "new-construction-exemption-years", "years")
              ?.value,
        ).toBe(15);
      }
      const reloaded = deserializeWorld(serializeWorld(world));
      const savedLaw = lawInForce(reloaded, jurisdictionId, propositionId);
      expect(savedLaw).toEqual(law);
      expect(reloaded.personOrder.length).toBe(world.personOrder.length);
      if (law && savedLaw)
        expect(read(reloaded, savedLaw, "cap", "ratio")).toEqual(
          read(world, law, "cap", "ratio"),
        );
      writeFileSync(
        `/tmp/a57-housing-opening-${openingPlaceKey}-receipt.json`,
        JSON.stringify({
          seed,
          placeKey: openingPlaceKey,
          people: world.personOrder.length,
          answer: law?.answer,
          cap: law ? (read(world, law, "cap", "ratio")?.value ?? null) : null,
          reload: "equal",
        }),
      );
    },
    120_000,
  );
});
