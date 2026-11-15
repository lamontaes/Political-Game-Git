import type { EntityId } from "../core2/kernel/brands";
import { spokenDate } from "../core2/kernel/dates";
import {
  followersOf,
  outletsHere,
  townOutlet,
  type OutletRow,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { composeNewsStory, type StoryKind } from "../english/english-newscast";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import {
  archivedFacts,
  archivedLawFacts,
  archivedLawPassedFacts,
  printedFacts,
} from "./printed-words";
import type { ownRace } from "./results";
import { measureSaid, policyNames } from "./words";
import { coreStateName } from "../core2/place-lookup";
import { stateInSentence } from "../director/words";

/** A story as the news engine keeps it. */
interface StoredStory {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly facts: Readonly<Record<string, unknown>>;
}

export interface WordedStory {
  readonly headline?: string;
  readonly lede?: string;
  /** The lede and the sentences after it, when the record gives more to say. */
  readonly paragraphs?: readonly string[];
  /** A side item: a headline and one line, never paragraphs; the screen does not open it. */
  readonly brief?: true;
  /**
   * The headline as a person says it in talk: a bill by what it does (its
   * purpose), never by its number. Absent where the headline names no bill.
   */
  readonly spoken?: string;
  readonly sourceRecordIds: readonly string[];
}

/**
 * The words for a story the press archived from the year before day one.
 * The press engine keeps the record (kind, winner, votes); the English engine
 * words it here from those facts: an election, a vote, a budget, a business
 * that closed or a parent who died, from the record itself (printed-words), and
 * a law enacted or taking effect by its name. Only a story the banks can say
 * gets words; the rest stay records until the banks grow.
 */

let NAMES: Record<string, string> | undefined;

export function wordArchiveStory(
  core: CoreState,
  story: StoredStory,
): WordedStory | null {
  if (story.kind !== "press.archived") return null;
  const recordKind = story.facts.recordKind;
  const ids = [story.id] as EntityId[];
  const fact = (text: string, more: readonly string[] = []) => ({
    text,
    sourceRecordIds: [...ids, ...more] as EntityId[],
  });
  if (recordKind === "law-enacted" || recordKind === "law-took-effect") {
    // A law is named by its series on the bill catalog; one with no name stays a record.
    // A law that took effect is told as the press tells one in play: the amount it
    // moved from and to, the bill that made it, when the law's own row says so.
    if (recordKind === "law-took-effect") {
      const told = archivedLawFacts(core, story);
      // A law with only its name to tell (no bill, no amount moved) keeps the
      // catalog's own words below.
      const text =
        told && told.kind !== "law-rule"
          ? worded(
              core,
              story.id,
              told.kind,
              told.speaker || story.id,
              told.facts,
            )
          : null;
      if (text) return text;
    }
    // A law enacted is told for what it does and where, the way one taking
    // effect is, when its row says so; else by its name and the day.
    if (recordKind === "law-enacted") {
      const passed = archivedLawPassedFacts(core, story);
      const text = passed
        ? worded(
            core,
            story.id,
            passed.kind,
            passed.speaker || story.id,
            passed.facts,
          )
        : null;
      if (text) return text;
    }
    NAMES ??= policyNames();
    const measure = NAMES[String(story.facts.series ?? "")];
    if (!measure) return null;
    // Whose law it is, from the record's level: the federal one, or the
    // state's by name (Fable A, Nov 13, rule 15: two "Income tax rate took
    // effect" briefs, state and federal, unnamed).
    const usps = /^US-([A-Z]{2})$/.exec(
      String(story.facts.jurisdiction ?? ""),
    )?.[1];
    const state =
      story.facts.level === "state" && usps ? coreStateName(usps) : null;
    return worded(core, story.id, "vote-or-law", story.id, {
      measure: fact(measureSaid(measure), [String(story.facts.lawId ?? "")]),
      date: fact(spokenDate(story.date)),
      [recordKind === "law-enacted" ? "enacted" : "effective"]: fact("yes"),
      ...(story.facts.level === "federal" ? { federal: fact("yes") } : {}),
      ...(state ? { place: fact(stateInSentence(state)) } : {}),
    });
  }
  // An election, a budget, a vote, a closing business and a parent who died
  // are told from their records as the paper tells them in play: a headline,
  // a first sentence and what else the record holds.
  const told = archivedFacts(core, story);
  return told
    ? worded(core, story.id, told.kind, told.speaker || story.id, told.facts)
    : null;
}

/** The paper each kind of outlet prints in: a paper's columns, or a station's page. */
const LAYOUTS: Readonly<Record<string, string>> = {
  newspaper: "broadsheet",
  "national-paper": "broadsheet",
  magazine: "modern",
  online: "modern",
  television: "modern",
  cable: "modern",
  radio: "modern",
};

/**
 * The words for a story the press printed during play, by the outlet that
 * printed it: the English engine words it from the record it was printed from
 * (printed-words), and News files it under that outlet's name.
 */
export function wordPrintedStory(
  core: CoreState,
  story: StoredStory & { readonly outletId?: string },
):
  | (WordedStory & { outlet?: { id: string; name: string; layout: string } })
  | null {
  const read = printedFacts(core, story);
  if (!read) return null;
  const text = worded(
    core,
    story.id,
    read.kind,
    read.speaker || story.id,
    read.facts,
    read.turn,
  );
  if (!text) return null;
  // In talk a bill is said by what it does: the same words, with the
  // designation's place taken by the bill's purpose.
  const spoken =
    read.facts.designation && read.facts.purpose
      ? worded(core, story.id, read.kind, read.speaker || story.id, {
          ...read.facts,
          designation: read.facts.purpose,
        })?.headline
      : undefined;
  const outlet = story.outletId ? outletOf(core, story.outletId) : undefined;
  return {
    ...text,
    ...(spoken && spoken !== text.headline ? { spoken } : {}),
    ...(outlet ? { outlet } : {}),
  };
}

/** An outlet as News draws it: its record id, name and the layout of its kind. */
export function outletOf(
  core: CoreState,
  outletId: string,
): { id: string; name: string; layout: string } | undefined {
  const organization = core.organizations.get(outletId as EntityId);
  if (!organization) return undefined;
  const kind = outletId.split(":")[2] ?? "";
  return {
    id: organization.id,
    name: organization.name,
    layout: LAYOUTS[kind] ?? "broadsheet",
  };
}

/**
 * The player's own outlets: the local press of the town they live in, which
 * News shows from the first day, before they print. The ones the player
 * follows first (the press engine's followersOf: News lists what they heard,
 * and they hear what they follow), newspapers before the rest; then the
 * town's paper of record (townOutlet, which carries the public record); then
 * the other local outlets, newspapers first, in the order the press recorded
 * them.
 */
// stopgapId: SG-SCREENS-news-opens-on-town-paper
export function homePapers(
  core: CoreState,
  personId: string,
): {
  id: string;
  name: string;
  layout: string;
  home: true;
  /** Why it is the player's: they follow it, it is the paper of record, or it is local. */
  why: "follows" | "record" | "local";
}[] {
  const placeId = core.people.get(personId as EntityId)?.placeId;
  if (!placeId) return [];
  const api = coreAPI(core);
  const record = townOutlet(api)?.organizationId;
  const paper = (row: OutletRow) => (row.kind === "newspaper" ? 0 : 1);
  const rank = (row: OutletRow) =>
    followersOf(api, row.id).includes(personId)
      ? paper(row)
      : row.organizationId === record
        ? 2
        : 3 + paper(row);
  return outletsHere(api)
    .filter((row) => row.tier === "local" && row.placeId === placeId)
    .map((row) => ({ row, rank: rank(row) }))
    .sort((a, b) => a.rank - b.rank)
    .flatMap(({ row, rank }) => {
      const outlet = outletOf(core, row.organizationId);
      const why = rank < 2 ? "follows" : rank === 2 ? "record" : "local";
      return outlet ? [{ ...outlet, home: true as const, why }] : [];
    });
}

/**
 * Whether the player follows any outlet at all, local, state or national (the
 * press engine's followersOf), so an empty News page can say they follow none.
 */
export function followsAnyOutlet(core: CoreState, personId: string): boolean {
  const api = coreAPI(core);
  return outletsHere(api).some((row) =>
    followersOf(api, row.id).includes(personId),
  );
}

type StoryFact = { text: string; sourceRecordIds: EntityId[] };

/** One story worded by the English engine from its record's facts. */
function worded(
  core: CoreState,
  storyId: string,
  kind: StoryKind,
  speaker: string,
  facts: Record<string, StoryFact>,
  turn?: number,
): WordedStory | null {
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `archive-news:${storyId}`,
    worldSeed: core.seed,
    bankVersion: "words-newscast-v1",
    stage: "default",
    sourceRecordIds: [storyId as EntityId],
    facts,
    speaker: { personId: speaker as EntityId, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, row]) => ({
      personId: speaker as EntityId,
      factKey,
      sourceRecordIds: row.sourceRecordIds,
    })),
  };
  const composed = composeNewsStory(packet, kind, turn);
  if (!composed.headline && !composed.lede) return null;
  // A headline or sentence opens with a capital, whatever fact starts it.
  const opened = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  return {
    ...(composed.headline ? { headline: opened(composed.headline) } : {}),
    ...(composed.lede ? { lede: opened(composed.lede) } : {}),
    // The story's body as print sets it: the lede, then each sentence the
    // record gives it, so News prints a story, not only a brief.
    ...(composed.paragraphs && composed.paragraphs.length > 1
      ? { paragraphs: composed.paragraphs.map(opened) }
      : {}),
    ...(composed.brief ? { brief: true as const } : {}),
    sourceRecordIds: composed.sourceRecordIds,
  };
}

