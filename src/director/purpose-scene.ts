/**
 * A scene with a purpose, as play meets it, fired by the records. The director
 * has already fired the moment from its cause record and cast it (scheduling.ts);
 * this reads that binding, takes the facts the exchange may say from the cause
 * record and the cast, and has the exchange engine (scene-talk.ts) word it as
 * a tree the player taps through. It words nothing itself, and it says why:
 * the cause record, its kind and date, and every fact with the records it
 * came from.
 */
import { saidAs, sayableJobTitle } from "../english/said-as";
import { tellingOf } from "../english/telling";
import { saidPersonOf } from "./said-person";
import { placeStateKey } from "../core2/place-map";
import { BUDGETS_MODULE_ID, type BudgetRow } from "../core2/modules/budgets";
import { gameStartDate } from "../core2/game-start";
import { personLean } from "../core2/campaign-views";
import { appointmentsIn, EMERGENCY_OFFERED } from "../core2/modules/executive";
import {
  LAWS_MODULE_ID,
  lawChain,
  lawInForce,
  policyAuthority,
  type PolicyLevel,
} from "../core2/modules/laws";
import { meetingsOn } from "../core2/modules/interest-groups";
import { OFFICES_MODULE_ID, townSeats } from "../core2/modules/offices";
import {
  LEGISLATURE_MODULE_ID,
  absenceCarries,
  askPrice,
  billOf,
  declinedAsks,
  bodyRow,
  deskPassage,
  favorWorth,
  floorDateOf,
  memberPosition,
  signOnRecord,
  votesOn,
  type StudyRow,
} from "../core2/modules/legislature";
import {
  MEETINGS_MODULE_ID,
  type DebateRow,
  type TownHallRow,
} from "../core2/modules/meetings";
import {
  VIEWS_MODULE_ID,
  stanceRow,
  stancesOf,
  viewOf,
  viewOn,
} from "../core2/modules/views";
import { addDays, daysBetweenText, makeIsoDate } from "../core2/kernel/dates";
import { dayAhead, inNextMonth } from "../english/day-words";
import { P } from "../core2/parameters";
import { dayParts, sceneMinute } from "./day-part";
import {
  corePlaceByJurisdictionId,
  coreStateKeyOfJurisdictionId,
  coreStateName,
} from "../core2/place-lookup";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { tieHoursBetween } from "../core2/closeness";
import type { CoreState, PersonId } from "../core2/types";
import {
  billNameFor,
  billNameOf,
  billTitleOf,
  billTitleSaid,
  spokenDesignation,
} from "../english/bill-names";
import { areaName } from "../english/area-names";
import {
  NAMED_QUESTIONS,
  questionAbout,
  questionSaid,
} from "../english/question-names";
import { floorDebateFacts } from "./floor-debate-facts";
import { lossExpectationFacts, raceTurnoutFacts } from "./race-turnout-facts";
import { DONOR_ASK_TYPE, donorAskFacts } from "./donor-ask-facts";
import {
  causeTopicSaid,
  questionSubject,
  questionTopic,
  storyTopicName,
} from "../english/policy-names";
import { dollars } from "../english/bill-sections";
import { lateSaid, moneySaid, monthsOfRentDays } from "../english/count-words";
import { NOTICE_SERVED_EVENT, dwellingTenure } from "../core2/modules/housing";
import {
  NEWS_MODULE_ID,
  NEWS_READ,
  storyOfReadEvent,
  type Story,
} from "../core2/modules/news";
import { MOVED_AWAY_EVENT, departureOf } from "../core2/modules/moves";
import { disasterSaid, homeSaid } from "../english/disaster-words";
import { jobSaid, seatSaid, withArticle } from "../english/journal-words";
import { causeGroupName } from "../english/group-names";
import { contractSaid } from "../english/contract-words";
import {
  JOBS_MODULE_ID,
  JOB_OFFERED_EVENT,
  jobById,
  staffCount,
} from "../core2/modules/jobs";
import conversationRules from "./data/conversation-rules.json" with { type: "json" };
import type { Director } from "./ledger";
import { knockFacts, petitionAtDoor } from "./doors";
import { officeSaid, raceMemberTitle } from "./cause-facts";
import { officeInSentence, workHeld } from "../core2/person-work";
import {
  SITUATION_LIBRARY,
  type ScheduleEntry,
  type SituationType,
} from "./scheduling";
import type { Moment } from "./types";
import { beatenRunnerUp } from "../core2/modules/voting";
import {
  SERVE_ASKED_EVENT,
  leanIfHedged,
  promiseWorth,
  serveAsk,
  type ServeGrounds,
} from "../core2/modules/serve-asks";
import {
  composeSceneTalk,
  lastAnswerAlong,
  playedNode,
  type AskStanding,
  type PurposeType,
  type SceneTalk,
  type TreeNode,
  type TreeReply,
} from "./scene-talk";
import type { Fact } from "../english/scene-talk-words";
import { bargainFacts } from "./bargain-facts";
import { voteStandFacts } from "./vote-stand-facts";
import { custodyFacts } from "./custody-facts";
import { meetingFacts } from "./meeting-facts";
import { letterFacts } from "./letter-facts";
import { celebrationFacts } from "./celebration-facts";
import { careFacts } from "./care-facts";
import { moveInFacts } from "./move-in-facts";
import { gatheringFacts } from "./gathering-facts";
import { rescueFacts } from "./rescue-facts";
import { birthFacts } from "./birth-facts";
import { constituentFacts } from "./constituent-help-facts";
import { CASES_MODULE_ID, handleCase } from "../core2/modules/offices";
import purposeArcs from "./data/purpose-arcs.json" with { type: "json" };
import {
  OFFICE_DAY_MODULE_ID,
  decideDesk,
  deskWaiting,
  pledgeToCome,
} from "../core2/modules/office-day";
import {
  chooseVariant,
  favorsGiven,
  hasArcFor,
  type VariantChoice,
} from "./arc-variant";
import { promiseReplyFacts } from "./promises";

/** A state's key begins with its country (`US-KY`); the rest is its USPS code. */
const STATE_KEY_PREFIX = "US-";

/** The moves engine's basis for a move to somewhere else in the same state. */
const STATE_BASIS = "state";

/** The levels of a place's own governments: its city, its town or township, its county. */
const LOCAL_GOVERNMENTS: ReadonlySet<string> = new Set([
  "city",
  "township",
  "county",
]);

/**
 * A seat as the party's chair says it: a seat on a body ("a seat on the
 * council"), or a single office ("the mayor's office"), from the one place
 * that words seats.
 */
function seatPhrase(office: {
  readonly title: string;
  readonly seats?: number;
  readonly bodyName?: string;
}): string {
  const said = seatSaid(office);
  return said.startsWith("the ") ? `a seat on ${said}` : `the ${said}'s office`;
}

/** The public-action engine's record of a rally forming (`civic.rally`). */
const RALLY_EVENT = "civic.rally";
/** The disasters engine's record of a damaged home's household told what the aid and repairs came to (`HOME_DAMAGED_EVENT`, disasters.ts). */
const HOME_DAMAGED_EVENT = "disaster.home-damaged";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  incumbentOf,
  openContests,
  partyTie,
  petitionOf,
} from "../core2/modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  CANVASS_MESSAGE_KIND,
  RIVAL_WORD_EVENT,
  enlistVolunteer,
  rivalWordMoved,
  type CauseRow,
} from "../core2/modules/campaigns";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import {
  outletsHere,
  PRESS_MODULE_ID,
  townOutlet,
  PRESS_STORY_EVENT,
  PRESS_EXPOSED,
  exposedFinding,
} from "../core2/modules/press";
import { relationFacts, tieSide } from "./relation-facts";
import lineNames from "../core2/data/budgets/line-names.json" with { type: "json" };
import { stakeOf } from "./family-stake";
import { remarkOf } from "./remark";
import { counterFilingReplyId } from "./filing-visit";
import {
  numberWord,
  organizationName,
  spoken,
  spokenDate,
  stateInSentence,
} from "./words";
import {
  learnView,
  learnViewQuestion,
  strongestQuestion,
  viewReason,
  viewRecordId,
} from "./view-learned";
import { giveInauguralAddress, inauguralStand } from "./inaugural-address";
import {
  ADDRESS_KEEPS,
  OATH_KEEPS,
  meetOfficiant,
  outgoingHolder,
  swornOffice,
  titleInSentence,
} from "./swearing-in";

/** How a rival's message reached the one who passed word of it on, by the message record's kind: the word each opener is placed by (`how-canvass`, `how-message`); a world candidate's campaign sends only these (the player's own bought ads and mail are never a rival's word). */
const HOW_WORD_REACHED: Readonly<Record<string, string>> = {
  [CANVASS_MESSAGE_KIND]: "canvass",
  "campaign-message": "message",
};

export interface PurposeScene {
  typeKey: string;
  /**
   * Which of the moment's exchanges this is: the type's key, or for a bill the
   * day's sitting took in, the key and that bill's record (`type|causeId`).
   * The player's replies name it, and the moment counts it answered.
   */
  unit?: string;
  purpose: string;
  askerId: PersonId;
  askedId: PersonId;
  /**
   * The player asks: `askedId` is still the player's seat,
   * and the reply kept is the colleague's answer, said by the colleague.
   */
  playerAsks?: boolean;
  /** Why it is happening: the record that fired it. */
  cause: {
    id: string;
    kind: string;
    label: string;
    date: string;
    facts: Readonly<Record<string, string>>;
  };
  /** What the exchange may say, each with the records it came from. */
  facts: { key: string; text: string; recordIds: string[] }[];
  /**
   * Which of the kind's arcs the records gave this scene (arc-variant.ts), with
   * every variant's score and the records the reads came from; absent for a
   * kind with one arc.
   */
  variant?: VariantChoice;
  talk: SceneTalk;
}

export type PurposeSceneResult =
  | { kind: "composed"; scene: PurposeScene }
  | { kind: "skipped"; reason: string };

const TYPES = new Map(
  SITUATION_LIBRARY.types.map((row) => [row.key, row as unknown]),
);

/**
 * The exchange for a scheduled moment whose situation type has a purpose, or
 * null when the moment has none. A moment may stage more than one such scene
 * (the clerk takes a filing; the household hears of it that evening): the
 * first the records can word is the one that plays, or the one `typeKey`
 * names. `includeHeld` is the grading view: it composes from the lines held
 * until the owner grades them, as the review page does; play leaves it off,
 * so a scene whose words are all held is skipped with why.
 */
export function purposeScene(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  options: {
    includeHeld?: boolean;
    typeKey?: string;
    /** The moment's next scene: the first the player has not answered. */
    next?: boolean;
  } = {},
): PurposeSceneResult | null {
  const book = director.ledger.people.get(personId);
  const moment = book?.momentsById.get(entry.momentId);
  if (!moment) return null;
  // Each scene the moment stages, and for a scene about one bill, each bill
  // the day's sitting took in (one sponsor asking about several bills in one
  // evening): each is its own exchange, about its own record.
  const units = entry.bindings.flatMap((binding) => {
    const type = TYPES.get(binding.typeKey) as
      (PurposeType & { repeatsBy?: string }) | undefined;
    if (!type?.purpose) return [];
    const joined =
      type.repeatsBy === "bill"
        ? (binding.joined ?? []).flatMap((row) => {
            const other = book!.momentsById.get(row.momentId);
            return other
              ? [{ unit: `${binding.typeKey}|${row.causeId}`, moment: other }]
              : [];
          })
        : [];
    return [{ unit: binding.typeKey, moment }, ...joined].map((row) => ({
      ...row,
      binding,
    }));
  });
  // Named, that scene; as the moment's next, the first the player has not
  // answered, so a record that stages several plays each in turn.
  const chosen = units.filter((row) =>
    options.typeKey
      ? row.unit === options.typeKey
      : !options.next || !entry.answered?.includes(row.unit),
  );
  let skipped: PurposeSceneResult | null = null;
  for (const { unit, moment: about, binding } of chosen) {
    const result = composeBinding(core, director, personId, about, binding, {
      ...options,
      stopMinute: entry.stop?.at.minuteOfDay,
    });
    if (result.kind === "composed")
      return { kind: "composed", scene: { ...result.scene, unit } };
    skipped ??= result;
  }
  return skipped;
}

/** What the law-reaches facts read of a law row: where it is law, when it starts and ends, and its series. */
interface LawReachRow {
  readonly jurisdiction?: string;
  readonly effectiveDate?: string;
  readonly endDate?: string | null;
  readonly series?: string;
  readonly id?: string;
}

/**
 * The facts that say how a law reaches a reader it does not reach (Fable A,
 * Nov 13): `effective`, the day a law enacted but not yet in force takes
 * effect; else `lawstate` and `homestate`, when it is law in another state
 * than the reader's. Empty for a law in force where the reader lives.
 */
export function lawReachFacts(
  row: LawReachRow | null,
  homeStateKey: string | null,
  today: string,
  cite: { law: string[]; home: string[] },
  /** When play began, and whether a newer row of the law's series replaced this one. */
  play: { from: string; replaced: boolean },
): Record<string, Fact> {
  if (!row) return {};
  // Another state's law does not reach the reader, in force or not: said by
  // that state and the reader's own, never by a date that would sound as if
  // it will.
  const there = row.jurisdiction?.startsWith(STATE_KEY_PREFIX)
    ? coreStateName(row.jurisdiction.slice(STATE_KEY_PREFIX.length))
    : null;
  const here = homeStateKey
    ? coreStateName(homeStateKey.slice(STATE_KEY_PREFIX.length))
    : null;
  if (there && here && row.jurisdiction !== homeStateKey)
    return {
      lawstate: { text: stateInSentence(there), sourceRecordIds: cite.law },
      homestate: { text: stateInSentence(here), sourceRecordIds: cite.home },
    };
  // A law that is no longer in force: the day it ended, from its own row.
  // ("Struck down" is said only when a court's record ended it; no engine
  // writes one yet.)
  // It is said with what it was, so the line names the law.
  const about = row.series ? lawAbout(row.series) : null;
  // Raised only when it ended during play and nothing replaced it: a rate
  // that a newer rate took over, or one that ended before the game began, is
  // not something a resident talks about (Words lead, Nov 14). Proved only on
  // a staged end date until a repeal is played (stopgapId:
  // SG-DIRECTOR-law-ended-in-play-proved-on-staged-date).
  if (row.endDate && row.endDate <= today) {
    if (row.endDate < play.from || play.replaced) return {};
    return {
      ended: {
        text: spokenDate(row.endDate, today),
        sourceRecordIds: cite.law,
      },
      ...(about ? { about: { text: about, sourceRecordIds: cite.law } } : {}),
    };
  }
  if (row.effectiveDate && row.effectiveDate > today) {
    // What the law changes, by what it is, not by the number it sets: a tax
    // rate's law changes the tax ("the Social Security payroll tax").
    return {
      effective: {
        text: spokenDate(row.effectiveDate, today),
        sourceRecordIds: cite.law,
      },
      ...(about ? { about: { text: about, sourceRecordIds: cite.law } } : {}),
    };
  }
  return {};
}

/** What a law changes, by what it is, not by the number it sets: a tax rate's law changes the tax ("the Social Security payroll tax"). */
function lawAbout(series: string): string | null {
  const name = lawName(series);
  return name ? name.replace(/\btax rate$/, "tax") : null;
}

/** The state a person lives in (`US-IL`), from their place's record or, for someone placed only at their state's level, the state's own id. */
export function homeStateOf(placeId: string): string | null {
  return placeStateKey(placeId);
}

/** A law row of the laws engine by its id: where it is law and the day it takes effect. */
export function lawRow(
  core: Readonly<CoreState>,
  id: string,
): LawReachRow | null {
  if (!core.modules.has(LAWS_MODULE_ID)) return null;
  return (
    (coreAPI(core as CoreState)
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .get(id) as LawReachRow | undefined) ?? null
  );
}

/**
 * Where a move went, as people name the place: a town or county by its
 * jurisdiction; for a move to "somewhere in the state" (basis `state`, the
 * state the person already lives in), another part of the state, by its name
 * ("another part of Kentucky", "another part of the U.S. Virgin Islands").
 * Null for an id that names no place.
 */
export function destinationSaid(
  destinationId: string,
  basis: string,
): string | null {
  const stateKey = coreStateKeyOfJurisdictionId(destinationId);
  const name = stateKey
    ? coreStateName(stateKey.slice(STATE_KEY_PREFIX.length))
    : null;
  if (name && basis === STATE_BASIS)
    return `another part of ${stateInSentence(name)}`;
  const place = corePlaceByJurisdictionId(destinationId as never);
  if (place) return spoken(place);
  return name ? stateInSentence(name) : null;
}

/**
 * The type as its cause plays it: a cause may name its own `sceneKey`, which
 * tags the exchange's pieces in place of the type's key, so one purpose speaks
 * for each cause's own reason (the cause is matched by the moment's label).
 */
