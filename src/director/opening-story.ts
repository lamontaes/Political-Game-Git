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
import { regionalMonth, regionOfPlace } from "../core2/modules/regional";
import { openingRegionMonths } from "../core2/regional-model";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import type { EntityId } from "../core2/kernel/brands";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "../english/grounded-english";
import { composeAddress } from "../english/english-composition";
import { addressesGivenBy } from "../core2/modules/speech";
import {
  openingMoves,
  openingSpeechKind,
  OPENING_SECTIONS,
  type OpeningLevel,
  type OpeningSpeechKind,
} from "../english/english-opening-speech";
import {
  composeLeadIn,
  composeNewsStory,
  NEWSCAST_BANK,
  type StoryKind,
} from "../english/english-newscast";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import openingData from "./data/opening-story.json" with { type: "json" };
import { ADDRESS_FACT } from "./opening-facts";
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
  stopgapId: string;
  numbers: {
    decimals: number;
    jobsPerSeriesUnit: number;
    jobsPerMillion: number;
  };
  actionWords: readonly string[];
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

/** The country's numbers and the claims its record supports, as speech facts. */
function countryFacts(core: CoreState, kind: OpeningSpeechKind): Facts {
  const months = macroMonths(core);
  if (!months) return {};
  const { now, before } = months;
  const api = coreAPI(core);
  const ids = [now.id, ...(before ? [before.id] : [])];
  const facts: Facts = {
    "unemployment-rate": fact(now.unemploymentPct.toFixed(N.decimals), now.id),
    "inflation-rate": fact(now.inflationPct.toFixed(N.decimals), now.id),
  };
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
  if (!before) return facts;
  claim("unemployment-down", now.unemploymentPct < before.unemploymentPct);
  claim("inflation-down", now.inflationPct < before.inflationPct);
  claim("inflation-up", now.inflationPct > before.inflationPct);
  claim("wages-up", now.hourlyEarnings > before.hourlyEarnings);
  claim("growth-up", now.realOutput > before.realOutput);
  const added = now.payrollJobsThousands - before.payrollJobsThousands;
  // A new President can't claim the last administration's jobs as "we
  // created": an inaugural address says only that jobs are up.
  if (added > P.zero) {
    claim("jobs-up", true);
    if (kind !== "inaugural")
      facts["jobs-added"] = fact(jobsSaid(added), ...ids);
  }
  return facts;
}

/** The bill catalog's name for each policy question. */
const QUESTION_NAMES: ReadonlyMap<string, string> = (() => {
  const names = new Map<string, string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      const row = value as { kind?: string; name?: string; question?: string };
      if (row.kind === "policy-question" && row.name && row.question)
        names.set(row.question, row.name);
      Object.values(value).forEach(walk);
    }
  };
  walk(billCatalog);
  return names;
})();

/**
 * The President's own issues they would ask for, in their order: a question
 * the President supports whose catalog name reads as an action ("raise
 * minimum wage"), each with the official record it comes from.
 */
function presidentGoals(official: OfficialRow): GroundedEnglishFact[] {
  // stopgapId: SG-PEOPLE-opening-goal-words
  markWordsStopgap(DATA.stopgapId);
  return official.signature.flatMap(({ question }) => {
    const name = QUESTION_NAMES.get(question);
    if (!name) return [];
    if (ownStance(official.ideal, official.signature, question) <= P.zero)
      return [];
    if (!DATA.actionWords.includes(name.split(" ")[P.zero]!)) return [];
    return [fact(name, official.id, `question:${question}`)];
  });
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

/** The facts each section of the address is composed with. */
function sectionFacts(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  kind: OpeningSpeechKind,
  townState: string | null,
  onStage: ReadonlySet<string>,
): Record<OpeningLevel, Facts> {
  const api = coreAPI(core);
  const country = countryFacts(core, kind);
  const [first, second, third] = presidentGoals(official);
  const governor = townState
    ? officialsIn(api, `${townState}:governor`)[P.zero]
    : undefined;
  // A governor is thanked by name only when the scene introduces them by
  // office and state (owner, Oct 14, 2026: "Thank you, Governor Munoz").
  const governorPerson =
    governor && onStage.has(governor.id)
      ? core.people.get(governor.id)
      : undefined;
  const place = visitedPlace(president, townState);
  return {
    occasion: third ? { goal: third } : {},
    country,
    congress: first ? { goal: first } : {},
    governors: {
      ...(second ? { goal: second } : {}),
      ...(governorPerson
        ? { name: fact(governorPerson.familyName, governor!.id) }
        : {}),
    },
    towns: place ? { place } : {},
    families: {},
    close: {},
  };
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

function composeAddressOf(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  kind: OpeningSpeechKind,
  townState: string | null,
  onStage: ReadonlySet<string>,
): OpeningSentence[] | null {
  const facts = sectionFacts(
    core,
    president,
    official,
    kind,
    townState,
    onStage,
  );
  const stage = chairStage(core);
  const sentences: OpeningSentence[] = [];
  for (const section of OPENING_SECTIONS) {
    const own = facts[section.level];
    const moves = openingMoves(kind, section.level)
      .map((move) => ({
        ...move,
        bank: {
          ...move.bank,
          parts: {
            core: {
              variants: move.bank.parts.core!.variants.filter(
                (variant) =>
                  "text" in variant &&
                  // A President taking office can't claim the last term's record.
                  (kind !== "inaugural" ||
                    !/^We(?:'ve| have)? (?:created|cut)\b/.test(
                      variant.text,
                    )) &&
                  // The country is told by its figures: a sentence that
                  // carries the number and what it is, never a bare claim
                  // ("Prices are too high", owner, Oct 14, 2026).
                  (section.level !== "country" || variant.text.includes("{{")),
              ),
            },
          },
        },
      }))
      .filter((move) => move.bank.parts.core.variants.length);
    const base = packet(
      `opening:${core.date}:${president.id}/${section.level}`,
      core.seed,
      president.id,
      stage,
      own,
      [president.id],
    );
    // stopgapId: SG-PEOPLE-address-register
    markWordsStopgap("SG-PEOPLE-address-register");
    // A device is the speaker's to use only once the record shows enough
    // addresses given by them (speech.ts keeps one record per address).
    const address = composeAddress(base, "election-night", moves, {
      addressesGiven: addressesGivenBy(coreAPI(core), president.id),
    });
    if (address.kind !== "rendered") {
      if (section.required) return null;
      continue;
    }
    for (const move of address.moves) {
      const used = new Set(move.parts.flatMap((part) => part.usedFactKeys));
      const visit = [...used].includes("place")
        ? own.place?.sourceRecordIds
            .map((id) => /:visit:(US-[A-Z]{2})$/.exec(id)?.[P.one])
            .find(Boolean)
        : undefined;
      sentences.push({
        level: section.level,
        text: move.text,
        facts: [...used].sort(),
        ...(visit ? { stateKey: visit } : {}),
        sourceRecordIds: [
          ...new Set([
            president.id,
            ...[...used].flatMap((key) => own[key]?.sourceRecordIds ?? []),
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
  return {
    kind: "jobs-report",
    recordId: region.id,
    facts: {
      place: fact(townName, townId),
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
 * engine carries it to the town, the player saw it, and anyone who hears it
 * can bring it up. Returns the story it recorded, or null.
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
    witnessIds: [playerId],
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
