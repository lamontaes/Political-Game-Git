import { governmentProperName } from "../core2/government-proper-name";
import { servingTermsOf } from "../core2/modules/offices";
import { officeInSentence, personWorkOf } from "../core2/person-work";
import {
  ageInYears,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../core2/kernel/dates";
import { reachOn } from "../core2/law-reach/host";
import { coreAPI, personOrFillIn } from "../core2/state";
import { currentCloseness } from "../core2/closeness";
import {
  COUNTED_MOVES_MODULE_ID,
  countedMoves,
  familyFactsOf,
  lifeOf,
  livesElsewhere,
  openWholePast,
  MOVED_AWAY_EVENT,
  type LifeEvent,
} from "../core2/modules/people";
import { townFacts } from "../core2/modules/laws";
import type { EntityId } from "../core2/kernel/brands";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { PAST_MODULE_ID, residenceOn } from "../core2/past-module";
import { publicKnowledgeOf } from "../core2/past-public";
import type { CoreState, PersonId } from "../core2/types";
import {
  partText,
  screenLine,
  screenPick,
  screenWays,
} from "../english/screen-words";
import {
  articleFor,
  employerSaid,
  framedByAge,
  withArticle,
} from "../english/journal-words";
import controls from "./data/controls.json" with { type: "json" };
import {
  pronounSetOfGender,
  pronounWords,
  type PronounWords,
} from "../english/pronoun-words";
import { joinList } from "../english/bill-names";
import { monthWords } from "../english/plain-words.mjs";
import { spanSaid } from "../english/span-words";
import {
  corePlaceByJurisdictionId,
  coreStateKeyOfJurisdictionId,
  coreStateName,
} from "../core2/place-lookup";
import { organizationName, stateInSentence } from "../director/words";
import { relationWord, schoolsOf } from "./words";
import { faceOf, scenePlace } from "./scene";
import {
  BALANCED_TRAIT,
  PEOPLE_TRAITS,
  TRAIT_SHAPES,
  PEOPLE_MIND_VERSION,
} from "../core2/people-trait-definitions";
import { VIEWS_MODULE_ID, viewOf } from "../core2/modules/views";
import { viewKey, viewQuestionKey } from "../director/view-learned";
import { questionAbout } from "../english/question-names";
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
  // Everyone this person knows, closest first: one entry per relationship
  // record (a meeting writes one). The People screen lists them all; the
  // card's own page shows the closest few, with faces and why each changed.
  const known = [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => core.relationships.get(id))
    .filter((row) => row !== undefined)
    .map((row) => {
      const otherId = row.actorId === personId ? row.otherId : row.actorId;
      const relation = relationWord(core, otherId, relationOf(otherId));
      return {
        row,
        personId: otherId,
        name: name(otherId),
        kind: row.kind,
        relation,
        groups: groupsOf(otherId, row.kind, relation),
        level: currentCloseness(core, row),
      };
    })
    .sort((a, b) => b.level - a.level);
  const ties = known.slice(0, CLOSEST).map(({ row, ...tie }) => ({
    ...tie,
    lastContactDate: row.lastContactDate,
    recordId: row.id,
    face: faceOf(core, tie.personId, place),
    // Why the tie last changed, from its own record.
    latestChange: row.latestChange && {
      date: row.latestChange.date,
      cause: row.latestChange.reason?.cause ?? row.latestChange.cause,
      before: row.latestChange.before.level,
      after: row.latestChange.after.level,
    },
  }));
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
      // The market's stand-in for work out of town is no employer and no
      // place (Fable A, Nov 13, rule 20): the job is said as work outside the
      // town the person lives in, the way their card's summary says it.
      ...(employer?.outsideFlow
        ? {
            title:
              screenLine(
                "person-history",
                "person-history.summary.work.outside",
                {
                  place:
                    corePlaceByJurisdictionId(person.placeId as never)
                      ?.displayName ?? "",
                },
              )?.replace(/\.$/, "") ?? job.title,
            employer: undefined,
          }
        : { title: job.title, employer: employerOf(core, job.organizationId) }),
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
    // The leanings on the You screen, each with its label and how strong it
    // runs (shown only on the player's own screen).
    traitLines: leanings(person.traits),
    // Where they place themselves politically, as the views engine's label.
    view: core.modules.has(VIEWS_MODULE_ID)
      ? (viewOf(coreAPI(core), personId)?.label ?? null)
      : null,
    ties,
    known: known.map((tie) => ({
      personId: tie.personId,
      name: tie.name,
      kind: tie.kind,
      relation: tie.relation,
      groups: tie.groups,
      level: tie.level,
    })),
    schools: schoolsOf(core, personId),
    // The school they are at now: the latest one, while they are of school
    // age (under voting age), the same rule the cards of others use.
    schoolNow:
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) <
      coreAPI(core).parameter("votingAge")
        ? (schoolsOf(core, personId)
            .filter((row) => row.date <= core.date)
            .at(-1) ?? null)
        : null,
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

/** An office's record in the offices engine's table: its title and how many seats it has. */
function officeRecord(
  core: CoreState,
  officeId: string,
): { title?: string; seats?: number } | undefined {
  // A took-office event that names no office record (its office is told by its words) has no title
  // to look up, and the offices table takes no empty key.
  if (!officeId.trim()) return undefined;
  return coreAPI(core).moduleState(OFFICES).table("offices").get(officeId) as
    { title?: string; seats?: number } | undefined;
}

