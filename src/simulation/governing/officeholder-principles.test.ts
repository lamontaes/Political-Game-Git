import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { searchLifePlaces } from "../index";
import { createWorld } from "../world";
import { principlePullsOf, principlesFromPulls } from "../principles-from-life";
import { createFormationContext, recordPrinciple } from "../politics";
import type {
  EntityId,
  LegislativeMeasureRecord,
  PrincipleRecord,
  World,
} from "../types";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
  principleAgreement,
  principleVoteConsideration,
  principleView,
  spendingPrincipleConsideration,
} from "./officeholder-principles";

/**
 * A sitting officeholder's own principles: formed from life, never for the player,
 * and read into a leaning on a question and a reason to vote on a bill.
 */

function openingWorld(): { world: World; playerPersonId: EntityId } {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "officeholder-principles-US-OR",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  // A fresh unit fixture retains the ordinary opening's canonical people,
  // facts and place, before this writer has formed any principles.
  const fresh = createWorld({
    seed: game.world.seed,
    lineage: "production",
    control: game.world.control,
    currentDate: game.world.currentDate,
    people: game.world.personOrder.map((id) => game.world.people[id]!),
    jurisdictions: game.world.jurisdictionOrder.map(
      (id) => game.world.jurisdictions[id]!,
    ),
    policyCatalog: game.world.policyCatalog,
  });
  return {
    world: fresh,
    playerPersonId: game.playerPersonId,
  };
}

const { world, playerPersonId } = openingWorld();
const alreadyHeld = new Set(world.history.principles.map((r) => r.personId));
const people = world.personOrder
  .filter(
    (id) =>
      id !== playerPersonId &&
      !alreadyHeld.has(id) &&
      principlesFromPulls(world, id, principlePullsOf(world, id)).length > 0,
  )
  .slice(0, 12);
const formed = ensureOfficeholderPrinciples(world, people);

function billAnswering(
  propositionId: EntityId,
  answer: "yes" | "no",
): LegislativeMeasureRecord {
  return {
    propositionAnswers: [{ propositionId, answer }],
  } as Partial<LegislativeMeasureRecord> as LegislativeMeasureRecord;
}

/** A question some formed principle bears on, and a person it moves. */
function engaged(next: World): {
  personId: EntityId;
  propositionId: EntityId;
  score: number;
} {
  for (const personId of people)
    for (const propositionId of next.policyCatalog.propositionOrder) {
      const { score } = principledLeaning(next, personId, propositionId);
      if (score !== 0) return { personId, propositionId, score };
    }
  throw new Error("No formed principle bears on any question.");
}

