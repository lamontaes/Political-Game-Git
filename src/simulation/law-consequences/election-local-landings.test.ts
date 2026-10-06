import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { SeededRng } from "../rng";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../life-places";
import { placeLocalGovernmentUnits } from "../nationwide-world/local-governments";
import { placeReferencePopulation } from "../nationwide-world/place-population";
import { councilWardPlan } from "../living-world/town-wards";
import { sittingLocalOfficers } from "../living-world/local-government-seats";
import { localOrdinanceGameRulePack } from "../local-ordinance-game-profile";
import { lawInForce } from "../governing/law-in-force";
import {
  committeeMembers,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
  type AuthoredVoteCounts,
} from "../legislation-scenarios";
import { personName } from "../people";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
} from "../legislation";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { lawEffectStamp } from "../law-effect-stamp";
import { lawExposuresOf } from "../law-exposure";
import { deserializeWorld, serializeWorld } from "../serialization";
import { recordWorldEvent } from "../world";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { applyLocalElectionLawLandings } from "./modules/election-local-landings";
import type { EntityId, HistoricalEvent, World } from "../types";

const COUNCIL_TERM_LIMIT_QUESTION =
  "us-policy-positions:government-operations.council-term-limits";

function wardTown(seed: string): LifePlace {
  const rng = new SeededRng(`election-landing-town:${seed}`);
  const states = [...lifePlaceStateIdentities()];
  while (states.length > 0) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    const places = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((place) => {
      const unit = placeLocalGovernmentUnits(place).municipal[0];
      const population = placeReferencePopulation(
        place.sourceGeoid ?? "",
      )?.value;
      return (
        unit !== undefined &&
        population !== undefined &&
        population < 60_000 &&
        (councilWardPlan(unit)?.wardSeats ?? 0) >= 2
      );
    });
    if (places.length > 0) return rng.pick(places);
  }
  throw new Error(
    "No locality with a ward council is available for the fixture.",
  );
}

function enactLawFixture(
  world: World,
  jurisdictionId: EntityId,
  unit: ReturnType<typeof placeLocalGovernmentUnits>["municipal"][number],
) {
  const pack = localOrdinanceGameRulePack(unit)!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === COUNCIL_TERM_LIMIT_QUESTION,
  )!;
  world = introduceMeasure(world, {
    stableKey: "election-landing:term-limit-bill",
    jurisdictionId,
    rulePackId: pack.packId,
    designation: "HB election fixture",
    shortTitle: "Council candidacy rule fixture",
    summary: "Controlled law fixture for the existing person landing.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    sponsorPersonId: world.personOrder[0]!,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const bodies = pack.chambers.map((chamber) => ({
    chamberKey: chamber.chamberKey,
    chamberName: chamber.name,
    members: sittingLocalOfficers(world, unit)
      .filter((row) => !row.mayor)
      .map((row, ordinal) => ({
        memberKey: `${unit.id}:landing-fixture:${ordinal}`,
        name: personName(world.people[row.personId]!),
        personId: row.personId,
        caucusLabel: "Authored fixture",
      })),
  }));
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find((row) => row.chamberKey === chamber.chamberKey)!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committeeMembers(body, committee.appointedMembers).length,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const procedure: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed" as const,
    governorRationale: "Controlled authored fixture approval.",
  };
  for (let guard = 0; guard < 40; guard += 1) {
    if (measurePosition(world, measureId).phase === "awaiting-enactment") {
      world = recordEnactment(world, {
        stableKey: "election-landing:enactment",
        measureId,
        effectiveAt: world.currentDate,
      });
      break;
    }
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step)
      throw new Error("Council law fixture has no canonical next step.");
    world = applyLegislativeStep(procedure, world, step).world;
  }
  expect(measurePosition(world, measureId).phase).toBe("enacted");
  return { world, proposition, jurisdictionId, measureId };
}