/** An office's title, from the offices engine's table. */
function officeTitle(core: CoreState, officeId: string): string | null {
  return officeRecord(core, officeId)?.title ?? null;
}

/**
 * An office said two ways for the card's sentences: `office`, the title for a
 * race ("won the race for council member"), and `seat`, the seat a person
 * holds in it, which takes "a" when the office's own record holds more than
 * one seat ("a council member") and none when it is the only one ("mayor").
 * An office with no record is said by its title alone.
 */
function officeSlots(
  title: string,
  seats?: number,
): { office: string; seat: string } {
  const office = inSentence(title);
  const seat = (seats ?? 0) > 1 ? `${articleFor(office)} ${office}` : office;
  return { office, seat };
}

/** An office's slots from its record, or null when the record names no office. */
function officeSlotsOf(core: CoreState, officeId: string) {
  const record = officeRecord(core, officeId);
  return record?.title ? officeSlots(record.title, record.seats) : null;
}

/** An employer's name as people say it, from its record (`employerSaid`); null for none. */
function employerOf(core: CoreState, organizationId: string): string | null {
  const org = core.organizations.get(organizationId);
  return org ? employerSaid(organizationName(org), org) : null;
}

/** The offices a person serves in now, by title. */
function servingOffices(core: CoreState, personId: string): string[] {
  return servingTermsOf(coreAPI(core), personId).flatMap((term) => {
    const title = officeTitle(core, term.officeId);
    return title ? [title] : [];
  });
}

/**
 * A person's life as their card tells it, oldest first: one worded line per
 * event the one life reader returns (`lifeOf`: what they were made with, the
 * simulated past and what the engines recorded in play), each on the record
 * that caused it. Never how close the tie to the viewer is (owner, Oct 29). A
 * record whose words the bank cannot fill is left out.
 */
function historyLines(
  core: CoreState,
  viewerId: string,
  other: NonNullable<ReturnType<CoreState["people"]["get"]>>,
) {
  const lines: HistoryLine[] = [];
  // A person met or opened for the first time has their whole past written now,
  // before their schools are read: read first, the school they attend stands
  // on a record the written past replaces (Holt, Minnesota, seed
  // f602ba0f9501e66f: "school.started:<person>:2007", a year no record holds).
  openWholePast(core, other.id);
  const schools = new Map(
    schoolsOf(core, other.id).map((school) => [school.recordId, school]),
  );
  const life = lifeOf(core, other.id);
  const firstSchool = life.find(
    (event) => event.life === "school" && event.what === "started",
  );
  // The day of the first child, for ordering a partner the person was made with.
  const firstChild = life
    .filter((event) => event.life === "child" && event.what === "born")
    .map((event) => event.date)
    .sort()[0];
  // The first school start in each place they lived before this one, where the
  // school is not one the town names; for a relative living elsewhere, in the
  // place they live now as well.
  const far = livesElsewhere(core, other);
  const awayFirst = new Set<string>();
  const awayPlaces = new Set<string>();
  for (const event of life)
    if (
      event.life === "school" &&
      event.what === "started" &&
      !schools.has(event.id) &&
      event.placeId &&
      (far || event.placeId !== other.placeId) &&
      !awayPlaces.has(event.placeId)
    ) {
      awayPlaces.add(event.placeId);
      awayFirst.add(event.id);
    }
  for (const event of life) {
    const line = lineOf(
      core,
      viewerId,
      other,
      event,
      schools,
      firstSchool?.id,
      firstChild,
      awayFirst,
      far,
    );
    if (line) lines.push(line);
  }
  // The school they are at now has no event of its own: the school engine's
  // attended record tells it (a first record later on is the stage they joined at).
  const told = new Set(lines.map((line) => line.recordId));
  for (const school of schools.values())
    if (!told.has(school.recordId))
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
          (line) => line.recordId !== own.id,
        ),
      );
  }
  return lines;
}

/**
 * Who a past partner is to the reader, when the record names them as the
 * other parent of the person's children: "your father" to one of those
 * children, "my children's father" on the player's own card, "his
 * children's mother" to anyone else ("daughter's" or "son's" for one child).
 * Empty
 * when the record names no other parent.
 */
function parentSaid(
  core: CoreState,
  viewerId: string,
  person: {
    readonly id: string;
    readonly looks?: Readonly<Record<string, string>>;
  },
  partnerId: unknown,
): string {
  if (typeof partnerId !== "string" || !partnerId) return "";
  const partner =
    core.people.get(partnerId as PersonId) ??
    core.husks.get(partnerId as PersonId);
  const gender = partner?.looks?.gender;
  const role =
    gender === "male" ? "father" : gender === "female" ? "mother" : "parent";
  const children = [...core.people.values()].filter(
    (child) =>
      (child.pastFacts ?? []).some(
        (fact) =>
          ["family:parent", "family:other-parent"].includes(fact.kind) &&
          fact.facts?.otherPersonId === partnerId,
      ) &&
      (child.pastFacts ?? []).some(
        (fact) =>
          ["family:parent", "family:other-parent"].includes(fact.kind) &&
          fact.facts?.otherPersonId === person.id,
      ),
  );
  if (children.some((child) => child.id === viewerId)) return `your ${role}`;
  const only = children.length === 1 ? children[0]! : undefined;
  const sex = only?.looks?.gender;
  const whose = only
    ? sex === "female"
      ? "daughter's"
      : sex === "male"
        ? "son's"
        : "child's"
    : "children's";
  // Their own children: "my" on the player's card, else his, her or their.
  const own =
    person.id === viewerId
      ? "my"
      : person.looks?.gender === "male"
        ? "his"
        : person.looks?.gender === "female"
          ? "her"
          : "their";
  return `${own} ${whose} ${role}`;
}

