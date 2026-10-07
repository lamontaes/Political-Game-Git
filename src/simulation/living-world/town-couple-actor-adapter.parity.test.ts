import { describe, expect, it } from "vitest";
import { romanticConsiderations } from "../couples";
import {
  coupleStageConsent,
  coupleStageOptions,
} from "../couple-stage-contract";
import type { CoupleStage } from "../couple-stage-data";
import { createDemoWorld } from "../demo";
import { createWorld } from "../world";
import { deserializeWorld, serializeWorldPayload } from "../serialization";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { createLifeMindCatalog, LIFE_MIND_IDS } from "../life-mind-content";
import { createMindProvenance, recordPersonalValue } from "../mind";
import type { EntityId, World } from "../types";
import { evaluateTownCoupleActors } from "./town-couple-actor-adapter";

function emptyEvidence() {
  const initial = createDemoWorld("a136-caller-parity");
  const world = {
    ...initial,
    history: {
      ...initial.history,
      personalValues: [],
      partnerships: [],
      relationshipInteractions: [],
    },
  };
  const actors = Object.values(world.people).slice(0, 2);
  expect(actors).toHaveLength(2);
  const personIds: readonly [EntityId, EntityId] = [
    actors[0]!.id,
    actors[1]!.id,
  ];
  return { world, personIds };
}

describe("A136 composed town caller and shared stage contract", () => {
  it("evaluates distinct real actors without adding missing romantic evidence or writes", () => {
    const { world, personIds } = emptyEvidence();
    const history = JSON.stringify(world.history);
    const result = evaluateTownCoupleActors(world, {
      stableKey: "a136-caller:actors",
      personIds,
      stage: "dating",
      startedAt: null,
    });
    expect(result.first.context.actorPersonId).toBe(personIds[0]);
    expect(result.second.context.actorPersonId).toBe(personIds[1]);
    for (const actor of [result.first, result.second]) {
      expect(actor.context.considerations).toEqual([]);
      expect(actor.context.randomness).toBe("none");
    }
    expect(JSON.stringify(world.history)).toBe(history);
  });

  it("uses identical helper options and consent at every stage, omitting missing-duration choices", () => {
    const { world, personIds } = emptyEvidence();
    for (const stage of [
      "dating",
      "cohabiting",
      "married",
    ] satisfies CoupleStage[]) {
      const result = evaluateTownCoupleActors(world, {
        stableKey: `a136-caller:${stage}`,
        personIds,
        stage,
        startedAt: null,
      });
      const options = coupleStageOptions(stage, null, world.currentDate);
      const canonicalOptions = [...options].sort((a, b) =>
        a.key.localeCompare(b.key),
      );
      expect(result.first.context.options).toEqual(canonicalOptions);
      expect(result.second.context.options).toEqual(canonicalOptions);
      expect(result.admittedOptions).toEqual(
        options.filter((option) =>
          coupleStageConsent({
            stage,
            startedAt: null,
            asOfDate: world.currentDate,
            optionKey: option.key,
            first: result.first,
            second: result.second,
          }),
        ),
      );
      expect(options.some((option) => option.key === "move-in")).toBe(false);
      if (stage !== "dating")
        expect(options.some((option) => option.key === "marry")).toBe(false);
      expect(options.some((option) => option.key === "divorce")).toBe(false);
    }
  });

  it("does not authorize a town break-up from two actual true ties (Audit A124)", () => {
    const { world, personIds } = emptyEvidence();
    expect(
      romanticConsiderations(
        world,
        "a136-caller:tie",
        personIds[0],
        personIds[1],
      ),
    ).toEqual([]);
    expect(
      romanticConsiderations(
        world,
        "a136-caller:tie",
        personIds[1],
        personIds[0],
      ),
    ).toEqual([]);
    const result = evaluateTownCoupleActors(world, {
      stableKey: "a136-caller:tie",
      personIds,
      stage: "dating",
      startedAt: null,
    });
    for (const actor of [result.first, result.second]) {
      expect(
        actor.optionEvaluations.every(
          (option) =>
            option.available &&
            option.preference === "mixed" &&
            option.randomContribution === "none",
        ),
      ).toBe(true);
    }
    expect(result.admittedOptions).toEqual([]);
  });
});

/** Controlled authored peer records, not observations of a real population. */
function peerFixture() {
  const demo = createDemoWorld("a136-recorded-peer-receiving");
  return createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    jurisdictions: Object.values(demo.jurisdictions),
    people: demo.personOrder.map((id) => demo.people[id]!),
    mindCatalog: createLifeMindCatalog(),
  });
}