describe("local election law landings", () => {
  it("lands only the actual person in a law-stamped blocked-candidacy event and survives replay and reload", () => {
    const seed = "election-landing:municipal-canonical-fixture";
    const place = wardTown(seed);
    const opened = openObserverWorld(observerSetup(seed, place.key));
    const unit = placeLocalGovernmentUnits(place).municipal[0]!;
    const jurisdictionId = opened.world.history.events.find(
      (event) =>
        event.type === "local.wards-drawn" &&
        event.tags.includes(`unit:${unit.id}`),
    )!.jurisdictionId!;
    const {
      world: enacted,
      proposition,
      measureId,
    } = enactLawFixture(opened.world, jurisdictionId, unit);
    const law = lawInForce(
      enacted,
      jurisdictionId,
      proposition.id,
      enacted.currentDate,
    );
    expect(law).toMatchObject({ measureId, answer: "yes", origin: "enacted" });
    const personId = sittingLocalOfficers(enacted, unit).find(
      (row) => !row.mayor,
    )!.personId;
    const stamp = lawEffectStamp(law, {
      effectKind: "local.officeholder-retired",
      questionKey: COUNCIL_TERM_LIMIT_QUESTION,
      jurisdictionId,
      appliedAt: enacted.currentDate,
    })!;
    const wrongLaw = recordWorldEvent(enacted, {
      lawEffectStamps: [
        {
          ...stamp,
          governingLawKey: "measure:unrelated" as EntityId,
        },
      ],
      stableKey: "election-landing:wrong-law",
      type: "local.officeholder-retired",
      occurredAt: enacted.currentDate,
      recordedAt: enacted.currentDate,
      jurisdictionId,
      involvedEntityIds: [personId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["barred:term-limit"],
      summary: "Controlled mismatched law stamp.",
      context: {
        location: {
          jurisdictionId,
          label: "Fixture jurisdiction",
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const wrongLawEventId = wrongLaw.history.events.at(-1)!.id;
    expect(applyLocalElectionLawLandings(wrongLaw, wrongLawEventId)).toBe(
      wrongLaw,
    );
    let world = recordWorldEvent(enacted, {
      lawEffectStamps: [stamp],
      stableKey: "election-landing:blocked-candidacy",
      type: "local.officeholder-retired",
      occurredAt: enacted.currentDate,
      recordedAt: enacted.currentDate,
      jurisdictionId,
      involvedEntityIds: [personId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["barred:term-limit"],
      summary:
        "The saved law barred this actual officeholder from another candidacy.",
      context: {
        location: {
          jurisdictionId,
          label: "Fixture jurisdiction",
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = world.history.events.at(-1)!.id;

    world = applyLocalElectionLawLandings(world, eventId);
    const exposure = lawExposuresOf(world, personId).find(
      (row) => row.sourceRecordId === eventId,
    );
    expect(exposure).toMatchObject({
      measureId,
      personId,
      sourceRecordId: eventId,
      channel: "election-rule",
      direction: "cost",
      amount: null,
      cadence: null,
      relation: "own",
    });
    expect(applyLocalElectionLawLandings(world, eventId)).toBe(world);
    const restored = deserializeWorld(serializeWorld(world));
    expect(lawExposuresOf(restored, personId)).toContainEqual(exposure);
    expect(applyLocalElectionLawLandings(restored, eventId)).toBe(restored);

    const migratedStamp = lawEffectStamp(law, {
      effectKind: "institution-rule",
      questionKey: COUNCIL_TERM_LIMIT_QUESTION,
      jurisdictionId,
      appliedAt: restored.currentDate,
    })!;
    let migrated = recordWorldEvent(restored, {
      lawEffectStamps: [migratedStamp],
      stableKey: "election-landing:institution-rule-stamp-compatibility",
      type: "local.officeholder-retired",
      occurredAt: restored.currentDate,
      recordedAt: restored.currentDate,
      jurisdictionId,
      involvedEntityIds: [personId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["barred:term-limit"],
      summary: "A migrated effect stamp retains the same recorded bar.",
      context: {
        location: {
          jurisdictionId,
          label: "Fixture jurisdiction",
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const migratedEventId = migrated.history.events.at(-1)!.id;
    migrated = applyLocalElectionLawLandings(migrated, migratedEventId);
    expect(
      lawExposuresOf(migrated, personId).some(
        (row) => row.sourceRecordId === migratedEventId,
      ),
    ).toBe(true);
  });

  it("ignores an event without the saved council term-limit cause chain", () => {
    const personId = "person:holder" as EntityId;
    const event: HistoricalEvent = {
      id: "event:retirement" as EntityId,
      stableKey: "test:retirement",
      sequence: 1,
      type: "local.officeholder-retired",
      occurredAt: makeIsoDate("2026-01-01"),
      recordedAt: makeIsoDate("2026-01-01"),
      jurisdictionId: "place:town" as EntityId,
      involvedEntityIds: [personId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["barred:term-limit"],
      summary: "Controlled unstamped event.",
      context: {} as HistoricalEvent["context"],
    };
    const world = {
      currentDate: makeIsoDate("2026-01-01"),
      people: { [personId]: { id: personId } },
      history: { events: [event] },
    } as unknown as World;

    expect(applyLocalElectionLawLandings(world, event.id)).toBe(world);
  });

  it("does not backfill an old stamped event on a later simulation date", () => {
    const personId = "person:holder" as EntityId;
    const event: HistoricalEvent = {
      id: "event:old-retirement" as EntityId,
      stableKey: "test:old-retirement",
      sequence: 1,
      type: "local.officeholder-retired",
      occurredAt: makeIsoDate("2026-01-01"),
      recordedAt: makeIsoDate("2026-01-01"),
      jurisdictionId: "place:town" as EntityId,
      involvedEntityIds: [personId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["barred:term-limit"],
      summary: "Controlled old event.",
      context: {} as HistoricalEvent["context"],
      lawEffectStamps: [
        {
          version: "law-effect-stamp/v1",
          governingLawKey: "measure:term-limit" as EntityId,
          source: "enacted",
          effectKind: "local.officeholder-retired",
          questionKey:
            "us-policy-positions:government-operations.council-term-limits",
          jurisdictionId: "place:town" as EntityId,
          operativeAt: makeIsoDate("2026-01-01"),
          appliedAt: makeIsoDate("2026-01-01"),
        },
      ],
    };
    const world = {
      currentDate: makeIsoDate("2026-01-02"),
      people: { [personId]: { id: personId } },
      history: { events: [event] },
    } as unknown as World;

    expect(applyLocalElectionLawLandings(world, event.id)).toBe(world);
  });
});
