/**
 * Trust lost takes a share of the tie (the core's closenessTrustLostShare,
 * read by scene-talk-rules endingStrain trust-lost; the Account lead's ruling and the Words lead's yes, Nov 15).
 * At a named place and seed, an ending that loses trust takes the same share
 * of the hours each tie stands on today, so the closest pair in the world
 * loses more hours than two members of the legislature who know each other
 * only from the floor; a strained ending still costs both the same hours.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import {
  closenessBetween,
  sharedHoursBetween,
  tieHoursBetween,
  trustLostHours,
} from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { bodyOf, memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { parameter } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { endingStrainHours } from "./purpose-scene";

const PLACE = {
  key: "territory:AS:maia",
  seed: "0b6c599b2140735b80cdc730a4793e7054568c52f90bd08df2761745ff6cdc21",
};

it("trust lost takes a share of the tie, so a close tie loses more hours than a slight one", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  // The closest living pair the world keeps a row for.
  const close = [...core.relationships.values()]
    .filter(
      (row) =>
        core.people.get(row.actorId)?.alive &&
        core.people.get(row.otherId)?.alive,
    )
    .sort((x, y) => y.level - x.level)[0]!;
  // Two members of the legislature tied only by the sittings they shared.
  const chamber = townSeats(api).find(
    (row) =>
      row.office.level === "state" &&
      bodyOf(api, row.office.id) &&
      members(api, row.office.id).length >= 3,
  )!.office.id;
  const ids = members(api, chamber).map(memberKey).sort() as PersonId[];
  const slight = ids
    .flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const))
    .find(
      ([a, b]) =>
        !core.relationships.has(`${a}:${b}`) &&
        sharedHoursBetween(core, a, b) > 0,
    )!;
  expect(slight, `${PLACE.key}: no pair tied only by sittings`).toBeTruthy();
  const share = parameter("closenessTrustLostShare", core.data.parameters);
  const closeHours = tieHoursBetween(core, close.actorId, close.otherId);
  const slightHours = tieHoursBetween(core, slight[0], slight[1]);
  const lost = (a: PersonId, b: PersonId) =>
    endingStrainHours(core, "trust-lost", a, b)!;
  const strained = (a: PersonId, b: PersonId) =>
    endingStrainHours(core, "relationship-strained", a, b)!;
  process.stdout.write(
    `ENDING STRAIN ${PLACE.key}: close ${close.id} closeness ${closenessBetween(core, close.actorId, close.otherId).toFixed(3)} (${closeHours.toFixed(1)} h) loses ${lost(close.actorId, close.otherId).toFixed(2)} h; colleagues ${slight.join(" and ")} closeness ${closenessBetween(core, slight[0], slight[1]).toFixed(3)} (${slightHours.toFixed(2)} h) lose ${lost(slight[0], slight[1]).toFixed(3)} h\n`,
  );
  expect(lost(close.actorId, close.otherId)).toBeCloseTo(
    share * closeHours,
    10,
  );
  // The promises engine reads the same row (closeness.ts trustLostHours).
  expect(trustLostHours(core, close.actorId, close.otherId)).toBeCloseTo(
    lost(close.actorId, close.otherId),
    10,
  );
  expect(lost(slight[0], slight[1])).toBeCloseTo(share * slightHours, 10);
  expect(lost(close.actorId, close.otherId)).toBeGreaterThan(
    lost(slight[0], slight[1]),
  );
  // A strained ending is still hours: the same for both ties.
  expect(strained(close.actorId, close.otherId)).toBe(
    strained(slight[0], slight[1]),
  );
}, 60_000);
