/**
 * The Journal's first evening (the Story lead's brief, Nov 24, 2026: "the
 * first Journal page"; owner, Nov 23, P43: "The journal is still a list of
 * facts"). The night the game opens, the player and their household watched
 * the President's address on the news (the director's opening, recorded as a
 * public event with them as witnesses). Until now no Journal row read it, so
 * the evening was never written. It is told here as one diary entry through
 * the outline planner (row `journal-evening`): who watched, what the speech
 * was about, where the player stands on it by their own recorded view, and a
 * close that looks ahead, the way a diary entry ends.
 */
import {
  questionNumber,
  questionPlainWords,
  questionToday,
} from "../english/question-names";
import { countSaid } from "../english/count-words";
import type { EntityId } from "../core2/kernel/brands";
import { P } from "../core2/parameters";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { CoreState, IsoDate, PersonId, PersonState } from "../core2/types";
import type { GroundedEnglishFact } from "../english/grounded-english";
import {
  JOURNAL_EVENING,
  tell,
  type TellingInput,
} from "../english/outline-planner";
import speechOutlines from "./data/speech-outlines.json" with { type: "json" };
import { addressPointFor, pointKey } from "./conversation";
import type { JournalChapter } from "./journal";
import type { Director } from "./ledger";
import { addressPoints, type AddressPoint } from "./opening-facts";
import { employerWords, spoken } from "./words";
import { recordsSince } from "./life-news";
import { FAMILY_CONTACT } from "../core2/modules/people";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { themeNameBy } from "./theme-words";

/** The most housemates a diary entry names one by one before it says "the whole house". */
const WATCHERS_NAMED = JOURNAL_EVENING.watchersNamed;
/** Days back a relative's letter is still this evening's news. */
const LETTER_DAYS = JOURNAL_EVENING.letterDays;
/** The player in a list of watchers, as subject and as object. */
const SELF = JOURNAL_EVENING.self;

const THEME = speechOutlines as unknown as {
  themeShort: Record<string, string>;
  themeShortPlural: { themes: readonly string[] };
};

/** A list of names as a sentence says it: "Ann", "Ann and Joe", "Ann, Joe and Lee". */
function namesSaid(names: readonly string[]): string {
  if (names.length <= P.one) return names.join("");
  return `${names.slice(P.zero, -P.one).join(", ")} and ${names.at(-P.one)}`;
}

/** The player's stand on the point by what they told a housemate about it, where they did. */
function saidAtTable(
  core: Readonly<CoreState>,
  personId: PersonId,
  others: readonly (PersonState | undefined)[],
  point: AddressPoint,
): "with" | "against" | "unsure" | undefined {
  for (const other of others) {
    if (!other) continue;
    const row = core.knowledgeByPerson
      .get(other.id)
      ?.get(pointKey(personId, point.question)) as
      { value?: unknown } | undefined;
    const move = row?.value;
    if (move !== "agree" && move !== "disagree") continue;
    const theirs = addressPointFor(core, other.id as PersonId, [point])?.stand;
    if (!theirs || theirs === "unsure") continue;
    if (move === "agree") return theirs;
    return theirs === "with" ? "against" : "with";
  }
  return undefined;
}

/**
 * What the evening's diary entry is told from, or null when the person did
 * not watch it or it is past the page's last day. The chapter and the
 * sameness measure read the same input.
 */
