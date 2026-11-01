/**
 * The household beside the player fits the gender the creator chose (owner,
 * Nov 1, v0.73.0: "it has chosen to make my character gay again"): the world
 * is drawn around a resident of the chosen sex, so the partner the place gave
 * that resident is one the chosen gender fits. Before, the resident's own sex
 * stood and the creator's gender was written over it afterward, turning a
 * woman drawn with a husband into a man beside him.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { familyFactsOf } from "../core2/modules/people";
import { buildBenchWorld } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`creator-gender:${Date.now()}`).digest("hex");

it.each(["a", "b", "c"])(
  "draws the player's resident of the chosen gender, with the household that fits (draw %s)",
  { timeout: 900_000 },
  (draw) => {
    setBookkeeping(false);
    const place = drawPlace(`${runSeed}:${draw}`, "creator-gender");
    for (const gender of ["female", "male"] as const) {
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}, chosen ${gender}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        playerBirthDate: "1991-03-14",
        playerGender: gender,
      });
      const player = world.core.people.get(world.playerId!)!;
      expect(player.looks?.gender, where).toBe(gender);
      const relations = familyFactsOf(player);
      const household = world.core.households.get(player.householdId);
      for (const id of household?.memberIds ?? []) {
        if (id === player.id) continue;
        if (relations.get(id as never)?.relation !== "partner") continue;
        // The partner is the player's partner by record, and the record's
        // couple is the one the place drew for a resident of this sex.
        expect(world.core.people.get(id)?.looks?.gender, where).not.toBe(
          gender,
        );
      }
    }
  },
);
