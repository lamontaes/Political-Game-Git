import { describe, expect, it } from "vitest";
import {
  addDays,
  deserializeWorld,
  serializeWorld,
  publicPartyAffiliation,
} from "../simulation";
import { contactProposals, answerContact } from "../simulation/people-contact";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectPartyChapters } from "./party-chapter-surface";
import { askToMeet } from "./people-contacts";

describe("public chapter contact before membership", () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "w65-public-chapter-contact",
      startAge: 34,
    }),
  ).game!;
  const player = game.playerPersonId;
  it("discovers a public organizer and chapter channel without a personal number or introduction", () => {
    const before = serializeWorld(game.world);
    const chapters = projectPartyChapters(game.world, player);
    expect(chapters.length).toBeGreaterThan(0);
    for (const chapter of chapters) {
      expect(chapter.contact?.personId).toBe(chapter.organizer?.personId);
      expect(chapter.contact?.channels.map((row) => row.kind)).toEqual([
        "through-group",
      ]);
      expect(
        chapter.contact?.actions.find((row) => row.kind === "ask-to-meet")
          ?.available,
      ).toBe(true);
      expect(chapter.member).toBe(false);
      expect(chapter.meetings).toEqual([]);
    }
    expect(serializeWorld(game.world)).toBe(before);
  });
  it("keeps a first request and decline across save/load without moving, joining or recording attendance", () => {
    const chapter = projectPartyChapters(game.world, player)[0]!;
    const requested = askToMeet(game.world, {
      personId: player,
      otherPersonId: chapter.organizer!.personId,
      on: addDays(game.world.currentDate, 3),
      purpose: "Ask about local volunteering",
    });
    expect(requested.currentMoment).toEqual(game.world.currentMoment);
    expect(
      projectPartyChapters(requested, player)[0]!.contact?.outstanding
        ?.direction,
    ).toBe("you-asked");
    expect(
      projectPartyChapters(requested, player)[0]!.contact?.actions[0]!
        .available,
    ).toBe(false);
    const proposal = contactProposals(requested, player).find(
      (row) => row.toPersonId === chapter.organizer!.personId,
    )!;
    const declined = answerContact(requested, {
      proposalEventId: proposal.eventId,
      answer: "decline",
    }).world;
    const restored = deserializeWorld(serializeWorld(declined));
    expect(
      contactProposals(restored, player).find(
        (row) => row.eventId === proposal.eventId,
      )?.answered,
    ).toBe(true);
    expect(projectPartyChapters(restored, player)[0]!.member).toBe(false);
    expect(projectPartyChapters(restored, player)[0]!.meetings).toEqual([]);
    expect(publicPartyAffiliation(restored, player)).toBeNull();
    expect(restored.currentMoment).toEqual(game.world.currentMoment);
  });
});
