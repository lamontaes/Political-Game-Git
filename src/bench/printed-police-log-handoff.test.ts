/**
 * When the town's paper of record loses its reporters, another outlet becomes
 * the record, and the log runs there (coordinator, Nov 14). Staged at Wendell,
 * Idaho (seed pl1) by the game's own path: the record outlet's reporters die
 * (a person update the death path writes) at a named day, either before the
 * month's log is filed or after it is printed, and the test names which outlet
 * prints the next month's log and which already printed it.
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { recordOutletOf } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

type Outlet = { id: string; organizationId: string; reporterIds: string[] };

function run(killAfterPrint: boolean) {
  const place = drawPlace("pl1", "police-log");
  const where = `${place.name} (${place.key}), seed pl1, ${killAfterPrint ? "reporters die after the log printed" : "reporters die before the log is filed"}`;
  setBookkeeping(false);
  const t0 = performance.now();
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
  const built = performance.now() - t0;
  const api = coreAPI(core);
  const outlets = () =>
    api
      .moduleState("core2-press-v1")
      .table("outlets")
      .rows() as unknown as Outlet[];
  const logs = () => {
    const by = new Map<string, Set<string>>();
    for (const story of api
      .moduleState("news")
      .table("stories")
      .rows() as unknown as {
      kind: string;
      outletId: string;
      facts: Record<string, unknown>;
    }[]) {
      const source = String(story.facts.sourceRecordId);
      if (story.kind === "press.printed" && source.startsWith("police-log:"))
        by.set(source, (by.get(source) ?? new Set()).add(story.outletId));
    }
    return by;
  };
  const step = (days: number) =>
    advanceCore(core, addDays(makeIsoDate(core.date), days));
  const before = recordOutletOf(api)!;
  const oldRecord = outlets().find((o) => o.id === before)!;
  const kill = () => {
    for (const id of oldRecord.reporterIds)
      api.updatePerson(id as never, { alive: false } as never);
  };
  // The first month's log (the game's second month) is filed once the month
  // has closed; stage the deaths around it.
  if (!killAfterPrint) {
    // The month's log is filed on the first of the next month (here March
    // 1, 2025, from a start of January 20): the reporters die a few days
    // before.
    step(36);
    kill();
  }
  let printed = new Map<string, Set<string>>();
  // Reach the first filing in a few big steps, then a day at a time, so the
  // case stops on the day the log prints.
  if (killAfterPrint) step(36);
  for (let day = 0; day < 40 && printed.size === 0; day += 1) {
    step(1);
    printed = logs();
  }
  if (killAfterPrint) {
    kill();
    step(10);
    printed = logs();
  }
  const after = recordOutletOf(api);
  const first = [...printed.keys()].sort()[0];
  appendFileSync(
    path.join(tmpdir(), "printed-police-log-handoff-proof.txt"),
    `${where}: build ${(built / 1000).toFixed(1)}s, total ${((performance.now() - t0) / 1000).toFixed(1)}s, start ${gameStartDate()}; record before ${oldRecord.organizationId}; after ${outlets().find((o) => o.id === after)?.organizationId}; ${[...printed].map(([k, v]) => `${k} in ${[...v].join(", ")}`).join("; ")}\n`,
  );
  return { where, oldRecord, after, printed, first, outlets: outlets() };
}

it("a record outlet whose reporters died before the log is filed does not print it; the new record does", () => {
  const r = run(false);
  expect(r.after, r.where).not.toBe(r.oldRecord.id);
  expect(r.first, `${r.where}: no log printed`).toBeTruthy();
  const by = [...r.printed.get(r.first!)!];
  const newRecord = r.outlets.find((o) => o.id === r.after)!.organizationId;
  expect(by, r.where).toEqual([newRecord]);
}, 65_000);

it("after the log printed, the reporters die: what the new record prints is named", () => {
  const r = run(true);
  expect(r.after, r.where).not.toBe(r.oldRecord.id);
  const by = [...(r.printed.get(r.first!) ?? [])].sort();
  const newRecord = r.outlets.find((o) => o.id === r.after)!.organizationId;
  // One log, printed once, by the outlet that was the record when it ran.
  expect(by, r.where).toEqual([r.oldRecord.organizationId]);
  expect(by).not.toContain(newRecord);
}, 65_000);
