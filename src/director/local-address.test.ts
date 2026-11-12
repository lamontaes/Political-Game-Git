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
import {
  OPENING_SPEECH_BANK,
  partHolds,
} from "../english/english-opening-speech";
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
function drawFixture(n: number) {
  const drawn = drawPlace(`${seed}:${n}`, "local-address");
  const built = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  return {
    place: drawn,
    where: `${drawn.name} (${drawn.key}), seed ${seed}:${n}`,
    world: built,
    core: built.core,
    web: coreAPI(built.core).moduleState(OUTCOME_WEB_MODULE_ID).table("months"),
  };
}
type Fixture = ReturnType<typeof drawFixture>;
const first = drawFixture(0);
const { place, where, world, core } = first;

function writeTerm(
  change: Record<string, number>,
  { world, web }: Pick<Fixture, "world" | "web"> = first,
) {
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
  it("tells the bad news of a bad term and the good of a good one, in its own words", (context) => {
    // A speaker whose open agenda and traits put the policy address first
    // (a governor with a full list and a work-centered turn: policy scores
    // 1.0 in both terms, e.g. Greensboro, Maryland, seed f8fc37cc25201edc,
    // official:term:seat:US-MD:governor:2025-01-20) gives the same address
    // whatever the term did, by the sliding scores and not by a gap; the
    // claim is tested on every speaker whose address the term can change, up
    // to six drawn places, and the test is skipped with every draw's count if
    // none is found.
    const DRAWS = 6;
    const counts: string[] = [];
    let composed = 0,
      responsive = 0;
    for (let n = 0; n < DRAWS && !responsive; n += 1) {
      const fixture = n === 0 ? first : drawFixture(n);
      for (const level of ["state", "town"] as const) {
        writeTerm(
          { "school.": -0.15, "crime.": 0.2, "housing.rent": 0.3 },
          fixture,
        );
        const bad = composeLocalAddress(fixture.core, level);
        writeTerm(
          { "school.": 0.15, "crime.": -0.2, "housing.rent": -0.3 },
          fixture,
        );
        const good = composeLocalAddress(fixture.core, level);
        if (!bad || !good) continue;
        composed += 1;
        counts.push(
          `${fixture.where} ${level}: bad=${bad.addressKind} good=${good.addressKind}`,
        );
        if (bad.addressKind === "policy" && good.addressKind === "policy")
          continue;
        responsive += 1;
        process.stdout.write(
          `LOCAL ADDRESS ${level} ${fixture.where}: bad=${bad.addressKind} good=${good.addressKind}\n  BAD: ${bad.text}\n  GOOD: ${good.text}\n`,
        );
        expect(bad.text, `${level} ${fixture.where}`).not.toBe(good.text);
        expect(bad.addressKind, `${level} ${fixture.where}`).not.toBe(
          good.addressKind,
        );
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
    }
    expect(composed, `${where}: no governor or mayor to speak`).toBeGreaterThan(
      0,
    );
    if (!responsive)
      return context.skip(
        `no speaker whose address a term can change in ${DRAWS} draws (${counts.join("; ")})`,
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
                  partHolds(part.voice, voice) &&
                  partHolds(part.topic, area) &&
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