describe("officeholder principles", () => {
  it("weights competing law arguments by the person's continuous strength and changes the actual vote reason", () => {
    const personId = people[0]!;
    const [supportId, oppositionId] = world.policyCatalog.principleOrder;
    const propositionId = world.policyCatalog.propositionOrder[0]!;
    expect(supportId).toBeDefined();
    expect(oppositionId).toBeDefined();
    const record = (next: World, principleId: EntityId, strength: number) =>
      recordPrinciple(next, {
        stableKey: `law-weight:${principleId}`,
        personId,
        principleId,
        formedAt: world.currentDate,
        stance: "endorses",
        strength,
        conviction: "settled",
        flexibility: "firm",
        qualification: null,
        formation: createFormationContext("reflection:test", {
          note: "Authored law-weight fixture, not a measured political preference.",
        }),
        supersedesPrincipleRecordId: null,
      });
    const next = record(record(world, supportId!, 0.75), oppositionId!, 0.5);
    const withWeights = (support?: number, opposition?: number): World => ({
      ...next,
      policyCatalog: {
        ...next.policyCatalog,
        propositions: {
          ...next.policyCatalog.propositions,
          [propositionId]: {
            ...next.policyCatalog.propositions[propositionId]!,
            principles: [
              {
                principleId: supportId!,
                bearing: "consistent-with",
                ...(support === undefined ? {} : { weight: support }),
              },
              {
                principleId: oppositionId!,
                bearing: "against",
                ...(opposition === undefined ? {} : { weight: opposition }),
              },
            ],
          },
        },
      },
    });
    const legacy = withWeights();
    expect(principledLeaning(legacy, personId, propositionId).score).toBe(1);
    expect(
      principleVoteConsideration(
        legacy,
        personId,
        billAnswering(propositionId, "yes"),
      )?.optionKey,
    ).toBe("vote-yea");
    const weighted = withWeights(0.2, 0.9);
    const before = JSON.stringify(weighted);
    expect(
      principledLeaning(weighted, personId, propositionId).score,
    ).toBeCloseTo(-1.2);
    expect(
      principleVoteConsideration(
        weighted,
        personId,
        billAnswering(propositionId, "yes"),
      )?.optionKey,
    ).toBe("vote-nay");
    expect(
      principleVoteConsideration(
        weighted,
        personId,
        billAnswering(propositionId, "no"),
      )?.optionKey,
    ).toBe("vote-yea");
    expect(principleView(weighted, personId, propositionId)?.answer).toBe("no");
    expect(JSON.stringify(weighted)).toBe(before);
    const zero = withWeights(0, 0);
    expect(principledLeaning(zero, personId, propositionId)).toEqual({
      score: 0,
      recordIds: [],
    });
    expect(
      principleVoteConsideration(
        zero,
        personId,
        billAnswering(propositionId, "yes"),
      ),
    ).toBeNull();
    expect(principleView(zero, personId, propositionId)).toBeNull();
    const one = withWeights(0, 1);
    expect(principledLeaning(one, personId, propositionId).score).toBe(-2);
    expect(
      principledLeaning(one, personId, propositionId).recordIds,
    ).toHaveLength(1);
    // One principle can support equal standards and oppose unequal access.
    // Both arguments must contribute, even though they read the same record.
    const bothWays: World = {
      ...weighted,
      policyCatalog: {
        ...weighted.policyCatalog,
        propositions: {
          ...weighted.policyCatalog.propositions,
          [propositionId]: {
            ...weighted.policyCatalog.propositions[propositionId]!,
            principles: [
              {
                principleId: supportId!,
                bearing: "consistent-with",
                weight: 0.2,
              },
              { principleId: supportId!, bearing: "against", weight: 0.9 },
            ],
          },
        },
      },
    };
    expect(
      principledLeaning(bothWays, personId, propositionId).score,
    ).toBeCloseTo(-2.1);
    const bothWaysVote = principleVoteConsideration(
      bothWays,
      personId,
      billAnswering(propositionId, "yes"),
    );
    expect(bothWaysVote?.optionKey).toBe("vote-nay");
    expect(bothWaysVote?.sourceRefs).toHaveLength(1);
  });

  it("all three readers use fractional strength instead of categorical conviction", () => {
    const principleId = world.policyCatalog.principleOrder.find((id) =>
      world.policyCatalog.principles[id]!.stableKey.endsWith(
        ":fiscal-restraint",
      ),
    )!;
    expect(principleId).toBeDefined();
    const personId = people[0]!;
    const subjectId = people[1]!;
    expect(subjectId).toBeDefined();
    const input = {
      stableKey: "fractional-strength:viewer",
      personId,
      principleId,
      formedAt: world.currentDate,
      stance: "endorses" as const,
      strength: 0.37,
      conviction: "settled" as const,
      flexibility: "firm" as const,
      qualification: null,
      formation: createFormationContext("reflection:test", {
        note: "Authored fractional-strength fixture, not a research estimate.",
      }),
      supersedesPrincipleRecordId: null,
    };
    let next = recordPrinciple(world, input);
    next = recordPrinciple(next, {
      ...input,
      stableKey: "fractional-strength:subject",
      personId: subjectId,
      strength: 0.8,
      conviction: "tentative",
    });
    const propositionId = next.policyCatalog.propositionOrder.find((id) =>
      next.policyCatalog.propositions[id]!.principles?.some(
        (bearing) => bearing.principleId === principleId,
      ),
    )!;
    expect(propositionId).toBeDefined();
    const bearing = next.policyCatalog.propositions[
      propositionId
    ]!.principles!.find((row) => row.principleId === principleId)!;
    expect(principledLeaning(next, personId, propositionId).score).toBeCloseTo(
      (bearing.bearing === "consistent-with" ? 1 : -1) * 1.48,
    );
    expect(principleAgreement(next, personId, subjectId).score).toBeCloseTo(
      1.48,
    );
    expect(spendingPrincipleConsideration(next, personId)).toMatchObject({
      optionKey: "vote-nay",
      importance: "slight",
    });
  });

  it("forms catalog principles from recorded life", () => {
    expect(world.policyCatalog.principleOrder.length).toBeGreaterThan(0);
    expect(people.length).toBeGreaterThan(0);
    const holders = new Set(
      formed.history.principles.map((record) => record.personId),
    );
    expect(holders.size).toBeGreaterThan(people.length / 2);
    for (const record of formed.history.principles.slice(
      world.history.principles.length,
    ))
      expect(record.formation.reason).toBe("experience:life");
  });

  it("is reproducible and writes nothing when life is unchanged", () => {
    const again = ensureOfficeholderPrinciples(formed, people);
    expect(again.history.principles).toHaveLength(
      formed.history.principles.length,
    );
    const twin = ensureOfficeholderPrinciples(openingWorld().world, people);
    const shape = (records: readonly PrincipleRecord[]) =>
      records.map((r) => [r.personId, r.principleId, r.stance, r.conviction]);
    expect(shape(twin.history.principles)).toEqual(
      shape(formed.history.principles),
    );
  });

  it("does not fill an unsupported life with a random principle", () => {
    const unsupported = world.personOrder.find(
      (id) =>
        id !== playerPersonId &&
        principlesFromPulls(world, id, principlePullsOf(world, id)).length ===
          0,
    )!;
    expect(unsupported).toBeDefined();
    expect(ensureOfficeholderPrinciples(world, [unsupported])).toBe(world);
  });

  it("never forms the player's mind", () => {
    expect(world.control).toMatchObject({ personId: playerPersonId });
    const player = playerPersonId;
    const after = ensureOfficeholderPrinciples(world, [player, ...people]);
    expect(
      after.history.principles.filter((record) => record.personId === player),
    ).toHaveLength(
      world.history.principles.filter((record) => record.personId === player)
        .length,
    );
  });

  it("reads a leaning into a vote for a bill that answers it their way, and against one that does not", () => {
    const { personId, propositionId, score } = engaged(formed);
    const theirWay = score > 0 ? "yes" : "no";
    const otherWay = score > 0 ? "no" : "yes";
    const forIt = principleVoteConsideration(
      formed,
      personId,
      billAnswering(propositionId, theirWay),
    );
    const against = principleVoteConsideration(
      formed,
      personId,
      billAnswering(propositionId, otherWay),
    );
    expect(forIt?.optionKey).toBe("vote-yea");
    expect(against?.optionKey).toBe("vote-nay");
    expect(forIt?.sourceRefs.length).toBeGreaterThan(0);
    expect(forIt?.sourceRefs[0]?.kind).toBe("political-principle");
  });

  it("gives no principled reason on a bill that answers nothing", () => {
    const { personId } = engaged(formed);
    expect(
      principleVoteConsideration(formed, personId, {
        propositionAnswers: [],
      } as Partial<LegislativeMeasureRecord> as LegislativeMeasureRecord),
    ).toBeNull();
  });
});
