/**
 * How two people stand, read once from the records (owner, Nov 15, part 1c:
 * one reader for the talk box, the scenes and the Journal). `askerId` is the
 * one who comes to the other (the player calling, the one who asks in a
 * scene); `askedId` is the one who answers. Kin, acquaintance, closeness and
 * the side of the tie all come from here; nothing else re-reads them.
 */
import {
  closenessBetween,
  lastMetOnRow,
  firstTogetherInRecords,
  metThrough,
  sharedHoursBetween,
} from "../core2/closeness";
import { P } from "../core2/parameters";
import type { CoreEventInput, CoreState, PersonId } from "../core2/types";
import type { Ledger } from "./types";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };

export interface RelationFacts {
  /** Family of the asked, partners excepted. */
  kin: boolean;
  /** A partner of the asked: neither kin nor a stranger. */
  partners: boolean;
  /** The asked knows the asker at all (or they are partners). */
  acquainted: boolean;
  /** The asked knew the asker before today: kin, or learned of them earlier. */
  metBefore: boolean;
  /**
   * Which record made `metBefore` (dev mode's trace): family, shared hours on a body's sittings or
   * an executive's meetings, the asked's own record of the asker (`knownIdSources`), or a tie's
   * last day together; null when they have not met.
   */
  metBy: "family" | "sittings" | "learned" | "together" | null;
  /** That record: the fact the asked learned of the asker from, the tie, or the sitting both first sat; null for family. */
  metSource: { readonly id: string; readonly date: string } | null;
  /** The record that makes them kin or housemates (the household or the family tie), if either. */
  kinSource: string | null;
  /** A tie on record at or past the closeness threshold, quarrel or not. */
  close: boolean;
  /** Friend (nearer full closeness than none) or rival (last contact a quarrel). */
  side: "friend" | "rival" | null;
  /** The tie record the side or closeness rests on, if any. */
  tieId: string | null;
}

const PASSED = rulesFile.passedBetween;

/** Whether a scene reply's move is a refusal (scene-talk-rules.json passedBetween.refused): the one list every reader of a no uses. */
export function isRefusal(move: string | undefined): boolean {
  return !!move && PASSED.refused.includes(move);
}

/** The record kind every scene's reply is written as. */
export const SCENE_REPLY = "scene.reply";

/** What earlier scene replies between two people left (passedBetween). */
export interface PassedBetween {
  /** The asker came to the asked before, in an earlier scene. */
  askedBefore: string[];
  /** The asked person's answer to the asker then was help. */
  helpedBefore: string[];
  /** The asked person's answer to the asker then was a refusal. */
  refusedBefore: string[];
}

/** Files a scene reply under both people it names, as it is recorded (the ledger's onEvent). */
export function indexReply(
  ledger: Pick<Ledger, "repliesByPlayer">,
  event: Pick<CoreEventInput, "id" | "personIds">,
): void {
  const [first, second] = event.personIds;
  if (!first || !second) return;
  for (const [one, other] of [
    [first, second],
    [second, first],
  ] as const) {
    let byOther = ledger.repliesByPlayer.get(one);
    if (!byOther) ledger.repliesByPlayer.set(one, (byOther = new Map()));
    const ids = byOther.get(other);
    if (ids) ids.push(event.id);
    else byOther.set(other, [event.id]);
  }
}

/**
 * What earlier scene replies between two people say: who came to whom and how
 * the one asked answered (a `scene.reply` names the player first; its `asked`
 * fact is there only where the player asked, and its `move` is the answerer's).
 * Reads only the two people's own replies, from the ledger's index.
 */
export function passedBetween(
  ledger: Pick<Ledger, "repliesByPlayer">,
  core: Readonly<CoreState>,
  askerId: PersonId,
  askedId: PersonId,
): PassedBetween {
  const passed: PassedBetween = {
    askedBefore: [],
    helpedBefore: [],
    refusedBefore: [],
  };
  for (const id of ledger.repliesByPlayer.get(askerId)?.get(askedId) ?? []) {
    const event = core.durableLog.get(id);
    if (!event) continue;
    if (event.date >= core.date) continue;
    const [first, second] = event.personIds;
    if (!first || !second) continue;
    const playerAsked = event.facts?.asked !== undefined;
    const recordAsker = playerAsked ? first : second;
    if (recordAsker !== askerId) continue;
    passed.askedBefore.push(id);
    const move = event.facts?.move;
    // A promise is help only once an engine's record says it was done: an
    // ending that keeps a promise counts when it also settled as help
    // (office hours: the case row is helped); other helping moves count as said.
    const kept =
      event.facts?.keeps !== "promise" || event.facts?.settled === "help";
    if (move && PASSED.helped.includes(move) && kept)
      passed.helpedBefore.push(id);
    if (isRefusal(move)) passed.refusedBefore.push(id);
  }
  return passed;
}

export function lastContact(
  core: Readonly<CoreState>,
  personId: PersonId,
  otherId: PersonId,
): { date: string; tieId: string } | null {
  let best: { date: string; tieId: string } | null = null;
  for (const id of core.relationshipsByPerson.get(personId) ?? []) {
    const row = core.relationships.get(id)!;
    if (row.actorId !== otherId && row.otherId !== otherId) continue;
    // The day they were last together, not the day a change made apart
    // (a veto, an answer to the whip) moved the tie.
    const met = lastMetOnRow(row);
    if (met !== null && (!best || met > best.date))
      best = { date: met, tieId: id };
  }
  return best;
}

