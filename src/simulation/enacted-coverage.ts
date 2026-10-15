import type { ProgramParameterValue } from "./legislation-content-contracts";
import type {
  EnactedDutyCoverage,
  EnactedEligibilitySubject,
  OrganizationClassification,
} from "./types";

/**
 * Who an enacted duty or who-qualifies section reaches, for each variant the
 * bank can enact (spec 3 of "04 SYSTEM SPECS").
 *
 * A rule here names only what kind of coverage the Act sets and which classes
 * of body the world records for it. The words shown for whom it covers are
 * always the enacted section's own rendered text, because the player sets the
 * numbers in it (an income share, a customer count), and a stored constant
 * would contradict the law as passed. Where the Act's test turns on a fact no
 * record holds, the bodies in the class are candidates whose coverage is
 * unknown, never counted as covered.
 */

export const COVERAGE_RESEARCH_QUESTION = "law-clause-effects-by-family";

type Values = Readonly<Record<string, ProgramParameterValue>>;

export type CoverageRule =
  | {
      readonly kind: "classes";
      readonly subject: EnactedEligibilitySubject;
      readonly classes: (
        values: Values,
      ) => readonly OrganizationClassification[];
    }
  | {
      readonly kind: "unrecorded-test";
      readonly subject: EnactedEligibilitySubject;
      readonly classes: (
        values: Values,
      ) => readonly OrganizationClassification[];
      /** What the test turns on, with no number: the Act's text carries those. */
      readonly testLabel: string;
    }
  | {
      readonly kind: "conditional";
      readonly subject: EnactedEligibilitySubject;
      readonly conditionLabel: string;
    }
  | { readonly kind: "unknown"; readonly subject: EnactedEligibilitySubject };

const STATE_BODIES: readonly OrganizationClassification[] = [
  "service:state-agency",
  "sector:state-government-office",
];
const LOCAL_GOVERNMENTS: readonly OrganizationClassification[] = [
  "sector:local-government-office",
  "service:municipal-government",
];
/**
 * A town's "Electric and Water" utility operates a water system and
 * distributes electricity, so it falls within every choice of covered system.
 * An emergency communications operator is not a class the world records.
 */
const UTILITIES: readonly OrganizationClassification[] = ["enterprise:utility"];

const choice = (values: Values, key: string): string | null => {
  const value = values[key];
  return value?.kind === "enumerated" ? value.value : null;
};

const always =
  (classes: readonly OrganizationClassification[]) => (): typeof classes =>
    classes;

const conditional = (conditionLabel: string): CoverageRule => ({
  kind: "conditional",
  subject: "bodies",
  conditionLabel,
});
const unknown = (subject: EnactedEligibilitySubject): CoverageRule => ({
  kind: "unknown",
  subject,
});

