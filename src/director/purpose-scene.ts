/**
 * A scene with a purpose, as play meets it, fired by the records. The director
 * has already fired the moment from its cause record and cast it (scheduling.ts);
 * this reads that binding, takes the facts the exchange may say from the cause
 * record and the cast, and has the exchange engine (scene-talk.ts) word it as
 * a tree the player taps through. It words nothing itself, and it says why:
 * the cause record, its kind and date, and every fact with the records it
 * came from.
 */
import { BUDGETS_MODULE_ID, type BudgetRow } from "../core2/modules/budgets";
import { personLean } from "../core2/campaign-views";
import { appointmentsIn } from "../core2/modules/executive";
import { lawChain } from "../core2/modules/laws";
import { meetingsOn } from "../core2/modules/interest-groups";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  votesOn,
} from "../core2/modules/legislature";
import {
  MEETINGS_MODULE_ID,
  type TownHallRow,
} from "../core2/modules/meetings";
import { viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { billNameFor, spokenDesignation } from "../english/bill-names";
import { questionAbout } from "../english/question-names";
import {
  questionName,
  storyTopicName,
  topicInSentence,
} from "../english/policy-names";
import { dollars } from "../english/bill-sections";
import conversationRules from "./data/conversation-rules.json" with { type: "json" };
import type { Director } from "./ledger";
import {
  SITUATION_LIBRARY,
  type ScheduleEntry,
  type SituationType,
} from "./scheduling";
import type { Moment } from "./types";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalk,
  type TreeNode,
  type TreeReply,
} from "./scene-talk";
import type { Fact } from "../english/scene-talk-words";
import { ELECTIONS_MODULE_ID, ballot } from "../core2/modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  enlistVolunteer,
} from "../core2/modules/campaigns";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { stakeOf } from "./family-stake";
import { properName, spoken, spokenDate } from "./words";
import { PRESS_STORY_EVENT } from "../core2/press-desk";

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
      | (PurposeType & { repeatsBy?: string })
      | undefined;
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
  const named =
    said.billId && core.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(coreAPI(core as CoreState), said.billId)
      : undefined;
  const number = said.number ?? named?.number;
  if (number) {
    // Said as a clerk reads it: a bare number takes its form's word first.
    facts.bill = {
      text: spokenDesignation(number, named?.form.kind ?? ""),
      sourceRecordIds: [said.billId ?? moment.causeId, moment.causeId],
    };
  }
  // A law in force (a story that it took effect): its policy by name, for
  // the lines that say what took effect.
  if (said.lawId && said.series) {
    const topic = said.series.slice(said.series.lastIndexOf(":") + P.one);
    const name = questionName(said.series) ?? storyTopicName(topic);
    if (name)
      facts.law = {
        text: name,
        sourceRecordIds: [said.lawId, moment.causeId],
      };
  }
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
  // What an offer asks in return (a vote, a contract): the lines about that favor need it.
  if (said.favor)
    facts[`favor-${said.favor}`] = {
      text: said.favor,
      sourceRecordIds: [moment.causeId],
    };
  // A printed story that runs against the person or their bill (press-desk.ts
  // recordNamed): the outlet that ran it, who wrote it, and what it is about.
  if (record?.kind === PRESS_STORY_EVENT) {
    const outlet = core.organizations.get(said.outletId ?? "");
    const cited = [moment.causeId, said.storyId ?? moment.causeId];
    if (outlet) {
      facts.outlet = {
        text: properName(outlet.name),
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
  // An outlet any other cause names (an invitation to an interview or a
  // debate), by name.
  if (record?.kind !== PRESS_STORY_EVENT && said.outletId) {
    const outlet = core.organizations.get(said.outletId);
    if (outlet)
      facts.outlet = {
        text: properName(outlet.name),
        sourceRecordIds: [moment.causeId, outlet.id],
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
  // A committee trade coming due on the floor (legislature.ts
  // recordPromises): the member promised their vote, and the lines about a
  // promised vote need it.
  if (record?.kind === "vote-promise")
    facts["your-promise"] = {
      text: said.traded ?? "",
      sourceRecordIds: [moment.causeId],
    };
  // A bill that lost a vote (legislature.ts recordFailure): the lines about a
  // lost vote need it, where it lost, and the count, against to for.
  if (record?.kind === "bill-failed") {
    const lost = { text: said.number ?? "", sourceRecordIds: [moment.causeId] };
    facts["bill-lost"] = lost;
    facts[said.stage === "committee" ? "lost-in-committee" : "lost-on-floor"] =
      lost;
    facts.tally = {
      text: `${said.no} to ${said.yes}`,
      sourceRecordIds: [moment.causeId],
    };
  }
  if (said.office)
    facts.office = {
      text: said.office,
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
  // What the relative has at stake in the run, from the household's records
  // (the cast rule chose them for it): the lines about money or time need it.
  const stake = type.stakes?.includes("household-money-or-time")
    ? stakeOf(core, askedId, moment.causeId, askerId)
    : null;
  for (const [key, fact] of Object.entries(stake?.facts ?? {}))
    facts[key] = { text: fact.text, sourceRecordIds: fact.recordIds };
  // In a race the asked lost, the winner is the opponent the scene may name.
  const winner = said.winnerId
    ? core.people.get(said.winnerId as PersonId)
    : undefined;
  if (winner && winner.id !== askedId)
    facts.opponent = {
      text: `${winner.givenName} ${winner.familyName}`,
      sourceRecordIds: [moment.causeId, winner.id],
    };
  // A race's result for the asked (the morning after): the lines for a
  // winner and for the one who lost differ.
  if (said.winnerId && said.contestId)
    facts[said.winnerId === askedId ? "won" : "lost"] = {
      text: "",
      sourceRecordIds: [moment.causeId],
    };
  // The winner's side of a count: how far ahead they finished, from the
  // result record's totals (votes, exact: a count is an integer).
  if (said.totals && said.winnerId === askedId) {
    const counts = Object.values(
      JSON.parse(said.totals) as Record<string, number>,
    ).sort((a, b) => b - a);
    const ahead = (counts[P.zero] ?? P.zero) - (counts[P.one] ?? P.zero);
    if (counts.length > P.one && ahead > P.zero)
      facts.lead = {
        text: `${ahead.toLocaleString("en-US")} ${ahead === P.one ? "vote" : "votes"}`,
        sourceRecordIds: [moment.causeId],
      };
  }

  if (record?.kind === "budget-line-changed")
    cutFacts(core, facts, said, moment.causeId, askerId);
  if (record?.kind === "bill-presented")
    deskFacts(core, facts, said, moment.causeId, askerId);

  const result = composeSceneTalk(
    core,
    director,
    { askerId, askedId },
    type,
    facts,
    {},
    options.includeHeld ? { includeHeld: true } : {},
  );
  if (result.kind !== "composed") return result;
  return {
    kind: "composed",
    scene: {
      typeKey: binding.typeKey,
      purpose: result.talk.purpose,
      askerId,
      askedId,
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
      talk: result.talk,
    },
  };
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
  if (yes + no > P.zero)
    facts.roll = {
      text: `${yes} to ${no}`,
      sourceRecordIds: [causeId, bill.id],
    };
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
  applyCoreEvent(core, {
    id,
    date: core.date,
    kind: "scene.reply",
    personIds: [scene.askedId, scene.askerId],
    placeId: core.people.get(scene.askedId)!.placeId,
    facts: {
      typeKey: scene.typeKey,
      causeId: scene.cause.id,
      move: line.move,
      line: line.text,
      ...(stakeKind ? { stake: stakeKind } : {}),
      ...(enlists && filingId ? { enlisted: filingId } : {}),
    },
    source: {
      tag: "SOURCED",
      citation: "Recorded scene: the reply the player chose to say.",
      asOf: core.date,
    },
  });
  // Talking is time together, recorded through the core's own writer.
  coreAPI(core).relationship(
    scene.askedId,
    scene.askerId,
    "contact",
    conversationRules.minutesPerExchange / P.minutesPerHour,
    undefined,
    { cause: "scene-reply", sourceId: id },
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
