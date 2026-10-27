/**
 * A scene with a purpose, as play meets it, fired by the records. The director
 * has already fired the moment from its cause record and cast it (scheduling.ts);
 * this reads that binding, takes the facts the exchange may say from the cause
 * record and the cast, and has the exchange engine (scene-talk.ts) word it as
 * a tree the player taps through. It words nothing itself, and it says why:
 * the cause record, its kind and date, and every fact with the records it
 * came from.
 */
import { LEGISLATURE_MODULE_ID, billOf } from "../core2/modules/legislature";
import { P } from "../core2/parameters";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { spokenDesignation } from "../english/bill-names";
import conversationRules from "./data/conversation-rules.json" with { type: "json" };
import type { Director } from "./ledger";
import { SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";
import type { Moment } from "./types";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalk,
  type TreeNode,
  type TreeReply,
} from "./scene-talk";
import type { Fact } from "../english/scene-talk-words";
import {
  CAMPAIGNS_MODULE_ID,
  enlistVolunteer,
} from "../core2/modules/campaigns";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { stakeOf } from "./family-stake";
import { properName, spoken } from "./words";
import { PRESS_STORY_EVENT } from "../core2/press-desk";

export interface PurposeScene {
  typeKey: string;
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
  options: { includeHeld?: boolean; typeKey?: string } = {},
): PurposeSceneResult | null {
  const moment = director.ledger.people
    .get(personId)
    ?.momentsById.get(entry.momentId);
  if (!moment) return null;
  const bindings = entry.bindings.filter(
    (row) =>
      (TYPES.get(row.typeKey) as PurposeType | undefined)?.purpose &&
      (!options.typeKey || row.typeKey === options.typeKey),
  );
  let skipped: PurposeSceneResult | null = null;
  for (const binding of bindings) {
    const result = composeBinding(
      core,
      director,
      personId,
      moment,
      binding,
      options,
    );
    if (result.kind === "composed") return result;
    skipped ??= result;
  }
  return skipped;
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
  const type = TYPES.get(binding.typeKey) as PurposeType;
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
  // A bill the record names, by its number, and the section a trade added.
  if (said.number) {
    // Said as a clerk reads it: a bare number takes its form's word first.
    const bill =
      said.billId && core.modules.has(LEGISLATURE_MODULE_ID)
        ? billOf(coreAPI(core as CoreState), said.billId)
        : undefined;
    facts.bill = {
      text: spokenDesignation(said.number, bill?.form.kind ?? ""),
      sourceRecordIds: [said.billId ?? moment.causeId, moment.causeId],
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
  if (said.office)
    facts.office = {
      text: said.office,
      sourceRecordIds: [
        moment.causeId,
        ...(said.contestId ? [said.contestId] : []),
      ],
    };
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
  options: { includeHeld?: boolean } = {},
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
  const id = `scene-reply:${entry.momentId}:${path.join(".")}`;
  // Said once: the same reply again (a page reloaded) keeps the record.
  if (core.eventIds.has(id)) return id;
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
