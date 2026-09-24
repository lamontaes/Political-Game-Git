import { useState } from "react";
import {
  acceptSocialInvitation,
  declineSocialInvitation,
  invitationAtHostHome,
  socialInvitationsFor,
} from "./social-invitation";
import {
  invitationOpening,
  invitationNoticeLine,
  invitationScheduleLabel,
  SOCIAL_INVITATION_REPLIES,
} from "./social-invitation-language";
import type { EntityId, World } from "../simulation/types";

/** Feature-local Day/Work adapter; root placement remains UI-owned. */
export function SocialInvitationPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [lastAnswer, setLastAnswer] = useState<{
    readonly statement: string;
    readonly sequence: number;
    readonly date: string;
    readonly minuteOfDay: number;
  } | null>(null);
  const invitations = socialInvitationsFor(world, personId);
  const lastStatement =
    lastAnswer?.sequence === world.history.nextSequence &&
    lastAnswer.date === world.currentMoment.date &&
    lastAnswer.minuteOfDay === world.currentMoment.minuteOfDay
      ? lastAnswer.statement
      : null;
  if (invitations.length === 0 && lastStatement === null) return null;
  return (
    <section aria-label="Invitations">
      <h2>Invitations</h2>
      {invitations.map((invitation) => {
        const opening = invitationOpening(
          world,
          invitation.invitationEventId,
          personId,
        );
        const host = invitation.counterpartPersonId
          ? world.people[invitation.counterpartPersonId]
          : null;
        return (
          <article key={invitation.activityId}>
            <h3>
              {host && invitationAtHostHome(world, invitation)
                ? invitationNoticeLine(host.givenName, invitation.start.date)
                : invitation.title}
            </h3>
            <p>
              {invitationScheduleLabel(
                invitation.start,
                invitation.end,
                world.currentDate,
              )}
            </p>
            {opening ? (
              <blockquote>
                {host ? `${host.givenName}: ` : ""}“{opening}”
              </blockquote>
            ) : null}
            <button
              type="button"
              aria-label={`${SOCIAL_INVITATION_REPLIES.accept.intent}: ${invitation.title}`}
              onClick={() => {
                const next = acceptSocialInvitation(world, {
                  personId,
                  activityId: invitation.activityId,
                  revision: invitation.revision,
                });
                setLastAnswer({
                  statement: SOCIAL_INVITATION_REPLIES.accept.statement,
                  sequence: next.history.nextSequence,
                  date: next.currentMoment.date,
                  minuteOfDay: next.currentMoment.minuteOfDay,
                });
                onWorldChange(next);
              }}
            >
              {SOCIAL_INVITATION_REPLIES.accept.intent}
            </button>
            <button
              type="button"
              aria-label={`${SOCIAL_INVITATION_REPLIES.decline.intent}: ${invitation.title}`}
              onClick={() => {
                const next = declineSocialInvitation(world, {
                  personId,
                  activityId: invitation.activityId,
                  revision: invitation.revision,
                });
                setLastAnswer({
                  statement: SOCIAL_INVITATION_REPLIES.decline.statement,
                  sequence: next.history.nextSequence,
                  date: next.currentMoment.date,
                  minuteOfDay: next.currentMoment.minuteOfDay,
                });
                onWorldChange(next);
              }}
            >
              {SOCIAL_INVITATION_REPLIES.decline.intent}
            </button>
          </article>
        );
      })}
      {lastStatement ? <p aria-live="polite">“{lastStatement}”</p> : null}
    </section>
  );
}
