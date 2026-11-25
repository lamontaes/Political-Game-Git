import type { EntityId } from "../core2/kernel/brands";
import { lifeOf, openWholePast } from "../core2/modules/people";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { spoken, stateInSentence } from "../director/words";
import type { GroundedEnglishFact } from "../english/grounded-english";
import { tell, type TellingInput } from "../english/outline-planner";
import type { CoreState, PersonId } from "../core2/types";
import { governmentMap } from "./map";
import { coreAPI } from "../core2/state";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { townSeats } from "../core2/modules/offices";
import { centuryOf, historyMode } from "../core2/electorate-century";
import { ageOnDate } from "../core2/kernel/dates";
import { jobTitleByKind } from "../core2/person-work";
import { sayableJobTitle } from "../english/said-as";
import { withArticle } from "../english/journal-words";
import { employerWords } from "../director/words";
import { schoolsAttended } from "../core2/past-school";

/** The year a section of the loading story is shown at, by the fact that dates it. */
const SECTION_YEAR: Readonly<Record<string, string>> = {
  born: "born-year",
  school: "school-year",
  moved: "moved-year",
  finished: "finished-year",
  college: "college-year",
  job: "first-job-year",
  lost: "lost-year",
  now: "start-year",
};

/**
 * The player's life as the loading card tells it (owner, Nov 23, P5 and P6:
 * "a little sarcastic", "It's still not written as a story"): the outline
 * row `loading-story` told from the player's own life records (lifeOf), each
 * sentence shown at its record's year. Nothing is said that the records do
 * not hold.
 */
