/**
 * A scene with a purpose, as play meets it, fired by the records. The director
 * has already fired the moment from its cause record and cast it (scheduling.ts);
 * this reads that binding, takes the facts the exchange may say from the cause
 * record and the cast, and has the exchange engine (scene-talk.ts) word it as
 * a tree the player taps through. It words nothing itself, and it says why:
 * the cause record, its kind and date, and every fact with the records it
 * came from.
 */
import { placeStateKey } from "../core2/place-map";
import { BUDGETS_MODULE_ID, type BudgetRow } from "../core2/modules/budgets";
import { gameStartDate } from "../core2/game-start";
import { personLean } from "../core2/campaign-views";
import { appointmentsIn } from "../core2/modules/executive";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "../core2/modules/laws";
import { meetingsOn } from "../core2/modules/interest-groups";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  favorWorth,
  floorDateOf,
  memberPosition,
  votesOn,
} from "../core2/modules/legislature";
import {
  MEETINGS_MODULE_ID,
  type DebateRow,
  type TownHallRow,
} from "../core2/modules/meetings";
import { VIEWS_MODULE_ID, stancesOf, viewOn } from "../core2/modules/views";
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
import type { CoreState, PersonId } from "../core2/types";
import { billNameFor, spokenDesignation } from "../english/bill-names";
import { areaName } from "../english/area-names";
import { NAMED_QUESTIONS, questionAbout } from "../english/question-names";
import { floorDebateFacts } from "./floor-debate-facts";
import { raceTurnoutFacts } from "./race-turnout-facts";
import { storyTopicName, topicInSentence } from "../english/policy-names";
import { dollars } from "../english/bill-sections";
import { lateSaid, moneySaid, monthsOfRentDays } from "../english/count-words";
import { NOTICE_SERVED_EVENT } from "../core2/modules/housing";
import {
  NEWS_MODULE_ID,
  NEWS_READ,
  storyOfReadEvent,
  type Story,
} from "../core2/modules/news";
import { MOVED_AWAY_EVENT, departureOf } from "../core2/modules/moves";
import { disasterSaid, homeSaid } from "../english/disaster-words";
import { withArticle } from "../english/journal-words";
import {
  JOBS_MODULE_ID,
  JOB_OFFERED_EVENT,
  jobById,
  staffCount,
} from "../core2/modules/jobs";
import conversationRules from "./data/conversation-rules.json" with { type: "json" };
import type { Director } from "./ledger";
import { knockFacts, petitionAtDoor } from "./doors";
import { officeSaid } from "./cause-facts";
import {
  SITUATION_LIBRARY,
  type ScheduleEntry,
  type SituationType,
} from "./scheduling";
import type { Moment } from "./types";
import { beatenRunnerUp } from "../core2/modules/voting";
import {
  composeSceneTalk,
  lastAnswerAlong,
  type AskStanding,
  type PurposeType,
  type SceneTalk,
  type TreeNode,
  type TreeReply,
} from "./scene-talk";
import type { Fact } from "../english/scene-talk-words";
import { custodyFacts } from "./custody-facts";
import { meetingFacts } from "./meeting-facts";
import { letterFacts } from "./letter-facts";
import { celebrationFacts } from "./celebration-facts";
import { gatheringFacts } from "./gathering-facts";
import { rescueFacts } from "./rescue-facts";
import { birthFacts } from "./birth-facts";
import { constituentFacts } from "./constituent-help-facts";
import { chooseVariant, favorsGiven, type VariantChoice } from "./arc-variant";

/** A state's key begins with its country (`US-KY`); the rest is its USPS code. */
const STATE_KEY_PREFIX = "US-";

/** The moves engine's basis for a move to somewhere else in the same state. */
const STATE_BASIS = "state";

/** The public-action engine's record of a rally forming (`civic.rally`). */
const RALLY_EVENT = "civic.rally";
/** The disasters engine's record of a damaged home's household told what the aid and repairs came to (`HOME_DAMAGED_EVENT`, disasters.ts). */
const HOME_DAMAGED_EVENT = "disaster.home-damaged";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  incumbentOf,
  petitionOf,
} from "../core2/modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  enlistVolunteer,
  type CauseRow,
} from "../core2/modules/campaigns";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import {
  outletsHere,
  PRESS_MODULE_ID,
  townOutlet,
  PRESS_STORY_EVENT,
} from "../core2/modules/press";
import { closenessBetween } from "../core2/closeness";
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
    const result = composeBinding(
      core,
      director,
      personId,
      about,
      binding,
      options,
    );
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
 * Which side of their tie two people stand, from its record: a rival is one
 * whose last contact on the tie was a quarrel; a friend is nearer full
 * closeness than none (scene-talk-rules tieSides). Null for neither, or no
 * tie on record. Scenes and the Journal read it alike.
 */
