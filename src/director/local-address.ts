/**
 * A governor's State of the State and a mayor's State of the City (owner,
 * Nov 8: addresses by "the President, and governors' and mayors'"). It is the
 * same address the President gives, at a smaller scale: the kind (a candid
 * reckoning, a railing, a hopeful lift, a victory lap, words for the dead, a
 * policy push) is picked from the term read of the state's or town's areas and
 * the speaker's traits (address-kind.ts), the subjects are the areas that
 * moved most, bad news first in a hard year, and what the speaker asks of
 * their legislature or council is the questions they hold a view on and their
 * level may answer. The English engine writes every sentence; the address is
 * recorded as a public event the news carries and the household watching it
 * can bring up, like the President's.
 */
import { placeStateKey } from "../core2/place-map";
import { townSeats } from "../core2/modules/offices";
import { officialsIn, type OfficialRow } from "../core2/modules/officials";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { P } from "../core2/parameters";
import { TERM_AREAS, placeTermRead, type AreaRead } from "../core2/term-read";
import { daysBetweenText } from "../core2/kernel/dates";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import {
  addressSituation,
  chooseAddressKind,
  type AddressKind,
} from "./address-kind";
import { ADDRESS_FACT, ADDRESS_PART_BREAK } from "./opening-facts";
import {
  composeBlocks,
  fact,
  voiceOf,
  opposedOf,
  standFacts,
  standsAt,
  wantedOf,
  type Block,
  type Facts,
  type OpeningSentence,
} from "./opening-story";
import { recordAddressResponse } from "./address-response";
import { openingMove } from "../english/english-opening-speech";
import type { OpeningSpeechKind } from "../english/english-opening-speech";
import kindData from "./data/address-kinds.json" with { type: "json" };
import localData from "./data/local-address.json" with { type: "json" };

export type LocalLevel = "state" | "town";

interface LevelData {
  readonly subject: OpeningSpeechKind;
  readonly eventKind: string;
  readonly office: string;
  readonly policyLevel: "state" | "city";
  readonly monthDay: string;
}
const DATA = localData as unknown as {
  levels: Readonly<Record<LocalLevel, LevelData>>;
  parameters: Record<"asksMax" | "topicsMax", { value: number }>;
};
const KIND_DATA = kindData as unknown as {
  kinds: Readonly<Record<AddressKind, { topics: number; tone?: number }>>;
};

export interface LocalStory {
  readonly id: string;
  readonly level: LocalLevel;
  readonly date: string;
  readonly addressKind: AddressKind;
  readonly speakerId: PersonId;
  readonly sentences: readonly OpeningSentence[];
  readonly text: string;
  readonly parts: readonly string[];
  /** The questions the speaker asked for (their level's, not yet law). */
  readonly asks: readonly string[];
}

/** The day of a year a level's address is given. */
export function localAddressDate(level: LocalLevel, year: number): string {
  return `${year}-${DATA.levels[level].monthDay}`;
}

/** The levels whose address falls on this date. */
export function localAddressesOn(date: string): LocalLevel[] {
  return (Object.keys(DATA.levels) as LocalLevel[]).filter(
    (level) =>
      localAddressDate(level, Number(date.slice(P.zero, "YYYY".length))) ===
      date,
  );
}

/** Who speaks for the player's state or town: the person, when they began, and the officials engine's row for them where it keeps one. */
interface Speaker {
  readonly personId: PersonId;
  readonly serviceStart: string;
  /** Only the state's and the nation's officials are in the officials engine; a mayor's views are not on a row. */
  readonly official?: OfficialRow;
  readonly jurisdiction: string;
}

function speakerOf(core: CoreState, level: LocalLevel): Speaker | null {
  const api = coreAPI(core);
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (!player) return null;
  const spec = DATA.levels[level];
  if (level === "state") {
    const stateKey = placeStateKey(core.placeMetadata.placeKey);
    const official = stateKey
      ? officialsIn(api, `${stateKey}:${spec.office}`)[P.zero]
      : undefined;
    return official && stateKey
      ? {
          personId: official.id as PersonId,
          serviceStart: official.serviceStart,
          official,
          jurisdiction: stateKey,
        }
      : null;
  }
  const seat = townSeats(api).find(
    (row) =>
      row.office.level === "city" &&
      row.office.kind.includes(spec.office) &&
      row.holder?.personId &&
      core.people.get(row.holder.personId as PersonId)?.alive,
  );
  if (!seat?.holder?.personId) return null;
  const official = officialsIn(
    api,
    `${seat.office.jurisdiction}:${seat.office.kind}`,
  )[P.zero];
  return {
    personId: seat.holder.personId as PersonId,
    serviceStart: seat.holder.serviceStart ?? seat.holder.startDate,
    ...(official ? { official } : {}),
    jurisdiction: seat.office.jurisdiction,
  };
}