export function loadingTelling(
  core: CoreState,
  playerId: string,
): TellingInput | null {
  const person = core.people.get(playerId);
  if (!person) return null;
  // The whole past is written before it is read, as the person card writes
  // it, so the story cites the records the card shows (writing it replaces
  // the records a partial past stood on).
  openWholePast(core, playerId as PersonId);
  const events = lifeOf(core, playerId as PersonId);
  const facts: Record<string, GroundedEnglishFact> = {};
  const put = (key: string, text: string, id: string) => {
    facts[key] ??= { text, sourceRecordIds: [id as EntityId] };
  };
  const yearOf = (date: string) => date.slice(0, date.indexOf("-"));
  const placeSaid = (id: string | undefined) => {
    const place = id ? corePlaceByJurisdictionId(id as never) : undefined;
    return place ? spoken(place) : undefined;
  };
  // The day each part of the life began, for reading who held the White
  // House then (presidencyParty below).
  const days: Record<string, { date: string; id: string }> = {};
  for (const event of events) {
    const at = `${event.life}/${event.what}`;
    if (at === "born/born") {
      put("born-year", yearOf(event.date), event.id);
      days.born ??= { date: event.date, id: event.id };
    }
    if (at === "school/started" && !facts["school-year"]) {
      const where = placeSaid(event.placeId);
      if (where) {
        days.school ??= { date: event.date, id: event.id };
        put("school-year", yearOf(event.date), event.id);
        put("school-place", where, event.id);
      }
    }
    if (at === "move/moved-in" && !facts["moved-year"]) {
      const from = placeSaid(String(event.facts?.fromPlaceId ?? ""));
      const to = placeSaid(String(event.facts?.toPlaceId ?? ""));
      if (from && to && from !== to) {
        days.moved ??= { date: event.date, id: event.id };
        put("moved-year", yearOf(event.date), event.id);
        put("moved-from", from, event.id);
        put("moved-to", to, event.id);
        if (String(event.facts?.pushedBy ?? "").startsWith("economy"))
          put("moved-for-work", "yes", event.id);
      }
    }
    if (at === "school/finished")
      put("finished-year", yearOf(event.date), event.id);
    if (at === "school/college-started") {
      put("college-year", yearOf(event.date), event.id);
      if (facts["finished-year"]?.text === yearOf(event.date))
        put("college-same-year", "yes", event.id);
    }
    if (at === "politics/lost" && event.facts?.office) {
      put("lost-year", yearOf(event.date), event.id);
      put("lost-office", String(event.facts.office).toLowerCase(), event.id);
      if (event.facts.votes)
        put(
          "lost-votes",
          Number(event.facts.votes).toLocaleString("en-US"),
          event.id,
        );
      if (event.facts.winnerVotes)
        put(
          "winner-votes",
          Number(event.facts.winnerVotes).toLocaleString("en-US"),
          event.id,
        );
      // The race came in the year they finished high school or started college.
      if (facts["finished-year"]?.text === yearOf(event.date))
        put("lost-same-year-as-school", "yes", event.id);
      if (facts["college-year"]?.text === yearOf(event.date))
        put("lost-same-year-as-college", "yes", event.id);
    }
  }
  // The first school's name, from the school engine's own records, where it
  // names one (a school with no name leaves the fact out).
  const firstSchool = schoolsAttended(core, playerId)[0];
  if (firstSchool?.name)
    put("school-name", firstSchool.name, firstSchool.recordId);
  // The family moved before the child started school: the school's own
  // start came at the new home, so the move is part of why it is where it is.
  if (days.moved && days.school && days.moved.date < days.school.date)
    put("moved-before-school", "yes", days.moved.id);
  // The first job, from the jobs module's earliest hire row for this
  // person (the same table `lastLayoff` reads for the office-hours scene).
  if (core.modules.has(JOBS_MODULE_ID)) {
    const hires = (
      coreAPI(core)
        .moduleState(JOBS_MODULE_ID)
        .table("changes")
        .query("byPerson", [playerId]) as unknown as {
        id: string;
        date: string;
        kind: string;
        organizationId: string;
      }[]
    )
      .filter((row) => row.kind === "hire" && row.date <= core.date)
      .sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id));
    if (hires[0]) {
      put("first-job-year", yearOf(hires[0].date), hires[0].id);
      // The first employer's name, said as the world says an employer, where
      // the organization still has a record to say it from.
      const first = core.organizations.get(hires[0].organizationId as never);
      const said = first ? employerWords(first) : null;
      if (said) put("first-employer", said, first!.id);
    }
  }
  // Who held the White House when each part of the life began, from the
  // history the world ran from 1925 (the century's presidency rows). The
  // century holds a party and no name, so the story says the party. A fact
  // is set only where the century ran that election.
  for (const [part, day] of Object.entries({
    ...days,
    start: { date: core.date, id: person.householdId },
  })) {
    const held = presidencyParty(core, day.date);
    if (held) {
      put(`${part}-president-party`, held.party, held.rowId);
      if (held.again) put(`${part}-party-again`, "yes", held.rowId);
    }
  }
  // The parties of the governor and of the town's U.S. Representative at the
  // opening, from the offices engine's seats (each fact cites its term row),
  // and whether the governor's party is the White House's.
  if (core.modules.has("core2-offices-v1")) {
    const seats = townSeats(coreAPI(core));
    const heldBy = (kind: string) =>
      seats.find((row) => row.office.kind === kind && row.holder?.party)
        ?.holder;
    const governor = heldBy("governor");
    if (governor) put("governor-party", governor.party as string, governor.id);
    const house = heldBy("us-house");
    if (house) put("us-house-party", house.party as string, house.id);
    const white = facts["start-president-party"];
    if (governor && white)
      put(
        governor.party === white.text
          ? "governor-matches-white-house"
          : "governor-differs-from-white-house",
        "yes",
        governor.id,
      );
  }
  // Where the life stands on the opening day (W7, 7139682521 on #9750: the
  // "now" section needs facts that differ between lives): the job held and
  // its employer, from the job and organization records; who else lives in
  // the household, from its members; and how long the household has lived
  // in its place, from the household's move-in day.
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (job && org && !(job.endsAt && job.endsAt <= core.date)) {
    const title = jobTitleByKind(job.title, org.name);
    if (sayableJobTitle(title)) put("job-now", withArticle(title), job.id);
    const employer = employerWords(org);
    if (employer) put("employer-now", employer, org.id);
  } else put("no-job-now", "yes", playerId);
  const household = core.households.get(person.householdId);
  if (household) {
    const others = household.memberIds
      .filter((id) => id !== playerId)
      .map((id) => core.people.get(id))
      .filter((row) => !!row && row.alive !== false);
    if (!others.length) put("lives-alone", "yes", household.id);
    // Ages only: the household's records hold no kinship, so a line says
    // "older" or "younger", never "parents".
    if (others.some((row) => ageOnDate(row!.birthDate, core.date) < 18))
      put("lives-with-younger", "yes", household.id);
    if (
      others.some(
        (row) =>
          ageOnDate(row!.birthDate, core.date) >=
          ageOnDate(person.birthDate, core.date) + 16,
      )
    )
      put("lives-with-older", "yes", household.id);
    // The household's move-in day, unless the life's own records already
    // put the player in this place before it (schooled here earlier, or a
    // move on record in another year): the story never says two things
    // about when the life came here.
    const since = household.since;
    const schooledHereBefore =
      !!since &&
      facts["school-place"]?.text === placeSaid(person.placeId) &&
      (facts["school-year"]?.text ?? "") < yearOf(since);
    const movedOtherYear =
      !!since &&
      !!facts["moved-year"] &&
      facts["moved-year"].text !== yearOf(since);
    if (since && since < core.date && !schooledHereBefore && !movedOtherYear) {
      put("here-since-year", yearOf(since), household.id);
      const years = ageOnDate(since, core.date);
      if (years < 2) put("new-here", "yes", household.id);
      else if (years >= 10) put("long-here", "yes", household.id);
    }
  }
  const home = corePlaceByJurisdictionId(person.placeId as never);
  put("start-year", yearOf(core.date), person.householdId);
  put(
    "start-month",
    new Date(`${core.date}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      timeZone: "UTC",
    }),
    person.householdId,
  );
  if (home) {
    put("place", spoken(home), person.householdId);
    if (home.withinName)
      put("state", stateInSentence(home.withinName), person.householdId);
  }
  return {
    kind: "loading-story",
    facts,
    momentKey: `loading:${playerId}`,
    worldSeed: core.seed,
    sourceRecordIds: [playerId as EntityId],
    knower: playerId as EntityId,
    traits: {},
  };
}

/**
 * The party in the White House on a day, and whether it had held it a term or
 * more before that (the party's straight terms, never said as a count), from
 * the century's presidency row whose term spans the day. Nothing where the
 * world did not run the century ("today" history) or the day falls outside it.
 */
function presidencyParty(
  core: CoreState,
  date: string,
): { party: string; again: boolean; rowId: string } | null {
  if (historyMode(core.seed) !== "century") return null;
  const row = centuryOf(core.seed, core.startedAt).presidencies.find(
    (r) => r.termStart <= date && date < r.termEnd,
  );
  return row
    ? { party: row.winnerParty, again: row.partyTerms > 1, rowId: row.id }
    : null;
}

/** Each sentence of the told loading story, at its record's year. */
function toldLife(
  core: CoreState,
  playerId: string,
): { year: number; text: string; recordId: string }[] {
  const input = loadingTelling(core, playerId);
  if (!input) return [];
  const { facts } = input;
  const told = tell(input);
  return (told?.sentences ?? []).map((row) => ({
    year: Number(
      facts[SECTION_YEAR[row.section] ?? ""]?.text ??
        core.date.slice(0, core.date.indexOf("-")),
    ),
    text: row.text,
    // The sentence's own record (a birth, a school, a move), not the
    // player the whole story is told about.
    recordId: row.sourceRecordIds.find((id) => id !== playerId) ?? playerId,
  }));
}

/**
 * What the loading screen plays while the first scene is drawn: the years of
 * the player's life, each with the sentences of their own story told that
 * year (toldLife, through the outline planner), and the state's districts
 * with who holds them. The year's headlines are gone (the CTO, Nov 24,
 * send-back 2 on #10390: "Three headline rows still sit in the middle ...
 * That's the list of facts"). Every line names its record.
 */
export function loadingStory(core: CoreState, playerId: string) {
  const life = toldLife(core, playerId);
  const start = Number(core.date.slice(0, 4));
  const first = Math.min(start, ...life.map((line) => line.year));
  const years = [];
  for (let year = first; year <= start; year += 1) {
    const lines = life.filter((line) => line.year === year);
    // A year with nothing to tell is counted past, not shown.
    if (lines.length || year === start) years.push({ year, lines });
  }
  return { years, map: governmentMap(core) };
}

export type LoadingStory = ReturnType<typeof loadingStory>;
