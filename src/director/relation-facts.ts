/**
 * How two people stand, read once from the records (owner, Nov 15, part 1c:
 * one reader for the talk box, the scenes and the Journal). `askerId` is the
 * one who comes to the other (the player calling, the one who asks in a
 * scene); `askedId` is the one who answers. Kin, acquaintance, closeness and
 * the side of the tie all come from here; nothing else re-reads them.
 */
import { closenessBetween } from "../core2/closeness";
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
    if (!best || row.lastContactDate > best.date)
      best = { date: row.lastContactDate, tieId: id };
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
  const knows = !!asked?.knownIds.has(askerId);
  let metBefore = false;
  if (knows) {
    if (family) metBefore = true;
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
