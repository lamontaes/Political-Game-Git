/**
 * The one outline planner every speech goes through (words composer, unit 3,
 * docs/design/words-composer.md; owner, Nov 12: "don't only just make changes
 * just for the president's speech. This should apply to all speeches ... the
 * problem is the engine"). The President's inaugural and State of the Union,
 * a governor's State of the State and a mayor's State of the City are each a
 * row of `src/director/data/speech-outlines.json`: its sections in order, how many points
 * and asks it carries, whether its asks are numbered and whether the past
 * year may be told as the speaker's own record. The planner reads the row and
 * the world and returns the blocks `composeBlocks` words:
 *
 * - **One theme** (owner, Nov 12: "There's no theme for the speech. That's a
 *   problem."): the bill catalog's subject the speaker's own signature
 *   issues, the strength of their stands and the world's conditions point to
 *   (`themeOf`). Only that subject's points, asks and figures are said.
 * - **Each point is context, stand, ask** (owner, Nov 12, 1:05 a.m.: "it's
 *   okay if context is given ... that just establishes context in a smooth
 *   way"): one sentence from the world's records over a span (how long, how
 *   much), then the speaker's stand on it, then the asks.
 * - **Each ask once, to the level that can act**, ranked by the speaker's own
 *   signature issues in the theme first, so asks differ between worlds and no
 *   one question leads every speech ("why is it always stock trading?").
 * - **No home state**, and an inaugural tells no record the speaker did not
 *   make ("is he gloating from his predecessor?").
 *
 * The research behind the rows is docs/research/speech-structure-2026-11-12.md.
 * Nothing here reads a dice roll; ties go by name.
 */
import { coreAPI } from "../core2/state";
import { historyMonths, monthKey, shiftMonth } from "../core2/macro-model";
import type { MacroMonth } from "../core2/macro-model";
import { MACRO_MODULE_ID } from "../core2/modules/macro";
import { officialsIn, type OfficialRow } from "../core2/modules/officials";
import { ownStance, PRESIDENT_FACT } from "../core2/modules/officials";
import { stanceReader } from "../core2/modules/campaigns";
import { LAWS_MODULE_ID, reachedBy } from "../core2/modules/laws";
import {
  BUDGETS_MODULE_ID,
  budgetsOf,
  governmentOfJurisdiction,
  governments,
} from "../core2/modules/budgets";
import { DISASTERS_MODULE_ID, townDisasters } from "../core2/modules/world";
import {
  policyAuthority,
  type LawRowInput,
  type PolicyLevel,
} from "../core2/modules/laws";
import type { CoreAPI, CoreState, PersonState } from "../core2/types";
import type { EntityId } from "../core2/kernel/brands";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "../english/grounded-english";
import { composeAddress } from "../english/english-composition";
import { SUBJECT_WORDS } from "../english/composed-checks";
import {
  openingMove,
  type OpeningLevel,
  type OpeningMove,
  type OpeningSpeechKind,
  type SpeechVoice,
} from "../english/english-opening-speech";
import openingData from "./data/opening-story.json" with { type: "json" };
import {
  NAMED_QUESTIONS,
  questionAbout,
  questionFamily,
  questionFigures,
  questionNumber,
  questionSide,
  questionTo,
  questionLaw,
  questionReasons,
  questionToday,
  questionTodayWordings,
  questionPoint,
} from "../english/question-names";
import { OPENING_SPEECH_BANK } from "../english/english-opening-speech";
import { questionSubject } from "../english/policy-names";
import addressData from "./data/opening-address.json" with { type: "json" };
import outlineData from "./data/speech-outlines.json" with { type: "json" };
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { P } from "../core2/parameters";
import { formKindOf } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { earlierAddressPieces } from "./opening-facts";
import { coreStateName } from "../core2/place-lookup";
import { markWordsStopgap } from "./stopgaps";
import { moneySaid } from "../english/count-words";
import { addDays, daysBetweenText } from "../core2/kernel/dates";
import type { IsoDate } from "../core2/kernel/brands";
import {
  TERM_AREAS,
  countryTermRead,
  type AreaRead,
} from "../core2/modules/laws";
import {
  addressSituation,
  chooseAddressKind,
  HURT_KINDS,
  type AddressKind,
} from "./address-kind";

const N = (
  openingData as unknown as {
    numbers: {
      decimals: number;
      jobsPerSeriesUnit: number;
      jobsPerMillion: number;
      percentPerRatio: number;
    };
  }
).numbers;

/** The sections an outline row may hold, in the words of speech-outlines.json. */
export type Section =
  | "salutation"
  | "occasion"
  | "creed"
  | "history"
  | "theme"
  | "people"
  | "states"
  | "call"
  | "hope"
  | "families"
  | "close";

/** One kind of speech's outline row. */
export interface OutlineRow {
  /** The opening-speech bank subject its words are drawn from; null for a kind whose words live elsewhere. */
  readonly bank: OpeningSpeechKind | null;
  readonly register: string;
  readonly level: PolicyLevel | null;
  readonly sections: readonly Section[];
  readonly required: readonly Section[];
  readonly asides: readonly Section[];
  readonly points: number;
  /** The fewest points the speech makes; one that cannot make them is not given. */
  readonly leastPoints: number;
  readonly asks: number;
  readonly numberedAsks: boolean;
  readonly ownRecord: boolean;
}

interface Weight {
  readonly value: number;
}
const OUTLINES = outlineData as unknown as {
  kinds: Readonly<Record<string, OutlineRow>>;
  theme: Record<
    | "signature"
    | "actable"
    | "stance"
    | "condition"
    | "traits"
    | "contextYearsMin"
    | "lawYearsMax",
    Weight
  >;
  topicsBySubject: Readonly<Record<string, readonly string[] | string>>;
  subjectOfQuestion: Readonly<Record<string, string>>;
  subjectPull: Readonly<Record<string, readonly string[] | string>>;
  themeNames: Readonly<Record<string, string>>;
  /** A theme said short, where a frame names it after the speech has said it in full (a close). */
  themeShort: Readonly<Record<string, string>>;
  /** A budget line's name said with what the government spends on it now ("{about} beyond {spent} a year"). */
  lineSpent: string;
  /** The slot endings of the first, second and third wordings of how a question stands. */
  todaySlots: readonly string[];
  /** What a body's measures are called by their form (bodyNumbering's kind). */
  measureWords: Readonly<Record<string, string>>;
  conditions: { budgetEvenBand: Weight; budgetThemes: readonly string[] };
  pointShapes: {
    shapes: Readonly<
      Record<
        string,
        {
          readonly moves: readonly string[];
          readonly belief: "belief-leads" | "belief-stands" | "belief-after";
          readonly pull: readonly string[];
        }
      >
    >;
  };
};

/** The outline row of a kind of speech. */
// stopgapId: SG-WORDS-speech-outline-other-kinds
export function outlineOf(kind: string): OutlineRow {
  const row = OUTLINES.kinds[kind];
  if (!row) throw new Error(`No speech outline for ${kind}`);
  return row;
}

/** The measures that bear on a subject of the bill catalog. */
function topicsOf(subject: string): readonly string[] {
  const row = OUTLINES.topicsBySubject[subject];
  return Array.isArray(row) ? row : [];
}

export type Facts = Record<string, GroundedEnglishFact>;

export const fact = (text: string, ...ids: string[]): GroundedEnglishFact => ({
  text,
  sourceRecordIds: ids as EntityId[],
});

export function packet(
  momentKey: string,
  seed: string,
  speakerId: string,
  stage: string,
  facts: Facts,
  baseIds: readonly string[],
): GroundedEnglishPacket {
  return {
    surface: "dialogue",
    momentKey,
    worldSeed: seed,
    bankVersion: "words-opening-speech-v1",
    stage,
    sourceRecordIds: [...baseIds] as EntityId[],
    facts,
    speaker: { personId: speakerId as EntityId, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, row]) => ({
      personId: speakerId as EntityId,
      factKey,
      sourceRecordIds: row.sourceRecordIds,
    })),
  };
}

function fullName(person: PersonState): string {
  return `${person.givenName} ${person.familyName}`;
}

/** The opening month and the same month a year before, from the macro engine's record. */
export function macroMonths(core: CoreState): {
  now: MacroMonth;
  before: MacroMonth | undefined;
} | null {
  const api = coreAPI(core);
  const p = (key: string) => api.parameter(key);
  const recorded = core.modules.has(MACRO_MODULE_ID)
    ? (api
        .moduleState(MACRO_MODULE_ID)
        .table("months")
        .rows() as unknown as MacroMonth[])
    : [];
  // Before the macro engine's first day the opening month is the one it
  // will open from: this world's own drawn months (`historyMonths`).
  const months = (
    recorded.length ? recorded : historyMonths(core.startedAt, core.seed, p)
  )
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));
  const now = months
    .filter((row) => row.month <= monthKey(core.date))
    .at(-P.one);
  if (!now) return null;
  const yearBefore = shiftMonth(now.month, -p("macroMonthsPerYear"), p);
  return { now, before: months.find((row) => row.month === yearBefore) };
}

/**
 * What the story can say about each of the country's subjects: the claims
 * its record supports, in words and never as a figure (owner, Oct 27: "No,
 * none of that real data in there"; Nov 1: "I don't like where this part of
 * the speech where it just laces statistics").
 */
/** The areas of the term read the address can tell besides work and prices, which the macro months already tell. */
const AREA_TOPICS = TERM_AREAS.filter(
  (area) => !["jobs", "pay", "prices"].includes(area),
);
const TOPIC_CLAIMS: Readonly<Record<string, readonly string[]>> = {
  unemployment: ["unemployment-up", "unemployment-down"],
  inflation: ["inflation-up", "inflation-down", "prices-up"],
  growth: ["growth-up"],
  wages: ["wages-ahead-of-prices", "wages-behind-prices"],
  mortgage: ["mortgage-up", "mortgage-down"],
  jobs: ["jobs-up"],
  // The areas of the term read (src/core2/term-read.ts): each a claim of
  // better or worse since the term began, so bad news in schools, crime,
  // health or rent is told as well as good.
  ...Object.fromEntries(
    AREA_TOPICS.map((area) => [area, [`${area}-worse`, `${area}-better`]]),
  ),
};

