import { describe, expect, it } from "vitest";
import {
  TEST_TAX_TERMS,
  enactedTaxFixture,
} from "../../tests/fixtures/tax-policy-fixture";
import {
  base,
  enact,
  procedure,
} from "../../tests/fixtures/funded-service-fixture";
import { declarePersonalTaxOccurrence } from "../presentation/tax-work";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { daysBetween, makeIsoDate } from "./dates";
import { createPartnership } from "./life";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { stableHash } from "./ids";
import {
  assertLawExposureIntegrity,
  NON_MONEY_FELT_SIZE,
  lawExposureFeltSize,
  lawExposuresFrom,
  lawExposuresOf,
  recordHeardExposure,
  recordLawExposure,
} from "./law-exposure";
import {
  followsNewsClosely,
  heardShare,
  knowsVote,
  officialsBehind,
  peopleKnownTo,
  townSupportFromViews,
  viewOfOfficial,
} from "./living-world/official-views";
import {
  groupsAgainst,
  lawInterestGroup,
  lawInterestMembers,
  membersAgainstLaw,
  officialViewReflectionEventKey,
} from "./official-view-reads";
import { joinLawInterestGroup } from "./living-world/law-interest-groups";
import { recordRelationshipInteraction } from "./records";
import { money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, Person, PrivateBeliefRecord, World } from "./types";
import { advanceWorld, assertWorldIntegrity } from "./world";

/** A person's saved views of officials, latest per official. */
function officialViewsOf(world: World, personId: EntityId) {
  const latest = new Map<EntityId, PrivateBeliefRecord>();
  for (const belief of world.history.privateBeliefs)
    if (belief.personId === personId && belief.subject?.kind === "official")
      latest.set(belief.subject.personId, belief);
  return [...latest.values()];
}

function officialOf(belief: PrivateBeliefRecord): EntityId {
  if (belief.subject?.kind !== "official") throw new Error("Not an official.");
  return belief.subject.personId;
}

/** A place from all 56 with a playable locality, named by its seed. */
function drawPlace(seed: string) {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const start = parseInt(stableHash(seed).slice(0, 8), 16) % states.length;
  for (let step = 0; step < states.length; step++) {
    const state = states[(start + step) % states.length]!;
    const town = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0];
    if (town) return { state: state.jurisdictionKey, town };
  }
  throw new Error("No playable locality in any of the 56 places.");
}

/** Authored fixture: this person's recorded home is in `jurisdictionId`. */
function homeIn(world: World, personId: EntityId, jurisdictionId: EntityId) {
  const person = world.people[personId]!;
  const move = <T extends { kind: string; endedAt?: unknown }>(fact: T): T =>
    fact.kind === "residence" && fact.endedAt === null
      ? { ...fact, jurisdictionId }
      : fact;
  const moved = {
    ...person,
    homeJurisdictionId: jurisdictionId,
    establishedFacts: person.establishedFacts.map(move),
    ...(person.detailLevel === "materialized"
      ? {
          details: {
            ...person.details,
            generatedFacts: person.details.generatedFacts.map(move),
          },
        }
      : {}),
  } as Person;
  return { ...world, people: { ...world.people, [personId]: moved } };
}

function collected(married = false) {
  const fixture = enactedTaxFixture();
  let world = fixture.world;
  const spouseId = world.personOrder.find((id) => id !== fixture.personId)!;
  if (married)
    world = createPartnership(world, {
      stableKey: "law-exposure-test:marriage",
      personIds: [fixture.personId, spouseId].sort() as [
        typeof spouseId,
        typeof spouseId,
      ],
      startedAt: world.currentDate,
      kind: "legal:marriage",
      provenance: {
        kind: "authored",
        note: "A married taxpayer for the test.",
      },
    });
  world = advanceWorld(
    world,
    daysBetween(
      fixture.world.currentDate,
      fixture.world.history.taxPolicies![0]!.effectiveAt,
    ),
    createCampaignElectionTransitionRegistry(),
  );
  world = declarePersonalTaxOccurrence(world, {
    personId: fixture.personId,
    stableKey: "law-exposure-test:occurrence",
    proposalId: fixture.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: 2100,
    assumptionNote: "One explicit fictional taxable occurrence.",
  });
  world = advanceWorld(world, 2, createCampaignElectionTransitionRegistry());
  return { ...fixture, world, spouseId };
}

