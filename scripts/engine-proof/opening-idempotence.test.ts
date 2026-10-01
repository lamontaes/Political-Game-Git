import { expect, it, vi } from "vitest";
import type * as EnactedLawEffects from "../../src/simulation/enacted-law-effects";
import type { World } from "../../src/simulation/types";
import type {
  LawConsequenceKindRegistration,
  LawConsequenceRow,
} from "../../src/simulation/law-consequence-types";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { recordWorldEvent } from "../../src/simulation/world";
import { personName } from "../../src/simulation/people";
import { createNewGameWorld } from "../../src/presentation/new-game";
import { observerSetup } from "../../src/presentation/observer-world";
import { applyStartingLawConsequences } from "../../src/simulation/enacted-law-effects";
import { searchLifePlaces } from "../../src/simulation/life-places";
import { hasStableKey } from "../../src/simulation/history-index";

const observed = vi.hoisted(() => ({ calls: 0, dispatches: 0 }));
const questionKey =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const row: LawConsequenceRow = {
  id: "proof-opening-once",
  kind: "right-permission",
  when: "effective",
  who: { selector: "proof.saved-person", predicates: [] },
  what: "proof.record-opening",
  decision: { op: "term", key: "allowed", type: "boolean" },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["proof-fixture"],
    population: "saved opening person",
    scope: "dispatch probe only",
    why: "Detect repeated writer invocation",
    uncertainty: "Instrumentation, not a coverage effect",
  },
};
const probe: LawConsequenceKindRegistration = {
  kind: row.kind,
  owner: "C5 dispatch instrumentation",
  selectors: [row.who.selector],
  predicates: [],
  actions: [row.what],
  units: [],
  resolve(world, candidate, context) {
    const personId = world.personOrder[0];
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === questionKey,
    );
    if (!personId || !proposition) return [];
    const jurisdictionId = world.people[personId]!.homeJurisdictionId;
    const law = lawInForce(
      world,
      jurisdictionId,
      proposition.id,
      context.onDate,
    );
    if (!law || law.origin !== "in-force-at-start") return [];
    return [
      {
        row: candidate,
        law,
        questionKey,
        jurisdictionId,
        subject: { kind: "person", id: personId },
        activityId: context.activityId,
        effectiveAt: context.onDate,
        sourceRecordIds: [],
        value: { type: "boolean", value: true },
      },
    ];
  },
  apply(world, resolved) {
    // This permission probe affects the saved person record itself. It does
    // not consume a missing work/payflow base or model a coverage effect.
    const key = `proof:${resolved.law.measureId}:${resolved.row.id}:${resolved.subject.id}:person:${resolved.subject.id}`;
    if (hasStableKey(world.history.events, key)) return world;
    observed.calls++;
    return recordWorldEvent(world, {
      stableKey: key,
      type: "proof.opening-dispatch",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: resolved.jurisdictionId,
      involvedEntityIds: [resolved.subject.id],
      participants: [
        { personId: resolved.subject.id, role: "focus:subject", detail: null },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["proof.instrumentation"],
      summary: "C5 records writer invocation, not a health benefit.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  },
};
vi.mock("../../src/simulation/enacted-law-effects", async (importOriginal) => {
  const original = await importOriginal<typeof EnactedLawEffects>();
  return {
    ...original,
    applyStartingLawConsequences(world: World) {
      observed.dispatches++;
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (p) => p.stableKey === questionKey,
      );
      if (!proposition) throw new Error("Canonical coverage question missing");
      const prepared = {
        ...world,
        policyCatalog: {
          ...world.policyCatalog,
          propositions: {
            ...world.policyCatalog.propositions,
            [proposition.id]: { ...proposition, consequences: [row] },
          },
        },
      };
      return original.applyStartingLawConsequences(prepared, [probe]);
    },
  };
});

it("does not apply an admitted starting writer twice through nested production finalizers", () => {
  observed.calls = 0;
  observed.dispatches = 0;
  const place = searchLifePlaces("", 5000, {
    stateJurisdictionKey: "US-MD",
    scope: "locality",
  })[0]!;
  const game = createNewGameWorld(
    observerSetup("c5-opening-finalizer-20260930", place.key),
  );
  expect(observed.dispatches).toBe(1);
  const once = game.world.history.events.filter(
    (e) => e.type === "proof.opening-dispatch",
  );
  const repeated = applyStartingLawConsequences(game.world);
  expect(observed.dispatches).toBe(2);
  const records = repeated.history.events.filter(
    (e) => e.type === "proof.opening-dispatch",
  );
  console.log(
    JSON.stringify({
      name: personName(game.world.people[game.playerPersonId]!),
      place: game.place.displayName,
      dispatcherCalls: observed.dispatches,
      openingReceiptCount: once.length,
      repeatedReceiptCount: records.length,
      originalCause: once[0]?.stableKey,
      repeatedCause: records.at(-1)?.stableKey,
    }),
  );
  expect(once).toHaveLength(1);
  expect(records).toEqual(once);
});
