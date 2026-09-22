import { describe, expect, it } from "vitest";
import {
  CHAPTER_INVITATION_EVENT,
  CHAPTER_MEMBERSHIP_KIND,
  acceptChapterInvitation,
  homePartyChapters,
  joinPartyChapter,
  leavePartyChapter,
  projectPartyEncounters,
  publicPartyAffiliation,
  scheduledActivityState,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { recordOrganizationParticipationState } from "../simulation/life";
import { organizationParticipationStateAt } from "../simulation/life-queries";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { passOrdinaryDays } from "./ordinary-life";
import { declineVenueActivity } from "./scheduled-activity-choice";
import { attendChapterMeeting } from "./party-chapter-actions";

function adultLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
}

type Offer = ReturnType<
  typeof projectPartyEncounters
>[number]["activities"][number];

/** Passes ordinary days one at a time, as a player pressing Next Day would. */
function passUntilOffered(
  world: World,
  personId: EntityId,
  maxDays = 40,
): { world: World; chapterId: EntityId; offer: Offer } | null {
  let current = world;
  for (let day = 0; day < maxDays; day += 1) {
    current = passOrdinaryDays(current, 1, { stopForTentativeHolds: true });
    for (const encounter of projectPartyEncounters(current, personId)) {
      const offer = encounter.activities.find((a) => a.state === "offered");
      if (offer)
        return {
          world: current,
          chapterId: encounter.chapterOrganizationId,
          offer,
        };
    }
  }
  return null;
}

