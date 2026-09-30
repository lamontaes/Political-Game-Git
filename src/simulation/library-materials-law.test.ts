import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createHistoryStore } from "./history";
import { createDemoWorld } from "./demo";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import { LIBRARY_QUESTION } from "./education-civil-law-terms";
import {
  libraryContentView,
  recordLibraryDecisionHistory,
  resolveLibraryChallenges,
  type LibraryMaterialsWorld,
} from "./library-materials-law";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { createProductionPolicyCatalog } from "./production-catalog";
import { SeededRng } from "./rng";
import type { EntityId, World } from "./types";
import type {
  LibraryChallenge,
  LibraryDecision,
} from "./library-materials-types";

const catalog = createProductionPolicyCatalog();
const canonicalDefaults = createDemoWorld("library-canonical-fixture-defaults");
const proposition = Object.values(catalog.propositions).find(
  (row) => row.stableKey === LIBRARY_QUESTION,
)!;

function fixture(stateKey: string, answer: "yes" | "no") {
  const state = stateJurisdictionForKey(stateKey)!;
  const town = searchLifePlaces("", 5000, {
    stateJurisdictionKey: stateKey,
  }).find((row) => row.scope !== "state")!;
  const world = {
    ...canonicalDefaults,
    id: "world_library_fixture",
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: catalog,
    jurisdictions: {
      [state.id]: state,
      [town.context.jurisdiction.id]: town.context.jurisdiction,
    },
    history: {
      ...createHistoryStore(),
      nextSequence: 100,
      events: [],
      legislativeMeasures: [
        {
          id: "measure_library",
          jurisdictionId: state.id,
          propositionIds: [proposition.id],
          propositionAnswers: [{ propositionId: proposition.id, answer }],
        },
      ],
      legislativeEnactments: [
        {
          id: "enactment_library",
          measureId: "measure_library",
          resolvedAt: "2026-01-01",
          effectiveAt: "2026-01-01",
          outcome: "enacted",
          sequence: 50,
        },
      ],
    },
  } as unknown as World;
  return { world, townId: town.context.jurisdiction.id };
}

const tradition = Object.values(catalog.principles).find((row) =>
  row.stableKey.endsWith(":tradition"),
)!;
const liberty = Object.values(catalog.principles).find((row) =>
  row.stableKey.endsWith(":personal-liberty"),
)!;
const members = ["person_a", "person_b", "person_c"] as EntityId[];
function libraryFixture(stateKey: string, answer: "yes" | "no") {
  const { world: base, townId } = fixture(stateKey, answer);
  const world = {
    ...base,
    people: Object.fromEntries(members.map((id) => [id, { id }])),
    history: {
      ...base.history,
      principles: members.map((personId, i) => ({
        id: `principle_${i}`,
        personId,
        principleId: i === 1 ? liberty.id : tradition.id,
        formedAt: "2025-12-01",
        stance: "endorses",
        strength: [0.6, 0.8, 0.7][i],
        conviction: "settled",
        sequence: i + 1,
      })),
    },
    libraryMaterials: {
      challenges: [
        {
          key: "challenge_saved_title",
          townId,
          personId: members[0],
          titleKey: "title_already_challenged",
          filedOn: "2026-01-01",
          reason: "The resident filed a collection challenge.",
          principleRecordIds: ["principle_0"],
          faithParticipationIds: [],
          schoolChildIds: [],
        },
      ],
      decisions: [],
    },
  } as unknown as LibraryMaterialsWorld;
  return { world, townId };
}
describe("saved library collection decisions", () => {
  it("writes and restores stamped decisions in five states sampled from all 56", () => {
    const rng = new SeededRng("library-main-authority-2026");
    const remaining = [...lifePlaceStateIdentities()];
    for (let i = 0; i < 5; i++) {
      const place = rng.pick(remaining);
      remaining.splice(remaining.indexOf(place), 1);
      const { world, townId } = libraryFixture(place.jurisdictionKey, "yes");
      const next = resolveLibraryChallenges(
        world,
        townId,
        members,
        "held_meeting",
      );
      const decision = next.libraryMaterials!.decisions[0]!;
      expect(decision.removed, place.jurisdictionKey).toBe(true);
      expect(decision.ballots.map((row) => row.score)).toEqual([
        0.6, -0.8, 0.7,
      ]);
      expect(decision.ballots.map((row) => row.personId)).toEqual(members);
      expect(decision.expenseCents).toBeNull();
      expect(decision.lawEffectStamps).toHaveLength(1);
      expect(decision.lawEffectStamps![0]).toMatchObject({
        governingLawKey: "measure_library",
        effectKind: "library.collection-decision",
        questionKey: LIBRARY_QUESTION,
        jurisdictionId: townId,
      });
      expect(decision.lawEffectStamps![0]!.sourceRecordIds).toContain(
        "principle_0",
      );
      const event = next.history.events.find(
        (row) => row.type === "library.collection-decision",
      )!;
      expect(event.involvedEntityIds).toEqual([...members].sort());
      expect(event.lawEffectStamps).toEqual(decision.lawEffectStamps);
      const restored = JSON.parse(
        JSON.stringify(next),
      ) as LibraryMaterialsWorld;
      expect(restored.libraryMaterials!.decisions[0]).toEqual(decision);
      expect(
        resolveLibraryChallenges(restored, townId, members, "later_meeting"),
      ).toBe(restored);
      const denied = libraryFixture(place.jurisdictionKey, "no");
      expect(
        resolveLibraryChallenges(
          denied.world,
          denied.townId,
          members,
          "held_meeting",
        ),
      ).toBe(denied.world);
    }
  });
  it("does not resolve future challenges or manufacture unknown members", () => {
    const place = new SeededRng("library-main-authority-2026").pick(
      lifePlaceStateIdentities(),
    );
    const { world, townId } = libraryFixture(place.jurisdictionKey, "yes");
    const future = {
      ...world,
      libraryMaterials: {
        challenges: world.libraryMaterials!.challenges.map((row) => ({
          ...row,
          filedOn: makeIsoDate("2026-02-01"),
        })),
        decisions: [],
      },
    };
    expect(
      resolveLibraryChallenges(future, townId, members, "held_meeting"),
    ).toBe(future);
    expect(
      resolveLibraryChallenges(
        world,
        townId,
        ["unknown_member" as EntityId],
        "held_meeting",
      ),
    ).toBe(world);
    expect(resolveLibraryChallenges(world, townId, [], "held_meeting")).toBe(
      world,
    );
  });
  it("reads continuous strength and excludes future views", () => {
    const place = new SeededRng("library-main-authority-2026").pick(
      lifePlaceStateIdentities(),
    );
    const { world } = libraryFixture(place.jurisdictionKey, "yes");
    const changed = {
      ...world,
      history: {
        ...world.history,
        principles: [
          ...world.history.principles,
          {
            ...world.history.principles[0]!,
            id: "future_principle" as EntityId,
            formedAt: makeIsoDate("2026-02-01"),
            strength: 0.99,
          },
        ],
      },
    };
    expect(libraryContentView(changed, members[0]!).score).toBe(0.6);
    const weaker = {
      ...world,
      history: {
        ...world.history,
        principles: world.history.principles.map((row) => ({
          ...row,
          strength: 0.13,
        })),
      },
    };
    expect(libraryContentView(weaker, members[0]!).score).toBe(0.13);
  });
});

