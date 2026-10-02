import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  recordSchoolTuitionPriceRevision,
  schoolTuitionQuote,
  type SchoolTuitionInput,
} from "../education/tuition-prices";
import { createEducationEnrollment, createOrganization } from "./life";
import { lifePathDefinition } from "./life-paths2-catalog";
import { recordAcceptedEducationTerms } from "./education-study-terms";
import {
  completeStudyPeriod,
  studyPeriodDueDate,
  studyProgressSummary,
} from "./education-study-progression";
import {
  advanceWorld,
  advanceWithWorldIntegrityAtEnd,
  recordWorldEvent,
} from "./world";
import { daysBetween } from "./dates";
import { createResourcePosition, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  expandInstitution,
  type CompactInstitution,
  type EducationDictionary,
} from "../education/compact";
import {
  applyForEducation,
  respondToEducationOffer,
  pendingEducationOffers,
  ADMISSION_DECISION_DAYS,
} from "../education/study-provider";
import { acceptedEducationTerms } from "./education-study-terms";
import { observerSetup } from "../presentation/observer-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import schoolCalendar from "../../data/source/education/school-calendar-terms.json" with { type: "json" };

const source = JSON.parse(
  readFileSync("data/source/education-tuition/tuition-input.json", "utf8"),
) as SchoolTuitionInput;
const termsPerYear = 3;
const provenance = {
  kind: "authored" as const,
  note: "Controlled enrollment using a retained school quote.",
};

