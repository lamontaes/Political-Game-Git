import { describe, expect, it } from "vitest";
import { enactedTaxFixture } from "../../tests/fixtures/tax-policy-fixture";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createPartnership } from "./life";
import { declarePersonalTaxOccurrence } from "../presentation/tax-work";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { daysBetween, makeIsoDate } from "./dates";
import { recordOf } from "./member-record";
import { advanceWorld } from "./world";

const RANDOM_SEED = "session24-part2-2026-10-06";
const RANDOM_PLACE = drawRandomPlace(RANDOM_SEED);

function collected(withSpouse = false) {
  const fixture = enactedTaxFixture();
  let world = advanceWorld(
    fixture.world,
    daysBetween(
      fixture.world.currentDate,
      fixture.world.history.taxPolicies![0]!.effectiveAt,
    ),
    createCampaignElectionTransitionRegistry(),
  );
  const spouseId = world.personOrder.find((id) => id !== fixture.personId)!;
  if (withSpouse)
    world = createPartnership(world, {
      stableKey: "member-record-test:partnership",
      personIds: [fixture.personId, spouseId].sort() as [
        typeof spouseId,
        typeof spouseId,
      ],
      startedAt: world.currentDate,
      kind: "legal:marriage",
      provenance: { kind: "authored", note: "Authored test household." },
    });
  world = declarePersonalTaxOccurrence(world, {
    personId: fixture.personId,
    stableKey: "member-record-test:occurrence",
    proposalId: fixture.proposalId,
    baseKey: "tax-base:test-activity",
    amountMinorUnits: 2100,
    assumptionNote: "Authored fictional test occurrence.",
  });
  world = advanceWorld(world, 2, createCampaignElectionTransitionRegistry());
  return { fixture, world, spouseId };
}