/**
 * One life event as a line of the story: the bank's key for its kind and the
 * slots its record can fill. Null for an event the story does not tell (one
 * the bank has no piece for, or whose names its record cannot give).
 */
function lineOf(
  core: CoreState,
  viewerId: string,
  other: NonNullable<ReturnType<CoreState["people"]["get"]>>,
  event: LifeEvent,
  schools: ReadonlyMap<string, { name: string; stage: string; grade: number }>,
  firstSchoolId: string | undefined,
  firstChildDate: string | undefined,
  awayFirst: ReadonlySet<string>,
  /** The person lives elsewhere: their own place is told by name, like any other. */
  far: boolean,
): HistoryLine | null {
  const facts = event.facts ?? {};
  const year = event.date.slice(0, 4);
  const personName = (id: unknown) => {
    const row = typeof id === "string" ? core.people.get(id) : undefined;
    return row ? `${row.givenName} ${row.familyName}` : "";
  };
  const orgName = (id: unknown) =>
    (() => {
      const org = core.organizations.get(String(id ?? ""));
      return org ? organizationName(org) : "";
    })();
  // A place by its name; a person kept at their state's level, by the state's.
  const placeName = (id: unknown) => {
    if (typeof id !== "string") return "";
    const place = corePlaceByJurisdictionId(id as never);
    if (place) return place.displayName;
    const state = coreStateKeyOfJurisdictionId(id);
    const name = state ? coreStateName(state.replace(/^US-/, "")) : null;
    return name ? stateInSentence(name) : "";
  };
  // The other person of a tie, said "you" when it is the viewer.
  const partner = event.withIds[0];
  const partnerName = partner === viewerId ? "you" : personName(partner);
  const make = (
    key: string,
    slots: Record<string, string>,
    extra: Partial<HistoryLine> = {},
  ): HistoryLine => ({
    date: event.date,
    key,
    slots: { year, ...slots },
    recordId: event.id,
    ...extra,
  });
  switch (`${event.life}/${event.what}`) {
    case "partner/partnered":
    case "partner/moved-in": {
      if (!partnerName) return null;
      const home =
        event.what === "partnered" ? "partner.home" : "partner.moved-in";
      // The viewer is the partner's `{name}`, said "you": one key for both.
      const line = make(home, { name: partnerName });
      // A partner the person was made with has only the year the partnership began (its
      // day is the world's opening day), so it is told before the children, never after
      // them by that day: it sorts no later than the first child.
      if (
        event.from === "built" &&
        firstChildDate &&
        firstChildDate < line.date
      )
        line.date = firstChildDate;
      return line;
    }
    case "partner/engaged":
    case "partner/married":
    case "partner/separated": {
      // An earlier partner before the start is a name on the record, never a
      // person in the world until met.
      const name = partnerName || String(facts.partnerName ?? "");
      if (!name) return null;
      // Widowed only where the record says they were married; a partner who
      // died otherwise is lost (Fable A, Nov 13).
      const what =
        facts.ended === "widowed"
          ? facts.union === "married"
            ? "widowed"
            : "died"
          : event.what;
      // The children's other parent is said as who they are to the reader.
      const parent = parentSaid(core, viewerId, other, facts.partnerId);
      return make(
        parent ? `partner.${what}.parent` : `partner.${what}`,
        parent ? { name, parent } : { name },
      );
    }
    case "child/born": {
      const childId = facts.childId ?? partner;
      const name = personName(childId);
      if (!name) return null;
      // A child is born by their first name, inside the family's own story
      // (lead, Nov 11: "Jeremiah was born in 1996.").
      const child = core.people.get(String(childId ?? ""))?.givenName ?? name;
      return make(childId === viewerId ? "child.you" : "child.born", {
        name,
        child,
      });
    }
    case "loss/died": {
      // A parent's death, from the fact (a name and a relation); a death in play, from the
      // dead person's record and how they were related.
      const dead = core.people.get(String(partner ?? ""));
      const relation = String(
        facts.relation ??
          familyFactsOf(other).get(partner as PersonId)?.relation ??
          "",
      ).toLowerCase();
      const name =
        [facts.givenName, facts.familyName].filter(Boolean).join(" ") ||
        (dead ? `${dead.givenName} ${dead.familyName}` : "");
      if (!name) return null;
      return relation
        ? make("loss.parent", { relation, name })
        : make("loss.died", { name });
    }
    case "death/died":
      // The person's own death, last in their story; the sentence waits for Story's pieces
      // (a line with no piece is not told).
      return make("death.died", { cause: String(facts.causeOfDeath ?? "") });
    case "school/started": {
      const school = schools.get(event.id);
      if (school)
        return make(school.grade > 0 ? "school.joined" : "school.started", {
          school: school.name,
          stage: school.stage,
        });
      // Schooled before they lived here, in a place the moves give: one
      // sentence for the years there; where the place is not known, the
      // stage lines below.
      const away = placeName(event.placeId);
      if (away && awayFirst.has(event.id))
        return make("school.elsewhere", { place: away });
      if (away && event.placeId !== other.placeId) return null;
      // Each stage of school after the first is its own line (the first is
      // the line that names the school).
      // A stage whose school has a record of its own is told with its name,
      // when that is not the school the story has named already.
      const stageSchool = orgName(facts.schoolId);
      const namedAlready = [...schools.values()].some(
        (row) => row.name === stageSchool,
      );
      if (
        facts.stage &&
        event.id !== firstSchoolId &&
        stageSchool &&
        !namedAlready
      )
        return make("school.joined", {
          school: stageSchool,
          stage: String(facts.stage),
        });
      return facts.stage && event.id !== firstSchoolId
        ? make("school.stage", { stage: facts.stage })
        : null;
    }
    case "school/honor":
      return make("school.honor", {});
    case "school/finished": {
      const school = orgName(facts.schoolId);
      return school && facts.passed !== "false"
        ? make("school.finished", { school })
        : null;
    }
    // College before the start (the school pass's records): the fall it
    // began, and its end, a bachelor's or the years without one.
    case "school/college-started":
      return make("school.college", {});
    case "school/college-ended":
      return make(facts.degree ? "school.degree" : "school.college-left", {});
    // Service before the start: the day they enlisted and the day they left.
    case "service/enlisted":
    case "service/discharged":
      return make(`service.${event.what}`, {});
    case "work/job-started": {
      const employer = orgName(facts.organizationId);
      if (!employer) {
        // A new job a relative took far away, in play: the record keeps no employer.
        if (event.from === "played" && facts.how) return make("work.found", {});
        // Work still held on day one by someone living elsewhere: when it began.
        if (!facts.endedAt) return far ? make("work.found", {}) : null;
        // Work where the town keeps no employer (another place, before they came here):
        // told by the place and the length, never by a name.
        const days = daysBetween(
          makeIsoDate(String(facts.startedAt ?? event.date)),
          makeIsoDate(String(facts.endedAt)),
        );
        const away = placeName(event.placeId);
        // "Before coming here" is never said of someone who lives elsewhere.
        if (!away && far) return null;
        return make(
          away ? "work.elsewhere" : "work.elsewhere-plain",
          away
            ? { place: away, span: spanSaid(days) }
            : { here: placeName(other.placeId), span: spanSaid(days) },
          { days },
        );
      }
      const began = facts.startedAt ?? event.date;
      return {
        ...make("work.spell", { employer }),
        date: began,
        slots: { year: began.slice(0, 4), employer },
      };
    }
    case "work/job-ended": {
      // A job that ended in play says how: left, retired or closed with the employer.
      // A move away is told by the move.
      const how = facts.ended;
      if (how === "moved") return null;
      const employer = orgName(facts.organizationId);
      // How long they were out, when the record holds both ends.
      if (!how)
        return facts.startedAt && facts.endedAt
          ? make("work.out-for", {
              span: spanSaid(
                daysBetween(
                  makeIsoDate(String(facts.startedAt)),
                  makeIsoDate(String(facts.endedAt)),
                ),
              ),
            })
          : make("work.out", {});
      if (how === "retired" && !employer) return make("work.retired-plain", {});
      return employer && ["quit", "retired", "closed"].includes(how)
        ? make(`work.${how}`, { employer })
        : null;
    }
    case "work/job-lost": {
      const employer = orgName(facts.organizationId);
      return employer
        ? make("work.job-lost", { employer })
        : make("work.job-lost-plain", {});
    }
    case "move/moved-in": {
      // Someone living elsewhere moved to where they live, not to the county.
      if (far) {
        const place = placeName(facts.toPlaceId);
        return place
          ? make("moved.away-to", { place })
          : make("moved.away", {});
      }
      // Where they came to: the town they live in now.
      const here = placeName(other.placeId);
      return here ? make("moved.in", { here }) : null;
    }
    case "move/moved-home":
      return make("moved.home", {});
    // A move to another home in the same county before the start.
    case "move/moved-within": {
      const place = placeName(facts.toPlaceId);
      return place ? make("moved.within", { place }) : null;
    }
    case "move/moved-away": {
      const place = placeName(facts.toPlaceId);
      return place ? make("moved.away-to", { place }) : make("moved.away", {});
    }
    case "health/serious-illness":
      return make("health.ill", {});
    case "health/hospital-stay":
      return make("health.hospital", {});
    // An arrest before play is said as the arrest it is: the record holds no
    // charge (Fable A, Nov 13: "say what the record holds").
    case "law/arrested":
      return make("law.arrested", {});
    // The justice engine's accusation names its offense on the record.
    case "law/accused":
      return typeof facts.offense === "string"
        ? make("law.accused", { offense: facts.offense })
        : null;
    case "law/victim":
    case "law/charged":
    case "law/convicted":
    case "law/imprisoned":
    case "law/released":
      return make(`law.${event.what}`, {});
    case "home/bought":
      return make("home.bought", {});
    case "home/evicted":
      return make("home.evicted", {});
    case "home/damaged":
      return make("home.damaged", {});
    case "business/founded":
    case "business/closed": {
      const employer = orgName(facts.organizationId);
      return employer ? make(`business.${event.what}`, { employer }) : null;
    }
    case "politics/won": {
      if (!facts.office) return null;
      const office = String(facts.office).replace(/-/g, " ");
      const said = officeSlots(office);
      // The term that election won, when they serve in it now: its first day,
      // and the seat as its office record counts it.
      const term = servingTermsOf(coreAPI(core), other.id).find(
        (row) =>
          row.startDate >= event.date &&
          officeSlotsOf(core, row.officeId)?.office === said.office,
      );
      const line = make(
        "office.elected",
        (term && officeSlotsOf(core, term.officeId)) ?? said,
      );
      if (term) line.start = term.startDate;
      return line;
    }
    case "politics/lost":
      return facts.office
        ? make("office.lost", {
            office: inSentence(String(facts.office).replace(/-/g, " ")),
          })
        : null;
    case "politics/lost-primary":
      return facts.office
        ? make("office.lost-primary", {
            office: inSentence(String(facts.office).replace(/-/g, " ")),
          })
        : null;
    case "work/pay-raised":
      return make("work.raised", {});
    case "politics/took-office": {
      // The office a President held before is told under their name, not here.
      if (event.record === "career:prior-office") return null;
      const office =
        officeSlotsOf(core, String(facts.officeId ?? "")) ??
        (facts.office
          ? officeSlots(String(facts.office).replace(/-/g, " "))
          : null);
      if (!office) return null;
      // By how they reached it; a seat whose way in the records do not say is told as
      // taking office.
      return make(
        facts.reached === "appointed"
          ? "office.appointed"
          : facts.reached === "elected"
            ? "office.elected"
            : "office.entered",
        office,
      );
    }
    case "politics/filed":
      return facts.office
        ? make("office.filed", { office: inSentence(String(facts.office)) })
        : null;
    case "politics/left-office": {
      const office = officeSlotsOf(core, String(facts.officeId ?? ""));
      return office ? make("office.left", office) : null;
    }
    default:
      return null;
  }
}

