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
import {
  ADDRESS_FACT,
  ADDRESS_PART_BREAK,
  addressPiecesFact,
} from "./opening-facts";
import { composeBlocks, type OpeningSentence } from "./opening-story";
import {
  planSpeech,
  type OutlineSpeaker,
  type PlannedPoint,
} from "./speech-outline";
import { contestPositions } from "../core2/modules/campaigns";
import { presidingOfficer } from "../core2/modules/legislature";
import { governmentProperName } from "../core2/government-proper-name";
import { officeWords } from "../english/said-as";
import { markWordsStopgap } from "./stopgaps";
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
  /** Who heads a local government (local-address.json `heads`). */
  readonly heads?: {
    readonly order: readonly string[];
    readonly executives: readonly string[];
    readonly bodies: readonly string[];
    readonly bodyWords: readonly string[];
    readonly realmForms: readonly string[];
  };
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
  /** Each point as the outline planned it (shape, side, belief, figure). */
  readonly points: readonly PlannedPoint[];
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
  /** Only the state's and the nation's officials are in the officials engine; a local officeholder's views are read from the person (`OutlineSpeaker.local`). */
  readonly official?: OfficialRow;
  readonly jurisdiction: string;
  readonly local?: OutlineSpeaker["local"];
  /** Their office as the said-as words key it (`officeWords`), for the nameplate. */
  readonly officeWords: string;
}

type TownSeat = ReturnType<typeof townSeats>[number];

const HEADS = DATA.levels.town.heads!;

/** A local body as people say it, by the first of `bodyWords` its recorded name holds ("Clark Fork City Council" is "the council"), else its name's last word. */
function bodySaid(office: TownSeat["office"]): string | null {
  const words = (office.bodyName ?? "")
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/)
    .filter(Boolean);
  const word =
    HEADS.bodyWords.find((row) => words.includes(row)) ?? words.at(-P.one);
  return word ? `the ${word}` : null;
}

/** The place a local government governs, as its people say it: the town's own name, else the township's or the county's. */
function realmSaid(core: CoreState, office: TownSeat["office"]): string | null {
  return office.level === "city"
    ? ((core.placeMetadata.placeName ?? "").split(",")[P.zero]?.trim() ?? null)
    : realmOfForm(
        governmentProperName(office.governmentName, office.jurisdiction),
      );
}

/**
 * A local body by the name its record gives it, as people say it to the
 * body's face ("the Groton Select Board", "the East Hempfield Board of
 * Supervisors", "the DeSoto County Board of Commissioners"): where the
 * recorded name opens with its government's listed name ("Town of Groton
 * Select Board"), that part is said as the place is. Null where the record
 * names no body.
 */
function bodyNameSaid(
  core: CoreState,
  office: TownSeat["office"],
): string | null {
  const name = office.bodyName?.trim();
  if (!name) return null;
  const listed = governmentProperName(
    office.governmentName,
    office.jurisdiction,
  );
  const opens = name
    .toLocaleLowerCase("en-US")
    .startsWith(`${listed.toLocaleLowerCase("en-US")} `);
  const place = opens ? realmSaid(core, office) : null;
  return `the ${place ? `${place} ${name.slice(listed.length + P.one)}` : name}`;
}

/** "County of Maui" said as "Maui County", for the forms `realmForms` lists; a town, city or village by its name alone. */
function realmOfForm(listed: string): string {
  const [, form, name] = /^(\w+) of (.+)$/.exec(listed) ?? [];
  if (!form || !name) return listed;
  return HEADS.realmForms.includes(form) ? `${name} ${form}` : name;
}

/**
 * What the one planner needs to plan a local speaker's speech: the level of
 * their government, the questions its body decides (`contestPositions`),
 * the office whose record gives the power, their party, and the place, the
 * body and the office as people say them, from the office rows.
 */
export function localSpeaker(
  core: CoreState,
  holder: { readonly party?: string | null },
  office: TownSeat["office"],
  officeTitle: string | null,
): NonNullable<OutlineSpeaker["local"]> {
  const body = bodyOfficeOf(core, office);
  return {
    level: office.level === "township" ? "city" : office.level,
    officeId: office.id,
    party: holder.party ?? null,
    questions: contestPositions(coreAPI(core), { officeId: office.id }),
    realmName: realmSaid(core, office),
    body: bodySaid(body),
    bodyName: bodyNameSaid(core, body),
    officeTitle,
  };
}

