import { describe, expect, it } from "vitest";
import {
  POLITICAL_CULTURE_JURISDICTIONS,
  politicalCultureFactors,
  politicalCultureFor,
  searchLifePlaces,
} from "../simulation";
import type { JurisdictionPoliticalCulture, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

function ohioLife(): { world: World; playerPersonId: string } {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OH",
    scope: "locality",
  })[0]!;
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "political-culture-ohio",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
}

function propositionEngaging(world: World, principleName: string) {
  const principle = Object.values(world.policyCatalog.principles).find(
    (candidate) => candidate.name === principleName,
  )!;
  const proposition = world.policyCatalog.propositionOrder
    .map((id) => world.policyCatalog.propositions[id]!)
    .find((candidate) =>
      candidate.principles?.some((row) => row.principleId === principle.id),
    )!;
  const bearing = proposition.principles!.find(
    (row) => row.principleId === principle.id,
  )!.bearing;
  return { principle, proposition, bearing };
}

describe("a place's political culture", () => {
  it("has a record for every state, the District and all five inhabited territories", () => {
    expect(POLITICAL_CULTURE_JURISDICTIONS).toHaveLength(56);
    expect(new Set(POLITICAL_CULTURE_JURISDICTIONS).size).toBe(56);
    for (const key of ["US-MA", "US-DC", "US-PR", "US-GU", "US-AS", "US-MP"])
      expect(politicalCultureFor(key)?.jurisdictionKey).toBe(key);
    expect(politicalCultureFor("US-XX")).toBeNull();
  });

  it("invents no culture: every record awaits research and pulls on nobody", () => {
    for (const key of POLITICAL_CULTURE_JURISDICTIONS) {
      const culture = politicalCultureFor(key)!;
      expect(culture.basis).toBe("awaiting-research");
      expect(culture.leanings).toBeNull();
    }
    const { world, playerPersonId } = ohioLife();
    for (const propositionId of world.policyCatalog.propositionOrder)
      expect(
        politicalCultureFactors(world, playerPersonId, propositionId),
      ).toEqual([]);
  });

  it("once researched, pulls gently toward the side of a question that sits with the lean", () => {
    const { world, playerPersonId } = ohioLife();
    const { principle, proposition, bearing } = propositionEngaging(
      world,
      "Limited government",
    );
    // A test fixture, not a claim about Ohio: the shape a researched row takes.
    const fixture = (
      direction: "toward" | "against",
    ): ((key: string) => JurisdictionPoliticalCulture | null) => {
      return (key) =>
        key === "US-OH"
          ? {
              jurisdictionKey: key,
              basis: "researched",
              leanings: [
                {
                  principleKey: principle.stableKey,
                  direction,
                  strength: "moderate",
                  evidence: "test fixture",
                },
              ],
            }
          : null;
    };
    const toward = politicalCultureFactors(
      world,
      playerPersonId,
      proposition.id,
      fixture("toward"),
    );
    expect(toward).toHaveLength(1);
    expect(toward[0]).toMatchObject({
      favors:
        bearing === "consistent-with"
          ? "tentative-support"
          : "tentative-opposition",
      importance: "moderate",
      confidence: "low",
      sourceType: "context:political-culture",
    });
    const against = politicalCultureFactors(
      world,
      playerPersonId,
      proposition.id,
      fixture("against"),
    );
    expect(against[0]!.favors).toBe(
      bearing === "consistent-with"
        ? "tentative-opposition"
        : "tentative-support",
    );
    // The explanation names the principle and nothing about where it was read.
    expect(toward[0]!.explanation).toBe(
      `Where they live, people tend to lean toward ${principle.name.toLowerCase()}.`,
    );

    // Another state's culture does not reach an Ohioan.
    expect(
      politicalCultureFactors(world, playerPersonId, proposition.id, (key) =>
        key === "US-MA" ? fixture("toward")("US-OH") : null,
      ),
    ).toEqual([]);
  });
});