interface HistoryLine {
  date: string;
  key: string;
  slots: Record<string, string>;
  recordId: string;
  /** The days a stretch of work elsewhere lasted, summed when its spells are joined. */
  days?: number;
  /** The day the term an office line tells began, when it is not the line's own day (an election in November, a term in January). */
  start?: string;
}

/** Office titles read in running text: the one wording the journal shares. */
const inSentence = officeInSentence;

/**
 * One of a kind's wordings for a record, by the English engine's own stable
 * pick for that record (the same record reads the same each time the card
 * opens), passing over any the story has used and any whose slots the record
 * cannot fill.
 */
function pickWay(
  ways: readonly string[],
  used: ReadonlySet<string>,
  recordId: string,
  slots: Readonly<Record<string, string>>,
  part = "",
): { key: string; text: string } | null {
  return screenPick(
    "person-history",
    ways.filter((key) => !used.has(key)),
    slots,
    { momentKey: `${recordId}${part}`, sourceIds: [recordId] },
  );
}

/** Who a card's story is about, and the form its sentences take. */
interface Teller {
  /** Said of someone (third person), in the they form, or to the player of their own life. */
  readonly form: "third" | "they" | "you" | "first";
  /** Their full name, said in the story's first sentence. */
  readonly name: string;
  /** Their recorded pronouns, for the third-person form. */
  readonly words: PronounWords | null;
  /** Their birth date, for the age a sentence opens on ("At 14, ..."). */
  readonly born?: string;
}