/** The governing body of an office's own government (its council or board), else the office itself. */
function bodyOfficeOf(
  core: CoreState,
  office: TownSeat["office"],
): TownSeat["office"] {
  return (
    townSeats(coreAPI(core)).find(
      (row) =>
        row.office.jurisdiction === office.jurisdiction &&
        !!row.office.bodyName,
    )?.office ?? office
  );
}

/**
 * The head of the player's nearest local government that seats anyone
 * (local-address.json `heads`): the mayor or county executive the records
 * seat, said by the office row's own title; else the presiding member of its
 * governing body, read from the leadership engine; else, where no one has
 * been chosen to preside, the member who has served longest.
 */
function townHead(
  core: CoreState,
  heads: NonNullable<LevelData["heads"]>,
): Speaker | null {
  const api = coreAPI(core);
  const alive = (row: TownSeat) =>
    !!row.holder?.personId &&
    core.people.get(row.holder.personId as PersonId)?.alive === true;
  const seats = townSeats(api).filter(alive);
  for (const level of heads.order) {
    const here = seats.filter((row) => row.office.level === level);
    const head = here.find((row) => heads.executives.includes(row.office.kind));
    const body = here.filter((row) => heads.bodies.includes(row.office.kind));
    const presiding = body[P.zero]
      ? presidingOfficer(api, body[P.zero]!.office.id)
      : null;
    // stopgapId: SG-WORDS-local-head-longest-serving
    const chosen =
      head ??
      body.find((row) => row.holder!.personId === presiding) ??
      (body.length
        ? (markWordsStopgap("SG-WORDS-local-head-longest-serving"),
          [...body].sort(
            (a, b) =>
              (a.holder!.serviceStart ?? a.holder!.startDate).localeCompare(
                b.holder!.serviceStart ?? b.holder!.startDate,
              ) || a.holder!.personId!.localeCompare(b.holder!.personId!),
          )[P.zero])
        : undefined);
    if (!chosen?.holder?.personId) continue;
    const words =
      chosen === head ? chosen.office.kind : `${chosen.office.kind}:presiding`;
    const title =
      chosen === head
        ? chosen.office.title.toLocaleLowerCase("en-US")
        : (officeWords(`${chosen.office.kind}:presiding`)?.again.replace(
            /^the /,
            "",
          ) ?? null);
    return {
      personId: chosen.holder.personId as PersonId,
      serviceStart: chosen.holder.serviceStart ?? chosen.holder.startDate,
      jurisdiction: chosen.office.jurisdiction,
      local: localSpeaker(core, chosen.holder, chosen.office, title),
      officeWords: officeWords(words) ? words : chosen.office.kind,
    };
  }
  return null;
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
          officeWords: spec.office,
        }
      : null;
  }
  // A core without the offices engine installed has no town seats to read.
  if (!core.modules.has(OFFICES_MODULE_ID) || !spec.heads) return null;
  return townHead(core, spec.heads);
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
    ...(spoken.local ? { local: spoken.local } : {}),
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
    points: plan.points,
    speakerId: speaker.id,
    sentences,
    text: sentences.map((row) => row.text).join(" "),
    parts: partsOf(sentences),
  };
}

/**
 * The address in its parts, one per Continue. A greeting is never a part of
 * its own: where the sentence its paragraph opened for was not said (no
 * occasion from the records), it joins the next paragraph.
 */
function partsOf(sentences: readonly OpeningSentence[]): string[] {
  const parts = [...new Set(sentences.map((row) => row.part))].map((part) =>
    sentences.filter((row) => row.part === part),
  );
  const out: string[] = [];
  let carried = "";
  for (const rows of parts) {
    const text = [carried, ...rows.map((row) => row.text)]
      .filter(Boolean)
      .join(" ");
    if (rows.every((row) => row.level === "salutation")) carried = text;
    else {
      out.push(text);
      carried = "";
    }
  }
  if (carried) out.push(carried);
  return out;
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
  const spoken = speakerOf(core, level);
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
      [ADDRESS_FACT.pieces]: addressPiecesFact(story.sentences, story.points),
      ...(spoken
        ? {
            [ADDRESS_FACT.office]: spoken.officeWords,
          }
        : {}),
    },
  });
  // The other side answers a governor the same day.
  if (level === "state" && spoken?.official)
    recordAddressResponse(core, story, spoken.official);
  return story;
}

/** Record today's governor's and mayor's addresses, for the levels whose day it is. */
export function recordLocalAddresses(core: CoreState): void {
  for (const level of localAddressesOn(core.date))
    recordLocalAddress(core, level);
}
