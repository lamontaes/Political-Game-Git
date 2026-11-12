/**
 * The opening, told as a story (owner, Oct 14, 2026): the President's address
 * about the world the simulation made, that night's evening news, then the
 * player's household at home that evening, where the news can be picked up. Everything said comes from
 * the English engine's mined banks with the world's records in its slots,
 * composed once while the world loads; a sentence the records can't support
 * is left out, never written.
 *
 * - It opens on the address itself, the President speaking with the Vice
 *   President and key people pointed out; home comes after the governor and
 *   the family (owner, Oct 26, 2026).
 * - The address reads the macro engine's opening month against the year
 *   before, saying a figure with what it is, never a bare claim ("Prices are
 *   too high"); the President's own three issues (an ask of Congress only
 *   for an issue the President supports); a place only from a campaign visit
 *   to the player's own state; a governor's name only when the scene
 *   introduces the governor; and the Speaker's recorded gender for the
 *   salutation.
 * - Each person the camera points out is there for a recorded reason: the
 *   sentence that names them, or the player's own household.
 * - The news reads the address as that night's lead story and the town's own
 *   lead story that day (a closure, a hazard, a death, else its jobs figure).
 * - The address is recorded once as a public event, so the news engine
 *   carries it to the town and anyone who hears it can bring it up; the whole
 *   opening is kept on the director's ledger for the screens.
 */
import { applyCoreEvent, coreAPI } from "../core2/state";
import { historyMonths, monthKey, shiftMonth } from "../core2/macro-model";
import type { MacroMonth } from "../core2/macro-model";
import { MACRO_MODULE_ID } from "../core2/modules/macro";
import { officialsIn, type OfficialRow } from "../core2/modules/officials";
import { ownStance } from "../core2/officials-roster";
import { PRESIDENT_FACT } from "../core2/officials-president";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { policyAuthority, type PolicyLevel } from "../core2/policy-authority";
import type { LawRowInput } from "../core2/laws-starting";
import type { CoreAPI, CoreState, PersonId, PersonState } from "../core2/types";
import type { EntityId } from "../core2/kernel/brands";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "../english/grounded-english";
import {
  composeAddress,
  type ComposedMove,
} from "../english/english-composition";
import { addressesGivenBy } from "../core2/modules/people";
import {
  openingMove,
  type OpeningLevel,
  type OpeningMove,
  type OpeningSpeechKind,
  type SpeechVoice,
} from "../english/english-opening-speech";
import openingData from "./data/opening-story.json" with { type: "json" };
import { ADDRESS_FACT, ADDRESS_PART_BREAK } from "./opening-facts";
import {
  NAMED_QUESTIONS,
  questionAbout,
  questionTo,
} from "../english/question-names";
import { questionSubject } from "../english/policy-names";
import addressData from "./data/opening-address.json" with { type: "json" };
import { keyChambersOf } from "../core2/opening-key-people";
import { LEADERSHIP_MODULE_ID, organize } from "../core2/modules/leadership";
import { markWordsStopgap } from "./stopgaps";
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
import kindData from "./data/address-kinds.json" with { type: "json" };

export interface OpeningSentence {
  readonly level: OpeningLevel;
  /** The part of the address it is said in, from 0, one per Continue. */
  readonly part: number;
  readonly text: string;
  readonly sourceRecordIds: readonly string[];
  /** What the sentence is about: the facts it said ("jobs-up", "place", "goal"). */
  readonly facts: readonly string[];
  /** The bank pieces it was joined from, by key. */
  readonly pieces: readonly string[];
  /** What each of those facts said in the sentence, the figure or name filled in. */
  readonly values: Readonly<Record<string, string>>;
  /** The state a place line names, from the campaign visit it came from. */
  readonly stateKey?: string;
  /**
   * The policy question the sentence's block speaks on, in the stand's own
   * words and with the President's side, whether or not this sentence's
   * words said them.
   */
  readonly stand?: {
    readonly about: string;
    readonly to: string;
    readonly stance: "for" | "against";
  };
}

export interface OpeningStory {
  /** The public event the address is recorded as. */
  readonly id: string;
  readonly date: string;
  readonly speechKind: OpeningSpeechKind;
  /** The kind of address it is (crisis, combative, hopeful, victory, mourning, policy), picked from the world and the President. */
  readonly addressKind: AddressKind;
  readonly president: {
    readonly id: PersonId;
    readonly name: string;
    /** The home state's name, from the President's past facts. */
    readonly homeState: string | null;
    /** The office held before, by its title, from the past facts. */
    readonly priorOffice: string | null;
    readonly sourceRecordIds: readonly string[];
  };
  readonly address: {
    readonly sentences: readonly OpeningSentence[];
    /** The first sentence, the one the opening shows first. */
    readonly openingLine: OpeningSentence;
    /** The line people remember: the President's own ask, else the country's state. */
    readonly rememberedLine: OpeningSentence;
    readonly text: string;
    /** The address as the talk box plays it, one paragraph per Continue. */
    readonly parts: readonly string[];
    readonly sourceRecordIds: readonly string[];
  };
  /** The handoff: the player's household at home on the evening of day one. */
  readonly home: {
    readonly date: string;
    readonly householdId: string;
    readonly memberIds: readonly PersonId[];
    /** A subject the household can bring up: the address, by its event. */
    readonly subjectEventId: string;
  };
}

