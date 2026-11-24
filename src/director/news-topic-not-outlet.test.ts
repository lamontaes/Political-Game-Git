/**
 * News passed on in talk names what happened, never the outlet that printed
 * it (batch 4 capture, Nov 9: "Did you hear about New Albany Times?"). A
 * story the speaker read is raised by its headline; a place that closed is
 * raised by its name. One played world (buildBenchWorld) in a place drawn
 * from all 56, seed from GOLDEN_PATH_SEED (random when unset).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { outletsHere } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import { changesKnownTo } from "./bring-it-up";
import { subjectsBetween } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

describe("news passed on in talk", () => {
  it("names what happened, not the outlet that printed it", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "news-topic");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    const outlets = new Set(
      outletsHere(coreAPI(core)).flatMap((row) => [row.organizationId, row.id]),
    );
    const adults = [...core.people.values()].filter(
      (person) => person.alive && ageOnDate(person.birthDate, core.date) >= 18,
    );
    let readers = 0;
    let news = 0;
    for (let i = 0; i + 1 < Math.min(adults.length, 600); i += 1) {
      const speaker = adults[i]!.id as PersonId;
      const listener = adults[i + 1]!.id as PersonId;
      if (changesKnownTo(core, speaker).some((c) => c.kind === "news.read"))
        readers += 1;
      for (const subject of subjectsBetween(core, speaker, listener)) {
        if (subject.kind !== "news") continue;
        news += 1;
        for (const id of subject.facts.topic?.sourceRecordIds ?? [])
          expect(outlets.has(id), `${where}: ${subject.id}`).toBe(false);
      }
    }
    console.log(
      `NEWS TOPIC ${where}: ${readers} adults read a story, ${news} news subjects, none named by an outlet`,
    );
    expect(readers, where).toBeGreaterThan(0);
  }, 600_000);
});
