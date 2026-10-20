import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { drivesReport } from "../core2/modules/drives";
import { reachOn } from "../core2/law-reach/host";
import { coreAPI, personOrFillIn } from "../core2/state";
import { currentCloseness } from "../core2/closeness";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { PAST_MODULE_ID } from "../core2/past-module";
import { publicKnowledgeOf } from "../core2/past-public";
import type { CoreState } from "../core2/types";
import { relationWord, schoolsOf } from "./words";
import { scenePlace, stagePeople } from "./scene";
import {
  BALANCED_TRAIT,
  PEOPLE_TRAITS,
  TRAIT_SHAPES,
  PEOPLE_MIND_VERSION,
} from "../core2/people-trait-definitions";
import { VIEWS_MODULE_ID, viewOf } from "../core2/modules/views";

// Engineering page size for the card's closest people, not a model value.
const CLOSEST = 8;

/** A person card: who they are, from their records only. */
export function personCard(core: CoreState, personId: string) {
  // A counted resident is filled in the moment they are clicked, from the
  // world's records, so the card is the same person every time.
  const person = personOrFillIn(core, personId);
  if (!person) throw new Error("Resident does not exist in core records.");
  const name = (id: string) => {
    const row = core.people.get(id);
    return row ? `${row.givenName} ${row.familyName}` : id;
  };
  const relationOf = new Map<string, string>();
  for (const fact of person.pastFacts ?? [])
    if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
      relationOf.set(fact.facts.otherPersonId, fact.kind.slice(7));
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  const household = core.households.get(person.householdId);
  const ties = [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => core.relationships.get(id))
    .filter((row) => row !== undefined)
    .map((row) => {
      const otherId = row.actorId === personId ? row.otherId : row.actorId;
      return {
        personId: otherId,
        name: name(otherId),
        kind: row.kind,
        relation: relationWord(core, otherId, relationOf.get(otherId)),
        level: currentCloseness(core, row),
        lastContactDate: row.lastContactDate,
        recordId: row.id,
        // Why the tie last changed, from its own record.
        latestChange: row.latestChange && {
          date: row.latestChange.date,
          cause: row.latestChange.reason?.cause ?? row.latestChange.cause,
          before: row.latestChange.before.level,
          after: row.latestChange.after.level,
        },
      };
    })
    .sort((a, b) => b.level - a.level)
    .slice(0, CLOSEST);
  const drives = drivesReport(core)
    .drives.filter((row) => row.personId === personId)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      topic: row.topic,
      desiredChange: row.desiredChange,
      target: row.targetId ? name(row.targetId) : null,
      formedAt: row.formedAt,
      anchorStrength: row.anchorStrength,
      actCount: row.actCount,
      sourceEventId: row.sourceEventId,
    }));
  return {
    id: person.id,
    name: name(person.id),
    birthDate: person.birthDate,
    age: ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)),
    alive: person.alive,
    home: household && {
      householdId: household.id,
      members: household.memberIds
        .filter((id) => id !== personId)
        .map((id) => ({
          personId: id,
          name: name(id),
          relation: relationWord(core, id, relationOf.get(id)),
          alive: core.people.get(id)?.alive ?? true,
        })),
    },
    job: job && {
      jobId: job.id,
      title: job.title,
      employer: employer?.name,
      wageDailyMinor: job.wageDailyMinor,
      hoursDaily: job.hoursDaily,
    },
    liquidMinor: person.liquidMinor,
    // The household's home, from OPUS-WORLD's housing records.
    dwelling: core.modules.has(HOUSING_MODULE_ID)
      ? ((coreAPI(core)
          .moduleState(HOUSING_MODULE_ID)
          .table("dwellings")
          .get(`dwelling:${person.householdId}`) as
          | {
              tenure: string;
              kind?: string;
              valueMinor?: number;
              rentMinor?: number;
            }
          | undefined) ?? null)
      : null,
    // The temperament recorded on the person, each in the pole's own word.
    traits: PEOPLE_TRAITS.flatMap((trait) => {
      const value = person.traits[`${PEOPLE_MIND_VERSION}:${trait}`];
      if (value === undefined) return [];
      const shape = TRAIT_SHAPES[trait];
      return [
        {
          label: shape.label,
          word:
            value < 0
              ? shape.low.label
              : value > 0
                ? shape.high.label
                : BALANCED_TRAIT.label,
        },
      ];
    }),
    // Where they place themselves politically, as the views engine's label.
    view: core.modules.has(VIEWS_MODULE_ID)
      ? (viewOf(coreAPI(core), personId)?.label ?? null)
      : null,
    affect: person.affect,
    needs: person.needs,
    ties,
    drives,
    schools: schoolsOf(core, personId),
    // What the law in force puts on this person's record (step 9).
    lawEffects: reachOn(coreAPI(core), personId).map((row) => ({
      id: row.id,
      lawId: row.lawId,
      question: row.key,
      kind: row.kind,
      what: row.what,
      since: row.since,
      endedOn: row.endedOn,
    })),
    // The life so far: each dated fact from the person's records.
    past: [...(person.pastFacts ?? [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((fact) => ({
        id: fact.id,
        date: fact.date,
        kind: fact.kind,
        summary: fact.summary,
      })),
  };
}

/**
 * What the viewer could know about someone (M6-02 person card): their name,
 * how they're related, the tie between you, and, for family and coworkers,
 * where they work. Nothing private (money, mood, drives) shows.
 */
export function knownCard(core: CoreState, viewerId: string, otherId: string) {
  const viewer = core.people.get(viewerId);
  const other = core.people.get(otherId);
  if (!viewer || !other) throw new Error("No such person.");
  const kin = (viewer.pastFacts ?? []).find(
    (fact) =>
      fact.kind.startsWith("family:") && fact.facts?.otherPersonId === otherId,
  );
  const family = viewer.familyIds.has(otherId) || Boolean(kin);
  const housemate = viewer.householdId === other.householdId;
  const job = other.jobId ? core.jobs.get(other.jobId) : undefined;
  const viewerJob = viewer.jobId ? core.jobs.get(viewer.jobId) : undefined;
  const coworker = Boolean(
    job && viewerJob && job.organizationId === viewerJob.organizationId,
  );
  const tie = [...(core.relationshipsByPerson.get(viewerId) ?? [])]
    .map((id) => core.relationships.get(id))
    .find(
      (row) =>
        row &&
        ((row.actorId === viewerId && row.otherId === otherId) ||
          (row.otherId === viewerId && row.actorId === otherId)),
    );
  return {
    personId: otherId,
    name: `${other.givenName} ${other.familyName}`,
    relation: relationWord(core, otherId, kin?.kind.slice("family:".length)),
    // Family and housemates know each other's ages; others are known by sight.
    age:
      family || housemate
        ? ageOnDate(makeIsoDate(other.birthDate), makeIsoDate(core.date))
        : null,
    alive: other.alive,
    work:
      (family || housemate || coworker) && job
        ? {
            title: job.title,
            employer: core.organizations.get(job.organizationId)?.name ?? null,
          }
        : null,
    tie: tie
      ? {
          kind: tie.kind,
          level: currentCloseness(core, tie),
          lastContactDate: tie.lastContactDate,
        }
      : null,
    known: viewer.knownIds.has(otherId) || family,
    // What the public knows of a figure the viewer may never have met (the
    // past module's public tier); null for anyone else.
    publicKnowledge: core.modules.has(PAST_MODULE_ID)
      ? publicKnowledgeOf(coreAPI(core), viewerId, otherId)
      : null,
    // A large standing figure: the person on the lead spot of the room you're in.
    figureUrl:
      stagePeople(core, scenePlace(core, viewerId).place, [
        { id: otherId, name: `${other.givenName} ${other.familyName}` },
      ]).people[0]?.figureUrl ?? null,
  };
}
