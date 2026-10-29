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
import { composeAddress } from "../english/english-composition";
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

export interface OpeningSentence {
  readonly level: OpeningLevel;
  /** The part of the address it is said in, from 0, one per Continue. */
  readonly part: number;
  readonly text: string;
  readonly sourceRecordIds: readonly string[];
  /** What the sentence is about: the facts it said ("jobs-up", "place", "goal"). */
  readonly facts: readonly string[];
  /** What each of those facts said in the sentence, the figure or name filled in. */
  readonly values: Readonly<Record<string, string>>;
  /** The state a place line names, from the campaign visit it came from. */
  readonly stateKey?: string;
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
const N = DATA.numbers;

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

/** One policy question the President has a view on, at a level that may act on it, with the law in force there. */
interface Stand {
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
  const own = new Set(official.signature.map((row) => row.question));
  const at = (level: PolicyLevel, jurisdiction: string | null) =>
    NAMED_QUESTIONS.flatMap((question): Stand[] => {
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
  return at("federal", "US");
}

/** The ones they want: their own signature issues first, then by how strongly they hold them. */
function wantedOf(stands: readonly Stand[]): Stand[] {
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
function opposedOf(stands: readonly Stand[]): Stand[] {
  return stands
    .filter((row) => row.stance < P.zero)
    .sort(
      (a, b) => a.stance - b.stance || a.question.localeCompare(b.question),
    );
}

/** The facts a stand is spoken with: its names, the President's side and the law. */
function standFacts(stand: Stand, official: OfficialRow, rank: string): Facts {
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
): Block[] {
  const api = coreAPI(core);
  const voice = voiceOf(president);
  const move = (
    role: string,
    options: { topic?: string; required?: boolean } = {},
  ) => openingMove(kind, voice, role, options);
  const country = countryFacts(core, kind);
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
    topic: string | undefined,
  ): Draft => ({
    key: `${rank}-${stand.question}`,
    level: "congress",
    facts: {
      ...country.facts,
      ...standFacts(stand, official, rank),
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
  const others = Object.keys(NUMBER_FACT)
    .filter(
      (topic) => topic !== "unemployment" && held(topic) && !taken.has(topic),
    )
    .sort(
      (a, b) =>
        (country.movement[b] ?? P.zero) - (country.movement[a] ?? P.zero) ||
        a.localeCompare(b),
    )
    .slice(P.zero, par.storyFigures.value);
  // The nation's unemployment rate is always told, under its scope: first,
  // or last when it rose, so the pledge that follows answers it.
  const jobless = held("unemployment") ? ["unemployment"] : [];
  const told = country.facts["unemployment-up"]
    ? [...others, ...jobless]
    : [...jobless, ...others];
  // After the numbers, what the President means to do about them: a hard
  // year turns first ("It's a reason to get to work."), then every year ends
  // on the pledge its record supports (owner, Oct 28 sitting, 11: "so what is
  // he going to do about it?"). A new President never claims the gains.
  const story: Draft = {
    key: "story",
    level: "country",
    facts: country.facts,
    moves: [
      move("story-open"),
      ...told.map((topic) => move("story-fig", { topic })),
      ...(country.facts["mood-hard"] ? [move("story-turn")] : []),
      move("pledge", pledgeOptions(country.facts)),
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
    moves: [move("occasion")],
  };
  // What the President believes, in their party's terms, then (in an
  // inaugural) that they serve those who voted against them too.
  const party = (official.party ?? "").toLowerCase();
  const creed: Draft = {
    key: "creed",
    level: "occasion",
    joins: true,
    facts: {
      [`party-${PARTY_FACT[party] ?? "other"}`]: fact("yes", official.id),
    },
    moves: [move("creed"), move("unity")],
  };
  // A hard year, or a first priority that bears on a number, opens with the
  // country's story; any other President opens with the occasion.
  const storyFirst = !!country.facts["mood-hard"] || firstBears;
  blocks.push(
    ...(storyFirst ? [story, occasion, creed] : [occasion, creed, story]),
  );
  blocks.push(...priorityBlocks, ...(lineBlock ? [lineBlock] : []));

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
  return blocks.map((block, at) => {
    if (
      !block.joins &&
      !(at > P.zero && blocks[at - P.one]!.key === "salutation")
    )
      part += P.one;
    const { joins, ...rest } = block;
    void joins;
    return { ...rest, part };
  });
}

/**
 * What the pledge answers: the worst of the year's numbers when one went the
 * wrong way (the most specific wins), else the year as a whole.
 */
function pledgeOptions(facts: Facts): { topic?: string } {
  if (facts["unemployment-up"]) return { topic: "unemployment" };
  if (facts["wages-behind-prices"]) return { topic: "wages" };
  if (facts["inflation-up"]) return { topic: "inflation" };
  return {};
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
  for (const block of planAddress(core, president, official, kind)) {
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
    // In the President's own voice: their recorded traits pull each pick,
    // and a crafted device is theirs only once the record shows the
    // addresses that earned it.
    const address = composeAddress(base, "election-night", moves, {
      speakerTraits: president.traits,
      recentPartKeys: said,
      addressesGiven: craft.length,
    });
    if (address.kind !== "rendered") {
      if (block.required) return null;
      continue;
    }
    for (const move of address.moves) {
      said.push(...move.parts.map((part) => part.partKey));
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
  const sentences = composeAddressOf(core, president, official, kind);
  if (!sentences?.length) return null;
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
      [ADDRESS_FACT.kind]: story.speechKind,
      [ADDRESS_FACT.opening]: story.address.openingLine.text,
      [ADDRESS_FACT.remembered]: story.address.rememberedLine.text,
      [ADDRESS_FACT.text]: story.address.text,
      [ADDRESS_FACT.parts]: story.address.parts.join(ADDRESS_PART_BREAK),
    },
  });
  return story;
}
