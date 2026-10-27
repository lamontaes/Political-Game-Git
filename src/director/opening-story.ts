/**
 * The opening, told as a story (owner, Oct 14, 2026): the President's address
 * about the world the simulation made, that night's evening news, then the
 * player's household at home that evening, where the news can be picked up. Everything said comes from
 * the English engine's mined banks with the world's records in its slots,
 * composed once while the world loads; a sentence the records can't support
 * is left out, never written.
 *
 * - It opens on the player's household at home that evening, the anchor
 *   leading into the address by its title, so the player knows what they
 *   are watching before the President speaks (owner, Oct 14, 2026).
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
import {
  regionalMonth,
  regionName,
  regionOfPlace,
} from "../core2/modules/regional";
import { openingRegionMonths } from "../core2/regional-model";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import {
  corePlaceByJurisdictionId,
  coreStateName,
} from "../core2/place-lookup";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import type { LawRowInput } from "../core2/laws-starting";
import type { CoreAPI, CoreState, PersonId, PersonState } from "../core2/types";
import type { EntityId } from "../core2/kernel/brands";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "../english/grounded-english";
import { composeAddress } from "../english/english-composition";
import {
  openingMove,
  openingSpeechKind,
  type OpeningLevel,
  type OpeningMove,
  type OpeningSpeechKind,
  type SpeechVoice,
} from "../english/english-opening-speech";
import {
  composeLeadIn,
  composeNewsStory,
  NEWSCAST_BANK,
  type StoryKind,
} from "../english/english-newscast";
import openingData from "./data/opening-story.json" with { type: "json" };
import { ADDRESS_FACT } from "./opening-facts";
import {
  NAMED_QUESTIONS,
  questionAbout,
  questionTo,
} from "../english/question-names";
import { questionSubject } from "../english/policy-names";
import addressData from "./data/opening-address.json" with { type: "json" };
import {
  openingChambers,
  openingSequence,
  type OpeningFigure,
  type OpeningStage,
} from "./opening-sequence";
import { LEADERSHIP_MODULE_ID, organize } from "../core2/modules/leadership";
import { markWordsStopgap } from "./stopgaps";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { properName, spoken } from "./words";

export interface OpeningSentence {
  readonly level: OpeningLevel;
  readonly text: string;
  readonly sourceRecordIds: readonly string[];
  /** What the sentence is about: the facts it said ("jobs-up", "place", "goal"). */
  readonly facts: readonly string[];
  /** What each of those facts said in the sentence, the figure or name filled in. */
  readonly values: Readonly<Record<string, string>>;
  /** The state a place line names, from the campaign visit it came from. */
  readonly stateKey?: string;
}

export interface OpeningNewsStory {
  /** The kind of story the newscast bank composed it as. */
  readonly kind: StoryKind;
  /** The record the story is about. */
  readonly recordId: string;
  readonly headline?: string;
  readonly lede?: string;
  readonly broadcast: readonly {
    speaker: "anchor" | "reporter";
    text: string;
  }[];
  readonly sourceRecordIds: readonly string[];
}

export interface OpeningStory {
  /** The public event the address is recorded as. */
  readonly id: string;
  readonly date: string;
  readonly speechKind: OpeningSpeechKind;
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
    readonly sourceRecordIds: readonly string[];
  };
  /**
   * What the player is watching, said first: the anchor's lead into the
   * address by its title, on the news the household has on at home.
   */
  readonly lead: readonly {
    readonly speaker: "anchor";
    readonly text: string;
    readonly sourceRecordIds: readonly string[];
  }[];
  /** That evening's news: the address, then the town's own lead story. */
  readonly newscast: readonly OpeningNewsStory[];
  /**
   * The sequence the address plays over (owner, Oct 14, 2026, late): the
   * President's stage, Congress, the state, the family; who each points out.
   */
  readonly sequence: readonly OpeningStage[];
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
  townStoryKinds: Readonly<Record<string, StoryKind>>;
  speechTitles: Readonly<Record<OpeningSpeechKind, string>>;
  named: {
    rules: readonly { role: string; says?: string; fact?: string }[];
  };
}
const DATA = openingData as unknown as OpeningData;
const N = DATA.numbers;