function recordPeer(
  world: World,
  donor: EntityId,
  other: EntityId,
  orientation: "embraces" | "rejects",
) {
  let next = recordPersonalValue(world, {
    stableKey: `a136-peer:value:${donor}`,
    personId: donor,
    valueId: LIFE_MIND_IDS.connection,
    recordedAt: world.currentDate,
    orientation,
    strength: "strong",
    salience: "high",
    qualification: null,
    provenance: createMindProvenance("authored"),
    supersedesValueId: null,
  });
  const input = {
    stableKey: `a136-peer:choice:${donor}`,
    personIds: [donor, other] as const,
    stage: "dating" as const,
    startedAt: null,
  };
  const own = evaluateTownCoupleActors(next, input).first;
  const durable = evaluateDecision(next, {
    ...own.context,
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, durable);
  return next;
}

it("uses existing actual saved peer decisions for an actor with unseparated reasons", () => {
  const initial = peerFixture();
  const [actor, partner, donor, other] = initial.personOrder;
  if (!actor || !partner || !donor || !other)
    throw new Error("Four fixture people required.");
  const world = recordPeer(initial, donor, other, "embraces");
  const before = JSON.stringify(world);
  const input = {
    stableKey: "a136-peer:receiving",
    personIds: [actor, partner] as const,
    stage: "dating" as const,
    startedAt: null,
  };
  const result = evaluateTownCoupleActors(world, input);
  expect(result.first.selectedOptionKey).toBe("stay");
  expect(result.second.selectedOptionKey).toBe("stay");
  expect(result.first.context.considerations).toEqual([]);
  const trace = world.history.decisionTraces.at(-1)!;
  const estimate = result.first.context.peerEstimates?.find(
    (row) => row.optionKey === "stay",
  );
  expect(estimate?.label).toContain(
    "ESTIMATED: averaged from this game's similar decision makers",
  );
  expect(estimate?.count).toBe(1);
  expect(estimate?.standardDeviation).toBe(0);
  expect(estimate?.samples[0]?.personId).toBe(donor);
  expect(estimate?.samples[0]?.decisionTraceId).toBe(trace.id);
  expect(evaluateTownCoupleActors(JSON.parse(before), input)).toEqual(result);
  expect(JSON.stringify(world)).toBe(before);
});

it("retains equal ranks when actual current-game peer means still tie", () => {
  const initial = peerFixture();
  const [actor, partner, donorA, donorB] = initial.personOrder;
  if (!actor || !partner || !donorA || !donorB)
    throw new Error("Four fixture people required.");
  const world = recordPeer(
    recordPeer(initial, donorA, donorB, "embraces"),
    donorB,
    donorA,
    "rejects",
  );
  const result = evaluateTownCoupleActors(world, {
    stableKey: "a136-peer:equal",
    personIds: [actor, partner],
    stage: "dating",
    startedAt: null,
  });
  expect(result.first.selectedOptionKey).toBeNull();
  expect(result.second.selectedOptionKey).toBeNull();
  expect(result.admittedOptions).toEqual([]);
  const estimates = result.first.context.peerEstimates!;
  expect(estimates).toHaveLength(result.first.context.options.length);
  const stay = estimates.find((row) => row.optionKey === "stay")!;
  const leave = estimates.find((row) => row.optionKey === "break-up")!;
  expect(stay.mean).toBe(leave.mean);
  expect(
    [stay, leave].every((row) => row.count === 2 && row.standardDeviation > 0),
  ).toBe(true);
  const ranked = result.first.optionEvaluations.filter(
    (row) => row.finalRank === 1,
  );
  expect(ranked.map((row) => row.optionKey).sort()).toEqual([
    "break-up",
    "stay",
  ]);
});

it("records real town actor evaluations for later peer reads and replays after Save/Continue", () => {
  const initial = peerFixture();
  const [actor, partner] = initial.personOrder;
  if (!actor || !partner) throw new Error("Two fixture people required.");
  const world = recordPersonalValue(initial, {
    stableKey: "a136-producer:actual-value",
    personId: actor,
    valueId: LIFE_MIND_IDS.connection,
    recordedAt: initial.currentDate,
    orientation: "embraces",
    strength: "strong",
    salience: "high",
    qualification: null,
    provenance: createMindProvenance("authored"),
    supersedesValueId: null,
  });
  const input = {
    stableKey: "a136-producer:quarter",
    personIds: [actor, partner] as const,
    stage: "dating" as const,
    startedAt: null,
    retention: "durable" as const,
  };
  const result = evaluateTownCoupleActors(world, input);
  expect(result.world.history.decisionTraces).toHaveLength(
    world.history.decisionTraces.length + 2,
  );
  const added = result.world.history.decisionTraces.slice(-2);
  expect(added.map((row) => row.context.actorPersonId)).toEqual([
    actor,
    partner,
  ]);
  expect(result.first.context.considerations.length).toBeGreaterThan(0);
  expect(result.second.context.considerations).toEqual([]);
  expect(
    result.second.context.peerEstimates?.[0]?.samples[0]?.decisionTraceId,
  ).toBe(added[0]!.id);
  expect(result.second.selectedOptionKey).toBe("stay");
  expect(evaluateTownCoupleActors(result.world, input).world).toBe(
    result.world,
  );
  const resumed = deserializeWorld(serializeWorldPayload(result.world));
  const replay = evaluateTownCoupleActors(resumed, input);
  expect(replay.world).toBe(resumed);
  expect(replay.first).toEqual(result.first);
  expect(replay.second).toEqual(result.second);
});
