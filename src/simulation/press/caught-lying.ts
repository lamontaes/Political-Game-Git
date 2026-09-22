import { SOURCE_CONFIRMED_EVENT } from "../claim-contradictions";
import {
  CLAIM_CONTRADICTION_EVENT,
  CLAIM_EVIDENCE_TAG_PREFIX,
} from "../claim-stances";
import type { EntityId, HistoricalEvent, World } from "../types";
import { assignStory } from "./desk";
import { reporterIsCurrent, reporterRoles } from "./outlets";
import { discloseToReporter, negotiateGroundRules } from "./sources";
import { pressRecordByKey } from "./store";

const CAUGHT_LYING_KEY_PREFIX = "press46:caught-lying:";

function participant(event: HistoricalEvent, role: string): EntityId | null {
  return (
    event.participants.find((entry) => entry.role === role)?.personId ?? null
  );
}

/**
 * A reporter who finds that somebody lied to them has a story, and the person
 * who confirmed it has already agreed to contradict the liar on the record
 * (`claim-contradictions.ts`, `press.confirm-account`). Before this the
 * discovery stayed between the two of them: the reporter remembered it and
 * the relationship strained, and no reader ever heard of it (Washington
 * replay, 2026-09-22: four lies to a reporter, no consequence).
 *
 * This hands it to the ordinary desk: the source's on-record account becomes
 * a contribution at the reporter's outlet and opens a lead there, and the
 * desk's own rules decide whether and how it runs, asking the liar to respond
 * first. A mistake is not a story here, only a deliberate lie. What being
 * caught costs with voters is not decided here; it is filed as
 * `cost-of-being-caught-lying`.
 */
export function produceCaughtLyingLeads(world: World): World {
  let next = world;
  for (const found of world.history.events) {
    if (found.type !== CLAIM_CONTRADICTION_EVENT) continue;
    if (!found.tags.includes("claim.intent.deceive")) continue;
    const stableKey = `${CAUGHT_LYING_KEY_PREFIX}${found.id}`;
    if (pressRecordByKey(next, "source-agreement", stableKey)) continue;
    const reporterId = participant(found, "agency:discoverer");
    const speakerId = participant(found, "focus:subject");
    if (!reporterId || !speakerId) continue;
    const role = reporterRoles(next).find(
      (candidate) =>
        candidate.personId === reporterId && reporterIsCurrent(next, candidate),
    );
    if (!role) continue;
    const evidenceId = found.tags
      .find((tag) => tag.startsWith(CLAIM_EVIDENCE_TAG_PREFIX))
      ?.slice(CLAIM_EVIDENCE_TAG_PREFIX.length);
    const confirmed = next.history.events.find(
      (event) => event.id === evidenceId,
    );
    if (confirmed?.type !== SOURCE_CONFIRMED_EVENT) continue;
    const sourceId = participant(confirmed, "agency:source");
    const claim = next.history.claims.find(
      (row) => row.stableKey === `${confirmed.stableKey}:claim`,
    );
    if (!sourceId || !claim || !next.people[sourceId]) continue;
    const terms = negotiateGroundRules(next, {
      stableKey,
      outletId: role.outletId,
      reporterPersonId: reporterId,
      sourcePersonId: sourceId,
      leadId: null,
      terms: "on-record",
      attributionLabel: null,
    });
    next = terms.world;
    if (!terms.agreement) continue;
    const disclosed = discloseToReporter(next, {
      stableKey: `${stableKey}:account`,
      agreementId: terms.agreement.id,
      statement: claim.statement,
      disclosedEventIds: [],
      leakedEvidenceArtifactIds: [],
      subjectPersonIds: [speakerId],
      stance: null,
      worldTruth: "true",
      openLead: true,
      matterId: null,
    });
    next = disclosed.leadId
      ? assignStory(disclosed.world, disclosed.leadId)
      : disclosed.world;
  }
  return next;
}
