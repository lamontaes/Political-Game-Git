import {
  ENACTED_DUTY_EVENT_PREFIX,
  enactedDutyRecordId,
  enactedDutyRecords,
} from "./enacted-duty-integrity";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  draftLineageComponents,
  draftParameterValues,
} from "./legislation-draft-lineage";
import {
  COVERAGE_RESEARCH_QUESTION,
  isPurposeSection,
  resolveCoverage,
} from "./enacted-coverage";
import { clauseLever } from "./legislation-levers";
import { programFamilies } from "./legislation-program-families";
import { currentMeasureProvisions } from "./legislative-politics";
import { organizationProfileAt, organizationsAt } from "./life-queries";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import type {
  EnactedDutyCoverage,
  EnactedDutyFindingRecord,
  EnactedDutyRecord,
  EnactedDutyRuleRecord,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeProvisionRecord,
  OrganizationProfileRecord,
  World,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

/**
 * The rule lever (spec 3 of "04 SYSTEM SPECS"): a section of an enacted law
 * that places a duty on a class of body becomes a duty record the world keeps,
 * and on the Act's own compliance date each body within its reach is found to
 * have met it or not.
 *
 * Who a duty covers comes from the Act's words and the bodies the world
 * records. Where the Act turns on a size the world does not record (a utility
 * serving 25,000 customers), each candidate body is recorded as coverage
 * unknown rather than assumed in or out. Where the Act reaches only a body that
 * first does something the world does not record yet (plans to withdraw a
 * health service), the duty stands with no body found within it.
 *
 * Worker presence does not establish fulfillment of a legal duty. Without a
 * qualifying saved filing, report or service receipt linked to the duty and
 * covered body, compliance remains unknown. The current record contract has
 * no admitted fulfillment join; it must not invent compliance or a breach.
 * No penalty is invented: the record carries the penalty the Act states,
 * or none.
 *
 * Not yet: a later Act that repeals or amends the section leaves the duty
 * recorded and still due; the repeal writer will close it.
 */

export const ENACTED_DUTY_VERSION = "enacted-duty/v1";
export const ENACTED_DUTY_COMPLIANCE = "enacted-duty:compliance";
export const ENACTED_DUTY_RESEARCH_QUESTION = COVERAGE_RESEARCH_QUESTION;

interface ClauseOrigin {
  readonly familyKey: string;
  readonly variantKey: string;
  readonly values: ReturnType<typeof draftParameterValues>;
  readonly componentKey: string | undefined;
  readonly lever: ReturnType<typeof clauseLever>;
}

/** The family, variant and lever behind each provision key the law was compiled from. */
export function clauseOrigins(
  world: World,
  measureId: EntityId,
): Map<string, ClauseOrigin> {
  const index = new Map<string, ClauseOrigin>();
  const families = programFamilies();
  for (const lineage of draftLineageComponents(world, measureId)) {
    const variant = families
      .find((row) => row.familyKey === lineage.familyKey)
      ?.variants.find((row) => row.variantKey === lineage.variantKey);
    if (!variant) continue;
    for (const clause of variant.clauses) {
      const key =
        lineage.componentKey === undefined
          ? clause.provisionKey
          : `${lineage.componentKey}:${clause.provisionKey}`;
      index.set(key, {
        familyKey: lineage.familyKey,
        variantKey: lineage.variantKey,
        values: draftParameterValues(lineage),
        componentKey: lineage.componentKey,
        lever: clauseLever(clause.dimension, variant.instrument),
      });
    }
  }
  return index;
}

/** Whom a section says it reaches, as rendered in the enacted text. */
export function beneficiaryLabel(
  provision: LegislativeProvisionRecord,
): string {
  return provision.beneficiary.kind === "general-application"
    ? provision.beneficiary.appliesToLabel
    : provision.beneficiary.beneficiaryLabel;
}

/** Whether a section of this measure is a rule the duty writer turns into a record. */
export function isDutyProvision(
  world: World,
  measureId: EntityId,
  provisionKey: string,
): boolean {
  return clauseOrigins(world, measureId).get(provisionKey)?.lever === "rule";
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function spokenDate(date: IsoDate): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function datesStated(section: LegislativeProvisionRecord): IsoDate[] {
  const dates: IsoDate[] = [];
  for (const match of section.text.matchAll(
    /not later than ([A-Z][a-z]+) (\d{1,2}), (\d{4})/g,
  )) {
    const month = MONTHS.indexOf(match[1]!);
    if (month >= 0)
      dates.push(
        `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2]!.padStart(2, "0")}` as IsoDate,
      );
  }
  return dates.sort();
}

/**
 * The compliance date the Act states for this duty: a date in the duty's own
 * section first, then one in a section that sets when a body must comply or
 * file. A reporting deadline elsewhere in the Act is not this duty's date.
 */
function statedComplianceDate(
  own: LegislativeProvisionRecord,
  sections: readonly LegislativeProvisionRecord[],
): IsoDate | null {
  const mine = datesStated(own);
  if (mine.length > 0) return mine.at(-1)!;
  const setters = sections
    .filter((section) => /\bshall (?:comply|file)\b/.test(section.text))
    .flatMap(datesStated)
    .sort();
  return setters.at(-1) ?? null;
}

/** The civil penalty or fine the Act states, as it states it; null when it states none. */
function statedPenalty(
  sections: readonly LegislativeProvisionRecord[],
): string | null {
  for (const section of sections) {
    const match =
      /(?:civil penalty|fine) of (not more than )?(\$[\d,]+(?: (?:per|for each|a) [a-z]+)?)/.exec(
        section.text,
      );
    if (match) return `a fine of ${match[1] ? "up to " : ""}${match[2]}`;
  }
  return null;
}

/**
 * The department the Act names to receive filings or act on them, as the Act
 * names it; null when it names none.
 */
function statedEnforcer(
  sections: readonly LegislativeProvisionRecord[],
): string | null {
  for (const section of sections) {
    const match =
      /\bthe (department(?: of [A-Za-z]+(?: and [A-Za-z]+)?)?)\b/.exec(
        section.text,
      );
    if (match) return `the ${match[1]}`;
  }
  return null;
}

type NewEnactedDutyRecord = EnactedDutyRecord extends infer R
  ? R extends EnactedDutyRecord
    ? Omit<R, "id" | "stableKey" | "sequence" | "recordedAt" | "eventId">
    : never
  : never;

/** Appends one record with its paired public event. */
export function writeDutyRecord(
  world: World,
  stableKey: string,
  input: {
    readonly jurisdictionId: EntityId;
    readonly involved: readonly EntityId[];
    readonly summary: string;
  },
  record: NewEnactedDutyRecord,
): { readonly world: World; readonly record: EnactedDutyRecord } {
  const withEvent = recordWorldEvent(world, {
    stableKey: `event:${stableKey}`,
    type: `${ENACTED_DUTY_EVENT_PREFIX}${record.kind}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [...new Set(input.involved)].sort(),
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["law", `law:${record.kind}`],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const full = {
    ...record,
    id: enactedDutyRecordId(withEvent, stableKey),
    stableKey,
    sequence: withEvent.history.nextSequence,
    recordedAt: withEvent.currentDate,
    eventId: withEvent.history.events.at(-1)!.id,
  } as EnactedDutyRecord;
  const next: World = {
    ...withEvent,
    history: {
      ...withEvent.history,
      nextSequence: withEvent.history.nextSequence + 1,
      enactedDutyRecords: [...enactedDutyRecords(withEvent), full],
    },
  };
  assertWorldIntegrity(next);
  return { world: next, record: full };
}

/**
 * Writes a duty record for each rule section of an enacted measure and brings
 * each due on the Act's compliance date. Idempotent: a section already
 * recorded is skipped. A measure that is not enacted writes nothing.
 */
export function applyEnactedDuties(world: World, measureId: EntityId): World {
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  if (!enactment || !measure) return world;
  const origins = clauseOrigins(world, measureId);
  const provisions = currentMeasureProvisions(world, measureId);
  const recorded = new Set(
    enactedDutyRecords(world).map((row) => row.stableKey),
  );
  let next = world;
  for (const provision of provisions) {
    const origin = origins.get(provision.provisionKey);
    if (origin?.lever !== "rule") continue;
    const stableKey = `${ENACTED_DUTY_VERSION}:${measureId}:${provision.provisionKey}`;
    if (recorded.has(stableKey)) continue;
    const siblings = provisions.filter(
      (row) =>
        origins.get(row.provisionKey)?.componentKey === origin.componentKey,
    );
    const operativeAt = enactment.effectiveAt ?? enactment.resolvedAt;
    const stated = statedComplianceDate(provision, siblings);
    const complyBy =
      stated !== null && stated > operativeAt ? stated : operativeAt;
    // Whom it binds, in the Act's own words: the section that says who is
    // subject to it, else the duty's own section.
    const scope = siblings.find(
      (row) =>
        origins.get(row.provisionKey)?.lever === "who-qualifies" &&
        !isPurposeSection(row.provisionKey),
    );
    const { coverage } = resolveCoverage(
      `${origin.familyKey}/${origin.variantKey}`,
      origin.values,
      beneficiaryLabel(scope ?? provision),
    );
    const written = writeDutyRecord(
      next,
      stableKey,
      {
        jurisdictionId: measure.jurisdictionId,
        involved: [measureId],
        summary: `${measure.designation} places a duty on ${coverage.coveredLabel}: ${provision.heading}.`,
      },
      {
        kind: "duty",
        measureId,
        provisionId: provision.id,
        provisionKey: provision.provisionKey,
        jurisdictionId: measure.jurisdictionId,
        heading: provision.heading,
        coverage,
        operativeAt,
        complyBy,
        enforcerLabel: statedEnforcer(siblings),
        penaltyLabel: statedPenalty(siblings),
      },
    );
    next = written.world;
    const duty = written.record as EnactedDutyRuleRecord;
    next =
      complyBy > next.currentDate
        ? scheduleFutureDueItem(next, {
            stableKey: `${stableKey}:compliance`,
            dueAt: complyBy,
            transitionKey: ENACTED_DUTY_COMPLIANCE,
            entityIds: [duty.eventId],
            jurisdictionId: measure.jurisdictionId,
            provenance: { kind: "simulated", sourceEntityIds: [duty.eventId] },
          })
        : settleEnactedDuty(next, duty.id);
  }
  return next;
}

/** The state a place belongs to, or the state it is; null for anywhere else. */
function stateOf(
  world: Pick<World, "jurisdictions">,
  jurisdictionId: EntityId,
): string | null {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return (
    (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null) ??
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ??
    null
  );
}

const FEDERAL_SLUGS = ["us-federal", "united-states", "us"];

/**
 * Whether a body's place is within the law's reach: its own place; for a law
 * of a state, D.C. or a territory, every place in it; for a federal law,
 * everywhere. Null when the body's place is not on record, which is unknown
 * and not outside. A county's law reaches only bodies placed on the county
 * itself, until places record the county they sit in.
 */
export function dutyReaches(
  world: Pick<World, "jurisdictions">,
  lawJurisdictionId: EntityId,
  bodyJurisdictionId: EntityId | null,
): boolean | null {
  if (bodyJurisdictionId === null) return null;
  if (bodyJurisdictionId === lawJurisdictionId) return true;
  const slug = world.jurisdictions[lawJurisdictionId]?.slug;
  if (slug !== undefined && FEDERAL_SLUGS.includes(slug)) return true;
  const lawState = world.jurisdictions[lawJurisdictionId]
    ? stateKeyForJurisdiction(world.jurisdictions[lawJurisdictionId]!)
    : null;
  return lawState !== null && stateOf(world, bodyJurisdictionId) === lawState;
}

/**
 * The bodies a coverage's classes name that are within the law's reach, or
 * whose place is not on record, as the world records them now.
 */
export function bodiesCovered(
  world: World,
  lawJurisdictionId: EntityId,
  coverage: EnactedDutyCoverage,
): readonly OrganizationProfileRecord[] {
  if (coverage.kind !== "classes" && coverage.kind !== "unrecorded-test")
    return [];
  const classes = new Set<string>(coverage.classifications);
  return organizationsAt(world).flatMap((organization) => {
    const profile = organizationProfileAt(world, organization.id);
    return profile &&
      classes.has(profile.classification) &&
      dutyReaches(world, lawJurisdictionId, profile.locationJurisdictionId) !==
        false
      ? [profile]
      : [];
  });
}

export function bodiesWithinDuty(
  world: World,
  duty: EnactedDutyRuleRecord,
): readonly OrganizationProfileRecord[] {
  return bodiesCovered(world, duty.jurisdictionId, duty.coverage);
}

/**
 * On the compliance date: a finding for each body within the duty's reach.
 * A body already found is not found again.
 */
export function settleEnactedDuty(world: World, dutyId: EntityId): World {
  const duty = enactedDutyRecords(world).find(
    (row): row is EnactedDutyRuleRecord =>
      row.kind === "duty" && row.id === dutyId,
  );
  if (!duty) return world;
  const found = new Set(
    enactedDutyRecords(world)
      .filter(
        (row): row is EnactedDutyFindingRecord =>
          row.kind === "finding" && row.dutyId === dutyId,
      )
      .map((row) => row.organizationId),
  );
  let next = world;
  for (const body of bodiesWithinDuty(world, duty)) {
    if (found.has(body.organizationId)) continue;
    const placed = body.locationJurisdictionId !== null;
    // No approved receipt-to-duty/provision/body join exists here yet.
    // Staffing, an appropriation or an unrelated report cannot establish
    // that this body performed this legal duty.
    const outcome: EnactedDutyFindingRecord["outcome"] =
      !placed || duty.coverage.kind === "unrecorded-test"
        ? "coverage-unknown"
        : "compliance-unknown";
    const reason = !placed
      ? `The record does not place ${body.name}, so the law’s coverage cannot be established.`
      : duty.coverage.kind === "unrecorded-test"
        ? `Whether the law reaches ${body.name} turns on ${duty.coverage.testLabel}, which the record does not establish.`
        : `No qualifying fulfillment record links ${body.name} to this duty by ${spokenDate(duty.complyBy)}, so compliance is not established.`;
    next = writeDutyRecord(
      next,
      `${duty.stableKey}:finding:${body.organizationId}`,
      {
        jurisdictionId: duty.jurisdictionId,
        involved: [duty.measureId, body.organizationId],
        summary: reason,
      },
      {
        kind: "finding",
        dutyId: duty.id,
        organizationId: body.organizationId,
        outcome,
        basis: "unknown",
        researchQuestionId: ENACTED_DUTY_RESEARCH_QUESTION,
        reason,
      },
    ).world;
  }
  return next;
}

export function enactedDutyComplianceHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const duty = enactedDutyRecords(world).find(
    (row): row is EnactedDutyRuleRecord =>
      row.kind === "duty" && due.entityIds.includes(row.eventId),
  );
  if (!duty)
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "No enacted duty matches.",
      outcomeEventId: null,
    };
  const next = settleEnactedDuty(world, duty.id);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "The duty fell due.",
    outcomeEventId: next === world ? null : next.history.events.at(-1)!.id,
  };
}

export function enactedDutyHandlers() {
  return [[ENACTED_DUTY_COMPLIANCE, enactedDutyComplianceHandler]] as const;
}

/** The duties one enacted measure placed, with what each covered body did. */
export function enactedDutiesOf(
  world: World,
  measureId: EntityId,
): readonly {
  readonly duty: EnactedDutyRuleRecord;
  readonly findings: readonly EnactedDutyFindingRecord[];
}[] {
  const records = enactedDutyRecords(world);
  return records
    .filter(
      (row): row is EnactedDutyRuleRecord =>
        row.kind === "duty" && row.measureId === measureId,
    )
    .map((duty) => ({
      duty,
      findings: records.filter(
        (row): row is EnactedDutyFindingRecord =>
          row.kind === "finding" && row.dutyId === duty.id,
      ),
    }));
}
