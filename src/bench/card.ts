import { servingTermsOf } from "../core2/modules/offices";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { reachOn } from "../core2/law-reach/host";
import { coreAPI, personOrFillIn } from "../core2/state";
import { currentCloseness } from "../core2/closeness";
import { familyFactsOf } from "../core2/modules/people";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { PAST_MODULE_ID } from "../core2/past-module";
import { publicKnowledgeOf } from "../core2/past-public";
import type { CoreState, PersonId } from "../core2/types";
import { screenLine } from "../english/screen-words";
import { pronounWords } from "../english/pronoun-words";
import { circleChanges } from "./circle";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { relationWord, schoolsOf } from "./words";
import { faceOf, scenePlace, stagePeople } from "./scene";
import {
  BALANCED_TRAIT,
  PEOPLE_TRAITS,
  TRAIT_SHAPES,
  PEOPLE_MIND_VERSION,
} from "../core2/people-trait-definitions";
import { VIEWS_MODULE_ID, viewOf } from "../core2/modules/views";
import { preStartHistory, sharedHistory } from "../core2/past";

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
  const relatives = familyFactsOf(person);
  const relationOf = (id: string) => relatives.get(id as PersonId)?.relation;
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  const household = core.households.get(person.householdId);
  // Faces for the People map: each the figure a room here would draw.
  const place = scenePlace(core, personId).place;
  // The People screen's groups a tie falls in: family by kind, by a relation
  // word or by sharing the home; coworkers at work; friends; politics.
  const homeIds = new Set(household?.memberIds ?? []);
  const groupsOf = (otherId: string, kind: string, relation: unknown) => [
    ...(kind === "family" || relation || homeIds.has(otherId)
      ? ["family"]
      : []),
    ...(kind === "coworker" ? ["work"] : []),
    ...(kind === "friend" ? ["friends"] : []),
    ...(kind === "politics" ? ["politics"] : []),
  ];
  const ties = [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => core.relationships.get(id))
    .filter((row) => row !== undefined)
    .map((row) => {
      const otherId = row.actorId === personId ? row.otherId : row.actorId;
      return {
        personId: otherId,
        name: name(otherId),
        kind: row.kind,
        relation: relationWord(core, otherId, relationOf(otherId)),
        groups: groupsOf(
          otherId,
          row.kind,
          relationWord(core, otherId, relationOf(otherId)),
        ),
        level: currentCloseness(core, row),
        lastContactDate: row.lastContactDate,
        recordId: row.id,
        face: faceOf(core, otherId, place),
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
  return {
    id: person.id,
    name: name(person.id),
    face: faceOf(core, person.id, place),
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
          relation: relationWord(core, id, relationOf(id)),
          groups: ["family"],
          alive: core.people.get(id)?.alive ?? true,
          face: faceOf(core, id, place),
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
    // What they're like, in plain sentences from their strongest leanings
    // (owner, Oct 27), never the traits' names.
    sketch: personSketch(person.traits),
    // Where they place themselves politically, as the views engine's label.
    view: core.modules.has(VIEWS_MODULE_ID)
      ? (viewOf(coreAPI(core), personId)?.label ?? null)
      : null,
    ties,
    // Who joined or left their five closest this year, from the tie records.
    circle: circleChanges(core, personId),
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
  };
}

/**
 * What the viewer could know about someone (M6-02 person card): their name,
 * how they're related, the tie between you, and, for family and coworkers,
 * where they work. Nothing private (money, mood, drives) shows.
 */
const OFFICES = "core2-offices-v1";

/** An office's title, from the offices engine's table. */
function officeTitle(core: CoreState, officeId: string): string | null {
  const office = coreAPI(core)
    .moduleState(OFFICES)
    .table("offices")
    .get(officeId) as { title?: string } | undefined;
  return office?.title ?? null;
}

/** The offices a person serves in now, by title. */
function servingOffices(core: CoreState, personId: string): string[] {
  return servingTermsOf(coreAPI(core), personId).flatMap((term) => {
    const title = officeTitle(core, term.officeId);
    return title ? [title] : [];
  });
}

/**
 * An officeholder's colleagues: their ties to others serving in office,
 * closest first, each with that person's office and the tie's record. Null
 * for someone who holds no office.
 */
function colleaguesOf(core: CoreState, personId: string) {
  if (!servingOffices(core, personId).length) return null;
  return [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => core.relationships.get(id))
    .filter((row) => row !== undefined)
    .flatMap((row) => {
      const otherId = row.actorId === personId ? row.otherId : row.actorId;
      const other = core.people.get(otherId);
      const offices = other?.alive ? servingOffices(core, otherId) : [];
      if (!other || !offices.length) return [];
      return [
        {
          personId: otherId,
          name: `${other.givenName} ${other.familyName}`,
          office: offices[0]!,
          kind: row.kind,
          level: currentCloseness(core, row),
          recordId: row.id,
        },
      ];
    })
    .sort((a, b) => b.level - a.level || a.recordId.localeCompare(b.recordId))
    .slice(0, CLOSEST);
}

// Engineering bands for the sketch: a lean under the first is not said; one
// past the second takes the strong line. Display wording only, never a choice.
const SKETCH_SAID = 0.15;
const SKETCH_STRONG = 0.5;
const SKETCH_SENTENCES = 3;

/**
 * Up to three sentences of what a person is like, strongest leaning first:
 * to the player in the second person, or of someone else in the third, with
 * the pronouns their record carries.
 */
function personSketch(
  traits: Readonly<Record<string, number>>,
  pronouns?: string,
): string {
  const third = pronouns === undefined ? null : pronounWords(pronouns);
  const voice = pronouns === undefined ? "" : third ? "-third" : "-they";
  const facts = third ?? {};
  const said = PEOPLE_TRAITS.flatMap((trait) => {
    const value = traits[`${PEOPLE_MIND_VERSION}:${trait}`];
    if (value === undefined || Math.abs(value) < SKETCH_SAID) return [];
    const shape = TRAIT_SHAPES[trait];
    const pole = value < 0 ? shape.low.key : shape.high.key;
    const strength = Math.abs(value) >= SKETCH_STRONG ? "strong" : "mild";
    const line = screenLine(
      "person-sketch",
      `person-sketch.${pole}.${strength}${voice}`,
      facts,
    );
    return line ? [{ line, weight: Math.abs(value) }] : [];
  })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, SKETCH_SENTENCES)
    .map((row) => row.line);
  return said.length
    ? said.join(" ")
    : (screenLine("person-sketch", `person-sketch.balanced.1${voice}`, facts) ??
        "");
}

export function knownCard(core: CoreState, viewerId: string, otherId: string) {
  const viewer = core.people.get(viewerId);
  const other = core.people.get(otherId);
  if (!viewer || !other) throw new Error("No such person.");
  const kin = familyFactsOf(viewer).get(otherId as PersonId);
  const family = viewer.familyIds.has(otherId) || Boolean(kin);
  // What the two share, from the one reader the director's scenes use.
  const shared = sharedHistory(core, viewerId, otherId);
  const housemate = shared.some((row) => row.kind === "household");
  const coworker = shared.some((row) => row.kind === "coworker");
  const job = other.jobId ? core.jobs.get(other.jobId) : undefined;
  const tie = [...(core.relationshipsByPerson.get(viewerId) ?? [])]
    .map((id) => core.relationships.get(id))
    .find(
      (row) =>
        row &&
        ((row.actorId === viewerId && row.otherId === otherId) ||
          (row.otherId === viewerId && row.actorId === otherId)),
    );
  const relation = relationWord(core, otherId, kin?.relation);
  const school =
    (family || housemate) &&
    ageOnDate(makeIsoDate(other.birthDate), makeIsoDate(core.date)) <
      coreAPI(core).parameter("votingAge")
      ? (schoolsOf(core, otherId)
          .filter((row) => row.date <= core.date)
          .at(-1) ?? null)
      : null;
  return {
    personId: otherId,
    name: `${other.givenName} ${other.familyName}`,
    relation,
    // The family fact the relation is read from, the one scenes cite.
    relationRecordId: kin?.factId ?? null,
    // Family and housemates know each other's ages; others are known by sight.
    age:
      family || housemate
        ? ageOnDate(makeIsoDate(other.birthDate), makeIsoDate(core.date))
        : null,
    alive: other.alive,
    // Where family, housemates and coworkers live, by their record.
    placeName:
      (family || housemate || coworker) &&
      corePlaceByJurisdictionId(other.placeId as never)
        ? corePlaceByJurisdictionId(other.placeId as never)!.displayName
        : null,
    // The school a child or teen is at now, from the school their past records.
    school,
    // What they are like, said of them, to someone who knows them: family,
    // a housemate or anyone the player has a tie with.
    sketch:
      family || housemate || tie
        ? personSketch(other.traits, other.looks?.pronouns ?? "they-them")
        : null,
    work:
      (family || housemate || coworker) && job
        ? {
            title: job.title,
            employer: core.organizations.get(job.organizationId)?.name ?? null,
          }
        : null,
    tie: tie
      ? {
          recordId: tie.id,
          kind: tie.kind,
          level: currentCloseness(core, tie),
          lastContactDate: tie.lastContactDate,
        }
      : null,
    known: viewer.knownIds.has(otherId) || family,
    // What the two did or share besides family, each by the record that says
    // so: the same rows the director's scenes and talks read.
    shared: shared
      .filter((row) => row.kind !== "family")
      .map((row) => ({
        // Work that ended is said apart from work shared now.
        kind: row.kind === "coworker" && row.endedOn ? "worked" : row.kind,
        recordId: row.recordId,
        // The employer or the school, by name.
        name:
          row.kind === "coworker" || row.kind === "schoolmate"
            ? (core.organizations.get(row.recordId)?.name ?? null)
            : null,
      })),
    // The seats they reached before the start, from the government's history
    // before day one, each with the term record it stands on.
    seats: preStartHistory(core, {
      kind: "office.seat-reached",
      personId: otherId,
    }).map((row) => ({
      recordId: row.id,
      termId: String(row.facts.termId),
      office: officeTitle(core, String(row.facts.officeId)),
      year: Number(row.date.slice(0, 4)),
    })),
    // An officeholder's colleagues in office, by their tie records.
    colleagues: colleaguesOf(core, otherId),
    // What the public knows of a figure the viewer may never have met (the
    // past module's public tier); null for anyone else.
    publicKnowledge: core.modules.has(PAST_MODULE_ID)
      ? publicKnowledgeOf(coreAPI(core), viewerId, otherId)
      : null,
    // Their headshot for the talk box: the same face the People map draws.
    face: faceOf(core, otherId, scenePlace(core, viewerId).place),
    // A large standing figure: the person on the lead spot of the room you're in.
    figureUrl:
      stagePeople(core, scenePlace(core, viewerId).place, [
        {
          id: otherId,
          name: `${other.givenName} ${other.familyName}`,
          reason: "subject",
        },
      ]).people[0]?.figureUrl ?? null,
  };
}
