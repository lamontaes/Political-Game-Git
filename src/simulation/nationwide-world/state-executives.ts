import { applyCharacterHistoryPlan } from "../character-history";
import type { CharacterHistoryTransition } from "../character-history";
import { makeIsoDate } from "../dates";
import { executiveRulePackForJurisdiction } from "../executive-authority-rule-packs";
import { activeElectedExecutiveTermEvidence } from "../executive-work-context";
import { createStableId } from "../ids";
import { lifePlaceByJurisdictionId } from "../life-places";
import { drawCanonicalName, personName } from "../people";
import { SeededRng } from "../rng";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  admittedRuleField,
  resolveNationwideRuleCapability,
  unadmittedRuleFields,
} from "./rule-capability-port";
import type { RuleFieldKey } from "./rule-capability-port";
import {
  regularTermWindowOn,
  stateExecutiveTermRule,
} from "./state-executive-term-rules";
import {
  CHIEF_EXECUTIVE_JURISDICTIONS,
  STATE_GOVERNMENT_STRUCTURE_SOURCE,
  stateExecutiveIdentity,
} from "./state-executive-candidacy-packs";
import {
  DISTRICT_OF_COLUMBIA_STRUCTURE_SOURCE,
  isDistrictOfColumbia,
} from "./district-of-columbia";
import { chiefExecutiveJurisdiction } from "./government-jurisdiction";

export const STATE_EXECUTIVE_WRITER_VERSION = "nationwide-state-executive-v1";

/** Every term fact the incumbent writer and reader need from RULES. */
export const STATE_EXECUTIVE_TERM_FIELDS: readonly RuleFieldKey[] = [
  "term.years",
  "term.start",
];

export interface StateExecutiveOffice {
  readonly stateUsps: string;
  readonly jurisdictionKey: string;
  readonly jurisdictionId: EntityId;
  /** The accepted pack's own key where one exists; otherwise `us-xx-governor`. */
  readonly officeKey: string;
  /** Equal to the civic office display name the News reader matches. */
  readonly displayName: string;
  /** The same stable key an ordinary elected term's office body uses. */
  readonly organizationStableKey: string;
  readonly authorityPackId: string | null;
  readonly sources: readonly string[];
}

export function stateExecutiveOffice(
  stateUsps: string,
): StateExecutiveOffice | null {
  const identity = stateExecutiveIdentity(stateUsps);
  if (!identity) return null;
  const jurisdiction = chiefExecutiveJurisdiction(identity.stateUsps);
  if (!jurisdiction) return null;
  const pack = identity.executivePackId
    ? executiveRulePackForJurisdiction(identity.jurisdictionKey)
    : null;
  return {
    stateUsps: identity.stateUsps,
    jurisdictionKey: identity.jurisdictionKey,
    jurisdictionId: jurisdiction.id,
    officeKey: identity.officeKey,
    displayName: identity.displayName,
    organizationStableKey: identity.executivePackId
      ? `executive-office:${identity.executivePackId}`
      : `executive-office:${identity.officeKey}`,
    authorityPackId: identity.executivePackId,
    sources: [
      isDistrictOfColumbia(identity.stateUsps)
        ? DISTRICT_OF_COLUMBIA_STRUCTURE_SOURCE
        : STATE_GOVERNMENT_STRUCTURE_SOURCE,
      ...(pack?.office.source.sourceUrl ? [pack.office.source.sourceUrl] : []),
    ],
  };
}

/** The state a person's home belongs to, from the place identity, never a name. */
export function homeStateUsps(world: World, personId: EntityId): string | null {
  const person = world.people[personId];
  if (!person) return null;
  const key = lifePlaceByJurisdictionId(
    person.homeJurisdictionId,
  )?.stateJurisdictionKey;
  return key && /^US-[A-Z]{2}$/.test(key) ? key.slice(3) : null;
}

export interface StateExecutiveTermWindow {
  readonly startsAt: IsoDate | null;
  readonly endExclusive: IsoDate | null;
  readonly ruleVersion: string | null;
  readonly unknownFields: readonly RuleFieldKey[];
}

/** A whole positive number of years, or null. */
function wholeYears(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
    ? value
    : null;
}

