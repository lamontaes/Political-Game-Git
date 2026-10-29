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

const monthWords = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * A person's history as their card tells it, oldest first: one worded line
 * per dated record of their life (birth, school, a move, meeting a partner,
 * a child, a job, a parent's death, an election won) and the tie to the
 * viewer growing closer or apart. Each line names the record it stands on; a
 * record whose words the bank cannot fill is left out.
 */
function historyLines(
  core: CoreState,
  viewerId: string,
  other: NonNullable<ReturnType<CoreState["people"]["get"]>>,
  tie:
    | {
        id: string;
        latestChange?: {
          date: string;
          before: { level: number };
          after: { level: number };
        };
      }
    | undefined,
) {
  const personName = (id: unknown) => {
    const row = typeof id === "string" ? core.people.get(id) : undefined;
    return row ? `${row.givenName} ${row.familyName}` : "";
  };
  const facts = other.pastFacts ?? [];
  const lines: HistoryLine[] = [];
  for (const fact of facts) {
    const year = fact.date.slice(0, 4);
    const f = fact.facts ?? {};
    const add = (key: string, slots: Record<string, string>) =>
      lines.push({
        date: fact.date,
        key,
        slots: { year, ...slots },
        recordId: fact.id,
      });
    if (fact.kind === "life:moved-into-county") add("moved.in", {});
    else if (fact.kind === "life:moved-away") add("moved.away", {});
    else if (fact.kind === "family:child")
      add(f.otherPersonId === viewerId ? "child.you" : "child.born", {
        name: personName(f.otherPersonId),
      });
    else if (fact.kind === "work:tenure-summary")
      add("work.started", {
        title: String(f.title ?? ""),
        employer:
          core.organizations.get(String(f.organizationId ?? ""))?.name ?? "",
      });
    else if (fact.kind === "family:parent-died" && f.relation)
      add("loss.parent", {
        relation:
          String(f.relation).charAt(0).toUpperCase() +
          String(f.relation).slice(1),
        name: [f.givenName, f.familyName].filter(Boolean).join(" "),
      });
    else if (fact.kind === "campaign:elected" && f.office)
      add("office.elected", { office: String(f.office).replace(/-/g, " ") });
  }
  // The years before the start, from the one history every engine reads: the school
  // they started at, the jobs they held, the seats they reached.
  const sayPlace = (id: unknown) =>
    typeof id === "string" && corePlaceByJurisdictionId(id as never)
      ? corePlaceByJurisdictionId(id as never)!.displayName
      : "";
  for (const fact of facts)
    if (fact.kind === "birthplace") {
      const place = sayPlace(fact.facts?.placeId);
      lines.push({
        date: fact.date,
        key: place ? "born.place" : "born.year",
        slots: { year: fact.date.slice(0, 4), place },
        recordId: fact.id,
      });
    }
  // Everyone has a birth year on their own record, even with no birthplace kept.
  if (!lines.some((line) => line.key.startsWith("born.")) && other.birthDate)
    lines.push({
      date: other.birthDate,
      key: "born.year",
      slots: { year: other.birthDate.slice(0, 4) },
      recordId: other.id,
    });
  for (const school of schoolsOf(core, other.id))
    lines.push({
      date: school.date,
      key: "school.started",
      slots: { year: school.date.slice(0, 4), school: school.name },
      recordId: school.recordId,
    });
  for (const row of preStartHistory(core, { personId: other.id as PersonId })) {
    if (row.kind === "person.work-spell") {
      const employer =
        core.organizations.get(String(row.facts.organizationId ?? ""))?.name ??
        "";
      if (employer)
        lines.push({
          date: String(row.facts.startedAt ?? row.date),
          key: "work.spell",
          slots: {
            year: String(row.facts.startedAt ?? row.date).slice(0, 4),
            employer,
          },
          recordId: row.id,
        });
    } else if (row.kind === "office.seat-reached") {
      const office = officeTitle(core, String(row.facts.officeId ?? ""));
      if (office)
        lines.push({
          date: row.date,
          key:
            row.facts.reached === "appointed"
              ? "office.appointed"
              : "office.elected",
          slots: { year: row.date.slice(0, 4), office: inSentence(office) },
          recordId: row.id,
        });
    }
  }
  const change = tie?.latestChange;
  if (change && change.after.level !== change.before.level)
    lines.push({
      date: change.date,
      key:
        change.after.level > change.before.level ? "tie.closer" : "tie.apart",
      slots: { month: monthWords(change.date) },
      recordId: tie.id,
    });
  return lines;
}

interface HistoryLine {
  date: string;
  key: string;
  slots: Record<string, string>;
  recordId: string;
}

/** Office titles read in running text: "council member", but "U.S. senator". */
const inSentence = (title: string) =>
  /^[A-Z][a-z]/.test(title) ? title.toLowerCase() : title;

/**
 * The lines as the card says them, oldest first, each worded from the bank. One
 * school is said once, from the year they started there.
 */
function tellHistory(lines: readonly HistoryLine[]) {
  const said = new Set<string>();
  return [...lines]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((line) => {
      const text = screenLine(
        "person-history",
        `person-history.${line.key}`,
        line.slots,
      );
      if (!text) return [];
      const school = line.key === "school.started";
      if (school && said.has(text.replace(/ in \d{4}\.$/, ""))) return [];
      if (school) said.add(text.replace(/ in \d{4}\.$/, ""));
      return [{ date: line.date, text, recordId: line.recordId }];
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

interface TermLike {
  readonly id: string;
  readonly officeId: string;
  readonly personId?: string | null;
  readonly identity?: {
    givenName: string;
    familyName: string;
    birthDate?: string;
  };
  readonly startDate: string;
  readonly party: string | null;
  readonly seatId?: string;
  readonly reached?: string;
}

/** When a sitting officeholder's service began, from the public record. */
function enteredOffice(
  core: CoreState,
  personId: string,
  known: ReturnType<typeof publicKnowledgeOf> | null,
): HistoryLine[] {
  const start = known?.serviceStart;
  const office = servingOffices(core, personId)[0];
  return start && office
    ? [
        {
          date: start,
          key: "office.entered",
          slots: { year: start.slice(0, 4), office: inSentence(office) },
          recordId: personId,
        },
      ]
    : [];
}

/** An official's own lines: born, and each term they won or were given. */
function officialLines(
  core: CoreState,
  rows: readonly TermLike[],
  term: TermLike,
) {
  const same = (row: TermLike) =>
    row.identity?.givenName === term.identity?.givenName &&
    row.identity?.familyName === term.identity?.familyName &&
    row.identity?.birthDate === term.identity?.birthDate &&
    row.seatId === term.seatId;
  const lines: HistoryLine[] = [];
  if (term.identity?.birthDate)
    lines.push({
      date: term.identity.birthDate,
      key: "born.year",
      slots: { year: term.identity.birthDate.slice(0, 4) },
      recordId: term.id,
    });
  for (const row of rows.filter(same)) {
    const office = officeTitle(core, row.officeId);
    if (!office) continue;
    lines.push({
      date: row.startDate,
      key: row.reached === "appointed" ? "office.appointed" : "office.elected",
      slots: { year: row.startDate.slice(0, 4), office: inSentence(office) },
      recordId: row.id,
    });
  }
  return lines;
}

/**
 * The card of a named official the player has not met and who lives
 * elsewhere (a state legislator, a member of Congress, the President): what
 * the public record says, from their term and office. `official:<term>` is
 * memberKey's form for them; a term holder's person id is accepted too.
 * Every person on a screen opens a card (owner, Oct 28, point 13).
 */
function officialCard(core: CoreState, viewerId: string, id: string) {
  const api = coreAPI(core);
  const terms = api.moduleState(OFFICES).table("terms");
  const termId = id.startsWith("official:") ? id.slice("official:".length) : id;
  const term = (terms.get(termId) ??
    (terms.rows() as unknown as TermLike[]).find(
      (row) => row.personId === id,
    )) as TermLike | undefined;
  if (!term?.identity) return null;
  const office = api
    .moduleState(OFFICES)
    .table("offices")
    .get(term.officeId) as
    { title?: string; governmentName?: string } | undefined;
  let publicKnowledge: ReturnType<typeof publicKnowledgeOf> | null = null;
  try {
    publicKnowledge = core.modules.has(PAST_MODULE_ID)
      ? publicKnowledgeOf(api, viewerId, id)
      : null;
  } catch {
    publicKnowledge = null;
  }
  return {
    personId: id,
    name: `${term.identity.givenName} ${term.identity.familyName}`,
    relation: null,
    relationRecordId: null,
    age: null,
    alive: true,
    placeName: office?.governmentName ?? null,
    school: null,
    sketch: null,
    work: office?.title
      ? { title: office.title, employer: office.governmentName ?? null }
      : null,
    tie: null,
    known: false,
    shared: [],
    seats: [
      {
        recordId: term.id,
        termId: term.id,
        office: office?.title ?? null,
        year: Number(term.startDate.slice(0, 4)),
      },
    ],
    // Their life from the terms they served (each with its record) and their birth.
    history: tellHistory([
      ...officialLines(core, terms.rows() as unknown as TermLike[], term),
      // Their service began before the term the records hold: the public record's start.
      ...(publicKnowledge?.serviceStart &&
      publicKnowledge.serviceStart < term.startDate &&
      office?.title
        ? [
            {
              date: publicKnowledge.serviceStart,
              key: "office.entered",
              slots: {
                year: publicKnowledge.serviceStart.slice(0, 4),
                office: inSentence(office.title),
              },
              recordId: term.id,
            },
          ]
        : []),
    ]),
    colleagues: [],
    publicKnowledge: publicKnowledge ?? {
      party: term.party,
      serviceStart: term.startDate,
      votesOnRecord: null,
      lawsSponsored: null,
      lawsSigned: null,
      positions: [],
    },
    face: faceOf(core, term.id, scenePlace(core, viewerId).place),
  };
}

export function knownCard(core: CoreState, viewerId: string, otherId: string) {
  const viewer = core.people.get(viewerId);
  const other = core.people.get(otherId);
  if (viewer && !other) {
    const official = officialCard(core, viewerId, otherId);
    if (official) return official;
  }
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
  const publicKnowledge = core.modules.has(PAST_MODULE_ID)
    ? publicKnowledgeOf(coreAPI(core), viewerId, otherId)
    : null;
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
    // Their history from the one history every engine reads, oldest first, for
    // everyone the viewer opens.
    history: tellHistory([
      ...historyLines(core, viewerId, other, tie),
      ...enteredOffice(core, otherId, publicKnowledge),
    ]),
    // An officeholder's colleagues in office, by their tie records.
    colleagues: colleaguesOf(core, otherId),
    // What the public knows of a figure the viewer may never have met (the
    // past module's public tier); null for anyone else.
    publicKnowledge,
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