function quotedEnrollment() {
  const row = source.components.IC2023_AY!.rows.find(([institutionId]) => {
    const quoted = schoolTuitionQuote(source, {
      institutionId,
      artifactId: "IC2023_AY",
      field: "TUITION2",
    });
    return (
      quoted.status === "sourced" &&
      quoted.chargeUnit === "academic-year" &&
      quoted.amountMinor > 0 &&
      quoted.amountMinor % termsPerYear !== 0
    );
  })!;
  expect(row).toBeDefined();
  const selector = {
    institutionId: row[0],
    artifactId: "IC2023_AY",
    field: "TUITION2",
  };
  const quote = schoolTuitionQuote(source, selector);
  if (quote.status !== "sourced")
    throw new Error("Missing retained school quote");
  const place = drawRandomPlace("standby3-recorded-college-price");
  const fixture = smallWorld({
    seed: "standby3-recorded-college-price",
    place: place.key,
  });
  let world = createOrganization(fixture.world, {
    stableKey: "recorded-college-price:school",
    formedAt: fixture.world.currentDate,
    provenance,
    initialProfile: {
      name: quote.label,
      classification: "service:college",
      locationJurisdictionId: fixture.jurisdictionId,
    },
  });
  const schoolId = world.history.organizations.at(-1)!.id;
  world = recordSchoolTuitionPriceRevision(world, {
    stableKey: "recorded-college-price:quote",
    organizationId: schoolId,
    source,
    selector,
  });
  const priceRecordId = world.history.evidenceArtifacts.at(-1)!.id;
  const path = {
    ...lifePathDefinition("college-bachelors"),
    program: "postsecondary:edu-path7-level5" as const,
    periodsPerYear: termsPerYear,
    periodCostMinor: Math.floor(quote.amountMinor / termsPerYear),
  };
  world = createEducationEnrollment(world, {
    stableKey: "recorded-college-price:enrollment",
    personId: fixture.personId,
    organizationId: schoolId,
    startedAt: world.currentDate,
    programKind: path.program,
    contextKind: "program:recorded-school-quote",
    provenance,
  });
  const enrollmentId = world.history.educationEnrollments.at(-1)!.id;
  world = recordWorldEvent(world, {
    stableKey: "recorded-college-price:accepted",
    type: "education.offer-accepted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: fixture.jurisdictionId,
    involvedEntityIds: [fixture.personId, schoolId, enrollmentId],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["education"],
    summary: provenance.note,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = recordAcceptedEducationTerms(world, enrollmentId, {
    version: 1,
    institutionId: quote.institutionId,
    capabilityCode: "LEVEL5",
    sourceEvidence: quote.sourceRefs,
    path,
    tuitionBilling: {
      selector,
      priceRecordId,
      annualAmountMinor: quote.amountMinor,
      termsPerAcademicYear: termsPerYear,
    },
  });
  world = createResourcePosition(world, {
    stableKey: "recorded-college-price:student-cash",
    owner: { kind: "person", personId: fixture.personId },
    openedAt: world.currentDate,
    openingBalance: money(quote.amountMinor * path.academicYears!, "USD"),
    provenance,
  });
  return { world, path, enrollmentId, quote, personId: fixture.personId };
}

describe("recorded college tuition progression consumer", () => {
  it("uses the accepted school quote in an ordinary sampled new game and reload", () => {
    const manifest = JSON.parse(
      readFileSync("public/education/manifest.json", "utf8"),
    ) as { chunks: { kind: string; path: string }[] };
    const directory = JSON.parse(
      readFileSync(
        "public/education/" +
          manifest.chunks.find((entry) => entry.kind === "postsecondary")!.path,
        "utf8",
      ),
    ) as { records: CompactInstitution[]; dictionary: EducationDictionary };
    const schools = directory.records
      .map((row) => expandInstitution(row, directory.dictionary))
      .filter((school) => {
        const count = (
          schoolCalendar.termsPerAcademicYear as Readonly<
            Record<string, number>
          >
        )[school.directorySource?.calendarSystem ?? ""];
        const quote = schoolTuitionQuote(source, {
          institutionId: school.id,
          artifactId: "IC2023_AY",
          field: "TUITION2",
        });
        return (
          school.directorySource?.primaryPublicControl === "2" &&
          school.capabilities.some(
            (capability) =>
              capability.code === "LEVEL5" && capability.state === "offered",
          ) &&
          count &&
          quote.status === "sourced" &&
          quote.chargeUnit === "academic-year" &&
          quote.amountMinor > 0 &&
          quote.amountMinor % count !== 0
        );
      });
    const seed = "standby3-ordinary-college-tuition-remainder";
    const place = drawRandomPlace(
      seed,
      (entry) =>
        entry.scope === "locality" &&
        schools.some(
          (school) => entry.stateJurisdictionKey === "US-" + school.state,
        ),
    );
    const school = schools.find(
      (entry) => place.stateJurisdictionKey === "US-" + entry.state,
    )!;
    const opened = generateOpeningLife(
      prepareOpeningLife({
        ...observerSetup(seed, place.key),
        questionnaire: "skipped",
      }),
    ).game!;
    expect(opened).not.toBeNull();
    const applied = applyForEducation(opened.world, school, "LEVEL5");
    expect(applied.ok).toBe(true);
    const offered = advanceWithWorldIntegrityAtEnd(
      () => advanceWorld(applied.world, ADMISSION_DECISION_DAYS),
      applied.world,
    );
    const accepted = respondToEducationOffer(
      offered,
      pendingEducationOffers(offered)[0]!.id,
      true,
    );
    expect(accepted.ok).toBe(true);
    const enrollmentId = accepted.world.history.educationEnrollments.at(-1)!.id;
    const terms = acceptedEducationTerms(accepted.world, enrollmentId)!;
    const billing = terms.tuitionBilling!;
    const summary = studyProgressSummary(
      accepted.world,
      enrollmentId,
      terms.path,
    );
    expect(summary.totalCostMinor).toBe(
      billing.annualAmountMinor * terms.path.academicYears!,
    );
    expect(summary.totalCostMinor).not.toBe(
      terms.path.periodCostMinor! * summary.total,
    );
    expect(
      studyProgressSummary(
        deserializeWorld(serializeWorld(accepted.world)),
        enrollmentId,
        terms.path,
      ),
    ).toEqual(summary);
    process.stdout.write(
      JSON.stringify({
        receipt: "S3 ordinary recorded tuition summary",
        seed,
        placeKey: place.key,
        schoolId: school.id,
        annualMinor: billing.annualAmountMinor,
        periodsPerYear: billing.termsPerAcademicYear,
        regularMinor: summary.periodCostMinor,
        totalMinor: summary.totalCostMinor,
        discardedRemainderMinor:
          summary.totalCostMinor - terms.path.periodCostMinor! * summary.total,
        date: accepted.world.currentDate,
      }) + "\n",
    );
  });

  it("includes the annual remainder instead of multiplying the regular installment", () => {
    const { world, enrollmentId, path, quote } = quotedEnrollment();
    const before = serializeWorld(world);
    const summary = studyProgressSummary(world, enrollmentId, path);
    expect(summary.periodCostMinor).toBe(
      Math.floor(quote.amountMinor / termsPerYear),
    );
    expect(summary.totalCostMinor).toBe(
      quote.amountMinor * path.academicYears!,
    );
    expect(summary.totalCostMinor).not.toBe(
      path.periodCostMinor * summary.total,
    );
    expect(serializeWorld(world)).toBe(before);
    const restored = deserializeWorld(before);
    expect(studyProgressSummary(restored, enrollmentId, path)).toEqual(summary);
  });

  it("shows the final term remainder and preserves the actual recorded annual payment", () => {
    const fixture = quotedEnrollment();
    let world = fixture.world;
    const startedAt = world.currentDate;
    const initialCash = resourcePositionAt(
      world,
      { kind: "person", personId: fixture.personId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    world = advanceWorld(
      world,
      daysBetween(
        world.currentDate,
        studyPeriodDueDate(startedAt, fixture.path, 1),
      ),
    );
    world = completeStudyPeriod(world, fixture.enrollmentId, fixture.path);
    // The first completion schedules later terms on the existing ordinary clock.
    world = advanceWorld(
      world,
      daysBetween(
        world.currentDate,
        studyPeriodDueDate(startedAt, fixture.path, 2),
      ),
    );
    const summary = studyProgressSummary(
      world,
      fixture.enrollmentId,
      fixture.path,
    );
    expect(summary.completed).toBe(2);
    expect(summary.periodCostMinor).toBe(
      fixture.quote.amountMinor -
        Math.floor(fixture.quote.amountMinor / termsPerYear) *
          (termsPerYear - 1),
    );
    world = advanceWorld(
      world,
      daysBetween(
        world.currentDate,
        studyPeriodDueDate(startedAt, fixture.path, 3),
      ),
    );
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: fixture.personId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(initialCash - fixture.quote.amountMinor);
    const restored = deserializeWorld(serializeWorld(world));
    expect(
      studyProgressSummary(restored, fixture.enrollmentId, fixture.path),
    ).toEqual(studyProgressSummary(world, fixture.enrollmentId, fixture.path));
  });
});
