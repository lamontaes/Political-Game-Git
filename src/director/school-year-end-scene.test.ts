import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { CoreState, PersonId } from "../core2/types";
import { SCENE_WORDS } from "../english/scene-words";
import type { Director } from "./ledger";
import { purposeScene } from "./purpose-scene";
import { composeScene } from "./scene";
import type { ScheduleEntry } from "./scheduling";

// A senior's school year ends in one of two scenes at home, never neither:
// graduated, someone they live with marks it (`diploma-home`); not, someone
// they live with sits them down (`no-diploma-home`). Both read the school
// engine's graduation result the day after it is written (circumstance rows
// graduation-home and no-graduation-home). A controlled player's senior
// year that ended without a diploma used to stage nothing at all (Koloa,
// Hawaii, seed 816b34a523d1dc96346e). The new adult the game opens with is
// played past the year's end as the bench plays it; whichever way it went,
// that scene is staged from the result's own record, composes, and opens
// with its lead.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 4;
const DAYS = 210;
const BY_LABEL: Readonly<Record<string, string>> = {
  "circumstance:graduation-home": "diploma-home",
  "circumstance:no-graduation-home": "no-diploma-home",
};

/** Plays the player past the school year's end; the year-end moment, if any, comes back. */
function yearEnd(
  core: CoreState,
  director: Director,
  personId: PersonId,
): { entry: ScheduleEntry; typeKey: string } | null {
  core.focusPersonIds.add(personId);
  director.watch(core, personId);
  const book = director.ledger.people.get(personId)!;
  let found: { entry: ScheduleEntry; typeKey: string } | null = null;
  const open = () => {
    for (const entry of book.schedule) {
      const label = book.momentsById.get(entry.momentId)?.label ?? "";
      if (BY_LABEL[label]) found ??= { entry, typeKey: BY_LABEL[label]! };
    }
  };
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: {
      date: addDays(makeIsoDate(core.date), DAYS),
      minuteOfDay: P.zero,
    },
  });
  while (packet.kind !== "complete" && !found) {
    open();
    if (found) break;
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, { kind: "own-choice", pauseId: packet.pauseId });
  }
  open();
  return found;
}

it(`a senior's year ends in the diploma scene or the no-diploma scene, with its lead (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `school-year-end:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const personId = core.playerId as PersonId;
    const hit = yearEnd(core, director, personId);
    if (!hit) {
      tried.push(`${where}: no senior year ended at home in ${DAYS} days`);
      continue;
    }
    const { entry, typeKey } = hit;
    // The result's own record, read the day the school engine wrote it.
    const moment = director.ledger.people
      .get(personId)!
      .momentsById.get(entry.momentId)!;
    expect(moment.causeId, where).toMatch(/^school\.graduation-pct:/);
    expect(
      entry.bindings.map((row) => row.typeKey),
      `${where}: ${moment.causeId}`,
    ).toContain(typeKey);
    const bound = {
      ...entry,
      bindings: entry.bindings.filter((row) => row.typeKey === typeKey),
    };
    // It plays as a talk at home with someone the player lives with.
    const result = purposeScene(core, director, personId, bound, { typeKey });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    // The narrator opens with the scene's lead, citing the result.
    const scene = composeScene(core, director, personId, bound)!;
    const plain = composeScene(core, director, personId, bound, {
      ...SCENE_WORDS,
      leads: [],
    })!;
    const text = scene.narration.map((line) => line.text).join(" ");
    expect(text, `${where}: ${typeKey} has no lead`).not.toBe(
      plain.narration.map((line) => line.text).join(" "),
    );
    expect(
      scene.narration.flatMap((line) => line.sourceRecordIds).length,
      where,
    ).toBeGreaterThan(0);
    // The proof, by place, seed and record id (the runner keeps no console).
    appendFileSync(
      path.join(tmpdir(), "school-year-end-proof.txt"),
      `${where}: ${moment.causeId} on ${moment.date} staged ${typeKey}: "${text}"\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place ended the player's senior year at home: ${tried.join("; ")}`,
  );
}, 3_600_000);