/** One record that says two people met, by arm, with its date. */
export interface MetRecord {
  readonly by: "sittings" | "learned" | "together";
  readonly id: string;
  readonly date: string;
}

/**
 * Every record that says the player (`askedId`) met `askerId`, by the
 * same arms `relationFacts` reads, each with its own date: the player's
 * record of learning of them (`knownIdSources`), the meeting the core wrote
 * when they met in person (`person:<id>:met`), the first sitting both sat
 * (the shared-hours readers), and their tie's last day together (a bound on
 * the first), earliest first. `by` names the arm. For dev mode's trace of a scene already
 * played, which asks whether they had met by the scene's day.
 */
export function metRecords(
  core: Readonly<CoreState>,
  askerId: PersonId,
  askedId: PersonId,
): readonly MetRecord[] {
  const asked = core.people.get(askedId);
  const found: MetRecord[] = [];
  const learned = asked?.knownIdSources?.[askerId];
  if (learned)
    found.push({
      by: "learned",
      id: learned.sourceFactId,
      date: learned.learnedAt,
    });
  const metFact = core.knowledgeByPerson
    .get(askedId)
    ?.get(`person:${askerId}:met`);
  if (metFact)
    found.push({
      by: "together",
      id: metFact.sourceId,
      date: metFact.learnedAt,
    });
  const sat = firstTogetherInRecords(core, askerId, askedId);
  if (sat) found.push({ by: "sittings", id: sat.sourceId, date: sat.date });
  const seen = lastContact(core, askedId, askerId);
  if (seen) found.push({ by: "together", id: seen.tieId, date: seen.date });
  return found.sort((x, y) => x.date.localeCompare(y.date));
}

export function relationFacts(
  core: Readonly<CoreState>,
  askerId: PersonId,
  askedId: PersonId,
): RelationFacts {
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  const partners = [...core.familyLinks.values()].some(
    (link) =>
      link.kind === "partner" &&
      link.personIds.includes(askerId) &&
      link.personIds.includes(askedId),
  );
  const family = !!asked?.familyIds.has(askerId);
  // Time another engine's record says the two shared (the sittings of a
  // body, an executive's signings and leaders' meetings) is having met.
  const shared = sharedHoursBetween(core, askerId, askedId) > P.zero;
  const knows = !!asked?.knownIds.has(askerId) || shared;
  let metBefore = false;
  let metBy: RelationFacts["metBy"] = null;
  let metSource: RelationFacts["metSource"] = null;
  if (knows) {
    if (family || shared) {
      metBefore = true;
      metBy = family ? "family" : "sittings";
      // The record the two first shared time in (a body's first sitting both sat), or their tie.
      const through = family ? null : metThrough(core, askerId, askedId);
      if (through) metSource = { id: through.sourceId, date: through.date };
    } else {
      const learned = asked?.knownIdSources?.[askerId];
      if (learned !== undefined) {
        metBefore = learned.learnedAt < core.date;
        if (metBefore) {
          metBy = "learned";
          metSource = { id: learned.sourceFactId, date: learned.learnedAt };
        }
      } else {
        const seen = lastContact(core, askedId, askerId);
        metBefore = !!seen && seen.date < core.date;
        if (metBefore) {
          metBy = "together";
          metSource = { id: seen!.tieId, date: seen!.date };
        }
      }
    }
  }
  const tieId =
    askerId < askedId ? `${askerId}:${askedId}` : `${askedId}:${askerId}`;
  const tie = core.relationships.get(tieId);
  const close =
    !!tie &&
    closenessBetween(core, askerId, askedId) >=
      rulesFile.tieSides.friendCloseness.value;
  let side: RelationFacts["side"] = null;
  if (tie) {
    if ((tie.latestChange?.requestedChange ?? P.zero) < P.zero) side = "rival";
    else if (close) side = "friend";
  }
  let kinSource: string | null = null;
  if (asker && asked && asker.householdId === asked.householdId)
    kinSource = asker.householdId;
  else
    for (const id of core.relationshipsByPerson.get(askerId) ?? []) {
      const row = core.relationships.get(id)!;
      if (
        row.kind === "family" &&
        (row.actorId === askedId || row.otherId === askedId)
      ) {
        kinSource = id;
        break;
      }
    }
  return {
    kin: family && !partners,
    partners,
    kinSource,
    close,
    acquainted: knows || partners,
    metBefore,
    metBy,
    metSource,
    side,
    tieId: tie ? tieId : null,
  };
}

/** Which side of their tie two people stand (the Journal, scenes and the talk box read it alike). */
export function tieSide(
  core: Readonly<CoreState>,
  aId: PersonId,
  bId: PersonId,
): { side: "friend" | "rival"; tieId: string } | null {
  const facts = relationFacts(core, aId, bId);
  return facts.side && facts.tieId
    ? { side: facts.side, tieId: facts.tieId }
    : null;
}
