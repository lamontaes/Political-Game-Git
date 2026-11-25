/**
 * The player's party asks them to its meetings, and only their own answer puts them in the room (owner,
 * Nov 16: "Work for someone else's campaign, a party committee or an appointed board until a race
 * opens"; crew list #9747, item 3a). A player who joins a party is invited to the committee's next
 * meeting through a `party-meeting-invited` record; a yes in the scene puts them among that meeting's
 * attendees, and a no keeps them home. The meeting no longer weighs the player's lean for them.
 * Drawn places (skill drawn-place-tests), named with their seeds.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { applyCoreEvent, coreAPI } from "../state";
import type { CoreState } from "../types";
import {
  PARTY_MEETING_INVITED,
  joinParty,
  partiesHere,
  partyMeetings,
} from "./parties";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`parties-player-meeting:${Date.now()}`)
    .digest("hex");

function world(salt: string) {
  setBookkeeping(false);
  const place = drawPlace(runSeed, salt);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    core,
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

const invitesFor = (core: CoreState) =>
  [...core.durableLog.values()].filter(
    (e) =>
      e.kind === PARTY_MEETING_INVITED && e.facts?.askedId === core.playerId,
  );

/** The player joins the town's largest party, answers its invitation and lives to the meeting. */
function meetingAfter(core: CoreState, move: string) {
  const api = coreAPI(core);
  const party = [...partiesHere(api)].sort(
    (a, b) => b.share - a.share || a.id.localeCompare(b.id),
  )[0]!;
  joinParty(api, core.playerId!, party.id);
  const invites = invitesFor(core);
  const invite = invites[0];
  if (invite)
    applyCoreEvent(core, {
      id: `scene-reply:test:${invite.id}:${move}`,
      date: core.date,
      kind: "scene.reply",
      personIds: [...invite.personIds],
      placeId: core.people.get(core.playerId!)!.placeId,
      facts: { typeKey: "party-meeting-invite", causeId: invite.id, move },
      source: { tag: "SOURCED", citation: "test", asOf: core.date },
    });
  const date = String(invite?.facts?.meetingDate ?? "");
  if (date) advanceCore(core, date);
  const meeting = partyMeetings(api, party.id).find((m) => m.date === date);
  return { invites, meeting };
}

describe("the player's party meeting", () => {
  it("invites the player who joins, and a yes puts them in the room", () => {
    const { core, where } = world("party-meeting:yes");
    const { invites, meeting } = meetingAfter(core, "agree");
    expect(invites, `${where}: invited once`).toHaveLength(1);
    expect(meeting, `${where}: the meeting was held`).toBeTruthy();
    expect(meeting!.attendeeIds, where).toContain(core.playerId);
    console.log(
      `party meeting, yes: ${where}; ${meeting!.attendeeIds.length} in the room`,
    );
  }, 600_000);

  it("a no keeps the player home", () => {
    const { core, where } = world("party-meeting:no");
    const { invites, meeting } = meetingAfter(core, "decline");
    expect(invites, `${where}: invited once`).toHaveLength(1);
    expect(meeting, `${where}: the meeting was held`).toBeTruthy();
    expect(meeting!.attendeeIds, where).not.toContain(core.playerId);
    console.log(`party meeting, no: ${where}`);
  }, 600_000);
});
