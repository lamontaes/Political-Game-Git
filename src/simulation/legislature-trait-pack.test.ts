import { describe, expect, it } from "vitest";

import {
  createDemoWorld,
  createMindProvenance,
  recordPersonalityTendency,
  recordRelationshipInteraction,
} from "./index";
import type { EntityId, World } from "./index";
import {
  BARGAINING_ANSWER_OFFER_DECISION,
  BARGAINING_ANSWER_REQUEST_DECISION,
} from "./legislative-bargaining-decisions";
import {
  LEGISLATURE_PACK,
  legislatureTraitPack,
} from "./legislature-trait-pack";
import { peopleTraitPack } from "./people-trait-pack";
import { PEOPLE_MIND_VERSION } from "./people-trait-definitions";
import { registeredTraitConsiderations } from "./trait-readings";
import { loadedTraitRegistry } from "./trait-registry";
import { loadTraitPacks, traitDefinitionFromPack } from "./trait-packs";
import type { TraitPack } from "./trait-packs";

const TRAIT = `${LEGISLATURE_PACK}:showing-their-hand`;

/**
 * A world where these two have had at least one recorded dealing.
 *
 * A row declared `about: "subject"` rests on what the decider has actually had
 * to do with the person across the table, not on a private record about them
 * that the decider could never have read — `assertOwnedHistoryRecord` rejects
 * the latter, and is right to. A stranger therefore contributes nothing, so a
 * test that wants a subject row to fire has to establish the dealing first.
 *
 * Written through the canonical writer rather than spliced, so the sequence,
 * the id and the date are the ones the engine would have produced.
 */
function withDealings(
  world: World,
  observerPersonId: EntityId,
  subjectPersonId: EntityId,
): World {
  return recordRelationshipInteraction(world, {
    stableKey: `dealing:${observerPersonId}:${subjectPersonId}`,
    personIds: [observerPersonId, subjectPersonId],
    eventId: null,
    occurredAt: world.currentDate,
    kind: "work:bill-negotiation",
    change: "maintained",
    significance: "meaningful",
    summary: "They have worked a bill between them before.",
    tags: [],
  });
}

function personId(world: World, index = 0): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing fixture person at index ${index}.`);
  return id;
}

/**
 * The trait is `conferred-only`, so nothing in the game writes it yet. A test
 * that wants to read one has to confer it the way a writer eventually will.
 */
function confer(
  world: World,
  personId: EntityId,
  expressionKey: string,
  strength: "moderate" | "strong",
): World {
  const registry = loadedTraitRegistry();
  const trait = registry.traits.get(TRAIT);
  if (!trait) throw new Error(`The build does not load ${TRAIT}.`);
  const definition = traitDefinitionFromPack(trait);
  const withCatalog: World = {
    ...world,
    mindCatalog: {
      ...world.mindCatalog,
      tendencies: {
        ...world.mindCatalog.tendencies,
        [definition.id]: definition,
      },
      tendencyOrder: [...world.mindCatalog.tendencyOrder, definition.id],
    },
  };
  return recordPersonalityTendency(withCatalog, {
    stableKey: `tendency:${TRAIT}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: withCatalog.currentDate,
    expressionKey,
    strength,
    confidence: "medium",
    scopeTags: ["government:bargaining"],
    provenance: createMindProvenance("authored", {
      note: "Conferred by a test, standing in for the writer that will confer it from a member's own negotiating record.",
    }),
    supersedesTendencyId: null,
  });
}