/** Every place the outcome web keeps rows for (the same read `termReadPlaces` gives once the public-action change lands). */
function webPlaces(core: CoreState): string[] {
  const rows = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as { placeId: string }[];
  return [...new Set(rows.map((row) => row.placeId))].sort();
}

/** The term read of the state (the places the web keeps inside it) or of the town. */
function realmRead(
  core: CoreState,
  level: LocalLevel,
  since: string,
): AreaRead[] {
  const api = coreAPI(core);
  if (!core.modules.has(OUTCOME_WEB_MODULE_ID)) return [];
  const here = core.people.get(core.playerId ?? "")?.placeId;
  if (level === "town") return here ? placeTermRead(api, here, since) : [];
  const state = placeStateKey(core.placeMetadata.placeKey);
  const reads = webPlaces(core)
    .filter((place) => placeStateKey(place) === state)
    .flatMap((place) => placeTermRead(api, place, since));
  return TERM_AREAS.flatMap((area): AreaRead[] => {
    const rows = reads.filter((row) => row.area === area);
    return rows.length
      ? [
          {
            area,
            slide:
              rows.reduce((sum, row) => sum + row.slide, P.zero) / rows.length,
            measures: rows.flatMap((row) => row.measures),
            sourceRecordIds: [
              ...new Set(rows.flatMap((row) => row.sourceRecordIds)),
            ],
          },
        ]
      : [];
  });
}

/** The blocks of a local address, and the kind it took. */
function planLocal(
  core: CoreState,
  level: LocalLevel,
  speaker: PersonState,
  spoken: Speaker,
): { blocks: Block[]; addressKind: AddressKind; asks: string[] } {
  const api = coreAPI(core);
  const spec = DATA.levels[level];
  const voice = voiceOf(speaker);
  const { official, jurisdiction } = spoken;
  const areas = realmRead(core, level, spoken.serviceStart);
  const stands = official
    ? standsAt(api, official, spec.policyLevel, jurisdiction)
    : [];
  const open = stands.filter((row) => !row.law.inForce);
  const asks = [
    ...wantedOf(open),
    ...opposedOf(open).slice(P.zero, P.one),
  ].slice(P.zero, DATA.parameters.asksMax.value);
  const facts: Facts = {};
  let better = P.zero,
    worse = P.zero;
  for (const read of areas) {
    facts[`${read.area}-${read.slide >= P.zero ? "better" : "worse"}`] = fact(
      "yes",
      ...read.sourceRecordIds,
    );
    better += Math.max(P.zero, read.slide);
    worse += Math.max(P.zero, -read.slide);
  }
  const situation = addressSituation(core, {
    macroSlide: P.zero,
    areas,
    priorities: asks.length,
    prioritiesMax: DATA.parameters.asksMax.value,
  });
  // A governor or mayor in their first year takes no lap for a record they did not make.
  const firstYear =
    daysBetweenText(spoken.serviceStart, core.date) <
    api.parameter("daysPerMeanYear");
  const addressKind = chooseAddressKind(
    speaker,
    situation,
    firstYear ? ["victory"] : [],
  );
  facts[`kind-${addressKind}`] = fact(
    "yes",
    ...new Set([
      ...areas.flatMap((read) => read.sourceRecordIds),
      ...(situation.griefId ? [situation.griefId] : []),
      speaker.id,
    ]),
  );
  const move = (
    role: string,
    options: { topic?: string; required?: boolean } = {},
  ) => openingMove(spec.subject, voice, role, { ...options, addressKind });
  // The subjects the story tells: a kind that tells hard news leads with what
  // fell and tells no good news beside it while there is bad; a kind that
  // tells good news leads with what rose; the rest follow the year.
  const tone =
    KIND_DATA.kinds[addressKind].tone ??
    (better > worse ? P.one : worse > better ? -P.one : P.zero);
  const anyFell = areas.some((read) => read.slide < P.zero);
  const told = areas
    .filter((read) => !(tone < P.zero && anyFell && read.slide >= P.zero))
    .sort(
      (a, b) =>
        (tone === P.zero
          ? Math.abs(b.slide) - Math.abs(a.slide)
          : tone * (b.slide - a.slide)) || a.area.localeCompare(b.area),
    )
    .slice(
      P.zero,
      Math.min(
        DATA.parameters.topicsMax.value,
        Math.max(P.one, KIND_DATA.kinds[addressKind].topics),
      ),
    )
    .map((read) => read.area);
  const blocks: Omit<Block, "part">[] = [
    {
      key: "salutation",
      level: "salutation",
      facts: {},
      moves: [move("salutation", { required: true })],
      required: true,
    },
    {
      key: "occasion",
      level: "occasion",
      facts: {},
      moves: [move("occasion")],
    },
    {
      key: "story",
      level: "country",
      facts,
      moves: [
        move("story-open"),
        ...told.map((topic) => move("story-says", { topic })),
        move("story-turn"),
        move("pledge"),
      ],
    },
    ...asks.map((stand, at): Omit<Block, "part"> => ({
      key: `ask-${at}-${stand.question}`,
      level: "congress",
      facts: standFacts(stand, official!, at ? "rank-line" : "rank-first"),
      moves: [move("ask")],
    })),
    {
      key: "hope",
      level: "close",
      facts,
      moves: [move("hope")],
    },
    {
      key: "close",
      level: "close",
      facts: {},
      moves: [move("close", { required: true })],
      required: true,
    },
  ];
  // One paragraph for the greeting, the story, the asks and the close.
  const partOf: Record<string, number> = {
    salutation: P.zero,
    occasion: P.zero,
    story: P.one,
  };
  return {
    blocks: blocks.map((block) => ({
      ...block,
      part:
        partOf[block.key] ??
        (block.key.startsWith("ask-") ? P.one + P.one : P.one + P.one + P.one),
    })),
    addressKind,
    asks: asks.map((stand) => stand.question),
  };
}