export function typeForCause(type: PurposeType, label: string): PurposeType {
  const causes = (type as { causes?: SituationType["causes"] }).causes;
  const sceneKey = causes?.find((row) => row.match?.label === label)?.sceneKey;
  return sceneKey ? { ...type, tag: { ...type.tag, key: sceneKey } } : type;
}

/**
 * A law's policy as a line names it, from its series ("the paid family
 * leave law"); null for a series no bank names (a state's average local
 * sales tax), whose stop then has nothing to tell.
 */
export function lawName(series: string): string | null {
  const topic = series.slice(series.lastIndexOf(":") + P.one);
  // The spoken noun the talks and speeches say a measure by ("a higher
  // minimum wage"), never the catalog's verb phrase ("raise minimum wage");
  // a question with no noun name has no name, and its scene is not offered.
  // A series a law row keeps by its bare key (a local body's authority) is
  // the catalog question that ends in it.
  const question = NAMED_QUESTIONS.find((key) => key.endsWith(`.${series}`));
  return (
    questionAbout(series) ??
    (question ? questionAbout(question) : null) ??
    storyTopicName(topic)
  );
}

/**
 * What a cause record that names a law says of it (a story that the law took
 * effect, a person's learning what it changed): its policy by name, whether
 * the laws engine keeps it in force where the reader lives, and, when it does
 * not reach the reader, why.
 */
export function lawFactsOfCause(
  core: Readonly<CoreState>,
  said: Readonly<Record<string, string>>,
  causeId: string,
  readerPlaceId: string,
  readerId: string,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const moment = { causeId };
  const asker = { placeId: readerPlaceId };
  const askerId = readerId;
  // A law in force (a story that it took effect): its policy by name, for
  // the lines that say what took effect.
  // A learned effect names its law row only (`law.effect-learned` carries a
  // lawId and no series), so the series is the law row's own; reading only
  // the record's series left every learned-law scene without `law` and
  // `in-force`, and the tell could not be worded.
  const lawRowOfSaid = said.lawId
    ? lawRow(core, said.lawId.replace(/^law-history:/, ""))
    : null;
  const series = said.series ?? lawRowOfSaid?.series;
  if (said.lawId && series) {
    const name = lawName(series);
    if (name)
      facts.law = {
        text: name,
        sourceRecordIds: [said.lawId, moment.causeId],
      };
    // Still in force today, by the laws engine's own answer: the lines that
    // say the law took effect and is lived with need it (a street stop about
    // a state law with no local bill number had none to say, Mount Horeb,
    // Wisconsin, seed 16ca82ba-0487-44a2-96ee-c5231d4e0ab4).
    const answer = core.modules.has(LAWS_MODULE_ID)
      ? lawInForce(coreAPI(core as CoreState), series)
      : undefined;
    // A story of a law's history names the law row it keeps
    // (`law-history:<law row id>`, past-module): a state law in force from
    // before the opening (Kansas's local sales tax, seed 2d5c12bd...).
    const lawRowId = said.lawId.replace(/^law-history:/, "");
    const kept = answer?.levels.find(
      (level) => level.row?.id === lawRowId && !level.setAside,
    );
    if (kept)
      facts["in-force"] = {
        text: "yes",
        sourceRecordIds: [said.lawId, moment.causeId],
      };
    // A law that does not reach the reader is said as what it is (Fable A,
    // Nov 13): one enacted but not yet in force by the day it takes effect;
    // one in force in another state by that state and the reader's own. Only
    // a law in force where the reader lives is spoken of as lived with.
    if (!kept)
      Object.assign(
        facts,
        lawReachFacts(
          lawRow(core, lawRowId),
          homeStateOf(asker.placeId),
          core.date,
          { law: [lawRowId, moment.causeId], home: [asker.placeId, askerId] },
          {
            from: gameStartDate(),
            replaced: (answer?.levels ?? []).some(
              (level) => level.row && !level.setAside,
            ),
          },
        ),
      );
  }
  return facts;
}

