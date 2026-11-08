import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { PersonId } from "../core2/types";
import { openConversation } from "./conversation";

// The scales (the lie) in the world the player gets (owner, Oct 15: a lie
// about where you are from names another place, never "Not here."). In a
// played town every resident lives in the town, so the other place comes from
// the player's state. Without it a stranger's "Where are you from?" offered
// no lie in any played place (Humphrey NE, Kennedyville MD and Shenorock NY
// found it unreachable on Nov 8).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a stranger's "Where are you from?" offers a false place (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "lie-reach");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const me = core.people.get(playerId as PersonId)!;
  const strangers = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.id !== me.id &&
        row.placeId === me.placeId &&
        !me.knownIds.has(row.id) &&
        row.householdId !== me.householdId,
    )
    .slice(0, 12);
  expect(strangers.length, where).toBeGreaterThan(0);
  const home = corePlaceByJurisdictionId(me.placeId as never)!;
  let offered = 0;
  for (const other of strangers) {
    const talk = openConversation(core, me.id, other.id);
    if (talk.last?.subject.kind !== "home" || !talk.lies.length) continue;
    offered += 1;
    for (const lie of talk.lies) {
      expect(lie.text, where).toMatch(/^I'm from [^.?]+\./);
      expect(lie.text, where).not.toContain(home.displayName.split(",")[0]!);
      expect(lie.text, where).not.toMatch(/[:_{}]|undefined/);
    }
  }
  expect(
    offered,
    `${where}: no stranger's question offered a lie`,
  ).toBeGreaterThan(0);
  process.stdout.write(
    `LIE REACH ${where}: ${offered} of ${strangers.length}\n`,
  );
}, 300_000);
