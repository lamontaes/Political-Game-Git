import { afterEach, describe, expect, it, vi } from "vitest";
import * as lawInForceModule from "../governing/law-in-force";
import type { LawInForce } from "../governing/law-in-force";
import { lawExposuresOf } from "../law-exposure";
import * as outcomeWeb from ".";
import { recordEnvironmentEnergyLandings } from "./environment-energy-landings";
import { lifePlaceStateIdentities } from "../life-places";
import { recordWorldEvent } from "../world";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";
import { smallWorld } from "../../../tests/fixtures/small-world";

afterEach(() => vi.restoreAllMocks());

const CAUSES: Readonly<Record<string, { key: string; factor: number }>> = {
  "disaster.flood-damage": {
    key: "flood-zone-limits-to-damage",
    factor: 0.98,
  },
  "env.litter": { key: "container-deposit-to-litter", factor: 0.55 },
  "household.prices": {
    key: "container-deposit-to-prices",
    factor: 1.0005,
  },
  "env.particulates": {
    key: "emission-rules-to-particulates",
    factor: 0.977,
  },
};

const QUESTIONS = [
  "us-policy-positions:environment-energy.restrict-building-in-flood-zones",
  "us-policy-positions:environment-energy.bottle-deposit",
  "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties",
] as const;

describe("environmental laws reach residents through their place outcome", () => {
  it("uses the 51-place median for the five territories without a PM2.5 reading", () => {
    const places = PLACE_OUTCOME_BASES["env.particulates"]!.places;
    expect(Object.keys(places)).toHaveLength(56);
    for (const territory of ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"])
      expect(places[territory]).toBe(7.9);
  });

  it("uses one deterministic record path in all 56 places", () => {
    for (const place of lifePlaceStateIdentities()) {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        laws: QUESTIONS,
        seed: `environment-law-landings:${place.jurisdictionKey}`,
      });
      const questionsById = new Map(
        Object.values(fixture.world.policyCatalog.propositions).map((row) => [
          row.id,
          row.stableKey,
        ]),
      );
      vi.spyOn(outcomeWeb, "outcomeFactor").mockImplementation(
        (_world, _jurisdictionId, outcome) =>
          ({
            multiplier: CAUSES[outcome]?.factor ?? 1,
            causes: CAUSES[outcome] ? [CAUSES[outcome]!] : [],
          }) as unknown as ReturnType<typeof outcomeWeb.outcomeFactor>,
      );
      vi.spyOn(lawInForceModule, "lawInForce").mockImplementation(
        (_world, _jurisdictionId, propositionId, at) => {
          const question = questionsById.get(propositionId);
          if (!question) return null;
          return {
            answer: "yes",
            measureId:
              `starting-law:${place.jurisdictionKey}:${question}` as never,
            origin: "in-force-at-start",
            level: "state-statute",
            operativeAt: at ?? fixture.world.currentDate,
            operativeBasis: "enacted-date",
          } satisfies LawInForce;
        },
      );
      const sourceWorld = recordWorldEvent(fixture.world, {
        stableKey: `environment-law-landings:${place.jurisdictionKey}:source`,
        type: "environment.outcome-recorded",
        occurredAt: fixture.world.currentDate,
        recordedAt: fixture.world.currentDate,
        jurisdictionId: fixture.stateJurisdictionId,
        involvedEntityIds: [fixture.personId],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: ["environment.place-outcome"],
        summary: "A measured environmental outcome changed.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const source = sourceWorld.history.events[0]!.id;
      const changed = recordEnvironmentEnergyLandings(sourceWorld, source);
      const exposures = lawExposuresOf(changed, fixture.personId);

      expect(exposures, place.jurisdictionKey).toHaveLength(4);
      expect(exposures.map((row) => row.channel)).toEqual(
        Array(4).fill("environmental-condition"),
      );
      expect(
        exposures.filter((row) => row.direction === "gain"),
        place.jurisdictionKey,
      ).toHaveLength(3);
      expect(
        exposures.filter((row) => row.direction === "cost"),
        place.jurisdictionKey,
      ).toHaveLength(1);
      expect(exposures.every((row) => row.amount === null)).toBe(true);
      expect(
        lawExposuresOf(
          recordEnvironmentEnergyLandings(changed, source),
          fixture.personId,
        ),
        place.jurisdictionKey,
      ).toHaveLength(4);
      vi.restoreAllMocks();
    }
  });
});