/**
 * Compose a governor's or mayor's address from the world's records. Null where
 * the player's state or town seats no one in the office, or the address cannot
 * open and close from the record.
 */
export function composeLocalAddress(
  core: CoreState,
  level: LocalLevel,
): LocalStory | null {
  const spoken = speakerOf(core, level);
  const speaker = spoken ? core.people.get(spoken.personId) : undefined;
  if (!spoken || !speaker) return null;
  const plan = planLocal(core, level, speaker, spoken);
  const sentences = composeBlocks(core, speaker, plan.blocks);
  if (!sentences?.length) return null;
  return {
    id: `${DATA.levels[level].eventKind}:${core.date}`,
    level,
    date: core.date,
    addressKind: plan.addressKind,
    asks: plan.asks,
    speakerId: speaker.id,
    sentences,
    text: sentences.map((row) => row.text).join(" "),
    parts: [...new Set(sentences.map((row) => row.part))].map((part) =>
      sentences
        .filter((row) => row.part === part)
        .map((row) => row.text)
        .join(" "),
    ),
  };
}

/**
 * Record today's governor's or mayor's address once, as a public event: the
 * news carries it to the state or town, the household watching it with the
 * player sees it, and anyone who heard it can bring it up.
 */
export function recordLocalAddress(
  core: CoreState,
  level: LocalLevel,
): LocalStory | null {
  const playerId = core.playerId;
  const player = playerId ? core.people.get(playerId) : undefined;
  if (!playerId || !player) return null;
  const id = `${DATA.levels[level].eventKind}:${core.date}`;
  if (core.eventIds.has(id)) return null;
  const story = composeLocalAddress(core, level);
  if (!story) return null;
  const household = core.households.get(player.householdId);
  applyCoreEvent(core, {
    id: story.id,
    date: core.date as never,
    kind: DATA.levels[level].eventKind,
    personIds: [story.speakerId],
    witnessIds: [
      playerId,
      ...(household?.memberIds ?? []).filter(
        (member) => member !== playerId && core.people.has(member),
      ),
    ],
    placeId: player.placeId,
    source: {
      tag: "SOURCED",
      citation: `The ${DATA.levels[level].office}'s address, composed by the English engine from the world's records (data/english/parts/opening-speech.json).`,
      asOf: core.date as never,
    },
    publicRecord: true,
    news: true,
    facts: {
      level,
      [ADDRESS_FACT.speaker]: story.speakerId,
      [ADDRESS_FACT.kind]: DATA.levels[level].subject,
      [ADDRESS_FACT.style]: story.addressKind,
      [ADDRESS_FACT.opening]: story.sentences[P.zero]!.text,
      [ADDRESS_FACT.remembered]: (
        story.sentences.find((row) => row.level === "congress") ??
        story.sentences.find((row) => row.level === "country") ??
        story.sentences[P.zero]!
      ).text,
      [ADDRESS_FACT.text]: story.text,
      [ADDRESS_FACT.parts]: story.parts.join(ADDRESS_PART_BREAK),
    },
  });
  // The other side answers a governor the same day.
  if (level === "state") {
    const spoken = speakerOf(core, level);
    if (spoken?.official) recordAddressResponse(core, story, spoken.official);
  }
  return story;
}

/** Record today's governor's and mayor's addresses, for the levels whose day it is. */
export function recordLocalAddresses(core: CoreState): void {
  for (const level of localAddressesOn(core.date))
    recordLocalAddress(core, level);
}