export function tieSide(
  core: Readonly<CoreState>,
  aId: PersonId,
  bId: PersonId,
): { side: "friend" | "rival"; tieId: string } | null {
  const tieId = aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
  const tie = core.relationships.get(tieId);
  if (!tie) return null;
  if ((tie.latestChange?.requestedChange ?? P.zero) < P.zero)
    return { side: "rival", tieId };
  if (
    closenessBetween(core, aId, bId) >= rulesFile.tieSides.friendCloseness.value
  )
    return { side: "friend", tieId };
  return null;
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
  options: { includeHeld?: boolean },
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
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker || !asked)
    return { kind: "skipped", reason: "the cast is not on record" };

  const record = core.durableLog.get(moment.causeId);
  const said = (record?.facts ?? {}) as Readonly<Record<string, string>>;
  const facts: Record<string, Fact> = {
    name: {
      text: `${asker.givenName} ${asker.familyName}`,
      sourceRecordIds: [askerId],
    },
    first: { text: asked.givenName, sourceRecordIds: [askedId] },
  };
  const town = corePlaceByJurisdictionId(asked.placeId as never);
  if (town)
    facts.place = { text: spoken(town), sourceRecordIds: [asked.placeId] };
  // What the cause record is about (a shared cause, a speech), as the bill
  // catalog names its topic.
  const cause = record?.topic ? topicInSentence(record.topic) : null;
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
  const billId = said.billId ?? remark?.billId;
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
  // The chair a committee's hold names, for a member who is asked to press them.
  const chair = said.chair
    ? core.people.get(said.chair as PersonId)
    : undefined;
  if (chair && chair.id !== askedId)
    facts.chair = {
      text: `${chair.givenName} ${chair.familyName}`,
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
          text: `${before.givenName} ${before.familyName}`,
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
    if (why)
      facts[why.fact] = { text: asker.givenName, sourceRecordIds: cited };
  }
  // A prison term (justice.ts): a person home from prison, a sentence handed
  // down or a person held before trial, with how long, the day they get out,
  // the bail, whether the term ended their job and the child at home, each
  // cited to the records it came from. stopgapId:
  // SG-WORDS-homecoming-stay-unread, SG-WORDS-prison-visit-limits-fixed
  for (const [key, fact] of Object.entries(
    custodyFacts(core, record, askerId, askedId),
  ))
    facts[key] = fact;
  // A first meeting or a tie that grew (the jobs, school and parties engines'
  // records): the employer, the job, the school, the children at one school,
  // the party and the town the two share or do not. stopgapId:
  // SG-WORDS-meeting-no-club-records, SG-WORDS-meeting-promise-unread
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
      if (said.size)
        facts.number = {
          text: said.size,
          sourceRecordIds: [said.actionId],
        };
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
    if (said.size)
      facts.number = { text: said.size, sourceRecordIds: [said.actionId] };
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
    const work = (
      lineNames.lines as Record<string, { readonly name: string } | undefined>
    )[said.contractLine ?? ""]?.name;
    if (said.favor === "contract" && work)
      facts.contract = {
        text: `the ${work.charAt(P.zero).toLowerCase()}${work.slice(P.one)} contract`,
        sourceRecordIds: [moment.causeId, said.contractId ?? moment.causeId],
      };
    const wanted = said.favor === "vote" ? facts.bill : facts.contract;
    if (wanted) facts.wanted = wanted;
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
        text: `${reporter.givenName} ${reporter.familyName}`,
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
  // debate), by name.
  if (record?.kind !== PRESS_STORY_EVENT && said.outletId) {
    const outlet = core.organizations.get(said.outletId);
    if (outlet)
      facts.outlet = {
        text: organizationName(outlet),
        sourceRecordIds: [moment.causeId, outlet.id],
      };
  }
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
    const issue = split ? questionAbout(split.question) : null;
    if (issue)
      facts.issue = {
        text: issue,
        sourceRecordIds: [said.debateId, moment.causeId],
      };
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
  // How the two stand, so a line can fit the tie: the asked person's known
  // people (`acquainted`, else `stranger`), and family (`kin`).
  if (asked.familyIds.has(askerId))
    facts.kin = { text: asker.givenName, sourceRecordIds: [askerId, askedId] };
  if (asked.knownIds.has(askerId))
    facts.acquainted = {
      text: asker.givenName,
      sourceRecordIds: [askerId, askedId],
    };
  else facts.stranger = { text: asker.givenName, sourceRecordIds: [askerId] };
  // Which side of their tie the two stand nearer, from its record: a friend
  // (`tie-friend`) is nearer full closeness than none; a rival (`tie-rival`)
  // is one whose last contact on the tie was a quarrel. A friend and a rival
  // say different things.
  const side = tieSide(core, askerId, askedId);
  if (side)
    facts[`tie-${side.side}`] = {
      text: asker.givenName,
      sourceRecordIds: [side.tieId],
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
  if (said.office)
    facts.office = {
      text: titleInSentence(said.office),
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
      text: `${rival.givenName} ${rival.familyName}`,
      sourceRecordIds: [moment.causeId, rival.id],
    };
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
      text: `${winner.givenName} ${winner.familyName}`,
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
        text: `${other.givenName} ${other.familyName}`,
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
  if (record?.kind === "election-result" && said.contestId)
    Object.assign(facts, raceTurnoutFacts(core, said.contestId));
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

  // A recall petition names the member's vote; a promise to vote against
  // the bill (`promised-against`) is said only from a record of one, which no
  // engine writes yet. stopgapId: SG-WORDS-recall-promise-record

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
  for (const mark of dayParts(sceneMinute(core, personId)))
    facts[mark] = { text: "yes", sourceRecordIds: [moment.causeId] };

  const wording = options.includeHeld ? { includeHeld: true } : {};
  // A door on the player's own canvass: where the knock left the resident,
  // and the race the player asks them about.
  const door =
    type.playerAsks && moment.causeKind === "event:campaign.door"
      ? doorStanding(core, moment.causeId, askerId, type.purpose ?? "")
      : undefined;
  const standing = door
    ? door.standing
    : type.playerAsks
      ? askStanding(core, said, askerId, askedId)
      : undefined;
  if (type.playerAsks && !standing)
    return {
      kind: "skipped",
      reason:
        door === null
          ? "no race on record to ask about"
          : "no bill on record to ask about",
    };
  if (door) {
    facts.name = {
      text: `${asker.givenName} ${asker.familyName}`,
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
    Object.assign(facts, doorViewFacts(core, askerId));
    // A second knock: the two have met at this door, so the player does not
    // introduce themself as a stranger again.
    if (door.knock.first === "false")
      facts["knocked-before"] = {
        text: "yes",
        sourceRecordIds: [moment.causeId],
      };
  }
  // The player asks: their lines speak to the colleague by name.
  else if (standing) {
    facts.name = {
      text: `${asked.givenName} ${asked.familyName}`,
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
  const variant =
    type.purpose && (!type.playerAsks || door)
      ? chooseVariant(core, {
          family: type.purpose,
          askerId,
          askedId,
          cause: {
            id: moment.causeId,
            date: record?.date ?? moment.date,
            facts: door ? { ...said, ...door.knock } : said,
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
  // at their door speaks from the same records.
  if (variant && (type.purpose === "constituent-help" || door))
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
): Record<string, Fact> {
  if (!core.modules.has(VIEWS_MODULE_ID)) return {};
  const api = coreAPI(core as CoreState);
  const own = new Set(stancesOf(api, residentId).map((row) => row.topic));
  const top = own.size ? strongestQuestion(api, residentId) : null;
  if (!top || !own.has(top.question))
    return {
      "no-view": {
        text: "yes",
        sourceRecordIds: [viewRecordId(residentId)],
      },
    };
  const ids = [top.recordId];
  const reason = viewReason(core, residentId, top.question);
  const facts: Record<string, Fact> = {
    about: { text: top.about, sourceRecordIds: ids },
    [`side-${top.side}`]: { text: "yes", sourceRecordIds: ids },
    "view-question": { text: top.question, sourceRecordIds: ids },
  };
  if (reason?.reason === "work") {
    facts["why-work"] = { text: "yes", sourceRecordIds: [...reason.recordIds] };
    facts.workplace = {
      text: reason.employer,
      sourceRecordIds: [...reason.recordIds],
    };
  }
  if (reason?.reason === "money")
    facts["why-money"] = {
      text: "yes",
      sourceRecordIds: [...reason.recordIds],
    };
  return facts;
}

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
  return {
    lean: memberPosition(api, said.billId, colleagueId).total,
    favor: favorWorth(api, colleagueId, playerId),
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
  const votes = votesOn(api, bill.id);
  const yes = votes.filter((row) => row.vote === "yes").length;
  const no = votes.filter((row) => row.vote === "no").length;
  // The roll, for and against; the bank's lines join them.
  if (yes + no > P.zero) {
    const roll = (text: string) => ({
      text,
      sourceRecordIds: [causeId, bill.id],
    });
    facts.roll = roll("yes");
    facts.ayes = roll(String(yes));
    facts.nays = roll(String(no));
  }
  if (bill.sponsorId === visitorId) {
    facts.for = {
      text: said.number ?? bill.number,
      sourceRecordIds: [causeId],
    };
    return;
  }
  const against = meetingsOn(api, bill.id)
    .filter(
      (row) => row.lobbyistId === visitorId && (row.side ?? -P.one) < P.zero,
    )
    .sort((a, b) => b.annualCostMinor - a.annualCostMinor);
  const [largest] = against;
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

/** Hours of quarrel an ending that strains a tie writes to closeness, by what it keeps. */
const ENDING_STRAIN = rulesFile.endingStrain as unknown as Readonly<
  Record<string, { value: number } | undefined>
>;

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
    reply = node?.replies[index];
    if (!reply) return null;
    node = reply.next;
  }
  const line = reply!.line;
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
  const answer = reply!.next?.lines.find((row) => row.role === "asker");
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
  const ending = reply!.next?.end?.ending;
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
      ...(ending?.firmness ? { firmness: ending.firmness } : {}),
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
  // stopgapId: SG-WORDS-favor-promise-keeps-unread
  const strain = ending ? ENDING_STRAIN[ending.keeps]?.value : undefined;
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