describe("ALIVE43 W2 home party chapters and organizer encounters", () => {
  const life = adultLife("alive43-w2-a");
  const player = life.playerPersonId;

  it("opens with both parties' home chapters, each with a persistent local organizer", () => {
    const chapters = homePartyChapters(life.world);
    expect(chapters.map((c) => c.partyKey)).toEqual([
      "democratic",
      "republican",
    ]);
    for (const chapter of chapters) {
      expect(chapter.organizerPersonId).not.toBeNull();
      const organizer = life.world.people[chapter.organizerPersonId!]!;
      expect(organizer.homeJurisdictionId).toBe(
        life.world.people[player]!.homeJurisdictionId,
      );
      // Organizers are affiliated; the player is not enrolled in anything.
      expect(publicPartyAffiliation(life.world, organizer.id)).toBe(
        chapter.partyOrganizationId,
      );
    }
    expect(publicPartyAffiliation(life.world, player)).toBeNull();
    expect(
      projectPartyEncounters(life.world, player).every(
        (e) => e.activities.length === 0 && e.playerParticipation === null,
      ),
    ).toBe(true);
  });

  it("an organizer invites during ordinary time without the player asking", () => {
    const offered = passUntilOffered(life.world, player)!;
    expect(offered).not.toBeNull();
    const invitation = offered.world.history.events.find(
      (e) => e.id === offered.offer.invitationEventId,
    )!;
    expect(invitation.type).toBe(CHAPTER_INVITATION_EVENT);
    const chapter = homePartyChapters(offered.world).find(
      (c) => c.organizationId === offered.chapterId,
    )!;
    expect(
      invitation.participants.find((p) => p.role === "agency:asked")?.personId,
    ).toBe(chapter.organizerPersonId);
    // The player heard it from the organizer; nothing else was recorded for them.
    const knowledge = offered.world.history.knowledge.find(
      (k) => k.eventId === invitation.id && k.personId === player,
    )!;
    expect(knowledge.source).toMatchObject({
      kind: "told-by",
      sourcePersonId: chapter.organizerPersonId,
    });
    expect(
      offered.world.history.organizationParticipations.some(
        (p) => p.personId === player && p.kind === CHAPTER_MEMBERSHIP_KIND,
      ),
    ).toBe(false);
    // Projection is pure.
    const before = serializeWorld(offered.world);
    projectPartyEncounters(offered.world, player);
    expect(serializeWorld(offered.world)).toBe(before);
  });

  it("decline releases the hold, and the same organizer asks again later", () => {
    const offered = passUntilOffered(life.world, player)!;
    const organizerId = homePartyChapters(offered.world).find(
      (c) => c.organizationId === offered.chapterId,
    )!.organizerPersonId;
    const declined = declineVenueActivity(
      offered.world,
      player,
      offered.offer.activityId,
    );
    const state = projectPartyEncounters(declined, player)
      .find((e) => e.chapterOrganizationId === offered.chapterId)!
      .activities.find((a) => a.activityId === offered.offer.activityId)!;
    expect(state.state).toBe("declined");
    expect(declined.history.relationshipInteractions.length).toBe(
      offered.world.history.relationshipInteractions.length,
    );
    let later = declined;
    let again: Offer | undefined;
    for (let day = 0; day < 70 && !again; day += 1) {
      later = passOrdinaryDays(later, 1, { stopForTentativeHolds: true });
      again = projectPartyEncounters(later, player)
        .find((e) => e.chapterOrganizationId === offered.chapterId)
        ?.activities.find(
          (a) =>
            a.state === "offered" && a.activityId !== offered.offer.activityId,
        );
      if (!again) {
        const other = projectPartyEncounters(later, player).flatMap((e) =>
          e.activities.filter((a) => a.state === "offered"),
        )[0];
        if (other)
          later = declineVenueActivity(later, player, other.activityId);
      }
    }
    expect(again).toBeDefined();
    const inviter = later.history.events
      .find((e) => e.id === again!.invitationEventId)!
      .participants.find((p) => p.role === "agency:asked")!.personId;
    expect(inviter).toBe(organizerId);
  }, 60_000);

  it("accept makes a commitment, attending meets the same organizer, and nothing is joined", () => {
    const offered = passUntilOffered(life.world, player)!;
    const accepted = acceptChapterInvitation(
      offered.world,
      player,
      offered.offer.activityId,
    );
    const encounter = projectPartyEncounters(accepted, player).find(
      (e) => e.chapterOrganizationId === offered.chapterId,
    )!;
    const commitment = encounter.activities.find(
      (a) => a.state === "accepted",
    )!;
    expect(commitment).toBeDefined();
    // The day skip stops at a promise instead of stepping over it.
    let waited = accepted;
    for (let day = 0; day < 10; day += 1) {
      const next = passOrdinaryDays(waited, 1);
      if (next === waited) break;
      waited = next;
      if (
        scheduledActivityState(waited, commitment.activityId).status !==
        "scheduled"
      )
        break;
    }
    expect(scheduledActivityState(waited, commitment.activityId).status).toBe(
      "scheduled",
    );
    const attended = attendChapterMeeting(
      waited,
      player,
      commitment.activityId,
    );
    expect(scheduledActivityState(attended, commitment.activityId).status).toBe(
      "completed",
    );
    const after = projectPartyEncounters(attended, player).find(
      (e) => e.chapterOrganizationId === offered.chapterId,
    )!;
    expect(
      after.activities.find((a) => a.activityId === commitment.activityId)
        ?.state,
    ).toBe("attended");
    const met = attended.history.relationshipInteractions.at(-1)!;
    expect(met.personIds).toEqual([player, encounter.organizerPersonId]);
    expect(met.change).toBe("formed");
    expect(after.playerParticipation).toBeNull();
    expect(publicPartyAffiliation(attended, player)).toBeNull();
  }, 60_000);

  it("joining is explicit and exclusive, and leaving keeps the record", () => {
    const [first, second] = homePartyChapters(life.world);
    const joined = joinPartyChapter(life.world, player, first!.organizationId);
    expect(
      projectPartyEncounters(joined, player).find(
        (e) => e.chapterOrganizationId === first!.organizationId,
      )!.playerParticipation,
    ).not.toBeNull();
    // Chapter membership is not a public party affiliation or registration.
    expect(publicPartyAffiliation(joined, player)).toBeNull();
    expect(joinPartyChapter(joined, player, second!.organizationId)).toBe(
      joined,
    );
    const left = leavePartyChapter(joined, player, first!.organizationId);
    expect(
      projectPartyEncounters(left, player).every(
        (e) => e.playerParticipation === null,
      ),
    ).toBe(true);
    expect(
      left.history.organizationParticipations.filter(
        (p) => p.personId === player && p.kind === CHAPTER_MEMBERSHIP_KIND,
      ),
    ).toHaveLength(1);
    expect(joinPartyChapter(left, player, second!.organizationId)).not.toBe(
      left,
    );
  });

  it("an unanswered invitation lapses without penalty while the world continues", () => {
    const offered = passUntilOffered(life.world, player)!;
    const lapsed = passOrdinaryDays(offered.world, 14);
    const state = projectPartyEncounters(lapsed, player)
      .flatMap((e) => e.activities)
      .find((a) => a.activityId === offered.offer.activityId)!;
    // Lapsed specifically, not declined. The player was never shown this
    // invitation and never answered it; time ran past it. It used to record
    // a refusal against their name, which is what this now proves it does not.
    expect(state.state).toBe("lapsed");
    expect(lapsed.history.relationshipInteractions.length).toBe(
      offered.world.history.relationshipInteractions.length,
    );
    expect(lapsed.currentDate > offered.world.currentDate).toBe(true);
  });

  it("negative control: a chapter with no active organizer does not reach out", () => {
    let current = life.world;
    for (const chapter of homePartyChapters(life.world)) {
      const role = current.history.organizationParticipations.find(
        (p) =>
          p.personId === chapter.organizerPersonId &&
          p.organizationId === chapter.organizationId,
      )!;
      const state = organizationParticipationStateAt(current, role.id)!;
      current = recordOrganizationParticipationState(current, {
        stableKey: `${role.stableKey}:probe-ended`,
        participationId: role.id,
        effectiveAt: current.currentDate,
        status: "ended",
        roleKind: state.roleKind,
        context: "Stepped down.",
        provenance: { kind: "authored", note: "Negative-control fixture." },
        supersedesStateId: state.id,
      });
    }
    expect(
      homePartyChapters(current).every((c) => c.organizerPersonId === null),
    ).toBe(true);
    for (let day = 0; day < 20; day += 1)
      current = passOrdinaryDays(current, 1);
    expect(
      current.history.events.some((e) => e.type === CHAPTER_INVITATION_EVENT),
    ).toBe(false);
  });

  it("old-save control: a pre-W2 save has no chapters and still passes time", () => {
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "alive43-w2-old",
      startAge: 34,
    });
    const old = establishOpeningOfficeholders(
      created.world,
      created.playerPersonId,
    );
    expect(homePartyChapters(old)).toEqual([]);
    const advanced = passOrdinaryDays(old, 21);
    expect(homePartyChapters(advanced)).toEqual([]);
    expect(
      advanced.history.events.some((e) => e.type === CHAPTER_INVITATION_EVENT),
    ).toBe(false);
  });
});