describe("a law reaches a person", () => {
  it("records the tax a person paid under an enacted law, on the day it was collected", () => {
    const { world, personId } = collected();
    const collection = world.history.taxCollections![0]!;
    expect(collection.status).toBe("collected");
    const measureId = world.history.taxProposals![0]!.measureId;
    const rows = lawExposuresOf(world, personId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      measureId,
      channel: "tax-payment",
      relation: "own",
      viaPersonId: null,
      direction: "cost",
      amount: money(100, "USD"),
      cadence: "one-time",
      sourceRecordId: collection.id,
      recordedAt: collection.recordedAt,
    });
    // The fixture pays this person nothing from work, so their month's pay is
    // a recorded zero, not unknown: the game tracks their money.
    expect(rows[0]!.monthlyPay).toEqual(money(0, "USD"));
    expect(lawExposuresFrom(world, measureId)).toEqual(rows);
    assertWorldIntegrity(world);
  });

  it("reaches the taxpayer's spouse as family", () => {
    const { world, personId, spouseId } = collected(true);
    const own = lawExposuresOf(world, personId)[0]!;
    expect(lawExposuresOf(world, spouseId)).toMatchObject([
      {
        measureId: own.measureId,
        relation: "family",
        viaPersonId: personId,
        amount: own.amount,
        sourceRecordId: own.sourceRecordId,
      },
    ]);
    assertWorldIntegrity(world);
  });

  it("a few days later the spouse blames the legislators they know voted for it; the player decides for themselves", () => {
    const { world, personId, spouseId } = collected(true);
    const later = advanceWorld(
      world,
      3,
      createCampaignElectionTransitionRegistry(),
    );
    const exposure = lawExposuresOf(later, spouseId)[0]!;
    const known = officialsBehind(later, exposure.measureId).filter(
      (act) =>
        act.officialId !== spouseId &&
        (act.executive || knowsVote(later, exposure, act.officialId)),
    );
    const views = officialViewsOf(later, spouseId);
    expect(views.map(officialOf).sort()).toEqual(
      known.map((act) => act.officialId).sort(),
    );
    expect(views.length).toBeGreaterThan(0);
    // The reflection is a dated event in the spouse's life.
    const reflection = later.history.events.find(
      (event) => event.stableKey === officialViewReflectionEventKey(exposure),
    )!;
    expect(reflection.involvedEntityIds).toContain(spouseId);
    // No old reflection rows are written any more.
    expect(later.history.officialViews ?? []).toEqual([]);
    for (const view of views) {
      // Every one of them voted to make the tax law, so it is blame, saved
      // through the belief pipeline with its decision trace, which weighed
      // what the law did to the household.
      expect(view.position).toBe("oppose");
      expect(view.formation.relevantEventIds).toContain(reflection.id);
      const trace = later.history.decisionTraces.find(
        (row) => row.id === view.formation.decisionTraceIds[0],
      )!;
      expect(trace.context.subject).toEqual({
        kind: "entity:official",
        key: `official:${officialOf(view)}`,
        entityId: officialOf(view),
      });
      const law = trace.context.considerations.find(
        (row) => row.stableKey === `factor:law-exposure:${exposure.id}`,
      );
      expect(law).toMatchObject({ optionKey: "opposition" });
      expect(law?.explanation).toMatch(/household/);
      expect(trace.selectedOptionKey).toBe("opposition");
      const read = viewOfOfficial(later, spouseId, officialOf(view));
      expect(read.belief?.id).toBe(view.id);
      expect(read.points).toBeLessThan(0);
    }
    expect(officialViewsOf(later, personId)).toEqual([]);
    assertWorldIntegrity(later);
  });

  it("a town count reads what residents think of a candidate", () => {
    const { world, spouseId } = collected(true);
    const later = advanceWorld(
      world,
      3,
      createCampaignElectionTransitionRegistry(),
    );
    const officialId = officialOf(officialViewsOf(later, spouseId)[0]!);
    const view = { officialId };
    const town = later.people[spouseId]!.homeJurisdictionId!;
    const blamed = townSupportFromViews(
      later,
      town,
      view.officialId,
      later.currentDate,
    );
    expect(blamed).toBeLessThan(1);
    expect(blamed).toBeGreaterThanOrEqual(0.5);
    // Nobody in town has reflected on anything this person did.
    expect(townSupportFromViews(later, town, spouseId, later.currentDate)).toBe(
      1,
    );
    // Before the view was formed, the count could not have read it.
    expect(
      townSupportFromViews(later, town, view.officialId, world.currentDate),
    ).toBe(1);
  });

  it("writes nothing twice and survives a save", () => {
    const { world, personId } = collected();
    const reloaded = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      3,
      createCampaignElectionTransitionRegistry(),
    );
    expect(lawExposuresOf(reloaded, personId)).toEqual(
      lawExposuresOf(world, personId),
    );
    const row = lawExposuresOf(world, personId)[0]!;
    expect(
      recordLawExposure(world, {
        stableKey: row.stableKey,
        personId,
        measureId: row.measureId,
        channel: row.channel,
        direction: row.direction,
        amount: row.amount,
        cadence: row.cadence,
        sourceRecordId: row.sourceRecordId,
      }),
    ).toBe(world);
  });

  it("refuses a law that was never enacted and a money effect with no cadence", () => {
    const { world, personId } = collected();
    const row = lawExposuresOf(world, personId)[0]!;
    expect(() =>
      recordLawExposure(world, {
        stableKey: "law-exposure-test:unenacted",
        personId,
        measureId: world.history.taxCollections![0]!.id,
        channel: "rent",
        direction: "cost",
        amount: money(5000, "USD"),
        cadence: "monthly",
        sourceRecordId: row.sourceRecordId,
      }),
    ).toThrow("Only a recorded law in force can reach a person.");
    expect(() =>
      recordLawExposure(world, {
        stableKey: "law-exposure-test:no-cadence",
        personId,
        measureId: row.measureId,
        channel: "rent",
        direction: "cost",
        amount: money(5000, "USD"),
        cadence: null,
        sourceRecordId: row.sourceRecordId,
      }),
    ).toThrow("amount and cadence go together");
  });

  it("a saved exposure pointing at a missing source record does not load", () => {
    const { world } = collected();
    const broken = {
      ...world,
      history: {
        ...world.history,
        lawExposures: world.history.lawExposures!.map((row) => ({
          ...row,
          sourceRecordId: "tax-collection_missing" as typeof row.sourceRecordId,
        })),
      },
    };
    expect(() => assertWorldIntegrity(broken)).toThrow(
      "source record is missing",
    );
  });

  it("people tell those they know, who reflect on it as something a friend went through", () => {
    const { world, personId } = collected();
    const row = lawExposuresOf(world, personId)[0]!;
    // Everyone else in the fixture has the same law reach them.
    let told = world;
    const tellers = world.personOrder.filter((id) => id !== personId);
    for (const id of tellers)
      told = recordLawExposure(told, {
        stableKey: `law-exposure-test:wom:${id}`,
        personId: id,
        measureId: row.measureId,
        channel: "tax-payment",
        direction: "cost",
        amount: row.amount,
        cadence: "one-time",
        sourceRecordId: row.sourceRecordId,
        includeFamily: false,
      });
    const registry = createCampaignElectionTransitionRegistry();
    const reflected = advanceWorld(told, 3, registry);
    const heard = (reflected.history.lawExposures ?? []).filter(
      (exposure) => exposure.relation === "friend",
    );
    expect(heard.length).toBeGreaterThan(0);
    for (const exposure of heard) {
      const teller = exposure.viaPersonId!;
      expect(tellers).toContain(teller);
      expect(peopleKnownTo(told, teller)).toContain(exposure.personId);
      expect(exposure.amount).toEqual(row.amount);
      expect(exposure.recordedAt).toBe(reflected.currentDate);
    }
    // At most three discussion partners each, and hearsay is not retold.
    for (const id of tellers)
      expect(
        heard.filter((exposure) => exposure.viaPersonId === id).length,
      ).toBeLessThanOrEqual(3);
    const later = advanceWorld(reflected, 3, registry);
    expect(
      (later.history.lawExposures ?? []).filter(
        (exposure) => exposure.relation === "friend",
      ),
    ).toEqual(heard);
    const heardReflections = new Set(
      later.history.events
        .filter((event) =>
          heard.some(
            (exposure) =>
              event.stableKey === officialViewReflectionEventKey(exposure),
          ),
        )
        .map((event) => event.id),
    );
    const friendViews = later.history.privateBeliefs.filter(
      (belief) =>
        belief.subject?.kind === "official" &&
        belief.formation.relevantEventIds.some((id) =>
          heardReflections.has(id),
        ),
    );
    for (const view of friendViews) {
      // Heard from a friend, so blame held with less certainty than one's own.
      expect(view.position).not.toBe("support");
      const trace = later.history.decisionTraces.find(
        (row) => row.id === view.formation.decisionTraceIds[0],
      )!;
      expect(
        trace.context.considerations.some((row) =>
          /someone the person knows/.test(row.explanation),
        ),
      ).toBe(true);
    }
    assertWorldIntegrity(later);
  });

  it("a friend's story moves the hearer as much as they care about the teller", () => {
    const { world, personId, spouseId } = collected();
    const row = lawExposuresOf(world, personId)[0]!;
    const heardFrom = (w: typeof world) =>
      (w.history.lawExposures ?? []).find(
        (exposure) =>
          exposure.relation === "friend" && exposure.personId === spouseId,
      )!;
    const stranger = recordHeardExposure(world, row, spouseId);
    let close = world;
    for (const [i, day] of ["2019-01-07", "2019-03-04", "2019-06-03"].entries())
      close = recordRelationshipInteraction(close, {
        stableKey: `law-exposure-test:care:${i}`,
        personIds: [personId, spouseId].sort() as [
          typeof spouseId,
          typeof spouseId,
        ],
        eventId: null,
        occurredAt: day as typeof world.currentDate,
        kind: "care:looked-after",
        change: "strengthened",
        significance: "major",
        summary: "They looked after each other through a hard winter.",
        tags: [],
      });
    close = recordHeardExposure(close, row, spouseId);
    // Nobody's own money or household is discounted.
    expect(heardShare(world, row)).toBe(1);
    // A story from someone they have no warmth for reaches them faintly; the
    // same story from someone who looked after them reaches them far more.
    expect(heardShare(stranger, heardFrom(stranger))).toBe(1 / 8);
    expect(heardShare(close, heardFrom(close))).toBeGreaterThan(1 / 8);
  });

  it("a close news follower knows a legislator's vote; someone who neither follows nor knows them does not", () => {
    const { world } = collected();
    const exposure = lawExposuresOf(world, world.personOrder[0]!)[0]!;
    const official = world.personOrder[0]!;
    for (const personId of world.personOrder) {
      if (personId === official) continue;
      const probe = { ...exposure, personId };
      const follows = followsNewsClosely(world, personId);
      const acquainted = peopleKnownTo(world, personId).includes(official);
      expect(knowsVote(world, probe, official)).toBe(follows || acquainted);
    }
  });

  const eligibilitySeed = "a159-felt-size-non-money";
  const eligibilityPlace = drawPlace(eligibilitySeed);
  it(`a right or an eligibility lost with no money is felt at one estimated size, and six such losses found a group (${eligibilityPlace.town.displayName}, ${eligibilityPlace.state}, seed ${eligibilitySeed})`, () => {
    // A state law enacted in a place drawn from all 56; no money changes hands.
    const state = stateJurisdictionForKey(eligibilityPlace.state)!;
    const townPlace = eligibilityPlace.town.context.jurisdiction;
    let world: World = {
      ...base,
      jurisdictions: {
        ...base.jurisdictions,
        [state.id]: state,
        [townPlace.id]: townPlace,
      },
      jurisdictionOrder: [
        ...new Set([...base.jurisdictionOrder, state.id, townPlace.id]),
      ],
      control: { kind: "person", personId: procedure.playerPersonId },
    };
    world = enact(world, state.id, "yes");
    // Authored fixture: everyone's recorded home is in the drawn town.
    for (const id of world.personOrder) world = homeIn(world, id, townPlace.id);
    const personId = procedure.playerPersonId;
    const enactment = world.history.legislativeEnactments!.at(-1)!;
    expect(enactment.outcome).toBe("enacted");
    const row = {
      measureId: enactment.measureId,
      sourceRecordId: enactment.id,
    };
    // One felt size for every reader, labeled an estimate.
    expect(NON_MONEY_FELT_SIZE.basis).toBe("PLACEHOLDER");
    expect(lawExposureFeltSize({ direction: "cost", amount: null }, 0)).toEqual(
      { share: NON_MONEY_FELT_SIZE.monthsOfPay, estimated: true },
    );
    expect(lawExposureFeltSize({ direction: "none", amount: null }, 0)).toBe(
      null,
    );
    expect(
      lawExposureFeltSize({ direction: "cost", amount: money(100, "USD") }, 0),
    ).toBe("unmeasured");
    // Six residents lose an eligibility under the law: no money on record
    // and no pay on record, which a money loss could never count with.
    let next = world;
    const town = next.people[personId]!.homeJurisdictionId!;
    const hit = next.personOrder
      .filter((id) => next.people[id]!.homeJurisdictionId === town)
      .slice(0, 6);
    expect(hit).toHaveLength(6);
    for (const id of hit)
      next = recordLawExposure(next, {
        stableKey: `law-exposure-test:eligibility:${id}`,
        personId: id,
        measureId: row.measureId,
        channel: "benefit",
        direction: "cost",
        amount: null,
        cadence: null,
        sourceRecordId: row.sourceRecordId,
        includeFamily: false,
      });
    const losses = (w: World, id: EntityId) =>
      lawExposuresOf(w, id).find((exposure) =>
        exposure.stableKey.startsWith("law-exposure-test:eligibility:"),
      )!;
    // Five are not enough to found it.
    const five = {
      ...next,
      history: {
        ...next.history,
        lawExposures: next.history.lawExposures!.filter(
          (exposure) =>
            exposure.stableKey !== `law-exposure-test:eligibility:${hit[5]}`,
        ),
      },
    };
    expect(joinLawInterestGroup(five, losses(five, hit[0]!))).toBe(five);
    expect(lawInterestGroup(five, town, row.measureId)).toBeFalsy();
    // The sixth founds it.
    let grouped = next;
    for (const id of hit)
      grouped = joinLawInterestGroup(grouped, losses(grouped, id));
    const groupId = lawInterestGroup(grouped, town, row.measureId);
    expect(groupId).toBeTruthy();
    assertWorldIntegrity(grouped);
  });

  it("people a law cost a tenth of a month's pay form a group once six in town are hit", () => {
    const { world, personId } = collected();
    const row = lawExposuresOf(world, personId)[0]!;
    let next = world;
    for (const id of world.personOrder.filter((id) => id !== personId))
      next = recordLawExposure(next, {
        stableKey: `law-exposure-test:group:${id}`,
        personId: id,
        measureId: row.measureId,
        channel: "tax-payment",
        direction: "cost",
        amount: row.amount,
        cadence: "one-time",
        sourceRecordId: row.sourceRecordId,
        includeFamily: false,
      });
    // The fixture pays nobody from work; give each a recorded month's pay of
    // $5 so the $1 tax is a fifth of it.
    const paid = (w: typeof next) => ({
      ...w,
      history: {
        ...w.history,
        lawExposures: w.history.lawExposures!.map((exposure) => ({
          ...exposure,
          monthlyPay: money(500, "USD"),
        })),
      },
    });
    next = paid(next);
    const town = next.people[personId]!.homeJurisdictionId!;
    const everyoneHere = next.personOrder.every(
      (id) => next.people[id]!.homeJurisdictionId === town,
    );
    expect(everyoneHere).toBe(true);
    // Five qualifying residents are not enough.
    const five = {
      ...next,
      history: {
        ...next.history,
        lawExposures: next.history.lawExposures!.filter(
          (exposure) => exposure.personId !== personId,
        ),
      },
    };
    const first = lawExposuresOf(
      five,
      five.personOrder.find((id) => id !== personId)!,
    )[0]!;
    expect(joinLawInterestGroup(five, first)).toBe(five);
    // With the sixth, the group forms and members join by their odds.
    let grouped = next;
    for (const id of next.personOrder.filter((id) => id !== personId))
      grouped = joinLawInterestGroup(grouped, lawExposuresOf(grouped, id)[0]!);
    const groupId = lawInterestGroup(grouped, town, row.measureId)!;
    expect(groupId).toBeTruthy();
    const members = lawInterestMembers(grouped, groupId);
    expect(members).not.toContain(personId);
    expect(members.length).toBeGreaterThan(0);
    expect(members.length).toBeLessThanOrEqual(5);
    expect(membersAgainstLaw(grouped, row.measureId)).toBe(members.length);
    // Joining twice writes nothing.
    const again = joinLawInterestGroup(
      grouped,
      lawExposuresOf(grouped, members[0] ?? personId)[0]!,
    );
    expect(lawInterestMembers(again, groupId)).toEqual(members);
    assertWorldIntegrity(grouped);
    // A group whose members blame a candidate works against them in a town
    // count: support falls by a twentieth beyond what the views alone do.
    const officialId = personId;
    const blamed = {
      ...grouped,
      history: {
        ...grouped.history,
        officialViews: [
          {
            id: "official-view_test" as typeof officialId,
            stableKey: "law-exposure-test:blame",
            sequence: grouped.history.nextSequence,
            recordedAt: grouped.currentDate,
            personId: members[0]!,
            officialId,
            measureId: row.measureId,
            act: "voted-for" as const,
            exposureId: lawExposuresOf(grouped, members[0]!)[0]!.id,
            points: -1,
            reasons: [{ kind: "personal" as const, points: -1 }],
          },
        ],
      },
    };
    expect(groupsAgainst(blamed, town, officialId)).toHaveLength(1);
    // A view formed this half year counts 1.5 times.
    const viewsOnly = 1 + (-1 * 1.5) / (grouped.personOrder.length * 20);
    expect(
      townSupportFromViews(blamed, town, officialId, blamed.currentDate),
    ).toBeCloseTo(viewsOnly - 0.05, 10);
    expect(groupsAgainst(grouped, town, officialId)).toHaveLength(0);
  });
});