describe("historical member records", () => {
  it("reads a real new game in the sampled random place without inventing history", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: RANDOM_SEED,
        placeKey: RANDOM_PLACE.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game;
    if (!game)
      throw new Error(`New game did not open in ${RANDOM_PLACE.displayName}.`);
    const record = recordOf(
      game.world,
      game.playerPersonId,
      game.world.currentDate,
      {
        asOfDate: game.world.currentDate,
        historySequenceExclusive: game.world.history.nextSequence,
      },
    );
    expect(record.personId).toBe(game.playerPersonId);
    expect(record.dispositions).toEqual([]);
    expect(record.sponsoredMeasures).toEqual([]);
    expect(record.livedOutcomes).toEqual([]);
    expect(record.lawEffects).toEqual([]);
    console.info("Session 24 Part 2 random-place new-game proof", {
      seed: RANDOM_SEED,
      place: RANDOM_PLACE.displayName,
      placeKey: RANDOM_PLACE.key,
      worldId: game.world.id,
      playerPersonId: game.playerPersonId,
      currentDate: game.world.currentDate,
      recordCounts: {
        dispositions: record.dispositions.length,
        sponsoredMeasures: record.sponsoredMeasures.length,
        livedOutcomes: record.livedOutcomes.length,
        lawEffects: record.lawEffects.length,
      },
    });
  });

  it("returns saved sponsorship and raw dated pay or tax effect provenance", () => {
    const { fixture, world } = collected();
    const record = recordOf(
      world,
      fixture.personId,
      world.history.legislativeMeasures!.find(
        (row) => row.id === fixture.procedure.measureId,
      )!.introducedAt,
      {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
    );

    expect(record.sponsoredMeasures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          measureId: fixture.procedure.measureId,
          designation: "HB Tax Test (authored)",
          outcome: expect.objectContaining({ result: "enacted" }),
        }),
      ]),
    );
    expect(record.lawEffects).toHaveLength(1);
    expect(record.lawEffects[0]).toMatchObject({
      measureId: fixture.procedure.measureId,
      relation: "own",
      direction: "cost",
      recordedAmount: { minorUnits: 100, currency: "USD" },
      recordedCadence: "one-time",
      sourceRecord: {
        id: world.history.taxCollections![0]!.id,
        at: world.history.taxCollections![0]!.recordedAt,
        sequence: world.history.taxCollections![0]!.sequence,
      },
    });
  });

  it("excludes a linked effect once its own date or sequence falls after the cutoff", () => {
    const { fixture, world } = collected();
    const exposure = world.history.lawExposures![0]!;
    const measure = world.history.legislativeMeasures!.find(
      (row) => row.id === exposure.measureId,
    )!;
    const beforeEffect = recordOf(
      world,
      fixture.personId,
      measure.introducedAt,
      {
        asOfDate: measure.introducedAt,
        historySequenceExclusive: world.history.nextSequence,
      },
    );
    expect(beforeEffect.lawEffects).toEqual([]);
    const beforeEffectSequence = recordOf(
      world,
      fixture.personId,
      measure.introducedAt,
      {
        asOfDate: world.currentDate,
        historySequenceExclusive: exposure.sequence,
      },
    );
    expect(beforeEffectSequence.lawEffects).toEqual([]);

    const sinceEffect = recordOf(world, fixture.personId, exposure.recordedAt, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    expect(sinceEffect.lawEffects[0]?.exposure.at).toBe(exposure.recordedAt);
    expect(sinceEffect.sponsoredMeasures).toEqual([]);
    // The effect is the primary dated record; its earlier measure remains a
    // supporting link and is retained after its own strict cutoff check.
    expect(sinceEffect.lawEffects[0]?.measure).toMatchObject({
      id: measure.id,
      at: measure.introducedAt,
    });
  });

  it("accepts a public roll call for a legacy official reflection without event knowledge IDs", () => {
    const { world: collectedWorld, spouseId } = collected(true);
    const world = advanceWorld(
      collectedWorld,
      3,
      createCampaignElectionTransitionRegistry(),
    );
    const exposure = world.history.lawExposures!.find(
      (row) => row.personId === spouseId,
    )!;
    const reflection = world.history.events.find(
      (row) => row.stableKey === `official-view:reflection:${exposure.id}`,
    )!;
    const views = world.history.privateBeliefs.filter(
      (row) =>
        row.personId === spouseId &&
        row.subject?.kind === "official" &&
        row.formation.relevantEventIds.includes(reflection.id),
    );
    const candidate = views.find((belief) => {
      const subject = belief.subject;
      if (subject?.kind !== "official") return false;
      const officialId = subject.personId;
      return world.history.legislativeVotes!.some(
        (vote) =>
          vote.measureId === exposure.measureId &&
          vote.forum.kind !== "committee" &&
          vote.dispositions.some((row) => row.personId === officialId),
      );
    });
    expect(candidate).toBeDefined();
    const candidateSubject = candidate?.subject;
    if (candidateSubject?.kind !== "official")
      throw new Error(
        "A matching saved view of the public-roll-call member is required.",
      );
    const officialId = candidateSubject.personId;
    const history = {
      ...world.history,
      privateBeliefs: world.history.privateBeliefs.map((belief) =>
        belief.id === candidate!.id
          ? {
              ...belief,
              formation: { ...belief.formation, eventKnowledgeIds: [] },
            }
          : belief,
      ),
    };
    const legacyWorld = {
      ...world,
      people: {
        ...world.people,
        [spouseId]: {
          ...world.people[spouseId]!,
          birthDate: makeIsoDate("1900-01-01"),
        },
      },
      history: { ...history, workRelationships: [], workStatuses: [] },
    };
    const record = recordOf(legacyWorld, officialId, exposure.recordedAt, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    const attributed = record.lawEffects.find(
      (row) => row.exposure.id === exposure.id,
    );
    expect(attributed?.attribution).toMatchObject({
      kind: "recorded-measure-link",
      action: { kind: "disposition" },
    });
  });
});
