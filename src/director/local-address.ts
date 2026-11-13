/**
 * A governor's State of the State and a mayor's State of the City (owner,
 * Nov 8: addresses by "the President, and governors' and mayors'"). It is the
 * same address the President gives, at a smaller scale, planned by the same
 * one outline planner (speech-outline.ts) from its own outline row: one theme
 * from the speaker's record and the term read of the state's or town's areas,
 * each point context, stand and ask, and each ask said once to the level that
 * can act. This file says who speaks, on which day, and what their realm's
 * term read is. The English engine writes every sentence; the address is
 * recorded as a public event the news carries and the household watching it
 * can bring up, like the President's.
 */
import { placeStateKey } from "../core2/place-map";
import { OFFICES_MODULE_ID, townSeats } from "../core2/modules/offices";
import { officialsIn, type OfficialRow } from "../core2/modules/officials";
import { OUTCOME_WEB_MODULE_ID } from "../core2/modules/outcome-web";
import { P } from "../core2/parameters";
import {
  TERM_AREAS,
  placeTermRead,
  type AreaRead,
} from "../core2/modules/laws";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { AddressKind } from "./address-kind";
import { ADDRESS_FACT, ADDRESS_PART_BREAK } from "./opening-facts";
import { composeBlocks, type OpeningSentence } from "./opening-story";
import { planSpeech } from "./speech-outline";
import { recordAddressResponse } from "./address-response";
import type { OpeningSpeechKind } from "../english/english-opening-speech";
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
  /** The one theme the speech is about, from the speech outline. */
  readonly theme: string | null;
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
  // A core without the offices engine installed has no town seats to read.
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
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
  const plan = planSpeech(core, DATA.levels[level].subject, {
    person: speaker,
    ...(spoken.official ? { official: spoken.official } : {}),
    jurisdiction: spoken.jurisdiction,
    serviceStart: spoken.serviceStart,
    areas: realmRead(core, level, spoken.serviceStart),
  });
  // A speech with nothing to say is not given: no theme from the records and
  // nothing to ask (pool note on the pull request: no officials row holds a
  // mayor's views, so a mayor has no stands to ask for).
  if (!plan.theme && !plan.asks.length) return null;
  const sentences = composeBlocks(core, speaker, plan.blocks);
  if (!sentences?.length) return null;
  return {
    id: `${DATA.levels[level].eventKind}:${core.date}`,
    level,
    date: core.date,
    addressKind: plan.addressKind,
    theme: plan.theme,
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
      // The first stand the address took, in its own words, with the
      // speaker's side: what a hearer at home brings up.
      ...pointFacts(story),
    },
  });
  // The other side answers a governor the same day.
  if (level === "state") {
    const spoken = speakerOf(core, level);
    if (spoken?.official) recordAddressResponse(core, story, spoken.official);
  }
  return story;
}

/** The first stand an address took, as event facts. */
function pointFacts(story: LocalStory): Record<string, string> {
  const stand = story.sentences.find((row) => row.stand)?.stand;
  return stand
    ? {
        [ADDRESS_FACT.pointAbout]: stand.about,
        [ADDRESS_FACT.pointStance]: stand.stance,
      }
    : {};
}

/** Record today's governor's and mayor's addresses, for the levels whose day it is. */
export function recordLocalAddresses(core: CoreState): void {
  for (const level of localAddressesOn(core.date))
    recordLocalAddress(core, level);
}