it("preserves an authored saved-board record and named people through canonical Save/Continue", () => {
  // Storage proof only: this archived fixture does not assert a live board meeting or enacted-law firing.
  const rng = new SeededRng("library-canonical-save-persons-2026");
  const remaining = [...lifePlaceStateIdentities()];
  for (let i = 0; i < 5; i++) {
    const place = rng.pick(remaining);
    remaining.splice(remaining.indexOf(place), 1);
    const town = searchLifePlaces("", 5000, {
      stateJurisdictionKey: place.jurisdictionKey,
    }).find((row) => row.scope !== "state")!;
    const initial = createDemoWorld(
      `library-archive:${place.jurisdictionKey}`,
      { context: town.context },
    );
    const members = initial.personOrder.slice(0, 3);
    const challenge: LibraryChallenge = {
      key: "archived_challenge",
      townId: town.context.jurisdiction.id,
      personId: members[0]!,
      titleKey: "archived_title",
      filedOn: initial.currentDate,
      reason: "Authored archive fixture; not a live challenge filing.",
      principleRecordIds: [],
      faithParticipationIds: [],
      schoolChildIds: [],
    };
    const decision: LibraryDecision = {
      challengeKey: challenge.key,
      meetingKey: "authored_archived_board",
      on: initial.currentDate,
      authority: "local",
      authorityReason:
        "Authored historical storage fixture, not jurisdiction proof.",
      ballots: members.map((personId) => ({
        personId,
        remove: false,
        score: 0,
        principleRecordIds: [],
        reason: "Authored archived ballot; no actor outcome is inferred.",
      })),
      removed: false,
      staffHours: null,
      legalHours: null,
      expenseCents: null,
      lawEffectStamps: [
        {
          version: "law-effect-stamp/v1",
          governingLawKey: "starting-law:fixture.library-archive" as EntityId,
          source: "in-force-at-start",
          effectKind: "library.collection-decision",
          questionKey: LIBRARY_QUESTION,
          jurisdictionId: challenge.townId,
          operativeAt: initial.currentDate,
          appliedAt: initial.currentDate,
          sourceRecordIds: members,
        },
      ],
    };
    const saved: LibraryMaterialsWorld = {
      ...initial,
      libraryMaterials: { challenges: [challenge], decisions: [decision] },
    };
    const next = recordLibraryDecisionHistory(saved, challenge, decision);
    assertWorldIntegrity(next);
    const restored = deserializeWorld(
      serializeWorld(next),
    ) as LibraryMaterialsWorld;
    assertWorldIntegrity(restored);
    const event = restored.history.events.find(
      (row) => row.type === "library.collection-decision",
    )!;
    expect(event.involvedEntityIds).toEqual([...members].sort());
    expect(event.lawEffectStamps).toEqual(decision.lawEffectStamps);
    expect(restored.libraryMaterials).toEqual(saved.libraryMaterials);
    for (const id of members)
      expect(restored.people[id]).toEqual(initial.people[id]);
    expect(
      recordLibraryDecisionHistory(
        restored,
        restored.libraryMaterials!.challenges[0]!,
        restored.libraryMaterials!.decisions[0]!,
      ),
    ).toBe(restored);
  }
});