export function eveningTelling(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  through: IsoDate,
): TellingInput | null {
  const story = director.ledger.opening;
  if (!story || story.date > through) return null;
  if (!story.home.memberIds.includes(personId)) return null;
  const me = core.people.get(personId);
  if (!me) return null;
  const ids = [story.id as EntityId];
  const fact = (text: string, from: readonly string[] = ids) => ({
    text,
    sourceRecordIds: from as EntityId[],
  });
  const facts: Record<string, GroundedEnglishFact> = {
    "president-name": fact(story.president.name),
  };
  const others = story.home.memberIds
    .filter((id) => id !== personId)
    .map((id) => core.people.get(id))
    .filter((person) => !!person?.alive);
  // Everyone else at home watched it with them: past a few, "the whole
  // house" is how a diarist says it.
  const named = [story.id, ...others.map((person) => person!.id)];
  const many = others.length > WATCHERS_NAMED.value;
  if (many) facts["watched-many"] = fact("yes", named);
  else if (others.length) {
    const first = others.map((person) => person!.givenName);
    facts.we = fact(namesSaid([...first, SELF.subject]), named);
    facts.us = fact(namesSaid([...first, SELF.object]), named);
  } else facts.alone = fact("yes", [story.id, personId]);
  // How many watched, in words ("five"), from the household's members.
  if (others.length)
    facts["watchers-count"] = fact(countSaid(others.length + P.one), named);
  // The theme of the point the speech argued, as the address said it.
  const family = story.points[P.zero]?.family ?? story.theme;
  const themeName = family ? themeNameBy(me.traits, family) : null;
  if (family && themeName) {
    facts["theme-name"] = fact(themeName);
    if (THEME.themeShort[family]) {
      facts["theme-short"] = fact(THEME.themeShort[family]!);
      // A plural short name ("hard times") takes a plural verb.
      if (THEME.themeShortPlural.themes.includes(family))
        facts["theme-short-plural"] = fact("yes");
    }
  }
  const point = addressPoints(story).find((row) => row.kind === "policy");
  if (point) {
    facts.about = fact(point.about, [story.id, ...point.sourceRecordIds]);
    // The plain words people say it in (said, to, each side's reason), so
    // the entry need not say the record's name ({about}).
    for (const [key, text] of Object.entries(
      questionPlainWords(point.question),
    ))
      facts[key] = fact(text, [`question:${point.question}`]);
    // Whether the question's name is one thing or several, for a verb that
    // agrees with {about} ("is overdue" / "are overdue").
    facts[`about-${questionNumber(point.question)}`] = fact("yes", [
      `question:${point.question}`,
    ]);
    if (point.stance) {
      facts[`president-${point.stance}`] = fact("yes", point.sourceRecordIds);
      // What the President said is at stake, as the President's side tells
      // how things stand today (the question's own `today` wording), for a
      // line on what the speech claimed (W3, Nov 24: the stance moves had
      // run out of ideas).
      const stakes = questionToday(
        point.question,
        !!point.inForce,
        point.stance === "for" ? "for" : "against",
      );
      if (stakes) {
        facts.stakes = fact(stakes, [`question:${point.question}`]);
        facts["stakes-clause"] = fact(
          stakes.charAt(P.zero).toLowerCase() +
            stakes.slice(P.one).replace(/[.!?]$/, ""),
          [`question:${point.question}`],
        );
      }
    }
    // A law already in force is one the President keeps or undoes.
    if (point.inForce)
      facts["law-in-force"] = fact("yes", point.sourceRecordIds);
    // The entry says where the player stands only where they said it at
    // the table (the talk's record of the reply; pre-grade, Nov 24: the
    // diary said the opposite of the reply the player chose). A side
    // nobody talked about is not written down (the CTO, Nov 24, send-back
    // 2 on #10390: "A diary that takes a side nobody talked about").
    const told = saidAtTable(core, personId, others, point);
    if (told) facts[`stand-${told}`] = fact("yes", [personId]);
  }
  // What else the day held, from records the world already keeps (W3, Nov
  // 24: the evening's moves had too few facts to say different things): a
  // housemate's job, from the job and employer records, and a letter from a
  // relative elsewhere in the past month (`family.contact`, kin-contact.ts),
  // with the town it came from.
  const worker = others.find(
    (person) => person?.jobId && core.jobs.get(person.jobId),
  );
  const job = worker?.jobId ? core.jobs.get(worker.jobId) : undefined;
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  const employerSaid = employer ? employerWords(employer) : null;
  if (worker && job && employerSaid) {
    facts["housemate-worker"] = fact(worker.givenName, [worker.id, job.id]);
    facts["housemate-employer"] = fact(employerSaid, [job.id, employer!.id]);
  }
  const letter = recordsSince(
    core,
    personId,
    FAMILY_CONTACT,
    addDays(makeIsoDate(story.date), -LETTER_DAYS.value),
    story.date,
  )
    .filter((row) => row.personIds.at(P.zero) === personId)
    .at(-P.one);
  const writerId = letter?.facts?.writerId as PersonId | undefined;
  const writer = writerId ? core.people.get(writerId) : undefined;
  if (letter && writer) {
    facts["kin-wrote"] = fact(writer.givenName, [letter.id, writer.id]);
    const from = corePlaceByJurisdictionId(writer.placeId as never);
    if (from && writer.placeId !== me.placeId)
      facts["kin-wrote-from"] = fact(spoken(from), [letter.id, writer.placeId]);
  }
  const home = corePlaceByJurisdictionId(me.placeId as never);
  if (home) facts.place = fact(spoken(home), [me.householdId]);
  return {
    kind: "journal-evening",
    facts,
    momentKey: `journal:${story.id}:${personId}`,
    worldSeed: core.seed,
    sourceRecordIds: ids,
    knower: personId as EntityId,
    traits: me.traits,
  };
}

/**
 * The opening evening as one Journal chapter, or null when the person did
 * not watch it or it is past the page's last day.
 */
export function eveningChapter(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  through: IsoDate,
): JournalChapter | null {
  const input = eveningTelling(core, director, personId, through);
  const story = director.ledger.opening;
  if (!input || !story) return null;
  const told = tell(input);
  if (!told) return null;
  const title = new Date(`${story.date}T00:00:00Z`).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" },
  );
  return {
    key: `evening:${story.date}`,
    title,
    from: story.date as IsoDate,
    through: story.date as IsoDate,
    lines: told.paragraphs.map((text, at) => ({
      id: `journal:${story.id}:${personId}:${at}`,
      date: story.date as IsoDate,
      text,
      momentIds: [story.id],
      sourceRecordIds: [
        ...new Set(
          told.sentences
            .filter((row) => row.paragraph === at)
            .flatMap((row) => row.sourceRecordIds),
        ),
      ],
    })),
  };
}