/** One purpose scene of a moment, worded from its records. */
function composeBinding(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  moment: Moment,
  binding: ScheduleEntry["bindings"][number],
  options: { includeHeld?: boolean; stopMinute?: number },
): PurposeSceneResult {
  const type = typeForCause(
    TYPES.get(binding.typeKey) as PurposeType,
    moment.label,
  );
  const cast = (role: string | undefined) =>
    binding.roles.find((row) => row.role === role)?.personIds[P.zero];
  const askerId = cast(type.asker);
  const askedId = cast(type.asked) ?? personId;
  if (!askerId)
    return { kind: "skipped", reason: `no ${type.asker} on record` };
  // Every person the scene names goes through the one said-as reader with
  // the scene's telling (words composer, part 2): by role and name the first
  // time, shorter after. The scene's own cause record names them, so the
  // listener has been told who they are.
  const telling = tellingOf({ speakerId: askerId, listenerId: askedId });
  const sayPerson = (person: { id: string }) =>
    saidAs(telling, {
      ...saidPersonOf(core, person.id, telling),
      knownToListener: true,
    });
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker || !asked)
    return { kind: "skipped", reason: "the cast is not on record" };

  const record = core.durableLog.get(moment.causeId);
  const said = (record?.facts ?? {}) as Readonly<Record<string, string>>;
  const facts: Record<string, Fact> = {
    name: {
      text: sayPerson(asker),
      sourceRecordIds: [askerId],
    },
    first: { text: asked.givenName, sourceRecordIds: [askedId] },
  };
  const town = corePlaceByJurisdictionId(asked.placeId as never);
  if (town)
    facts.place = { text: spoken(town), sourceRecordIds: [asked.placeId] };
  // What the cause record is about (a shared cause, a speech): a policy
  // question, a budget line or an illness, as the English engine names it.
  const cause = record?.topic ? causeTopicSaid(record.topic) : null;
  if (cause) facts.cause = { text: cause, sourceRecordIds: [moment.causeId] };
  // A bill the record names, by its number, and the section a trade added.
  // A committee's hold names its bill by id only; the bill row has the number.
  // A public comment heard at a hearing names its bill through the
  // meetings engine's remark, with the side the speaker took.
  const remark = remarkOf(core, moment.causeId);
  if (remark && remark.position !== P.zero)
    facts[remark.position > P.zero ? "spoke-for" : "spoke-against"] = {
      text: "yes",
      sourceRecordIds: [remark.id, moment.causeId],
    };
  // What a paper found when it exposed the asked person (press.ts exposedFinding):
  // the bill a bribe bought a vote on is the scene's bill.
  const exposed =
    record?.kind === PRESS_EXPOSED
      ? exposedFinding(coreAPI(core as CoreState), said)
      : null;
  const billId = said.billId ?? remark?.billId ?? exposed?.billId;
  const named =
    billId && core.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(coreAPI(core as CoreState), billId)
      : undefined;
  const number = said.number ?? named?.number;
  if (number) {
    // Said as a clerk reads it: a bare number takes its form's word first.
    facts.bill = {
      text: spokenDesignation(number, named?.form.kind ?? ""),
      sourceRecordIds: [billId ?? moment.causeId, moment.causeId],
    };
  }
  // A bill that cuts: a budget line taken down or a law repealed, from its own
  // sections, so nobody asks why it cuts a program when it raises a fee.
  if (
    named?.provisions.some(
      (row) => row.repeal || (row.kind === "budget-line" && row.value < P.zero),
    )
  )
    facts["bill-cuts"] = { text: "yes", sourceRecordIds: [named.id] };
  // When the bill comes to a vote, from its own record, so a promise of
  // time fits the calendar: on the day of the vote it is "tonight"; before
  // it, a count is promised for the day before the vote, never a day after
  // it (Fable A, Nov 13, rule 22; P3: "I'll have a real count by Friday" on
  // the morning of the vote).
  const floor =
    billId && named ? floorDateOf(coreAPI(core as CoreState), billId) : null;
  if (floor && daysBetweenText(core.date, floor) === P.zero)
    facts["vote-tonight"] = { text: "yes", sourceRecordIds: [billId!] };
  else if (floor) {
    const countBy = dayAhead(addDays(makeIsoDate(floor), -P.one), core.date);
    if (countBy)
      facts["count-by"] = { text: countBy, sourceRecordIds: [billId!] };
    // "Next month" is said only when the vote falls in the month after the
    // scene's; any other day is said from the record (Fable A, rule 22).
    if (inNextMonth(floor, core.date))
      facts["vote-next-month"] = { text: "yes", sourceRecordIds: [billId!] };
    else {
      const voteOn = dayAhead(floor, core.date);
      if (voteOn)
        facts["vote-on"] = { text: voteOn, sourceRecordIds: [billId!] };
    }
  }
  Object.assign(
    facts,
    lawFactsOfCause(core, said, moment.causeId, asker.placeId, askerId),
  );
  // A law in force that a bill enacted (a story that it took effect): the
  // bill by its number, cited to the law and the bill.
  if (!said.number && said.lawId && said.enactedBy) {
    const bill = core.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(coreAPI(core as CoreState), said.enactedBy)
      : undefined;
    if (bill?.number)
      facts.bill = {
        text: spokenDesignation(bill.number, bill.form.kind),
        sourceRecordIds: [bill.id, said.lawId, moment.causeId],
      };
  }
  // What the asked person did on the cause's bill (or the bill that enacted
  // its law) and why, from their row of the roll (vote-stand-facts.ts), so no
  // line says the opposite of the vote and a "why" is answered by a reason
  // the record holds.
  const votedOn = billId ?? said.enactedBy;
  if (votedOn) voteStandFacts(core, facts, votedOn, askedId, moment.causeId);
  // The chair a committee's hold names, for a member who is asked to press them.
  const chair = said.chair
    ? core.people.get(said.chair as PersonId)
    : undefined;
  if (chair && chair.id !== askedId)
    facts.chair = {
      text: sayPerson(chair),
      sourceRecordIds: [moment.causeId, chair.id],
    };
  // An executive's ask to carry their bill (legislature.ts askToCarry): the
  // lines about a bill its asker can't introduce need it.
  if (record?.kind === "carry-asked" && said.byExecutive === "yes")
    facts["carry-ask"] = {
      text: said.askerId ?? "",
      sourceRecordIds: [moment.causeId],
    };
  // An ask to carry a bill the member turned down has no number yet: the
  // bill goes by its name, from the policy the ask was for.
  if (record?.kind === "carry-asked" && !said.number && said.question) {
    const name = billNameFor(
      said.question,
      said.formKind ?? "",
      said.direction === "repeal",
    );
    if (name)
      facts.bill = {
        text: `the ${name.title}`,
        sourceRecordIds: [moment.causeId],
      };
  }
  // The player's ask of a colleague to sign on to their bill (legislature.ts
  // askToSignOn): the bill said by what it does, the reason the colleague
  // would give for a no (never a deal, a lobby or a bribe), and whether the
  // player asked them before and was turned down.
  if (record?.kind === "sign-on-asked" && said.billId && named) {
    const api = coreAPI(core as CoreState);
    const [asked] = named.provisions;
    const subject = asked?.question ? questionSaid(asked.question) : null;
    if (subject)
      facts.said = {
        text: subject,
        sourceRecordIds: [named.id, moment.causeId],
      };
    const position = memberPosition(api, named.id, askerId);
    const past = signOnRecord(api, askerId, named);
    // The reason a colleague says aloud: the part of their position that
    // weighs most against the bill among those a colleague names (their
    // views, the people they represent, their party's leaders), or holding to
    // a past stand where a past no vote on the question is on the record.
    // Temperament, a wing, a deal or a lobby are never said; a no they alone
    // carry is said as the member's own view.
    const sayable = [
      { name: "views", value: position.views },
      { name: "constituents", value: position.constituents },
      { name: "party", value: position.party ?? P.zero },
      ...(past.votedAgainst
        ? [{ name: "consistency", value: position.consistency }]
        : []),
    ];
    const [worst] = sayable
      .filter((row) => row.value < P.zero)
      .sort((a, b) => a.value - b.value);
    const reason = worst?.name ?? "views";
    facts[`no-${reason}`] = {
      text: "yes",
      sourceRecordIds: [named.id, moment.causeId],
    };
    // A past no vote is said only where the record holds it.
    if (past.votedAgainst)
      facts["voted-against-before"] = {
        text: "yes",
        sourceRecordIds: [past.votedAgainst, moment.causeId],
      };
    // Turned down before on the same question, on an earlier bill.
    const [section] = named.provisions;
    const question = section?.question;
    const before = declinedAsks(
      api,
      askedId,
      askerId,
      named.bodyOfficeId,
      "sign-on",
    ).filter(
      (row) =>
        row.billId !== named.id &&
        row.provisions.some((other) => other.question === question),
    );
    if (before.length)
      facts["asked-before"] = {
        text: "yes",
        sourceRecordIds: [before.at(-P.one)!.id, moment.causeId],
      };
  }
  // A job offer (jobs.ts offerToPlayer): the employer, the position with its
  // article, the pay offered by the hour and the day the offer lapses.
  if (record?.kind === JOB_OFFERED_EVENT && said.organizationId) {
    const org = core.organizations.get(said.organizationId);
    const ids = [moment.causeId, said.organizationId];
    if (org)
      facts.employer = { text: organizationName(org), sourceRecordIds: ids };
    if (said.title)
      facts.position = { text: withArticle(said.title), sourceRecordIds: ids };
    if (Number(said.hourlyMinor) > P.zero)
      facts.pay = {
        text: dollars(Number(said.hourlyMinor)),
        sourceRecordIds: ids,
      };
    if (said.deadline)
      facts.deadline = {
        text: spokenDate(said.deadline, core.date),
        sourceRecordIds: ids,
      };
    // What the work is beyond the title and pay, from the opening's own row
    // (words-job-offer-answer-repeats-title-and-pay): the weekly hours of the job
    // it was modeled on, who held it before when it replaces someone, and how
    // many people work there now. Each is said only when the record holds it.
    const jobs = core.modules.has(JOBS_MODULE_ID)
      ? coreAPI(core as CoreState).moduleState(JOBS_MODULE_ID)
      : undefined;
    const offer = said.offerId
      ? (jobs?.table("offers").get(said.offerId) as
          { positionId?: string } | undefined)
      : undefined;
    const position = offer?.positionId
      ? (jobs?.table("positions").get(offer.positionId) as
          | {
              id: string;
              templateJobId?: string;
              replacesPersonId?: string;
            }
          | undefined)
      : undefined;
    if (position) {
      const at = [moment.causeId, position.id];
      const api = coreAPI(core as CoreState);
      // Full people's jobs and counted workers' by one rule (two tiers).
      const template = position.templateJobId
        ? jobById(api, position.templateJobId)
        : undefined;
      // A job's hours are kept as a calendar day's share of the week; people
      // say the week ("40 hours a week").
      if (template && template.hoursDaily > P.zero)
        facts.hours = {
          text: String(
            Math.round(template.hoursDaily * api.parameter("daysPerWeek")),
          ),
          sourceRecordIds: [...at, template.id],
        };
      const before = position.replacesPersonId
        ? core.people.get(position.replacesPersonId as PersonId)
        : undefined;
      if (before)
        facts.replaced = {
          text: sayPerson(before),
          sourceRecordIds: [...at, before.id],
        };
      const crew = Math.round(staffCount(api, said.organizationId));
      if (crew > P.one)
        facts.crew = {
          text: String(crew),
          sourceRecordIds: [...at, said.organizationId],
        };
    }
  }
  // A notice to pay or leave (housing.ts): what the household owes as people
  // say it ("about $400"), how long it has gone unpaid, whether the shortfall
  // is small or deep against the rent, and the day it must pay by. The lines
  // are worded to fit all of it (owner, Nov 8 playtest: "that far behind" of
  // a $14 shortfall).
  if (record?.kind === NOTICE_SERVED_EVENT) {
    const ids = [moment.causeId, said.caseId ?? moment.causeId];
    const owed = Number(said.owedMinor);
    const rent = Number(said.rentMinor);
    if (owed > P.zero) {
      facts.owed = { text: moneySaid(owed), sourceRecordIds: ids };
      if (rent > P.zero) {
        const months = owed / rent;
        // stopgapId: SG-WORDS-notice-shortfall-bands
        const gap = rulesFile.noticeShortfall;
        if (months < gap.littleBelow.value)
          facts["short-little"] = { text: "yes", sourceRecordIds: ids };
        else if (months >= gap.deepFrom.value)
          facts["short-deep"] = { text: "yes", sourceRecordIds: ids };
      }
    }
    // How long behind: the days since the first missed payment, or the
    // months of rent owed where that is longer (two rents missed is two
    // months behind, however recent the first of them).
    const behind = Math.max(
      said.unpaidSince
        ? daysBetweenText(said.unpaidSince, record.date)
        : P.zero,
      rent > P.zero && owed > P.zero ? monthsOfRentDays(owed / rent) : P.zero,
    );
    if (behind > P.zero)
      facts.late = { text: lateSaid(behind), sourceRecordIds: ids };
    if (said.cureBy)
      facts.deadline = {
        text: spokenDate(said.cureBy, core.date),
        sourceRecordIds: ids,
      };
  }
  // A story someone in the household read (news.ts, `news.read`): what it was
  // about, as the catalog names it, and the paper that ran it. The lines name
  // the story; a story the catalog cannot name has no scene (the scene is
  // skipped, never worded as "something").
  const storyId =
    record?.kind === NEWS_READ ? storyOfReadEvent(record.id) : null;
  const about =
    storyId && record?.topic ? (questionAbout(record.topic) ?? cause) : null;
  if (storyId && about) {
    const story = core.modules.has(NEWS_MODULE_ID)
      ? (coreAPI(core as CoreState)
          .moduleState(NEWS_MODULE_ID)
          .table("stories")
          .get(storyId) as unknown as Story | undefined)
      : undefined;
    const cited = [moment.causeId, storyId];
    facts.story = { text: about, sourceRecordIds: cited };
    // A story that a law took effect says so: the lines can name the change.
    if (said.lawId)
      facts["took-effect"] = { text: "yes", sourceRecordIds: cited };
    const printer = story ? core.organizations.get(story.outletId) : undefined;
    if (printer)
      facts.outlet = {
        text: organizationName(printer),
        sourceRecordIds: [...cited, printer.id],
      };
  }
  // Someone the player knows who has moved away (moves.ts, `person.moved-away`):
  // where they went, who went with them, and why when the records name a
  // reason (the rows of `departureWhy`, stopgapId:
  // SG-WORDS-moving-goodbye-reason-rows); how they stood to the player.
  const departure =
    record?.kind === MOVED_AWAY_EVENT ? departureOf(record.facts) : null;
  if (departure) {
    const cited = [moment.causeId, departure.id];
    const where = destinationSaid(
      departure.destinationId,
      departure.destinationBasis,
    );
    if (where)
      facts.destination = {
        text: where,
        sourceRecordIds: [...cited, departure.destinationId],
      };
    const along = departure.withIds
      .filter((id) => id !== departure.personId && id !== askedId)
      .map((id) => core.people.get(id))
      .find((row) => row?.alive);
    if (along)
      facts.companion = {
        text: along.givenName,
        sourceRecordIds: [...cited, along.id],
      };
    if (asked.householdId === departure.householdId)
      facts["same-home"] = { text: asker.givenName, sourceRecordIds: cited };
    const why = rulesFile.departureWhy.rows.find((row) =>
      row.reason.startsWith("basis:")
        ? departure.destinationBasis === row.reason.slice("basis:".length)
        : (departure.reasons[row.reason] ?? P.zero) > P.zero,
    );
    if (why) {
      facts[why.fact] = { text: asker.givenName, sourceRecordIds: cited };
      // The questions about why are offered only when a record names a reason.
      facts["why-given"] = { text: asker.givenName, sourceRecordIds: cited };
    }
  }
  // A prison term (justice.ts): a person home from prison, a sentence handed
  // down or a person held before trial, with how long, the day they get out,
  // the bail, whether the term ended their job and the child at home, each
  // cited to the records it came from. stopgapId:
  // SG-WORDS-prison-visit-limits-fixed
  for (const [key, fact] of Object.entries(
    custodyFacts(core, record, askerId, askedId),
  ))
    facts[key] = fact;
  // A first meeting or a tie that grew (the jobs, school and parties engines'
  // records): the employer, the job, the school, the children at one school,
  // the party and the town the two share or do not. stopgapId:
  // SG-WORDS-meeting-no-club-records
  for (const [key, fact] of Object.entries(
    meetingFacts(core, binding.typeKey, moment.causeId, askerId, askedId),
  ))
    facts[key] = fact;
  // A letter from a relative elsewhere (kin-contact.ts's `family.contact`):
  // how long, where they live, what changed in their life and what the tie
  // records, each cited. stopgapId: SG-WORDS-letter-ask-unrecorded
  const placeNamed = (placeId: string) => destinationSaid(placeId, "");
  for (const [key, fact] of Object.entries(
    letterFacts(
      core,
      binding.typeKey,
      moment.causeId,
      askerId,
      askedId,
      placeNamed,
    ),
  ))
    facts[key] = fact;
  // A celebration (a wedding, a new job) and a family gathering with a
  // relative missing (`family.gathering-missed`): what is celebrated and whose
  // it is, who is missing and why the records say so, each cited. stopgapId:
  // SG-WORDS-celebration-ask-unrecorded, SG-WORDS-gathering-ask-unrecorded
  for (const [key, fact] of Object.entries({
    ...celebrationFacts(
      core,
      binding.typeKey,
      moment.causeId,
      moment.date,
      askerId,
      askedId,
      cast("honoree"),
      placeNamed,
    ),
    ...gatheringFacts(
      core,
      binding.typeKey,
      moment.causeId,
      askerId,
      askedId,
      placeNamed,
      (aId, bId) => tieSide(core, aId, bId)?.side === "rival",
    ),
    // A rescue (`health.rescued`): who got help, who was there to see it.
    // stopgapId: SG-WORDS-rescue-ask-unrecorded
    ...rescueFacts(core, binding.typeKey, moment.causeId, askerId, askedId),
    // A visit to someone seriously ill in town: the relative still to be told.
    ...careFacts(core, binding.typeKey, moment.causeId, askerId, askedId),
    // A partner's ask to live together: who would move, and the asked's kin.
    ...moveInFacts(core, binding.typeKey, moment.causeId, askerId, askedId),
    // A new baby (`person-birth`): the child's name, the other parent and the
    // visitor's town. stopgapId: SG-WORDS-new-baby-ask-unrecorded
    ...birthFacts(
      core,
      binding.typeKey,
      moment.causeId,
      askerId,
      askedId,
      placeNamed,
    ),
  }))
    facts[key] = fact;
  // A damaged home (disasters.ts, the day its aid is paid): the kind of home,
  // what the repairs cost and what the aid came to, each as people round a
  // sum, and what is still owed. The flags say which of the three ways the
  // money went: the aid covers the repairs, falls short of them, or the
  // repairs went unpaid. stopgapId: SG-STORY-home-damaged-cast
  if (record?.kind === HOME_DAMAGED_EVENT) {
    const ids = [moment.causeId, said.damagedId ?? moment.causeId];
    const bill = Number(said.repairsOwedMinor);
    const aid = Number(said.aidMinor);
    const left = Math.max(P.zero, bill - Number(said.repairsPaidMinor));
    const home = homeSaid(said.homeKind ?? "");
    if (home) facts.home = { text: home, sourceRecordIds: ids };
    const hit = disasterSaid(said.incidentType ?? "");
    if (hit) facts.disaster = { text: hit, sourceRecordIds: ids };
    if (bill > P.zero)
      facts.loss = { text: moneySaid(bill), sourceRecordIds: ids };
    if (aid > P.zero)
      facts.aid = { text: moneySaid(aid), sourceRecordIds: ids };
    if (left > P.zero)
      facts.left = { text: moneySaid(left), sourceRecordIds: ids };
    const flag = (key: string, on: boolean) => {
      if (on) facts[key] = { text: "yes", sourceRecordIds: ids };
    };
    flag("aid-covers", aid > P.zero && aid >= bill);
    flag("aid-short", aid > P.zero && aid < bill);
    flag("no-aid", aid <= P.zero);
    flag("unpaid", left > P.zero);
    flag("paid-up", bill > P.zero && left <= P.zero);
  }
  if (said.section)
    facts.section = { text: said.section, sourceRecordIds: [moment.causeId] };
  // A vote trade puts the holdout's own section in (legislature.ts adopt()):
  // the talk says it goes in, not that a section comes out.
  if (said.kind === "trade-amendment" && said.section)
    facts["section-added"] = {
      text: said.section,
      sourceRecordIds: [moment.causeId],
    };
  // A resident's problem from their case: the lines about that problem need it.
  if (said.problem)
    facts[`case-${said.problem}`] = {
      text: said.problem,
      sourceRecordIds: [moment.causeId],
    };
  // A town hall (meetings.ts holdTownHall): the question this resident stood up with,
  // and whether the host's answer to it agreed with the resident's own stand,
  // opposed it, or was not given.
  if (said.townHallId && core.modules.has(MEETINGS_MODULE_ID)) {
    const api = coreAPI(core as CoreState);
    const hall = api
      .moduleState(MEETINGS_MODULE_ID)
      .table("townHalls")
      .get(said.townHallId) as unknown as TownHallRow | undefined;
    const asking = hall?.questions.find((row) => row.askedBy === askerId);
    const issue = asking ? questionAbout(asking.question) : null;
    if (hall && asking && issue) {
      facts.issue = {
        text: issue,
        sourceRecordIds: [said.townHallId, moment.causeId],
      };
      const stand = hall.answers.find(
        (row) => row.question === asking.question,
      )?.position;
      const own = viewOn(
        api,
        askerId,
        asking.question,
        personLean(core.people, asker, P.zero),
      );
      const reading =
        stand === null || stand === undefined
          ? "host-declined"
          : stand * own < P.zero
            ? "host-opposed"
            : "host-agreed";
      facts[reading] = {
        text: reading,
        sourceRecordIds: [said.townHallId, askerId],
      };
    }
  }
  // A strike or protest in the town (public-action.ts): what it is over.
  // stopgapId: SG-WORDS-action-confront-town-hall-lines. The
  // official has given no answer yet, so the exchange opens as a town hall
  // does when the host declined to answer: the protester wants to hear where
  // they stand.
  if (said.actionId && said.question && record?.kind !== RALLY_EVENT) {
    const issue = questionAbout(said.question);
    if (issue) {
      facts.issue = {
        text: issue,
        sourceRecordIds: [said.actionId, moment.causeId],
      };
      facts["host-declined"] = {
        text: "host-declined",
        sourceRecordIds: [said.actionId, askedId, askerId],
      };
      // The crowd, said in the talk's own words: how many, and whether it is a
      // protest in the street or workers who walked out.
      const flag = record?.kind === "civic.strike" ? "strike" : "protest";
      facts[flag] = { text: "yes", sourceRecordIds: [said.actionId] };
      // A protest is held outside: the narration puts everyone in the street,
      // so the replies that belong to a meeting (a seat, a stay-after) are not
      // offered, and their outdoor twins are.
      if (flag === "protest")
        facts.outdoors = { text: "yes", sourceRecordIds: [said.actionId] };
      Object.assign(
        facts,
        turnoutFacts(turnoutOf(record?.facts?.turnout), said.actionId),
      );
    }
  }
  // A rally in the town (public-action.ts): the area the term read well in,
  // and how many came. It has no demand, so there is no issue to answer.
  if (said.actionId && record?.kind === RALLY_EVENT) {
    const area = said.area ? areaName(said.area) : null;
    if (area)
      facts.area = {
        text: area,
        sourceRecordIds: [said.actionId, moment.causeId],
      };
    facts.rally = { text: "yes", sourceRecordIds: [said.actionId] };
    Object.assign(
      facts,
      turnoutFacts(turnoutOf(record?.facts?.turnout), said.actionId),
    );
  }
  // What an offer asks in return (a vote, a contract): the lines about that
  // favor need it, and the thing itself is named so the one offering says
  // what they want (Words lead, Nov 14): the bill for a vote (`bill`, above),
  // the award for a contract by the work it pays for (`contract`). `wanted`
  // is whichever of the two the record names, for lines either side shares.
  if (said.favor) {
    facts[`favor-${said.favor}`] = {
      text: said.favor,
      sourceRecordIds: [moment.causeId],
    };
    if (said.favor === "contract")
      facts.contract = {
        text: contractSaid(said.contractLine ?? ""),
        sourceRecordIds: [moment.causeId, said.contractId ?? moment.causeId],
      };
    const wanted = said.favor === "vote" ? facts.bill : facts.contract;
    if (wanted) facts.wanted = wanted;
  }
  // The finding a reporter calls about (press.ts press.exposed): a bribe, by
  // who paid it and the vote or contract it bought; a conflict, by the award,
  // the firm and whose it is. The reporter says what the story says, not only
  // that there is one (owner, Nov 15). Every exposure ran after the reporter
  // dug through the paper trail (press.ts weighTip), so the papers are in hand:
  // a denial is a lie the reporter can show is one (`knows-truth`).
  if (exposed) {
    const cited = [moment.causeId, exposed.recordId];
    facts[`found-${exposed.found}`] = { text: "yes", sourceRecordIds: cited };
    facts["knows-truth"] = { text: "yes", sourceRecordIds: cited };
    // The paper holds the story for the official's comment until its next
    // print day (press.ts weighTip `runsOn`); the reporter says when it runs.
    const runsOn = said.runsOn ? dayAhead(said.runsOn, core.date) : null;
    if (runsOn)
      facts["runs-on"] = { text: runsOn, sourceRecordIds: [moment.causeId] };
    if (exposed.contractLine)
      facts.contract = {
        text: contractSaid(exposed.contractLine),
        sourceRecordIds: [...cited, exposed.contractId ?? exposed.recordId],
      };
    if (exposed.found === "bribe") {
      const wanted = facts.bill ?? facts.contract;
      if (wanted) facts.wanted = wanted;
    }
    const briber = core.people.get((exposed.briberId ?? "") as PersonId);
    if (briber) {
      facts.briber = {
        text: sayPerson(briber),
        sourceRecordIds: [...cited, briber.id],
      };
      // One who paid is family, or a friend by the tie's record: the player
      // can say they could not refuse them.
      const tie = tieSide(core, askedId, briber.id);
      if (asked.familyIds.has(briber.id) || tie?.side === "friend")
        facts["briber-close"] = {
          text: "yes",
          sourceRecordIds: [...cited, tie?.tieId ?? briber.id],
        };
      // The tip came from the one who paid (press.ts leakToReporter): the
      // papers the reporter holds are theirs.
      const tip = coreAPI(core as CoreState)
        .moduleState(PRESS_MODULE_ID)
        .table("tips")
        .get(exposed.recordId) as unknown as
        { readonly knowerId?: string } | undefined;
      if (tip?.knowerId === briber.id)
        facts["leak-from-briber"] = { text: "yes", sourceRecordIds: cited };
    }
    const firm = core.organizations.get(exposed.firmId ?? "");
    if (firm)
      facts.firm = {
        text: organizationName(firm),
        sourceRecordIds: [...cited, firm.id],
      };
    const owner = core.people.get((exposed.ownerId ?? "") as PersonId);
    if (exposed.ownFirm)
      facts["firm-yours"] = { text: "yes", sourceRecordIds: cited };
    else if (owner) {
      facts.relative = {
        text: sayPerson(owner),
        sourceRecordIds: [...cited, owner.id],
      };
      // The owner shares the asked person's home: the reporter says so, as
      // the player may not hold in mind who owns the firm.
      if (owner.householdId === asked.householdId)
        facts["relative-lives-with"] = {
          text: "yes",
          sourceRecordIds: [...cited, owner.id, asked.householdId],
        };
    }
  }
  // A printed story that runs against the person or their bill (press-desk.ts
  // recordNamed): the outlet that ran it, who wrote it, and what it is about.
  if (record?.kind === PRESS_STORY_EVENT) {
    const outlet = core.organizations.get(said.outletId ?? "");
    const cited = [moment.causeId, said.storyId ?? moment.causeId];
    if (outlet) {
      facts.outlet = {
        text: organizationName(outlet),
        sourceRecordIds: [...cited, outlet.id],
      };
      facts["press-story"] = facts.outlet;
    }
    const reporter = core.people.get((said.reporterId ?? "") as PersonId);
    if (reporter)
      facts.reporter = {
        text: sayPerson(reporter),
        sourceRecordIds: [...cited, reporter.id],
      };
    const bill =
      said.billId && core.modules.has(LEGISLATURE_MODULE_ID)
        ? billOf(coreAPI(core as CoreState), said.billId)
        : undefined;
    if (
      bill?.number &&
      said.sponsorId === askedId &&
      said.billFraming === "against"
    ) {
      facts.bill = {
        text: spokenDesignation(bill.number, bill.form.kind),
        sourceRecordIds: [bill.id, ...cited],
      };
      facts["about-bill"] = facts.bill;
    } else if (said.subjectId === askedId && said.subjectFraming === "against")
      facts["about-you"] = { text: asked.givenName, sourceRecordIds: cited };
  }
  // A bill the asked person just introduced (legislature.ts introduce): the
  // lines about an introduction need it.
  if (record?.kind === "office.introduced")
    facts.introduced = {
      text: said.number ?? "",
      sourceRecordIds: [moment.causeId, said.billId ?? moment.causeId],
    };
  // A bill the asked person signed, or stopped: a veto, a veto overridden
  // over it, or a bill held in committee (legislature.ts). A reporter asks
  // who wanted it signed, or stopped.
  const stopped =
    (record?.kind === "executive-action" && said.action === "vetoed") ||
    record?.kind === "veto-override" ||
    record?.kind === "bill-held-in-committee";
  if (stopped)
    facts["stopped-it"] = {
      text: said.number ?? "",
      sourceRecordIds: [moment.causeId, said.billId ?? moment.causeId],
    };
  if (record?.kind === "executive-action" && said.action === "signed")
    facts["signed-it"] = {
      text: said.number ?? "",
      sourceRecordIds: [moment.causeId, said.billId ?? moment.causeId],
    };
  // Signed or stopped, the asked person has acted on the bill: a line that
  // waits on their decision no longer fits (vote-stand-facts.ts says the same
  // of a vote).
  if (facts["signed-it"] || facts["stopped-it"])
    facts.acted ??= facts["signed-it"] ?? facts["stopped-it"]!;
  // A vote the asked person sat for (legislature.ts): the lines asked after
  // a vote need it, and which side they took, from their own vote record; a
  // member the roll shows on neither side has no side.
  if (record?.kind === "legislative-vote") {
    facts["vote-held"] = {
      text: said.number ?? "",
      sourceRecordIds: [moment.causeId],
    };
    const ownId = `office.voted:${said.billId ?? ""}:${askedId}`;
    const own = core.durableLog.get(ownId)?.facts?.vote;
    // The side is in the fact's name, so the bank's lines say it in words.
    if (own === "yes" || own === "no")
      facts[`voted-${own}`] = {
        text: said.number ?? "",
        sourceRecordIds: [moment.causeId, ownId],
      };
  }
  // A member's own vote (legislature.ts): the lines a group's lobbyist says
  // about it need which side the member took.
  if (
    record?.kind === "office.voted" &&
    (said.vote === "yes" || said.vote === "no")
  )
    facts[`voted-${said.vote}`] = {
      text: said.number ?? "",
      sourceRecordIds: [moment.causeId],
    };
  // The floor before the roll (legislature.ts recordFloorDebate): which side
  // the speaker rose for, and the bill.
  if (record?.kind === "floor-debate") {
    facts[said.forId === askerId ? "speaks-for" : "speaks-against"] = {
      text: said.number ?? "",
      sourceRecordIds: [moment.causeId, askerId],
    };
    floorDebateFacts(core, facts, said, moment.causeId, askerId);
  }
  // A study committee (legislature.ts referToStudy and reportStudy): who chairs
  // it (the asker), who else sits on it and the body that sent the bill; at its
  // report, what it found and whether the chair's speech to the body moved the
  // player's own stance on the question.
  if (
    (record?.kind === "study-formed" || record?.kind === "study-reported") &&
    said.studyId &&
    core.modules.has(LEGISLATURE_MODULE_ID)
  ) {
    const study = coreAPI(core as CoreState)
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("studies")
      .get(said.studyId) as unknown as StudyRow | undefined;
    if (study) {
      const cited = [moment.causeId, study.id];
      // Who chairs it: the asker. A committee another member chairs is not
      // worded yet (no played scene for it), so the scene is skipped there.
      if (study.chairId === askerId)
        facts["asker-chairs"] = {
          text: said.number ?? "",
          sourceRecordIds: [...cited, study.chairId],
        };
      // The members besides the two talking, by name: the answer to who else
      // sits on it.
      const others = study.memberIds
        .filter(
          (id) => id !== askerId && id !== askedId && id !== study.chairId,
        )
        .map((id) => core.people.get(id as PersonId))
        .filter((person) => !!person?.alive);
      if (others.length) {
        const names = others.map(
          (person) => `${person!.givenName} ${person!.familyName}`,
        );
        facts.members = {
          text:
            names.length === P.one
              ? names[P.zero]!
              : `${names.slice(P.zero, -P.one).join(", ")} and ${names.at(-P.one)}`,
          sourceRecordIds: [...cited, ...others.map((person) => person!.id)],
        };
      }
      // The body that sent the bill to study, by the name its office row
      // gives it ("City Council"), said after the article: "The {body} sent ...".
      const bodyName = (
        coreAPI(core as CoreState)
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(study.bodyOfficeId) as { bodyName?: string } | undefined
      )?.bodyName
        ?.trim()
        .replace(/^the\s+/i, "");
      if (bodyName)
        facts.body = {
          text: bodyName,
          sourceRecordIds: [...cited, study.bodyOfficeId],
        };
      if (study.report) {
        facts[
          study.report.finding > P.zero ? "finding-for" : "finding-against"
        ] = { text: said.number ?? "", sourceRecordIds: [...cited, study.id] };
        // The speech moved the player's stance on the question toward the
        // finding, by the stance record's own cause for that speech (a speaker
        // is not moved by their own).
        const stance =
          study.report.speechId && study.topic && askedId !== study.chairId
            ? stanceRow(coreAPI(core as CoreState), askedId, study.topic)
            : undefined;
        const cause = stance?.causes.find(
          (row) => row.eventId === study.report!.speechId,
        );
        if (stance && cause && cause.change > P.zero)
          facts[study.report.finding > P.zero ? "moved-for" : "moved-against"] =
            {
              text: said.number ?? "",
              sourceRecordIds: [...cited, study.report.speechId!, stance.id],
            };
      }
    }
  }
  // A witness at a committee's hearing (legislature.ts committeeStage): their
  // side on the bill and what it reaches in their own life, from the record's
  // lists (the job it binds, their lease or mortgage, a child at home, their
  // own age, or only a view), with what the bill does in words and whether the
  // player is its sponsor. The witness never says a figure about the world.
  if (record?.kind === "committee-hearing" && said.witnessIds) {
    const at = said.witnessIds.split(",").indexOf(askerId);
    const side = (said.witnessSides ?? "").split(",")[at];
    const life = (said.witnessLives ?? "").split(",")[at];
    const cited = [moment.causeId, askerId];
    if (side === "for" || side === "against")
      facts[`witness-${side}`] = { text: "yes", sourceRecordIds: cited };
    const lifeRecord = (said.witnessLifeRecords ?? "").split(",")[at] ?? "";
    if (life)
      facts[`life-${life}`] = {
        text: "yes",
        sourceRecordIds: lifeRecord ? [...cited, lifeRecord] : cited,
      };
    // The record that life rests on, worded where a person would name it:
    // the place they work, their child.
    const job = core.work.commitments.get(lifeRecord);
    const workplace = job
      ? core.organizations.get(job.organizationId)
      : undefined;
    if (workplace)
      facts["own-workplace"] = {
        text: organizationName(workplace),
        sourceRecordIds: [...cited, lifeRecord, workplace.id],
      };
    const child =
      life === "children-at-home"
        ? core.people.get(lifeRecord as PersonId)
        : undefined;
    if (child)
      facts["own-child"] = {
        text: child.givenName,
        sourceRecordIds: [...cited, child.id],
      };
    // The bill's area, so a line about a school, a doctor, a home or a raise
    // plays only on a bill about one.
    const area = {
      wage: "bill-wage",
      education: "bill-schools",
      "health-human-services": "bill-health",
      "housing-land-use": "bill-housing",
    }[said.area ?? ""];
    if (area) facts[area] = { text: "yes", sourceRecordIds: [moment.causeId] };
    // A witness who holds a job took time off from it to come.
    const working = [...(core.work.commitmentsByPerson.get(askerId) ?? [])]
      .map((id) => core.work.commitments.get(id))
      .find((row) => row && row.endsAt === undefined);
    if (working)
      facts["has-job"] = {
        text: "yes",
        sourceRecordIds: [...cited, working.id],
      };
    if (named?.sponsorId === askedId)
      facts["you-sponsor"] = { text: "yes", sourceRecordIds: [named.id] };
    const does = named ? billNameOf(named)?.purpose : undefined;
    if (does)
      facts["bill-does"] = {
        text: does,
        sourceRecordIds: [named!.id, moment.causeId],
      };
  }
  // A reporter cast for a record that names no outlet speaks for the outlet
  // that employs them, by its record.
  if (!facts.outlet && !said.outletId && core.modules.has(PRESS_MODULE_ID)) {
    const employer = outletsHere(coreAPI(core as CoreState)).find((row) =>
      row.reporterIds.includes(askerId),
    );
    const outlet = employer
      ? core.organizations.get(employer.organizationId)
      : undefined;
    if (outlet)
      facts.outlet = {
        text: organizationName(outlet),
        sourceRecordIds: [employer!.id, outlet.id],
      };
  }
  // An outlet any other cause names (an invitation to an interview or a
  // debate, an exposure), by name. The press names an outlet by its outlet
  // row (press.ts `outletId: outlet.id`), the meetings by its organization;
  // the row says which organization it is.
  if (record?.kind !== PRESS_STORY_EVENT && said.outletId) {
    const row = core.modules.has(PRESS_MODULE_ID)
      ? outletsHere(coreAPI(core as CoreState)).find(
          (o) => o.id === said.outletId,
        )
      : undefined;
    const outlet = core.organizations.get(row?.organizationId ?? said.outletId);
    // How the outlet carries the story decides how a reporter says when it
    // comes out (a paper runs it, a station airs it, a site puts it up).
    if (row)
      facts[`outlet-${row.kind}`] = {
        text: "yes",
        sourceRecordIds: [moment.causeId, row.id],
      };
    if (outlet)
      facts.outlet = {
        text: organizationName(outlet),
        sourceRecordIds: [moment.causeId, outlet.id],
      };
  }
  // A published interview the official answered only in part (press.ts
  // publish: the record's `declined` counts the questions left unanswered): a
  // reporter may ask the skipped ones again.
  if (record?.kind === "interview-published" && Number(said.declined) > P.zero)
    facts["skipped-some"] = {
      text: String(said.declined),
      sourceRecordIds: [moment.causeId],
    };
  // The race's debate the two candidates just stood in (meetings.ts
  // holdDebate): the lines said leaving the stage need it, and the first
  // question the two answered on opposite sides is what the rival brings up.
  if (record?.kind === "debate" && said.debateId) {
    facts.debate = { text: said.debateId, sourceRecordIds: [moment.causeId] };
    const debate = core.modules.has(MEETINGS_MODULE_ID)
      ? (coreAPI(core as CoreState)
          .moduleState(MEETINGS_MODULE_ID)
          .table("debates")
          .get(said.debateId) as unknown as DebateRow | undefined)
      : undefined;
    const theirs = debate?.answers[askerId] ?? [];
    const split = (debate?.answers[askedId] ?? []).find((mine) => {
      const other = theirs.find((row) => row.question === mine.question);
      return (
        mine.position !== null &&
        other?.position !== null &&
        other !== undefined &&
        mine.position * other.position! < P.zero
      );
    });
    // No split: a question the rival answered and the player passed on.
    const ducked = split
      ? undefined
      : (debate?.answers[askedId] ?? []).find(
          (mine) =>
            mine.position === null &&
            theirs.some(
              (row) => row.question === mine.question && row.position !== null,
            ),
        );
    const issue = split
      ? questionAbout(split.question)
      : ducked
        ? questionAbout(ducked.question)
        : null;
    if (issue && ducked) {
      facts.issue = {
        text: issue,
        sourceRecordIds: [said.debateId, moment.causeId],
      };
      facts["said-none"] = {
        text: "yes",
        sourceRecordIds: [
          said.debateId,
          ...(ducked.recordId ? [ducked.recordId] : []),
        ],
      };
    } else if (issue) {
      facts.issue = {
        text: issue,
        sourceRecordIds: [said.debateId, moment.causeId],
      };
      // Which side the player said on it on the stage, and which side the
      // rival said (the sitting's own fact names), so a line can throw the
      // answer back: "You said you're for it."
      const rivalSide = theirs.find((row) => row.question === split!.question);
      const sides = [
        [split!.position! > P.zero ? "said-for" : "said-against", split],
        [
          rivalSide!.position! > P.zero ? "rival-for" : "rival-against",
          rivalSide,
        ],
      ] as const;
      for (const [name, row] of sides)
        facts[name] = {
          text: "yes",
          sourceRecordIds: [
            said.debateId,
            ...(row?.recordId ? [row.recordId] : []),
          ],
        };
    }
  }
  // A donor's gift to the campaign (campaigns.ts recordGift): what they gave,
  // and the lines about a gift need it.
  if (record?.kind === "campaign-gift") {
    const gift = {
      text: dollars(Number(said.amountMinor)),
      sourceRecordIds: [moment.causeId],
    };
    facts.money = gift;
    facts.gift = gift;
    // The bill the donor holds the strongest view on, when one is pending.
    if (said.billId && facts.bill) facts["donor-bill"] = facts.bill;
  }
  // A donor's own reasons: their given name, where they work, what the bill
  // they named is about and which side of it they are on, each from the
  // records it came from (donor-ask-facts.ts).
  if (type.key === DONOR_ASK_TYPE)
    Object.assign(
      facts,
      donorAskFacts(
        core,
        askerId,
        moment.causeId,
        record?.kind === "campaign-gift" && facts["donor-bill"]
          ? said.billId
          : undefined,
        personLean,
      ),
    );
  // How the two stand, from the one reader (relation-facts.ts): the asked
  // person's family (`kin`), known people (`acquainted`, else `stranger`), and
  // which side of the tie they stand (`tie-friend`, `tie-rival`). A partner is
  // neither kin nor a stranger (Words lead's read of the move-in scene).
  const relation = relationFacts(core, askerId, askedId);
  if (relation.kin)
    facts.kin = { text: asker.givenName, sourceRecordIds: [askerId, askedId] };
  if (relation.acquainted)
    facts.acquainted = {
      text: asker.givenName,
      sourceRecordIds: [askerId, askedId],
    };
  else facts.stranger = { text: asker.givenName, sourceRecordIds: [askerId] };
  if (relation.side && relation.tieId)
    facts[`tie-${relation.side}`] = {
      text: asker.givenName,
      sourceRecordIds: [relation.tieId],
    };
  // What passed between them in an earlier scene, from its reply records: the
  // asker came before, and the asked person helped or refused then.
  const passed = relation.passed;
  if (passed.askedBefore.length)
    facts["asked-before"] = {
      text: asker.givenName,
      sourceRecordIds: passed.askedBefore,
    };
  if (passed.helpedBefore.length)
    facts["helped-before"] = {
      text: asker.givenName,
      sourceRecordIds: passed.helpedBefore,
    };
  if (passed.refusedBefore.length)
    facts["refused-before"] = {
      text: asker.givenName,
      sourceRecordIds: passed.refusedBefore,
    };
  // A committee trade coming due on the floor (legislature.ts
  // recordPromises): the member promised their vote, and the lines about a
  // promised vote need it.
  if (record?.kind === "vote-promise")
    facts["your-promise"] = {
      text: said.traded ?? "",
      sourceRecordIds: [moment.causeId],
    };
  // A bill that lost a vote (legislature.ts recordFailure): the lines about a
  // lost vote need it, where it lost, and the count, against and for (the
  // bank's lines say them in that order).
  if (record?.kind === "bill-failed") {
    const lost = { text: said.number ?? "", sourceRecordIds: [moment.causeId] };
    facts["bill-lost"] = lost;
    facts[said.stage === "committee" ? "lost-in-committee" : "lost-on-floor"] =
      lost;
    facts.nays = { text: said.no ?? "", sourceRecordIds: [moment.causeId] };
    facts.ayes = { text: said.yes ?? "", sourceRecordIds: [moment.causeId] };
  }
  // A candidate's campaign asking the player to endorse (the campaigns
  // engine's endorsement-asked record): the asker gives one reason, the
  // strongest the record holds, and only a favor names a deal.
  if (binding.typeKey === "endorsement-ask") {
    const cited = [moment.causeId];
    const reason = said.obligationId
      ? "reason-favor"
      : said.closeness === "close"
        ? "reason-tie-close"
        : "reason-tie-distant";
    facts[reason] = { text: "yes", sourceRecordIds: cited };
    if (said.endorsedAnother)
      facts["endorsed-other"] = { text: "yes", sourceRecordIds: cited };
    if (said.again)
      facts["asked-again"] = { text: "yes", sourceRecordIds: cited };
    if (said.contestId)
      Object.assign(facts, contestVoteDay(core, said.contestId));
  }
  if (said.office)
    facts.office = {
      // Where the body is named for its members the race is for that member
      // ("alderman"); else the record's title in a sentence.
      text:
        raceMemberTitle(core, said.contestId) ?? titleInSentence(said.office),
      sourceRecordIds: [
        moment.causeId,
        ...(said.contestId ? [said.contestId] : []),
      ],
    };
  // A rival in the race the record names, by name.
  const rival = said.rivalId
    ? core.people.get(said.rivalId as PersonId)
    : undefined;
  if (rival)
    facts.opponent = {
      text: sayPerson(rival),
      sourceRecordIds: [moment.causeId, rival.id],
    };
  // Word of a rival's message passed on: how it reached the teller, what it
  // argued (the subject and the rival's side of it) and how far it moved the
  // teller, each from the message's own record. Nothing here quotes it.
  if (record?.kind === RIVAL_WORD_EVENT && record.topic) {
    const how = HOW_WORD_REACHED[said.how ?? ""];
    if (how)
      facts[`how-${how}`] = {
        text: "yes",
        sourceRecordIds: [said.messageId ?? moment.causeId],
      };
    const issue = questionSaid(record.topic);
    if (issue) facts.issue = { text: issue, sourceRecordIds: [moment.causeId] };
    // What the question proposes, said whole ("civilian oversight of the
    // police"), for the line that says which side the rival is on.
    const about = questionAbout(record.topic);
    if (about) facts.about = { text: about, sourceRecordIds: [moment.causeId] };
    if (said.side === "for" || said.side === "against")
      facts[`side-${said.side}`] = {
        text: "yes",
        sourceRecordIds: [said.messageId ?? moment.causeId],
      };
    // The player's own stand on it, where the views engine keeps one.
    const own = core.modules.has(VIEWS_MODULE_ID)
      ? stanceRow(coreAPI(core as CoreState), askedId, record.topic)
      : undefined;
    if (own && own.strength > P.zero)
      facts["own-stand"] = {
        text: "yes",
        sourceRecordIds: [own.id, moment.causeId],
      };
    if (said.tellerId && said.messageId) {
      facts[
        `moved-${rivalWordMoved(coreAPI(core as CoreState), said.tellerId, said.messageId, record.topic)}`
      ] = { text: "yes", sourceRecordIds: [said.messageId, said.tellerId] };
    }
  }
  // A rival who runs under the candidate's own party label: a primary
  // challenge. The lines that call it one need both filings to say so.
  if (rival && said.contestId && core.modules.has(ELECTIONS_MODULE_ID)) {
    const filings = ballot(coreAPI(core as CoreState), said.contestId);
    const party = (id: string) =>
      filings.find((row) => row.personId === id)?.party ?? null;
    const theirs = party(rival.id);
    if (theirs && theirs === party(askedId))
      facts["same-party"] = {
        text: theirs,
        sourceRecordIds: [moment.causeId, said.filingId ?? moment.causeId],
      };
  }
  // A player who filed after others (the circumstance rival-known-late): the
  // candidates already on the contest's ballot, each said by what their
  // candidacy shows, the incumbent or the party they run under, cited to the
  // filings and the count of them.
  if (
    record?.kind === "candidate-filed" &&
    said.contestId &&
    core.modules.has(ELECTIONS_MODULE_ID)
  ) {
    const elections = coreAPI(core as CoreState);
    const incumbent = incumbentOf(elections, said.contestId);
    const earlier = ballot(elections, said.contestId)
      .filter((row) => row.personId !== askedId)
      .sort(
        (a, b) =>
          a.filedOn.localeCompare(b.filedOn) || a.id.localeCompare(b.id),
      );
    const said_ = earlier.flatMap((row) => {
      const person = core.people.get(row.personId as PersonId);
      if (!person) return [];
      const name = `${person.givenName} ${person.familyName}`;
      return [
        {
          row,
          name,
          // The incumbent is said as one; a party is never said before
          // every name (Fable A, Nov 13, rule 2).
          text:
            incumbent?.personId === row.personId ? `incumbent ${name}` : name,
        },
      ];
    });
    if (said_.length) {
      const cited = [moment.causeId, ...said_.map((row) => row.row.id)];
      // A list names three, then counts (Fable A, Nov 13, rule 2): up to
      // three by name; more, the first two and how many others.
      const named =
        said_.length > P.two + P.one
          ? [
              ...said_.slice(P.zero, P.two).map((row) => row.text),
              `${numberWord(said_.length - P.two)} others`,
            ]
          : said_.map((row) => row.text);
      const list =
        named.length === P.one
          ? named[P.zero]!
          : `${named.slice(P.zero, -P.one).join(", ")} and ${named.at(-P.one)!}`;
      facts["already-filed"] = {
        text: String(said_.length),
        sourceRecordIds: cited,
      };
      facts.rivals = { text: list, sourceRecordIds: cited };
      facts.opponent = {
        text: said_[P.zero]!.name,
        sourceRecordIds: [moment.causeId, said_[P.zero]!.row.id],
      };
      if (
        incumbent &&
        said_.some((row) => row.row.personId === incumbent.personId)
      )
        facts["rival-incumbent"] = {
          text: "yes",
          sourceRecordIds: [moment.causeId, incumbent.id],
        };
    }
  }
  // What the relative has at stake in the run or the lost race, from the
  // household's and the campaign's records (the cast rule chose them for it):
  // the lines about money, time or the part they played need it.
  const stake = type.stakes?.some((row) => row.startsWith("household-"))
    ? stakeOf(core, askedId, moment.causeId, askerId)
    : null;
  for (const [key, fact] of Object.entries(stake?.facts ?? {}))
    facts[key] = { text: fact.text, sourceRecordIds: fact.recordIds };
  // What the petition the filing opened asks (owner, Oct 28: filing is a
  // petition, signatures, the clerk's check, then the ballot): the
  // signatures and the day they are due, or that the office takes none.
  if (type.stakes?.includes("petition"))
    Object.assign(facts, petitionFacts(core, said.filingId));
  // In a race the asked lost, the winner is the opponent the scene may name.
  const winner = said.winnerId
    ? core.people.get(said.winnerId as PersonId)
    : undefined;
  if (winner && winner.id !== askedId)
    facts.opponent = {
      text: sayPerson(winner),
      sourceRecordIds: [moment.causeId, winner.id],
    };
  // In a race the asked won, the opponent is the one they beat: first among
  // those who missed the cut (in an at-large race the other winners were
  // seated too).
  if (winner?.id === askedId && !facts.opponent && said.totals) {
    const beaten = beatenRunnerUp(said, askedId);
    const runnerUp =
      beaten && core.people.has(beaten.id as PersonId) ? beaten.id : undefined;
    const other = runnerUp ? core.people.get(runnerUp as PersonId) : undefined;
    if (other)
      facts.opponent = {
        text: sayPerson(other),
        sourceRecordIds: [moment.causeId, other.id],
      };
  }
  // A race's result for the asked (the morning after): the lines for a
  // winner and for the one who lost differ.
  if (said.winnerId && said.contestId)
    facts[said.winnerId === askedId ? "won" : "lost"] = {
      text: "",
      sourceRecordIds: [moment.causeId],
    };
  // A count told by someone tied to a candidate: who won by name, and which of
  // the two ran (the record's people are the candidates), so a friend who lost
  // says it differently from a neighbor.
  if (record?.kind === "election-result" && winner)
    resultFacts(facts, record.personIds, winner, askerId, askedId, {
      id: moment.causeId,
    });
  // Who turned out, from the count's own rows: the winner's share of the
  // ballots, the share of the eligible who voted and the place that gave the
  // winner the biggest share.
  if (record?.kind === "election-result" && said.contestId) {
    Object.assign(facts, raceTurnoutFacts(core, said.contestId));
    Object.assign(facts, lossExpectationFacts(core, said.contestId, askedId));
  }
  // The winner's side of a count: how far ahead they finished, from the
  // result record's totals (votes, exact: a count is an integer): over the
  // first who missed the cut, so in an at-large race the margin of the cut.
  if (said.totals && said.winnerId === askedId) {
    const own =
      (JSON.parse(said.totals) as Record<string, number>)[askedId] ?? P.zero;
    const beaten = beatenRunnerUp(said, askedId);
    const counts = beaten ? [own, beaten.votes] : [own];
    const ahead = (counts[P.zero] ?? P.zero) - (counts[P.one] ?? P.zero);
    // The count; the bank's lines say "votes", or "one vote" for one.
    if (counts.length > P.one && ahead > P.zero) {
      facts.lead = {
        text: ahead.toLocaleString("en-US"),
        sourceRecordIds: [moment.causeId],
      };
      if (ahead === P.one)
        facts["lead-one"] = { text: "yes", sourceRecordIds: [moment.causeId] };
    }
    // A tie at the top, settled the way the state's law says (the elections
    // engine's tie record): by a drawing, or by the board or legislature
    // voting. Nobody finished ahead, so the lines say how it was settled.
    if (
      counts.length > P.one &&
      ahead === P.zero &&
      said.contestId &&
      core.modules.has(ELECTIONS_MODULE_ID)
    ) {
      const tieId = `tie:${said.contestId}`;
      const tie = coreAPI(core as CoreState)
        .moduleState(ELECTIONS_MODULE_ID)
        .table("ties")
        .get(tieId) as unknown as { method?: string } | undefined;
      const settled =
        tie?.method === "lot"
          ? "tied-lot"
          : tie?.method === "board-decides" ||
              tie?.method === "legislature-decides"
            ? "tied-vote"
            : null;
      if (settled)
        facts[settled] = {
          text: "yes",
          sourceRecordIds: [moment.causeId, tieId],
        };
    }
  }

  if (record?.kind === "budget-line-changed")
    cutFacts(core, facts, said, moment.causeId, askerId);
  if (record?.kind === "bill-presented")
    deskFacts(core, facts, said, moment.causeId, askerId);
  if (record?.kind === EMERGENCY_OFFERED)
    briefingFacts(core, facts, said, moment.causeId);

  // A recall petition names the member's vote; a promise to vote against
  // the bill (`promised-against`) is said only from a record of one, which no
  // engine writes yet. stopgapId: SG-WORDS-recall-promise-record

  // Joining a party: the party the record names, by its name.
  if (type.purpose === "party-welcome" && typeof said.party === "string") {
    facts.party = { text: said.party, sourceRecordIds: [moment.causeId] };
    // What the party holds and runs in this place, from the offices' terms and
    // the open races' filings: the leader's answer to "what do you do here".
    const api = coreAPI(core as CoreState);
    const named = said.party.toLowerCase();
    // A place whose own government is filed at the state level (it has no
    // city, township or county offices, as in the District of Columbia and the
    // territories) counts those offices as its local ones; read from the data.
    const seats = townSeats(api);
    const own = seats.some((row) => LOCAL_GOVERNMENTS.has(row.office.level))
      ? LOCAL_GOVERNMENTS
      : new Set([...LOCAL_GOVERNMENTS, "state"]);
    const held = seats.find(
      (row) =>
        own.has(row.office.level) &&
        (row.holder?.party?.toLowerCase() === named ||
          (row.holder?.personId
            ? partyTie(api, row.holder.personId)?.partyId === said.partyId
            : false)),
    );
    const race = openContests(api).find(
      (contest) =>
        own.has(contest.level) &&
        ballot(api, contest.id).some(
          (filing) => filing.party?.toLowerCase() === named,
        ),
    );
    // A race the party is running now is what its chair talks about; the seat
    // it holds is said when nothing is running.
    if (held && !race)
      facts["office-held"] = {
        text: seatPhrase(held.office),
        sourceRecordIds: [held.holder!.id],
      };
    if (race)
      facts["race-run"] = {
        text: race.title.toLowerCase(),
        sourceRecordIds: [race.id],
      };
    if (!held && !race)
      facts["party-holds-nothing"] = {
        text: "yes",
        sourceRecordIds: [moment.causeId],
      };
  }
  // Taking office (offices.ts): the office by its title in the offices
  // engine's rows, whatever wording the record carries (a contest's title, or
  // an office's id from a dev start); an executive office goes on to an
  // address, on a stand the speaker holds; the officiant is the one who held
  // the seat until today where the records say so; and who is in the room.
  const sworn = swornOffice(core, moment.causeId);
  if (sworn) {
    const ids = [moment.causeId, sworn.officeId];
    facts.office = { text: titleInSentence(sworn.title), sourceRecordIds: ids };
    if (sworn.givesAddress) {
      facts.address = { text: "", sourceRecordIds: ids };
      const stand = inauguralStand(core, askedId);
      if (stand)
        facts.stand = {
          text: stand.to,
          sourceRecordIds: [moment.causeId, askedId],
        };
    }
    if (outgoingHolder(core, sworn, askedId) === askerId)
      facts.outgoing = { text: "", sourceRecordIds: ids };
    const inRoom = (role: string) =>
      binding.roles.find((row) => row.role === role)?.personIds ?? [];
    if (inRoom("family").length)
      facts["family-here"] = {
        text: "",
        sourceRecordIds: [moment.causeId, ...inRoom("family")],
      };
    if (inRoom("colleagues").length)
      facts["colleagues-here"] = {
        text: "",
        sourceRecordIds: [moment.causeId, ...inRoom("colleagues")],
      };
  }

  // "Today" and "tonight" are true only on the record's own day, and
  // "yesterday" only the day after: a scene that plays later says neither.
  const recordDay = record?.date ?? moment.date;
  if (recordDay === core.date)
    facts["same-day"] = { text: "yes", sourceRecordIds: [moment.causeId] };
  else if (addDays(makeIsoDate(recordDay), P.one) === core.date)
    facts["day-after"] = { text: "yes", sourceRecordIds: [moment.causeId] };
  // The vote a count is for is "tomorrow" only the day before its floor
  // date and "today" on that day (the governing walk, Oct 29: "tomorrow" was
  // said on the vote day).
  const floorDate = record?.facts?.floorDate;
  if (floorDate === core.date)
    facts["vote-today"] = { text: "yes", sourceRecordIds: [moment.causeId] };
  else if (
    typeof floorDate === "string" &&
    addDays(makeIsoDate(core.date), P.one) === floorDate
  )
    facts["vote-tomorrow"] = {
      text: "yes",
      sourceRecordIds: [moment.causeId],
    };
  // "Morning." is said before noon, "this afternoon" is still ahead only in
  // the daytime, and "tonight" is true of the present only in the evening:
  // the hour is the player's clock as the scene plays.
  // The scene's narration opens at the same hour (scene.ts): the player's
  // clock, else the hour of the stop, else the start of the player's day, so
  // a line that fits only the evening never plays under "First thing on...".
  for (const mark of dayParts(
    sceneMinute(core, personId) ??
      options.stopMinute ??
      core.data.parameters.playerDayStartMinute!.value,
  ))
    facts[mark] = { text: "yes", sourceRecordIds: [moment.causeId] };

  const wording = options.includeHeld ? { includeHeld: true } : {};
  // A door on the player's own canvass: where the knock left the resident,
  // and the race the player asks them about.
  const door =
    type.playerAsks && moment.causeKind === "event:campaign.door"
      ? doorStanding(core, moment.causeId, askerId, type.purpose ?? "")
      : undefined;
  // Someone the player asked to serve: where the serve-asks engine read them.
  const serve =
    type.playerAsks && moment.causeKind === `event:${SERVE_ASKED_EVENT}`
      ? serveStanding(core, said, askerId)
      : undefined;
  const standing = door
    ? door.standing
    : serve
      ? serve.standing
      : type.playerAsks
        ? askStanding(core, said, askerId, askedId)
        : undefined;
  if (standing && !door && !serve && said.billId)
    bargainFacts(core, facts, said.billId, askerId, askedId, moment.causeId);
  if (type.playerAsks && !standing)
    return {
      kind: "skipped",
      reason:
        door === null
          ? "no race on record to ask about"
          : "no bill on record to ask about",
    };
  if (serve) {
    facts.name = {
      text: `${asker.givenName} ${asker.familyName}`,
      sourceRecordIds: [askerId],
    };
    facts.self = { text: asked.givenName, sourceRecordIds: [askedId] };
    // After the introduction the player says their first name, never the
    // full name again (Words lead, Nov 14).
    facts["their-first"] = {
      text: asker.givenName,
      sourceRecordIds: [askerId],
    };
    facts.office = {
      text: officeSaidAloud(
        serve.seat === "post" ? postTitleSaid(serve.office) : serve.office,
      ),
      sourceRecordIds: [moment.causeId, serve.askId],
    };
    // Why a no is a no: the term that weighed most against the ask, which
    // the answer gives as its reason (own-seat, own-race, apart, heard, stranger).
    // A yes gives its reason too, from the term that weighed most for it
    // (trust, step-up, agree, real-race).
    const why = [moment.causeId, serve.askId];
    if (serve.standing.lean <= P.zero)
      facts[`reason-${serve.reason}`] = { text: "yes", sourceRecordIds: why };
    else
      facts[`reason-yes-${serve.yesReason}`] = {
        text: "yes",
        sourceRecordIds: why,
      };
    // Near the player on their own question, by the same read the answer
    // weighed: the player can say so when asked why them.
    if ((serve.terms.question ?? P.zero) > P.zero)
      facts["near-on-issue"] = { text: "yes", sourceRecordIds: why };
    // Short of yes by less than the player's word is worth to them: they name
    // it as their price, for the proposal they hold (a read against one names
    // no price: promiseWorth, Words lead and Account lead, Nov 15 12:26Z).
    if (serve.priced) {
      facts["price-named"] = { text: "yes", sourceRecordIds: why };
      facts["price-side-for"] = { text: "yes", sourceRecordIds: why };
    }
    // Asked again after a no: a yes says what changed, as felt (Words lead,
    // Nov 14: the term that moved most since the no).
    if (serve.moved && serve.standing.lean > P.zero)
      facts[`changed-${serve.moved}`] = { text: "yes", sourceRecordIds: why };
    // A stranger is introduced to the player by their full name; the race
    // the player runs in is said from its contest record.
    facts["self-full"] = {
      text: `${asked.givenName} ${asked.familyName}`,
      sourceRecordIds: [askedId],
    };
    // A post the player appoints, not a place on their ticket: the lines
    // that speak of a ticket, a race or a ballot are held to the ticket.
    if (serve.seat === "post") {
      facts["serve-post"] = { text: "yes", sourceRecordIds: why };
      // A council or chamber still confirms whoever is named: a yes is not
      // yet the job (Words lead, Nov 14 19:15Z).
      if (serve.grounds.confirmed)
        facts.confirm = { text: "yes", sourceRecordIds: why };
      // Pay, from two different records: out of work, or a raise.
      // The work is a job in the played world or, for someone filled in from
      // elsewhere, their home town's work on their identity's record. The
      // person asked is the one who answers (`askerId`, serveStanding's
      // prospect); `askedId` is still the player's seat.
      const job = workHeld(core, askerId);
      if (!job) facts["out-of-work"] = { text: "yes", sourceRecordIds: why };
      else if ((serve.terms.pay ?? P.zero) > P.zero)
        facts["pay-raise"] = {
          text: "yes",
          sourceRecordIds: [...why, job.recordId],
        };
      // Their work is in the post's own field: the player can say they have
      // done the work, as the job they hold.
      if (job && serve.grounds.inField) {
        facts["post-field"] = {
          text: "yes",
          sourceRecordIds: [...why, job.recordId],
        };
        // An occupation group's plural name ("Registered Nurses") is not one
        // person's job, so it is not said.
        if (
          sayableJobTitle(job.title) &&
          !/[^su]s$/i.test(
            job.title.trim().split(/\s+/).at(P.negativeOne) ?? "",
          )
        )
          facts["their-office"] = {
            text: jobSaid(job.title),
            sourceRecordIds: [...why, job.recordId],
          };
      }
    }
    if (serve.raceOffice && serve.seat !== "post")
      facts["race-office"] = {
        text: officeSaidAloud(serve.raceOffice),
        sourceRecordIds: why,
      };
    // The player may say the race can be won only where their standing in it
    // weighs for them.
    if ((serve.terms.standing ?? P.zero) > P.zero)
      facts["standing-real"] = { text: "yes", sourceRecordIds: why };
    if (serve.grounds.seatEnds && serve.grounds.seatTermId)
      facts["their-term-ends"] = {
        text: "yes",
        sourceRecordIds: [...why, serve.grounds.seatTermId],
      };
    // The seat they would give up, as people say it.
    if (serve.grounds.seatTitle && serve.grounds.seatTermId)
      facts["their-office"] = {
        text: officeSaidAloud(serve.grounds.seatTitle),
        sourceRecordIds: [...why, serve.grounds.seatTermId],
      };
    // Where they read what was printed about the player: the outlet of the
    // newest scandal story they heard.
    const outlet = serve.grounds.storyOutletId
      ? core.organizations.get(serve.grounds.storyOutletId as never)?.name
      : undefined;
    if (outlet && serve.grounds.stories.length)
      facts.outlet = {
        text: outlet,
        sourceRecordIds: [...why, ...serve.grounds.stories],
      };
    // The question they hold most strongly, as the read found it.
    const issue = questionSaid(serve.question);
    if (issue)
      facts.issue = {
        text: issue,
        sourceRecordIds: [moment.causeId, serve.askId],
      };
    // A price names the proposal itself, so the player knows which way they
    // give their word (Words lead, Nov 15 10:35Z, rule 116), on the question
    // the ticket's office can decide (Account lead, Nov 15 10:45Z).
    const about =
      serve.priced && serve.grounds.priceQuestion
        ? questionAbout(serve.grounds.priceQuestion)
        : null;
    if (about)
      facts.about = {
        text: about,
        sourceRecordIds: [moment.causeId, serve.askId],
      };
  }
  if (door) {
    facts.name = {
      text: sayPerson(asker),
      sourceRecordIds: [askerId],
    };
    facts.self = { text: asked.givenName, sourceRecordIds: [askedId] };
    // The seat as people say it (Words lead, Nov 14, ruling 69): "the
    // Bethel Town Council", "mayor", never the form's title in a sentence.
    const seat = officeSaid(core, { contestId: door.contestId });
    facts.office = {
      text: seat?.text ?? titleInSentence(door.office),
      sourceRecordIds: [moment.causeId, door.contestId],
    };
    // The race's next vote as a day, and while the petition circulates the
    // day its signatures are due (Words lead, Nov 14, ruling 73: a line meets
    // the insert guard with a record that belongs in it).
    Object.assign(facts, contestVoteDay(core, door.contestId));
    if (door.filingId && core.modules.has(ELECTIONS_MODULE_ID)) {
      const petition = petitionOf(coreAPI(core as CoreState), door.filingId);
      if (petition && door.knock.petition === "true")
        facts.due = {
          text: spokenDate(petition.due, core.date),
          sourceRecordIds: [petition.id],
        };
    }
    // What matters to the resident, asked (ruling 72): their strongest
    // question from their own views, with their side and the reason from
    // their life on record. One who has taken up no question of their own
    // has no view strong enough to name.
    Object.assign(facts, doorViewFacts(core, askerId, door.contestId));
    // A second knock: the two have met at this door, so the player does not
    // introduce themself as a stranger again.
    if (door.knock.first === "false")
      facts["knocked-before"] = {
        text: "yes",
        sourceRecordIds: [moment.causeId],
      };
  }
  // The player asks: their lines speak to the colleague by name. A serve ask
  // set its names above, from the prospect's record.
  else if (standing && !serve) {
    facts.name = {
      text: sayPerson(asked),
      sourceRecordIds: [askedId],
    };
    facts.first = { text: asker.givenName, sourceRecordIds: [askerId] };
  }
  // A reporter's call is about something: the bill the record names, else the
  // topic it is about. The lines that follow (what the reporter will print,
  // check or hold) name it through `story`, cited to the records it came from.
  if (type.purpose === "press-comment" && !facts.story) {
    const about = facts.bill ?? facts.cause;
    if (about)
      facts.story = {
        text: about.text,
        sourceRecordIds: about.sourceRecordIds,
      };
  }
  // The kind's own arc, or the variant of it the records give this cause. A
  // scene where the player asks a colleague plays the kind's own arc: its
  // variants are the colleague's ask of the player. At a door the resident
  // is the asker, and the variant is what their own records give them to
  // talk about (a layoff, a rent notice, an illness in the house); on a
  // second knock they raise the next record down, so the same door is not
  // the same scene twice.
  const variantFacts = door ? { ...said, ...door.knock } : said;
  // A cause no variant was written for (a speech heard, for the door
  // families, whose variants are a resident's records at a door) plays the
  // purpose's own arc and its own lines; a purpose with neither is not
  // offered rather than played on another cause's lines.
  if (
    type.purpose &&
    (!type.playerAsks || door) &&
    !hasArcFor(type.purpose, variantFacts)
  )
    return {
      kind: "skipped",
      reason: `no ${type.purpose} arc for this cause`,
    };
  const variant =
    type.purpose && (!type.playerAsks || door)
      ? chooseVariant(core, {
          family: type.purpose,
          askerId,
          askedId,
          cause: {
            id: moment.causeId,
            date: record?.date ?? moment.date,
            facts: variantFacts,
          },
          setting: binding.setting.kind,
          ...(door?.knock.first === "false" ? { nextDown: true } : {}),
        })
      : null;
  // What the records gave the variant, for the lines that say it: every read
  // that came to more than nothing is a fact of the scene, cited to the records
  // it came from (`read-town-against`, `read-scandal`), so a line about the
  // town being against the vote plays only where the vote record shows it.
  if (variant)
    for (const [name, value] of Object.entries(variant.reads))
      if (value > P.zero)
        facts[`read-${name}`] = {
          text: "yes",
          sourceRecordIds: [...variant.recordIds],
        };
  // A constituent's own records, worded: the job they lost, the notice on
  // their rent, the pay under the floor, the relative who is ill. A resident
  // at their door speaks from the same records. Office hours always carries
  // the case's own facts, whether or not a variant was chosen.
  if (type.purpose === "constituent-help" || (variant && door))
    Object.assign(
      facts,
      constituentFacts(
        core,
        askerId,
        {
          id: moment.causeId,
          date: record?.date ?? moment.date,
          facts: said,
        },
        variant,
      ),
    );
  // A trade names the bill the asker already voted for, the asked person's own:
  // the most recent, from the asker's vote record.
  if (variant && (variant.reads["favor-given"] ?? P.zero) > P.zero) {
    const earlier = favorsGiven(
      core,
      askerId,
      askedId,
      record?.date ?? moment.date,
      said.billId,
    )[P.zero];
    const bill =
      earlier && core.modules.has(LEGISLATURE_MODULE_ID)
        ? billOf(coreAPI(core as CoreState), earlier.billId)
        : undefined;
    if (earlier && bill?.number)
      facts.earlier = {
        text: spokenDesignation(bill.number, bill.form.kind),
        sourceRecordIds: [earlier.voteId, bill.id],
      };
  }
  const played =
    variant && variant.purpose !== type.purpose
      ? { ...type, purpose: variant.purpose, family: type.purpose }
      : type;
  // At a door, the pieces of the player's earlier door scenes (earlier days)
  // are shown: an unused fitting piece is said first, so the opening and the
  // rest differ from outing to outing (Words lead, Nov 14, ruling 67).
  const doorDay = record?.date ?? moment.date;
  const seenAtDoors = door
    ? doorPiecesBefore(core, askedId, doorDay, moment.causeId)
    : undefined;
  const result = composeSceneTalk(
    core,
    director,
    { askerId, askedId, causeId: moment.causeId },
    played,
    facts,
    standing ? { standing } : {},
    seenAtDoors?.size ? { ...wording, shown: seenAtDoors } : wording,
  );
  if (result.kind !== "composed") return result;
  if (door)
    keepDoorPieces(core, askedId, doorDay, moment.causeId, result.talk.tree, [
      ...result.talk.narration,
      result.talk.state,
    ]);
  return {
    kind: "composed",
    scene: {
      typeKey: binding.typeKey,
      purpose: result.talk.purpose,
      askerId,
      askedId,
      ...(standing ? { playerAsks: true } : {}),
      cause: {
        id: moment.causeId,
        kind: moment.causeKind,
        label: moment.label,
        date: moment.date,
        facts: said,
      },
      facts: Object.entries(facts).map(([key, fact]) => ({
        key,
        text: fact.text,
        recordIds: [...fact.sourceRecordIds],
      })),
      ...(variant ? { variant } : {}),
      talk: result.talk,
    },
  };
}

