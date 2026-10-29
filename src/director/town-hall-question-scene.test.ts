import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { purposeScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import situationFile from "./data/situation-types.json" with { type: "json" };

// A town hall a local official held is a scene for the official, about the
// question a resident stood up with and the answer the official gave it
// (scenes-from-life: docs/design/scenes/from-life/town-hall-goes-wrong.md).
// Places are drawn in turn until one holds a town hall by an official who is
// a full person; the scene must stand on that record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 150;
const ATTEMPTS = 6;
const READINGS = ["host-agreed", "host-opposed", "host-declined"];

it(`a town hall is the host's scene about a resident's question and the answer it got (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "town-hall-question");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    for (const row of townSeats(api)) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    const halls = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "town-hall" &&
        director.ledger.people.has(String(row.facts?.hostId) as PersonId),
    );
    if (!halls.length) {
      tried.push(place.name);
      continue;
    }
    let composed = 0;
    for (const hall of halls) {
      const hostId = String(hall.facts!.hostId) as PersonId;
      const here = `${where}: ${hall.id}`;
      const book = director.ledger.people.get(hostId)!;
      const entry = book.schedule.find((row) => row.momentId.includes(hall.id));
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "town-hall-question",
      );
      expect(binding, `${here}: no town-hall-question scene`).toBeTruthy();
      // Office hours no longer takes a town hall.
      expect(
        entry!.bindings.some((row) => row.typeKey === "office-hours"),
        here,
      ).toBe(false);
      const result = purposeScene(core, director, hostId, entry!, {
        typeKey: "town-hall-question",
      });
      if (result?.kind !== "composed") continue;
      composed += 1;
      const { scene } = result;
      expect(scene.cause.id, here).toBe(hall.id);
      const issue = scene.facts.find((row) => row.key === "issue");
      expect(issue, `${here}: the question is on the scene`).toBeTruthy();
      expect(issue!.recordIds, here).toContain(String(hall.facts!.townHallId));
      const readings = scene.facts.filter((row) => READINGS.includes(row.key));
      expect(
        readings,
        `${here}: exactly one reading of the answer`,
      ).toHaveLength(1);
      // About the question, not about a lost job or an eviction.
      expect(scene.talk.state.text, here).not.toMatch(/lost my job|evict/);
      expect(scene.talk.state.text, here).toContain(issue!.text);
      // The same scene reads differently when the answer was opposed, agreed
      // with or not given: the cast and the question stay, the reading moves.
      const type = (
        situationFile as unknown as { types: PurposeType[] }
      ).types.find((row) => row.key === "town-hall-question")!;
      const facts: Record<string, Fact> = Object.fromEntries(
        scene.facts
          .filter((row) => !READINGS.includes(row.key))
          .map((row) => [
            row.key,
            { text: row.text, sourceRecordIds: row.recordIds },
          ]),
      );
      const stated = READINGS.map((reading) => {
        const talk = composeSceneTalk(
          core,
          director,
          { askerId: scene.askerId, askedId: scene.askedId },
          type,
          {
            ...facts,
            [reading]: { text: reading, sourceRecordIds: [hall.id] },
          },
        );
        expect(talk.kind, `${here}: ${reading}`).toBe("composed");
        return talk.kind === "composed" ? talk.talk.state.text : "";
      });
      expect(new Set(stated).size, `${here}: ${stated.join(" | ")}`).toBe(
        stated.length,
      );
    }
    expect(composed, `${where}: no town hall scene composed`).toBeGreaterThan(
      0,
    );
    return;
  }
  throw new Error(
    `no official held a town hall in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 900_000);