/** The anchor's greetings and sign-offs, the newscast bank's lines with no slot. */
const anchorLines = (role: string) =>
  new Set(
    NEWSCAST_BANK.parts
      .filter((part) =>
        part.uses.some((use) => use.subject === "anchor" && use.role === role),
      )
      .map((part) => part.text),
  );
const ANCHOR_OPENS = anchorLines("open");
const ANCHOR_CLOSES = anchorLines("close");

/** The offices engine's public record of the taking of office on Inauguration Day. */
const INAUGURATION_EVENT = "inauguration";

/** The kind of public event the address is recorded as. */
export const OPENING_ADDRESS_EVENT = "president.address";

type Facts = Record<string, GroundedEnglishFact>;

const fact = (text: string, ...ids: string[]): GroundedEnglishFact => ({
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

/** "1.9 million", "850,000": a count of jobs as a newsreader says it. */
function jobsSaid(seriesUnits: number): string {
  const jobs = Math.round(seriesUnits) * N.jobsPerSeriesUnit;
  return jobs >= N.jobsPerMillion
    ? `${(jobs / N.jobsPerMillion).toFixed(N.decimals).replace(/\.0$/, "")} million`
    : jobs.toLocaleString("en-US");
}

/** The opening month and the same month a year before, from the macro engine's record. */
function macroMonths(core: CoreState): {
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
  // will open from: the same published rows (`historyMonths`).
  const months = (recorded.length ? recorded : historyMonths(core.startedAt, p))
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));
  const now = months
    .filter((row) => row.month <= monthKey(core.date))
    .at(-P.one);
  if (!now) return null;
  const yearBefore = shiftMonth(now.month, -p("macroMonthsPerYear"), p);
  return { now, before: months.find((row) => row.month === yearBefore) };
}

/** The speech fact each of the country's numbers is said with. */
const NUMBER_FACT: Readonly<Record<string, readonly string[]>> = {
  unemployment: ["unemployment-rate"],
  inflation: ["inflation-rate"],
  growth: ["growth-rate"],
  wages: ["wage-growth"],
  mortgage: ["mortgage-rate"],
  jobs: ["jobs-added", "jobs-up"],
};

interface AddressData {
  numbersBySubject: Readonly<Record<string, readonly string[]>>;
  mannerTraits: { plain: readonly string[]; polished: readonly string[] };
  parameters: Record<
    "prioritiesMax" | "priorityStanceShare" | "storyFigures",
    { value: number }
  >;
}
const SHAPE = addressData as unknown as AddressData;

/** The country's numbers and the claims its record supports, as speech facts. */
interface Country {
  readonly facts: Facts;
  /** How far each number moved over the year, to choose the ones worth telling. */
  readonly movement: Readonly<Record<string, number>>;
}

function countryFacts(core: CoreState, kind: OpeningSpeechKind): Country {
  const months = macroMonths(core);
  if (!months) return { facts: {}, movement: {} };
  const { now, before } = months;
  const api = coreAPI(core);
  const ids = [now.id, ...(before ? [before.id] : [])];
  const facts: Facts = {
    "unemployment-rate": fact(now.unemploymentPct.toFixed(N.decimals), now.id),
    "inflation-rate": fact(now.inflationPct.toFixed(N.decimals), now.id),
    "mortgage-rate": fact(now.mortgage30Pct.toFixed(N.decimals), now.id),
  };
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
  if (!before) return { facts, movement };
  claim("unemployment-down", now.unemploymentPct < before.unemploymentPct);
  claim("unemployment-up", now.unemploymentPct > before.unemploymentPct);
  claim("inflation-down", now.inflationPct < before.inflationPct);
  claim("inflation-up", now.inflationPct > before.inflationPct);
  claim("wages-up", now.hourlyEarnings > before.hourlyEarnings);
  claim("growth-up", now.realOutput > before.realOutput);
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
    facts["wage-growth"] = fact(grew.toFixed(N.decimals), ...ids);
    movement.wages = grew;
    // Pay against prices, over the same year.
    claim("wages-ahead-of-prices", grew > now.inflationPct);
    claim("wages-behind-prices", grew < now.inflationPct);
  }
  if (now.realOutput > before.realOutput) {
    const grew = change(now.realOutput, before.realOutput);
    facts["growth-rate"] = fact(grew.toFixed(N.decimals), ...ids);
    movement.growth = grew;
  }
  const added = now.payrollJobsThousands - before.payrollJobsThousands;
  // A new President can't claim the last administration's jobs as "we
  // created": an inaugural address says only that jobs are up.
  if (added > P.zero) {
    claim("jobs-up", true);
    movement.jobs = added / N.jobsPerSeriesUnit / N.jobsPerMillion;
    if (kind !== "inaugural")
      facts["jobs-added"] = fact(jobsSaid(added), ...ids);
  }
  // The year in a word: more of the measures better than worse, or the
  // reverse, or neither. Each is a count of the claims above, never a roll.
  const better = [
    "unemployment-down",
    "inflation-down",
    "wages-up",
    "growth-up",
    "jobs-up",
  ].filter((key) => facts[key]).length;
  const worse =
    ["unemployment-up", "inflation-up"].filter((key) => facts[key]).length +
    ["wages-up", "growth-up", "jobs-up"].filter((key) => !facts[key]).length;
  claim("mood-better", better > worse);
  claim("mood-hard", worse > better);
  claim("mood-mixed", worse === better);
  return { facts, movement };
}