/**
 * Where a resident stands after the player knocked on their door: the
 * campaign engine's warmth toward the player after the knock (its causes
 * table), and the race of the campaign, by its contest's title. Asked to
 * sign the petition, the resident answers from the petition record: signed
 * or not. A favor plays no part at a door. Null where the knock, the race or
 * (for a signature) the circulating petition is not on record.
 */
function doorStanding(
  core: Readonly<CoreState>,
  causeId: string,
  residentId: PersonId,
  purpose: string,
): {
  standing: AskStanding;
  office: string;
  contestId: string;
  /** The candidate's filing in the contest, when one is on record. */
  filingId?: string;
  knock: Record<string, string>;
} | null {
  if (
    !core.modules.has(CAMPAIGNS_MODULE_ID) ||
    !core.modules.has(ELECTIONS_MODULE_ID)
  )
    return null;
  const api = coreAPI(core as CoreState);
  const cause = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("causes")
    .get(causeId) as unknown as CauseRow | undefined;
  if (!cause || cause.voterId !== residentId) return null;
  const impression = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("impressions")
    .get(`${residentId}|${cause.candidateId}`) as unknown as
    { contestId?: string } | undefined;
  const contest = impression?.contestId
    ? (api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .get(impression.contestId) as unknown as { title?: string } | undefined)
    : undefined;
  if (!contest?.title) return null;
  const petition =
    purpose === "ask-signature"
      ? petitionAtDoor(core, cause.candidateId as PersonId, residentId)
      : undefined;
  if (petition === null) return null;
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byPerson", [cause.candidateId]) as unknown as {
      id: string;
      contestId: string;
    }[]
  ).find((row) => row.contestId === impression!.contestId);
  return {
    standing: {
      lean: petition ? (petition.signed ? P.one : -P.one) : cause.warmthAfter,
      favor: P.zero,
    },
    office: contest.title,
    contestId: impression!.contestId!,
    ...(filing ? { filingId: filing.id } : {}),
    knock: knockFacts(core, cause),
  };
}

