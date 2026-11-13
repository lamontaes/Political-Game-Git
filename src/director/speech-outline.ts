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
import { LAWS_MODULE_ID } from "../core2/modules/laws";
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
import { termSaid } from "../english/count-words";
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
  questionSide,
  questionTo,
  questionToday,
} from "../english/question-names";
import { questionSubject } from "../english/policy-names";
import addressData from "./data/opening-address.json" with { type: "json" };
import outlineData from "./data/speech-outlines.json" with { type: "json" };
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import { P } from "../core2/parameters";
import { daysBetweenText } from "../core2/kernel/dates";
import {
  TERM_AREAS,
  countryTermRead,
  type AreaRead,
} from "../core2/modules/laws";
import {
  addressSituation,
  chooseAddressKind,
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
  themes: Readonly<Record<string, readonly string[] | string>>;
  subjectOfQuestion: Readonly<Record<string, string>>;
  subjectPull: Readonly<Record<string, readonly string[] | string>>;
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
    const law = power.allowed ? lawOn(api, question, jurisdiction) : null;
    return law
      ? [
          {
            question,
            stance,
            signature: own.has(question),
            power: power.source,
            law,
          },
        ]
      : [];
  });
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
  official: OfficialRow,
  rank: string,
): Facts {
  // The ask cites the powers record and the law it read (ask why).
  const asked = [
    official.id,
    `question:${stand.question}`,
    stand.power,
    stand.law.id,
  ];
  const side = stand.stance > P.zero ? "for" : "against";
  const sideWords = questionSide(stand.question, side);
  return {
    about: fact(questionAbout(stand.question)!, ...asked),
    to: fact(questionTo(stand.question)!, ...asked),
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

/** The theme a question's subject sits under (speech-outlines.json `themes`). */
export function themeOfQuestion(question: string): string | null {
  const subject = subjectOf(question);
  return (
    Object.keys(OUTLINES.themes).find(
      (key) =>
        key !== "about" &&
        subject !== null &&
        subjectsOf(key).includes(subject),
    ) ?? null
  );
}

/** How many named questions a theme holds, at every level. */
function themeSize(theme: string): number {
  return NAMED_QUESTIONS.filter(
    (question) => themeOfQuestion(question) === theme,
  ).length;
}

/** The mean number of named questions a theme holds. */
const MEAN_THEME_SIZE =
  NAMED_QUESTIONS.length /
  Math.max(
    P.one,
    Object.keys(OUTLINES.themes).filter((key) => key !== "about").length,
  );

/** The subjects under a theme. */
function subjectsOf(theme: string): readonly string[] {
  const row = OUTLINES.themes[theme];
  return Array.isArray(row) ? row : [];
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
  return stands
    .filter((stand) => themeOfQuestion(stand.question) === theme)
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
  const themes = Object.keys(OUTLINES.themes).filter((key) => key !== "about");
  // How hard the speaker's recorded traits pull toward a theme: the
  // strongest pull of its subjects (speech-outlines.json `subjectPull`),
  // over the strongest pull of any theme, from 0 to 1 (from the speeches
  // branch, words-speech-outline: two Presidents with no cause in reach
  // still differ, so no question leads every address).
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
  const strongest = Math.max(P.zero, ...themes.map(pullOf));
  const scored = themes
    .map((theme) => {
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
          (under.some((stand) => !stand.law.inForce)
            ? w.actable.value
            : P.zero) +
          w.stance.value *
            Math.max(
              P.zero,
              ...under.map((stand) => distinct(official, stand)),
            ) +
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
  if (!kind || !row.level) throw new Error(`${kindKey} has no address bank`);
  const api = coreAPI(core);
  const person = speaker.person;
  const voice = voiceOf(person);
  const federal = row.level === "federal";
  const country = federal
    ? countryFacts(core, speaker.serviceStart)
    : realmFacts(speaker.areas ?? []);
  const official = speaker.official;
  const level = row.level;
  const stands = official
    ? standsAt(api, official, level, speaker.jurisdiction).filter((stand) =>
        speaksTo(level, stand.question),
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
  // Each measure is told once, as the context of the first point whose
  // subject it bears on.
  const topicOf = new Map<string, string>();
  for (const stand of pointStands) {
    const used = new Set(topicOf.values());
    const topic = themeTopics.find(
      (row) =>
        !used.has(row) &&
        topicsOf(subjectOf(stand.question) ?? "").includes(row),
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
  // A speaker in their first year takes no lap for a record they did not make.
  const addressKind = chooseAddressKind(
    person,
    situation,
    firstYear || !row.ownRecord ? ["victory"] : [],
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

  type Draft = Omit<Block, "part"> & { readonly joins?: boolean };
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
            // The occasion's own record: the term this address opens, by its
            // length (lead, Nov 13: an occasion is always sayable from its
            // own record, never only when a claim or a name is free).
            ...(official?.termYears
              ? {
                  "term-length": fact(
                    termSaid(official.termYears),
                    official.termId ?? official.id,
                  ),
                }
              : {}),
          },
          moves: [move("occasion"), move("oath")],
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
    // Each point, one paragraph in order (owner, Nov 12: "disjointed
    // statements put together"): how its question stands today, from the
    // law in force (and the first point's figure where the records hold
    // one), what that has meant for people, what the speaker believes, and
    // the ask, plainly for or against. A point is never a bare ask.
    theme: () =>
      pointStands.map((stand, at): Draft => {
        const rank =
          stand.stance < P.zero ? "rank-line" : (RANKS[at] ?? "rank-line");
        const facts = standFacts(stand, official!, rank);
        // An unnumbered speech lists no ranks ("no ask list by number").
        if (!row.numberedAsks) delete facts[rank];
        // A federal stand is said as federal only by a federal speaker.
        if (!federal) delete facts["federal-level"];
        const today = questionToday(
          stand.question,
          stand.law.inForce,
          stand.stance > P.zero ? "for" : "against",
        );
        const topic = topicOf.get(stand.question);
        // What the speaker believes on this point, by the theme and the way
        // their side of it leans: a side the left favors is said with the
        // left's belief, whichever way the speaker leans overall, so the
        // reason always fits the ask.
        const tilt =
          ownStance(-P.one, [], stand.question) -
          ownStance(P.one, [], stand.question);
        const lean = stand.stance > P.zero === tilt > P.zero ? "left" : "right";
        // A question with no lean between left and right takes no belief.
        const beliefFacts: Facts =
          theme && tilt !== P.zero
            ? {
                [`theme-${theme}`]: fact("yes", official!.id),
                [`lean-${lean}`]: fact("yes", official!.id),
              }
            : {};
        return {
          key: `point-${stand.question}`,
          level: "country",
          facts: {
            ...themeFacts,
            ...(topic
              ? contextFacts(core, topic, country, speaker.serviceStart)
              : {}),
            ...facts,
            ...(today
              ? {
                  today: fact(
                    today,
                    `question:${stand.question}`,
                    stand.law.id,
                  ),
                }
              : {}),
            ...beliefFacts,
          },
          moves: [
            move("today"),
            ...(topic
              ? [
                  move("context", { topic }),
                  move("meaning", { topic }),
                  // The year's claim, only by one who governed it.
                  ...(ownRecord ? [move("story-says", { topic })] : []),
                ]
              : []),
            // The belief leads into the ask ("Because I believe ..., I ask
            // Congress to ..."), an opener typed by the theme and the lean.
            move("ask"),
          ],
        };
      }),
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
    close: () => [
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
                    ? "for"
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
    ],
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
  const world = federal
    ? worldFacts(core, person, kind, voice, country, points)
    : {};
  // One paragraph per block; the block after the greeting joins its
  // paragraph, so the greeting never stands alone, and the close joins the
  // one before it.
  let part = -P.one;
  const blocks = drafts.map((draft, at): Block => {
    const together = draft.joins || drafts[at - P.one]?.key === "salutation";
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
  };
}

/** The party fact a speaker's creed is said with, by the party's name. */
const PARTY_FACT: Readonly<Record<string, string>> = {
  republican: "republican",
  democratic: "democratic",
  democrat: "democratic",
};
