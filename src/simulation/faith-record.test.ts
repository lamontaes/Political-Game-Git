import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { assertWorldIntegrity, createWorld } from "./world";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  createCareResponsibility,
  createOrganization,
  createOrganizationParticipation,
} from "./life";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import { makeIsoDate } from "./dates";
import { appendChildhoodEntry } from "./childhood-record";
import { recordFamilyAddition } from "./people-family";
import { currentFaithForPerson, faithRecordForPerson } from "./faith-record";
import { createDemoWorld } from "./demo";
import { recordWorldEvent } from "./world";
import { recordFormativePlayerTraitChoice } from "./people-player-traits";

describe("a person's faith record", () => {
  it("opens in a random place and reads only personal congregation membership", () => {
    const seed = "s6-faith-record-random-place";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
    });
    let world = game.world;
    const personId = game.playerPersonId;
    expect(faithRecordForPerson(world, personId)).toEqual([]);
    const openingHistory = world.history;
    const openingFaith = currentFaithForPerson(world, personId);
    expect(openingFaith.status).toMatch(/^(affiliated|unaffiliated|unknown)$/);
    expect([
      "attributed-household",
      "estimated-household",
      "unrecorded-household",
    ]).toContain(openingFaith.basis);
    expect(openingFaith.estimated).toBe(
      openingFaith.basis === "estimated-household",
    );
    expect(world.history).toBe(openingHistory);
    const provenance = {
      kind: "authored" as const,
      note: "Explicitly recorded test participation.",
    };
    world = createOrganization(world, {
      stableKey: "s6-faith-record:congregation",
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Recorded congregation",
        classification: "membership:congregation",
        locationJurisdictionId: null,
      },
    });
    const congregationId = world.history.organizations.at(-1)!.id;
    world = createOrganizationParticipation(world, {
      stableKey: "s6-faith-record:member",
      personId,
      organizationId: congregationId,
      startedAt: world.currentDate,
      kind: "membership:congregation",
      roleKind: "member:congregant",
      context: null,
      provenance,
    });

    expect(faithRecordForPerson(world, personId)).toEqual([
      {
        organizationId: congregationId,
        congregationName: "Recorded congregation",
        startedAt: world.currentDate,
        states: [
          expect.objectContaining({
            status: "active",
            effectiveAt: world.currentDate,
          }),
        ],
      },
    ]);
    expect(faithRecordForPerson(world, personId)).toHaveLength(1);
    assertWorldIntegrity(world);
    console.info(
      "S6_FAITH_RECORD_NEW_GAME",
      JSON.stringify({ seed, place: place.key, personId }),
    );
  });

  it("attributes a child's dated household faith until the child records their own", () => {
    const demo = createDemoWorld("s6-current-faith-birth");
    let world = createWorld({
      seed: demo.seed,
      currentDate: demo.currentDate,
      jurisdictions: demo.jurisdictionOrder.map(
        (id) => demo.jurisdictions[id]!,
      ),
      people: [],
    });
    world = createCharacterHistoryContextPerson(world, {
      stableKey: "faith-parent",
      givenName: "Faith",
      familyName: "Parent",
      birthDate: makeIsoDate("1980-02-03"),
      homeJurisdictionId: world.jurisdictionOrder[0]!,
    });
    const parentId = characterHistoryContextPersonId(world, "faith-parent");
    const provenance = {
      kind: "authored" as const,
      note: "Explicit faith history for this test.",
    };
    world = createOrganization(world, {
      stableKey: "faith-parent-congregation",
      formedAt: makeIsoDate("2000-01-01"),
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Parent congregation",
        classification: "membership:congregation",
        locationJurisdictionId: null,
      },
    });
    const parentCongregationId = world.history.organizations.at(-1)!.id;
    world = createOrganizationParticipation(world, {
      stableKey: "faith-parent-membership",
      personId: parentId,
      organizationId: parentCongregationId,
      startedAt: makeIsoDate("2000-01-01"),
      kind: "membership:congregation",
      roleKind: "member:congregant",
      context: null,
      provenance,
    });
    world = createCharacterHistoryContextPerson(world, {
      stableKey: "faith-second-parent",
      givenName: "Second",
      familyName: "Parent",
      birthDate: makeIsoDate("1981-05-06"),
      homeJurisdictionId: world.jurisdictionOrder[0]!,
    });
    const secondParentId = characterHistoryContextPersonId(
      world,
      "faith-second-parent",
    );
    world = createOrganization(world, {
      stableKey: "faith-second-parent-congregation",
      formedAt: makeIsoDate("2000-01-01"),
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Second parent congregation",
        classification: "membership:congregation",
        locationJurisdictionId: null,
      },
    });
    const secondParentCongregationId = world.history.organizations.at(-1)!.id;
    world = createOrganizationParticipation(world, {
      stableKey: "faith-second-parent-membership",
      personId: secondParentId,
      organizationId: secondParentCongregationId,
      startedAt: makeIsoDate("2000-01-01"),
      kind: "membership:congregation",
      roleKind: "member:congregant",
      context: null,
      provenance,
    });
    const born = recordFamilyAddition(world, {
      kind: "birth",
      stableKey: "faith-child-birth",
      occurredAt: "2010-06-15",
      parentPersonIds: [parentId, secondParentId],
    });
    world = born.world;
    const childFaith = currentFaithForPerson(world, born.childPersonId);
    expect(childFaith).toMatchObject({
      status: "affiliated",
      congregationIds: [parentCongregationId, secondParentCongregationId],
      primaryCongregationId: null,
      mixedHousehold: true,
      basis: "attributed-household",
      estimated: false,
      attributedFromPersonIds: [parentId, secondParentId],
      asOf: "2010-06-15",
    });
    expect(childFaith.householdAttributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caregiverPersonId: parentId,
          organizationId: parentCongregationId,
          participationEffectiveAt: "2000-01-01",
          participationRoleKind: "member:congregant",
          caregivingShares: [],
        }),
        expect.objectContaining({
          caregiverPersonId: secondParentId,
          organizationId: secondParentCongregationId,
          participationEffectiveAt: "2000-01-01",
          participationRoleKind: "member:congregant",
          caregivingShares: [],
        }),
      ]),
    );

    world = createCareResponsibility(world, {
      stableKey: "faith-second-parent-primary-care",
      caregiverPersonId: secondParentId,
      recipientPersonId: born.childPersonId,
      startedAt: "2010-06-15",
      kind: "personal:parenting",
      share: "primary",
      context: "Primary caregiver in the household.",
      timeDemand: {
        expectedWeekly: { minimumHours: 24, maximumHours: 30 },
        attention: "continuous",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: null,
      },
      provenance,
    });
    const weightedFaith = currentFaithForPerson(world, born.childPersonId);
    expect(weightedFaith).toMatchObject({
      congregationIds: [parentCongregationId, secondParentCongregationId],
      primaryCongregationId: secondParentCongregationId,
      mixedHousehold: false,
    });
    expect(weightedFaith.householdAttributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caregiverPersonId: secondParentId,
          caregivingShares: ["primary"],
          caregivingPriority: "primary",
        }),
      ]),
    );

    world = createOrganization(world, {
      stableKey: "faith-child-congregation",
      formedAt: makeIsoDate("2015-01-01"),
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Child congregation",
        classification: "membership:congregation",
        locationJurisdictionId: null,
      },
    });
    const childCongregationId = world.history.organizations.at(-1)!.id;
    world = createOrganizationParticipation(world, {
      stableKey: "faith-child-membership",
      personId: born.childPersonId,
      organizationId: childCongregationId,
      startedAt: makeIsoDate("2015-01-01"),
      kind: "membership:congregation",
      roleKind: "member:congregant",
      context: null,
      provenance,
    });
    const controlled = {
      ...world,
      control: { kind: "person" as const, personId: born.childPersonId },
    };
    const choiceDate = makeIsoDate("2016-06-15");
    const choiceEventWorld = recordWorldEvent(controlled, {
      stableKey: "faith-child-formative-choice",
      type: "life.formative.choice",
      occurredAt: choiceDate,
      recordedAt: controlled.currentDate,
      jurisdictionId: controlled.people[born.childPersonId]!.homeJurisdictionId,
      involvedEntityIds: [born.childPersonId],
      participants: [
        {
          personId: born.childPersonId,
          role: "agency:actor",
          detail: "Chose what faith means to them.",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["formative.faith-choice", "choice.choose-for-myself"],
      summary: "The child chose how to understand faith.",
      context: {
        location: null,
        socialContext: "A formative scene about faith.",
        pressure: null,
        choice: "Choose for myself.",
        motivation: null,
        immediateReaction: null,
      },
    });
    const withUnaffiliatedChoice = recordFormativePlayerTraitChoice(
      controlled,
      choiceEventWorld,
      {
        personId: born.childPersonId,
        situationKey: "formative.faith-choice",
        optionKey: "choose-for-myself",
        choiceLabel: "Choose for myself",
        faithChoice: null,
      },
    );
    expect(
      currentFaithForPerson(withUnaffiliatedChoice, born.childPersonId),
    ).toMatchObject({
      status: "unaffiliated",
      congregationIds: [],
      basis: "recorded-personal-life",
      asOf: choiceDate,
    });
    expect(
      withUnaffiliatedChoice.history.childhoodRecords?.at(-1),
    ).toMatchObject({
      kind: "faith-choice",
      personId: born.childPersonId,
      effectiveAt: choiceDate,
      sourceRecordId: choiceEventWorld.history.events.at(-1)!.id,
      congregationId: null,
      situationKey: "formative.faith-choice",
      optionKey: "choose-for-myself",
    });
    const npcControlledEventWorld = {
      ...choiceEventWorld,
      control: { kind: "person" as const, personId: parentId },
    };
    expect(
      recordFormativePlayerTraitChoice(controlled, npcControlledEventWorld, {
        personId: born.childPersonId,
        situationKey: "formative.faith-choice",
        optionKey: "choose-for-myself",
        choiceLabel: "Choose for myself",
        faithChoice: null,
      }).history.childhoodRecords,
    ).toBe(npcControlledEventWorld.history.childhoodRecords);
    expect(() =>
      appendChildhoodEntry(choiceEventWorld, {
        kind: "faith-choice",
        stableKey: "faith-choice:wrong-date",
        personId: born.childPersonId,
        effectiveAt: makeIsoDate("2016-06-16"),
        sourceRecordId: choiceEventWorld.history.events.at(-1)!.id,
        congregationId: null,
        situationKey: "formative.faith-choice",
        optionKey: "choose-for-myself",
      }),
    ).toThrow("dated formative choice event");

    let afterLaterParticipation = createOrganization(withUnaffiliatedChoice, {
      stableKey: "faith-child-later-congregation",
      formedAt: makeIsoDate("2017-01-01"),
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Later congregation",
        classification: "membership:congregation",
        locationJurisdictionId: null,
      },
    });
    const laterCongregationId =
      afterLaterParticipation.history.organizations.at(-1)!.id;
    afterLaterParticipation = createOrganizationParticipation(
      afterLaterParticipation,
      {
        stableKey: "faith-child-later-membership",
        personId: born.childPersonId,
        organizationId: laterCongregationId,
        startedAt: makeIsoDate("2017-01-01"),
        kind: "membership:congregation",
        roleKind: "member:congregant",
        context: null,
        provenance,
      },
    );
    expect(
      currentFaithForPerson(afterLaterParticipation, born.childPersonId),
    ).toMatchObject({
      status: "affiliated",
      congregationIds: expect.arrayContaining([
        childCongregationId,
        laterCongregationId,
      ]),
      basis: "recorded-personal-life",
      asOf: "2017-01-01",
    });
    const laterChoiceDate = makeIsoDate("2018-01-01");
    const secondChoiceBefore = afterLaterParticipation;
    const secondChoiceEvent = recordWorldEvent(secondChoiceBefore, {
      stableKey: "faith-child-congregation-choice",
      type: "life.formative.choice",
      occurredAt: laterChoiceDate,
      recordedAt: secondChoiceBefore.currentDate,
      jurisdictionId:
        secondChoiceBefore.people[born.childPersonId]!.homeJurisdictionId,
      involvedEntityIds: [born.childPersonId],
      participants: [
        {
          personId: born.childPersonId,
          role: "agency:actor",
          detail: "Chose a congregation.",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["formative.faith-choice", "choice.join-congregation"],
      summary: "The child chose a congregation.",
      context: {
        location: null,
        socialContext: "A formative scene about faith.",
        pressure: null,
        choice: "Join this congregation.",
        motivation: null,
        immediateReaction: null,
      },
    });
    const withCongregationChoice = recordFormativePlayerTraitChoice(
      secondChoiceBefore,
      secondChoiceEvent,
      {
        personId: born.childPersonId,
        situationKey: "formative.faith-choice",
        optionKey: "join-congregation",
        choiceLabel: "Join this congregation",
        faithChoice: parentCongregationId,
      },
    );
    expect(
      currentFaithForPerson(withCongregationChoice, born.childPersonId),
    ).toMatchObject({
      status: "affiliated",
      congregationIds: [parentCongregationId],
      basis: "recorded-personal-life",
      asOf: laterChoiceDate,
    });
    assertWorldIntegrity(withCongregationChoice);

    expect(currentFaithForPerson(world, born.childPersonId)).toMatchObject({
      status: "affiliated",
      congregationIds: [childCongregationId],
      basis: "recorded-personal-life",
      estimated: false,
      attributedFromPersonIds: [],
    });

    world = createCharacterHistoryContextPerson(world, {
      stableKey: "faith-nonpracticing-parent",
      givenName: "Unaffiliated",
      familyName: "Parent",
      birthDate: makeIsoDate("1982-04-05"),
      homeJurisdictionId: world.jurisdictionOrder[0]!,
    });
    const nonpracticingParentId = characterHistoryContextPersonId(
      world,
      "faith-nonpracticing-parent",
    );
    const nonpracticingBirth = recordFamilyAddition(world, {
      kind: "birth",
      stableKey: "faith-unaffiliated-child-birth",
      occurredAt: "2012-08-10",
      parentPersonIds: [nonpracticingParentId],
    });
    const knownUnaffiliated = currentFaithForPerson(
      nonpracticingBirth.world,
      nonpracticingBirth.childPersonId,
    );
    expect(knownUnaffiliated).toMatchObject({
      status: "unaffiliated",
      congregationIds: [],
      basis: "attributed-household",
      estimated: false,
      attributedFromPersonIds: [nonpracticingParentId],
    });
    world = nonpracticingBirth.world;

    world = createCharacterHistoryContextPerson(world, {
      stableKey: "faith-unrecorded-person",
      givenName: "Unrecorded",
      familyName: "Person",
      birthDate: makeIsoDate("1984-03-01"),
      homeJurisdictionId: world.jurisdictionOrder[0]!,
    });
    const unrecordedPersonId = characterHistoryContextPersonId(
      world,
      "faith-unrecorded-person",
    );
    expect(currentFaithForPerson(world, unrecordedPersonId)).toMatchObject({
      status: "unknown",
      congregationIds: [],
      basis: "unrecorded-household",
      estimated: false,
    });
    assertWorldIntegrity(world);
  });
});
