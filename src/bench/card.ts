import { servingTermsOf } from "../core2/modules/offices";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { reachOn } from "../core2/law-reach/host";
import { coreAPI, personOrFillIn } from "../core2/state";
import { currentCloseness } from "../core2/closeness";
import {
  COUNTED_MOVES_MODULE_ID,
  countedMoves,
  familyFactsOf,
  MOVED_AWAY_EVENT,
} from "../core2/modules/people";
import { townFacts } from "../core2/modules/laws";
import type { EntityId } from "../core2/kernel/brands";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { PAST_MODULE_ID } from "../core2/past-module";
import { publicKnowledgeOf } from "../core2/past-public";
import type { CoreState, PersonId } from "../core2/types";
import { screenLine } from "../english/screen-words";
import {
  pronounSetOfGender,
  pronounWords,
  type PronounWords,
} from "../english/pronoun-words";
import { joinList } from "../english/bill-names";
import {
  corePlaceByJurisdictionId,
  coreStateName,
} from "../core2/place-lookup";
import { relationWord, schoolsOf } from "./words";
import { faceOf, scenePlace } from "./scene";
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
    // Why a grown person holds no job, told to them on Who you are (path 10):
    // who in the home earns, from the household's members and their jobs'
    // records (a partner first, then a parent, then anyone else at home),
    // or that nobody there draws a wage. Null with a job, or under voting age.
    noJob: job ? null : noJobLine(core, person, relationOf),
    liquidMinor: person.liquidMinor,
    // The town's size and this year's moves (path 10), from the records.
    town: townMoves(core, person.placeId),
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
 * A person's history as their card tells it, oldest first: one worded line
 * per dated record of their life (birth, school, a move, meeting a partner,
 * a child, a job, a parent's death, an election won). Never how close the
 * tie to the viewer is (owner, Oct 29). Each line names the record it stands on; a
 * record whose words the bank cannot fill is left out.
 */
function historyLines(
  core: CoreState,
  viewerId: string,
  other: NonNullable<ReturnType<CoreState["people"]["get"]>>,
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
        relation: String(f.relation).toLowerCase(),
        name: [f.givenName, f.familyName].filter(Boolean).join(" "),
      });
    else if (fact.kind === "campaign:elected" && f.office) {
      const office = String(f.office).replace(/-/g, " ");
      add("office.elected", { office });
      // The term that election won, when they serve in it now: its first day.
      const term = servingTermsOf(coreAPI(core), other.id).find(
        (row) =>
          row.startDate >= fact.date &&
          inSentence(officeTitle(core, row.officeId) ?? "") === office,
      );
      if (term) lines.at(-1)!.start = term.startDate;
    }
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
  // An official's earlier terms of the same seat, each on its own term record.
  if (other.id.startsWith("official:")) {
    const rows = coreAPI(core)
      .moduleState(OFFICES)
      .table("terms")
      .rows() as unknown as TermLike[];
    const own = rows.find(
      (row) => row.id === other.id.slice("official:".length),
    );
    if (own)
      lines.push(
        ...officialLines(core, rows, own).filter(
          (line) => line.key !== "born.year" && line.recordId !== own.id,
        ),
      );
  }
  // Everyone has a birth year on their own record, even with no birthplace kept.
  if (!lines.some((line) => line.key.startsWith("born.")) && other.birthDate)
    lines.push({
      date: other.birthDate,
      key: "born.year",
      slots: { year: other.birthDate.slice(0, 4) },
      recordId: other.id,
    });
  // Kindergarten is starting school; a first record later on (they moved in,
  // or were older when the records begin) is the stage they joined at.
  for (const school of schoolsOf(core, other.id))
    lines.push({
      date: school.date,
      key: school.grade > 0 ? "school.joined" : "school.started",
      slots: {
        year: school.date.slice(0, 4),
        school: school.name,
        stage: school.stage,
      },
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
    } else if (row.kind === "person.moved-in") {
      lines.push({
        date: row.date,
        key: "moved.in",
        slots: { year: row.date.slice(0, 4) },
        recordId: row.id,
      });
    } else if (row.kind === "family.partnered") {
      const partner = core.people.get(
        String(row.personIds?.find((id) => id !== other.id) ?? ""),
      );
      if (partner)
        lines.push({
          date: row.date,
          key: partner.id === viewerId ? "partner.home-you" : "partner.home",
          slots: {
            year: row.date.slice(0, 4),
            name: `${partner.givenName} ${partner.familyName}`,
          },
          recordId: row.id,
        });
    } else if (row.kind === "school.started" && row.facts.stage) {
      // Each stage of school after the first is its own line (the first is
      // the line that names the school).
      if (
        row.date ===
        preStartHistory(core, {
          kind: "school.started",
          personId: other.id as PersonId,
        })[0]?.date
      )
        continue;
      lines.push({
        date: row.date,
        key: "school.stage",
        slots: {
          year: row.date.slice(0, 4),
          stage: String(row.facts.stage),
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
  return lines;
}

interface HistoryLine {
  date: string;
  key: string;
  slots: Record<string, string>;
  recordId: string;
  /** The day the term an office line tells began, when it is not the line's own day (an election in November, a term in January). */
  start?: string;
}

/** Office titles read in running text: "council member", but "U.S. senator". */
const inSentence = (title: string) =>
  /^[A-Z][a-z]/.test(title) ? title.toLowerCase() : title;

/** Who a card's story is about, and the form its sentences take. */
interface Teller {
  /** Said of someone (third person), in the they form, or to the player of their own life. */
  readonly form: "third" | "they" | "you";
  /** Their full name, said in the story's first sentence. */
  readonly name: string;
  /** Their recorded pronouns, for the third-person form. */
  readonly words: PronounWords | null;
}

/** The teller for one person's card, as the viewer reads it. */
function tellerOf(
  viewerId: string,
  personId: string,
  name: string,
  pronouns: string | undefined,
): Teller {
  if (viewerId === personId) return { form: "you", name, words: null };
  const words = pronounWords(pronouns);
  return { form: words ? "third" : "they", name, words };
}

/** The most later terms a run names by year before it is said whole. */
const TERMS_NAMED = 2;

/** The office lines of a run of terms, by how the first was reached. */
const OFFICE_KEYS = ["office.elected", "office.appointed", "office.entered"];

/**
 * The card's story, oldest first (owner, Nov 1: "Elected legislator, it needs
 * to be told like a story. How many times do I have to say that?"): each
 * record a sentence of a short biography from the bank, the first naming
 * them and the rest using their recorded pronouns, or said to the player of
 * their own life. A run of terms in one office is one sentence ("won
 * election as state representative, and won it again in 1988 and 1990"),
 * and one school is said once. The timeline shows the year beside each.
 */
function tellHistory(lines: readonly HistoryLine[], teller: Teller) {
  // Terms in the same office, one after another, fold into the first.
  const sorted = [...lines].sort((a, b) => a.date.localeCompare(b.date));
  const folded: (HistoryLine & { again?: string[]; later?: string[] })[] = [];
  for (const line of sorted) {
    const run = folded.at(-1);
    // A later term won at the polls, or one the records do not say how they
    // reached (in office at the opening), folds into the run; a later
    // appointment is its own sentence, since the run's words say "won".
    // Spells at the same employer one after another (a campaign shop's
    // seasons) fold the same way.
    const term =
      run &&
      OFFICE_KEYS.includes(run.key) &&
      OFFICE_KEYS.includes(line.key) &&
      line.key !== "office.appointed" &&
      run.slots.office === line.slots.office;
    const spell =
      run &&
      run.key === "work.spell" &&
      line.key === "work.spell" &&
      run.slots.employer === line.slots.employer;
    if (run && (term || spell)) {
      const year = line.date.slice(0, 4);
      const years = (run.again ??= []);
      if (year !== run.date.slice(0, 4) && !years.includes(year))
        years.push(year);
      (run.later ??= []).push(line.recordId);
      continue;
    }
    folded.push({ ...line });
  }
  const said = new Set<string>();
  let named = false;
  return folded.flatMap((line) => {
    // The same record twice (a move the person's own facts and the moves
    // engine both keep, a school started twice) is said once.
    const key =
      line.key === "school.started" || line.key === "school.joined"
        ? `school:${line.slots.school}`
        : `${line.date.slice(0, 4)} ${line.key} ${JSON.stringify(line.slots)}`;
    if (said.has(key)) return [];
    said.add(key);
    // Two or three terms name their years; a longer run is said whole.
    const again = !line.again?.length
      ? line.key
      : line.again.length > TERMS_NAMED
        ? `${line.key}-always`
        : `${line.key}-again`;
    // The first sentence names them; the rest use their pronouns, or the
    // they form when their record holds none.
    const first = teller.form !== "you" && !named;
    const form = first ? "third" : teller.form;
    const text = screenLine(
      "person-history",
      `person-history.story.${again}.${form}`,
      {
        ...line.slots,
        ...(line.again?.length ? { years: joinList(line.again, "and") } : {}),
        who: first ? teller.name : (teller.words?.subject ?? ""),
        whom: first ? teller.name : (teller.words?.object ?? ""),
        their: teller.words?.possessive ?? (first ? "their" : ""),
      },
    );
    if (!text) return [];
    if (first) named = true;
    // The kind of record (born, school, work, office...) picks the
    // timeline's icon: the key's first part.
    return [
      {
        date: line.date,
        text,
        kind: line.key.split(".")[0],
        recordId: line.recordId,
        // Every record the sentence tells: a run's later terms too.
        records: [line.recordId, ...(line.later ?? [])],
      },
    ];
  });
}

/**
 * A town's size and this calendar year's moves: everyone modeled there now
 * (named and counted, `townFacts`), the people the counted moves' records
 * brought in and took out, and the named residents' moved-away records.
 * Each count is a sum of records, which the card names.
 */
export function townMoves(core: CoreState, town: string) {
  const api = coreAPI(core);
  const from = `${core.date.slice(0, 4)}-01-01`;
  let arrivals = 0;
  let departures = 0;
  const recordIds: string[] = [];
  if (core.modules.has(COUNTED_MOVES_MODULE_ID))
    for (const move of countedMoves(api)) {
      if (move.date < from) continue;
      if (move.direction === "in" && move.toPlace === town)
        arrivals += move.people;
      else if (move.direction === "out" && move.fromPlace === town)
        departures += move.people;
      else continue;
      recordIds.push(move.id);
    }
  for (const id of core.logByKind.get(MOVED_AWAY_EVENT) ?? []) {
    const row = core.durableLog.get(id as EntityId);
    if (!row || row.placeId !== town || row.date < from) continue;
    departures += row.personIds?.length ?? 0;
    recordIds.push(row.id);
  }
  return {
    population: Math.round(townFacts(api, town).modeled),
    arrivals: Math.round(arrivals),
    departures: Math.round(departures),
    recordIds,
  };
}

/**
 * Why a grown person has no job, in the you form, from the records: the
 * household member whose job keeps the home, by its job and employer record,
 * or that no one at home holds a job. The line names its records.
 */
function noJobLine(
  core: CoreState,
  person: NonNullable<ReturnType<typeof personOrFillIn>>,
  relationOf: (id: string) => string | undefined,
): { text: string; recordIds: string[] } | null {
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  if (age < coreAPI(core).parameter("votingAge")) return null;
  const household = core.households.get(person.householdId);
  const rank = (id: string) =>
    relationOf(id) === "partner" ? 0 : relationOf(id) === "parent" ? 1 : 2;
  const earner = (household?.memberIds ?? [])
    .filter((id) => id !== person.id)
    .map((id) => core.people.get(id))
    .filter((other) => other?.alive && other.jobId)
    .sort((a, b) => rank(a!.id) - rank(b!.id))[0];
  const job = earner?.jobId ? core.jobs.get(earner.jobId) : undefined;
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  if (earner && job && employer) {
    const text = screenLine(
      "person-history",
      "person-history.summary.no-work.earner.you",
      {
        name: `${earner.givenName} ${earner.familyName}`,
        employer: employer.name,
      },
    );
    return text
      ? { text, recordIds: [household!.id, earner.id, job.id, employer.id] }
      : null;
  }
  const text = screenLine(
    "person-history",
    "person-history.summary.no-work.none.you",
    {},
  );
  return text ? { text, recordIds: household ? [household.id] : [] } : null;
}

/** A run of terms in one office, as a card's header and lines under the name read it. */
interface OfficeRun {
  readonly office: string;
  readonly since: string;
  readonly terms: number;
  readonly wonAgain: boolean;
}

/**
 * The lines under a person's name (owner, Nov 1: "Under her name, she told
 * legislator. That's not good. There needs to be more text."): who they are
 * now (the office they have held since their first term in it, else their
 * work, their school or their town), then where and when they were born.
 * From the same records the story tells, so the two agree.
 */
function summaryOf(
  teller: Teller,
  now: {
    readonly office?: OfficeRun | null;
    readonly work?: { title: string | null; employer: string | null } | null;
    readonly school?: string | null;
    readonly place?: string | null;
    readonly born?: { year: string; place: string | null } | null;
    /** The office held before this one, from a President's record: its kind and state. */
    readonly before?: { kind: string; state: string } | null;
  },
): string[] {
  const you = teller.form === "you" ? ".you" : "";
  const line = (key: string, slots: Record<string, string>) =>
    screenLine("person-history", `person-history.summary.${key}${you}`, slots);
  const role = now.office
    ? line(
        now.office.terms > 1 && now.office.wonAgain
          ? "office.run"
          : "office.one",
        {
          office: now.office.office,
          year: now.office.since.slice(0, 4),
        },
      )
    : now.work?.employer
      ? now.work.title
        ? line("work.title", {
            title: inSentence(now.work.title),
            employer: now.work.employer,
          })
        : line("work.employer", { employer: now.work.employer })
      : now.school
        ? line("school", { school: now.school })
        : now.place
          ? line("place", { place: now.place })
          : null;
  const born = now.born
    ? now.born.place
      ? line("born.place", { place: now.born.place, year: now.born.year })
      : line("born.year", { year: now.born.year })
    : null;
  const before = now.before
    ? line(`before.${now.before.kind}`, { state: now.before.state })
    : null;
  return [role, before, born].filter((text): text is string => !!text);
}

/**
 * An office run's facts from a card's office lines: its title, the day its
 * first term began (the header's "since" reads the same day), how many terms,
 * and whether they won it again with no term given by appointment.
 */
function officeRunOf(
  lines: readonly HistoryLine[],
  office: string | null | undefined,
): OfficeRun | null {
  if (!office) return null;
  const said = inSentence(office);
  const terms = lines
    .filter((line) => OFFICE_KEYS.includes(line.key))
    .filter((line) => line.slots.office === said)
    .sort((a, b) => (a.start ?? a.date).localeCompare(b.start ?? b.date));
  if (!terms.length) return null;
  return {
    office: said,
    since: terms[0]!.start ?? terms[0]!.date,
    terms: new Set(terms.map((line) => line.date.slice(0, 4))).size,
    // Won again: a later term won at the polls and none given by appointment
    // (a term the records do not say how they reached claims nothing).
    wonAgain:
      terms.slice(1).some((line) => line.key === "office.elected") &&
      !terms.slice(1).some((line) => line.key === "office.appointed"),
  };
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
    gender?: string;
  };
  readonly startDate: string;
  readonly party: string | null;
  readonly seatId?: string;
  readonly reached?: string;
}

/**
 * When a sitting officeholder's service began: the public record's start,
 * else the first day of the term they serve now (a board member seated with
 * the world, whom no earlier record names), with that term's record.
 */
function enteredOffice(
  core: CoreState,
  personId: string,
  known: ReturnType<typeof publicKnowledgeOf> | null,
): HistoryLine[] {
  const term = servingTermsOf(coreAPI(core), personId)[0];
  const office = term ? officeTitle(core, term.officeId) : null;
  const start = known?.serviceStart ?? term?.startDate;
  return start && office
    ? [
        {
          date: start,
          key: "office.entered",
          slots: { year: start.slice(0, 4), office: inSentence(office) },
          recordId: known?.serviceStart ? personId : term!.id,
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
      // By how they reached it; a term whose way in the records do not say is told
      // as taking office.
      key:
        row.reached === "appointed"
          ? "office.appointed"
          : row.reached === "elected"
            ? "office.elected"
            : "office.entered",
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
  const name = `${term.identity.givenName} ${term.identity.familyName}`;
  const allTerms = terms.rows() as unknown as TermLike[];
  // Their life from the terms they served (each with its record) and their birth.
  const lines = [
    ...officialLines(core, allTerms, term),
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
  ];
  // A holder who is a full person is said with their own record's pronouns
  // (their terms' gender reads "recorded").
  const holder = term.personId ? core.people.get(term.personId) : undefined;
  const teller = tellerOf(
    viewerId,
    id,
    name,
    holder?.looks?.pronouns ??
      pronounSetOfGender(holder?.looks?.gender ?? term.identity.gender),
  );
  const run = officeRunOf(lines, office?.title);
  return {
    personId: id,
    name,
    // Who they are now and where they come from, under the name.
    summary: summaryOf(teller, {
      office: run,
      born: term.identity.birthDate
        ? { year: term.identity.birthDate.slice(0, 4), place: null }
        : null,
    }),
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
    // The seat since their first term in it, the same terms the story
    // tells, so the header and the story agree.
    seats: [
      {
        recordId: term.id,
        termId: term.id,
        office: office?.title ?? null,
        year: Number((run?.since ?? term.startDate).slice(0, 4)),
      },
    ],
    history: tellHistory(lines, teller),
    colleagues: [],
    // The public record's "since" is the run's first term too.
    publicKnowledge: withSince(
      publicKnowledge ?? {
        party: term.party,
        serviceStart: term.startDate,
        votesOnRecord: null,
        lawsSponsored: null,
        lawsSigned: null,
        positions: [],
      },
      run,
    ),
    face: faceOf(core, term.id, scenePlace(core, viewerId).place),
  };
}

/**
 * A public record whose service began no later than the office run the card
 * tells (owner, Nov 1: the header's "Since 2025" against elections in 2011,
 * 2013 and 2015), so the header, the lines under the name and the story agree.
 */
function withSince<T extends { serviceStart: string }>(
  known: T,
  run: OfficeRun | null,
): T {
  return run && run.since < known.serviceStart
    ? { ...known, serviceStart: run.since }
    : known;
}

/** The tie between two people, either way round, when they have one. */
function tieBetween(core: CoreState, viewerId: string, otherId: string) {
  return [...(core.relationshipsByPerson.get(viewerId) ?? [])]
    .map((id) => core.relationships.get(id))
    .find(
      (row) =>
        row &&
        ((row.actorId === viewerId && row.otherId === otherId) ||
          (row.otherId === viewerId && row.actorId === otherId)),
    );
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
  const tie = tieBetween(core, viewerId, otherId);
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
  const face = faceOf(core, otherId, scenePlace(core, viewerId).place);
  const lines = (() => {
    const base = historyLines(core, viewerId, other);
    const entered = enteredOffice(core, otherId, publicKnowledge);
    // Service in an office whose first term is already told is not told twice.
    const told = entered.some((line) =>
      base.some(
        (row) =>
          OFFICE_KEYS.includes(row.key) &&
          row.slots.office === line.slots.office &&
          (row.start ?? row.date) <= line.date,
      ),
    );
    return told ? base : [...base, ...entered];
  })();
  const name = `${other.givenName} ${other.familyName}`;
  const teller = tellerOf(
    viewerId,
    otherId,
    name,
    other.looks?.pronouns ?? pronounSetOfGender(other.looks?.gender),
  );
  // Where they live, when the viewer knows it: their own life, family,
  // housemates and coworkers, or anyone living in the viewer's town.
  const knowsHome =
    viewerId === otherId ||
    family ||
    housemate ||
    coworker ||
    other.placeId === viewer.placeId;
  const homePlace = knowsHome
    ? (corePlaceByJurisdictionId(other.placeId as never)?.displayName ?? null)
    : null;
  const birthplace = (other.pastFacts ?? []).find(
    (row) => row.kind === "birthplace",
  );
  const bornIn =
    typeof birthplace?.facts?.placeId === "string"
      ? (corePlaceByJurisdictionId(birthplace.facts.placeId as never)
          ?.displayName ?? null)
      : null;
  const run = officeRunOf(lines, servingOffices(core, otherId)[0]);
  // The office a President held before, from their record.
  const prior = (other.pastFacts ?? []).find(
    (row) => row.kind === "career:prior-office",
  )?.facts;
  const priorOffice =
    run && typeof prior?.office === "string"
      ? {
          kind: prior.office,
          state:
            typeof prior.stateKey === "string"
              ? (coreStateName(prior.stateKey.replace(/^US-/, "")) ?? "")
              : "",
        }
      : null;
  return {
    personId: otherId,
    name,
    // Who they are now and where they come from, under the name.
    summary: summaryOf(teller, {
      office: run,
      // Their work, as the story already tells it of anyone.
      work: job
        ? {
            title: job.title,
            employer: core.organizations.get(job.organizationId)?.name ?? null,
          }
        : null,
      school: school?.name ?? null,
      place: homePlace,
      born: { year: other.birthDate.slice(0, 4), place: bornIn },
      before: priorOffice,
    }),
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
    // The office they serve in now is dated from the run's first term, as
    // the lines under the name say it.
    seats: preStartHistory(core, {
      kind: "office.seat-reached",
      personId: otherId,
    }).map((row) => {
      const office = officeTitle(core, String(row.facts.officeId));
      const since =
        run && office && inSentence(office) === run.office
          ? run.since
          : row.date;
      return {
        recordId: row.id,
        termId: String(row.facts.termId),
        office,
        year: Number(since.slice(0, 4)),
      };
    }),
    // Their history from the one history every engine reads, oldest first, for
    // everyone the viewer opens, told as a story.
    history: tellHistory(lines, teller),
    // An officeholder's colleagues in office, by their tie records.
    colleagues: colleaguesOf(core, otherId),
    // What the public knows of a figure the viewer may never have met (the
    // past module's public tier), serving since the run's first term; null
    // for anyone else.
    publicKnowledge: publicKnowledge && withSince(publicKnowledge, run),
    // Their headshot for the talk box (the same face the People map draws),
    // and the card's standing figure: the same picture, whole.
    face,
    figureUrl: face?.url ?? null,
  };
}
