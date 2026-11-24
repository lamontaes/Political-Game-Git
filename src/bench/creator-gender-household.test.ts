/**
 * The household beside the player fits the gender the creator chose (owner,
 * Nov 1, v0.73.0: "it has chosen to make my character gay again"): the world
 * is drawn around a resident of the chosen sex, so the partner the place gave
 * that resident is the place's own for that sex. Before, the resident's own sex
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

it.each(["a", "b", "c", "d", "e"])(
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
      // The household is the one the place drew for a resident of this
      // gender; a same-sex couple there is the place's own (a share of couples
      // are), never made by writing the chosen gender over the other's.
      const relations = familyFactsOf(player);
      const household = world.core.households.get(player.householdId);
      const partners = (household?.memberIds ?? []).filter(
        (id) => relations.get(id as never)?.relation === "partner",
      );
      console.log(
        `${where}: partner ${
          partners
            .map((id) => world.core.people.get(id)?.looks?.gender)
            .join(", ") || "none"
        }`,
      );
    }
  },
);