/** One policy question the President has a view on, with the law in force on it. */
interface Stand {
  readonly question: string;
  /** Positive for a President who wants it, negative for one who does not. */
  readonly stance: number;
  readonly signature: boolean;
  readonly law: {
    readonly id: string;
    readonly inForce: boolean;
    /** The jurisdiction whose law it is: the nation, or the player's state. */
    readonly jurisdiction: string;
  };
}

/** Questions on federal law are answered for the nation, every other for the state. */
const FEDERAL_QUESTIONS = "us-federal-positions:";

/**
 * The law on a question that applies to the speech: the nation's for a
 * federal question, the player's state's for any other, from the laws
 * engine's own rows.
 */
function lawOn(
  api: CoreAPI,
  question: string,
  townState: string | null,
): Stand["law"] | null {
  const jurisdiction = question.startsWith(FEDERAL_QUESTIONS)
    ? "US"
    : townState;
  if (!jurisdiction || !api.state.modules.has(LAWS_MODULE_ID)) return null;
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
 * Every question the President holds a view on and the world has a law for:
 * the ones they want, their own signature issues first, then by how strongly
 * they hold them; and the ones they oppose, strongest first. Any question in
 * the bill catalog can be here, so two Presidents with different views, or
 * two worlds with different laws, say different things.
 */
function presidentStands(
  api: CoreAPI,
  official: OfficialRow,
  townState: string | null,
): { wanted: Stand[]; opposed: Stand[] } {
  const own = new Set(official.signature.map((row) => row.question));
  const stands = NAMED_QUESTIONS.flatMap((question): Stand[] => {
    const stance = ownStance(official.ideal, official.signature, question);
    const law = lawOn(api, question, townState);
    return stance !== P.zero && law
      ? [{ question, stance, signature: own.has(question), law }]
      : [];
  });
  return {
    wanted: stands
      .filter((row) => row.stance > P.zero)
      .sort(
        (a, b) =>
          Number(b.signature) - Number(a.signature) ||
          b.stance - a.stance ||
          a.question.localeCompare(b.question),
      ),
    opposed: stands
      .filter((row) => row.stance < P.zero)
      .sort(
        (a, b) => a.stance - b.stance || a.question.localeCompare(b.question),
      ),
  };
}

/** The facts a stand is spoken with: its names, the President's side and the law. */
function standFacts(
  stand: Stand,
  official: OfficialRow,
  stateName: string | null,
  rank: string,
): Facts {
  const asked = [official.id, `question:${stand.question}`];
  const state = stand.law.jurisdiction !== "US";
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
    [state ? "state-level" : "federal-level"]: fact("yes", stand.law.id),
    ...(state && stateName
      ? { "state-name": fact(stateName, stand.law.id) }
      : {}),
    [rank]: fact("yes", ...asked),
  };
}

/** The President's manner of speaking, from their recorded traits. */
function voiceOf(president: PersonState): SpeechVoice {
  const sum = (keys: readonly string[]) =>
    keys.reduce(
      (total, key) => total + (president.traits[key] ?? P.zero),
      P.zero,
    );
  return sum(SHAPE.mannerTraits.plain) > sum(SHAPE.mannerTraits.polished)
    ? "plain"
    : "polished";
}