/** The claims that make a subject good news for the year. */
const GOOD_CLAIMS: Readonly<Record<string, readonly string[]>> = {
  unemployment: ["unemployment-down"],
  inflation: ["inflation-down"],
  growth: ["growth-up"],
  wages: ["wages-ahead-of-prices"],
  mortgage: ["mortgage-down"],
  jobs: ["jobs-up"],
  ...Object.fromEntries(AREA_TOPICS.map((area) => [area, [`${area}-better`]])),
};

/** A topic's claims that are hard news: every claim it holds that is not good news. */
function hardClaims(topic: string): readonly string[] {
  return (TOPIC_CLAIMS[topic] ?? []).filter(
    (key) => !(GOOD_CLAIMS[topic] ?? []).includes(key),
  );
}

/**
 * The year's subject the address names in a few words ("finding work"), from
 * the bank's subject pieces in the speaker's manner: the English engine's
 * words, never the director's. Null when the bank holds none for it.
 */
function subjectWords(
  core: CoreState,
  presidentId: string,
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  topic: string,
  which: string,
  role: "subject" | "change" = "subject",
): string | null {
  const move = openingMove(kind, voice, role, { topic });
  if (!move) return null;
  const said = composeAddress(
    packet(
      `opening:${core.date}:${presidentId}/subject-${which}`,
      core.seed,
      presidentId,
      "chair-male",
      {},
      [presidentId],
    ),
    "election-night",
    [move],
  );
  if (said.kind !== "rendered") return null;
  // A subject is said inside a sentence, so it keeps its own lower case.
  return (
    said.text.charAt(P.zero).toLocaleLowerCase("en-US") + said.text.slice(P.one)
  );
}

/**
 * The world's names and subjects any part of the address may say, each from
 * its record (owner, Nov 11: "a ton of different inserts ... This introduces
 * people to their world"): the Vice President and the Speaker by name (said
 * with their title at first mention and by role after, in `composeBlocks`),
 * the President's last office, and the theme's hardest and best subject in
 * words (the one of the theme's measures that moved furthest the wrong way,
 * and the right way). A part says what it needs of these and is left out
 * where the record holds none. No home state and no ask: the theme's asks are
 * said in their own section, to the level that can act.
 */
function worldFacts(
  core: CoreState,
  president: PersonState,
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  country: Country,
  themeTopics: readonly string[],
): Facts {
  const api = coreAPI(core);
  const facts: Facts = {};
  const named = (seat: string, pick?: (row: OfficialRow) => boolean) => {
    const row = officialsIn(api, seat).find((entry) => !pick || pick(entry));
    const person = row ? core.people.get(row.id) : undefined;
    return row && person ? fact(fullName(person), row.id) : undefined;
  };
  const vice = named("US:vice-president");
  if (vice) facts["vice-president"] = vice;
  const speaker = named("US:us-house", (row) => row.leadership === "presiding");
  if (speaker) facts.speaker = speaker;
  const past = (kindKey: string) =>
    (president.pastFacts ?? []).find((row) => row.kind === kindKey);
  // No home state: a speech names a place only where its section is about
  // that place (owner, Nov 12: "Why Georgia?").
  const prior = past(PRESIDENT_FACT.priorOffice);
  if (prior?.facts?.title)
    facts["prior-office"] = fact(prior.facts.title, prior.id);
  // The year's subjects, the furthest moved first; a tie goes by name.
  const ranked = (claims: (topic: string) => readonly string[]) =>
    themeTopics
      .map((topic) => ({
        topic,
        held: claims(topic).filter((key) => country.facts[key]),
      }))
      .filter((row) => row.held.length)
      .sort(
        (a, b) =>
          (country.movement[b.topic] ?? P.zero) -
            (country.movement[a.topic] ?? P.zero) ||
          a.topic.localeCompare(b.topic),
      )[P.zero];
  const subject = (key: string, row: ReturnType<typeof ranked>) => {
    if (!row) return;
    // Hard news and good news are worded apart ("lagging pay", "rising pay"),
    // so a sentence that treats its subject as a problem gets a problem.
    const words = subjectWords(
      core,
      president.id,
      kind,
      voice,
      `${row.topic}:${key === "best" ? "good" : "hard"}`,
      key,
    );
    if (words)
      facts[key] = fact(
        words,
        ...new Set(
          row.held.flatMap((claim) => country.facts[claim]!.sourceRecordIds),
        ),
      );
  };
  // How far each subject moved, in words: a third of its scale or less is
  // small, two thirds middling, the rest large.
  const BANDS = ["small", "medium", "large"] as const;
  for (const [topic, moved] of Object.entries(country.movement)) {
    if (!themeTopics.includes(topic)) continue;
    const scale = SHAPE.changeScale[topic];
    const claims = (TOPIC_CLAIMS[topic] ?? []).filter(
      (key) => country.facts[key],
    );
    if (typeof scale !== "number" || !claims.length) continue;
    const band =
      BANDS[
        Math.min(
          BANDS.length - P.one,
          Math.floor((moved / scale) * BANDS.length),
        )
      ]!;
    const words = subjectWords(
      core,
      president.id,
      kind,
      voice,
      band,
      `change-${topic}`,
      "change",
    );
    if (words)
      facts[`change-${topic}`] = fact(
        words,
        ...new Set(
          claims.flatMap((claim) => country.facts[claim]!.sourceRecordIds),
        ),
      );
  }
  // Each subject the year holds a claim on, in words, for a pledge to name
  // what it will do about without saying the figure again.
  for (const topic of themeTopics) {
    const held = (TOPIC_CLAIMS[topic] ?? []).filter(
      (key) => country.facts[key],
    );
    if (!held.length) continue;
    const words = subjectWords(
      core,
      president.id,
      kind,
      voice,
      // A pledge names its subject plainly ("finding work"), neither hard
      // nor good news: it says what the President will do about it.
      `${topic}:say`,
      `say-${topic}`,
    );
    if (words)
      facts[`say-${topic}`] = fact(
        words,
        ...new Set(
          held.flatMap((claim) => country.facts[claim]!.sourceRecordIds),
        ),
      );
  }
  subject("hardest", ranked(hardClaims));
  subject(
    "best",
    ranked((topic) => GOOD_CLAIMS[topic] ?? []),
  );
  return facts;
}

interface AddressData {
  mannerTraits: { plain: readonly string[]; polished: readonly string[] };
  /** The parts an address may leave out, by the facets that pull a President to say each. */
  asides: Readonly<Record<string, readonly string[]>>;
  /** The facets that make a President say more, and those that keep it short. */
  talk: { more: readonly string[]; less: readonly string[] };
  /** How far each subject moves in an ordinary year's largest move, in its own units. */
  changeScale: Readonly<Record<string, number | string>>;
  parameters: Record<
    | "asidesBase"
    | "asidesPerTalk"
    | "namesSaid"
    | "subjectsSaid"
    | "redraws"
    | "sameRunWords",
    { value: number }
  >;
}
export const SHAPE = addressData as unknown as AddressData;

/** The claims the country's record supports, as speech facts. */
interface Country {
  readonly facts: Facts;
  /** How far each number moved over the year, to choose the ones worth telling. */
  readonly movement: Readonly<Record<string, number>>;
  /** The year in the macro months: measures better minus worse over both, from -1 to 1. */
  readonly macroSlide: number;
  /** The term read by area from the outcome web, and the rows it cites. */
  readonly areas: readonly AreaRead[];
  /** The macro months the year was read from. */
  readonly macroIds: readonly string[];
}

/**
 * The country's year as the macro engine's months record it: each claim a
 * fact the bank's pieces require ("unemployment-up", "wages-behind-prices"),
 * cited by the months it compares. No figure is a fact: the address tells
 * the year in words.
 */
