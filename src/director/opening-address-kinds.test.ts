import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_AREAS, TERM_MEASURES } from "../core2/term-read";
import {
  OPENING_SPEECH_BANK,
  partHolds,
} from "../english/english-opening-speech";
import { composeOpeningStory } from "./opening-story";
import { ADDRESS_KINDS } from "./address-kind";

// The address picks its kind and its subjects from the world (owner, Nov 8:
// "It's still very robotic... It's always good news. It's never bad news").
// One world is drawn from all 56 places on a seed the builder did not choose;
// the outcome web's month rows for its town are then written the way the web
// writes them, a year of schools and crime sliding in one run and improving in
// the other, and the address is composed again from the records. The same
// President says a bad year in one kind and subjects and a good one in
// another. The rows are a fixture for the edge; the ten-year played proof is
// in the PR body (scripts/_story_addr).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "opening-address-kinds");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const web = coreAPI(core).moduleState(OUTCOME_WEB_MODULE_ID).table("months");

/**
 * Write the web's rows for the town as it writes them: the opening month, then
 * the three months after the warm-up, every measure of an area moved by
 * `change` across those three.
 */
function writeTerm(change: Record<string, number>) {
  const measures = TERM_MEASURES;
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of measures) {
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

describe("the address picks its kind and subjects from the world", () => {
  it("tells a bad year in schools and crime as bad news, and a good one as good", () => {
    writeTerm({ "school.": -0.15, "crime.": 0.2, "health.": 0.1 });
    const bad = composeOpeningStory(core, world.playerId!)!;
    writeTerm({ "school.": 0.15, "crime.": -0.2, "health.": -0.1 });
    const good = composeOpeningStory(core, world.playerId!)!;
    process.stdout.write(
      `ADDRESS KINDS ${where}: bad=${bad.addressKind} good=${good.addressKind}\n  BAD: ${bad.address.text}\n  GOOD: ${good.address.text}\n`,
    );
    expect(ADDRESS_KINDS, where).toContain(bad.addressKind);
    expect(ADDRESS_KINDS, where).toContain(good.addressKind);
    // The areas the term read holds are claims the address cites by web row.
    const claims = (story: typeof bad) =>
      new Set(
        story.address.sentences.flatMap((row) =>
          row.facts.filter((key) => /-(?:worse|better)$/.test(key)),
        ),
      );
    // Since the speech outline (Nov 12) the President's address tells only
    // its theme's measures, and its theme comes from the President's own
    // issues, not the town's term read (a national speech, owner, Oct 27). So
    // what it tells of schools, crime or health is checked only where its
    // theme is one of them; the kind of address still follows the year.
    if (claims(bad).size) {
      expect(
        [...claims(bad)].some((key) => key.endsWith("-better")),
        where,
      ).toBe(false);
      const cited = bad.address.sentences
        .filter((row) => row.facts.some((key) => key.endsWith("-worse")))
        .flatMap((row) => row.sourceRecordIds);
      expect(
        cited.some((id) => id.startsWith("web:")),
        where,
      ).toBe(true);
    }
    // A President whose full list of points makes the policy push score
    // highest gives that address in any year, by the sliding scores and not
    // by a gap (as local-address.test.ts allows); otherwise the kind follows
    // the year.
    if (bad.addressKind !== "policy" || good.addressKind !== "policy")
      expect(bad.addressKind, where).not.toBe(good.addressKind);
  });

  it("holds a piece, in both voices, for every area's good and bad news", () => {
    for (const area of TERM_AREAS.filter(
      (name) => !["jobs", "pay", "prices"].includes(name),
    ))
      for (const claim of ["worse", "better"])
        for (const voice of ["polished", "plain"])
          expect(
            OPENING_SPEECH_BANK.parts.some(
              (part) =>
                partHolds(part.voice, voice) &&
                partHolds(part.topic, area) &&
                part.uses.some(
                  (use) =>
                    use.role === "story-says" &&
                    (use.requiresFacts ?? []).includes(`${area}-${claim}`),
                ),
            ),
            `${area} ${claim} ${voice}`,
          ).toBe(true);
  });

  it("holds pieces of its own, in both voices, for every kind but the policy push", () => {
    for (const kind of ADDRESS_KINDS.filter((name) => name !== "policy"))
      for (const role of ["story-open", "story-turn", "pledge", "hope"])
        for (const voice of ["polished", "plain"])
          expect(
            OPENING_SPEECH_BANK.parts.filter(
              (part) =>
                part.addressKind === kind &&
                partHolds(part.voice, voice) &&
                part.uses.some((use) => use.role === role),
            ).length,
            `${kind} ${role} ${voice}`,
          ).toBeGreaterThan(0);
  });
});
