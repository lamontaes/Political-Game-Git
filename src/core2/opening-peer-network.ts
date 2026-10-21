import contentJson from "./data/opening-peer-network.json" with { type: "json" };
import { makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import { PARAMETERS, parameter, type Parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreInput, PersonId, PersonInput, Source } from "./types";

type PriorFact = NonNullable<PersonInput["pastFacts"]>[number];

export interface OpeningPeerData {
  version: string;
  stopgapId: string;
  throughExclusive: string;
  peerGroupSizeParameter: string;
  contextKinds: readonly string[];
  requiredContextFields: readonly string[];
  optionalContextFields: readonly string[];
  /** P15: people whose contexts began on different dates still share one (coworkers). */
  groupAcrossDates?: boolean;
  /** P15: a context that began on the opening day counts (coworkers). */
  includesOpeningDay?: boolean;
  /** Context fields copied onto each generated acquaintance fact. */
  copiedContextFields: readonly string[];
  factKind: string;
  relationshipBasis: string;
  relationship: string;
  attendanceStatus: string;
  closenessStatus: string;
  recognitionStatus: string;
  factSummaryTemplate: string;
  sourceCitation: string;
  sourceEstimate: string;
  scopeGap: string;
  reports: { noContext: string; singleMember: string; filled: string };
}

export const DEFAULT_OPENING_PEER_DATA: OpeningPeerData = contentJson;

export interface OpeningPeerContact {
  id: string;
  date: string;
  contextKey: string;
  groupId: string;
  personIds: readonly [PersonId, PersonId];
  contextFactIds: readonly [string, string];
  acquaintanceFactIds: readonly [string, string];
  source: Source;
}

export interface OpeningPeerReport {
  personId: PersonId;
  status: "filled" | "unresolved";
  contextFactId?: string;
  groupId?: string;
  peerIds: readonly PersonId[];
  reason: string;
}

export interface OpeningPeerOptions {
  personIds: readonly PersonId[];
  data?: OpeningPeerData;
  parameters?: Readonly<Record<string, Parameter>>;
  /**
   * The two-level population: how many people the records hold in a context
   * (a school class, a workplace), so a person filled in alone joins the same
   * group they would in a fully built town. Defaults to the people present.
   */
  cohortSize?: (contextKey: string, present: number) => number;
  /** P15: reads a context fact's fields from another record (coworkers' jobs); defaults to the fact's own. */
  contextValues?: (
    person: PersonInput,
    fact: PriorFact,
  ) => Readonly<Record<string, string>> | undefined;
}

export interface OpeningPeerBuild {
  input: CoreInput;
  contacts: readonly OpeningPeerContact[];
  reports: readonly OpeningPeerReport[];
}

interface ContextMember {
  person: PersonInput;
  fact: PriorFact;
  values: Readonly<Record<string, string>>;
  contextKey: string;
}

function format(
  template: string,
  fields: Readonly<Record<string, string>>,
): string {
  return template.replace(
    /\{([^{}]+)\}/g,
    (token, key: string) => fields[key] ?? token,
  );
}

function fullName(
  person: Pick<PersonInput, "givenName" | "familyName">,
): string {
  return [person.givenName, person.familyName].join(" ");
}

function sameStrings(
  left: Readonly<Record<string, string>> | undefined,
  right: Readonly<Record<string, string>> | undefined,
): boolean {
  const leftKeys = Object.keys(left ?? {}).sort();
  const rightKeys = Object.keys(right ?? {}).sort();
  return (
    JSON.stringify(leftKeys) === JSON.stringify(rightKeys) &&
    leftKeys.every((key) => left?.[key] === right?.[key])
  );
}

function sameFact(left: PriorFact, right: PriorFact): boolean {
  return (
    left.id === right.id &&
    left.date === right.date &&
    left.kind === right.kind &&
    left.summary === right.summary &&
    left.source.tag === right.source.tag &&
    left.source.asOf === right.source.asOf &&
    left.source.citation === right.source.citation &&
    left.source.estimatedFrom === right.source.estimatedFrom &&
    sameStrings(left.facts, right.facts)
  );
}

/**
 * One-time fictional social-past producer. The seed assigns WHO shared a
 * generated peer group; it never selects behavior, friendship strength or acts.
 * No town-level co-location is treated as evidence that two people met.
 */
export function buildOpeningPeerContacts(
  input: CoreInput,
  options: OpeningPeerOptions,
): OpeningPeerBuild {
  const data = options.data ?? DEFAULT_OPENING_PEER_DATA;
  const p = (key: string) => parameter(key, options.parameters ?? PARAMETERS);
  const zero = p("zero");
  const one = p("one");
  const size = p(data.peerGroupSizeParameter);
  if (!Number.isSafeInteger(size) || size <= zero)
    throw new Error("Opening peer group size must be a positive safe integer.");
  const marker = stopgap(data.stopgapId);
  const opening = makeIsoDate(input.startedAt);
  const boundary = makeIsoDate(data.throughExclusive);
  const cutoff = opening < boundary ? opening : boundary;
  const people = new Map<PersonId, PersonInput>();
  for (const person of input.people) {
    if (people.has(person.id))
      throw new Error("Duplicate opening peer person.");
    people.set(person.id, person);
  }
  const requestedIds = [...new Set(options.personIds)].sort();
  for (const id of requestedIds)
    if (!people.has(id)) throw new Error("Opening peer anchor is absent.");

  // Choose the latest complete recorded context, without hunting older
  // contexts merely because they would produce a larger player circle.
  const memberById = new Map<PersonId, ContextMember>();
  const cohorts = new Map<string, ContextMember[]>();
  for (const person of input.people) {
    const birth = makeIsoDate(person.birthDate);
    let latest: ContextMember | undefined;
    for (const fact of person.pastFacts ?? []) {
      if (!data.contextKinds.includes(fact.kind)) continue;
      const date = makeIsoDate(fact.date);
      if (
        date < birth ||
        date > cutoff ||
        (date === cutoff && !data.includesOpeningDay)
      )
        continue;
      const values = options.contextValues
        ? options.contextValues(person, fact)
        : fact.facts;
      if (!values || data.requiredContextFields.some((field) => !values[field]))
        continue;
      const fields = [
        ...data.requiredContextFields,
        ...data.optionalContextFields,
      ].map((field) => [field, values[field] ?? ""]);
      const contextKey = JSON.stringify(
        data.groupAcrossDates ? [fact.kind, fields] : [fact.kind, date, fields],
      );
      const candidate = { person, fact, values, contextKey };
      if (
        !latest ||
        fact.date > latest.fact.date ||
        (fact.date === latest.fact.date && fact.id < latest.fact.id)
      )
        latest = candidate;
    }
    if (!latest) continue;
    memberById.set(person.id, latest);
    const cohort = cohorts.get(latest.contextKey) ?? [];
    cohort.push(latest);
    cohorts.set(latest.contextKey, cohort);
  }

  // All identity groups are stable independently of which group is expanded.
  // A partial last group is avoided by balanced partitioning; no filler IDs.
  // Each person's group comes from their own key and the cohort's size, never
  // from who else is present, so filling people in one at a time gives each
  // the same classmates and coworkers as building the whole town.
  const groupByPerson = new Map<PersonId, string>();
  const groups = new Map<string, ContextMember[]>();
  const groupMembers = new Map<string, number>();
  const digits = p("seedHashDigits");
  const radix = p("seedPlaceHashRadix");
  for (const [contextKey, cohort] of cohorts) {
    const cohortSize = options.cohortSize
      ? options.cohortSize(contextKey, cohort.length)
      : cohort.length;
    const groupCount = Math.max(one, Math.ceil(cohortSize / size));
    for (const member of cohort) {
      const rank = stableHash(
        JSON.stringify([
          input.seed,
          data.version,
          contextKey,
          member.person.id,
        ]),
      );
      const index =
        Number.parseInt(rank.slice(zero, digits), radix) % groupCount;
      const groupId = stableHash(
        JSON.stringify([input.seed, data.version, contextKey, index]),
      );
      groupByPerson.set(member.person.id, groupId);
      groupMembers.set(groupId, cohortSize / groupCount);
      const group = groups.get(groupId) ?? [];
      if (group.some((prior) => prior.contextKey !== contextKey))
        throw new Error(
          "Opening peer group identity collides across contexts.",
        );
      group.push(member);
      groups.set(groupId, group);
    }
  }
  const selectedGroups = new Set<string>();
  const reports: OpeningPeerReport[] = [];
  for (const personId of requestedIds) {
    const member = memberById.get(personId);
    const groupId = groupByPerson.get(personId);
    const group = groupId ? groups.get(groupId) : undefined;
    const peerIds =
      group
        ?.map((row) => row.person.id)
        .filter((id) => id !== personId)
        .sort() ?? [];
    if (groupId && peerIds.length > zero) selectedGroups.add(groupId);
    reports.push({
      personId,
      status: peerIds.length > zero ? "filled" : "unresolved",
      ...(member ? { contextFactId: member.fact.id } : {}),
      ...(groupId ? { groupId } : {}),
      peerIds,
      reason: !member
        ? data.reports.noContext
        : peerIds.length === zero
          ? data.reports.singleMember
          : data.reports.filled,
    });
  }

  const knownById = new Map<PersonId, Set<PersonId>>();
  const sourceById = new Map<
    PersonId,
    Record<
      PersonId,
      {
        sourceFactId: string;
        learnedAt: string;
      }
    >
  >();
  const addedById = new Map<PersonId, PriorFact[]>();
  const factsById = new Map<PersonId, Map<string, PriorFact>>();
  const contacts: OpeningPeerContact[] = [];
  const addFact = (person: PersonInput, fact: PriorFact): void => {
    let rows = factsById.get(person.id);
    if (!rows) {
      rows = new Map();
      for (const row of person.pastFacts ?? []) {
        const prior = rows.get(row.id);
        if (prior && !sameFact(prior, row))
          throw new Error("Contradictory opening peer prior fact ID.");
        rows.set(row.id, row);
      }
      factsById.set(person.id, rows);
    }
    const prior = rows.get(fact.id);
    if (prior) {
      if (!sameFact(prior, fact))
        throw new Error("Opening peer fact ID contradicts the recorded past.");
      return;
    }
    const added = addedById.get(person.id) ?? [];
    added.push(fact);
    addedById.set(person.id, added);
    rows.set(fact.id, fact);
  };
  for (const groupId of [...selectedGroups].sort()) {
    const group = groups
      .get(groupId)!
      .slice()
      .sort((left, right) => left.person.id.localeCompare(right.person.id));
    for (let leftIndex = zero; leftIndex < group.length; leftIndex += one) {
      for (
        let rightIndex = leftIndex + one;
        rightIndex < group.length;
        rightIndex += one
      ) {
        const left = group[leftIndex]!;
        const right = group[rightIndex]!;
        // Exact shared dated context, retained here for transparent provenance.
        const date =
          left.fact.date > right.fact.date ? left.fact.date : right.fact.date;
        const id = stableHash(
          JSON.stringify([
            input.seed,
            data.version,
            groupId,
            left.person.id,
            right.person.id,
          ]),
        );
        const leftFactId = [left.person.id, data.version, id].join(":");
        const rightFactId = [right.person.id, data.version, id].join(":");
        const source: Source = {
          tag: "ESTIMATED",
          asOf: opening,
          citation: data.sourceCitation,
          estimatedFrom: data.sourceEstimate,
        };
        const contact: OpeningPeerContact = {
          id,
          date,
          contextKey: left.contextKey,
          groupId,
          personIds: [left.person.id, right.person.id],
          contextFactIds: [left.fact.id, right.fact.id],
          acquaintanceFactIds: [leftFactId, rightFactId],
          source,
        };
        contacts.push(contact);
        for (const direction of [
          { self: left, other: right, factId: leftFactId },
          { self: right, other: left, factId: rightFactId },
        ]) {
          const known =
            knownById.get(direction.self.person.id) ??
            new Set(direction.self.person.knownIds);
          known.add(direction.other.person.id);
          knownById.set(direction.self.person.id, known);
          // Only this producer's newly introduced name receives a new source.
          // Existing household/contact provenance and prior generated sources
          // survive repeats through the PersonInput boundary.
          if (
            !direction.self.person.knownIds.includes(direction.other.person.id)
          ) {
            const sources = sourceById.get(direction.self.person.id) ?? {
              ...direction.self.person.knownIdSources,
            };
            const existing = sources[direction.other.person.id];
            const next = { sourceFactId: direction.factId, learnedAt: date };
            if (
              existing &&
              (existing.sourceFactId !== next.sourceFactId ||
                existing.learnedAt !== next.learnedAt)
            )
              throw new Error(
                "Opening peer name source contradicts an existing source.",
              );
            sources[direction.other.person.id] = next;
            sourceById.set(direction.self.person.id, sources);
          }
          addFact(direction.self.person, {
            id: direction.factId,
            date,
            kind: data.factKind,
            summary: format(data.factSummaryTemplate, {
              otherName: fullName(direction.other.person),
            }),
            source,
            facts: {
              otherPersonId: direction.other.person.id,
              contextFactId: direction.self.fact.id,
              otherContextFactId: direction.other.fact.id,
              contextKey: left.contextKey,
              peerGroupId: groupId,
              peerGroupMembers: groupMembers.get(groupId)!.toFixed(p("two")),
              contactId: id,
              relationshipBasis: data.relationshipBasis,
              relationship: data.relationship,
              historicalAttendance: data.attendanceStatus,
              currentCloseness: data.closenessStatus,
              recognition: data.recognitionStatus,
              ...Object.fromEntries(
                data.copiedContextFields.map((field) => [
                  field,
                  direction.self.values[field]!,
                ]),
              ),
              stopgapId: marker.id,
            },
          });
        }
      }
    }
  }
  const gaps = new Set(input.gaps);
  if (requestedIds.length > zero) gaps.add(data.scopeGap);
  return {
    input: {
      ...input,
      people: input.people.map((person) => {
        const known = knownById.get(person.id);
        const added = addedById.get(person.id);
        if (!known && !added) return person;
        return {
          ...person,
          knownIds: known ? [...known] : person.knownIds,
          ...(sourceById.has(person.id)
            ? { knownIdSources: sourceById.get(person.id)! }
            : {}),
          ...(added?.length
            ? { pastFacts: [...(person.pastFacts ?? []), ...added] }
            : {}),
        };
      }),
      gaps: [...gaps],
    },
    contacts,
    reports,
  };
}

/**
 * How strongly a school peer's name is still recalled: flat through the near
 * window after the school context, then falling smoothly (exponentially, fit
 * through the near and far points) with the years since. A strength, never a
 * chance per person.
 */
export function peerNameRecall(
  cohortYear: number,
  date: string,
  registry: Readonly<Record<string, Parameter>> = PARAMETERS,
): number {
  const par = (key: string) => parameter(key, registry);
  const years = Math.max(0, Number(date.slice(0, 4)) - cohortYear);
  const nearYears = par("peerNameRecallNearYears");
  const near = par("peerNameRecallNearStrength");
  if (years <= nearYears) return near;
  const rate =
    Math.log(near / par("peerNameRecallFarStrength")) /
    (par("peerNameRecallFarYears") - nearYears);
  return near * Math.exp(-rate * (years - nearYears));
}
