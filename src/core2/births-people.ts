import { createStableId } from "./kernel/ids";
import { SeededRng } from "./kernel/rng";
import { drawCanonicalNamedIdentity } from "./person-names";
import { generatePersonIdentity } from "./gov-rules/person-identity";
import { OPENING_KIN } from "./opening-kin";
import {
  openingTemperaments,
  type TemperamentSubject,
} from "./opening-personality";
import type { CoreAPI, PersonInput, Source } from "./types";

export interface BirthKin {
  otherId: string;
  relation: string;
  inverse: string;
}

/** Reuse the P15 record vocabulary; existing relatives keep their identity and past. */
export function birthKin(
  api: CoreAPI,
  parents: readonly [string, string],
): BirthKin[] {
  const R = OPENING_KIN.relations;
  const rows = new Map<string, BirthKin>();
  for (const id of parents)
    rows.set(id, { otherId: id, relation: R.parent, inverse: R.child });
  for (const id of parents) {
    const parent = api.state.people.get(id)!;
    for (const fact of parent.pastFacts ?? []) {
      const otherId = fact.facts?.otherPersonId;
      if (!otherId || rows.has(otherId) || !api.state.people.has(otherId))
        continue;
      const kind = fact.kind.slice("family:".length);
      if (!fact.kind.startsWith("family:")) continue;
      if (kind === R.parent || kind === R.otherParent)
        rows.set(otherId, {
          otherId,
          relation: R.grandparent,
          inverse: R.grandchild,
        });
      else if (kind === R.child)
        rows.set(otherId, { otherId, relation: R.sibling, inverse: R.sibling });
      else if (kind === R.sibling)
        rows.set(otherId, {
          otherId,
          relation: R.auntUncle,
          inverse: R.nieceNephew,
        });
    }
  }
  return [...rows.values()];
}

/** A bounded ancestor walk reconstructs P15's ID-seeded genetic components. */
function temperamentSubjects(
  api: CoreAPI,
  parents: readonly string[],
): TemperamentSubject[] {
  const seen = new Set<string>(),
    subjects: TemperamentSubject[] = [];
  function visit(id: string): void {
    if (seen.has(id)) return;
    seen.add(id);
    const person = api.state.people.get(id);
    if (!person) return;
    const parentIds = (person.pastFacts ?? []).flatMap((fact) =>
      (fact.kind === `family:${OPENING_KIN.relations.parent}` ||
        fact.kind === `family:${OPENING_KIN.relations.otherParent}`) &&
      fact.facts?.otherPersonId
        ? [fact.facts.otherPersonId]
        : [],
    );
    for (const parent of parentIds) visit(parent);
    subjects.push({
      id,
      birthDate: person.birthDate,
      gender: person.looks?.gender,
      parents: parentIds,
    });
  }
  for (const id of parents) visit(id);
  return subjects;
}

export function buildNewborn(
  api: CoreAPI,
  pregnancyId: string,
  parents: readonly [string, string],
  source: Source,
) {
  const mother = api.state.people.get(parents[0])!;
  const id = createStableId(
    "person",
    `${api.state.seed}:${pregnancyId}:newborn`,
  );
  // Generation decides who the new person is; it never decides whether a birth occurs.
  const rng = new SeededRng(api.state.seed).fork(id);
  const identity = generatePersonIdentity(rng.fork("identity"));
  const name = drawCanonicalNamedIdentity(rng.fork("name"), identity);
  const kin = birthKin(api, parents);
  const traits = openingTemperaments(
    [
      ...temperamentSubjects(api, parents),
      { id, birthDate: api.state.date, gender: identity.gender, parents },
    ],
    { seed: api.state.seed, startedAt: api.state.date },
  ).get(id)!;
  const person: PersonInput = {
    id,
    givenName: name.givenName,
    familyName: mother.familyName,
    birthDate: api.state.date,
    placeId: mother.placeId,
    ...(mother.countyId ? { countyId: mother.countyId } : {}),
    householdId: mother.householdId,
    tier: "newborn",
    discretionaryEligibleV1: false,
    traits,
    sharedTraitSource: {
      ...source,
      tag: "ESTIMATED",
      estimatedFrom:
        "P15 ID-seeded inherited temperament; existing personality mapping stopgap applies to infancy.",
    },
    liquidMinor: api.parameter("zero"),
    livingCostDailyMinor: api.parameter("zero"),
    familyIds: kin.map((row) => row.otherId),
    knownIds: [],
    source,
    looks: { gender: identity.gender, pronouns: identity.pronouns },
    pastFacts: [
      {
        id: `${id}:birth`,
        date: api.state.date,
        kind: "person:birth",
        summary: "person:birth",
        source,
        facts: {
          pregnancyId,
          motherId: parents[0],
          otherParentId: parents[1],
          placeId: mother.placeId,
        },
      },
      ...kin.map((row) => ({
        id: `${id}:kin:${row.otherId}`,
        date: api.state.date,
        kind: `family:${row.relation}`,
        summary: row.relation,
        source,
        facts: { otherPersonId: row.otherId },
      })),
    ],
  };
  return { person, kin };
}