/**
 * The term in progress on a date, derived only from admitted RULES values
 * (rules-capability/v1): `term.years` is the length of one term and
 * `term.start` is `{ kind: "reference-start", referenceStart, cycleYears }`,
 * one lawful commencement of the office and how often commencement recurs.
 * `{ kind: "january-first-following-election" }` dates a term only from a
 * recorded election, which an opening incumbent does not have, so it stays
 * unknown here. Any other shape or unadmitted field leaves the window unknown;
 * a cycle is never borrowed from another state.
 */
export function stateExecutiveTermWindow(
  office: StateExecutiveOffice,
  onDate: IsoDate,
  options: { readonly gameCalendar?: boolean } = {},
): StateExecutiveTermWindow {
  const resolution = resolveNationwideRuleCapability({
    scope: { kind: "state", stateUsps: office.stateUsps },
    officeKey: office.officeKey,
    action: "inspect",
    onDate,
    fields: STATE_EXECUTIVE_TERM_FIELDS,
  });
  const unknownFields = unadmittedRuleFields(resolution);
  if (unknownFields.length > 0) {
    // No admitted law: the office runs on its verified or disclosed game
    // calendar (state-executive-term-rules). Saves that already recorded an
    // unknown-start tenure keep it; only new tenures are dated this way.
    const rule =
      options.gameCalendar === false
        ? null
        : stateExecutiveTermRule(office.stateUsps);
    if (rule) {
      const window = regularTermWindowOn(rule, onDate);
      return {
        startsAt: window.startsAt,
        endExclusive: window.endsAt,
        ruleVersion: rule.ruleVersion,
        unknownFields: [],
      };
    }
  }
  const years = admittedRuleField(resolution, "term.years");
  const start = admittedRuleField(resolution, "term.start");
  const duration = wholeYears(years?.value);
  const shape =
    start?.value !== null && typeof start?.value === "object"
      ? (start.value as {
          kind?: unknown;
          referenceStart?: unknown;
          cycleYears?: unknown;
        })
      : null;
  const cycle = wholeYears(shape?.cycleYears);
  const reference = shape?.referenceStart;
  if (
    unknownFields.length > 0 ||
    duration === null ||
    shape?.kind !== "reference-start" ||
    cycle === null ||
    typeof reference !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reference)
  ) {
    return {
      startsAt: null,
      endExclusive: null,
      ruleVersion: null,
      unknownFields: unknownFields.length > 0 ? unknownFields : ["term.start"],
    };
  }
  const monthDay = reference.slice(4);
  const referenceYear = Number(reference.slice(0, 4));
  const onYear = Number(onDate.slice(0, 4));
  let startYear =
    referenceYear + Math.floor((onYear - referenceYear) / cycle) * cycle;
  if (`${startYear}${monthDay}` > onDate) startYear -= cycle;
  return {
    startsAt: makeIsoDate(`${startYear}${monthDay}`),
    endExclusive: makeIsoDate(`${startYear + duration}${monthDay}`),
    ruleVersion: `${years!.ruleVersion}+${start!.ruleVersion}`,
    unknownFields: [],
  };
}

function tenureKeyPrefix(office: StateExecutiveOffice): string {
  return `${STATE_EXECUTIVE_WRITER_VERSION}:${office.officeKey}:tenure:`;
}

/**
 * Registers a state's existing jurisdiction identity in this save, once. A
 * statewide contest and the state's executive office are run from it; the
 * resident's own place is never moved or given state capabilities.
 */
export function ensureStateJurisdiction(
  world: World,
  stateUsps: string,
): World {
  const office = stateExecutiveOffice(stateUsps);
  return office ? registerStateJurisdiction(world, office) : world;
}

function registerStateJurisdiction(
  world: World,
  office: StateExecutiveOffice,
): World {
  if (world.jurisdictions[office.jurisdictionId]) return world;
  const jurisdiction = chiefExecutiveJurisdiction(office.stateUsps)!;
  return {
    ...world,
    jurisdictions: { ...world.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction.id],
  };
}

/**
 * Establishes the fictional governor a state's World opens with, exactly once.
 *
 * Canonical and lazy: the opening writer calls this for the player's own
 * state; any other producer that needs another state's executive calls the
 * same function. The first call writes a context person, the office body
 * and one public tenure record; every later call, reopen or navigation finds
 * that record by its stable key and returns the World unchanged. When RULES
 * later admits term facts, a save that already recorded an unknown-start
 * tenure keeps it rather than being reinterpreted.
 *
 * The person is a character. Nothing here claims how the real office is
 * filled, how long its term is, or that an election took place.
 */
