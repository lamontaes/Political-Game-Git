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
import {
  recordFiledProvision,
  currentMeasureProvisions,
} from "../legislative-politics";
import { recordAdoptedAppropriation } from "../governing/program-governing";
import {
  administrativeMandateText,
  fundingAvailabilityText,
  PUBLIC_FUNDING_DEFAULT_DATE_TEXT,
} from "../public-fiscal";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { settleTuitionFreezeBackfill } from "./tuition-freeze-backfill";
import { budgetProgramFor } from "./month";
import { playerRequiredWorkIds, releasePlayerRequiredWork } from "../time-work";
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
let backfillFixtureWorld: World;
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
  backfillFixtureWorld = world;
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
  it("pays an actual adopted backfill to school through the existing public writer once", () => {
    let funded = backfillFixtureWorld;
    const cap = resourceFlowTermsAt(funded, baselineFlowId)!.amount.minorUnits;
    const revised = cap + cap;
    const gap = revised - cap;
    const expiresAt = addDays(funded.currentDate, path.minimumElapsedDays);
    const pack = legislativePackForJurisdiction(fixture.stateJurisdictionId)!;
    const governor = governorOfficeForJurisdiction(
      funded,
      fixture.place.stateJurisdictionKey!,
    )!.holderPersonId!;
    funded = introduceMeasure(
      { ...funded, control: { kind: "person", personId: governor } },
      {
        stableKey: "a21:actual-backfill-bill",
        jurisdictionId: fixture.stateJurisdictionId,
        rulePackId: pack.packId,
        designation: "A21 backfill fixture",
        shortTitle: "Recorded tuition backfill",
        summary: provenance.note,
        origin: "member-introduction",
        subjectClass: "appropriation",
        sponsorPersonId: null,
        originChamberKey: pack.chamberOrder[0]!,
        propositionIds: [fixture.propositionIds[TUITION_FREEZE_QUESTION]!],
        propositionAnswers: [
          {
            propositionId: fixture.propositionIds[TUITION_FREEZE_QUESTION]!,
            answer: "yes",
          },
        ],
      },
    );
    const fundingMeasureId = funded.history.legislativeMeasures!.at(-1)!.id;
    for (const [index, [key, text, amount]] of (
      [
        [
          "amount-provided",
          `There is appropriated ${gap} USD minor units to backfill the recorded tuition difference.`,
          gap,
        ],
        [
          "administrative-mandate",
          administrativeMandateText(TUITION_FREEZE_QUESTION),
          null,
        ],
        ["effective-date", PUBLIC_FUNDING_DEFAULT_DATE_TEXT, null],
        ["availability", fundingAvailabilityText(expiresAt), null],
      ] as const
    ).entries())
      funded = recordFiledProvision(funded, {
        stableKey: `a21:backfill:${key}`,
        measureId: fundingMeasureId,
        provisionKey: key,
        sectionNumber: index + 1,
        heading: key,
        text,
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "the recorded tuition difference",
        },
        applicationScope: {
          jurisdictionId: fixture.stateJurisdictionId,
          segmentKey: null,
        },
        fiscalExposureMinorUnits: amount,
        fiscalExposureLabel: amount === null ? null : `${gap} USD minor units`,
      });
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
          yea: bodies.find((body) => body.chamberKey === row.chamberKey)!
            .members.length,
        };
    }
    funded = enactThroughDesk(funded, fundingMeasureId, {
      context: {
        pack,
        measureId: fundingMeasureId,
        bodies,
        committeeMemberCount: 7,
        votePlan,
        governorAction: "signed",
        governorRationale: provenance.note,
      },
    });
    funded = recordWorldEvent(
      { ...funded, control: { kind: "person", personId: governor } },
      {
        stableKey: "a21:backfill-governor-control-handoff",
        type: "fixture.control-handoff",
        occurredAt: funded.currentDate,
        recordedAt: funded.currentDate,
        jurisdictionId: fixture.stateJurisdictionId,
        involvedEntityIds: [
          governor,
          fixture.personId,
          ...playerRequiredWorkIds(funded, governor),
        ],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary:
          "The actual governor releases player-required work before resident control resumes.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      },
    );
    funded = releasePlayerRequiredWork(funded, {
      personId: governor,
      stableKeyPrefix: "a21:backfill-governor-release",
      outcomeEventId: funded.history.events.at(-1)!.id,
    });
    funded = {
      ...funded,
      control: { kind: "person", personId: fixture.personId },
    };
    const enactment = funded.history.legislativeEnactments!.find(
      (row) => row.measureId === fundingMeasureId,
    )!;
    const availableAt = operativeDateInWorld(funded, enactment)!.date;
    const billingAt = addDays(availableAt, 1);
    if (funded.currentDate < billingAt)
      funded = advanceWorld(funded, daysBetween(funded.currentDate, billingAt));
    funded = ensurePublicGovernmentAccount(funded, {
      kind: "jurisdiction",
      jurisdictionId: fixture.stateJurisdictionId,
    });
    const account = publicTaxAccountForJurisdiction(
      funded,
      fixture.stateJurisdictionId,
    )!;
    const adopted = recordAdoptedAppropriation(funded, {
      familyKey: "program",
      jurisdictionId: fixture.stateJurisdictionId,
      programKey: TUITION_FREEZE_QUESTION,
      amountMinorUnits: gap,
      adoptedOn: availableAt,
      availableThrough: expiresAt,
      edition: "a21:actual-backfill",
      basisNote: provenance.note,
      sourceMeasureId: fundingMeasureId,
    })!;
    expect(adopted).not.toBeNull();
    funded = adopted.world;
    funded = createResourcePosition(
      { ...funded, control: { kind: "person", personId: fixture.personId } },
      {
        stableKey: "a21:backfill-donor-cash",
        owner: { kind: "person", personId: fixture.personId },
        openedAt: funded.currentDate,
        openingBalance: money(cap + gap, "USD"),
        provenance,
      },
    );
    funded = createResourcePosition(funded, {
      stableKey: "a21:backfill-school-books",
      owner: { kind: "organization", organizationId: schoolId },
      openedAt: funded.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
    funded = createResourceFlow(funded, {
      stableKey: "a21:recorded-state-cash-funding",
      source: { kind: "person", personId: fixture.personId },
      recipient: {
        kind: "organization",
        organizationId: account.organizationId,
      },
      startsAt: funded.currentDate,
      amount: money(gap, "USD"),
      cadenceKind: "schedule:one-time",
      basisKind: "custom:fixture-state-funding",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: fixture.stateJurisdictionId,
      provenance,
    });
    const cashFlow = funded.history.resourceFlows.at(-1)!;
    funded = recordResourceTransferOutcome(funded, {
      stableKey: "a21:recorded-state-cash-received",
      resourceFlowId: cashFlow.id,
      periodStartsAt: funded.currentDate,
      periodEndsAt: funded.currentDate,
      occurredAt: funded.currentDate,
      status: "completed",
      attemptedAmount: money(gap, "USD"),
      transferredAmount: money(gap, "USD"),
      reasonKind: null,
      note: provenance.note,
      provenance,
    });
    funded = recordResourceFlowTerms(funded, {
      stableKey: "a21:backfilled-tuition-revision",
      resourceFlowId: baselineFlowId,
      effectiveAt: funded.currentDate,
      status: "active",
      amount: money(revised, "USD"),
      cadenceKind: "schedule:one-time",
      reason: provenance.note,
      provenance,
      supersedesTermsId: resourceFlowTermsAt(funded, baselineFlowId)!.id,
    });
    const before = resourcePositionAt(
      funded,
      { kind: "organization", organizationId: account.organizationId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    const enrolledAt = funded.history.educationEnrollments.find(
      (row) => row.id === enrollmentId,
    )!.startedAt;
    const dueAt = studyPeriodDueDate(enrolledAt, path, 1);
    if (funded.currentDate < dueAt)
      funded = advanceWorld(funded, daysBetween(funded.currentDate, dueAt));
    const charged = completeStudyPeriod(funded, enrollmentId, path);
    expect(
      resourceFlowTermsAt(charged, baselineFlowId)!.amount.minorUnits,
    ).toBe(cap);
    const payments = charged.history.resourceFlows.filter(
      (flow) =>
        flow.basisReference.kind === "public-funding" &&
        flow.basisReference.mandate.programKey === TUITION_FREEZE_QUESTION,
    );
    expect(payments).toHaveLength(1);
    expect(
      budgetProgramFor(
        payments[0]!.basisReference.kind === "public-funding"
          ? payments[0]!.basisReference.mandate.programKey
          : "",
      ),
    ).toBe("higherEducation");
    expect(payments[0]!.recipient).toEqual({
      kind: "organization",
      organizationId: schoolId,
    });
    expect(
      resourceFlowTermsAt(charged, payments[0]!.id)!.amount.minorUnits,
    ).toBe(gap);
    expect(payments[0]!.basisReference).toMatchObject({
      kind: "public-funding",
      mandate: {
        appropriationId: adopted.appropriationId,
        provisionIds: currentMeasureProvisions(charged, fundingMeasureId)
          .map((row) => row.id)
          .sort(),
      },
    });
    expect(
      resourcePositionAt(
        charged,
        { kind: "organization", organizationId: account.organizationId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(before - gap);
    expect(
      resourcePositionAt(
        charged,
        { kind: "organization", organizationId: schoolId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(revised);
    expect(
      resourcePositionAt(
        charged,
        { kind: "person", personId: fixture.personId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(0);
    const saved = deserializeWorld(serializeWorld(charged));
    expect(settleTuitionFreezeBackfill(saved, baselineFlowId)).toBe(saved);
  });
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
    expect(cappedTerms.lawEffectStamps).toContainEqual(
      expect.objectContaining({
        questionKey: TUITION_FREEZE_QUESTION,
        effectKind: "price-cost",
      }),
    );
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
