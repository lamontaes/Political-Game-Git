import { INBOX_REQUEST_ID, type ArtbenchProjection } from "./artbench";
import {
  artDeskCards,
  candidateDisplayName,
  viewedCandidateView,
} from "./art-desk-cards";

export interface ArtDeskNotification {
  readonly eventId: string;
  readonly requestId: string;
  readonly candidateId: string | null;
  readonly cardKey: string | null;
  readonly title: string;
  readonly text: string;
  readonly at: string;
  readonly authorId: string;
  readonly replyTo: string;
  readonly unread: boolean;
}

/** A view of accepted team replies, never a second inbox or an asset decision.
 * Read receipts use event IDs so a late imported reply cannot fall behind a
 * timestamp/sequence cursor and silently count as read. */
export function artDeskNotifications(
  projection: ArtbenchProjection,
  readEventIds: readonly string[] = [],
): readonly ArtDeskNotification[] {
  const read = new Set(readEventIds);
  const cards = artDeskCards(projection);
  return [...(projection.messages ?? [])]
    .filter((message) => {
      const request = projection.requests[message.payload.requestId];
      const candidate = message.payload.candidateId
        ? projection.candidates[message.payload.candidateId]
        : undefined;
      return (
        (message.actor.kind === "agent" || message.actor.kind === "worker") &&
        message.payload.kind === "reply" &&
        Boolean(message.payload.replyTo) &&
        request !== undefined &&
        !request.qa &&
        !candidate?.qa
      );
    })
    .sort((a, b) => b.seq - a.seq || a.eventId.localeCompare(b.eventId))
    .map((message) => {
      const { requestId, candidateId } = message.payload;
      const candidate = candidateId
        ? projection.candidates[candidateId]
        : undefined;
      const canonicalId = candidate?.aliasOf ?? candidateId;
      const card = cards.find(
        (item) =>
          item.requestId === requestId &&
          (!canonicalId ||
            item.leadCandidateId === canonicalId ||
            item.lineage.some((step) => step.candidateId === canonicalId) ||
            item.otherVersions.includes(canonicalId)),
      );
      return {
        eventId: message.eventId,
        requestId,
        candidateId: candidateId ?? null,
        cardKey: card?.key ?? null,
        title: card
          ? requestId === INBOX_REQUEST_ID &&
            candidate?.provenance.originalName
            ? candidateDisplayName(
                {
                  ...card,
                  baseTitle: `Artwork (${candidate.provenance.originalName})`,
                },
                candidate,
              )
            : viewedCandidateView(card, projection, candidateId ?? null).title
          : projection.requests[requestId]!.request.title,
        text: message.payload.text,
        at: message.at,
        authorId: message.actor.id,
        replyTo: message.payload.replyTo!,
        unread: !read.has(message.eventId),
      };
    });
}