/** Writer-boundary fixtures only. These complete the histories this writer
 * reads; they do not claim that a real paycheck or legislature produced them.
 * Existing integration cases above cover the enacted collection route.
 */
describe("starting and passed wage laws share the exposure record", () => {
  const questionKey = "us-policy-positions:labor-workforce.raise-minimum-wage";
  const personId = "person_exposure-control" as EntityId;
  const questionId = "proposition_exposure-wage" as EntityId;
  const sourceId = "event_exposure-control-pay" as EntityId;
  const passedId = "measure_exposure-control-wage" as EntityId;
  function writerWorld(): World {
    return {
      id: "world_exposure-control",
      currentDate: makeIsoDate("2027-01-20"),
      people: { [personId]: { id: personId } },
      control: { kind: "person", personId },
      policyCatalog: {
        propositions: {
          [questionId]: { id: questionId, stableKey: questionKey },
        },
      },
      history: {
        nextSequence: 2,
        resourcePositions: [],
        resourceFlows: [],
        resourceTransferOutcomes: [],
        legislativeMeasures: [],
        legislativeEnactments: [
          {
            measureId: passedId,
            outcome: "enacted",
            resolvedAt: makeIsoDate("2027-01-01"),
          },
        ],
      },
    } as unknown as World;
  }
  function input(measureId: EntityId) {
    return {
      stableKey: "exposure-control:pay",
      personId,
      measureId,
      channel: "paycheck" as const,
      direction: "gain" as const,
      amount: money(100, "USD"),
      cadence: "monthly" as const,
      sourceRecordId: sourceId,
      includeFamily: false,
    };
  }
  it.each(["US-AK", "US-CA", "US-MA", "US-OR", "US-WA"])(
    "%s records the same fields and validates both origins without a fake enactment",
    (placeKey) => {
      const world = writerWorld();
      const startingId = `starting-law:${placeKey}:${questionKey}` as EntityId;
      const starting = recordLawExposure(world, input(startingId));
      const passed = recordLawExposure(world, input(passedId));
      const startingRow = lawExposuresOf(starting, personId)[0]!;
      const passedRow = lawExposuresOf(passed, personId)[0]!;
      expect(startingRow).toEqual({ ...passedRow, measureId: startingId });
      expect(starting.history.legislativeEnactments).toBe(
        world.history.legislativeEnactments,
      );
      expect(recordLawExposure(starting, input(startingId))).toBe(starting);
      for (const recorded of [starting, passed]) {
        expect(() =>
          assertLawExposureIntegrity(recorded, new Set([sourceId])),
        ).not.toThrow();
        const restored = JSON.parse(JSON.stringify(recorded)) as World;
        expect(() =>
          assertLawExposureIntegrity(restored, new Set([sourceId])),
        ).not.toThrow();
        expect(
          recordLawExposure(
            restored,
            input(recorded === starting ? startingId : passedId),
          ),
        ).toBe(restored);
      }
    },
  );
  it("rejects an invented place, unknown question and a law before its starting date", () => {
    const world = writerWorld();
    for (const id of [
      `starting-law:US-ZZ:${questionKey}`,
      "starting-law:US-AK:invented-question",
    ])
      expect(() => recordLawExposure(world, input(id as EntityId))).toThrow(
        "recorded law in force",
      );
    const before = { ...world, currentDate: makeIsoDate("1900-01-01") };
    expect(() =>
      recordLawExposure(
        before,
        input(`starting-law:US-AK:${questionKey}` as EntityId),
      ),
    ).toThrow("recorded law in force");
  });
});