describe("the legislature's trait pack", () => {
  it("loads against this build's decisions with nothing rejected", () => {
    const report = loadedTraitRegistry().report;
    expect(report.rejections).toEqual([]);
    const pack = report.packs.find((entry) => entry.pack === LEGISLATURE_PACK);
    expect(pack?.traitsRegistered).toEqual([TRAIT]);
  });

  it("is read by both bargaining answers rather than registered and used by nothing", () => {
    const pack = loadedTraitRegistry().report.packs.find(
      (entry) => entry.pack === LEGISLATURE_PACK,
    );
    expect(pack?.registeredButUnused).toEqual([]);
    expect(pack?.consumedBy[TRAIT]).toEqual([
      BARGAINING_ANSWER_REQUEST_DECISION.id,
      BARGAINING_ANSWER_OFFER_DECISION.id,
    ]);
  });

  it("refuses an ordinary-life trait leaned on a bargaining answer, by name and without throwing", () => {
    const trespass: TraitPack = {
      pack: "trespassing-pack",
      traits: [],
      effects: [
        {
          decision: BARGAINING_ANSWER_REQUEST_DECISION.id,
          leans: [
            {
              option: "commit",
              trait: `${PEOPLE_MIND_VERSION}:reliability`,
              pole: "high",
              explanation: "They keep their word in ordinary life.",
            },
          ],
        },
      ],
    };
    const registry = loadTraitPacks(
      [peopleTraitPack(), legislatureTraitPack(), trespass],
      [BARGAINING_ANSWER_REQUEST_DECISION, BARGAINING_ANSWER_OFFER_DECISION],
    );
    const refusal = registry.report.rejections.find(
      (entry) => entry.pack === "trespassing-pack",
    );
    expect(refusal).toBeDefined();
    expect(refusal?.reason).toContain("life:ordinary");
    expect(refusal?.reason).toContain("government:bargaining");
  });
});

describe("what a conferred manner argues for", () => {
  it("contributes nothing for a member nobody has conferred it on", () => {
    const world = createDemoWorld("bargaining-traits-unconferred");
    const considerations = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      personId(world),
      "bargaining",
      BARGAINING_ANSWER_REQUEST_DECISION.id,
    );
    expect(considerations).toEqual([]);
  });

  it("argues for committing when a member says where they stand", () => {
    const base = createDemoWorld("bargaining-traits-open");
    const actor = personId(base);
    const world = confer(base, actor, "says-where-they-stand", "strong");
    const considerations = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      actor,
      "bargaining",
      BARGAINING_ANSWER_REQUEST_DECISION.id,
    );
    expect(considerations).toHaveLength(1);
    const only = considerations[0]!;
    expect(only.optionKey).toBe("commit");
    expect(only.sourceType).toBe("mind:personality");
    expect(only.direction).toBe("supports");
    expect(only.importance).toBe("moderate");
    expect(only.sourceRefs[0]).toMatchObject({ kind: "personality-tendency" });
  });

  it("reads the person being decided about, when a row says it is about them", () => {
    const base = createDemoWorld("bargaining-traits-subject");
    const member = personId(base, 0);
    const asker = personId(base, 1);
    const world = withDealings(
      confer(base, asker, "says-where-they-stand", "strong"),
      member,
      asker,
    );
    const considerations = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      member,
      "bargaining",
      BARGAINING_ANSWER_REQUEST_DECISION.id,
      asker,
    );
    expect(considerations).toHaveLength(1);
    expect(considerations[0]!.optionKey).toBe("commit");
    expect(considerations[0]!.explanation).toContain("The person asking");
  });

  it("drops a row about the subject when the decision names no subject", () => {
    const base = createDemoWorld("bargaining-traits-no-subject");
    const member = personId(base, 0);
    const asker = personId(base, 1);
    const world = confer(base, asker, "says-where-they-stand", "strong");
    expect(
      registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        member,
        "bargaining",
        BARGAINING_ANSWER_REQUEST_DECISION.id,
      ),
    ).toEqual([]);
  });

  it("argues for holding out on an offer when a member keeps it open", () => {
    const base = createDemoWorld("bargaining-traits-closed");
    const actor = personId(base);
    const world = confer(base, actor, "keeps-it-open", "moderate");
    const considerations = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      actor,
      "bargaining",
      BARGAINING_ANSWER_OFFER_DECISION.id,
    );
    expect(considerations).toHaveLength(1);
    expect(considerations[0]!.optionKey).toBe("hold-off");
    expect(considerations[0]!.importance).toBe("slight");
  });
});
