/**
 * A layoff is covered by the people it reaches (pool item
 * press-layoff-counts-the-jobs-lost): the workers the outlet's readers
 * hold among those cut and those still working there, not only the owner it
 * names. Pinned to one place and seed so it never depends on the draw: the
 * place the pool item measured (seed survey-b), until three weeks after the
 * March 2025 cut of four jobs at a business of 14.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

it("a layoff that cuts four jobs at a business in town prints", () => {
  setBookkeeping(false);
  const place = drawPlace("survey-b", "printed-words");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const cut: { date: string; id: string; jobs: number }[] = [];
  api.subscribeEvents("layoff-test", ["business.staff-reduced"], (_a, e) => {
    cut.push({
      date: e.date,
      id: e.id,
      jobs: Number(e.facts?.jobsLost ?? 0),
    });
  });
  advanceCore(core, addDays(makeIsoDate("2025-03-20"), 0));
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const printed = new Set(
    (
      api.moduleState("core2-press-v1").table("stories").rows() as {
        kind: string;
        itemId?: string;
        id: string;
      }[]
    )
      .filter((s) => s.kind === "business.staff-reduced")
      .map((s) => s.itemId ?? s.id),
  );
  const big = cut.filter((c) => c.jobs >= 4);
  expect(big.length, `${where}: layoffs of four or more jobs`).toBeGreaterThan(
    0,
  );
  for (const c of big)
    expect(
      [...printed].some((id) => String(id).includes(c.id)),
      `${where}: ${c.id} (${c.jobs} jobs) printed`,
    ).toBe(true);
}, 300_000);