/**
 * The state the address names: the player's own state, when the President's
 * campaign went there; never another state (owner, Oct 14, 2026: "I went to
 * Minnesota" to a player in West Virginia).
 */
function visitedPlace(
  president: PersonState,
  townState: string | null,
): GroundedEnglishFact | null {
  const chosen = (president.pastFacts ?? []).find(
    (row) =>
      row.kind === PRESIDENT_FACT.visit &&
      row.facts?.stateName &&
      row.facts?.stateKey === townState,
  );
  return chosen ? fact(chosen.facts!.stateName!, chosen.id) : null;
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
interface Block {
  readonly key: string;
  readonly level: OpeningLevel;
  readonly facts: Facts;
  readonly moves: readonly (OpeningMove | null)[];
  readonly required?: boolean;
}

const RANKS = ["rank-first", "rank-second", "rank-third"] as const;

/**
 * Plan the address from the world's records: which priorities the President
 * leads with and the law on each, the line they will not cross, the state
 * law they put to the governors, which of the country's numbers the story
 * tells, and in what order. Two worlds differ in all of it.
 */
function planAddress(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  kind: OpeningSpeechKind,
  townState: string | null,
  onStage: ReadonlySet<string>,
): Block[] {
  const api = coreAPI(core);
  const voice = voiceOf(president);
  const move = (
    role: string,
    options: { topic?: string; required?: boolean } = {},
  ) => openingMove(kind, voice, role, options);
  const country = countryFacts(core, kind);
  const stateName = townState
    ? coreStateName(townState.replace(/^US-/, ""))
    : null;
  const { wanted, opposed } = presidentStands(api, official, townState);
  const par = SHAPE.parameters;

  // The priorities: the questions they want, while the conviction holds.
  const strongest = Math.max(P.zero, ...wanted.map((row) => row.stance));
  const priorities = wanted
    .filter(
      (row, at) =>
        at === P.zero ||
        row.stance >= par.priorityStanceShare.value * strongest,
    )
    .slice(P.zero, par.prioritiesMax.value);
  // The line they will not cross, when they hold it harder than their weakest priority.
  const line =
    opposed[P.zero] &&
    -opposed[P.zero].stance >= (priorities.at(-P.one)?.stance ?? P.zero)
      ? opposed[P.zero]
      : undefined;
  const used = new Set([...priorities, ...(line ? [line] : [])]);

  // A priority argued from a number of the country's, when its subject bears on one.
  const held = (topic: string) =>
    (NUMBER_FACT[topic] ?? []).some((key) => country.facts[key]);
  const taken = new Set<string>();
  const topicOf = (stand: Stand) => {
    const topic = (
      SHAPE.numbersBySubject[questionSubject(stand.question) ?? ""] ?? []
    ).filter((row) => held(row) && !taken.has(row))[P.zero];
    if (topic) taken.add(topic);
    return topic;
  };

  const blocks: Block[] = [
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
    topic: string | undefined,
  ): Block => ({
    key: `${rank}-${stand.question}`,
    level: "congress",
    facts: {
      ...country.facts,
      ...standFacts(stand, official, stateName, rank),
    },
    moves: [
      move("lead-in"),
      ...(topic ? [move("stake", { topic })] : []),
      move("law"),
      move("ask"),
    ],
  });
  const priorityTopics = priorities.map(topicOf);
  const firstBears = !!priorityTopics[P.zero];
  const priorityBlocks = priorities.map((stand, at) =>
    standBlock(stand, RANKS[at]!, priorityTopics[at]),
  );
  const lineBlock = line ? standBlock(line, "rank-line", undefined) : undefined;

  // The story of the country: the nation's unemployment rate and the numbers that
  // moved most, apart from the ones the priorities argue from, under a word for the year.
  const told = [
    // The nation's unemployment rate is always told, under its scope.
    ...(held("unemployment") ? ["unemployment"] : []),
    ...Object.keys(NUMBER_FACT)
      .filter(
        (topic) => topic !== "unemployment" && held(topic) && !taken.has(topic),
      )
      .sort(
        (a, b) =>
          (country.movement[b] ?? P.zero) - (country.movement[a] ?? P.zero) ||
          a.localeCompare(b),
      )
      .slice(P.zero, par.storyFigures.value),
  ];
  const story: Block = {
    key: "story",
    level: "country",
    facts: country.facts,
    moves: [
      move("story-open"),
      ...told.map((topic) => move("story-fig", { topic })),
      move("story-turn"),
    ],
  };
  const home = (president.pastFacts ?? []).find(
    (row) => row.kind === PRESIDENT_FACT.homeState,
  );
  const prior = (president.pastFacts ?? []).find(
    (row) => row.kind === PRESIDENT_FACT.priorOffice,
  );
  const occasion: Block = {
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
    moves: [move("occasion")],
  };
  // A hard year, or a first priority that bears on a number, opens with the
  // country's story; any other President opens with the occasion.
  const storyFirst = !!country.facts["mood-hard"] || firstBears;
  blocks.push(...(storyFirst ? [story, occasion] : [occasion, story]));
  blocks.push(...priorityBlocks, ...(lineBlock ? [lineBlock] : []));

  // The governors hear the state law that differs from the President's view:
  // the strongest conviction, wanted or opposed, the player's state answers the other way.
  const atOdds = [...wanted, ...opposed]
    .filter(
      (row) =>
        row.law.jurisdiction !== "US" &&
        (row.stance > P.zero ? !row.law.inForce : row.law.inForce) &&
        Math.abs(row.stance) >= par.priorityStanceShare.value * strongest,
    )
    .sort(
      (a, b) =>
        Number(used.has(a)) - Number(used.has(b)) ||
        Math.abs(b.stance) - Math.abs(a.stance) ||
        a.question.localeCompare(b.question),
    )[P.zero];
  const governor = townState
    ? officialsIn(api, `${townState}:governor`)[P.zero]
    : undefined;
  // A governor is thanked by name only when the scene introduces them by
  // office and state (owner, Oct 14, 2026: "Thank you, Governor Munoz").
  const governorPerson =
    governor && onStage.has(governor.id)
      ? core.people.get(governor.id)
      : undefined;
  if (atOdds)
    blocks.push({
      key: `governors-${atOdds.question}`,
      level: "governors",
      facts: {
        ...standFacts(atOdds, official, stateName, "rank-line"),
        ...(governorPerson
          ? { name: fact(governorPerson.familyName, governor!.id) }
          : {}),
      },
      moves: [
        move("governors-thanks"),
        move("governors-lead"),
        move("law"),
        move("governors-ask"),
      ],
    });

  const place = visitedPlace(president, townState);
  if (place)
    blocks.push({
      key: "towns",
      level: "towns",
      facts: { place },
      moves: [move("towns")],
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
      facts: {},
      moves: [move("close", { required: true })],
      required: true,
    },
  );
  return blocks;
}

function composeAddressOf(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  kind: OpeningSpeechKind,
  townState: string | null,
  onStage: ReadonlySet<string>,
): OpeningSentence[] | null {
  const stage = chairStage(core);
  const sentences: OpeningSentence[] = [];
  // Pieces already said, so no wording is used twice while another can say it.
  const said: string[] = [];
  for (const block of planAddress(
    core,
    president,
    official,
    kind,
    townState,
    onStage,
  )) {
    const moves = block.moves.filter((row): row is OpeningMove => !!row);
    const base = packet(
      `opening:${core.date}:${president.id}/${block.key}`,
      core.seed,
      president.id,
      stage,
      block.facts,
      [president.id],
    );
    // stopgapId: SG-PEOPLE-address-register
    markWordsStopgap("SG-PEOPLE-address-register");
    // In the President's own voice: their recorded traits pull each pick.
    const address = composeAddress(base, "election-night", moves, {
      speakerTraits: president.traits,
      recentPartKeys: said,
    });
    if (address.kind !== "rendered") {
      if (block.required) return null;
      continue;
    }
    for (const move of address.moves) {
      said.push(...move.parts.map((part) => part.partKey));
      const used = new Set(move.parts.flatMap((part) => part.usedFactKeys));
      const visit = used.has("place")
        ? block.facts.place?.sourceRecordIds
            .map((id) => /:visit:(US-[A-Z]{2})$/.exec(id)?.[P.one])
            .find(Boolean)
        : undefined;
      sentences.push({
        level: block.level,
        text: move.text,
        facts: [...used].sort(),
        values: Object.fromEntries(
          [...used].sort().map((key) => [key, block.facts[key]?.text ?? ""]),
        ),
        ...(visit ? { stateKey: visit } : {}),
        sourceRecordIds: [
          ...new Set([
            president.id,
            ...[...used].flatMap(
              (key) => block.facts[key]?.sourceRecordIds ?? [],
            ),
          ]),
        ],
      });
    }
  }
  return sentences;
}

/** The town's own lead story on the opening day, from its records. */
function townStory(
  core: CoreState,
  townId: string,
  townName: string,
): { kind: StoryKind; recordId: string; facts: Facts } | null {
  const api = coreAPI(core);
  const stories = core.modules.has(NEWS_MODULE_ID)
    ? (api.moduleState(NEWS_MODULE_ID).table("stories").rows() as unknown as {
        id: string;
        kind: string;
        date: string;
        placeId: string;
        facts: Record<string, string>;
      }[])
    : [];
  for (const story of stories
    .filter((row) => row.date === core.date && row.placeId === townId)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const kind = DATA.townStoryKinds[story.kind];
    if (!kind) continue;
    // The person a death names and the business a closure names, by the
    // record ids the story carries.
    const named = story.id
      .split(":")
      .map((token) => core.people.get(token))
      .find(Boolean);
    const organization = Object.keys(story.facts)
      .map((key) => /^organization:(.+):status$/.exec(key)?.[P.one])
      .map((id) => (id ? core.organizations.get(id) : undefined))
      .find(Boolean);
    const facts: Facts = { place: fact(townName, townId) };
    if (kind === "death") {
      if (!named) continue;
      facts.name = fact(fullName(named), named.id, story.id);
      facts.age = fact(
        String(ageOnDate(makeIsoDate(named.birthDate), makeIsoDate(core.date))),
        named.id,
      );
    }
    if (kind === "closing") {
      if (!organization) continue;
      facts.subject = fact(
        properName(organization.name),
        organization.id,
        story.id,
      );
    }
    return { kind, recordId: story.id, facts };
  }
  // No closure or death today: the jobs figure for the town's area, from
  // the regional engine's month (BLS state and metro series).
  const months = macroMonths(core);
  const regionId = regionOfPlace(townId);
  if (!months || !regionId) return null;
  const region =
    regionalMonth(api, townId, months.now.month) ??
    openingRegionMonths(months.now, (key) => api.parameter(key)).find(
      (row) => row.regionId === regionId,
    );
  if (!region) return null;
  const before = months.before
    ? (regionalMonth(api, townId, months.before.month) ??
      openingRegionMonths(months.before, (key) => api.parameter(key)).find(
        (row) => row.regionId === regionId,
      ))
    : undefined;
  const area = regionName(region.regionId);
  return {
    kind: "jobs-report",
    recordId: region.id,
    facts: {
      place: fact(townName, townId),
      // The rate is the region's (a metro, or the state outside its metros),
      // so the story names that area, not the town.
      ...(area ? { area: fact(area, region.id) } : {}),
      percent: fact(region.unemploymentPct.toFixed(N.decimals), region.id),
      ...(before && region.unemploymentPct < before.unemploymentPct
        ? { "unemployment-down": fact("yes", region.id, before.id) }
        : {}),
    },
  };
}

function newsStory(
  core: CoreState,
  kind: StoryKind,
  recordId: string,
  facts: Facts,
): OpeningNewsStory {
  // stopgapId: SG-PEOPLE-newscast-register
  markWordsStopgap("SG-PEOPLE-newscast-register");
  const story = composeNewsStory(
    {
      ...packet(
        `opening-news:${core.date}:${recordId}`,
        core.seed,
        recordId,
        "default",
        { evening: fact("yes", recordId), ...facts },
        [recordId],
      ),
      bankVersion: "words-newscast-v1",
    },
    kind,
  );
  // The anchor names themself only from the station's record (the bank's
  // "I'm {name}" otherwise takes the story's name).
  const broadcast = story.broadcast.filter(
    (line) => !/\bI'm\b/.test(line.text) || facts.anchor,
  );
  return { kind, recordId, ...story, broadcast };
}

/**
 * Who the camera points out, each with the reason they are there: the first
 * address sentence that names them (a salutation's "Mr. Speaker"), their
 * place on the owner's list of key people, or the player's own household at
 * home. Anyone else is
 * left out (owner, Oct 14, 2026: a person lit with no recorded reason is a
 * defect).
 */
function withReasons(
  stages: readonly OpeningStage[],
  sentences: readonly OpeningSentence[],
  core: CoreState,
): OpeningStage[] {
  const namedBy = (figure: OpeningFigure): number | undefined => {
    for (const rule of DATA.named.rules.filter(
      (row) => row.role === figure.role,
    )) {
      const at = sentences.findIndex((sentence) =>
        rule.says
          ? new RegExp(rule.says).test(sentence.text)
          : rule.fact
            ? sentence.facts.includes(rule.fact) &&
              sentence.sourceRecordIds.includes(figure.id)
            : false,
      );
      if (at >= P.zero) return at;
    }
    return undefined;
  };
  return stages.map((stage) => ({
    ...stage,
    people: stage.people.flatMap((figure) => {
      if (figure.role === "household")
        return core.people.get(figure.id)?.alive ? [figure] : [];
      const at = namedBy(figure);
      // A key person (owner, Oct 15) is pointed out for being key, on their
      // stage; the sentence that names them, if any, is the line they are lit on.
      if (at === undefined)
        return figure.role.startsWith("key:") ? [figure] : [];
      return [{ ...figure, namedBy: at }];
    }),
  }));
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
  const town = corePlaceByJurisdictionId(player.placeId as never);
  const townState = town?.stateJurisdictionKey ?? null;
  const townName = town ? spoken(town) : null;
  const kind = openingSpeechKind(
    Number(core.date.slice(P.zero, core.date.indexOf("-"))),
  );
  const staged = openingSequence(core, playerId, president.id);
  const sentences = composeAddressOf(
    core,
    president,
    official,
    kind,
    townState,
    new Set(staged.flatMap((stage) => stage.people.map((row) => row.id))),
  );
  if (!sentences?.length) return null;
  const sequence = withReasons(staged, sentences, core);
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
  const inauguration = `${INAUGURATION_EVENT}:${core.date}`;
  const allIds = [...new Set(sentences.flatMap((row) => row.sourceRecordIds))];
  // The evening news: the address, then the town's own lead story.
  const newscast: OpeningNewsStory[] = [
    newsStory(core, "election", id, {
      name: fact(
        fullName(president),
        president.id,
        ...(elected ? [elected.id] : []),
        // The offices engine's record of the taking of office, when the
        // world opens on Inauguration Day.
        ...(core.eventIds.has(inauguration) ? [inauguration] : []),
      ),
      ...(elected ? { won: fact("yes", elected.id) } : {}),
      ...(townName ? { place: fact(townName, player.placeId) } : {}),
    }),
  ];
  const local = townName ? townStory(core, player.placeId, townName) : null;
  if (local)
    newscast.push(newsStory(core, local.kind, local.recordId, local.facts));
  // One broadcast: the anchor greets once, at the top, and signs off once.
  const program = newscast.map((item, index) => ({
    ...item,
    broadcast: item.broadcast.filter(
      (line, at) =>
        !(index > P.zero && at === P.zero && ANCHOR_OPENS.has(line.text)) &&
        !(
          index < newscast.length - P.one &&
          at === item.broadcast.length - P.one &&
          ANCHOR_CLOSES.has(line.text)
        ),
    ),
  }));
  const household = core.households.get(player.householdId);
  return {
    id,
    date: core.date,
    speechKind: kind,
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
      sourceRecordIds: allIds,
    },
    lead: composeLeadIn({
      ...packet(
        `opening-lead:${core.date}`,
        core.seed,
        id,
        "default",
        {
          evening: fact("yes", id),
          topic: fact(DATA.speechTitles[kind], id),
        },
        [id],
      ),
      bankVersion: "words-newscast-v1",
    }),
    newscast: program,
    sequence,
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
  // The chambers the sequence points out leaders of organize now, the first
  // time anything needs their leaders, so composing reads them as they stand.
  const api = coreAPI(core);
  if (api.state.modules.has(LEADERSHIP_MODULE_ID))
    for (const chamber of openingChambers(core, playerId))
      organize(api, chamber);
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
      [ADDRESS_FACT.kind]: story.speechKind,
      [ADDRESS_FACT.opening]: story.address.openingLine.text,
      [ADDRESS_FACT.remembered]: story.address.rememberedLine.text,
      [ADDRESS_FACT.text]: story.address.text,
    },
  });
  return story;
}
