import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { drivesReport } from "../core2/modules/drives";
import type { CoreState } from "../core2/types";

// Engineering page size for the card's closest people, not a model value.
const CLOSEST = 8;

/** A person card: who they are, from their records only. */
export function personCard(core: CoreState, personId: string) {
  const person = core.people.get(personId);
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
        relation: relationOf.get(otherId) ?? null,
        level: row.level,
        lastContactDate: row.lastContactDate,
        recordId: row.id,
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
          relation: relationOf.get(id) ?? null,
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
    affect: person.affect,
    needs: person.needs,
    ties,
    drives,
  };
}
