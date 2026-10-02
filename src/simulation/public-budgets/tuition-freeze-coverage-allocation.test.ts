import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { advanceWorld, recordWorldEvent } from "../world";
import { addDays, daysBetween } from "../dates";
import { createEducationEnrollment, createOrganization } from "../life";
import { LIFE_PATHS2_CATALOG } from "../life-paths2-catalog";
import {
  completeStudyPeriod,
  studyPeriodDueDate,
  studyPeriodTuitionOutstanding,
} from "../education-study-progression";
import { introduceMeasure } from "../legislation";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { chamberByKey } from "../legislature-rules";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../legislation-scenarios";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { operativeDateInWorld } from "../governing/law-in-force";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcome,
} from "../resources";
import { resourceFlowTermsAt } from "../resource-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import {
  recordedTuitionFreezePrice,
  TUITION_FREEZE_QUESTION,
} from "./tuition-freeze";

const seed = "overflow8-a21-coverage-proof";
const place = drawRandomPlace(seed);
const path = LIFE_PATHS2_CATALOG.find(
  (row) =>
    row.kind === "study" &&
    row.progressionModel === "periods" &&
    (row.periodCostMinor ?? 0) > 0 &&
    (row.academicYears ?? 0) * (row.periodsPerYear ?? 0) > 1,
)!;
const provenance = {
  kind: "authored",
  note: "Explicit A21 fixture records, not an ordinary school ownership producer.",
} as const;
let fixture: ReturnType<typeof smallWorld>;
let world: World;
let enrollmentId: EntityId;
let schoolId: EntityId;
let profileId: EntityId;
let baselineFlowId: EntityId;
let baselineTermsId: EntityId;
let measureId: EntityId;

function tuitionFlow(start: World, period: number, amountMinor: number) {
  return createResourceFlow(start, {
    stableKey: `life-paths2.study-period:${enrollmentId}:${period}`,
    source: { kind: "person", personId: fixture.personId },
    recipient: { kind: "organization", organizationId: schoolId },
    startsAt: start.currentDate,
    amount: money(amountMinor, "USD"),
    cadenceKind: "schedule:one-time",
    basisKind: "obligation:tuition",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: fixture.stateJurisdictionId,
    provenance,
  });
}

beforeAll(() => {
  fixture = smallWorld({
    place: place.key,
    seed,
    offices: ["governor"],
    laws: [TUITION_FREEZE_QUESTION],
  });
  const governor = governorOfficeForJurisdiction(
    fixture.world,
    fixture.place.stateJurisdictionKey!,
  )?.holderPersonId;
  if (!governor) throw new Error("Missing actual executive fixture.");
  world = createOrganization(
    { ...fixture.world, control: { kind: "person", personId: governor } },
    {
      stableKey: "a21:explicit-supported-college",
      formedAt: fixture.world.currentDate,
      // This is explicitly controlled test evidence, never directory inference.
      provenance: {
        kind: "source-record",
        reference: "test-fixture:a21:explicit-state-college-ownership",
        asOf: fixture.world.currentDate,
      },
      initialProfile: {
        name: fixture.place.displayName,
        classification: "service:college",
        locationJurisdictionId: fixture.jurisdictionId,
        publicGovernmentIdentity: {
          kind: "jurisdiction",
          jurisdictionId: fixture.stateJurisdictionId,
        },
      },
    },
  );
  schoolId = world.history.organizations.at(-1)!.id;
  profileId = world.history.organizationProfiles.at(-1)!.id;
  world = createEducationEnrollment(world, {
    stableKey: "a21:recorded-enrollment",
    personId: fixture.personId,
    organizationId: schoolId,
    startedAt: world.currentDate,
    programKind: path.program,
    contextKind: "program:a21-test",
    provenance,
  });
  enrollmentId = world.history.educationEnrollments.at(-1)!.id;
  world = tuitionFlow(world, 1, path.periodCostMinor!);
  baselineFlowId = world.history.resourceFlows.at(-1)!.id;
  baselineTermsId = resourceFlowTermsAt(world, baselineFlowId)!.id;
  const pack = legislativePackForJurisdiction(fixture.stateJurisdictionId);
  if (!pack) throw new Error(`No actual legislature pack in ${place.key}`);
  const chamber = chamberByKey(pack, pack.chamberOrder[0]!);
  world = introduceMeasure(world, {
    stableKey: "a21:freeze-bill",
    jurisdictionId: fixture.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "A21 fixture",
    shortTitle: "Recorded tuition freeze fixture",
    summary: provenance.note,
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: null,
    originChamberKey: chamber.chamberKey,
    propositionIds: [fixture.propositionIds[TUITION_FREEZE_QUESTION]!],
    propositionAnswers: [
      {
        propositionId: fixture.propositionIds[TUITION_FREEZE_QUESTION]!,
        answer: "yes",
      },
    ],
  });
  measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const bodies = pack.chambers.map((row) =>
    seatBodyForPack(
      row.chamberKey,
      row.name,
      authoredScenarioSeatCount(pack, row.chamberKey),
      [],
      true,
    ),
  );
  const votePlan: Record<string, { yea: number }> = {};
  for (const row of pack.chambers) {
    for (const committee of row.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 7,
      };
    for (const stage of row.floorStages)
      votePlan[votePlanKeyForFloor(row.chamberKey, stage.stageKey)] = {
        yea: bodies.find((body) => body.chamberKey === row.chamberKey)!.members
          .length,
      };
  }
  world = enactThroughDesk(world, measureId, {
    context: {
      pack,
      measureId,
      bodies,
      committeeMemberCount: 7,
      votePlan,
      governorAction: "signed",
      governorRationale: provenance.note,
    },
  });
  const enactment = world.history.legislativeEnactments!.at(-1)!;
  const operative = operativeDateInWorld(world, enactment);
  if (!operative) throw new Error("Missing operative-date record.");
  const operativeAt = operative.date;
  const enrolledAt = world.history.educationEnrollments.find(
    (row) => row.id === enrollmentId,
  )!.startedAt;
  const readyAt = [
    addDays(operativeAt, 1),
    studyPeriodDueDate(enrolledAt, path, 2),
  ]
    .sort()
    .at(-1)!;
  world = advanceWorld(
    world,
    Math.max(0, daysBetween(world.currentDate, readyAt)),
  );
});