function countryFacts(core: CoreState, sinceDate: string): Country {
  const months = macroMonths(core);
  const api = coreAPI(core);
  const areas = countryTermRead(api, sinceDate);
  if (!months)
    return { facts: {}, movement: {}, macroSlide: P.zero, areas, macroIds: [] };
  const { now, before } = months;
  const ids = [now.id, ...(before ? [before.id] : [])];
  const facts: Facts = {};
  const movement: Record<string, number> = {};
  const claim = (key: string, holds: boolean) => {
    if (holds) facts[key] = fact("yes", ...ids);
  };
  claim(
    "prices-high",
    now.inflationPct >
      api.parameter("macroInflationGoalPct") +
        api.parameter("macroCpiOverPceWedgePct"),
  );
  claim("prices-up", now.inflationPct > P.zero);
  if (!before)
    return { facts, movement, macroSlide: P.zero, areas, macroIds: ids };
  claim("unemployment-down", now.unemploymentPct < before.unemploymentPct);
  claim("unemployment-up", now.unemploymentPct > before.unemploymentPct);
  claim("inflation-down", now.inflationPct < before.inflationPct);
  claim("inflation-up", now.inflationPct > before.inflationPct);
  claim("wages-up", now.hourlyEarnings > before.hourlyEarnings);
  claim("growth-up", now.realOutput > before.realOutput);
  claim("mortgage-up", now.mortgage30Pct > before.mortgage30Pct);
  claim("mortgage-down", now.mortgage30Pct < before.mortgage30Pct);
  movement.unemployment = Math.abs(
    now.unemploymentPct - before.unemploymentPct,
  );
  movement.inflation = Math.abs(now.inflationPct - before.inflationPct);
  movement.mortgage = Math.abs(now.mortgage30Pct - before.mortgage30Pct);
  // A change over the year, as a percent of where it stood.
  const change = (to: number, from: number) =>
    (to / from - P.one) * N.percentPerRatio;
  if (now.hourlyEarnings > before.hourlyEarnings) {
    const grew = change(now.hourlyEarnings, before.hourlyEarnings);
    movement.wages = grew;
    // Pay against prices, over the same year.
    claim("wages-ahead-of-prices", grew > now.inflationPct);
    claim("wages-behind-prices", grew < now.inflationPct);
  }
  if (now.realOutput > before.realOutput)
    movement.growth = change(now.realOutput, before.realOutput);
  const added = now.payrollJobsThousands - before.payrollJobsThousands;
  if (added > P.zero) {
    claim("jobs-up", true);
    movement.jobs = added / N.jobsPerSeriesUnit / N.jobsPerMillion;
  }
  // The areas of the term, each a claim of better or worse since the term
  // began, citing the web rows it compared; how far it moved is its weight.
  let betterAreas = P.zero,
    worseAreas = P.zero;
  for (const read of areas) {
    if (!AREA_TOPICS.includes(read.area)) continue;
    facts[`${read.area}-${read.slide >= P.zero ? "better" : "worse"}`] = fact(
      "yes",
      ...read.sourceRecordIds,
    );
    movement[read.area] = Math.abs(read.slide) * N.percentPerRatio;
    betterAreas += Math.max(P.zero, read.slide);
    worseAreas += Math.max(P.zero, -read.slide);
  }
  // The year in a word: more of the measures better than worse, or the
  // reverse, or neither. Each is a count of the claims above, with the areas
  // of the term counted by how far they moved, never a roll.
  const better =
    [
      "unemployment-down",
      "inflation-down",
      "wages-up",
      "growth-up",
      "jobs-up",
    ].filter((key) => facts[key]).length + betterAreas;
  const worse =
    ["unemployment-up", "inflation-up"].filter((key) => facts[key]).length +
    ["wages-up", "growth-up", "jobs-up"].filter((key) => !facts[key]).length +
    worseAreas;
  claim("mood-better", better > worse);
  claim("mood-hard", worse > better);
  claim("mood-mixed", worse === better);
  return {
    facts,
    movement,
    macroSlide:
      better + worse > P.zero ? (better - worse) / (better + worse) : P.zero,
    areas,
    macroIds: ids,
  };
}

/** One policy question the President has a view on, at a level that may act on it, with the law in force there. */
export interface Stand {
  readonly question: string;
  /** Positive for a President who wants it, negative for one who does not. */
  readonly stance: number;
  readonly signature: boolean;
  /** The powers record that lets this level answer the question. */
  readonly power: string;
  readonly law: {
    readonly id: string;
    readonly inForce: boolean;
    /** The jurisdiction whose law it is: the nation, or the player's state. */
    readonly jurisdiction: string;
    /** The day the law in force took effect, for how long it has stood. */
    readonly since: string;
  };
}

/** The law in force on a question in one jurisdiction, from the laws engine's own rows. */
function lawOn(
  api: CoreAPI,
  question: string,
  jurisdiction: string,
): Stand["law"] | null {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return null;
  const row = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeries", [jurisdiction, question]) as unknown as LawRowInput[]
  )
    .filter((entry) => entry.effectiveDate <= api.state.date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[P.zero];
  return row
    ? {
        id: row.id,
        inForce: row.value === P.one,
        jurisdiction,
        since: row.effectiveDate,
      }
    : null;
}

/**
 * Every question an official holds a view on that their level of government
 * may answer and the world has a law for, with the law in force in the
 * jurisdiction. The one reader the President's address and a governor's or
 * mayor's share.
 */
export function standsAt(
  api: CoreAPI,
  official: OfficialRow,
  level: PolicyLevel,
  jurisdiction: string | null,
): Stand[] {
  const own = new Set(official.signature.map((row) => row.question));
  return NAMED_QUESTIONS.flatMap((question): Stand[] => {
    const stance = ownStance(official.ideal, official.signature, question);
    if (stance === P.zero || !jurisdiction) return [];
    const power = policyAuthority(api, question, level);
    return standOn(
      api,
      question,
      stance,
      own.has(question),
      power,
      jurisdiction,
    );
  });
}

/**
 * The stands of a speaker the officials engine keeps no row for: a town's,
 * a township's or a county's officeholder or candidate, who is a full person
 * (the two-level rule). Their view on each question their body decides
 * (`contestPositions`: the policy questions the level may decide here and
 * the lines of its own budget) comes from the one engine that holds every
 * person's stand, `stanceReader` (campaign-stances.ts: their own view from
 * their lean, what they have heard since and their votes, blended with their
 * party's), the same view their votes and their platform are read from. The
 * power to answer is the office's own record. They have no signature issues:
 * the officials engine draws those only for the officials it keeps.
 */
// stopgapId: SG-WORDS-local-speaker-no-signature
export function standsOfPerson(
  api: CoreAPI,
  personId: string,
  party: string | null,
  questions: readonly string[],
  officeId: string,
  jurisdiction: string,
): Stand[] {
  markWordsStopgap("SG-WORDS-local-speaker-no-signature");
  const reader = stanceReader(api, personId, party);
  const named = new Set(NAMED_QUESTIONS);
  return questions.flatMap((question): Stand[] => {
    if (!named.has(question)) return [];
    const stance = reader.stance(question) ?? P.zero;
    if (stance === P.zero) return [];
    return standOn(
      api,
      question,
      stance,
      false,
      { allowed: true, source: officeId },
      jurisdiction,
    );
  });
}

/** One stand: the question, the speaker's view of it, and the law in force where the level may answer it. */
function standOn(
  api: CoreAPI,
  question: string,
  stance: number,
  signature: boolean,
  power: { readonly allowed: boolean; readonly source: string },
  jurisdiction: string,
): Stand[] {
  // A question the laws engine holds no row for in this jurisdiction is
  // open: no law answers it yes (Nov 12: eleven of the 23 federal
  // questions had no row, so every President spoke to the same twelve and
  // the same three asks led every address). The stand cites the powers
  // record that lets this level answer it.
  // stopgapId: SG-WORDS-speech-unseeded-law-open
  const law = power.allowed
    ? (lawOn(api, question, jurisdiction) ?? {
        id: power.source,
        inForce: false,
        jurisdiction,
        since: api.state.startedAt,
      })
    : null;
  return law
    ? [
        {
          question,
          stance,
          signature,
          power: power.source,
          law,
        },
      ]
    : [];
}

/** The ones they want: their own signature issues first, then by how strongly they hold them. */
export function wantedOf(stands: readonly Stand[]): Stand[] {
  return stands
    .filter((row) => row.stance > P.zero)
    .sort(
      (a, b) =>
        Number(b.signature) - Number(a.signature) ||
        b.stance - a.stance ||
        a.question.localeCompare(b.question),
    );
}

/** The ones they oppose, strongest first. */
export function opposedOf(stands: readonly Stand[]): Stand[] {
  return stands
    .filter((row) => row.stance < P.zero)
    .sort(
      (a, b) => a.stance - b.stance || a.question.localeCompare(b.question),
    );
}

/** The facts a stand is spoken with: its names, the President's side and the law. */
export function standFacts(
  stand: Stand,
  speakerId: string,
  rank: string,
): Facts {
  // The ask cites the powers record and the law it read (ask why).
  const asked = [
    speakerId,
    `question:${stand.question}`,
    stand.power,
    stand.law.id,
  ];
  const side = stand.stance > P.zero ? "for" : "against";
  const sideWords = questionSide(stand.question, side);
  return {
    about: fact(questionAbout(stand.question)!, ...asked),
    to: fact(questionTo(stand.question)!, ...asked),
    ...(questionLaw(stand.question)
      ? { "law-name": fact(questionLaw(stand.question)!, ...asked) }
      : {}),
    ...(sideWords ? { side: fact(sideWords, ...asked) } : {}),
    [stand.stance > P.zero ? "stance-for" : "stance-against"]: fact(
      "yes",
      ...asked,
    ),
    [stand.law.inForce ? "law-in-force" : "law-not-in-force"]: fact(
      "yes",
      stand.law.id,
    ),
    "federal-level": fact("yes", stand.law.id),
    [rank]: fact("yes", ...asked),
  };
}

/** The President's manner of speaking, from their recorded traits. */
export function voiceOf(president: PersonState): SpeechVoice {
  const sum = (keys: readonly string[]) =>
    keys.reduce(
      (total, key) => total + (president.traits[key] ?? P.zero),
      P.zero,
    );
  return sum(SHAPE.mannerTraits.plain) > sum(SHAPE.mannerTraits.polished)
    ? "plain"
    : "polished";
}

/** One part of the address: where the camera is, the facts it is said with, its moves. */
export interface Block {
  readonly key: string;
  readonly level: OpeningLevel;
  /**
   * The part of the address the block is said in: the talk box plays one
   * part per Continue (owner, Oct 28 sitting, 11 and 41: "Each Continue can
   * carry a paragraph"). Blocks with the same part are one paragraph.
   */
  readonly part: number;
  readonly facts: Facts;
  readonly moves: readonly (OpeningMove | null)[];
  readonly required?: boolean;
}

const RANKS = ["rank-first", "rank-second", "rank-third"] as const;

/** A President's summed values on a set of recorded facets. */
function traitSum(president: PersonState, keys: readonly string[]): number {
  return keys.reduce(
    (total, key) => total + (president.traits[key] ?? P.zero),
    P.zero,
  );
}

