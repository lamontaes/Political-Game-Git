import {
  declineSocialInvitation,
  socialInvitationsFor,
} from "./social-invitation";
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
  const invitations = socialInvitationsFor(world, personId);
  if (invitations.length === 0) return null;
  return (
    <section aria-label="Invitations">
      <h2>Invitations</h2>
      {invitations.map((invitation) => (
        <article key={invitation.activityId}>
          <h3>{invitation.title}</h3>
          <p>
            {invitation.start.date} · Attendance is optional. You have not
            answered.
          </p>
          <button
            type="button"
            aria-label={`Decline invitation: ${invitation.title}`}
            onClick={() =>
              onWorldChange(
                declineSocialInvitation(world, {
                  personId,
                  activityId: invitation.activityId,
                  revision: invitation.revision,
                }),
              )
            }
          >
            Decline invitation
          </button>
        </article>
      ))}
    </section>
  );
}
