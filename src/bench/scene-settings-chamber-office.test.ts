/**
 * A scene the director sets at the chamber or an office is pictured there,
 * not in the player's home (pool item
 * director-scene-settings-chamber-office-seat). The player sits in their
 * state's legislature; the year is played until a scene staged at the
 * chamber or an office comes, and the story screen's own call (`storyScene`)
 * pictures it in the body's chamber (bodyPlaces) or the office's workplace
 * (officeWorkplaces). Played in the bench world in places drawn from all 56
 * on a seed nobody chose (GOLDEN_PATH_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { storyScene } from "./story";
import { buildBenchWorld } from "./world";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on a scene at the chamber or an office. */
const DRAWS = 4;
/** Days played in each place at most. */
const MOST_DAYS = 150;

/** Every place a body meets in or an office works from, as the scene places list them. */
const civic = new Set(
  [
    ...Object.values(scenePlaces.bodyPlaces),
    ...Object.values(scenePlaces.bodyPlacesBySize).flatMap((rows) =>
      (rows as { places: string[] }[]).flatMap((row) => row.places),
    ),
    ...Object.values(scenePlaces.officeWorkplaces),
  ].flatMap((row) => (Array.isArray(row) ? row : [])),
);

it(`a scene at the chamber or an office is pictured there, not at home (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "scene-settings-chamber");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const full = (officeId: string) =>
      members(api, officeId)
        .map(memberKey)
        .filter((id) => core.people.get(id)?.alive)
        .sort();
    const body = [
      ...new Map(
        townSeats(api)
          .filter(
            (row) =>
              row.office.level === "state" && full(row.office.id).length > 1,
          )
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ].sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!body) {
      tried.push(`${where}: no state chamber with two full-person members`);
      continue;
    }
    const seated = full(body.id);
    core.playerId = seated[0]! as PersonId;
    const player = core.playerId;
    for (const id of seated) {
      core.focusPersonIds.add(id as PersonId);
      director.watch(core, id as PersonId);
    }
    const seen = new Set<string>();
    for (let day = 1; day <= MOST_DAYS; day += 1) {
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      const book = director.ledger.people.get(player)!;
      const entry = book.schedule.find(
        (row) =>
          !seen.has(row.momentId) &&
          row.outcome !== "journal-line" &&
          ["chamber", "office"].includes(row.bindings[0]?.setting.kind ?? ""),
      );
      if (!entry) continue;
      seen.add(entry.momentId);
      const binding = entry.bindings[0]!;
      const shown = storyScene(core, director, player, entry.momentId, 14 * 60);
      // The town's own picture of a place is that place's key with a suffix.
      const pictured = [...civic].find(
        (key) => shown.place === key || shown.place.startsWith(`${key}`),
      );
      expect(
        pictured,
        `${where}: ${binding.typeKey} at the ${binding.setting.kind} (${binding.setting.recordId}) pictured ${shown.place}`,
      ).toBeTruthy();
      process.stdout.write(
        `SCENE SETTING ${where} (GOLDEN_PATH_SEED=${seed})\n  ${core.date}: ${binding.typeKey} at the ${binding.setting.kind} ${binding.setting.recordId}, moment ${entry.momentId}\n  pictured ${shown.place} (${shown.backdrop.file})\n`,
      );
      return;
    }
    tried.push(
      `${where}: no scene at the chamber or an office in ${MOST_DAYS} days`,
    );
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