/** Who gives a speech: the person, their officials-engine row where one is kept, the level they act at and their jurisdiction. */
export interface OutlineSpeaker {
  readonly person: PersonState;
  readonly official?: OfficialRow;
  readonly jurisdiction: string | null;
  /**
   * A local speaker the officials engine keeps no row for: the level of the
   * government they speak in (a city, a township or a county, read from the
   * office row), the questions their body decides, the office whose record
   * gives the power, their party, and what the speech says the place, the
   * body and the office are, from the office row.
   */
  readonly local?: {
    readonly level: PolicyLevel;
    readonly officeId: string;
    readonly party: string | null;
    readonly questions: readonly string[];
    readonly realmName: string | null;
    /** The body they speak to or sit on, as people say it ("the council", "the board"). */
    readonly body: string | null;
    /** The office the speaker holds or seeks, as people say it ("mayor", "county executive"). */
    readonly officeTitle: string | null;
  };
  readonly serviceStart: string;
  /** The term read of a governor's state or a mayor's town; the President's is the country's. */
  readonly areas?: readonly AreaRead[];
}

/** A planned speech: its blocks, the kind of address it took, its one theme and its asks by question. */
export interface SpeechPlan {
  readonly blocks: Block[];
  readonly addressKind: AddressKind;
  /** The bill catalog's subject the speech is about; null when the record gives it none. */
  readonly theme: string | null;
  readonly asks: readonly string[];
  /** Each point as planned: its question, shape, the speaker's side, the belief's family and pole, its figure and its name's number. */
  readonly points: readonly PlannedPoint[];
}

/** One point of a speech as the planner chose it, for the reader and the tests. */
export interface PlannedPoint {
  readonly question: string;
  readonly shape: string;
  readonly side: "for" | "against";
  /** How the question stands, as the speaker's side describes it. */
  readonly today: string | null;
  /** Every wording of it the speech may say (the first is `today`). */
  readonly todays: readonly string[];
  readonly family: string | null;
  readonly pole: "a" | "b" | null;
  /** The measure the point's figure is about; null when the question's row lets the speaker's side use none. */
  readonly figure: string | null;
  readonly number: "one" | "many";
  /** What the speaker believes on it, as the bank's clause, and the piece it was said with; null when the bank holds none. */
  readonly belief: { readonly text: string; readonly piece: string } | null;
}

/**
 * The shapes a speaker's points take, in the order their traits pull
 * hardest (speech-outlines.json `pointShapes`): the first point takes the
 * first, the next the next, so no two points of a speech share a shape.
 * Ties go by the shape's name.
 */
function shapeOrder(person: PersonState): string[] {
  return Object.entries(OUTLINES.pointShapes.shapes)
    .map(([name, row]) => ({ name, pull: traitSum(person, row.pull) }))
    .sort((a, b) => b.pull - a.pull || a.name.localeCompare(b.name))
    .map((row) => row.name);
}

/** The words a sentence's first word keeps its capital in after a comma. */
const KEEPS_CAPITAL =
  /^(?:I|Medicare|Medicaid|Washington|Congress|Social Security|American)\b/;

/**
 * The wordings of how a question stands that make a different point from the
 * belief said beside them (the words lead, Nov 12: "judged by people who
 * have done the job" followed at once by "to people who know the work"): the
 * ones that share the fewest subject words with the belief and what the
 * speech said before it, by the composed check's own reader, in their order.
 * Every wording when nothing was said before.
 */
function apartFrom(
  wordings: readonly string[],
  belief: string | null,
): string[] {
  if (!belief) return [...wordings];
  const own = new Set(SUBJECT_WORDS.of(belief));
  const shared = (text: string) =>
    new Set(SUBJECT_WORDS.of(text).filter((word) => own.has(word))).size;
  const least = Math.min(...wordings.map(shared));
  return wordings.filter((text) => shared(text) === least);
}

/** A whole sentence as the clause it becomes after an opener and a comma ("Right now, the federal minimum wage ..."). */
function clauseOf(sentence: string): string {
  return KEEPS_CAPITAL.test(sentence)
    ? sentence
    : sentence.charAt(P.zero).toLocaleLowerCase("en-US") +
        sentence.slice(P.one);
}

/**
 * What the speaker believes on a question, worded from the bank's
 * belief-words clauses by the question's family and the pole of it the
 * speaker stands on, in the speaker's manner: the English engine's words,
 * never the director's. The clause is said as the bank wrote it (its own
 * case), so a frame says "Because I believe {belief}, ...". Null when the
 * bank holds none.
 */
function beliefWords(
  core: CoreState,
  speakerId: string,
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  family: string,
  pole: "a" | "b",
  question: string,
  side: "for" | "against",
  said: string[],
  thisSpeech: Set<string>,
  spokenBefore: string | null = null,
  /** The points (question-names.json `points`) the belief must not make: the ones every wording of how the question stands makes. */
  avoid: ReadonlySet<string> = new Set(),
): { text: string; piece: string } | null {
  const move = openingMove(kind, voice, "belief-words");
  if (!move) return null;
  // Only a principle the question's own row says argues this side (the
  // words lead, Nov 12): the family and pole's clauses, by their place in
  // key order; otherwise the side's own reason.
  const { principles, reason } = questionReasons(question, side);
  const ofPole = OPENING_SPEECH_BANK.parts
    .filter((part) =>
      part.uses.some(
        (use) =>
          use.role === "belief-words" &&
          (use.requiresFacts ?? []).includes(`family-${family}`) &&
          (use.requiresFacts ?? []).includes(`pole-${pole}`),
      ),
    )
    .map((part) => part.key)
    .sort();
  const allowed = new Set(
    principles.map((at) => ofPole[at - P.one]).filter(Boolean),
  );
  // A principle said already in this speech gives way to another, then to
  // the side's own reason: no frame or belief twice in one speech.
  const textOf = (key: string) =>
    OPENING_SPEECH_BANK.parts.find((row) => row.key === key)?.text ?? "";
  const fitting = move.bank.parts.core.variants.filter(
    (variant) =>
      allowed.has(variant.key) &&
      !thisSpeech.has(variant.key) &&
      !avoid.has(questionPoint(question, textOf(variant.key))),
  );
  // Of those, the ones that say least of what the speech already said.
  const apart = new Set(
    apartFrom(
      fitting.map((variant) => textOf(variant.key)),
      spokenBefore,
    ),
  );
  const variants = fitting.filter((variant) => apart.has(textOf(variant.key)));
  const own =
    reason && !avoid.has(questionPoint(question, reason))
      ? { text: reason, piece: `reason:${question}:${side}` }
      : null;
  if (!variants.length) return own;
  const result = composeAddress(
    packet(
      `opening:${core.date}:${speakerId}/belief-${question}`,
      core.seed,
      speakerId,
      "chair-male",
      {
        [`family-${family}`]: fact("yes", `question:${question}`),
        [`pole-${pole}`]: fact("yes", `question:${question}`),
      },
      [speakerId],
    ),
    "election-night",
    [
      {
        ...move,
        bank: {
          ...move.bank,
          parts: { ...move.bank.parts, core: { variants } },
        },
      },
    ],
    // A belief already said, here or in the speaker's earlier addresses,
    // is said again only when no other listed principle can say it.
    { recentPartKeys: said },
  );
  if (result.kind !== "rendered") return own;
  const part = result.moves[P.zero]?.parts[P.zero];
  if (!part) return own;
  said.push(part.variantKey);
  thisSpeech.add(part.variantKey);
  const text = OPENING_SPEECH_BANK.parts.find(
    (row) => row.key === part.variantKey,
  )?.text;
  return text ? { text, piece: part.variantKey } : own;
}

/** A governor's or a mayor's year as claims, read from the term read of their realm. */
function realmFacts(areas: readonly AreaRead[]): Country {
  const facts: Facts = {};
  const movement: Record<string, number> = {};
  let better = P.zero,
    worse = P.zero;
  for (const read of areas) {
    facts[`${read.area}-${read.slide >= P.zero ? "better" : "worse"}`] = fact(
      "yes",
      ...read.sourceRecordIds,
    );
    movement[read.area] = Math.abs(read.slide) * N.percentPerRatio;
    better += Math.max(P.zero, read.slide);
    worse += Math.max(P.zero, -read.slide);
  }
  return {
    facts,
    movement,
    macroSlide:
      better + worse > P.zero ? (better - worse) / (better + worse) : P.zero,
    areas,
    macroIds: [],
  };
}

/** Whether a measure went the wrong way in the year's record, and how far against its scale (0 to 1). */
function hardness(country: Country, topic: string): number {
  const bad =
    hardClaims(topic).some((key) => country.facts[key]) ||
    !!country.facts[`${topic}-worse`];
  const scale = SHAPE.changeScale[topic];
  if (!bad || typeof scale !== "number") return P.zero;
  return Math.min(P.one, (country.movement[topic] ?? P.zero) / scale);
}

/** How far a measure went wrong: an area of the term by its slide, a measure of the year by its hardness (0 to 1). */
function wrongBy(country: Country, topic: string): number {
  const read = country.areas.find((row) => row.area === topic);
  return read ? Math.max(P.zero, -read.slide) : hardness(country, topic);
}

/** The bad news the records hold for a measure, as facts (its "-worse" or hard claims). */
function badFacts(country: Country, topic: string): Facts {
  return Object.fromEntries(
    Object.entries(country.facts).filter(
      ([key]) => key === `${topic}-worse` || hardClaims(topic).includes(key),
    ),
  );
}

/** The measure that went most wrong, with a fact that says so, or null. */
function worstCondition(country: Country): string | null {
  return (
    [...new Set([...TERM_AREAS, ...Object.keys(TOPIC_CLAIMS)])]
      .filter(
        (topic) =>
          wrongBy(country, topic) > P.zero &&
          Object.keys(badFacts(country, topic)).length > P.zero,
      )
      .sort(
        (a, b) =>
          wrongBy(country, b) - wrongBy(country, a) || a.localeCompare(b),
      )[P.zero] ?? null
  );
}

/** The levels of government the bill catalog says may answer each question. */
const QUESTION_LEVELS: ReadonlyMap<string, readonly string[]> = new Map(
  (
    billCatalog as unknown as {
      subjects: {
        topics: {
          policies?: { question?: string; levels?: readonly string[] }[];
        }[];
      }[];
    }
  ).subjects.flatMap((subject) =>
    subject.topics.flatMap((topic) =>
      (topic.policies ?? []).flatMap((policy) =>
        policy.question
          ? [[policy.question, policy.levels ?? []] as const]
          : [],
      ),
    ),
  ),
);