/**
 * Where someone the player asked to serve stands: the serve-asks engine's
 * read kept with the ask (their record and the player's on the day asked),
 * never read again while the scene is open.
 */
function serveStanding(
  core: Readonly<CoreState>,
  said: Readonly<Record<string, string>>,
  prospectId: PersonId,
):
  | {
      standing: AskStanding;
      office: string;
      askId: string;
      question: string;
      reason: string;
      yesReason: string;
      grounds: ServeGrounds;
      terms: Readonly<Record<string, number>>;
      raceOffice: string;
      moved: string | null;
      seat: string;
      /** They named the player's word on their question as their price. */
      priced: boolean;
    }
  | undefined {
  const row = serveAsk(coreAPI(core as CoreState), said.askId ?? "");
  if (!row || row.askedId !== prospectId) return undefined;
  // Short of yes by less than the player's word on their own question is
  // worth to them: they name that promise as their price (gov-serve-ask-
  // price-end). Taking it carries them; refusing it does not.
  const worth = promiseWorth(row);
  const priced =
    row.standing.lean <= P.zero && row.standing.lean + worth > P.zero;
  return {
    priced,
    standing: {
      lean: row.standing.lean,
      favor: priced ? worth : P.zero,
      ...(priced ? { price: row.standing.lean + worth } : {}),
      // A stranger who would say yes asks the player one thing first; on
      // their own question, a hedge is weighed as the player's stance unsaid.
      asksFirst: !row.standing.grounds.knows && row.standing.lean > P.zero,
      hedged:
        row.standing.yesReason === "agree"
          ? leanIfHedged(row)
          : row.standing.lean,
    },
    terms: row.standing.terms,
    raceOffice: row.raceOffice,
    office: row.office,
    askId: row.id,
    question: row.standing.grounds.question,
    reason: row.standing.reason,
    yesReason: row.standing.yesReason,
    grounds: row.standing.grounds,
    moved: row.moved ?? null,
    seat: row.seat,
  };
}

