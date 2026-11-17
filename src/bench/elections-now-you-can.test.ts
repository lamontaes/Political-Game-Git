// @vitest-environment node
/**
 * Elections offers something on day one (owner, Nov 16: "There's not much I can do since I can't run
 * for anything"; his answer: "Work for someone else's campaign, a party committee or an appointed board
 * until a race opens"; crew list #9747, item 3a). On a new life's first day, before any filing window
 * opens, the Elections page's data names the parties here to join with their committee's next meeting
 * day; once the player joins one, it names that party alone, still with the day. A drawn place (skill
 * drawn-place-tests), named with its seed.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { joinParty } from "../core2/modules/parties";
import { localRaces } from "./government";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`elections-now-you-can:${Date.now()}`)
    .digest("hex");

interface Now {
  parties: {
    partyId: string;
    name: string;
    member: boolean;
    meets: string | null;
  }[];
  campaigns: unknown[];
}

describe("Elections on day one", () => {
  it("offers the parties to join with their next meeting, then the player's own", () => {
    setBookkeeping(false);
    const place = drawPlace(runSeed, "elections-now-you-can");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      warmUpDays: OPENING_WARMUP_DAYS,
    });
    const first = (localRaces(core) as unknown as { nowYouCan: Now }).nowYouCan;
    expect(
      first,
      `${where}: Elections names what the player can do now`,
    ).toBeTruthy();
    expect(first.parties.length, `${where}: parties to join`).toBeGreaterThan(
      0,
    );
    for (const party of first.parties) {
      expect(party.member, `${where}: ${party.name}`).toBe(false);
      expect(party.meets, `${where}: ${party.name} meets`).toBeTruthy();
      expect(party.meets! >= core.date, `${where}: a day still to come`).toBe(
        true,
      );
    }
    joinParty(coreAPI(core), core.playerId!, first.parties[0]!.partyId);
    const after = (localRaces(core) as unknown as { nowYouCan: Now }).nowYouCan;
    expect(after.parties, where).toHaveLength(1);
    expect(after.parties[0]!.member, where).toBe(true);
    expect(after.parties[0]!.meets, where).toBe(first.parties[0]!.meets);
    console.log(
      `now you can: ${where}: ${first.parties.map((p) => p.name).join(", ")}; meets ${first.parties[0]!.meets}`,
    );
  }, 600_000);
});