/**
 * Whether a speaker at this level speaks to a question: a question the
 * catalog gives to the states as well as the nation is the governors' to
 * speak to, so the President speaks only to the nation's own (owner, Nov 12:
 * "If it's a federal law, it's a federal law"; its "today" sentence is about
 * the states, not the country).
 */
function speaksTo(level: PolicyLevel, question: string): boolean {
  const levels = QUESTION_LEVELS.get(question) ?? [];
  return level !== "federal" || levels.every((row) => row === "federal");
}

/** The bill catalog's subject a question belongs to, or the one the outline gives a question the catalog leaves without. */
export function subjectOf(question: string): string | null {
  return (
    questionSubject(question) ?? OUTLINES.subjectOfQuestion[question] ?? null
  );
}

/**
 * The theme a question sits under: its family, the principle both sides of
 * it argue from (question-names.json `family`). A speech is about one
 * principle, so every point it makes is argued from the same belief (the
 * words lead, Nov 12: abortion, then housing discrimination, then teacher
 * pay, "with nothing joining them").
 */
export function themeOfQuestion(question: string): string | null {
  return questionFamily(question)?.family ?? null;
}

/** Every theme: each family a named question belongs to. */
const THEMES: readonly string[] = [
  ...new Set(
    NAMED_QUESTIONS.flatMap((question) => {
      const theme = themeOfQuestion(question);
      return theme ? [theme] : [];
    }),
  ),
].sort();

/** How many named questions a theme holds, at every level. */
function themeSize(theme: string): number {
  return NAMED_QUESTIONS.filter(
    (question) => themeOfQuestion(question) === theme,
  ).length;
}

/** The mean number of named questions a theme holds. */
const MEAN_THEME_SIZE = NAMED_QUESTIONS.length / Math.max(P.one, THEMES.length);

/** The bill catalog's subjects a theme's questions belong to. */
function subjectsOf(theme: string): readonly string[] {
  return [
    ...new Set(
      NAMED_QUESTIONS.filter(
        (question) => themeOfQuestion(question) === theme,
      ).flatMap((question) => {
        const subject = subjectOf(question);
        return subject ? [subject] : [];
      }),
    ),
  ];
}

/** The pole of its question's principle a stand argues from: a supporter's is the question's own, an opponent's the other. */
export function poleOf(stand: Stand): "a" | "b" | null {
  const family = questionFamily(stand.question);
  if (!family) return null;
  return stand.stance > P.zero
    ? family.forPole
    : family.forPole === "a"
      ? "b"
      : "a";
}

/** How far a speaker's view on a question stands from a centrist's. */
function distinct(official: OfficialRow | undefined, stand: Stand): number {
  return official
    ? Math.abs(stand.stance - ownStance(P.zero, [], stand.question))
    : Math.abs(stand.stance);
}

/** How much a stand is the speaker's own cause: the question itself, and its subject, among their signature issues at any level. */
function mineOf(official: OfficialRow | undefined, stand: Stand): number {
  const signature = official?.signature ?? [];
  return (
    Number(signature.some((row) => row.question === stand.question)) +
    Number(
      signature.some(
        (row) => subjectOf(row.question) === subjectOf(stand.question),
      ),
    )
  );
}

/**
 * The points a theme can make for this speaker: each question under it they
 * hold a view on, open (an ask) or answered by the law in force (a law to
 * defend or to repeal). Their signature issues first, then the open ones,
 * then how far they stand from a centrist; ties by question.
 */
function themeStands(
  official: OfficialRow | undefined,
  stands: readonly Stand[],
  theme: string,
  person?: PersonState,
): Stand[] {
  const mine = (stand: Stand) => mineOf(official, stand);
  // Among the rest, the subject the speaker's traits pull hardest toward.
  const pull = (stand: Stand) => {
    const facets = OUTLINES.subjectPull[subjectOf(stand.question) ?? ""];
    return person && Array.isArray(facets) ? traitSum(person, facets) : P.zero;
  };
  // One pole per speaker (the words lead, Nov 12: a governor argued
  // "families deserve protection" for one veto and "free people in a free
  // market" for the next): every stand a speech makes under a theme is
  // argued from the same pole of its principle, the one the speaker holds
  // most strongly there; a stand on the other pole is left out of the
  // speech, so the theme counts only the points it can argue consistently.
  const under = stands.filter(
    (stand) => themeOfQuestion(stand.question) === theme,
  );
  const weight = (pole: "a" | "b") =>
    under
      .filter((stand) => poleOf(stand) === pole)
      .reduce((sum, stand) => sum + Math.abs(stand.stance), P.zero);
  const held = weight("a") >= weight("b") ? "a" : "b";
  return under
    .filter((stand) => poleOf(stand) === held)
    .sort(
      (a, b) =>
        mine(b) - mine(a) ||
        pull(b) - pull(a) ||
        Number(a.law.inForce) - Number(b.law.inForce) ||
        distinct(official, b) - distinct(official, a) ||
        a.question.localeCompare(b.question),
    );
}

/**
 * The one theme: of the themes with enough for this speaker to make their
 * least number of points, the one with the highest score from their own
 * record (their signature issues under it, at any level; how far they stand
 * from a centrist on its questions) and, for a governor or mayor, their
 * realm's conditions. The President's takes no condition: the national
 * figures are nearly the same in every world. Ties go by the theme's id.
 * Null when no theme can make the points.
 */
// stopgapId: SG-WORDS-speech-theme-weights
export function themeOf(
  official: OfficialRow | undefined,
  stands: readonly Stand[],
  country: Country,
  national: boolean,
  least: number,
  person?: PersonState,
): string | null {
  const w = OUTLINES.theme;
  // How hard the speaker's recorded traits pull toward a theme: the
  // strongest pull of its subjects (speech-outlines.json `subjectPull`),
  // over the strongest pull of any theme, from 0 to 1.
  const pullOf = (theme: string) =>
    Math.max(
      P.zero,
      ...subjectsOf(theme).map((subject) => {
        const facets = OUTLINES.subjectPull[subject];
        return person && Array.isArray(facets)
          ? traitSum(person, facets)
          : P.zero;
      }),
    );
  const strongest = Math.max(P.zero, ...THEMES.map(pullOf));
  const scored = THEMES.map((theme) => {
    const under = themeStands(official, stands, theme);
    const condition = national
      ? P.zero
      : Math.max(
          P.zero,
          ...subjectsOf(theme).flatMap((subject) =>
            topicsOf(subject).map((topic) => hardness(country, topic)),
          ),
        );
    return {
      theme,
      enough: under.length >= least,
      score:
        // The speaker's own causes count where they reach a question this
        // speech can ask about: a signature issue in a subject the
        // speaker's level has no question in does not pull the theme.
        // A theme that holds many questions is not favored for its size:
        // the speaker's causes under it count against how many it holds.
        (w.signature.value *
          (official?.signature ?? []).filter(
            (row) => themeOfQuestion(row.question) === theme,
          ).length *
          MEAN_THEME_SIZE) /
          Math.max(P.one, themeSize(theme)) +
        (under.some((stand) => !stand.law.inForce) ? w.actable.value : P.zero) +
        w.stance.value *
          Math.max(P.zero, ...under.map((stand) => distinct(official, stand))) +
        w.condition.value * condition +
        (strongest > P.zero
          ? (w.traits.value * pullOf(theme)) / strongest
          : P.zero),
    };
  })
    .filter((row) => row.enough && row.score > P.zero)
    .sort((a, b) => b.score - a.score || a.theme.localeCompare(b.theme));
  return scored[P.zero]?.theme ?? null;
}

/**
 * This year's conditions in the government a governor or a local head leads,
 * from the engines that keep them, each with its direction and no figure
 * (SG-WORDS-local-address-conditions). A condition is said only where it
 * bears on the speech's one theme or is the government's biggest fact this
 * year (the lead, Nov 12: the same budget sentence said by a mayor, a county
 * chair and the governor, and a law "folks are already feeling" that had
 * nothing to do with the speech):
 *
 * - the budget's balance this fiscal year (budgets.ts: the latest budget of
 *   the speaker's government, what it takes in against what it spends), as
 *   ahead, about even or short, and against the year before as better,
 *   worse or about the same (the band from speech-outlines.json
 *   `conditions`). It is said when it is short (a deficit is the year's
 *   biggest fact), when the theme is one of `budgetThemes`, or when a point
 *   asks for a line of the budget;
 * - a law of the speaker's jurisdiction that took effect in the past year,
 *   by its spoken name, only when its question is under the theme and the
 *   law-reach records show it has reached people here (`reachedBy`), which
 *   the sentence cites;
 * - a disaster declared for the place in the past year (disasters.ts), for
 *   a local head only, or a statewide one for a governor.
 *
 * Jobs and a big employer's change are not read: no engine keeps a town's
 * or a state's own year-over-year jobs record the speech could cite.
 */
/** How a line of the budget is keyed as a question (contest-positions.ts, law-reach). */
const BUDGET_LINE = "budget-line:";

/** The speaker's government's budgets that have begun, newest first, from the budgets engine. */
function budgetsNow(
  core: CoreState,
  level: PolicyLevel,
  jurisdiction: string | null,
  local: OutlineSpeaker["local"],
) {
  const api = coreAPI(core);
  // The engine's own reader of the government a jurisdiction names.
  const government = jurisdiction
    ? (governmentOfJurisdiction(api, jurisdiction) ??
      (local && core.modules.has(BUDGETS_MODULE_ID)
        ? governments(api).find(
            (row) => row.level === (level === "county" ? "county" : "city"),
          )
        : undefined))
    : undefined;
  return government
    ? [...budgetsOf(api, government.id)]
        .filter((row) => row.startsOn <= core.date)
        .sort((a, b) => b.fiscalYear - a.fiscalYear)
    : [];
}