export const COVERAGE_RULES: Readonly<Record<string, CoverageRule>> = {
  "public-workforce/classification-standard": {
    kind: "unrecorded-test",
    subject: "bodies",
    classes: (values) =>
      choice(values, "covered-bodies") === "state-and-local"
        ? [...STATE_BODIES, ...LOCAL_GOVERNMENTS]
        : STATE_BODIES,
    testLabel: "whether it employs people in classified posts",
  },
  "critical-infrastructure/continuity-planning-duty": {
    kind: "classes",
    subject: "bodies",
    classes: always(UTILITIES),
  },
  "critical-infrastructure/operator-assistance-fund": {
    kind: "classes",
    subject: "bodies",
    classes: always(UTILITIES),
  },
  "utility-resilience/restoration-standard": {
    kind: "unrecorded-test",
    subject: "bodies",
    classes: always(UTILITIES),
    testLabel: "its number of customers",
  },
  "utility-resilience/hardening-grants": {
    kind: "unrecorded-test",
    subject: "bodies",
    classes: always(UTILITIES),
    testLabel: "its number of customers",
  },
  "water-service-lines/inventory-and-plan": {
    kind: "unrecorded-test",
    subject: "bodies",
    classes: always(UTILITIES),
    testLabel: "its number of connections",
  },
  "water-service-lines/funded-replacement": {
    kind: "unrecorded-test",
    subject: "bodies",
    classes: always(UTILITIES),
    testLabel: "its number of connections and whether it has filed a plan",
  },
  "education-facilities/school-repair-authorization": {
    kind: "unrecorded-test",
    subject: "bodies",
    classes: always(["service:school"]),
    testLabel: "which public body operates it",
  },
  "education-facilities/school-condition-inventory": {
    kind: "unrecorded-test",
    subject: "bodies",
    classes: always(["service:school"]),
    testLabel: "which public body operates it",
  },
  "disaster-recovery/designated-area-grants": conditional(
    "holds a designation for disaster assistance",
  ),
  "disaster-recovery/post-designation-waiver": conditional(
    "applies the waiver to a contract or permit",
  ),
  "health-service-capacity/service-change-referral-plan": conditional(
    "plans to withdraw a health service it operates",
  ),
  "environmental-monitoring/monitoring-gap-response": conditional(
    "records a gap in required environmental monitoring",
  ),
  "social-service-access/application-access-duty": conditional(
    "receives an application for public assistance",
  ),
  "veteran-transition-referrals/transition-referral-duty": conditional(
    "offers civilian transition assistance to a former service member",
  ),
  "procurement-disclosure/award-reasons-publication":
    conditional("awards a contract"),
  "procurement-disclosure/emergency-procurement-review": conditional(
    "invokes an emergency purchasing exception",
  ),
  "agricultural-conservation/conservation-practice-authorization": conditional(
    "proposes conservation work on farmland",
  ),
  // Who owns a hospital, clinic or nursing home is not on record, so which
  // are public bodies' facilities is unknown.
  "health-service-capacity/service-availability-publication": unknown("bodies"),
  "environmental-monitoring/monitoring-record-disclosure": unknown("bodies"),
  "transit-access/enrollment-fare-relief": unknown("people"),
  "transit-access/unserved-county-formula": unknown("places"),
  "bridge-maintenance/worst-first-condition": unknown("structures"),
  "bridge-maintenance/preventive-cycle": unknown("structures"),
  "broadband-access/unserved-buildout": unknown("places"),
  "broadband-access/adoption-support": unknown("households"),
  "assistance-eligibility/raise-income-limit": unknown("households"),
  "assistance-eligibility/add-household-category": unknown("households"),
  "assistance-eligibility/index-to-published-limit": unknown("households"),
};

/**
 * Variants whose who-qualifies sections say who reports, who audits or who is
 * exempt from a fee, not who qualifies for what the Act does. They stay
 * reported as parts nothing acts on until their own writers exist.
 */
export const NOT_ELIGIBILITY_VARIANTS: ReadonlySet<string> = new Set([
  "agency-reporting/annual-legislative-report",
  "agency-reporting/independent-audit",
  "agency-reporting/published-performance-measures",
  "service-charges/flat-permit-fee",
]);

/** The coverage an enacted section sets, with its own words for whom. */
export function resolveCoverage(
  variantKey: string,
  values: Values,
  coveredLabel: string,
): {
  readonly subject: EnactedEligibilitySubject;
  readonly coverage: EnactedDutyCoverage;
} {
  const rule = COVERAGE_RULES[variantKey] ?? unknown("bodies");
  switch (rule.kind) {
    case "classes":
      return {
        subject: rule.subject,
        coverage: {
          kind: "classes",
          classifications: rule.classes(values),
          coveredLabel,
        },
      };
    case "unrecorded-test":
      return {
        subject: rule.subject,
        coverage: {
          kind: "unrecorded-test",
          classifications: rule.classes(values),
          coveredLabel,
          testLabel: rule.testLabel,
          researchQuestionId: COVERAGE_RESEARCH_QUESTION,
        },
      };
    case "conditional":
      return {
        subject: rule.subject,
        coverage: {
          kind: "conditional",
          coveredLabel,
          conditionLabel: rule.conditionLabel,
          researchQuestionId: COVERAGE_RESEARCH_QUESTION,
        },
      };
    case "unknown":
      return {
        subject: rule.subject,
        coverage: {
          kind: "unknown",
          coveredLabel,
          researchQuestionId: COVERAGE_RESEARCH_QUESTION,
        },
      };
  }
}

/** A section that only states why the Act exists: it names no one and changes nothing. */
export function isPurposeSection(provisionKey: string): boolean {
  return provisionKey === "purpose" || provisionKey.endsWith(":purpose");
}
