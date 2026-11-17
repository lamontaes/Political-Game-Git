/**
 * Trust lost takes a share of the tie (scene-talk-rules endingStrain
 * trust-lost; the Account lead's ruling and the Words lead's yes, Nov 15).
 * In a place drawn from all 56 (one without a state chamber of three or a pair
 * tied only by sittings is passed over and named), an ending that loses trust takes the same share
 * of the hours each tie stands on today, so the closest pair in the world
 * loses more hours than two members of the legislature who know each other
 * only from the floor; a strained ending still costs both the same hours.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import {
  closenessBetween,
  sharedHoursBetween,
  tieHoursBetween,
} from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { bodyOf, memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import rules from "./data/scene-talk-rules.json" with { type: "json" };
import { endingStrainHours } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 16;

/** Plays one drawn place; the reason it lacks the case, or undefined once every check passed there. */
function attempt(place: ReturnType<typeof drawPlace>): string | undefined {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // The closest living pair the world keeps a row for.
  const close = [...core.relationships.values()]
    .filter(
      (row) =>
        core.people.get(row.actorId)?.alive &&
        core.people.get(row.otherId)?.alive,
    )
    .sort((x, y) => y.level - x.level)[0];
  // Two members of the legislature tied only by the sittings they shared.
  const chamber = townSeats(api).find(
    (row) =>
      row.office.level === "state" &&
      bodyOf(api, row.office.id) &&
      members(api, row.office.id).length >= 3,
  )?.office.id;
  if (!chamber) return "no state chamber of three members";
  if (!close) return "no living pair with a relationship row";
  const ids = members(api, chamber).map(memberKey).sort() as PersonId[];
  const slight = ids
    .flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const))
    .find(
      ([a, b]) =>
        !core.relationships.has(`${a}:${b}`) &&
        sharedHoursBetween(core, a, b) > 0,
    );
  if (!slight) return "no pair tied only by sittings";
  const share = rules.endingStrain["trust-lost"].value;
  const closeHours = tieHoursBetween(core, close.actorId, close.otherId);
  const slightHours = tieHoursBetween(core, slight[0], slight[1]);
  const lost = (a: PersonId, b: PersonId) =>
    endingStrainHours(core, "trust-lost", a, b)!;
  const strained = (a: PersonId, b: PersonId) =>
    endingStrainHours(core, "relationship-strained", a, b)!;
  process.stdout.write(
    `ENDING STRAIN ${place.name} (${place.key}): close ${close.id} closeness ${closenessBetween(core, close.actorId, close.otherId).toFixed(3)} (${closeHours.toFixed(1)} h) loses ${lost(close.actorId, close.otherId).toFixed(2)} h; colleagues ${slight.join(" and ")} closeness ${closenessBetween(core, slight[0], slight[1]).toFixed(3)} (${slightHours.toFixed(2)} h) lose ${lost(slight[0], slight[1]).toFixed(3)} h\n`,
  );
  expect(lost(close.actorId, close.otherId)).toBeCloseTo(
    share * closeHours,
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
  return undefined;
}

it("trust lost takes a share of the tie, so a close tie loses more hours than a slight one", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ending-strain-share");
    let why: string | undefined;
    try {
      why = attempt(place);
    } catch (error) {
      throw new Error(
        `${place.name} (${place.key}), seed ${seed}:${draw}: ${String(error)}`,
        { cause: error },
      );
    }
    if (!why) {
      process.stdout.write(
        `ENDING STRAIN passed at ${place.name} (${place.key}), seed ${seed}:${draw}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    passed.push(`${place.name} (${why})`);
  }
  throw new Error(
    `No drawn place had the case: ${passed.join("; ")} (seed ${seed})`,
  );
}, 600_000);