/**
 * A budget line's ask said with what this government already spends on it
 * (the lead, Nov 12: three towns said "I am against more assistance
 * spending" word for word, the question, side and body the same; what
 * differs is each town's own spending): the line's name filled into
 * speech-outlines.json `lineSpent` with this year's amount through moneySaid,
 * citing the budget row. Null for a question that is not a budget line or a
 * line the budget does not fund.
 */
function lineSpentFact(
  core: CoreState,
  level: PolicyLevel,
  jurisdiction: string | null,
  local: OutlineSpeaker["local"],
  question: string,
): GroundedEnglishFact | null {
  if (!question.startsWith(BUDGET_LINE)) return null;
  const [budget] = budgetsNow(core, level, jurisdiction, local);
  const spent = budget?.spendingMinor[question.slice(BUDGET_LINE.length)];
  const about = questionAbout(question);
  if (!budget || !spent || !about) return null;
  return fact(
    OUTLINES.lineSpent
      .replace("{about}", about)
      .replace("{spent}", moneySaid(spent)),
    `question:${question}`,
    budget.id,
  );
}

function conditionFacts(
  core: CoreState,
  level: PolicyLevel,
  jurisdiction: string | null,
  local: OutlineSpeaker["local"],
  theme: string | null,
  pointQuestions: readonly string[],
): Facts {
  const api = coreAPI(core);
  const out: Facts = {};
  const band = OUTLINES.conditions.budgetEvenBand.value;
  // The engine's own reader of the government a jurisdiction names.
  const [budget, before] = budgetsNow(core, level, jurisdiction, local);
  const sum = (rows: Readonly<Record<string, number>>) =>
    Object.values(rows).reduce((total, minor) => total + minor, P.zero);
  // What a budget takes in over what it spends, as a share of its spending.
  const balanceOf = (row: NonNullable<typeof budget>) => {
    const spent = sum(row.spendingMinor);
    return spent > P.zero ? (sum(row.revenueMinor) - spent) / spent : P.zero;
  };
  if (budget) {
    const balance = balanceOf(budget);
    const bears =
      balance < -band ||
      (!!theme && OUTLINES.conditions.budgetThemes.includes(theme)) ||
      pointQuestions.some((question) => question.startsWith(BUDGET_LINE));
    if (bears) {
      out[
        balance > band
          ? "condition-budget-ahead"
          : balance < -band
            ? "condition-budget-short"
            : "condition-budget-even"
      ] = fact("yes", budget.id);
      // Against the year before, where the records keep it.
      const change =
        before && before.fiscalYear === budget.fiscalYear - P.one
          ? balance - balanceOf(before)
          : P.zero;
      out[
        change > band
          ? "condition-budget-better"
          : change < -band
            ? "condition-budget-worse"
            : "condition-budget-steady"
      ] = before ? fact("yes", before.id) : fact("yes", budget.id);
      out["budget-year"] = fact(String(budget.fiscalYear), budget.id);
      // How far ahead or short this government's year is, as people say a
      // sum ("about $40,000"): the year is the same in every world, the gap
      // is this government's own.
      if (balance > band || balance < -band)
        out["budget-gap"] = fact(
          moneySaid(
            Math.abs(sum(budget.revenueMinor) - sum(budget.spendingMinor)),
          ),
          budget.id,
        );
    }
  }
  const yearAgo = addDays(
    core.date as IsoDate,
    -Math.round(api.parameter("daysPerMeanYear")),
  );
  // A law under the theme that took effect this past year and reached people.
  const enacted =
    jurisdiction && theme && core.modules.has(LAWS_MODULE_ID)
      ? (
          api
            .moduleState(LAWS_MODULE_ID)
            .table("laws")
            .rows() as unknown as LawRowInput[]
        )
          .filter(
            (row) =>
              row.jurisdiction === jurisdiction &&
              row.effectiveDate > yearAgo &&
              row.effectiveDate <= core.date &&
              row.value === P.one &&
              !!questionLaw(row.series) &&
              themeOfQuestion(row.series) === theme,
          )
          .sort(
            (a, b) =>
              b.effectiveDate.localeCompare(a.effectiveDate) ||
              a.series.localeCompare(b.series),
          )
          .map((row) => ({
            row,
            reached: reachedBy(api, row.series, row.id),
          }))
          .find((law) => law.reached.length > P.zero)
      : undefined;
  if (enacted) {
    out["condition-law"] = fact(
      questionLaw(enacted.row.series)!,
      enacted.row.id,
    );
    out["condition-law-reached"] = {
      text: "yes",
      sourceRecordIds: [
        enacted.row.id,
        ...enacted.reached.map((row) => row.personId),
      ] as EntityId[],
    };
  }
  const disaster = core.modules.has(DISASTERS_MODULE_ID)
    ? townDisasters(api)
        .filter(
          (row) =>
            row.declared > yearAgo &&
            row.declared <= core.date &&
            (local ? true : row.statewide),
        )
        .sort((a, b) => b.declared.localeCompare(a.declared))[P.zero]
    : undefined;
  if (disaster && !enacted)
    out["condition-disaster"] = fact(
      disaster.type.toLocaleLowerCase("en-US"),
      `disaster:${disaster.number}`,
    );
  return out;
}

/** A figure said in a context sentence: one decimal, no trailing zero. */
function figure(value: number): string {
  return String(Number(value.toFixed(N.decimals)));
}

/** Whole years between two dates. */
function yearsBetween(api: CoreAPI, from: string, to: string): number {
  return Math.floor(
    daysBetweenText(from, to) / api.parameter("daysPerMeanYear"),
  );
}

/**
 * The context of a measure, from the world's records over a span (owner,
 * Nov 12: "for 30 years we've suffered from terrible inflation, averaging out
 * to over 12% per year"): how many whole years the macro engine's months
 * cover, and the measure's average over them. For an area of the term read,
 * the years since the speaker took office. Empty when the span is too short
 * to say.
 */
function contextFacts(
  core: CoreState,
  topic: string,
  country: Country,
  serviceStart: string,
): Facts {
  const api = coreAPI(core);
  const least = OUTLINES.theme.contextYearsMin.value;
  if ((TERM_AREAS as readonly string[]).includes(topic)) {
    const years = yearsBetween(api, serviceStart, core.date);
    const read = country.areas.find((row) => row.area === topic);
    return read && years >= least
      ? {
          "context-years": fact(String(years), ...read.sourceRecordIds),
          [`context-${topic}`]: fact("yes", ...read.sourceRecordIds),
        }
      : {};
  }
  const months = macroHistory(core);
  const years = Math.floor(months.length / api.parameter("macroMonthsPerYear"));
  if (years < least) return {};
  const span = months.slice(-years * api.parameter("macroMonthsPerYear"));
  const ids = [span[P.zero]!.id, span.at(-P.one)!.id];
  const mean = (pick: (row: MacroMonth) => number) =>
    span.reduce((sum, row) => sum + pick(row), P.zero) / span.length;
  const yearly = (pick: (row: MacroMonth) => number) =>
    (Math.pow(pick(span.at(-P.one)!) / pick(span[P.zero]!), P.one / years) -
      P.one) *
    N.percentPerRatio;
  const amount: Record<string, () => number> = {
    inflation: () => mean((row) => row.inflationPct),
    unemployment: () => mean((row) => row.unemploymentPct),
    mortgage: () => mean((row) => row.mortgage30Pct),
    wages: () => yearly((row) => row.hourlyEarnings),
    growth: () => yearly((row) => row.realOutput),
  };
  const of = amount[topic];
  return of
    ? {
        "context-years": fact(String(years), ...ids),
        "context-amount": fact(figure(of()), ...ids),
        [`context-${topic}`]: fact("yes", ...ids),
      }
    : {};
}