export function ensureStateExecutiveIncumbent(
  world: World,
  subjectPersonId: EntityId,
  stateUsps: string,
  /**
   * `datedTerms: false` keeps an opening tenure undated, as worlds built
   * before the game calendar existed recorded it. A replay of one of those
   * descriptors has to rebuild exactly what it built then, so the caller that
   * knows it is replaying says so; ordinary new games date the term.
   */
  options: { readonly datedTerms?: boolean } = {},
): World {
  const office = stateExecutiveOffice(stateUsps);
  if (!office) return world;
  if (!world.people[subjectPersonId]) {
    throw new Error("A state executive needs an existing subject person.");
  }
  const prefix = tenureKeyPrefix(office);
  if (world.history.events.some((event) => event.stableKey.startsWith(prefix)))
    return world;

  const window = stateExecutiveTermWindow(office, world.currentDate, {
    gameCalendar: options.datedTerms !== false,
  });
  const tenureKey = `${prefix}${window.startsAt ?? `recorded-${world.currentDate}`}`;
  const holderKey = `${tenureKey}:holder`;
  let next = registerStateJurisdiction(world, office);
  const rng = new SeededRng(world.seed).fork(holderKey);
  const anchorYear = Number((window.startsAt ?? world.currentDate).slice(0, 4));
  const provenance = {
    kind: "generated" as const,
    generatorKey: STATE_EXECUTIVE_WRITER_VERSION,
  };
  const organizationExists = next.history.organizations.some(
    (organization) => organization.stableKey === office.organizationStableKey,
  );
  const transitions: CharacterHistoryTransition[] = [
    {
      kind: "context-person",
      input: {
        stableKey: holderKey,
        ...drawCanonicalName(rng),
        birthDate: makeIsoDate(`${anchorYear - rng.integer(45, 70)}-01-01`),
        homeJurisdictionId: office.jurisdictionId,
      },
    },
    ...(organizationExists
      ? []
      : [
          {
            kind: "organization" as const,
            input: {
              stableKey: office.organizationStableKey,
              formedAt: window.startsAt ?? world.currentDate,
              provenance,
              initialProfile: {
                name: office.displayName,
                // The classification the executive office reader matches.
                classification: `service:${office.officeKey}` as const,
                locationJurisdictionId: office.jurisdictionId,
              },
            },
          },
        ]),
  ];
  next = applyCharacterHistoryPlan(next, {
    stableKey: tenureKey,
    mode: "quick-generated",
    personId: subjectPersonId,
    transitions,
  }).world;
  const holderId = createStableId(
    "person",
    `${next.id}:life-context-v1:${holderKey}`,
  );
  const organizationId = next.history.organizations.find(
    (organization) => organization.stableKey === office.organizationStableKey,
  )!.id;
  return recordWorldEvent(next, {
    stableKey: tenureKey,
    type: "world.office-tenure",
    occurredAt: window.startsAt ?? world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [holderId, organizationId],
    participants: [
      { personId: holderId, role: "focus:subject", detail: office.displayName },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_EXECUTIVE_WRITER_VERSION,
      `office:${office.officeKey}`,
      `state:${office.stateUsps}`,
      "provenance:fictional-initial-tenure",
      ...(window.startsAt === null
        ? ["term-start:unknown"]
        : [`term-rule:${window.ruleVersion}`]),
      ...(window.endExclusive === null
        ? []
        : [`term-end:${window.endExclusive}`]),
    ],
    summary: `${personName(next.people[holderId]!)} holds the office of ${office.displayName} in this fictional world.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export interface StateExecutiveHolderRecord {
  readonly officeKey: string;
  readonly title: string;
  readonly stateUsps: string;
  readonly personId: EntityId;
  readonly personName: string;
  readonly termId: EntityId;
  readonly organizationId: EntityId;
  readonly startedAt: IsoDate | null;
  readonly endExclusive: IsoDate | null;
  readonly termFactsUnknown: readonly RuleFieldKey[];
  readonly origin: "fictional-initial-tenure" | "elected-term";
  readonly identityProvenance: "fictional-simulation";
  readonly sources: readonly string[];
}

/**
 * Who holds each materialized state executive office today. An elected term
 * that has actually entered replaces the opening tenure; a fictional tenure
 * whose recorded term has ended is history, not a present holder. An office
 * the World never materialized is absent here, which is not a vacancy.
 */
/**
 * The office-consequence record that vacates an office, named here so the
 * holder reader can honour a resignation without importing the governing
 * writer that produces one.
 */
export const OFFICE_CONSEQUENCE_EVENT_TYPE = "governing.office-consequence";
export const OFFICE_TERM_CLOSED_TAG = "term-closed:";

/** The date this office was given up, when a resignation is on record. */
export function stateExecutiveVacatedOn(
  world: World,
  officeKey: string,
): IsoDate | null {
  for (const event of world.history.events) {
    if (
      event.type !== OFFICE_CONSEQUENCE_EVENT_TYPE ||
      !event.tags.includes(`office:${officeKey}`)
    )
      continue;
    const closed = event.tags.find((tag) =>
      tag.startsWith(OFFICE_TERM_CLOSED_TAG),
    );
    const effectiveAt = closed?.split(":").at(-1);
    if (effectiveAt && effectiveAt <= world.currentDate)
      return makeIsoDate(effectiveAt);
  }
  return null;
}

export function currentStateExecutiveHolders(
  world: World,
): readonly StateExecutiveHolderRecord[] {
  const records: StateExecutiveHolderRecord[] = [];
  for (const stateUsps of CHIEF_EXECUTIVE_JURISDICTIONS) {
    const office = stateExecutiveOffice(stateUsps);
    if (!office) continue;
    const organization = world.history.organizations.find(
      (candidate) => candidate.stableKey === office.organizationStableKey,
    );
    if (!organization) continue;
    if (stateExecutiveVacatedOn(world, office.officeKey)) continue;
    const elected = world.history.workRelationships
      .filter(
        (relationship) =>
          relationship.organizationId === organization.id &&
          relationship.kind === "employment:executive-office",
      )
      .map((relationship) =>
        activeElectedExecutiveTermEvidence(world, relationship.id),
      )
      .find((evidence) => evidence !== null);
    if (elected) {
      const person = world.people[elected.relationship.personId];
      if (person) {
        records.push({
          officeKey: office.officeKey,
          title: office.displayName,
          stateUsps,
          personId: person.id,
          personName: personName(person),
          termId: elected.relationship.id,
          organizationId: organization.id,
          startedAt: elected.startsAt,
          endExclusive: elected.endsAt,
          termFactsUnknown: [],
          origin: "elected-term",
          identityProvenance: "fictional-simulation",
          sources: office.sources,
        });
        continue;
      }
    }
    const prefix = tenureKeyPrefix(office);
    const tenure = world.history.events.find(
      (event) =>
        event.type === "world.office-tenure" &&
        event.stableKey.startsWith(prefix) &&
        event.recordedAt <= world.currentDate,
    );
    if (!tenure) continue;
    const personId = tenure.participants.find(
      (participant) => participant.role === "focus:subject",
    )?.personId;
    const person = personId ? world.people[personId] : undefined;
    if (!person) continue;
    const unknownStart = tenure.tags.includes("term-start:unknown");
    const endTag = tenure.tags.find((tag) => tag.startsWith("term-end:"));
    const endExclusive = endTag
      ? makeIsoDate(endTag.slice("term-end:".length))
      : null;
    if (endExclusive !== null && world.currentDate >= endExclusive) continue;
    if (
      world.history.personDeaths.some(
        (death) =>
          death.personId === person.id && death.diedAt <= world.currentDate,
      )
    )
      continue;
    records.push({
      officeKey: office.officeKey,
      title: office.displayName,
      stateUsps,
      personId: person.id,
      personName: personName(person),
      termId: tenure.id,
      organizationId: organization.id,
      startedAt: unknownStart ? null : tenure.occurredAt,
      endExclusive,
      termFactsUnknown: unknownStart ? STATE_EXECUTIVE_TERM_FIELDS : [],
      origin: "fictional-initial-tenure",
      identityProvenance: "fictional-simulation",
      sources: office.sources,
    });
  }
  return records;
}
