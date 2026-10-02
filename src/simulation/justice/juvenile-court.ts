import { lawInForce } from "../governing/law-in-force";
import { readJuvenileJurisdictionTerm } from "../law-consequences/legal-outcome";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import { propositionIdByKey } from "./pretrial";

const JUVENILE_COURT_QUESTION =
  "justice-public-safety.raise-juvenile-court-age";

/**
 * General adult jurisdiction begins after the law's inclusive juvenile ceiling.
 * A Boolean answer supplies no numeric age; unread amounts use labeled peer rules;
 * a younger person's adult transfer requires a separately saved authorized
 * decision, which this general-age reader does not infer.
 */
export function adultCourtAgeAt(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate = world.currentDate,
): number | null {
  return (
    juvenileCourtAgeRuleAt(world, jurisdictionId, onDate)?.adultAge ?? null
  );
}

/** Exact ceiling first; unread amounts use the CTO-requested peer mode.
 * The contributing rules are visible; no universal age or transfer is invented.
 */
export function juvenileCourtAgeRuleAt(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate = world.currentDate,
  proposedAnswer?: "yes" | "no",
) {
  if (onDate > world.currentDate) return null;
  const propositionId = propositionIdByKey(world, JUVENILE_COURT_QUESTION);
  const law = propositionId
    ? lawInForce(world, jurisdictionId, propositionId, onDate)
    : null;
  if (!law) return null;
  const questionKey =
    world.policyCatalog.propositions[propositionId!]?.stableKey;
  if (!questionKey) return null;
  const term = readJuvenileJurisdictionTerm(world, law, questionKey, onDate);
  if (
    !proposedAnswer &&
    term &&
    Number.isInteger(term.value) &&
    term.value >= 0
  )
    return {
      adultAge: term.value + 1,
      juvenileCeiling: term.value,
      estimated: false,
      sourceRecordIds: term.sourceRecordIds,
      contributors: [],
    };
  const questions = startingLaw.questions as unknown as Record<
    string,
    { answers: Record<string, unknown> }
  >;
  const peers: {
    jurisdictionId: EntityId;
    ceiling: number;
    sourceRecordIds: readonly EntityId[];
  }[] = [];
  for (const key of Object.keys(questions[questionKey]?.answers ?? {})) {
    const peerJurisdiction = stateJurisdictionForKey(key);
    if (!peerJurisdiction || peerJurisdiction.id === jurisdictionId) continue;
    const peerLaw = lawInForce(
      world,
      peerJurisdiction.id,
      propositionId!,
      onDate,
    );
    if (!peerLaw || peerLaw.answer !== (proposedAnswer ?? law.answer)) continue;
    const peer = readJuvenileJurisdictionTerm(
      world,
      peerLaw,
      questionKey,
      onDate,
    );
    if (peer && Number.isSafeInteger(peer.value) && peer.value >= 0)
      peers.push({
        jurisdictionId: peerJurisdiction.id,
        ceiling: peer.value,
        sourceRecordIds: peer.sourceRecordIds,
      });
  }
  const counts = new Map<number, number>();
  for (const peer of peers)
    counts.set(peer.ceiling, (counts.get(peer.ceiling) ?? 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0]![1] === ranked[1]?.[1]) return null;
  const ceiling = ranked[0]![0];
  return {
    adultAge: ceiling + 1,
    juvenileCeiling: ceiling,
    estimated: true,
    sourceRecordIds: peers.flatMap((peer) => peer.sourceRecordIds),
    contributors: peers,
  };
}
