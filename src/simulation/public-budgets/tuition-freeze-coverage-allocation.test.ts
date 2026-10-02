import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  expandInstitution,
  type CompactInstitution,
  type EducationDictionary,
} from "../../education/compact";
import {
  applyForEducation,
  pendingEducationOffers,
  respondToEducationOffer,
  ADMISSION_DECISION_DAYS,
} from "../../education/study-provider";
import { acceptedEducationTerms } from "../education-study-terms";
import { pathForRelationship } from "../life-paths2";
import { composeWorldTimeHandlers } from "../campaigns";
import { organizationProfileAt } from "../life-queries";
import { resourcePositionAt } from "../resource-queries";
import {
  schoolTuitionQuote,
  recordSchoolTuitionPriceRevision,
  type SchoolTuitionInput,
} from "../../education/tuition-prices";
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
  recordedSchoolTuitionFreezeQuote,
  TUITION_FREEZE_QUESTION,
} from "./tuition-freeze";

const seed = "overflow8-a21-coverage-proof";
const tuitionSource = JSON.parse(
  readFileSync("data/source/education-tuition/tuition-input.json", "utf8"),
) as SchoolTuitionInput;
const sourcedSchool = tuitionSource.components.IC2023_AY!.rows.find(
  ([id]) =>
    schoolTuitionQuote(tuitionSource, {
      institutionId: id,
      artifactId: "IC2023_AY",
      field: "TUITION2",
    }).status === "sourced",
);
if (!sourcedSchool) throw new Error("No retained sourced tuition row");
const tuitionSelector = {
  institutionId: sourcedSchool[0],
  artifactId: "IC2023_AY",
  field: "TUITION2",
};
let sourcePriceId: EntityId;
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
let directoryEnrollmentId: EntityId;
let directorySchoolId: EntityId;
const directoryManifest = JSON.parse(
  readFileSync("public/education/manifest.json", "utf8"),
) as { chunks: { kind: string; path: string }[] };
const directory = JSON.parse(
  readFileSync(
    `public/education/${directoryManifest.chunks.find((row) => row.kind === "postsecondary")!.path}`,
    "utf8",
  ),
) as { records: CompactInstitution[]; dictionary: EducationDictionary };

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
  world = recordSchoolTuitionPriceRevision(world, {
    stableKey: "a21:dated-source-price",
    organizationId: schoolId,
    source: tuitionSource,
    selector: tuitionSelector,
  });
  sourcePriceId = world.history.evidenceArtifacts.at(-1)!.id;
  profileId = world.history.organizationProfiles.at(-1)!.id;
  const college = directory.records
    .map((row) => expandInstitution(row, directory.dictionary))
    .find(
      (row) =>
        row.state === fixture.stateUsps &&
        row.directorySource?.primaryPublicControl === "2" &&
        ["1", "2", "3"].includes(row.directorySource.calendarSystem) &&
        row.capabilities.some(
          (cap) => cap.code === "LEVEL5" && cap.state === "offered",
        ) &&
        schoolTuitionQuote(tuitionSource, {
          institutionId: row.id,
          artifactId: "IC2023_AY",
          field: "TUITION2",
        }).status === "sourced",
    );
  if (!college)
    throw new Error(
      "Missing recorded public college/annual tuition/terms join.",
    );
  const applied = applyForEducation(
    { ...world, control: { kind: "person", personId: fixture.personId } },
    college,
    "LEVEL5",
  );
  expect(applied.ok).toBe(true);
  let offered = advanceWorld(applied.world, ADMISSION_DECISION_DAYS);
  const accepted = respondToEducationOffer(
    offered,
    pendingEducationOffers(offered)[0]!.id,
    true,
  );
  expect(accepted.ok).toBe(true);
  offered = accepted.world;
  directoryEnrollmentId = offered.history.educationEnrollments.at(-1)!.id;
  directorySchoolId =
    offered.history.educationEnrollments.at(-1)!.organizationId;
  world = { ...offered, control: { kind: "person", personId: governor } };
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
  it("bills the real public college through saved annual installments and freezes a revised unpaid charge", () => {
    const terms = acceptedEducationTerms(world, directoryEnrollmentId)!;
    const billing = terms.tuitionBilling!;
    expect(billing.selector.field).toBe("TUITION2");
    expect(
      organizationProfileAt(world, directorySchoolId)!.publicGovernmentIdentity,
    ).toEqual({
      kind: "jurisdiction",
      jurisdictionId: fixture.stateJurisdictionId,
    });
    expect(
      recordedSchoolTuitionFreezeQuote(
        world,
        directoryEnrollmentId,
        billing.selector,
      ).status,
    ).toBe("frozen");
    let paying = createResourcePosition(
      { ...world, control: { kind: "person", personId: fixture.personId } },
      {
        stableKey: "a21:directory-student-cash",
        owner: { kind: "person", personId: fixture.personId },
        openedAt: world.currentDate,
        openingBalance: money(
          billing.annualAmountMinor * terms.path.academicYears!,
          "USD",
        ),
        provenance,
      },
    );
    paying = createResourcePosition(paying, {
      stableKey: "a21:directory-school-cash",
      owner: { kind: "organization", organizationId: directorySchoolId },
      openedAt: paying.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
    const enrollment = paying.history.educationEnrollments.find(
      (row) => row.id === directoryEnrollmentId,
    )!;
    const acceptedPath = pathForRelationship(paying, directoryEnrollmentId)!;
    const initialCash = resourcePositionAt(
      paying,
      {
        kind: "person",
        personId: fixture.personId,
      },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    const amounts: number[] = [];
    for (let period = 1; period <= billing.termsPerAcademicYear; period++) {
      const due = studyPeriodDueDate(
        enrollment.startedAt,
        acceptedPath,
        period,
      );
      paying = advanceWorld(
        paying,
        Math.max(0, daysBetween(paying.currentDate, due)),
        composeWorldTimeHandlers(),
      );
      const key = `life-paths2.study-period:${directoryEnrollmentId}:${period}`;
      paying = completeStudyPeriod(paying, directoryEnrollmentId, acceptedPath);
      const charge = paying.history.resourceFlows.find(
        (row) => row.stableKey === key,
      )!;
      expect(charge).toBeDefined();
      amounts.push(resourceFlowTermsAt(paying, charge.id)!.amount.minorUnits);
    }
    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(
      billing.annualAmountMinor,
    );
    expect(amounts.at(-1)).toBe(
      billing.annualAmountMinor -
        Math.floor(billing.annualAmountMinor / billing.termsPerAcademicYear) *
          (billing.termsPerAcademicYear - 1),
    );
    expect(
      resourcePositionAt(
        paying,
        {
          kind: "person",
          personId: fixture.personId,
        },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(initialCash - billing.annualAmountMinor);
    expect(
      resourcePositionAt(
        paying,
        {
          kind: "organization",
          organizationId: directorySchoolId,
        },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(billing.annualAmountMinor);
    const nextPeriod = billing.termsPerAcademicYear + 1;
    paying = createResourceFlow(paying, {
      stableKey: `life-paths2.study-period:${directoryEnrollmentId}:${nextPeriod}`,
      source: { kind: "person", personId: fixture.personId },
      recipient: { kind: "organization", organizationId: directorySchoolId },
      startsAt: paying.currentDate,
      amount: money(billing.annualAmountMinor, "USD"),
      cadenceKind: "schedule:one-time",
      basisKind: "obligation:tuition",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: fixture.stateJurisdictionId,
      provenance,
    });
    const revisedCharge = paying.history.resourceFlows.at(-1)!;
    const revisedTerms = resourceFlowTermsAt(paying, revisedCharge.id)!;
    const due = studyPeriodDueDate(
      enrollment.startedAt,
      acceptedPath,
      nextPeriod,
    );
    paying = advanceWorld(
      paying,
      Math.max(0, daysBetween(paying.currentDate, due)),
      composeWorldTimeHandlers(),
    );
    paying = completeStudyPeriod(paying, directoryEnrollmentId, acceptedPath);
    const cappedTerms = resourceFlowTermsAt(paying, revisedCharge.id)!;
    expect(cappedTerms.amount.minorUnits).toBe(
      Math.floor(billing.annualAmountMinor / billing.termsPerAcademicYear),
    );
    expect(cappedTerms.supersedesTermsId).toBe(revisedTerms.id);
    expect(
      paying.history.resourceFlowTerms.find(
        (row) => row.id === revisedTerms.id,
      ),
    ).toEqual(revisedTerms);
    const saved = deserializeWorld(serializeWorld(paying));
    expect(
      completeStudyPeriod(saved, directoryEnrollmentId, acceptedPath).history
        .resourceFlows,
    ).toEqual(saved.history.resourceFlows);
  });
  it("consumes the school price recorded at the operative date without dividing source units", () => {
    const quote = recordedSchoolTuitionFreezeQuote(
      world,
      enrollmentId,
      tuitionSelector,
    );
    expect(quote).toEqual({
      status: "frozen",
      quote: schoolTuitionQuote(tuitionSource, tuitionSelector),
      sourceRecordIds: [measureId, profileId, sourcePriceId],
    });
    if (quote.status !== "frozen")
      throw new Error("Missing recorded source quote");
    expect(quote.quote.chargeUnit).toBe("academic-year");
    expect(quote.quote.academicYear).toBe("2023-24");
    expect(quote).not.toHaveProperty("periodAmountMinor");
    const later = recordSchoolTuitionPriceRevision(world, {
      stableKey: "a21:later-source-observation",
      organizationId: schoolId,
      source: tuitionSource,
      selector: tuitionSelector,
    });
    expect(
      recordedSchoolTuitionFreezeQuote(later, enrollmentId, tuitionSelector),
    ).toEqual(quote);
    expect(
      recordedSchoolTuitionFreezeQuote(
        deserializeWorld(serializeWorld(later)),
        enrollmentId,
        tuitionSelector,
      ),
    ).toEqual(quote);
  });
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
      startAge: 18,
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
  const college = directory.records
    .map((row) => expandInstitution(row, directory.dictionary))
    .find(
      (row) =>
        `US-${row.state}` === place.stateJurisdictionKey &&
        row.directorySource?.primaryPublicControl === "2" &&
        ["1", "2", "3"].includes(row.directorySource.calendarSystem) &&
        row.capabilities.some(
          (cap) => cap.code === "LEVEL5" && cap.state === "offered",
        ) &&
        schoolTuitionQuote(tuitionSource, {
          institutionId: row.id,
          artifactId: "IC2023_AY",
          field: "TUITION2",
        }).status === "sourced",
    )!;
  const applied = applyForEducation(game.world, college, "LEVEL5");
  expect(applied.ok).toBe(true);
  const school = applied.world.history.organizations.find(
    (row) => row.stableKey === `edu-path7:institution:${college.id}`,
  )!;
  expect(
    organizationProfileAt(applied.world, school.id)!.publicGovernmentIdentity
      ?.kind,
  ).toBe("jurisdiction");
  const offer = applied.world.history.evidenceArtifacts.at(-1)!;
  expect(
    JSON.parse(offer.description!).tuitionBilling.selector.institutionId,
  ).toBe(college.id);
});