interface OpeningData {
  numbers: {
    decimals: number;
    jobsPerSeriesUnit: number;
    jobsPerMillion: number;
    percentPerRatio: number;
  };
  speechTitles: Readonly<Record<OpeningSpeechKind, string>>;
}
const DATA = openingData as unknown as OpeningData;
const KIND_DATA = kindData as unknown as {
  kinds: Readonly<Record<AddressKind, { topics: number; tone?: number }>>;
};
const N = DATA.numbers;

/** The offices engine's public record of the taking of office on Inauguration Day. */
const INAUGURATION_EVENT = "inauguration";

/** The kind of public event the address is recorded as. */
export const OPENING_ADDRESS_EVENT = "president.address";

export type Facts = Record<string, GroundedEnglishFact>;

export const fact = (text: string, ...ids: string[]): GroundedEnglishFact => ({
  text,
  sourceRecordIds: ids as EntityId[],
});

function packet(
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
 * people to their world"): the Vice President and the Speaker by name, the
 * President's home state and last office, the year's hardest and best subject
 * in words (the one that moved furthest the wrong way, and the right way),
 * and the first thing the President will ask Congress for. A part says what
 * it needs of these and is left out where the record holds none.
 */
function worldFacts(
  core: CoreState,
  president: PersonState,
  officialId: string,
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  country: Country,
  first: Stand | undefined,
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
  const home = past(PRESIDENT_FACT.homeState);
  if (home?.facts?.stateName)
    facts["home-state"] = fact(home.facts.stateName, home.id);
  const prior = past(PRESIDENT_FACT.priorOffice);
  if (prior?.facts?.title)
    facts["prior-office"] = fact(prior.facts.title, prior.id);
  // The year's subjects, the furthest moved first; a tie goes by name.
  const ranked = (claims: (topic: string) => readonly string[]) =>
    Object.keys(TOPIC_CLAIMS)
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
  for (const topic of Object.keys(TOPIC_CLAIMS)) {
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
  if (first) {
    const asked = [
      officialId,
      `question:${first.question}`,
      first.power,
      first.law.id,
    ];
    facts["first-about"] = fact(questionAbout(first.question)!, ...asked);
    facts["first-to"] = fact(questionTo(first.question)!, ...asked);
  }
  return facts;
}

/** The world's names and subjects an address says no more often than `namesSaid` while another wording can do without them. */
const WORLD_NAMES: readonly string[] = [
  "vice-president",
  "speaker",
  "home-state",
  "prior-office",
  "hardest",
  "best",
];

/** The world's names that are never said more than `namesSaid` times unless a required move needs them: its people and the President's own state and office. */
const PERSON_NAMES: readonly string[] = [
  "vice-president",
  "speaker",
  "home-state",
  "prior-office",
];

/** The times a lead-in may name, which its core then does not name again. */
const TIME_WORDS: readonly string[] = ["year", "term", "today", "tonight"];

/** A sentence's runs of four words, without the words of a name it says. */
function fourWordRuns(text: string, name?: string): Set<string> {
  const skip = new Set((name ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  const words = text
    .toLowerCase()
    .replace(/[^a-z' ]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !skip.has(word));
  const runs = new Set<string>();
  const size = SHAPE.parameters.sameRunWords.value;
  for (let at = P.zero; at + size <= words.length; at += P.one)
    runs.add(words.slice(at, at + size).join(" "));
  return runs;
}

/** What an address leads with after the greeting. */
type Lead = "occasion" | "country" | "people" | "history" | "mission";

interface AddressData {
  numbersBySubject: Readonly<Record<string, readonly string[]>>;
  mannerTraits: { plain: readonly string[]; polished: readonly string[] };
  /** The facets that pull a President toward each lead. */
  leads: Readonly<Record<Exclude<Lead, "occasion">, readonly string[]>>;
  /** The middle of the address in order, for each lead. */
  orders: Readonly<Record<Lead, readonly string[]>>;
  /** The parts an address may leave out, by the facets that pull a President to say each. */
  asides: Readonly<Record<string, readonly string[]>>;
  /** The facets that make a President say more, and those that keep it short. */
  talk: { more: readonly string[]; less: readonly string[] };
  /** How far each subject moves in an ordinary year's largest move, in its own units. */
  changeScale: Readonly<Record<string, number | string>>;
  parameters: Record<
    | "prioritiesMax"
    | "priorityStanceShare"
    | "storyTopics"
    | "asidesBase"
    | "asidesPerTalk"
    | "namesSaid"
    | "subjectsSaid"
    | "redraws"
    | "sameRunWords",
    { value: number }
  >;
}
const SHAPE = addressData as unknown as AddressData;

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
    ? { id: row.id, inForce: row.value === P.one, jurisdiction }
    : null;
}

/**
 * Every question the President holds a view on that federal law can answer
 * and the world has a law for. The address is national only (owner, Oct 27:
 * "nothing about your state"). Any question in the bill catalog can be here,
 * so two Presidents with different views, or two worlds with different laws,
 * say different things.
 */
function presidentStands(api: CoreAPI, official: OfficialRow): Stand[] {
  return standsAt(api, official, "federal", "US");
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
  return {
    about: fact(questionAbout(stand.question)!, ...asked),
    to: fact(questionTo(stand.question)!, ...asked),
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

/** The Speaker's recorded gender, for "Mr. Speaker" or "Madam Speaker". */
function chairStage(core: CoreState): string {
  const api = coreAPI(core);
  const speaker = officialsIn(api, "US:us-house").find(
    (row) => row.leadership === "presiding",
  );
  const gender = speaker
    ? core.people.get(speaker.id)?.looks?.gender
    : undefined;
  return gender === "female" ? "chair-female" : "chair-male";
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

/**
 * What the address leads with (owner, Nov 1: "Every one of these speeches has
 * the same general outline. They need to vary."). A hard year leads with the
 * country's story, as addresses in a crisis do. Otherwise the President's
 * strongest leaning above zero picks it: the people, the country's long story,
 * their mission (only with a priority to lead with) or the year's work. A
 * President with no leaning opens with the year when a priority bears on it,
 * else with the occasion.
 */
function leadOf(
  president: PersonState,
  record: { hardYear: boolean; firstBears: boolean; priorities: number },
): Lead {
  if (record.hardYear) return "country";
  const leads = (Object.keys(SHAPE.leads) as Exclude<Lead, "occasion">[])
    .filter((lead) => lead in SHAPE.orders && lead !== ("about" as string))
    .filter((lead) => lead !== "mission" || record.priorities > P.zero)
    .map((lead) => ({ lead, pull: traitSum(president, SHAPE.leads[lead]) }))
    .filter((row) => row.pull > P.zero)
    .sort((a, b) => b.pull - a.pull || a.lead.localeCompare(b.lead));
  return leads[P.zero]?.lead ?? (record.firstBears ? "country" : "occasion");
}

/**
 * The asides this President says: a talkative one more of them, a terse one
 * fewer, those their traits pull hardest first. The part the address leads
 * with is always said.
 */
function asidesOf(president: PersonState, lead: Lead): ReadonlySet<string> {
  const par = SHAPE.parameters;
  const keys = Object.keys(SHAPE.asides).filter((key) => key !== "about");
  const talk =
    traitSum(president, SHAPE.talk.more) - traitSum(president, SHAPE.talk.less);
  const count = Math.max(
    P.zero,
    Math.min(
      keys.length,
      Math.round(par.asidesBase.value + par.asidesPerTalk.value * talk),
    ),
  );
  const ranked = keys
    .map((key) => ({ key, pull: traitSum(president, SHAPE.asides[key]!) }))
    .sort(
      (a, b) =>
        Number(b.key === lead) - Number(a.key === lead) ||
        b.pull - a.pull ||
        a.key.localeCompare(b.key),
    );
  return new Set(
    ranked
      .slice(P.zero, Math.max(count, Number(keys.includes(lead))))
      .map((row) => row.key),
  );
}

/**
 * Plan the address from the world's records: which priorities the President
 * leads with and the law on each, the line they will not cross, which of the
 * country's numbers the story tells, and in what order. Two worlds differ in
 * all of it. Nothing in it reads the player's state or town.
 */
function planAddress(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  kind: OpeningSpeechKind,
): { blocks: Block[]; addressKind: AddressKind } {
  const api = coreAPI(core);
  const voice = voiceOf(president);
  const country = countryFacts(core, official.serviceStart);
  const stands = presidentStands(api, official);
  // Congress hears only what it may answer and federal law does not have yet.
  const open = stands.filter((row) => !row.law.inForce);
  const wanted = wantedOf(open);
  const opposed = opposedOf(open);
  const par = SHAPE.parameters;

  // The priorities: the questions they want, while the conviction holds,
  // measured against the strongest want any level may answer.
  const strongest = Math.max(P.zero, ...stands.map((row) => row.stance));
  const priorities = wanted
    .filter(
      (row, at) =>
        at === P.zero ||
        row.stance >= par.priorityStanceShare.value * strongest,
    )
    .slice(P.zero, par.prioritiesMax.value);
  // The line they will not cross, when they hold it harder than their weakest priority.
  const firmest = opposed[P.zero];
  const line =
    firmest && -firmest.stance >= (priorities.at(-P.one)?.stance ?? P.zero)
      ? firmest
      : undefined;

  // A priority argued from the country's year, when its subject bears on it.
  const held = (topic: string) =>
    (TOPIC_CLAIMS[topic] ?? []).some((key) => country.facts[key]);
  const taken = new Set<string>();
  const topicOf = (stand: Stand) => {
    const topic = (
      SHAPE.numbersBySubject[questionSubject(stand.question) ?? ""] ?? []
    ).filter((row) => held(row) && !taken.has(row))[P.zero];
    // The story still tells the subject: the ask does not argue from it.
    return topic;
  };

  // The kind of address this is (owner, Nov 8): picked from the term read by
  // area, the economy's year, a recent disaster and this President's
  // priorities and temperament, then said in that kind's own pieces.
  const situation = addressSituation(core, {
    macroSlide: country.macroSlide,
    areas: country.areas,
    priorities: priorities.length,
    prioritiesMax: par.prioritiesMax.value,
  });
  const addressKind = chooseAddressKind(
    president,
    situation,
    // A President in their first year takes no lap for a record they did not make.
    daysBetweenText(official.serviceStart, core.date) <
      api.parameter("daysPerMeanYear")
      ? ["victory"]
      : [],
  );
  country.facts[`kind-${addressKind}`] = fact(
    "yes",
    ...new Set([
      ...country.macroIds,
      ...country.areas.flatMap((read) => read.sourceRecordIds),
      ...(situation.griefId ? [situation.griefId] : []),
      official.id,
    ]),
  );
  const move = (
    role: string,
    options: { topic?: string; required?: boolean } = {},
  ) => openingMove(kind, voice, role, { ...options, addressKind });
  // A kind with pieces of its own says its turn in every year, not only a hard one.
  const KINDS_WITH_TURN: readonly AddressKind[] = [
    "combative",
    "crisis",
    "hopeful",
    "mourning",
    "victory",
  ];
  const topicCount = Math.max(
    par.storyTopics.value,
    KIND_DATA.kinds[addressKind].topics,
  );

  // Blocks before their part is set: a block that `joins` is said in the
  // same paragraph as the block before it.
  type Draft = Omit<Block, "part"> & { readonly joins?: boolean };
  const blocks: Draft[] = [
    {
      key: "salutation",
      level: "salutation",
      facts: {},
      moves: [move("salutation", { required: true })],
      required: true,
    },
  ];
  const standBlock = (
    stand: Stand,
    rank: (typeof RANKS)[number] | "rank-line",
  ): Draft => ({
    key: `${rank}-${stand.question}`,
    level: "congress",
    facts: {
      ...country.facts,
      ...standFacts(stand, official, rank),
    },
    // One sentence a priority (sent back by the words lead, Nov 11: "the
    // policy point is named once"): its rank leads in, and the ask names it.
    moves: [move("ask")],
  });
  // The world's names and subjects, which every part may say.
  const world = worldFacts(
    core,
    president,
    official.id,
    kind,
    voice,
    country,
    priorities[P.zero],
  );
  const priorityTopics = priorities.map(topicOf);
  const firstBears = !!priorityTopics[P.zero];
  const priorityBlocks = priorities.map((stand, at) =>
    standBlock(stand, RANKS[at]!),
  );
  const lineBlock = line ? standBlock(line, "rank-line") : undefined;

  // The story of the country: whether work is easier or harder to find,
  // and the subjects that moved most, apart from the ones the priorities
  // argue from, under a word for the year. In words, never figures. A
  // better year names its good news first and a hard year its hard news,
  // so the word for the year is borne out by what follows it.
  const good = (topic: string) =>
    (GOOD_CLAIMS[topic] ?? []).some((key) => country.facts[key]);
  // A kind that tells hard news (a reckoning, a railing) leads with what went
  // wrong and tells no good news beside it while there is bad; a kind that
  // tells good news (hopeful, a victory lap) leads with what went right; the
  // rest follow the year's mood.
  const kindTone = KIND_DATA.kinds[addressKind].tone;
  const lean =
    kindTone ??
    (country.facts["mood-better"]
      ? P.one
      : country.facts["mood-hard"]
        ? -P.one
        : P.zero);
  const toneFirst = (topic: string) => (good(topic) ? lean : -lean);
  const candidates = Object.keys(TOPIC_CLAIMS).filter(
    (topic) => topic !== "unemployment" && held(topic) && !taken.has(topic),
  );
  const badToTell =
    kindTone !== undefined &&
    kindTone < P.zero &&
    (candidates.some((topic) => !good(topic)) ||
      !!country.facts["unemployment-up"]);
  const ordered = candidates
    .filter((topic) => !badToTell || !good(topic))
    .sort(
      (a, b) =>
        toneFirst(b) - toneFirst(a) ||
        (country.movement[b] ?? P.zero) - (country.movement[a] ?? P.zero) ||
        a.localeCompare(b),
    )
    .slice(P.zero, topicCount);
  // Work is always told: first, or last when it got harder to find, so the
  // pledge that follows answers it. Worse news on work turns against a
  // better year ("But work has grown harder to find") only when good news
  // is said just before it.
  const jobless =
    held("unemployment") && !(badToTell && good("unemployment"))
      ? ["unemployment"]
      : [];
  const workWorse = !!country.facts["unemployment-up"];
  const told = workWorse ? [...ordered, ...jobless] : [...jobless, ...ordered];
  const before = ordered.at(-P.one);
  const turns =
    workWorse &&
    !!country.facts["mood-better"] &&
    (before === undefined || good(before));
  // After the numbers, what the President means to do about them: a hard
  // year turns first ("It's a reason to get to work."), then every year ends
  // on the pledge its record supports (owner, Oct 28 sitting, 11: "so what is
  // he going to do about it?"). A new President never claims the gains.
  const story: Draft = {
    key: "story",
    level: "country",
    facts: {
      ...country.facts,
      ...(workWorse
        ? {
            [turns ? "unemployment-up-but" : "unemployment-up-and"]:
              country.facts["unemployment-up"]!,
          }
        : {}),
    },
    moves: [
      move("story-open"),
      ...told.map((topic) => move("story-says", { topic })),
      ...(country.facts["mood-hard"] || KINDS_WITH_TURN.includes(addressKind)
        ? [move("story-turn")]
        : []),
      move("pledge", pledgeOptions(country.facts, country.areas)),
    ],
  };
  const home = (president.pastFacts ?? []).find(
    (row) => row.kind === PRESIDENT_FACT.homeState,
  );
  const prior = (president.pastFacts ?? []).find(
    (row) => row.kind === PRESIDENT_FACT.priorOffice,
  );
  const occasion: Draft = {
    key: "occasion",
    level: "occasion",
    facts: {
      ...country.facts,
      ...(home?.facts?.stateName
        ? { "home-state": fact(home.facts.stateName, home.id) }
        : {}),
      ...(prior?.facts?.title
        ? { "prior-office": fact(prior.facts.title, prior.id) }
        : {}),
    },
    moves: [move("occasion"), move("oath")],
  };
  // What the President believes, in their party's terms, then (in an
  // inaugural) that they serve those who voted against them too.
  const party = (official.party ?? "").toLowerCase();
  const creed: Draft = {
    key: "creed",
    level: "occasion",
    facts: {
      [`party-${PARTY_FACT[party] ?? "other"}`]: fact("yes", official.id),
    },
    moves: [move("creed"), move("unity")],
  };
  // What the address leads with and which asides it says, from the year's
  // record and the President's traits: two Presidents give different speeches.
  const lead = leadOf(president, {
    hardYear: !!country.facts["mood-hard"],
    firstBears,
    priorities: priorities.length,
  });
  const asides = asidesOf(president, lead);
  // The country's people, while the camera is out among them (owner, Oct
  // 29: the cutaways alternate the President at work with America).
  const people: Draft = {
    key: "people",
    level: "people",
    facts: country.facts,
    moves: [move("people")],
  };
  // The day set in the country's long story, as real inaugurals set it.
  const history: Draft = {
    key: "history",
    level: "occasion",
    facts: creed.facts,
    moves: [move("history")],
  };
  // The turn to Congress, then what the President will ask of it. A
  // President with nothing to ask says what they will bring instead.
  // With priorities, the first ask turns to Congress itself ("To Congress,
  // first thing, ..."); without, the turn says what the President brings.
  const congress: Draft[] = [
    ...(priorities.length
      ? []
      : [
          {
            key: "to-congress",
            level: "congress" as const,
            facts: {},
            moves: [move("to-congress")],
          },
        ]),
    ...priorityBlocks,
    ...(lineBlock ? [lineBlock] : []),
  ];
  // The middle of the speech in the lead's order, leaving out the asides
  // this President doesn't say.
  const parts: Readonly<Record<string, readonly Draft[]>> = {
    occasion: [occasion],
    creed: [creed],
    history: [history],
    story: [story],
    people: [people],
    congress,
  };
  for (const part of SHAPE.orders[lead])
    if (!(part in SHAPE.asides) || asides.has(part))
      blocks.push(...(parts[part] ?? []));
  // The speech turns to the Vice President and to the states, as the
  // montage shows them (owner, Oct 29: "the Vice President, Congress and
  // the player's governor with a few state legislators appear"). The words
  // stay national: they speak to every state, never the player's.
  const vice = officialsIn(api, "US:vice-president")[P.zero];
  const vicePerson = vice ? core.people.get(vice.id) : undefined;
  if (vice && vicePerson)
    blocks.push({
      key: "to-vp",
      level: "vice-president",
      facts: { "vice-president": fact(fullName(vicePerson), vice.id) },
      moves: [move("to-vp")],
    });
  blocks.push({
    key: "to-states",
    level: "states",
    facts: {},
    moves: [move("to-states")],
  });
  // What the President asks of the people themselves, in their party's
  // terms, and the hope they close on, when this President says them.
  if (asides.has("call"))
    blocks.push({
      key: "call",
      level: "families",
      facts: { ...country.facts, ...creed.facts },
      moves: [move("call")],
    });
  if (asides.has("hope"))
    blocks.push({
      key: "hope",
      level: "close",
      facts: country.facts,
      moves: [move("hope")],
    });
  blocks.push(
    {
      key: "families",
      level: "families",
      facts: country.facts,
      moves: [move("families")],
    },
    {
      key: "close",
      level: "close",
      joins: true,
      facts: {},
      moves: [move("close", { required: true })],
      required: true,
    },
  );
  // The salutation opens the first paragraph with whatever follows it.
  let part = -P.one;
  const numbered = blocks.map((block, at) => {
    if (
      !block.joins &&
      !(at > P.zero && blocks[at - P.one]!.key === "salutation")
    )
      part += P.one;
    const { joins, ...rest } = block;
    void joins;
    return { ...rest, facts: { ...world, ...rest.facts }, part };
  });
  return { blocks: numbered, addressKind };
}

/**
 * What the pledge answers: the worst of the year's numbers when one went the
 * wrong way (the most specific wins), else the year as a whole.
 */
function pledgeOptions(
  facts: Facts,
  areas: readonly AreaRead[],
): { topic?: string } {
  if (facts["unemployment-up"]) return { topic: "unemployment" };
  if (facts["wages-behind-prices"]) return { topic: "wages" };
  if (facts["inflation-up"]) return { topic: "inflation" };
  // Otherwise the area of the term that fell furthest, when one fell.
  const worst = areas
    .filter((read) => AREA_TOPICS.includes(read.area) && read.slide < P.zero)
    .sort((a, b) => a.slide - b.slide || a.area.localeCompare(b.area))[P.zero];
  return worst ? { topic: worst.area } : {};
}

/** The party fact a President's creed is said with, by the party's name. */
const PARTY_FACT: Readonly<Record<string, string>> = {
  republican: "republican",
  democratic: "democratic",
  democrat: "democratic",
};

function composeAddressOf(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  kind: OpeningSpeechKind,
): { sentences: OpeningSentence[]; addressKind: AddressKind } | null {
  const plan = planAddress(core, president, official, kind);
  const sentences = composeBlocks(core, president, plan.blocks);
  return sentences ? { sentences, addressKind: plan.addressKind } : null;
}

/**
 * Say a plan's blocks in the speaker's own voice: the English engine writes
 * every sentence, their recorded traits pull each pick, and no piece is used
 * twice while another can say the line. Null when a required block cannot be
 * said. The one writer of every address (the President's, a governor's, a
 * mayor's).
 */
export function composeBlocks(
  core: CoreState,
  president: PersonState,
  blocks: readonly Block[],
): OpeningSentence[] | null {
  const stage = chairStage(core);
  // The addresses the President has given: each speech the speech module
  // recorded, and each campaign stop on their record (a rally speech there).
  const craft = [
    ...addressesGivenBy(coreAPI(core), president.id),
    ...(president.pastFacts ?? [])
      .filter((row) => row.kind === PRESIDENT_FACT.visit)
      .map((row) => row.id),
  ];
  const sentences: OpeningSentence[] = [];
  // Pieces already said, so no wording is used twice while another can say it.
  const said: string[] = [];
  // How often each of the world's names has been said in the address.
  const named = new Map<string, number>();
  // The runs of four words each sentence naming the Vice President said.
  const viceSaid: Set<string>[] = [];
  // The lead-ins said so far, by their words.
  const ledIn = new Set<string>();
  // Whether the turn to the Vice President, which always names them, is still to come.
  let vpAhead = blocks.some((block) => block.key === "to-vp");
  for (const block of blocks) {
    const moves = block.moves.filter((row): row is OpeningMove => !!row);
    // stopgapId: SG-PEOPLE-address-register
    markWordsStopgap("SG-PEOPLE-address-register");
    // In the President's own voice: their recorded traits pull each pick,
    // and a crafted device is theirs only once the record shows the
    // addresses that earned it. Each move is said on its own, so a name from
    // the world already said twice is left to the wordings that do without
    // it, unless none can say the move.
    const sayMove = (move: OpeningMove, facts: Facts, retry = P.zero) =>
      composeAddress(
        packet(
          `opening:${core.date}:${president.id}/${block.key}${retry ? `#${retry}` : ""}`,
          core.seed,
          president.id,
          stage,
          facts,
          [president.id],
        ),
        "election-night",
        [move],
        {
          speakerTraits: president.traits,
          recentPartKeys: said,
          addressesGiven: craft.length,
        },
      );
    const address = { moves: [] as ComposedMove[] };
    for (const planned of moves) {
      // No lead-in ("To Congress,", "Across the country,") is said twice in
      // an address; a move whose lead-ins are all said goes without one.
      const opener = planned.bank.parts.opener;
      const unsaid = opener?.variants.filter(
        (variant) =>
          !ledIn.has(variant.kind === "template" ? variant.text : variant.key),
      );
      const move: OpeningMove =
        opener && unsaid!.length < opener.variants.length
          ? {
              ...planned,
              bank: {
                ...planned.bank,
                parts: {
                  ...planned.bank.parts,
                  opener: { ...opener, variants: unsaid! },
                },
              },
            }
          : planned;
      // A name is said at most `namesSaid` times (one fewer before the turn
      // to the Vice President, which always names them), and a subject's
      // words ("take-home pay") at most `subjectsSaid` times, counted by the
      // words said; only a required move says one again.
      const counted = (key: string) =>
        WORLD_NAMES.includes(key) || key.startsWith("say-");
      const limit = (key: string) =>
        PERSON_NAMES.includes(key)
          ? SHAPE.parameters.namesSaid.value -
            (key === "vice-president" && vpAhead && block.key !== "to-vp"
              ? P.one
              : P.zero)
          : // The greeting and the close keep one say in reserve.
            SHAPE.parameters.subjectsSaid.value -
            (move.required || block.required ? P.zero : P.one);
      const within = (keys: (key: string) => boolean) =>
        Object.fromEntries(
          Object.entries(block.facts).filter(
            ([key, row]) =>
              !keys(key) || (named.get(row.text) ?? P.zero) < limit(key),
          ),
        );
      // A lead-in that names a time is not joined to a core that names the
      // same time ("In the year now behind us, this was a year when ...").
      const timeTwice = (row: ReturnType<typeof sayMove>) =>
        row.kind === "rendered" &&
        row.moves.some((said) => {
          const lead = said.parts.find((part) => part.part === "opener");
          const rest = said.parts.filter((part) => part.part !== "opener");
          return (
            !!lead &&
            TIME_WORDS.some(
              (word) =>
                new RegExp(`\\b${word}\\b`, "i").test(lead.text) &&
                rest.some((part) =>
                  new RegExp(`\\b${word}\\b`, "i").test(part.text),
                ),
            )
          );
        });
      const bare: OpeningMove = {
        ...move,
        bank: {
          ...move.bank,
          parts: Object.fromEntries(
            Object.entries(move.bank.parts).filter(
              ([line]) => line !== "opener",
            ),
          ) as typeof move.bank.parts,
        },
      };
      // A required move gives up a subject's limit before a name's.
      const echoesVice = (row: ReturnType<typeof sayMove>) =>
        row.kind === "rendered" &&
        row.moves.some((done) => {
          if (
            !done.parts.some((part) =>
              part.usedFactKeys.includes("vice-president"),
            )
          )
            return false;
          const runs = fourWordRuns(
            done.text,
            block.facts["vice-president"]?.text,
          );
          return viceSaid.some((earlier) =>
            [...runs].some((run) => earlier.has(run)),
          );
        });
      const tries = [
        within(counted),
        ...(move.required || block.required || block.key === "to-vp"
          ? [within((key) => PERSON_NAMES.includes(key)), block.facts]
          : []),
      ].flatMap((facts) => {
        // The Vice President is not praised twice in the same words: a
        // sentence that would repeat four words of an earlier one naming them
        // is drawn again, a few times, before it stands.
        let said = sayMove(move, facts);
        for (
          let retry = P.one;
          retry <= SHAPE.parameters.redraws.value && echoesVice(said);
          retry += P.one
        )
          said = sayMove(move, facts, retry);
        return timeTwice(said) ? [sayMove(bare, facts)] : [said];
      });
      const result = tries.find((row) => row.kind === "rendered") ?? null;
      if (result?.kind === "rendered")
        for (const done of result.moves)
          if (
            done.parts.some((part) =>
              part.usedFactKeys.includes("vice-president"),
            )
          )
            viceSaid.push(
              fourWordRuns(done.text, block.facts["vice-president"]?.text),
            );
      if (result?.kind !== "rendered") {
        if (move.required || block.required) return null;
        continue;
      }
      for (const done of result.moves) {
        address.moves.push(done);
        if (block.key === "to-vp") vpAhead = false;
        for (const part of done.parts)
          if (part.part === "opener") ledIn.add(part.text);
        for (const key of new Set(
          done.parts.flatMap((part) => part.usedFactKeys),
        )) {
          const text = block.facts[key]?.text;
          if (counted(key) && text)
            named.set(text, (named.get(text) ?? P.zero) + P.one);
        }
        // A later move of this block does not repeat this one's wordings.
        said.push(...done.parts.map((part) => part.partKey));
      }
    }
    if (!address.moves.length) {
      if (block.required) return null;
      continue;
    }
    for (const move of address.moves) {
      const used = new Set(move.parts.flatMap((part) => part.usedFactKeys));
      // A crafted device cites the addresses that earned it.
      const earned = move.parts.some((part) => part.device) ? craft : [];
      const visit = used.has("place")
        ? block.facts.place?.sourceRecordIds
            .map((id) => /:visit:(US-[A-Z]{2})$/.exec(id)?.[P.one])
            .find(Boolean)
        : undefined;
      sentences.push({
        level: block.level,
        part: block.part,
        text: move.text,
        facts: [...used].sort(),
        pieces: move.parts.map((part) => part.variantKey),
        values: Object.fromEntries(
          [...used].sort().map((key) => [key, block.facts[key]?.text ?? ""]),
        ),
        ...(visit ? { stateKey: visit } : {}),
        ...(block.facts.about &&
        block.facts.to &&
        (block.facts["stance-for"] || block.facts["stance-against"])
          ? {
              stand: {
                about: block.facts.about.text,
                to: block.facts.to.text,
                stance: block.facts["stance-for"]
                  ? ("for" as const)
                  : ("against" as const),
              },
            }
          : {}),
        sourceRecordIds: [
          ...new Set([
            president.id,
            ...[...used].flatMap(
              (key) => block.facts[key]?.sourceRecordIds ?? [],
            ),
            ...earned,
          ]),
        ],
      });
    }
  }
  return sentences;
}

/**
 * Compose the opening from the world's records. Pure: reads the core and
 * writes nothing. Null when the world seats no President or the address
 * can't open and close from the record.
 */
export function composeOpeningStory(
  core: CoreState,
  playerId: PersonId,
): OpeningStory | null {
  const api = coreAPI(core);
  const player = core.people.get(playerId);
  const official = officialsIn(api, "US:president")[P.zero];
  const president = official ? core.people.get(official.id) : undefined;
  if (!player || !official || !president) return null;
  // Inaugural only when the offices engine recorded the taking of office
  // today (recordInauguration); every other opening is the address to Congress.
  const kind: OpeningSpeechKind = core.eventIds.has(
    `${INAUGURATION_EVENT}:${core.date}`,
  )
    ? "inaugural"
    : "state-of-the-union";
  const composed = composeAddressOf(core, president, official, kind);
  if (!composed?.sentences.length) return null;
  const { sentences, addressKind } = composed;
  const pastFact = (kindKey: string) =>
    (president.pastFacts ?? []).find((row) => row.kind === kindKey);
  const home = pastFact(PRESIDENT_FACT.homeState);
  const prior = pastFact(PRESIDENT_FACT.priorOffice);
  const elected = pastFact(PRESIDENT_FACT.elected);
  const remembered =
    sentences.find(
      (row) => row.level === "congress" && row.sourceRecordIds.length > P.one,
    ) ??
    sentences.find((row) => row.level === "country") ??
    sentences[P.zero]!;
  const id = `${OPENING_ADDRESS_EVENT}:${core.date}`;
  const allIds = [...new Set(sentences.flatMap((row) => row.sourceRecordIds))];
  const household = core.households.get(player.householdId);
  return {
    id,
    date: core.date,
    speechKind: kind,
    addressKind,
    president: {
      id: president.id,
      name: fullName(president),
      homeState: home?.facts?.stateName ?? null,
      priorOffice: prior?.facts?.title ?? null,
      sourceRecordIds: [
        official.id,
        ...[home, prior, elected].flatMap((row) => (row ? [row.id] : [])),
      ],
    },
    address: {
      sentences,
      openingLine: sentences[P.zero]!,
      rememberedLine: remembered,
      text: sentences.map((row) => row.text).join(" "),
      parts: [...new Set(sentences.map((row) => row.part))].map((part) =>
        sentences
          .filter((row) => row.part === part)
          .map((row) => row.text)
          .join(" "),
      ),
      sourceRecordIds: allIds,
    },
    home: {
      date: core.date,
      householdId: player.householdId,
      memberIds: (household?.memberIds ?? []).filter(
        (memberId) => core.people.get(memberId)?.alive,
      ),
      subjectEventId: id,
    },
  };
}

/**
 * Record the address once, as a public event on the opening day: the news
 * engine carries it to the town, the player and the household watching it
 * with them on the news at home saw it, and anyone who hears it can bring it
 * up. Returns the story it recorded, or null.
 */
export function recordOpeningStory(
  core: CoreState,
  playerId: PersonId,
): OpeningStory | null {
  // The key chambers organize now, the first time anything needs their
  // leaders, so composing reads them as they stand.
  const api = coreAPI(core);
  if (api.state.modules.has(LEADERSHIP_MODULE_ID))
    for (const chamber of keyChambersOf(core, playerId)) organize(api, chamber);
  const story = composeOpeningStory(core, playerId);
  if (!story) return null;
  applyCoreEvent(core, {
    id: story.id,
    date: core.date as never,
    kind: OPENING_ADDRESS_EVENT,
    personIds: [story.president.id],
    // The household watches it with the player, on the news they have on.
    witnessIds: [
      playerId,
      ...story.home.memberIds.filter(
        (id) => id !== playerId && core.people.has(id),
      ),
    ],
    placeId: core.people.get(playerId)!.placeId,
    source: {
      tag: "SOURCED",
      citation:
        "The President's address, composed by the English engine from the world's records (data/english/parts/opening-speech.json).",
      asOf: core.date as never,
    },
    publicRecord: true,
    news: true,
    facts: {
      // National news on every town's wire.
      level: "federal",
      [ADDRESS_FACT.event]: story.id,
      ...(core.eventIds.has(`${INAUGURATION_EVENT}:${core.date}`)
        ? { [ADDRESS_FACT.inauguration]: `${INAUGURATION_EVENT}:${core.date}` }
        : {}),
      [ADDRESS_FACT.president]: story.president.id,
      [ADDRESS_FACT.speaker]: story.president.id,
      [ADDRESS_FACT.kind]: story.speechKind,
      [ADDRESS_FACT.style]: story.addressKind,
      [ADDRESS_FACT.opening]: story.address.openingLine.text,
      [ADDRESS_FACT.remembered]: story.address.rememberedLine.text,
      [ADDRESS_FACT.text]: story.address.text,
      [ADDRESS_FACT.parts]: story.address.parts.join(ADDRESS_PART_BREAK),
    },
  });
  return story;
}