/**
 * A post's title as one title a person can say: the research gives some
 * posts two names ("Revenue / Tax Commissioner", "Agriculture
 * Commissioner/Director"), and a person says the first, with the post's
 * role word where the first name is only its field ("revenue commissioner").
 * A note in parentheses is not said.
 */
function postTitleSaid(title: string): string {
  const plain = title.replace(/\s*\([^)]*\)/g, "").trim();
  const names = plain.split("/").map((name) => name.trim());
  const first = names[P.zero]!;
  if (names.length < P.two || /\s/.test(first)) return first;
  const role = plain.split(/\s+/).at(P.negativeOne)!;
  return `${first} ${role}`;
}

/**
 * An office as a person says it aloud (Words lead, rule 100): "lieutenant
 * governor", "state representative", the place it is of kept as named
 * ("attorney general of Guam").
 */
function officeSaidAloud(title: string): string {
  const at = title.indexOf(" of ");
  return at < P.zero
    ? officeInSentence(title)
    : `${officeInSentence(title.slice(P.zero, at))}${title.slice(at)}`;
}

/**
 * What a resident says matters to them when the player asks at the door
 * (Words lead, Nov 14, ruling 72), from the views engine: the question they
 * hold the strongest view on of those they have taken up (a stance record of
 * their own), their side, and the reason from their life when one is on
 * record (`viewReason`: their work, or money tight at home). One who has
 * taken up no question says so (`no-view`). `view-question` names the
 * question for the reply's record, which the player then holds.
 */
