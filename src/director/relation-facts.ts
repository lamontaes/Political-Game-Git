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
  sharedHoursBetween,
} from "../core2/closeness";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
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
  /** The record that makes them kin or housemates (the household or the family tie), if either. */
  kinSource: string | null;
  /** A tie on record at or past the closeness threshold, quarrel or not. */
  close: boolean;
  /** Friend (nearer full closeness than none) or rival (last contact a quarrel). */
  side: "friend" | "rival" | null;
  /** The tie record the side or closeness rests on, if any. */
  tieId: string | null;
  /** What earlier scene replies between the two left: ids of the `scene.reply` records, by what they say. */
  passed: {
    /** The asker came to the asked before, in an earlier scene. */
    askedBefore: string[];
    /** The asked person's answer to the asker then was help. */
    helpedBefore: string[];
    /** The asked person's answer to the asker then was a refusal. */
    refusedBefore: string[];
  };
}

const PASSED = rulesFile.passedBetween;

/**
 * What earlier scene replies between two people say: who came to whom and how
 * the one asked answered (a `scene.reply` names the player first; its `asked`
 * fact is there only where the player asked, and its `move` is the answerer's).
 */
function passedBetween(
  core: Readonly<CoreState>,
  askerId: PersonId,
  askedId: PersonId,
): RelationFacts["passed"] {
  const passed: RelationFacts["passed"] = {
    askedBefore: [],
    helpedBefore: [],
    refusedBefore: [],
  };
  const ids = core.logByKind.get("scene.reply");
  if (!ids) return passed;
  for (const id of ids) {
    const event = core.durableLog.get(id);
    if (!event) continue;
    if (event.date >= core.date) continue;
    const [first, second] = event.personIds;
    if (!first || !second) continue;
    if (!(
      (first === askerId && second === askedId) ||
      (first === askedId && second === askerId)
    ))
      continue;
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
    if (move && PASSED.refused.includes(move)) passed.refusedBefore.push(id);
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
  if (knows) {
    if (family || shared) metBefore = true;
    else {
      const learned = asked?.knownIdSources?.[askerId]?.learnedAt;
      if (learned !== undefined) metBefore = learned < core.date;
      else {
        const seen = lastContact(core, askedId, askerId);
        metBefore = !!seen && seen.date < core.date;
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
    side,
    tieId: tie ? tieId : null,
    passed: passedBetween(core, askerId, askedId),
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
