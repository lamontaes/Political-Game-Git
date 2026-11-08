import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_AREAS, TERM_MEASURES } from "../core2/term-read";
import { OPENING_SPEECH_BANK } from "../english/english-opening-speech";
import { ADDRESS_FACT } from "./opening-facts";
import {
  composeLocalAddress,
  localAddressDate,
  recordLocalAddress,
} from "./local-address";

// A governor's State of the State and a mayor's State of the City (owner,
// Nov 8: addresses by "governors' and mayors'"): the same address the
// President gives at a smaller scale. One world is drawn from all 56 places on
// a seed the builder did not choose; the outcome web's rows for its town are
// written the way the web writes them, once with schools, crime and rents
// sliding and once with them mending, and the address is composed from them.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "local-address");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const web = coreAPI(core).moduleState(OUTCOME_WEB_MODULE_ID).table("months");

function writeTerm(change: Record<string, number>) {
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = Object.entries(change).find(([prefix]) =>
        key.startsWith(prefix),
      )?.[1];
      values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${world.placeId}:${month}`,
      placeId: world.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
}

describe("a governor's and a mayor's address", () => {
  it("tells the bad news of a bad term and the good of a good one, in its own words", () => {
    let composed = 0;
    for (const level of ["state", "town"] as const) {
      writeTerm({ "school.": -0.15, "crime.": 0.2, "housing.rent": 0.3 });
      const bad = composeLocalAddress(core, level);
      writeTerm({ "school.": 0.15, "crime.": -0.2, "housing.rent": -0.3 });
      const good = composeLocalAddress(core, level);
      if (!bad || !good) continue;
      composed += 1;
      process.stdout.write(
        `LOCAL ADDRESS ${level} ${where}: bad=${bad.addressKind} good=${good.addressKind}\n  BAD: ${bad.text}\n  GOOD: ${good.text}\n`,
      );
      expect(bad.text, `${level} ${where}`).not.toBe(good.text);
      expect(bad.addressKind, `${level} ${where}`).not.toBe(good.addressKind);
      const claims = (story: typeof bad) =>
        story.sentences.flatMap((row) =>
          row.facts.filter((key) => /-(?:worse|better)$/.test(key)),
        );
      expect(
        claims(bad).some((key) => key.endsWith("-worse")),
        level,
      ).toBe(true);
      expect(
        claims(bad).some((key) => key.endsWith("-better")),
        level,
      ).toBe(false);
      expect(
        claims(good).some((key) => key.endsWith("-better")),
        level,
      ).toBe(true);
      // It is a state's or a town's own address, never the nation's.
      expect(bad.text, level).not.toMatch(/Congress|Washington|Americans/);
    }
    expect(composed, `${where}: no governor or mayor to speak`).toBeGreaterThan(
      0,
    );
  });

  it("is a public record on its day that the news carries", () => {
    writeTerm({ "school.": -0.15, "crime.": 0.2, "housing.rent": 0.3 });
    for (const level of ["state", "town"] as const) {
      const story = recordLocalAddress(core, level);
      if (!story) continue;
      const event = core.durableLog.get(story.id)!;
      expect(event.publicRecord, level).toBe(true);
      expect(event.news, level).toBe(true);
      expect(event.witnessIds, level).toContain(world.playerId);
      expect(event.facts![ADDRESS_FACT.speaker], level).toBe(story.speakerId);
      expect(localAddressDate(level, 2026), level).toMatch(/^2026-\d\d-\d\d$/);
    }
  });

  it("is given on its day in a played world, and the household sees it as the address scene", () => {
    // A fresh world: the opening's own records only (no fixture rows).
    const fresh = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    if (!fresh.director.ledger.people.has(fresh.playerId!))
      fresh.director.watch(fresh.core, fresh.playerId!);
    advanceCore(fresh.core, "2025-02-11");
    const given = [...fresh.core.durableLog.values()].filter(
      (row) => row.kind === "governor.address" || row.kind === "mayor.address",
    );
    process.stdout.write(
      `LOCAL ADDRESSES GIVEN ${where}: ${given.map((row) => `${row.kind} ${row.date}`).join(", ") || "none"}\n`,
    );
    expect(given.length, where).toBeGreaterThan(0);
    const book = fresh.director.ledger.people.get(fresh.playerId!)!;
    for (const row of given) {
      const entry = book.schedule.find((item) =>
        item.momentId.includes(row.id),
      );
      expect(
        entry?.bindings.some((binding) => binding.typeKey === "address"),
        `${where}: ${row.id} is not the address scene`,
      ).toBe(true);
    }
  }, 240_000);

  it("has pieces in both voices for every area's good and bad news, at both levels", () => {
    for (const subject of ["state-of-the-state", "town-address"])
      for (const area of TERM_AREAS)
        for (const claim of ["worse", "better"])
          for (const voice of ["polished", "plain"])
            expect(
              OPENING_SPEECH_BANK.parts.some(
                (part) =>
                  part.voice === voice &&
                  part.topic === area &&
                  part.uses.some(
                    (use) =>
                      use.subject === subject &&
                      use.role === "story-says" &&
                      (use.requiresFacts ?? []).includes(`${area}-${claim}`),
                  ),
              ),
              `${subject} ${area} ${claim} ${voice}`,
            ).toBe(true);
  });
});