/** Every month the macro engine has recorded or will open from, oldest first, up to today. */
function macroHistory(core: CoreState): MacroMonth[] {
  const api = coreAPI(core);
  const recorded = core.modules.has(MACRO_MODULE_ID)
    ? (api
        .moduleState(MACRO_MODULE_ID)
        .table("months")
        .rows() as unknown as MacroMonth[])
    : [];
  const drawn = historyMonths(core.startedAt, core.seed, (key) =>
    api.parameter(key),
  );
  const byMonth = new Map(drawn.map((row) => [row.month, row]));
  for (const row of recorded) byMonth.set(row.month, row);
  return [...byMonth.values()]
    .filter((row) => row.month <= monthKey(core.date))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** The traits that pull a speaker to say each aside, the ones they say. */
function asidesOf(
  speaker: PersonState,
  allowed: readonly Section[],
): ReadonlySet<Section> {
  const par = SHAPE.parameters;
  const keys = allowed.filter((key) => key in SHAPE.asides);
  const talk =
    traitSum(speaker, SHAPE.talk.more) - traitSum(speaker, SHAPE.talk.less);
  const count = Math.max(
    P.zero,
    Math.min(
      keys.length,
      Math.round(par.asidesBase.value + par.asidesPerTalk.value * talk),
    ),
  );
  return new Set(
    keys
      .map((key) => ({ key, pull: traitSum(speaker, SHAPE.asides[key]!) }))
      .sort((a, b) => b.pull - a.pull || a.key.localeCompare(b.key))
      .slice(P.zero, count)
      .map((row) => row.key),
  );
}

/**
 * Plan a speech of one kind from its outline row and the world: the one
 * planner for the President's, a governor's and a mayor's address.
 */
export function planSpeech(
  core: CoreState,
  kindKey: string,
  speaker: OutlineSpeaker,
): SpeechPlan {
  const row = outlineOf(kindKey);
  const kind = row.bank;
  // A kind said at any level (a floor speech, a campaign speech) takes the
  // speaker's own level from their office row.
  const level = speaker.local?.level ?? row.level;
  if (!kind || !level) throw new Error(`${kindKey} has no address bank`);
  const api = coreAPI(core);
  const person = speaker.person;
  const voice = voiceOf(person);
  const federal = level === "federal";
  const country = federal
    ? countryFacts(core, speaker.serviceStart)
    : realmFacts(speaker.areas ?? []);
  const official = speaker.official;
  const local = speaker.local;
  const stands = official
    ? standsAt(api, official, level, speaker.jurisdiction).filter((stand) =>
        speaksTo(level, stand.question),
      )
    : local && speaker.jurisdiction
      ? standsOfPerson(
          api,
          person.id,
          local.party,
          local.questions,
          local.officeId,
          speaker.jurisdiction,
        )
      : [];
  // Every question the speaker's level may answer and holds a view on: an
  // open one is an ask, one the law in force answers is a law to defend or
  // repeal. The theme is the one with enough of them to make its points.
  const theme = themeOf(
    official,
    stands,
    country,
    federal,
    row.leastPoints,
    person,
  );
  const pointStands = theme
    ? themeStands(official, stands, theme, person).slice(P.zero, row.points)
    : [];
  const asks = pointStands;
  // The kind of address (owner, Nov 8), from the world and the speaker.
  const situation = addressSituation(core, {
    macroSlide: country.macroSlide,
    areas: country.areas,
    priorities: asks.length,
    prioritiesMax: Math.max(P.one, row.asks),
  });
  const firstYear =
    daysBetweenText(speaker.serviceStart, core.date) <
    api.parameter("daysPerMeanYear");
  // The term's worst condition (the words lead, Nov 12: "the kind decides
  // what the address is about, the speaker's issues decide only what they do
  // about it"): the measure that went most wrong, read from the same records
  // that score the crisis and combative kinds (HURT_KINDS), an area of the
  // term by how far it slid and a measure of the year by how far it moved
  // against its scale. Such an address opens its body on it; with none to
  // say, the address takes neither kind.
  const crisisTopic = worstCondition(country);
  // A speaker in their first year takes no lap for a record they did not make.
  const addressKind = chooseAddressKind(person, situation, [
    ...(firstYear || !row.ownRecord ? (["victory"] as const) : []),
    ...(crisisTopic ? [] : HURT_KINDS),
  ]);
  const crisis = HURT_KINDS.includes(addressKind) ? crisisTopic : null;
  // What the theme is about in the world's measures, the hardest first: the
  // first point opens with its figure where the records hold one.
  const held = (topic: string) =>
    (TOPIC_CLAIMS[topic] ?? []).some((key) => country.facts[key]) ||
    !!country.facts[`${topic}-better`] ||
    !!country.facts[`${topic}-worse`];
  // An area of the term is context only where it went the wrong way: a
  // point opens on what needs doing, never on an area that held still.
  const themeTopics = (theme ? subjectsOf(theme).flatMap(topicsOf) : [])
    .filter(held)
    // A crisis's condition is told once, in its own point first.
    .filter((topic) => topic !== crisis)
    .filter(
      (topic) =>
        !(TERM_AREAS as readonly string[]).includes(topic) ||
        hardness(country, topic) > P.zero,
    )
    .sort(
      (a, b) =>
        hardness(country, b) - hardness(country, a) ||
        (country.movement[b] ?? P.zero) - (country.movement[a] ?? P.zero) ||
        a.localeCompare(b),
    );
  // A figure joins a point only when the question's own row names the
  // measure as bearing on it and helping the speaker's side (question-names
  // `figures`; the words lead, Nov 12: grocery prices led into the debt
  // limit). Each measure is told once, at the first point it may join.
  const topicOf = new Map<string, string>();
  for (const stand of pointStands) {
    const used = new Set(topicOf.values());
    const side = stand.stance > P.zero ? "for" : "against";
    const allowed = questionFigures(stand.question)
      .filter((row) => row.side === side)
      .map((row) => row.measure);
    const topic = themeTopics.find(
      (row) => !used.has(row) && allowed.includes(row),
    );
    if (topic) topicOf.set(stand.question, topic);
  }
  const points = [...topicOf.values()];
  // Everything said is about the theme: the year's claims kept are its
  // measures', so no other figure is told beside them.
  const kept = new Set(points.flatMap((topic) => TOPIC_CLAIMS[topic] ?? []));
  const themeFacts: Facts = Object.fromEntries(
    Object.entries(country.facts).filter(
      ([key]) =>
        kept.has(key) ||
        points.some((topic) => key.startsWith(`${topic}-`)) ||
        key.startsWith("mood-"),
    ),
  );

  const kindFact = {
    [`kind-${addressKind}`]: fact(
      "yes",
      ...new Set([
        ...country.macroIds,
        ...country.areas.flatMap((read) => read.sourceRecordIds),
        ...(situation.griefId ? [situation.griefId] : []),
        person.id,
      ]),
    ),
  };
  const move = (
    role: string,
    options: { topic?: string; required?: boolean } = {},
  ) => openingMove(kind, voice, role, { ...options, addressKind });
  const party = (official?.party ?? "").toLowerCase();
  const creedFacts: Facts = official
    ? {
        [`party-${PARTY_FACT[party] ?? "other"}`]: fact("yes", official.id),
      }
    : {};
  const asides = asidesOf(person, row.asides);
  const ownRecord = row.ownRecord && !firstYear;

  // Each point's plan: its shape (one per point, in the order the speaker's
  // traits pull), the speaker's side, how that side describes the question
  // today, the belief's family and pole, its figure and its name's number.
  const order = shapeOrder(person);
  // The beliefs this speaker said before, in earlier addresses, then here.
  const beliefsSaid = earlierAddressPieces(core, person.id);
  const beliefsHere = new Set<string>();
  // What the points planned so far say, in order.
  const spoken: string[] = [];
  const planned: PlannedPoint[] = pointStands.map((stand, at) => {
    const side = stand.stance > P.zero ? "for" : "against";
    const family = questionFamily(stand.question);
    const believe = (avoid: ReadonlySet<string>) =>
      family
        ? beliefWords(
            core,
            person.id,
            kind,
            voice,
            family.family,
            side === "for"
              ? family.forPole
              : family.forPole === "a"
                ? "b"
                : "a",
            stand.question,
            side,
            beliefsSaid,
            beliefsHere,
            spoken.join(" ") || null,
            avoid,
          )
        : null;
    // What a wording claims (question-names.json `points`): a paragraph
    // never makes one point twice (the lead, Nov 12: "a complaint goes up
    // the chain of command, to people who know the work. Because I believe
    // an officer should be judged by people who have done the job").
    const pointOf = (text: string) => questionPoint(stand.question, text);
    const wordings = questionTodayWordings(
      stand.question,
      stand.law.inForce,
      side,
    );
    let belief = believe(new Set());
    // Where every wording of how it stands makes the belief's own point,
    // the belief gives way to one that makes another.
    if (
      belief &&
      wordings.length &&
      wordings.every((text) => pointOf(text) === pointOf(belief!.text))
    )
      belief = believe(new Set(wordings.map(pointOf)));
    // How it stands, in the wordings that make another point than the
    // belief and say least of what it and the points before it said.
    const todays = apartFrom(
      wordings.filter(
        (text) => !belief || pointOf(text) !== pointOf(belief.text),
      ),
      [belief?.text, ...spoken].filter(Boolean).join(" ") || null,
    );
    spoken.push(
      ...[belief?.text, todays[P.zero]].filter(
        (text): text is string => !!text,
      ),
    );
    return {
      question: stand.question,
      shape: order[at % order.length]!,
      side,
      today: todays[P.zero] ?? null,
      todays,
      family: family?.family ?? null,
      pole: family
        ? side === "for"
          ? family.forPole
          : family.forPole === "a"
            ? "b"
            : "a"
        : null,
      figure: topicOf.get(stand.question) ?? null,
      number: questionNumber(stand.question),
      belief,
    };
  });
  type Draft = Omit<Block, "part"> & { readonly joins?: boolean };
  /**
   * What a close says after the one ask: what follows from it for the people
   * the speech named, where the ask changes the law (how the question will
   * stand, in the speaker's side's words, when it is not one the speech has
   * said), else the side's own reason where the belief has not said it, and
   * the theme said short (themeShort), never the long name a close's slot
   * cannot hold.
   */
  const closeFacts = (): Facts => {
    const first = pointStands[P.zero];
    const plan = planned[P.zero];
    if (!first || !plan) return {};
    const side = first.stance > P.zero ? "for" : "against";
    const cited = `question:${first.question}`;
    const changes = first.stance > P.zero !== first.law.inForce;
    const after = changes
      ? questionToday(first.question, !first.law.inForce, side)
      : null;
    const reason = questionReasons(first.question, side).reason;
    const short = theme ? OUTLINES.themeShort[theme] : undefined;
    return {
      ...(after && !plan.todays.includes(after)
        ? { "first-after": fact(clauseOf(after), cited, first.law.id) }
        : {}),
      ...(reason && !(plan.belief?.text ?? "").includes(reason)
        ? { "first-reason": fact(reason, cited) }
        : {}),
      ...(short ? { "theme-short": fact(short, cited) } : {}),
    };
  };
  /**
   * A crisis or combative address's first point: the term's worst condition, said with
   * its fact. Over the years the speaker has held office where the bank says
   * the measure that way (context, then what it has meant), else as the
   * record's one line of it (story-says), never both, so it is said once.
   */
  const crisisDraft = (topic: string): Draft => {
    const context = contextFacts(core, topic, country, speaker.serviceStart);
    const told = context[`context-${topic}`]
      ? move("context", { topic })
      : null;
    return {
      key: `crisis-${topic}`,
      level: "country",
      facts: { ...badFacts(country, topic), ...context },
      moves: told
        ? [told, move("meaning", { topic })]
        : [move("story-says", { topic })],
    };
  };
  const sections: Record<Section, () => Draft[]> = {
    salutation: () => [
      {
        key: "salutation",
        level: "salutation",
        facts: {},
        moves: [move("salutation", { required: true })],
        required: true,
      },
    ],
    occasion: () => {
      const prior = (person.pastFacts ?? []).find(
        (past) => past.kind === PRESIDENT_FACT.priorOffice,
      );
      return [
        {
          key: "occasion",
          level: "occasion",
          joins: true,
          facts: {
            ...themeFacts,
            ...(prior?.facts?.title
              ? { "prior-office": fact(prior.facts.title, prior.id) }
              : {}),
            ...(federal
              ? {}
              : conditionFacts(
                  core,
                  level,
                  speaker.jurisdiction,
                  local,
                  theme,
                  pointStands.map((stand) => stand.question),
                )),
          },
          moves: [
            move("occasion"),
            move("oath"),
            // This year's conditions in the government the speaker leads,
            // one or two true things from its records with their direction
            // (`conditionFacts`).
            ...(federal
              ? []
              : [move("budget-condition"), move("year-condition")]),
          ],
        },
      ];
    },
    creed: () => [
      {
        key: "creed",
        level: "occasion",
        facts: creedFacts,
        moves: [move("creed"), move("unity")],
      },
    ],
    history: () => [
      {
        key: "history",
        level: "occasion",
        facts: creedFacts,
        moves: [move("history")],
      },
    ],
    // Each point, one paragraph (owner, Nov 12: "disjointed statements put
    // together"), in one of several shapes (`pointShapes`): how its question
    // stands today, as the speaker's side describes it; its figure, only
    // where the question's row lets that side use one, tied to the question;
    // what the speaker believes, by the question's family and the speaker's
    // pole of it; and the ask, plainly for or against.
    theme: () => [
      // A crisis or combative address's first point is the term's worst condition, said
      // with its fact; the speaker's own theme follows.
      ...(crisis ? [crisisDraft(crisis)] : []),
      ...pointStands.map((stand, at): Draft => {
        const plan = planned[at]!;
        const shape = OUTLINES.pointShapes.shapes[plan.shape]!;
        const rank =
          stand.stance < P.zero ? "rank-line" : (RANKS[at] ?? "rank-line");
        const facts = standFacts(stand, person.id, rank);
        // A budget line is said with what this government spends on it now.
        const spent = lineSpentFact(
          core,
          level,
          speaker.jurisdiction,
          local,
          stand.question,
        );
        if (spent) facts.about = spent;
        // An unnumbered speech lists no ranks ("no ask list by number"), and a
        // belief that leads into the ask takes the opener's place.
        if (!row.numberedAsks || shape.belief === "belief-leads")
          delete facts[rank];
        // A federal stand is said as federal only by a federal speaker.
        if (!federal) delete facts["federal-level"];
        const topic = topicOf.get(stand.question);
        const belief = plan.belief?.text ?? null;
        const cited = [`question:${stand.question}`, stand.law.id];
        const figureMoves = topic
          ? [
              move("context", { topic }),
              move("meaning", { topic }),
              // The year's claim, only by one who governed it.
              ...(ownRecord ? [move("story-says", { topic })] : []),
              move("tie"),
            ]
          : [];
        return {
          key: `point-${stand.question}`,
          level: "country",
          facts: {
            ...themeFacts,
            ...(topic
              ? {
                  ...contextFacts(core, topic, country, speaker.serviceStart),
                  "figure-ties": fact("yes", ...cited),
                }
              : {}),
            ...facts,
            [`about-${plan.number}`]: fact("yes", `question:${stand.question}`),
            // Every wording of how the question stands for this side: the
            // composer's pick among the bank's today pieces spreads them.
            ...Object.fromEntries(
              plan.todays.flatMap((said, at) => {
                // The wording's slot ending, in words (`todaySlots`): a slot
                // name holds no digit.
                const n = OUTLINES.todaySlots[at];
                if (n === undefined) return [];
                return [
                  [`today${n}`, fact(said, ...cited)],
                  [`today-clause${n}`, fact(clauseOf(said), ...cited)],
                  [
                    `today-question${n}`,
                    fact(clauseOf(said).replace(/[.!?]$/, ""), ...cited),
                  ],
                ];
              }),
            ),
            ...(belief
              ? {
                  belief: fact(belief, person.id, `question:${stand.question}`),
                  [shape.belief]: fact("yes", person.id),
                }
              : {}),
            ...(plan.shape === "question-first"
              ? { "asks-question": fact("yes", `question:${stand.question}`) }
              : {}),
          },
          moves: shape.moves.flatMap((name) =>
            name === "figure" ? figureMoves : [move(name)],
          ),
        };
      }),
    ],
    people: () => [
      {
        key: "people",
        level: "people",
        facts: themeFacts,
        moves: [move("people")],
      },
    ],
    states: () => [
      {
        key: "to-states",
        level: "states",
        facts: {},
        moves: [move("to-states")],
      },
    ],
    call: () => [
      {
        key: "call",
        level: "families",
        facts: { ...themeFacts, ...creedFacts },
        moves: [move("call")],
      },
    ],
    hope: () => [
      { key: "hope", level: "close", facts: themeFacts, moves: [move("hope")] },
    ],
    families: () => [
      {
        key: "families",
        level: "families",
        facts: themeFacts,
        moves: [move("families")],
      },
    ],
    close: () =>
      [
        {
          key: "close",
          level: "close",
          // Its own paragraph: the close returns to the theme in one sentence.
          facts: (pointStands[P.zero]
            ? {
                "first-side": fact(
                  questionSide(
                    pointStands[P.zero]!.question,
                    pointStands[P.zero]!.stance > P.zero
                      ? pointStands[P.zero]!.law.inForce
                        ? "keep"
                        : "for"
                      : pointStands[P.zero]!.law.inForce
                        ? "repeal"
                        : "against",
                  )!,
                  `question:${pointStands[P.zero]!.question}`,
                ),
              }
            : {}) as Facts,
          moves: [move("close", { required: true })],
          required: true,
        },
      ].map((draft): Draft => ({
        ...draft,
        level: "close",
        facts: { ...draft.facts, ...closeFacts() } as Facts,
      })),
  };
  const drafts = row.sections
    .filter((section) => !row.asides.includes(section) || asides.has(section))
    .flatMap((section) =>
      sections[section]().map((draft) => ({
        ...draft,
        ...(row.required.includes(section) && section !== "theme"
          ? { required: true }
          : {}),
      })),
    )
    // A section the bank has no piece for (one whose pieces carry nothing)
    // is left out before the paragraphs are counted, so the greeting joins
    // what is actually said next.
    .filter((draft) => draft.moves.some(Boolean));
  // The world's names and the theme's subjects, which every part may say.
  // A governor or a mayor says the place by name and the theme in words
  // (the words lead, Nov 12: "this state" eight times, the state's name never).
  // stopgapId: SG-WORDS-local-address-conditions
  if (!federal) markWordsStopgap("SG-WORDS-local-address-conditions");
  const realm = federal
    ? null
    : level === "state"
      ? coreStateName((speaker.jurisdiction ?? "").replace(/^US-/, ""))
      : (local?.realmName ??
        (core.placeMetadata.placeName ?? "").split(",")[P.zero]?.trim() ??
        null);
  const themeName = theme ? (OUTLINES.themeNames[theme] ?? null) : null;
  const themeCited = pointStands.map((stand) => `question:${stand.question}`);
  const world: Facts = federal
    ? worldFacts(core, person, kind, voice, country, points)
    : {
        ...(realm
          ? { "realm-name": fact(realm, speaker.jurisdiction ?? person.id) }
          : {}),
        ...(local?.body ? { body: fact(local.body, local.officeId) } : {}),
        // What the body passes, as it names it: a legislature's bills, a
        // town's or a county's ordinances (the one form rule, by the office
        // kind on the record; line rule body-named-as-place-names-it).
        measure: fact(
          OUTLINES.measureWords[
            formKindOf(
              local
                ? (officeKindOf(core, local.officeId) ?? "")
                : "legislature-lower",
            )
          ]!,
          local?.officeId ?? speaker.jurisdiction ?? person.id,
        ),
        ...(local?.officeTitle
          ? { "office-title": fact(local.officeTitle, local.officeId) }
          : {}),
        ...(themeName && themeCited.length
          ? { "theme-name": fact(themeName, ...themeCited) }
          : {}),
      };
  // One paragraph per block; the block after the greeting joins its
  // paragraph, so the greeting never stands alone, and the close joins the
  // one before it.
  let part = -P.one;
  const blocks = drafts.map((draft, at): Block => {
    // No paragraph of one aside: what the speaker believes joins the
    // greeting's paragraph, and the hope joins the close.
    const before = drafts[at - P.one]?.key;
    const together =
      draft.joins ||
      before === "salutation" ||
      (draft.key === "creed" && before === "occasion") ||
      (draft.key === "close" && before === "hope");
    if (!together || part < P.zero) part += P.one;
    const { joins, ...rest } = draft;
    void joins;
    const facts = Object.fromEntries(
      Object.entries({ ...world, ...kindFact, ...rest.facts }).filter(
        ([, value]) => value !== undefined,
      ),
    ) as Facts;
    return { ...rest, facts, part };
  });
  return {
    blocks,
    addressKind,
    theme,
    asks: asks.map((stand) => stand.question),
    points: planned,
  };
}

/** An office row's kind, from the offices engine. */
function officeKindOf(core: CoreState, officeId: string): string | undefined {
  if (!core.modules.has(OFFICES_MODULE_ID)) return undefined;
  return (
    coreAPI(core)
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(officeId) as { kind?: string } | undefined
  )?.kind;
}

/** The party fact a speaker's creed is said with, by the party's name. */
const PARTY_FACT: Readonly<Record<string, string>> = {
  republican: "republican",
  democratic: "democratic",
  democrat: "democratic",
};