/** The teller for one person's card, as the viewer reads it. */
function tellerOf(
  viewerId: string,
  personId: string,
  name: string,
  pronouns: string | undefined,
  born?: string,
): Teller {
  const birth = born ? { born } : {};
  if (viewerId === personId)
    return { form: "you", name, words: null, ...birth };
  const words = pronounWords(pronouns);
  return { form: words ? "third" : "they", name, words, ...birth };
}

/**
 * The earlier line of work elsewhere that `line` continues: the same place (or
 * both of unknown place), with no move between them.
 */
function lastElsewhere(
  folded: readonly (HistoryLine & { later?: string[] })[],
  line: HistoryLine,
) {
  if (!line.key.startsWith("work.elsewhere")) return undefined;
  for (let i = folded.length - 1; i >= 0; i--) {
    const held = folded[i]!;
    if (held.key === "moved.in") return undefined;
    if (held.key === line.key && held.slots.place === line.slots.place)
      return held;
  }
  return undefined;
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
 * and one school is said once. A year is said only where a bank piece has a slot for it.
 */
function tellHistory(lines: readonly HistoryLine[], teller: Teller) {
  // Terms in the same office, one after another, fold into the first.
  // By date; on the same day a partner is told before a child (a partner the person was
  // made with carries no day of its own and is placed on the first child's).
  const partnerFirst = (line: HistoryLine) =>
    line.key.startsWith("partner.") ? 0 : 1;
  const sorted = [...lines].sort(
    (a, b) => a.date.localeCompare(b.date) || partnerFirst(a) - partnerFirst(b),
  );
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
    // Work elsewhere in one place, one spell after another with no move between,
    // is one sentence with the years summed.
    const elsewhere = lastElsewhere(folded, line);
    if (elsewhere && line.days !== undefined) {
      elsewhere.days = (elsewhere.days ?? 0) + line.days;
      elsewhere.slots.span = spanSaid(elsewhere.days);
      (elsewhere.later ??= []).push(line.recordId);
      continue;
    }
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
  // More than two jobs are one sentence, never a list of facts: the earlier employers as a
  // spoken list, then the job held now or last. It stands where the first job stood and
  // names every job's record.
  const spells = folded.filter((line) => line.key === "work.spell");
  const last = spells.at(-1);
  const earlier = [
    ...new Set(
      spells
        .slice(0, -1)
        .map((line) => line.slots.employer!)
        .filter((employer) => employer !== last?.slots.employer),
    ),
  ];
  if (spells.length > 2 && last && earlier.length) {
    const first = spells[0]!;
    const records = spells.flatMap((line) => [
      line.recordId,
      ...(line.later ?? []),
    ]);
    first.key = "work.history";
    first.slots = {
      year: last.date.slice(0, 4),
      employers: joinList(earlier, "and"),
      employer: last.slots.employer!,
    };
    first.recordId = last.recordId;
    first.later = records.filter((id) => id !== last.recordId);
    delete first.again;
    for (const line of spells.slice(1)) folded.splice(folded.indexOf(line), 1);
  }
  // The player's own life is told in the first person (the bank's `.i` pieces).
  const voice = teller.form === "you" ? "i" : teller.form;
  const said = new Set<string>();
  let named = false;
  // Each kind has several wordings; a story never uses one twice, and a kind
  // told before is told the second time as a second time ("again").
  const used = new Set<string>();
  const kinds = new Set<string>();
  // A screen tells the story in paragraphs by kind (`lifeGroups`), so the
  // line before is the one before in the same paragraph.
  const groupOf = (kind: string) =>
    controls.lifeGroups.findIndex((kinds) => kinds.includes(kind));
  const before = new Map<
    number,
    { year: string; when: string | undefined; framed: boolean }
  >();
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
    const form = first ? "third" : voice;
    const slots = {
      ...line.slots,
      ...(line.again?.length ? { years: joinList(line.again, "and") } : {}),
      who: first ? teller.name : (teller.words?.subject ?? ""),
      whom: first ? teller.name : (teller.words?.object ?? ""),
      their: teller.words?.possessive ?? (first ? "their" : ""),
    };
    // A kind said the same in every form (a child born, by name) keeps one
    // set of wordings under `.any`.
    const waysOf = (kind: string) => {
      const own = screenWays(
        "person-history",
        `person-history.story.${kind}.${form}`,
      );
      return own.length
        ? own
        : screenWays("person-history", `person-history.story.${kind}.any`);
    };
    const second = kinds.has(again) ? waysOf(`${again}-second`) : [];
    const ways = second.length ? second : waysOf(again);
    const wording = pickWay(ways, used, line.recordId, slots);
    if (!wording) return [];
    used.add(wording.key);
    kinds.add(again);
    let text = wording.text;
    // A sentence that says no time of its own opens on one: the year, the
    // same year as the line before, or their age then.
    const year = line.date.slice(0, 4);
    const group = groupOf(line.key.split(".")[0]!);
    const last = before.get(group);
    const lastYear = last?.year;
    const lastWhen = last?.when;
    let framed = false;
    let whenKey: string | undefined;
    // Not after a line that opened on a time, unless a year or more went by,
    // and never on a sentence that says how long ("worked for seven years").
    const gap = lastYear ? Number(year) - Number(lastYear) : Infinity;
    const frame =
      !/\{(?:years?|span)\}/.test(partText("person-history", wording.key)) &&
      (!last?.framed || gap > 1);
    if (frame) {
      // Their age then, for what a person does at an age (school, a move,
      // work); a partner or a child is told by the year.
      const aged = ["school", "moved", "work"].includes(again.split(".")[0]!);
      const age =
        aged && teller.born && line.date > teller.born
          ? ageInYears(teller.born, line.date)
          : undefined;
      const whens = (
        year === lastYear
          ? ["person-history.when.same-year"]
          : [
              "person-history.when.year",
              // Only after the first sentence: "Then in 2008, ...".
              ...(lastYear !== undefined
                ? [
                    "person-history.when.then-year",
                    "person-history.when.later-year",
                  ]
                : []),
              ...(age !== undefined && age > 0
                ? ["person-history.when.age", "person-history.when.age-years"]
                : []),
            ]
      ).filter((key) => key !== lastWhen);
      const when = pickWay(
        whens,
        new Set(),
        line.recordId,
        { year, age: String(age ?? "") },
        ":when",
      );
      if (when) {
        // The engine's one joiner: the opening's stop becomes a comma and
        // the sentence goes on in lower case, unless it opens on a name.
        text = framedByAge(
          { text: when.text, sourceRecordIds: [line.recordId] },
          { text, sourceRecordIds: [line.recordId] },
          first ? { name: { text: teller.name } } : {},
        ).text;
        whenKey = when.key;
        framed = true;
      }
    }
    before.set(group, { year, when: whenKey ?? lastWhen, framed });
    // The story names them in the first sentence that says who it is about.
    if (first && partText("person-history", wording.key).includes("{who}"))
      named = true;
    // The kind of record (born, school, work, office...) picks the
    // group a screen tells it in: the key's first part.
    return [
      {
        date: line.date,
        text,
        kind: line.key.split(".")[0],
        recordId: line.recordId,
        // Every record the sentence tells: a run's later terms too.
        records: [line.recordId, ...(line.later ?? [])],
        // The bank piece that worded it, so a story can be checked for variety.
        piece: wording.key,
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
  // Nobody at home earns: said by who lives there, as the player calls them
  // ("your mother", "your brother"), from the household and family records.
  const kin = (household?.memberIds ?? [])
    .filter((id) => id !== person.id && core.people.get(id)?.alive)
    .map((id) => relationWord(core, id, relationOf(id)))
    .filter((word): word is string => !!word);
  // Each relation once, in the plural where there are more than one ("your
  // daughters"), in the order the household lists them.
  const said = [...new Set(kin)].map((word) =>
    kin.filter((other) => other === word).length > 1
      ? `your ${word.endsWith("child") ? `${word}ren` : `${word}s`}`
      : `your ${word}`,
  );
  const others = (household?.memberIds ?? []).filter(
    (id) => id !== person.id && core.people.get(id)?.alive,
  ).length;
  // When their last job ended, from the job records: the fact a line about
  // living alone with no job is about. No job on record, no line.
  const lastJobEnded = [...core.jobs.values()]
    .filter((job) => job.personId === person.id && job.endsAt)
    .map((job) => job.endsAt!)
    .sort()
    .at(-1);
  const text =
    others && kin.length === others
      ? screenLine(
          "person-history",
          "person-history.summary.no-work.none.you",
          {
            kin: joinList(said, "or"),
          },
        )
      : !others && lastJobEnded
        ? screenLine(
            "person-history",
            "person-history.summary.no-work.alone.you",
            { month: monthWords(lastJobEnded) },
          )
        : null;
  return text ? { text, recordIds: household ? [household.id] : [] } : null;
}

/** A run of terms in one office, as a card's header and lines under the name read it. */
interface OfficeRun {
  readonly office: string;
  /** The office said as the seat held in it: "a council member", "mayor". */
  readonly seat: string;
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
    readonly work?: {
      title: string | null;
      employer: string | null;
      /** The town they live in, when their work is outside it. */
      outside?: string | null;
    } | null;
    readonly school?: string | null;
    readonly place?: string | null;
    readonly born?: { year: string; place: string | null } | null;
    /** The office held before this one, from a President's record: its kind and state. */
    readonly before?: { kind: string; state: string; year: string } | null;
  },
): string[] {
  const you =
    teller.form === "you" ? ".you" : teller.form === "first" ? ".first" : "";
  const line = (key: string, slots: Record<string, string>) =>
    screenLine("person-history", `person-history.summary.${key}${you}`, slots);
  const office = now.office
    ? line(
        now.office.terms > 1 && now.office.wonAgain
          ? "office.run"
          : "office.one",
        {
          office: now.office.office,
          seat: now.office.seat,
          year: now.office.since.slice(0, 4),
        },
      )
    : null;
  // Their job, from the same record the journal reads (`personWorkOf`): told
  // beside an office they hold too, never in place of it.
  const work = now.work?.outside
    ? line("work.outside", { place: now.work.outside })
    : now.work?.employer
      ? now.work.title
        ? line("work.title", {
            // One person's job, with its article: "an aide", "a carpenter".
            title: withArticle(now.work.title),
            employer: now.work.employer,
          })
        : line("work.employer", { employer: now.work.employer })
      : null;
  const role =
    office || work
      ? null
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
  // The office before, told as what they were when the election was won.
  const before = now.before
    ? line(`before.${now.before.kind}`, {
        state: now.before.state,
        year: now.before.year,
      })
    : null;
  return [office, work, role, before, born].filter(
    (text): text is string => !!text,
  );
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
    // The seat as the run's own office record counts it.
    seat: terms[0]!.slots.seat ?? said,
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

// Engineering band for the leanings: a lean under it is not said; one past
// the second is said as strong. Display wording only, never a choice.
const SKETCH_SAID = 0.15;
const SKETCH_STRONG = 0.5;

/**
 * The leanings a person is said to have, strongest first, each by the pole's
 * own label and how strong it runs. No sentence goes beside the label: one
 * that only said the label again in other words was deleted (Fable A on
 * #7365, Nov 12, under the owner's Nov 11 ruling that every line comes from
 * the world's records). A line comes back only where a record shows the
 * leaning.
 */
function leanings(
  traits: Readonly<Record<string, number>>,
): { label: string; strength: "strong" | "mild" }[] {
  return PEOPLE_TRAITS.flatMap((trait) => {
    const value = traits[`${PEOPLE_MIND_VERSION}:${trait}`];
    if (value === undefined || Math.abs(value) < SKETCH_SAID) return [];
    const shape = TRAIT_SHAPES[trait];
    const side = value < 0 ? shape.low : shape.high;
    const strength: "strong" | "mild" =
      Math.abs(value) >= SKETCH_STRONG ? "strong" : "mild";
    return [{ label: side.label, strength, weight: Math.abs(value) }];
  })
    .sort((a, b) => b.weight - a.weight)
    .map(({ label, strength }) => ({ label, strength }));
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
  const office = term ? officeSlotsOf(core, term.officeId) : null;
  const start = known?.serviceStart ?? term?.startDate;
  return start && office
    ? [
        {
          date: start,
          key: "office.entered",
          slots: { year: start.slice(0, 4), ...office },
          recordId: known?.serviceStart ? personId : term!.id,
        },
      ]
    : [];
}

/** An official's own lines: each term they won or were given (the birth is under their name). */
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
  for (const row of rows.filter(same)) {
    const office = officeSlotsOf(core, row.officeId);
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
      slots: { year: row.startDate.slice(0, 4), ...office },
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
    | {
        title?: string;
        governmentName?: string;
        jurisdiction?: string;
        seats?: number;
      }
    | undefined;
  // The government by its place record's proper name ("City of McCall").
  const government = office?.governmentName
    ? governmentProperName(office.governmentName, office.jurisdiction ?? "")
    : null;
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
              ...officeSlots(office.title, office.seats),
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
    placeName: government,
    school: null,
    work: office?.title ? { title: office.title, employer: government } : null,
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
  // What they do: one reader for the card, the journal and Travel.
  const job = personWorkOf(core, otherId).job;
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
    other.birthDate,
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
  // Born where they lived the day they were born: someone the moves pass
  // brought to the county was born where they came from, as the run's birth
  // record says, never in the town they later moved to (Fable A, Nov 13:
  // "born in Angoon" and then "moved to Angoon"). The opening's birthplace
  // fact is the town they live in now (SG-HIST-birthplace-is-home).
  const birthplace = (other.pastFacts ?? []).find(
    (row) => row.kind === "birthplace",
  );
  const bornAt = residenceOn(core, other, other.birthDate).placeId;
  const bornId =
    bornAt !== other.placeId
      ? bornAt
      : typeof birthplace?.facts?.placeId === "string"
        ? birthplace.facts.placeId
        : null;
  // A place by its name; a place the world keeps only at its state's level, by the state's.
  const bornState = bornId ? coreStateKeyOfJurisdictionId(bornId) : null;
  const bornStateName = bornState
    ? coreStateName(bornState.replace(/^US-/, ""))
    : null;
  const bornIn = bornId
    ? (corePlaceByJurisdictionId(bornId as never)?.displayName ??
      (bornStateName ? stateInSentence(bornStateName) : null))
    : null;
  const run = officeRunOf(lines, servingOffices(core, otherId)[0]);
  // The office a President held before, from their record.
  const prior = (other.pastFacts ?? []).find(
    (row) => row.kind === "career:prior-office",
  )?.facts;
  // The year they won the office they hold now, from the same record.
  const elected = (other.pastFacts ?? []).find(
    (row) => row.kind === "campaign:elected",
  )?.facts?.year;
  const priorOffice =
    run && typeof prior?.office === "string"
      ? {
          kind: prior.office,
          // Only the lines that name the year need it; the others say "before that".
          year: typeof elected === "string" ? elected : "",
          state:
            typeof prior.stateKey === "string"
              ? (coreStateName(prior.stateKey.replace(/^US-/, "")) ?? "")
              : "",
        }
      : null;
  const summaryNow = {
    office: run,
    // Their work, as the story already tells it of anyone.
    work: job
      ? core.organizations.get(job.organizationId)?.outsideFlow
        ? // The market's stand-in for work out of town is no employer: they
          // work outside the town they live in.
          { title: null, employer: null, outside: homePlace }
        : {
            title: job.title,
            // The employer as people say it: a government's treasury is the
            // government ("the Town of Smithtown"), never its ledger's name.
            employer: employerOf(core, job.organizationId),
          }
      : null,
    school: school?.name ?? null,
    place: homePlace,
    born: { year: other.birthDate.slice(0, 4), place: bornIn },
    before: priorOffice,
  };
  return {
    personId: otherId,
    name,
    // Who they are now and where they come from, under the name.
    summary: summaryOf(teller, summaryNow),
    // The player's own lines in their own voice, for the You screen.
    summaryFirst:
      teller.form === "you"
        ? summaryOf({ ...teller, form: "first" }, summaryNow)
        : [],
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
    // Their leanings, each by the pole's own label and no strength: how the
    // viewer sees them (the approved person card), only for someone the
    // viewer knows: family, a housemate or anyone the player has a tie with.
    traitLines:
      family || housemate || tie
        ? leanings(other.traits).map(({ label }) => ({ label }))
        : [],
    // Where they place themselves politically, as the views engine's label, once the viewer has
    // learned it: an official's or candidate's public stance is learned by everyone; anyone
    // else's only through what the player was told (the knowledge key a conversation or news
    // writes). Until then the card says the viewer does not know yet.
    ...(() => {
      const learned =
        Boolean(publicKnowledge?.positions?.length) ||
        Boolean(coreAPI(core).knows(viewerId, viewKey(otherId)));
      const label =
        learned && core.modules.has(VIEWS_MODULE_ID)
          ? (viewOf(coreAPI(core), otherId as PersonId)?.label ?? null)
          : null;
      // The question they care most about, once a talk has told it: worded
      // by the English engine's question names, from the key the talk wrote.
      const question = label
        ? coreAPI(core).knows(viewerId, viewQuestionKey(otherId))?.value
        : undefined;
      const about = question ? questionAbout(String(question)) : null;
      return { view: label, viewUnknown: !label, viewAbout: about };
    })(),
    // Their pronouns as words, for the headings on their card (she, her, Her); null for they.
    pronouns: teller.words,
    work:
      (family || housemate || coworker) && job
        ? core.organizations.get(job.organizationId)?.outsideFlow
          ? { title: job.title, employer: undefined }
          : {
              title: job.title,
              employer: employerOf(core, job.organizationId),
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
            ? (() => {
                const org = core.organizations.get(row.recordId);
                return org ? organizationName(org) : null;
              })()
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
    // Their bust for the talk box: the same face the People map draws.
    face,
  };
}
