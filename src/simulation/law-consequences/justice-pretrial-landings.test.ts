import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { lawEffectStamp } from "../law-effect-stamp";
import { lawExposuresOf } from "../law-exposure";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { createLightweightPerson } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createWorld, createWorldId, recordWorldEvent } from "../world";
import { lawExposureSentence } from "../../presentation/law-exposure-lines";
import type { EntityId, World } from "../types";
import { applyPretrialLawLandings } from "./modules/justice-pretrial-landings";

const QUESTION_KEY = "us-policy-positions:justice-public-safety.end-cash-bail";
const SEED = "justice-pretrial-landings-fixture";
const DATE = makeIsoDate("2026-10-01");
const RELEASED = "justice.released-before-trial" as const;
const HELD = "justice.held-before-trial" as const;

function build(
  stateKey: string,
  options: { type?: typeof RELEASED | typeof HELD; stamped?: boolean } = {},
) {
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
  const law = lawInForce(world, jurisdiction.id, proposition.id, DATE)!;
  const type = options.type ?? RELEASED;
  const stamp = lawEffectStamp(law, {
    effectKind: "legal-outcome",
    questionKey: QUESTION_KEY,
    jurisdictionId: jurisdiction.id,
    appliedAt: DATE,
  });
  world = recordWorldEvent(world, {
    ...(options.stamped === false || !stamp
      ? {}
      : { lawEffectStamps: [{ ...stamp, effectKind: type }] }),
    stableKey: "fixture:pretrial",
    type,
    occurredAt: DATE,
    recordedAt: DATE,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [person.id],
    participants: [
      { personId: person.id, role: "focus:defendant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "A pretrial decision.",
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
    (row) => row.stableKey === "fixture:pretrial",
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
  throw new Error(`No place answers ${answer}.`);
};

describe("pretrial law landings", () => {
  it("lands a release on the named defendant as a gain and survives save/continue", () => {
    const { world, event, personId, law } = build(answering("yes"));
    const landed = applyPretrialLawLandings(world, event.id);
    expect(lawExposuresOf(landed, personId)).toMatchObject([
      {
        measureId: law.measureId,
        channel: "court-rule",
        relation: "own",
        direction: "gain",
        sourceRecordId: event.id,
      },
    ]);
    expect(
      lawExposureSentence(
        landed,
        personId,
        lawExposuresOf(landed, personId)[0]!,
      ),
    ).toMatch(/^The .* law let you go home while waiting for trial\.$/);
    expect(applyPretrialLawLandings(landed, event.id)).toBe(landed);
    const restored = deserializeWorld(serializeWorld(landed));
    expect(lawExposuresOf(restored, personId)).toEqual(
      lawExposuresOf(landed, personId),
    );
  });

  it("lands a judge's hold as a cost", () => {
    const { world, event, personId } = build(answering("yes"), { type: HELD });
    const landed = applyPretrialLawLandings(world, event.id);
    expect(lawExposuresOf(landed, personId)).toMatchObject([
      { channel: "court-rule", direction: "cost" },
    ]);
  });

  it("writes nothing where money bail stands, or without the saved stamp", () => {
    const money = build(answering("no"));
    expect(applyPretrialLawLandings(money.world, money.event.id)).toBe(
      money.world,
    );
    const bare = build(answering("yes"), { stamped: false });
    expect(applyPretrialLawLandings(bare.world, bare.event.id)).toBe(
      bare.world,
    );
    expect(lawExposuresOf(bare.world, bare.personId)).toEqual([]);
  });

  it("requires the source event to exist", () => {
    const { world } = build(answering("yes"));
    expect(() =>
      applyPretrialLawLandings(world, "event_missing" as EntityId),
    ).toThrow("saved source event");
  });
});