function doorViewFacts(
  core: Readonly<CoreState>,
  residentId: PersonId,
  contestId: string,
): Record<string, Fact> {
  if (!core.modules.has(VIEWS_MODULE_ID)) return {};
  const api = coreAPI(core as CoreState);
  const own = new Set(stancesOf(api, residentId).map((row) => row.topic));
  const none = {
    "no-view": {
      text: "yes",
      sourceRecordIds: [viewRecordId(residentId)],
    },
  };
  const lean = viewOf(api, residentId)?.lean;
  if (!own.size || lean === undefined) return none;
  // A resident says a view as what it does to them (Words lead, rule 103):
  // only a question their own record touches (their job, their bills, their
  // home) on the side they hold, so one their life does not reach is not
  // volunteered.
  const touches = (question: string) =>
    doorViewReason(
      core,
      residentId,
      question,
      viewOn(api, residentId, question, lean) > P.zero ? "for" : "against",
    );
  // What the office can touch comes first (rule 99): the strongest such view
  // on a question the race's level of government may decide (the power
  // catalog's one reader, `policyAuthority`), and only with none, the
  // strongest of all, which the player cannot promise on.
  const level = contestPolicyLevel(core, contestId);
  const local = level
    ? strongestQuestion(
        api,
        residentId,
        (question) =>
          own.has(question) &&
          touches(question) !== null &&
          policyAuthority(api, question, level).allowed,
      )
    : null;
  const top =
    local ??
    strongestQuestion(
      api,
      residentId,
      (question) => own.has(question) && touches(question) !== null,
    );
  if (!top || !own.has(top.question)) return none;
  const reason = touches(top.question);
  if (!reason) return none;
  const ids = [top.recordId];
  const facts: Record<string, Fact> = {
    about: { text: top.about, sourceRecordIds: ids },
    [`side-${top.side}`]: { text: "yes", sourceRecordIds: ids },
    "view-question": { text: top.question, sourceRecordIds: ids },
    [local ? "office-decides" : "above-office"]: {
      text: "yes",
      sourceRecordIds: [contestId],
    },
    [`why-${reason.reason}`]: {
      text: "yes",
      sourceRecordIds: [...reason.recordIds],
    },
  };
  if (reason.reason === "work")
    facts.workplace = {
      text: reason.employer,
      sourceRecordIds: [...reason.recordIds],
    };
  // A renter may say the rent they pay: their own money (rule 101).
  else if (reason.reason === "rent" && reason.rentMinor)
    facts.rent = {
      text: moneySaid(reason.rentMinor),
      sourceRecordIds: [...reason.recordIds],
    };
  return facts;
}

/**
 * What in a resident's own record a question touches: their work or their
 * money (the views engine's reason, `viewReason`), else, for a housing
 * question, the home they rent or own (the housing engine's dwelling).
 */
function doorViewReason(
  core: Readonly<CoreState>,
  residentId: PersonId,
  question: string,
  side: "for" | "against",
):
  | { reason: "work"; employer: string; recordIds: readonly string[] }
  | {
      reason: "money" | "rent" | "home";
      recordIds: readonly string[];
      rentMinor?: number;
    }
  | null {
  const reason = viewReason(core, residentId, question, side);
  if (reason) return reason;
  if (questionSubject(question) !== HOUSING_SUBJECT) return null;
  const householdId = core.people.get(residentId)?.householdId;
  const home = householdId
    ? dwellingTenure(coreAPI(core as CoreState), householdId)
    : undefined;
  // A renter feels every housing question; an owner only what zoning does
  // to their street.
  if (
    !home ||
    (home.tenure === "own" && questionTopic(question) !== ZONING_TOPIC)
  )
    return null;
  return {
    reason: home.tenure === "rent" ? "rent" : "home",
    recordIds: [home.recordId],
    ...(home.rentMinor ? { rentMinor: home.rentMinor } : {}),
  };
}
const HOUSING_SUBJECT = "housing";
const ZONING_TOPIC = "Planning and zoning";

/**
 * The level of government a race's seat sits at, as the power catalog reads
 * it: the contest's own level, or for a township the level its board's row
 * gives (data/offices/bodies.json). Null for none the catalog knows.
 */
function contestPolicyLevel(
  core: Readonly<CoreState>,
  contestId: string,
): PolicyLevel | null {
  const contest = coreAPI(core as CoreState)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as { level: string } | undefined;
  if (!contest) return null;
  if (POLICY_LEVELS.has(contest.level)) return contest.level as PolicyLevel;
  return bodyRow(`${contest.level}-board`)?.level ?? null;
}
const POLICY_LEVELS: ReadonlySet<string> = new Set([
  "federal",
  "state",
  "county",
  "city",
]);

/**
 * Where a colleague the player asks stands on the bill the record names: their
 * position today and what a yes given as a favor to the player is worth at
 * the roll (`favorWorth`), the two things their answer weighs.
 */
function askStanding(
  core: Readonly<CoreState>,
  said: Readonly<Record<string, string>>,
  colleagueId: PersonId,
  playerId: PersonId,
): AskStanding | undefined {
  if (!said.billId || !core.modules.has(LEGISLATURE_MODULE_ID))
    return undefined;
  const api = coreAPI(core as CoreState);
  if (!billOf(api, said.billId)) return undefined;
  const price = askPrice(api, said.billId, colleagueId, playerId);
  return {
    lean: memberPosition(api, said.billId, colleagueId).total,
    favor: favorWorth(api, colleagueId, playerId),
    ...(price ? { price: price.after } : {}),
    absence: absenceCarries(api, said.billId, colleagueId, playerId),
  };
}

/**
 * What a count's result record says about the two in the scene: the winner by
 * name (`winner`), whether the one told ran (`you-ran`), and whether the one
 * who tells ran (`bearer-ran`) and won (`bearer-won`) or lost (`bearer-lost`);
 * `winner-is-other` says the one who tells is not the winner.
 */
function resultFacts(
  facts: Record<string, Fact>,
  candidateIds: readonly string[],
  winner: { id: string; givenName: string; familyName: string },
  askerId: PersonId,
  askedId: PersonId,
  cause: { id: string },
): void {
  const mark = (ids: string[]): Fact => ({
    text: "",
    sourceRecordIds: [cause.id, ...ids],
  });
  facts.winner = {
    text: `${winner.givenName} ${winner.familyName}`,
    sourceRecordIds: [cause.id, winner.id],
  };
  if (candidateIds.includes(askedId)) facts["you-ran"] = mark([askedId]);
  if (winner.id === askerId) facts["bearer-won"] = mark([askerId]);
  else {
    facts["winner-is-other"] = mark([winner.id]);
    if (candidateIds.includes(askerId)) facts["bearer-lost"] = mark([askerId]);
  }
  if (candidateIds.includes(askerId)) facts["bearer-ran"] = mark([askerId]);
}

/** A dollar amount said to two figures, the way people round a number out loud: "$410,000". */
function roundedDollars(minor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: P.two,
  }).format(minor / P.minorPerDollar);
}

/**
 * What a department head says of a cut the council adopted to the line their
 * post draws on (budgets.ts `budget-line-changed`): how much was cut, how much
 * of the line that was where the adopted budget is on record, their post and
 * how many whole years they have held it, each with the records it came from.
 */
function cutFacts(
  core: Readonly<CoreState>,
  facts: Record<string, Fact>,
  said: Readonly<Record<string, string>>,
  causeId: string,
  headId: PersonId,
): void {
  const cut = Math.abs(Number(said.deltaMinor));
  if (!(cut > P.zero)) return;
  facts.cut = { text: roundedDollars(cut), sourceRecordIds: [causeId] };
  const api = coreAPI(core as CoreState);
  const budget =
    said.measureId && core.modules.has(BUDGETS_MODULE_ID)
      ? (api
          .moduleState(BUDGETS_MODULE_ID)
          .table("budgets")
          .get(said.measureId) as unknown as BudgetRow | undefined)
      : undefined;
  const left = budget?.spendingMinor[said.line ?? ""];
  if (budget && left !== undefined) {
    const percent = Math.round((P.percent * cut) / (left + cut));
    if (percent >= P.one)
      facts.percent = {
        text: String(percent),
        sourceRecordIds: [causeId, budget.id],
      };
  }
  // What the line pays for, as the budget screen names it ("police
  // protection"), from the line the record names.
  const lineName = (
    lineNames.lines as Record<string, { readonly name: string } | undefined>
  )[said.line ?? ""]?.name;
  if (lineName)
    facts.line = {
      text: lineName.charAt(P.zero).toLowerCase() + lineName.slice(P.one),
      sourceRecordIds: [causeId, ...(budget ? [budget.id] : [])],
    };
  const post = appointmentsIn(api, lawChain(api).townPlaceId).find(
    (row) => row.holderId === headId,
  );
  if (!post) return;
  facts.post = { text: post.title.toLowerCase(), sourceRecordIds: [post.id] };
  const date = core.date;
  const years =
    Number(date.slice(P.zero, P.isoYearCharacters)) -
    Number(post.since.slice(P.zero, P.isoYearCharacters)) -
    (date.slice(P.isoYearCharacters) < post.since.slice(P.isoYearCharacters)
      ? P.one
      : P.zero);
  if (years >= P.two)
    facts.years = {
      text: String(years),
      sourceRecordIds: [post.id],
    };
}

/**
 * What a department head says in the governor's emergency briefing: the kind of disaster the offer's
 * record names and whether this is a later meeting on it, each with the records it came from. Said as people say it (never a count).
 */
function briefingFacts(
  core: Readonly<CoreState>,
  facts: Record<string, Fact>,
  said: Readonly<Record<string, string>>,
  causeId: string,
): void {
  const kind = said.incidentType?.toLowerCase().replace(/\//g, " or ");
  if (kind) facts.disaster = { text: kind, sourceRecordIds: [causeId] };
  // The briefing is a later meeting on the same disaster (the offer was left unanswered).
  // The day the offer lapses, said as people say a date, from the same record the lapse reads.
  if (said.closes)
    facts.deadline = {
      text: spokenDate(
        said.closes,
        core.durableLog.get(causeId)?.date ?? core.date,
      ),
      sourceRecordIds: [causeId],
    };
  if (said.again) facts.again = { text: "", sourceRecordIds: [causeId] };
  // Which return it is: the midway one (half the window gone) or the last before the deadline.
  if (said.returnWhen === "midway" || said.returnWhen === "last")
    facts[`return-${said.returnWhen}`] = {
      text: "",
      sourceRecordIds: [causeId],
    };
}

/**
 * What someone who comes to a bill's presentment may say of it: the day the
 * decision is due, how the chambers voted, and whose side the visitor is on
 * (the sponsor is for it; a group's lobbyist is against it and says what it
 * costs the businesses they speak for), each citing the records it came from.
 */
function deskFacts(
  core: Readonly<CoreState>,
  facts: Record<string, Fact>,
  said: Readonly<Record<string, string>>,
  causeId: string,
  visitorId: PersonId,
): void {
  if (said.signBy)
    facts.deadline = {
      text: spokenDate(
        said.signBy,
        core.durableLog.get(causeId)?.date ?? core.date,
      ),
      sourceRecordIds: [causeId],
    };
  if (!said.billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return;
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, said.billId);
  if (!bill) return;
  // The bill as the visitor says it: by its name and what it does, never by
  // its number alone (the number sits on the desk's paper).
  const title = billTitleOf(bill);
  if (title) {
    facts.bill = {
      text: billTitleSaid(title.title),
      sourceRecordIds: [causeId, bill.id],
    };
    facts.purpose = { text: title.purpose, sourceRecordIds: [bill.id] };
  }
  // How it passed, said as people say it, never as a count (owner, Nov 14
  // 00:50Z; Words lead rule 50): nobody against it, enough to override a
  // veto in every chamber, or short of that, by the chambers' own tallies.
  const passage = deskPassage(api, bill.id);
  if (passage)
    facts[passage] = { text: "yes", sourceRecordIds: [causeId, bill.id] };
  // Why the members who voted no did, from the reasons their positions on
  // record weigh most against it: their voters, the groups that pressed
  // them, their party, or their own views (rule 93: the other side's reason
  // on record; with nobody against it there is none to tell). The groups are
  // a reason only when the group that met them has a name to say.
  const against = votesOn(api, bill.id).filter((row) => row.vote === "no");
  const cited = [causeId, bill.id];
  if (against.length) {
    facts.opposed = { text: "yes", sourceRecordIds: cited };
    const group = opposingGroup(
      core,
      meetingsOn(api, bill.id),
      new Set(against.map((row) => row.memberId)),
    );
    if (group) facts.group = { text: group.said, sourceRecordIds: [group.id] };
    const weight = {
      voters: P.zero,
      groups: P.zero,
      party: P.zero,
      views: P.zero,
    };
    for (const { position } of against) {
      weight.voters += position.constituents;
      weight.groups += position.lobby;
      weight.party += (position.party ?? P.zero) + (position.wing ?? P.zero);
      weight.views += position.views + position.trait + position.consistency;
    }
    const reason = Object.entries(weight)
      .map(([why, most]) => ({ why, most }))
      .filter(({ why, most }) => most < P.zero && (why !== "groups" || group))
      .sort((a, b) => a.most - b.most || a.why.localeCompare(b.why))
      .at(P.zero)?.why;
    if (reason)
      facts[`opposed-${reason}`] = { text: "yes", sourceRecordIds: cited };
    // Who they are: by name when they are few enough to say (Words lead,
    // Nov 14: three or fewer), else by the reason they share.
    const names = against.map((row) => core.people.get(row.memberId));
    if (against.length <= P.two + P.one && names.every(Boolean))
      facts.names = {
        text: new Intl.ListFormat("en-US").format(
          names.map((person) => `${person!.givenName} ${person!.familyName}`),
        ),
        sourceRecordIds: [...cited, ...against.map((row) => row.memberId)],
      };
  }
  // What it costs, from the budget lines it adds to: one rounded sum a year,
  // or nothing the budget shows (Words lead, Nov 14).
  const added = bill.provisions.reduce(
    (sum, p) =>
      p.kind === "budget-line" && p.value > P.zero ? sum + p.value : sum,
    P.zero,
  );
  if (added > P.zero)
    facts["budget-cost"] = {
      text: roundedDollars(added),
      sourceRecordIds: [bill.id],
    };
  else facts["no-cost"] = { text: "yes", sourceRecordIds: [bill.id] };
  if (bill.sponsorId === visitorId) {
    facts.for = {
      text: said.number ?? bill.number,
      sourceRecordIds: [causeId],
    };
    return;
  }
  const lobbied = meetingsOn(api, bill.id)
    .filter(
      (row) => row.lobbyistId === visitorId && (row.side ?? -P.one) < P.zero,
    )
    .sort((a, b) => b.annualCostMinor - a.annualCostMinor);
  const [largest] = lobbied;
  if (!largest) return;
  facts.against = {
    text: said.number ?? bill.number,
    sourceRecordIds: [causeId, largest.id],
  };
  if (largest.annualCostMinor > P.zero)
    facts.cost = {
      text: roundedDollars(largest.annualCostMinor),
      sourceRecordIds: [causeId, largest.id],
    };
}

/**
 * The group that pressed the members who voted no hardest (the most
 * meetings with them, then the largest case), as people say its name, or
 * null when none met them or its record has no name to say.
 */
function opposingGroup(
  core: Readonly<CoreState>,
  meetings: readonly {
    groupId: string;
    memberId: string;
    side?: number;
    annualCostMinor: number;
  }[],
  noVoters: ReadonlySet<string>,
): { id: string; said: string } | null {
  const tally = new Map<string, { met: number; cost: number }>();
  for (const row of meetings) {
    if ((row.side ?? -P.one) >= P.zero || !noVoters.has(row.memberId)) continue;
    const seen = tally.get(row.groupId) ?? { met: P.zero, cost: P.zero };
    tally.set(row.groupId, {
      met: seen.met + P.one,
      cost: Math.max(seen.cost, row.annualCostMinor),
    });
  }
  const ranked = [...tally]
    .map(([groupId, seen]) => ({ groupId, ...seen }))
    .sort(
      (a, b) =>
        b.met - a.met || b.cost - a.cost || a.groupId.localeCompare(b.groupId),
    );
  for (const { groupId } of ranked) {
    const org = core.organizations.get(`organization:${groupId}` as never) as
      { id: string; name: string; kind?: string; topic?: string } | undefined;
    if (!org) continue;
    const said =
      org.kind === "cause-group" && org.topic
        ? causeGroupName(org.id, org.topic)
        : /[:_]/.test(org.name)
          ? null
          : `the ${org.name.charAt(P.zero).toLowerCase()}${org.name.slice(P.one)}`;
    if (said) return { id: org.id, said };
  }
  return null;
}

/** The petition a filing opened, as the clerk says it, or nothing where none is on record. */
function petitionFacts(
  core: Readonly<CoreState>,
  filingId: string | undefined,
): Record<string, Fact> {
  const petition =
    filingId && core.modules.has(ELECTIONS_MODULE_ID)
      ? petitionOf(coreAPI(core as CoreState), filingId)
      : null;
  if (!petition) return {};
  const fact = (text: string) => ({ text, sourceRecordIds: [petition.id] });
  const walk = {
    ...walkThroughFacts(core, petition),
    ...voteDay(core, petition),
    // A filing made at the counter was taken there, in the clerk's scene:
    // the record of the reply that filed is read so the clerk does not take
    // the papers a second time (the narration of stamping them is left out).
    ...(core.durableLog.has(counterFilingReplyId(petition.filingId))
      ? {
          "filed-at-counter": {
            text: "yes",
            sourceRecordIds: [counterFilingReplyId(petition.filingId)],
          },
        }
      : {}),
  };
  if (petition.needed <= P.zero) return { "no-petition": fact("yes"), ...walk };
  const due = fact(spokenDate(petition.due, core.date));
  return petition.needed === P.one
    ? { "one-signature": fact("yes"), due, ...walk }
    : {
        signatures: fact(petition.needed.toLocaleString("en-US")),
        due,
        ...walk,
      };
}

/**
 * The race's next vote, its primary when one is still ahead, else the
 * election, said as a day, from the contest the filing is in: what the clerk
 * names when the candidate asks when they will know, or what comes next.
 */
function voteDay(
  core: Readonly<CoreState>,
  petition: { filingId: string },
): Record<string, Fact> {
  const filing = coreAPI(core as CoreState)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(petition.filingId) as unknown as { contestId: string } | undefined;
  return filing ? contestVoteDay(core, filing.contestId) : {};
}

/** The contest's next vote, its primary while one is ahead, else the election, said as a day. */
function contestVoteDay(
  core: Readonly<CoreState>,
  contestId: string,
): Record<string, Fact> {
  const contest = coreAPI(core as CoreState)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as
    | { id: string; primaryDate: string | null; electionDate: string }
    | undefined;
  if (!contest) return {};
  const day =
    contest.primaryDate && contest.primaryDate >= core.date
      ? contest.primaryDate
      : contest.electionDate;
  return {
    "vote-day": {
      text: spokenDate(day, core.date),
      sourceRecordIds: [contest.id],
    },
  };
}

/**
 * The first filing of a life (owner, Nov 1: "it should be the first time in
 * a game that the player files for an office... do you know how to run a
 * campaign?"): the clerk asks, and a candidate who says no is walked through
 * it from the place's records, the petition and the town's own paper, whose
 * ad time a campaign buys and whose reporters cover the race. A second filing
 * is not asked again.
 */
function walkThroughFacts(
  core: Readonly<CoreState>,
  petition: { filingId: string; personId: string },
): Record<string, Fact> {
  const api = coreAPI(core as CoreState);
  const filings = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [petition.personId]);
  // A filing after the first is not asked about running a campaign: the
  // petition's plain statement is for it, the asking one for the first.
  if (filings.length !== P.one)
    return {
      "repeat-filing": { text: "yes", sourceRecordIds: [petition.filingId] },
    };
  // The town's own newspaper, whose ads and reporters the answer names.
  const town = core.modules.has(PRESS_MODULE_ID) ? townOutlet(api) : null;
  const outlet = town?.kind === "newspaper" ? town : null;
  // Said as "the Mauston Record": a name that carries its own article drops it.
  const paper = outlet
    ? core.organizations.get(outlet.organizationId)?.name?.replace(/^The /, "")
    : undefined;
  return {
    "first-filing": { text: "yes", sourceRecordIds: [petition.filingId] },
    ...(outlet && paper
      ? { outlet: { text: paper, sourceRecordIds: [outlet.id] } }
      : {}),
  };
}

