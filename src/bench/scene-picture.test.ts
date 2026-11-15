/**
 * A story scene is drawn where it happens: at the host's home for a visit,
 * at the room of the body a seated official sits on, in the office of its
 * kind. A drawn place from all 56 (the run seed names it).
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { servingTermsOf } from "../core2/modules/offices";
import { homeOf, officeWorkplace, pictureFor, servingOfficeIds } from "./scene";
import { bodyPicture } from "./legislature";
import { hasBackdrop } from "./backdrop-places";
import { scenePicture } from "./scene-picture";
import { pictureSteps } from "./scene-picture-steps";
import type { CoreState } from "../core2/types";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`scene-picture:${Date.now()}`).digest("hex");

it("a visit shows the host's home, a seat the body's room, an office its kind", () => {
  const place = drawPlace(runSeed, "scene-picture");
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const { core: world, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const core = world as CoreState;
  const api = coreAPI(core);
  const player = core.people.get(playerId!)!;

  // A visit to another household: that household's own room, not the player's.
  const host = [...core.people.values()].find(
    (row) => row.alive && row.householdId !== player.householdId,
  )!;
  const visit = scenePicture(
    core,
    playerId!,
    {
      typeKey: "apology",
      setting: "other-home",
      recordId: host.householdId,
      presentIds: [playerId!, host.id],
    },
    12 * 60,
    null,
  );
  expect(hasBackdrop(visit), where).toBe(true);
  expect(visit, where).toBe(
    scenePicture(
      core,
      host.id,
      {
        typeKey: "apology",
        setting: "home",
        recordId: host.householdId,
        presentIds: [host.id],
      },
      12 * 60,
      null,
    ),
  );

  // A door scene shows the door of the resident's kind of home.
  const door = scenePicture(
    core,
    playerId!,
    {
      typeKey: "door-ask",
      setting: "other-home",
      recordId: host.householdId,
      presentIds: [playerId!, host.id],
    },
    12 * 60,
    null,
  );
  expect(door, where).toMatch(/^door-knocking-|^doorstep-entrance$/);

  // A seated official's scenes: a body's room, or the office of its kind.
  const seated = [...core.people.values()].filter(
    (row) => servingTermsOf(api, row.id).length > 0,
  );
  expect(seated.length, where).toBeGreaterThan(0);
  let checked = 0;
  for (const official of seated) {
    const room = servingOfficeIds(core, official.id)
      .map((officeId) => bodyPicture(core, official.id, officeId))
      .find((row): row is string => !!row);
    const office = officeWorkplace(core, official.id);
    const expected = room ?? office;
    if (!expected) continue;
    const seat = scenePicture(
      core,
      official.id,
      {
        typeKey: "floor-debate",
        setting: "venue",
        seat: true,
        recordId: official.placeId,
        presentIds: [official.id],
      },
      12 * 60,
      null,
    );
    expect(seat, where).toBe(
      pictureFor(core, expected, official.placeId, 12 * 60),
    );
    // The same person staged in their office is drawn in the office of its kind.
    if (office)
      expect(
        scenePicture(
          core,
          official.id,
          {
            typeKey: "desk-visit",
            setting: "office",
            recordId: "x",
            presentIds: [official.id],
          },
          12 * 60,
          null,
        ),
        where,
      ).toBe(pictureFor(core, office, "x", 12 * 60));
    checked++;
  }
  expect(checked, where).toBeGreaterThan(0);
  expect(homeOf(core, playerId!, 12 * 60), where).toBeTruthy();
});

it("a variant's row is tried before its type's row", () => {
  const names = pictureSteps({
    typeKey: "door-ask",
    variant: "ask-support.lost-job",
    setting: "other-home",
  });
  // Today no variant has a row of its own: the type's row stands.
  expect(names[0]!.row).toBe("type");
});