describe(`A21 supported saved tuition (${place.displayName}, seed ${seed})`, () => {
  it("freezes the operative saved period price with exact provenance and survives save/reopen", () => {
    const saved = serializeWorld(world);
    const expected = {
      status: "frozen",
      amountMinor: path.periodCostMinor,
      sourceRecordIds: [measureId, profileId, baselineFlowId, baselineTermsId],
    };
    expect(recordedTuitionFreezePrice(world, enrollmentId)).toEqual(expected);
    expect(
      recordedTuitionFreezePrice(deserializeWorld(saved), enrollmentId),
    ).toEqual(expected);
    expect(serializeWorld(world)).toBe(saved);
  });

  it("caps a revised unpaid charge at operative terms and preserves prior term records", () => {
    const revised = recordResourceFlowTerms(world, {
      stableKey: "a21:later-price-revision",
      resourceFlowId: baselineFlowId,
      effectiveAt: world.currentDate,
      status: "active",
      amount: money(path.periodCostMinor! * 2, "USD"),
      cadenceKind: "schedule:one-time",
      reason: "Explicit later test price revision.",
      provenance,
      supersedesTermsId: baselineTermsId,
    });
    expect(recordedTuitionFreezePrice(revised, enrollmentId)).toMatchObject({
      status: "frozen",
      amountMinor: path.periodCostMinor,
    });
    expect(studyPeriodTuitionOutstanding(revised, enrollmentId, path)).toBe(
      path.periodCostMinor!,
    );
    expect(
      resourceFlowTermsAt(revised, baselineFlowId)!.amount.minorUnits,
    ).toBe(path.periodCostMinor! * 2);
    const charged = completeStudyPeriod(revised, enrollmentId, path);
    expect(
      resourceFlowTermsAt(charged, baselineFlowId)!.amount.minorUnits,
    ).toBe(path.periodCostMinor);
    expect(
      charged.history.resourceFlowTerms.slice(
        0,
        revised.history.resourceFlowTerms.length,
      ),
    ).toEqual(revised.history.resourceFlowTerms);
    expect(
      resourceFlowTermsAt(charged, baselineFlowId)!.supersedesTermsId,
    ).toBe(resourceFlowTermsAt(revised, baselineFlowId)!.id);
    expect(charged.history.resourceFlows).toEqual(
      revised.history.resourceFlows,
    );
  });

  it("keeps missing ownership unknown and retains the accepted baseline", () => {
    let unsupported = createOrganization(world, {
      stableKey: "a21:college-without-recorded-owner",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: fixture.place.displayName,
        classification: "service:college",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    });
    unsupported = createEducationEnrollment(unsupported, {
      stableKey: "a21:unsupported-enrollment",
      personId: fixture.personId,
      organizationId: unsupported.history.organizations.at(-1)!.id,
      startedAt: unsupported.currentDate,
      programKind: path.program,
      contextKind: "program:a21-test",
      provenance,
    });
    const id = unsupported.history.educationEnrollments.at(-1)!.id;
    const quote = recordedTuitionFreezePrice(unsupported, id);
    expect(quote.status).toBe("unknown");
    expect(studyPeriodTuitionOutstanding(unsupported, id, path)).toBe(
      path.periodCostMinor,
    );
    expect(
      recordedTuitionFreezePrice(
        deserializeWorld(serializeWorld(unsupported)),
        id,
      ),
    ).toEqual(quote);
    const dueAt = studyPeriodDueDate(unsupported.currentDate, path, 1);
    unsupported = advanceWorld(
      unsupported,
      daysBetween(unsupported.currentDate, dueAt),
    );
    const charged = completeStudyPeriod(unsupported, id, path);
    const charge = charged.history.resourceFlows.find(
      (flow) => flow.stableKey === `life-paths2.study-period:${id}:1`,
    );
    expect(charge).toBeDefined();
    expect(resourceFlowTermsAt(charged, charge!.id)!.amount.minorUnits).toBe(
      path.periodCostMinor,
    );
  });

  it("distinguishes recorded non-college classification from missing coverage", () => {
    let uncovered = createOrganization(world, {
      stableKey: "a21:recorded-non-college",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: fixture.place.displayName,
        classification: "service:school",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    });
    const recordedProfileId = uncovered.history.organizationProfiles.at(-1)!.id;
    uncovered = createEducationEnrollment(uncovered, {
      stableKey: "a21:non-college-enrollment",
      personId: fixture.personId,
      organizationId: uncovered.history.organizations.at(-1)!.id,
      startedAt: uncovered.currentDate,
      programKind: path.program,
      contextKind: "program:a21-test",
      provenance,
    });
    const id = uncovered.history.educationEnrollments.at(-1)!.id;
    expect(recordedTuitionFreezePrice(uncovered, id)).toEqual({
      status: "not-covered",
      sourceRecordIds: [recordedProfileId],
    });
    expect(studyPeriodTuitionOutstanding(uncovered, id, path)).toBe(
      path.periodCostMinor,
    );
  });

  it("quotes the new period alone rather than recouping earlier frozen savings", () => {
    let paid = createResourcePosition(world, {
      stableKey: "a21:explicit-student-funds",
      owner: { kind: "person", personId: fixture.personId },
      openedAt: world.currentDate,
      openingBalance: money(path.periodCostMinor!, "USD"),
      provenance,
    });
    paid = createResourcePosition(paid, {
      stableKey: "a21:explicit-school-books",
      owner: { kind: "organization", organizationId: schoolId },
      openedAt: paid.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
    paid = recordResourceTransferOutcome(paid, {
      stableKey: "life-paths2.study-period-paid:a21:first-period",
      resourceFlowId: baselineFlowId,
      periodStartsAt: paid.currentDate,
      periodEndsAt: paid.currentDate,
      occurredAt: paid.currentDate,
      status: "completed",
      attemptedAmount: money(path.periodCostMinor!, "USD"),
      transferredAmount: money(path.periodCostMinor!, "USD"),
      reasonKind: null,
      note: "Explicit recorded payment of the prior frozen period.",
      provenance,
    });
    const progressed = recordWorldEvent(paid, {
      stableKey: "a21:completed-period",
      type: "life-paths2.study-period",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: fixture.jurisdictionId,
      involvedEntityIds: [fixture.personId, enrollmentId, schoolId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "Explicit completed study-period fixture.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const laterPath = { ...path, periodCostMinor: path.periodCostMinor! * 2 };
    expect(
      studyPeriodTuitionOutstanding(progressed, enrollmentId, laterPath),
    ).toBe(path.periodCostMinor);
    const actual = completeStudyPeriod(progressed, enrollmentId, laterPath);
    const frozenCharge = actual.history.resourceFlows.find(
      (flow) => flow.stableKey === `life-paths2.study-period:${enrollmentId}:2`,
    );
    expect(frozenCharge).toMatchObject({
      source: { kind: "person", personId: fixture.personId },
      recipient: { kind: "organization", organizationId: schoolId },
    });
    expect(
      resourceFlowTermsAt(actual, frozenCharge!.id)!.amount.minorUnits,
    ).toBe(path.periodCostMinor);
    expect(
      completeStudyPeriod(actual, enrollmentId, laterPath).history
        .resourceFlows,
    ).toEqual(actual.history.resourceFlows);
    const savedCharge = tuitionFlow(progressed, 2, laterPath.periodCostMinor);
    expect(
      studyPeriodTuitionOutstanding(savedCharge, enrollmentId, laterPath),
    ).toBe(path.periodCostMinor);
    expect(
      studyPeriodTuitionOutstanding(
        deserializeWorld(serializeWorld(savedCharge)),
        enrollmentId,
        laterPath,
      ),
    ).toBe(path.periodCostMinor);
  });
});

it(`opens a real new game in ${place.displayName}, ${place.stateJurisdictionKey}, seed ${seed}`, () => {
  const opened = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
    }),
  );
  expect(opened.game).not.toBeNull();
  const game = opened.game!;
  expect(game.world.people[game.playerPersonId]!.homeJurisdictionId).toBe(
    place.context.jurisdiction.id,
  );
  expect(game.world.control).toEqual({
    kind: "person",
    personId: game.playerPersonId,
  });
});
