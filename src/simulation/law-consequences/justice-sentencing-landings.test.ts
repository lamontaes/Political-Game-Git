import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { lawExposuresOf } from "../law-exposure";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { createLightweightPerson } from "../people";
import { SeededRng } from "../rng";
import { createWorld, createWorldId, recordWorldEvent } from "../world";
import type { EntityId, World } from "../types";
import { applySentencingLawLandings } from "./modules/justice-sentencing-landings";

const QUESTION_KEY =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const SEED = "justice-sentencing-landings-fixture";
const DATE = makeIsoDate("2026-10-01");

function build(stateKey: string) {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  const person = createLightweightPerson({
    worldId: createWorldId(SEED, "production"),
    worldSeed: SEED,
    index: 0,
    currentDate: DATE,
    homeJurisdictionId: jurisdiction.id,
    birthplaceJurisdictionId: jurisdiction.id,
    profile: "production",
  });
  let world: World = createWorld({
    seed: SEED,
    currentDate: DATE,
    jurisdictions: [jurisdiction],
    people: [person],
    lineage: "production",
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === QUESTION_KEY,
  )!;
  const law = lawInForce(world, jurisdiction.id, proposition.id, DATE);
  world = recordWorldEvent(world, {
    stableKey: "fixture:sentence",
    type: "justice.sentenced",
    occurredAt: DATE,
    recordedAt: DATE,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [person.id],
    participants: [
      { personId: person.id, role: "focus:defendant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "A sentence.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = world.history.events.find(
    (row) => row.stableKey === "fixture:sentence",
  )!;
  return { world, event, personId: person.id, law };
}

// A place drawn at random from all 56 by the seed.
const KEYS = lifePlaceStateIdentities().map((row) => row.jurisdictionKey);
const PLACE = new SeededRng(SEED).pick(KEYS);

describe("mandatory minimum sentencing landings", () => {
  it(`writes nothing where no minimum law is in force (${PLACE}, seed ${SEED})`, () => {
    const { world, event, personId, law } = build(PLACE);
    // No state's starting law answers this question, so only an enacted
    // minimum can reach a defendant.
    expect(law).toBeNull();
    expect(
      applySentencingLawLandings(world, event.id, "measure:other" as EntityId),
    ).toBe(world);
    expect(lawExposuresOf(world, personId)).toEqual([]);
  });

  it.todo(
    "lands a bound jail sentence on the named defendant once a state law can be enacted in a test world (enactLawFixture stalls at awaiting-executive on main)",
  );
});
