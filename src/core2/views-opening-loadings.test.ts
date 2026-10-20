/**
 * Two neighbors with the same lean but different faith and education hold
 * different opening stances on a question the 2020 Cooperative Election Study
 * asked, by the sourced loading (pool item people-opening-stance-from-loadings).
 * A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import loadings from "../../data/research/people/opening-stance-loadings.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { openingRecord, viewOn } from "./modules/views";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const QUESTION = "civil-family-community.restrict-abortion";

it("a churchgoer and a non-churchgoer of the same lean hold different stances", () => {
  const place = drawPlace(seed, "opening-loadings");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const shifts = [...core.people.values()]
    .filter((person) => person.alive)
    .map((person) => ({
      id: person.id,
      shift: openingRecord(api, person.id, QUESTION)?.total ?? 0,
    }));
  expect(shifts.length, where).toBeGreaterThan(0);
  const high = shifts.reduce((a, b) => (b.shift > a.shift ? b : a));
  const low = shifts.reduce((a, b) => (b.shift < a.shift ? b : a));
  // At the same lean, the stance differs by the loading difference.
  const at = (id: string) => viewOn(api, id, QUESTION, 0);
  expect(
    at(high.id) - at(low.id),
    `${where}: ${high.id} vs ${low.id}`,
  ).toBeGreaterThan(0.1);
  // Within the survey's own interval for the faith and degree loadings at the
  // extremes of their predictors.
  const row = loadings.questions[QUESTION]!.loadings;
  const widest = row.faith.high + Math.abs(row.college.high);
  expect(high.shift - low.shift, where).toBeLessThan(widest);
  // The town's average person is not moved: shifts are centered on the
  // national mix, and a town's mix is near it.
  const mean = shifts.reduce((n, row) => n + row.shift, 0) / shifts.length;
  expect(Math.abs(mean), `${where}: town mean shift`).toBeLessThan(
    row.faith.value * 0.35 + Math.abs(row.college.value) * 0.35,
  );
  // A question the survey did not ask adds nothing.
  expect(openingRecord(api, high.id, "no-such-question")).toBeUndefined();
}, 900_000);
