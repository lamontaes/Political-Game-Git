import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { lawExposuresOf } from "../law-exposure";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { createLightweightPerson } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createWorld, createWorldId, recordWorldEvent } from "../world";
import { lawExposureSentence } from "../../presentation/law-exposure-lines";
import type { World } from "../types";
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

// A place drawn at random from all 56, then the first that answers as asked.
const KEYS = lifePlaceStateIdentities().map((row) => row.jurisdictionKey);
const START = Math.abs(
  [...SEED].reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7),
);
const answering = (answer: "yes" | "no") => {
  for (let step = 0; step < KEYS.length; step += 1) {
    const key = KEYS[(START + step) % KEYS.length]!;
    if (build(key).law?.answer === answer) return key;
  }
  return null;
};

describe("mandatory minimum sentencing landings", () => {
  const yes = answering("yes");
  const no = answering("no");

  it.skipIf(!yes)(
    "lands a bound jail sentence on the named defendant and survives save/continue",
    () => {
      const { world, event, personId, law } = build(yes!);
      const landed = applySentencingLawLandings(
        world,
        event.id,
        law!.measureId,
      );
      expect(lawExposuresOf(landed, personId)).toMatchObject([
        {
          measureId: law!.measureId,
          channel: "sentence-rule",
          relation: "own",
          direction: "cost",
          sourceRecordId: event.id,
        },
      ]);
      expect(
        lawExposureSentence(
          landed,
          personId,
          lawExposuresOf(landed, personId)[0]!,
        ),
      ).toMatch(
        /^The .* law set a jail term for you that the judge could not go below\.$/,
      );
      expect(applySentencingLawLandings(landed, event.id, law!.measureId)).toBe(
        landed,
      );
      const restored = deserializeWorld(serializeWorld(landed));
      expect(lawExposuresOf(restored, personId)).toEqual(
        lawExposuresOf(landed, personId),
      );
    },
  );

  it.skipIf(!no)("writes nothing where no minimum is in force", () => {
    const { world, event, law } = build(no!);
    expect(applySentencingLawLandings(world, event.id, law!.measureId)).toBe(
      world,
    );
  });

  it("writes nothing when the bound law is not the one in force", () => {
    const { world, event } = build(KEYS[START % KEYS.length]!);
    expect(applySentencingLawLandings(world, event.id, "measure:other")).toBe(
      world,
    );
  });
});