/**
 * The person's own newest race as the paper tells it, from the count's public
 * record: who won or lost the race for which office, and against whom.
 */
export function wordOwnResult(
  core: CoreState,
  race: NonNullable<ReturnType<typeof ownRace>>,
  personId: string,
) {
  const record = core.durableLog.get(race.recordId as EntityId);
  const person = core.people.get(personId);
  if (!record || !person) return null;
  const office = (record as { facts?: Record<string, unknown> }).facts?.office;
  const ids = [record.id] as EntityId[];
  const facts: Record<string, StoryFact> = {
    name: {
      text: `${person.givenName} ${person.familyName}`,
      sourceRecordIds: [...ids, person.id as EntityId],
    },
    [race.won ? "won" : "lost"]: { text: "yes", sourceRecordIds: ids },
    ...(typeof office === "string"
      ? { office: { text: office, sourceRecordIds: ids } }
      : {}),
    ...(race.rival
      ? {
          opponent: {
            text: race.rival.name,
            sourceRecordIds: [...ids, race.rival.id as EntityId],
          },
        }
      : {}),
  };
  const story = worded(core, record.id, "election", personId, facts);
  return (
    story && {
      id: record.id,
      date: record.date,
      kind: record.kind,
      facts: (record as { facts?: Record<string, unknown> }).facts ?? {},
      contestId: race.contestId,
      ...story,
    }
  );
}

/**
 * A law another state passed, told as the press tells one: its name on the
 * bill catalog, the state, and the day it was enacted. Null for a law the
 * catalog has no name for, which stays a record.
 */
export function wordNationLaw(
  core: CoreState,
  law: {
    readonly id: string;
    readonly series: string;
    readonly date: string;
    readonly stateName: string;
  },
): WordedStory | null {
  // Told as the press tells a law in play, from the law's own row: the amount
  // it moved from and to, or what the law is for, in the state that passed it.
  const told = archivedLawFacts(core, {
    id: law.id,
    kind: "press.archived",
    date: law.date,
    facts: { lawId: law.id },
  });
  const row =
    told && told.kind !== "law-rule"
      ? worded(core, law.id, told.kind, told.speaker || law.id, told.facts)
      : null;
  if (row) return row;
  NAMES ??= policyNames();
  const measure = NAMES[law.series];
  if (!measure) return null;
  const ids = [law.id] as EntityId[];
  const fact = (text: string) => ({ text, sourceRecordIds: ids });
  return worded(core, law.id, "vote-or-law", law.id, {
    measure: fact(`${measure} in ${law.stateName}`),
    date: fact(spokenDate(law.date)),
    enacted: fact("yes"),
  });
}
