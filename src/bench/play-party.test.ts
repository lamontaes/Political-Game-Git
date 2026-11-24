import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { checkEligibility, openContests } from "../core2/modules/elections";
import { partyTie } from "../core2/modules/parties";
import { coreAPI } from "../core2/state";
import { governmentView, joinPartyAs } from "./government";
import { buildBenchWorld } from "./world";

// The player joins a party from the politics sheet: the tie is made, it
// shows with how their views fit the party, and filing under the party's
// label then passes the membership rule it failed before.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the player joins a party and then files under its label, seed ${seed}`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const place = drawPlace(seed, `play-party:${attempt}`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const playerId = world.playerId!;
    const api = coreAPI(core);
    const where = `${place.name} (${place.key}), seed ${seed}`;
    tried.push(where);
    const before = governmentView(core, playerId);
    const contest = openContests(api)[0];
    if (!before.party?.parties.length || !contest) continue;
    // A player who already belongs to a party at the start has nothing to
    // join; the draw goes on to a player who does not.
    if (before.party.member) continue;

    // Not a member yet: the sheet offers each party, and the party label's
    // membership rule fails.
    expect(before.party.member, `${where}: not yet a member`).toBeNull();
    const target = before.party.parties[0]!;
    const rule = (label: string) =>
      checkEligibility(api, playerId, contest.id, label).find(
        (row) => row.rule === "party-member",
      );
    expect(rule(target.name)?.met, `${where}: before joining`).toBe(false);

    // Joining makes the tie; the sheet shows its record and the fit.
    const after = joinPartyAs(core, playerId, target.id)!;
    expect(after.member, where).not.toBeNull();
    expect(after.member!.partyId, where).toBe(target.id);
    expect(after.member!.tieId, where).toBe(partyTie(api, playerId)!.id);
    expect(after.member!.agreement!, where).toBeGreaterThanOrEqual(-1);
    expect(after.member!.agreement!, where).toBeLessThanOrEqual(1);
    expect(governmentView(core, playerId).party?.member?.name, where).toBe(
      target.name,
    );

    // Filing under that label now passes; under another party's it does not.
    expect(rule(target.name)?.met, `${where}: after joining`).toBe(true);
    const other = after.parties.find((row) => row.id !== target.id);
    if (other) expect(rule(other.name)?.met, where).toBe(false);
    return;
  }
  throw new Error(
    `No drawn place had parties, an open race and a player with no party: ${tried.join("; ")}`,
  );
}, 900_000);