/** The scene type of a resident's visit to the official's office (situation-types.json). */
const OFFICE_HOURS_TYPE = "office-hours";
const DESK_VISIT_TYPE = "desk-visit";
/** The desk visit's replies that say the act: their pieces, by the act. */
const DESK_ACTS = (
  purposeArcs as unknown as {
    purposes: Record<string, { acts?: { sign: string[]; veto: string[] } }>;
  }
).purposes[DESK_VISIT_TYPE]!.acts!;

/**
 * The pieces each door scene said, by the player and the cause, kept the
 * first time the scene is composed (per world, never saved): the doors of
 * earlier days are shown to the next door scene so its pieces differ. A
 * scene composed again (its reply) reads the same earlier days and so the
 * same pieces.
 */
const DOOR_PIECES = new WeakMap<
  object,
  Map<PersonId, Map<string, { date: string; parts: ReadonlySet<string> }>>
>();

function doorPiecesBefore(
  core: Readonly<CoreState>,
  playerId: PersonId,
  date: string,
  causeId: string,
): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [id, row] of DOOR_PIECES.get(core)?.get(playerId) ?? [])
    if (id !== causeId && row.date < date)
      for (const part of row.parts) out.add(part);
  return out;
}

function keepDoorPieces(
  core: Readonly<CoreState>,
  playerId: PersonId,
  date: string,
  causeId: string,
  tree: TreeNode,
  opening: readonly { parts: readonly string[] }[],
): void {
  let byPlayer = DOOR_PIECES.get(core);
  if (!byPlayer) DOOR_PIECES.set(core, (byPlayer = new Map()));
  let rows = byPlayer.get(playerId);
  if (!rows) byPlayer.set(playerId, (rows = new Map()));
  if (rows.has(causeId)) return;
  const parts = new Set<string>();
  for (const line of opening) line.parts.forEach((part) => parts.add(part));
  const walk = (node: TreeNode) => {
    for (const line of node.lines)
      line.parts.forEach((part) => parts.add(part));
    for (const reply of node.replies) {
      reply.line.parts.forEach((part) => parts.add(part));
      if (reply.next) walk(reply.next);
    }
  };
  walk(tree);
  rows.set(causeId, { date, parts });
}

/** The player's move at a door that asks after the resident (the door arcs' `asks.middle.ask`). */
const DOOR_ASK_AFTER = "ask";

/**
 * What an ending that strains a tie writes to closeness, by what it keeps:
 * hours of quarrel, or (`unit` "share of the tie") a share of the hours the
 * tie stands on today.
 */
const ENDING_STRAIN = rulesFile.endingStrain as unknown as Readonly<
  Record<string, { value: number; unit?: string } | undefined>
>;
const SHARE_OF_TIE = "share of the tie";

/** The hours an ending's strain takes off the tie between two people today. */
export function endingStrainHours(
  core: Pick<CoreState, "data" | "date" | "relationships">,
  keeps: string,
  a: PersonId,
  b: PersonId,
): number | undefined {
  const row = ENDING_STRAIN[keeps];
  if (!row) return undefined;
  return row.unit === SHARE_OF_TIE
    ? row.value * tieHoursBetween(core, a, b)
    : row.value;
}

/**
 * The player's reply in a scene with a purpose, by its path through the tree
 * (the index of each reply chosen, from the first). The reply is a record of
 * what they said to whom, and the core's own writer reads it: the time
 * together reaches their tie with the asker, citing the record, as a talk's
 * lines do. Returns the record's id (the same one if the reply was already
 * said), or null when the path is not a reply the scene offers.
 */
export function replyInScene(
  core: CoreState,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  path: readonly number[],
  options: { includeHeld?: boolean; typeKey?: string } = {},
): string | null {
  const result = purposeScene(core, director, personId, entry, options);
  if (result?.kind !== "composed" || !path.length) return null;
  const { scene } = result;
  let node: TreeNode | null = scene.talk.tree;
  let reply: TreeReply | undefined;
  for (const index of path) {
    reply = node ? playedNode(node).replies[index] : undefined;
    if (!reply) return null;
    node = reply.next;
  }
  const line = reply!.line;
  // Where the reply leads, as play reaches it (after a lie, the outcome the
  // records give).
  const reached = reply!.next ? playedNode(reply!.next) : null;
  // One record per scene of the moment and reply path: a record that stages
  // several scenes keeps each one's replies apart.
  const unit = scene.unit ?? scene.typeKey;
  const id = `scene-reply:${entry.momentId}:${unit}:${path.join(".")}`;
  // Said once: the same reply again (a page reloaded) keeps the record.
  if (core.eventIds.has(id)) return id;
  if (!entry.answered?.includes(unit))
    entry.answered = [...(entry.answered ?? []), unit];
  // STOPGAP SG-WORDS-family-limit-unread: a reply that bounds the cost (a
  // limit on savings, evenings kept for a child) is recorded as said and as
  // time together; no engine reads the limit yet.
  // What the talk settles at home after a filing: asked to help, and the
  // relative's own answer says yes (the exchange's answer, led by their
  // traits), they are counted among the campaign's volunteers; put off, the
  // relative's stake goes unanswered and the night is a quarrel on the tie.
  const stakeKind = scene.facts.some((row) => row.key === "stake-money")
    ? "money"
    : scene.facts.some((row) => row.key === "stake-time")
      ? "time"
      : undefined;
  const answer = reached?.lines.find((row) => row.role === "asker");
  const filingId = scene.cause.facts.filingId;
  const enlists =
    !!stakeKind &&
    !!filingId &&
    line.move === "request" &&
    answer?.move === "promise" &&
    core.modules.has(CAMPAIGNS_MODULE_ID) &&
    enlistVolunteer(coreAPI(core), filingId, scene.askerId);
  // After a lost race, saying they will run again meets the relative's own
  // answer (led by their traits); the candidacy engine keeps it for the next
  // contest the person weighs: behind the run pulls toward it, doubts away.
  const lossPart = scene.facts.some(
    (row) => row.key === "stake-worked" || row.key === "stake-gave",
  );
  const backing =
    lossPart && line.move === "promise" && answer
      ? rulesFile.familyStakes.behindMoves.includes(answer.move)
        ? "behind"
        : rulesFile.familyStakes.doubtMoves.includes(answer.move)
          ? "doubts"
          : undefined
      : undefined;
  // Where the player asks, the reply kept is the colleague's answer, theirs
  // to the player (the one asked first, as the legislature reads it).
  const theirs = scene.playerAsks
    ? lastAnswerAlong(scene.talk.tree, path)
    : undefined;
  // The ending the reply reaches, if it ends the scene: what the scene keeps
  // is written on its record for the engines that read it, and a tie it
  // strains is written to closeness (the plan, section 3: "Each 'keeps'
  // becomes a write to the engine that owns it").
  const ending = reached?.end?.ending;
  const aboutQuestion = scene.facts.find((row) => row.key === "about");
  // The concession call: conceding, or refusing to that night, is marked on
  // the reply for the press to put on the public record.
  const conceded = ending
    ? rulesFile.concession.conceded.includes(ending.id)
      ? "yes"
      : rulesFile.concession.notConceded.includes(ending.id)
        ? "no"
        : undefined
    : undefined;
  const promised = ending
    ? promiseReplyFacts({ ...scene, endingId: ending.id })
    : {};
  applyCoreEvent(core, {
    id,
    date: core.date,
    kind: "scene.reply",
    personIds: scene.playerAsks
      ? [scene.askerId, scene.askedId]
      : [scene.askedId, scene.askerId],
    placeId: core.people.get(scene.askedId)!.placeId,
    facts: {
      typeKey: scene.typeKey,
      causeId: scene.cause.id,
      ...(scene.variant ? { variant: scene.variant.variant } : {}),
      move: theirs ?? line.move,
      ...(theirs ? { asked: line.move } : {}),
      line: line.text,
      ...(stakeKind ? { stake: stakeKind } : {}),
      ...(enlists && filingId ? { enlisted: filingId } : {}),
      ...(backing ? { backing } : {}),
      ...(ending ? { ending: ending.id, keeps: ending.keeps } : {}),
      // A promise a record can settle: its kind and its tie, from the
      // ending's row in src/director/data/promise-kinds.json (promises.ts). stopgapId:
      // SG-WORDS-favor-promise-keeps-unread (endings with no row yet)
      ...promised,
      ...(ending?.firmness ? { firmness: ending.firmness } : {}),
      // What the ending settles in an engine's own record (office hours: the
      // case is helped or declined), so a later scene reads help done and
      // not a promise made (relation-facts.ts passedBetween).
      ...(ending?.settles ? { settled: ending.settles } : {}),
      // A promise made on a resident's own question names it, for the
      // Journal (ruling 72).
      ...(ending?.keeps === "promise" && aboutQuestion
        ? { about: aboutQuestion.text }
        : {}),
      ...(conceded ? { conceded } : {}),
    },
    source: {
      tag: "SOURCED",
      citation: "Recorded scene: the reply the player chose to say.",
      asOf: core.date,
    },
  });
  entry.replies = [...(entry.replies ?? []), id];
  // A yes to come to a meeting with a friend: the player is marked to attend
  // it (the calendar's own mark) and the friend is written onto it, so the
  // meeting's record says who came (promises.ts settles the promise on it).
  const meetingPromised = promised["promise-meetingId"];
  if (meetingPromised && core.modules.has(OFFICE_DAY_MODULE_ID))
    pledgeToCome(coreAPI(core), meetingPromised, scene.askerId);
  // Office hours: the official's answer settles the resident's case through the
  // cases engine, the way the desk's decision does, citing this reply. "I'll
  // make the call" and "Let me refer you" are help; "I can't help" is a decline;
  // a reply that leaves it waiting settles nothing.
  const caseId = scene.cause.facts.caseId;
  const caseDecision = ending?.settles;
  if (
    scene.typeKey === OFFICE_HOURS_TYPE &&
    caseId &&
    caseDecision &&
    core.modules.has(CASES_MODULE_ID)
  )
    handleCase(coreAPI(core), caseId, caseDecision, null, id);

  // The visit is the desk (Words lead, desk ruling 2): a reply that says the
  // act in its own words ("Bring the pen.", "It goes back with a veto.") and
  // ends the talk signs or vetoes the bill through the desk's own decision,
  // the same one the panel's buttons call. Any other reply, a plain no
  // included, a fix asked for or a put-off, leaves it on the desk (Account
  // lead, Nov 14).
  const deskBillId = scene.cause.facts.billId;
  const deskAct = DESK_ACTS.sign.includes(line.parts[P.zero] ?? "")
    ? "sign"
    : DESK_ACTS.veto.includes(line.parts[P.zero] ?? "")
      ? "veto"
      : undefined;
  if (
    scene.typeKey === DESK_VISIT_TYPE &&
    typeof deskBillId === "string" &&
    deskAct &&
    ending &&
    core.modules.has(OFFICE_DAY_MODULE_ID) &&
    deskWaiting(coreAPI(core)).some((bill) => bill.id === deskBillId)
  )
    decideDesk(coreAPI(core), deskBillId, deskAct === "sign");

  // Asked at the door what matters to them, a resident says their strongest
  // question and their side (ruling 72): the player holds it as a talk's
  // listener does (the views engine's records, by the learned-view keys the
  // person's card reads), citing this reply.
  const question = scene.facts.find((row) => row.key === "view-question");
  const asked = scene.talk.tree.replies[path[P.zero]!]?.line;
  if (
    scene.playerAsks &&
    question &&
    asked?.move === DOOR_ASK_AFTER &&
    core.modules.has(VIEWS_MODULE_ID)
  ) {
    const residentId =
      scene.askerId === personId ? scene.askedId : scene.askerId;
    learnView(coreAPI(core), personId, residentId, question.recordIds, id);
    learnViewQuestion(coreAPI(core), personId, residentId, question.text, id);
  }
  // A swearing-in that ended in an address: the speech engine records it as
  // heard by the people the scene named in the room (swearing-in.ts).
  if (ending?.keeps === ADDRESS_KEEPS)
    giveInauguralAddress(core, {
      speakerId: scene.askedId,
      causeId: scene.cause.id,
      audienceIds:
        entry.bindings.find((row) => row.typeKey === scene.typeKey)
          ?.presentIds ?? [],
      move: line.move,
    });
  // Talking is time together, recorded through the core's own writer. A
  // swearing-in's ending is also a first meeting with the one who gave the
  // oath, whom the player knows by name after.
  const hours = conversationRules.minutesPerExchange / P.minutesPerHour;
  const swornIn =
    ending?.keeps === OATH_KEEPS || ending?.keeps === ADDRESS_KEEPS;
  const met =
    swornIn &&
    meetOfficiant(core, {
      playerId: scene.askedId,
      officiantId: scene.askerId,
      causeId: scene.cause.id,
      recordId: id,
      hours,
    });
  if (!met)
    coreAPI(core).relationship(
      scene.askedId,
      scene.askerId,
      "contact",
      hours,
      undefined,
      { cause: "scene-reply", sourceId: id },
    );
  const strain = ending
    ? endingStrainHours(core, ending.keeps, scene.askedId, scene.askerId)
    : undefined;
  if (strain)
    coreAPI(core).relationship(
      scene.askedId,
      scene.askerId,
      "contact",
      -strain,
      undefined,
      { cause: `scene-ending:${ending!.keeps}`, sourceId: id },
    );
  if (stakeKind && line.move === "deflect")
    coreAPI(core).relationship(
      scene.askedId,
      scene.askerId,
      "contact",
      -rulesFile.familyStakes.putOffHours.value,
      undefined,
      { cause: "scene-put-off", sourceId: id },
    );
  return id;
}

/**
 * How a turnout looks, read from the action's own record as it stands when the
 * scene is composed (`turnoutOf`, public-action.ts, from its share of the
 * town's adults): a scene says "a few",
 * "a group" or "a crowd" and never the figure (owner's rule, no count in a
 * scene). `turnout-many` is set for the two larger looks, for lines that
 * serve both.
 */
function turnoutFacts(
  turnout: "few" | "group" | "crowd" | undefined,
  actionId: string,
): Record<string, Fact> {
  if (!turnout) return {};
  const fact = (text: string): Fact => ({ text, sourceRecordIds: [actionId] });
  return {
    [`turnout-${turnout}`]: fact("yes"),
    ...(turnout !== "few" ? { "turnout-many": fact("yes") } : {}),
  };
}

/** How the turnout looked when the action formed: the fact its civic record keeps (public-action.ts, `turnout`), the same one the paper reads. */
function turnoutOf(
  value: string | undefined,
): "few" | "group" | "crowd" | undefined {
  return value === "few" || value === "group" || value === "crowd"
    ? value
    : undefined;
}
