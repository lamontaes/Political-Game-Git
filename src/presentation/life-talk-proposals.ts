import type { EntityId, World } from "../simulation";
type WorldEvent = World["history"]["events"][number];

const DETAILS = "life.proposal.v1:";
export const PROPOSAL_LINK = "life.proposal:";
export type TalkActivity = "new-game" | "familiar-game" | "game" | "quiet";
export interface TalkProposalTerms {
  readonly actorPersonId: EntityId;
  readonly activity: TalkActivity;
  readonly minutes: 30;
  readonly condition: null;
}
export const TALK_ACTIVITY_LABELS: Readonly<Record<TalkActivity, string>> = {
  "new-game": "try a new game together",
  "familiar-game": "play a game you both know",
  game: "play a game together",
  quiet: "sit and talk together",
};
export function talkProposalTag(terms: TalkProposalTerms): string {
  return `${DETAILS}${JSON.stringify(terms)}`;
}
function termsFor(event: WorldEvent): TalkProposalTerms | null {
  const tags = event.tags.filter((tag) => tag.startsWith(DETAILS));
  if (tags.length !== 1) return null;
  try {
    const value = JSON.parse(
      tags[0]!.slice(DETAILS.length),
    ) as Partial<TalkProposalTerms>;
    return typeof value.actorPersonId === "string" &&
      value.activity &&
      Object.hasOwn(TALK_ACTIVITY_LABELS, value.activity) &&
      value.minutes === 30 &&
      value.condition === null
      ? (value as TalkProposalTerms)
      : null;
  } catch {
    return null;
  }
}

/** A proposal is the saved speaker's actual offer, not a new willingness draw.
 * Unknown legacy terms stay unknown. Responses refer to the exact offer. */
export function currentTalkProposal(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  // Authored event ID or a quiet-room context key; never asserted as a new event.
  sceneId: string,
) {
  const offers = world.history.events.filter(
    (event) =>
      event.type === "life.conversation" &&
      event.tags.includes(`scene:${sceneId}`) &&
      event.participants.some(
        (p) => p.personId === playerPersonId && p.role === "focus:subject",
      ) &&
      event.participants.some(
        (p) => p.personId === personId && p.role === "coordination:counterpart",
      ),
  );
  const request = offers
    .filter((event) => termsFor(event)?.actorPersonId === personId)
    .at(-1);
  if (!request) return null;
  const terms = termsFor(request)!;
  const response = offers
    .filter((event) => event.tags.includes(`${PROPOSAL_LINK}${request.id}`))
    .at(-1);
  const status = response?.tags.includes("life.proposal.performed")
    ? "performed"
    : response?.tags.includes("life.proposal.cancelled")
      ? "cancelled"
      : response?.tags.includes("life.proposal.declined")
        ? "declined"
        : response?.tags.includes("life.proposal.accepted") ||
            request.tags.includes("life.proposal.accepted")
          ? "accepted"
          : "proposed";
  return {
    request,
    terms,
    response,
    status,
    label: TALK_ACTIVITY_LABELS[terms.activity],
  } as const;
}
