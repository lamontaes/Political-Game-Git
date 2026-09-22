import { describe, expect, it } from "vitest";

import { createDemoWorld } from "./index";
import type {
  EntityId,
  LegislativeCommitmentFirmness,
  LegislativeCommitmentRecord,
  LegislativeMeasureRecord,
  World,
} from "./index";
import {
  bargainingMannerFromRecord,
  conferBargainingManner,
  SHOWING_THEIR_HAND,
} from "./legislature-manner";
import { registeredTraitConsiderations } from "./trait-readings";
import { loadedTraitRegistry } from "./trait-registry";
import { traitDefinitionFromPack } from "./trait-packs";
import { BARGAINING_ANSWER_REQUEST_DECISION } from "./legislative-bargaining-decisions";
import { latestPersonalityTendency } from "./queries";
import { createStableId } from "./ids";

function personId(world: World, index = 0): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing fixture person at index ${index}.`);
  return id;
}

/**
 * Commitments as history, citing events this world really holds, so the
 * provenance the conferral writes points at something rather than at a
 * plausible-looking id.
 */
/**
 * Somebody this world has an event about, and that event. A commitment cites
 * the event it was made at, and the mind layer will not accept a source the
 * person had no access to — in play that is the bargaining turn they were in,
 * so the fixture has to be at least as honest.
 */
function someoneWithAnEvent(world: World): {
  readonly actor: EntityId;
  readonly eventId: EntityId;
} {
  for (const event of world.history.events) {
    if (event.occurredAt > world.currentDate) continue;
    const actor = event.involvedEntityIds.find((id) => !!world.people[id]);
    if (actor) return { actor, eventId: event.id };
  }
  throw new Error("The fixture world holds no event involving a person.");
}

/**
 * Distinct sittings for a member's commitments.
 *
 * A manner is read from occasions rather than from clauses, so a fixture that
 * puts every commitment at one event is describing a single appearance and
 * should read as one. These are the separate appearances an ordinary run of
 * play would produce.
 */
function sittings(
  world: World,
  holderPersonId: EntityId,
  count: number,
): { readonly world: World; readonly eventIds: readonly EntityId[] } {
  const template = world.history.events.find(
    (event) =>
      event.occurredAt <= world.currentDate &&
      event.involvedEntityIds.includes(holderPersonId),
  );
  if (!template) {
    throw new Error("The fixture world holds no event for this member.");
  }
  // Separate appearances, copied from one the world really holds so the shape
  // is the world's own rather than invented. A member who bargains three times
  // was at three sittings; a fixture that reuses one event is describing a
  // single appearance and should read as one.
  const added = Array.from({ length: Math.max(0, count - 1) }, (_, index) => ({
    ...template,
    id: createStableId("event", `${world.id}:synthetic:sitting:${index}`),
    stableKey: `synthetic:sitting:${index}`,
    sequence: world.history.nextSequence + index,
    summary: "Another sitting this member was at.",
  }));
  return {
    world: {
      ...world,
      history: {
        ...world.history,
        events: [...world.history.events, ...added],
        nextSequence: world.history.nextSequence + added.length,
      },
    },
    eventIds: [template.id, ...added.map((event) => event.id)],
  };
}

function withCommitments(
  world: World,
  holderPersonId: EntityId,
  firmnesses: readonly LegislativeCommitmentFirmness[],
  eventIdOverride?: EntityId,
  options: { readonly allAtOneSitting?: boolean } = {},
): World {
  // One sitting per commitment unless the case is deliberately about several
  // clauses stated at a single appearance.
  let source = world;
  let eventIds: readonly EntityId[];
  if (eventIdOverride) {
    eventIds = firmnesses.map(() => eventIdOverride);
  } else if (options.allAtOneSitting) {
    eventIds = firmnesses.map(() => someoneWithAnEvent(world).eventId);
  } else {
    const spread = sittings(world, holderPersonId, firmnesses.length);
    source = spread.world;
    eventIds = spread.eventIds;
  }
  world = source;
  // A commitment is about a measure, and world integrity checks that the
  // measure exists, so the fixture supplies one rather than pointing at a
  // plausible-looking id.
  const jurisdictionId = Object.keys(world.jurisdictions)[0] as
    EntityId | undefined;
  if (!jurisdictionId) {
    throw new Error("The fixture world holds no jurisdiction.");
  }
  const measure: LegislativeMeasureRecord = {
    id: createStableId("legislative-measure", "synthetic:measure"),
    stableKey: "synthetic:measure",
    sequence: world.history.nextSequence,
    jurisdictionId,
    rulePackId: "us-ky-general-assembly-v1",
    designation: "HB 1",
    shortTitle: "A measure recorded for a test",
    summary: "Exists so a commitment has something to be about.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
  };
  // History is append-oriented and its sequence has to stay contiguous, so
  // these records take the next sequences rather than starting again at zero.
  const first = world.history.nextSequence + 1;
  const records: LegislativeCommitmentRecord[] = firmnesses.map(
    (firmness, index) => ({
      id: createStableId(
        "legislative-commitment",
        `synthetic:commitment:${index}`,
      ),
      stableKey: `synthetic:commitment:${index}`,
      sequence: first + index,
      holderPersonId,
      subject: {
        question: {
          measureId: measure.id,
          purpose: "floor-stage",
          forumKey: null,
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Final passage",
      },
      stance: "support",
      firmness,
      conditions: [],
      audience: "private",
      statedAt: world.currentDate,
      eventId: eventIds[index] ?? eventIds[0]!,
      claimId: null,
      heardByPersonIds: [],
      statement: "Recorded for a test.",
    }),
  );
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeCommitments: records,
      nextSequence: first + records.length,
    },
  };
}

describe("reading a member's manner from their own record", () => {
  it("says unknown for a member who has never stated a commitment", () => {
    const world = createDemoWorld("manner-none");
    expect(bargainingMannerFromRecord(world, personId(world))).toEqual({
      state: "unknown",
    });
  });

  it("says unknown for one or two answers, because that is not a pattern", () => {
    const base = createDemoWorld("manner-thin");
    const actor = personId(base);
    const world = withCommitments(base, actor, ["explicit", "explicit"]);
    expect(bargainingMannerFromRecord(world, actor)).toEqual({
      state: "unknown",
    });
  });

  it("says unknown for three clauses stated at one sitting, because that is one appearance", () => {
    const base = createDemoWorld("manner-one-sitting");
    const actor = personId(base);
    const world = withCommitments(
      base,
      actor,
      ["explicit", "explicit", "explicit"],
      undefined,
      { allAtOneSitting: true },
    );
    // Three commitment rows, one occasion. Counting rows would read this as a
    // clear majority of plain answers over a share of 1.0 and call the member
    // strongly hand-showing off a single appearance, citing one event.
    expect(world.history.legislativeCommitments).toHaveLength(3);
    expect(
      new Set(
        (world.history.legislativeCommitments ?? []).map(
          (record) => record.eventId,
        ),
      ).size,
    ).toBe(1);
    expect(bargainingMannerFromRecord(world, actor)).toEqual({
      state: "unknown",
    });
  });

  it("reads three answers at three sittings, which is the same rows spread out", () => {
    const base = createDemoWorld("manner-three-sittings");
    const actor = personId(base);
    const world = withCommitments(base, actor, [
      "explicit",
      "explicit",
      "explicit",
    ]);
    const reading = bargainingMannerFromRecord(world, actor);
    expect(reading.state).toBe("observed");
    if (reading.state !== "observed") return;
    expect(reading.value).toBe(2);
    expect(reading.eventIds).toHaveLength(3);
  });

  it("reads a clear majority of plain answers as strongly showing their hand", () => {
    const base = createDemoWorld("manner-plain");
    const actor = personId(base);
    const world = withCommitments(base, actor, [
      "explicit",
      "explicit",
      "explicit",
      "noncommittal",
    ]);
    const reading = bargainingMannerFromRecord(world, actor);
    expect(reading).toMatchObject({ state: "observed", value: 2, plain: 3 });
  });

  it("reads a narrow edge as a moderate lean rather than a strong one", () => {
    const base = createDemoWorld("manner-narrow");
    const actor = personId(base);
    const world = withCommitments(base, actor, [
      "noncommittal",
      "provisional",
      "explicit",
      "qualified",
    ]);
    expect(bargainingMannerFromRecord(world, actor)).toMatchObject({
      state: "observed",
      value: -1,
    });
  });

  it("counts a qualified answer on neither side, because it is both", () => {
    const base = createDemoWorld("manner-qualified");
    const actor = personId(base);
    const world = withCommitments(base, actor, [
      "qualified",
      "qualified",
      "qualified",
    ]);
    expect(bargainingMannerFromRecord(world, actor)).toMatchObject({
      state: "observed",
      value: 0,
    });
  });
});

describe("conferring it", () => {
  it("writes nothing for a member whose record says nothing", () => {
    const world = createDemoWorld("confer-none");
    expect(conferBargainingManner(world, personId(world))).toBe(world);
  });

  it("writes nothing for the controlled character", () => {
    const demo = createDemoWorld("confer-player");
    const { actor, eventId } = someoneWithAnEvent(demo);
    const base: World = {
      ...demo,
      control: { kind: "person", personId: actor },
    };
    const world = withCommitments(
      base,
      actor,
      ["explicit", "explicit", "explicit"],
      eventId,
    );
    expect(conferBargainingManner(world, actor)).toBe(world);
  });

  it("writes a record citing the events its commitments happened at", () => {
    const base = createDemoWorld("confer-writes");
    const actor = someoneWithAnEvent(base).actor;
    const world = conferBargainingManner(
      withCommitments(base, actor, ["explicit", "explicit", "explicit"]),
      actor,
    );
    const trait = loadedTraitRegistry().traits.get(SHOWING_THEIR_HAND);
    if (!trait) throw new Error("The build does not load the trait.");
    const record = latestPersonalityTendency(
      world,
      actor,
      traitDefinitionFromPack(trait).id,
    );
    expect(record?.expressionKey).toBe(trait.poles.high.key);
    expect(record?.strength).toBe("strong");
    expect(record?.provenance.kind).toBe("reflection");
    expect(record?.provenance.sourceRefs.length).toBeGreaterThan(0);
    expect(
      new Set(record?.provenance.sourceRefs.map((ref) => JSON.stringify(ref)))
        .size,
    ).toBe(record?.provenance.sourceRefs.length);
    expect(record?.provenance.note).toContain("plain commitments");
  });

  it("does not write a second time when the reading has not moved", () => {
    const base = createDemoWorld("confer-idempotent");
    const actor = someoneWithAnEvent(base).actor;
    const once = conferBargainingManner(
      withCommitments(base, actor, ["explicit", "explicit", "explicit"]),
      actor,
    );
    expect(conferBargainingManner(once, actor)).toBe(once);
  });

  it("reaches the sitting: a conferred member now has a reason to commit", () => {
    const base = createDemoWorld("confer-reaches");
    const actor = someoneWithAnEvent(base).actor;
    const before = registeredTraitConsiderations(
      base,
      loadedTraitRegistry(),
      actor,
      "bargaining",
      BARGAINING_ANSWER_REQUEST_DECISION.id,
    );
    expect(before).toEqual([]);
    const world = conferBargainingManner(
      withCommitments(base, actor, ["explicit", "explicit", "explicit"]),
      actor,
    );
    const after = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      actor,
      "bargaining",
      BARGAINING_ANSWER_REQUEST_DECISION.id,
    );
    expect(after).toHaveLength(1);
    expect(after[0]!.optionKey).toBe("commit");
  });
});
