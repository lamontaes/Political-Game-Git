import { describe, expect, it } from "vitest";
import { createCore, coreAPI, registerModule } from "./state";
import { createLifeCore, advanceCore } from "./life";
import {
  advancePlayerV1,
  earliestPlayerStopV1,
  resumePlayerV1,
} from "./player-v1";
import { runModuleCalendar } from "./module-calendar";
import { piecesInput, piecesSource as source } from "./core-pieces-fixture";
import type { CoreModule } from "./types";
const work = {
  key: "filing",
  date: "2026-01-02",
  kind: "deadline",
  source,
  sourceRecordIds: ["statute"],
};
describe("keyed institutional calendar", () => {
  it("dispatches on its date before day hooks and exactly once", () => {
    const seen: string[] = [],
      core = createLifeCore(piecesInput(), { scheduledWork: false });
    registerModule(core, {
      id: "elections",
      onCalendarWork(api, row) {
        seen.push(`${api.state.date}:${row.key}`);
        api.emit({
          id: "result",
          date: api.state.date,
          kind: "election-result",
          personIds: [],
          placeId: "place",
          source,
          publicRecord: true,
        });
      },
      onDay() {
        seen.push("day");
      },
    });
    const calendar = coreAPI(core).moduleCalendar("elections");
    calendar.schedule(work);
    expect(() => calendar.schedule(work)).toThrow(/Duplicate/);
    advanceCore(core, "2026-01-03");
    expect(seen).toEqual(["2026-01-02:filing", "day", "day"]);
    expect(calendar.get(work.key)?.status).toBe("completed");
    expect(core.eventIds.has("result")).toBe(true);
    expect(() => calendar.cancel(work.key)).toThrow();
    expect(calendar.forget(work.key)).toBe(true);
  });
  it("keeps module keys separate, cancels future buckets, and honors explicit same-day order", () => {
    const core = createCore(piecesInput()),
      api = coreAPI(core),
      seen: string[] = [];
    for (const id of ["a", "b"])
      registerModule(core, {
        id,
        onCalendarWork(_, row) {
          seen.push(`${id}:${row.key}`);
          if (id === "a") api.moduleCalendar("b").cancel("later");
        },
      });
    api.moduleCalendar("a").schedule(work);
    api.moduleCalendar("b").schedule(work);
    api.moduleCalendar("b").schedule({ ...work, key: "later" });
    api
      .moduleCalendar("b")
      .schedule({ ...work, key: "future", date: "2026-06-01" });
    expect(api.moduleCalendar("b").cancel("future")).toBe(true);
    core.date = work.date;
    runModuleCalendar(core, api);
    runModuleCalendar(core, api);
    expect(seen).toEqual(["a:filing", "b:filing"]);
    expect(api.moduleCalendar("b").get("later")).toBeUndefined();
  });
  it("publishes dated conditions from the module's indexed state through the existing writer", () => {
    const core = createLifeCore(piecesInput(), { scheduledWork: false }),
      api = coreAPI(core);
    const module: CoreModule = {
      id: "conditions",
      state: {
        schemaVersion: 1,
        tables: { inputs: { indexes: { date: { fields: ["at"] } } } },
      },
      onCalendarWork(api, row) {
        const condition = api
          .moduleState("conditions")
          .table("inputs")
          .get(row.sourceRecordIds[0]!);
        if (!condition) throw new Error("Missing owning condition.");
        api.addFinanceCondition(condition as never);
      },
    };
    registerModule(core, module);
    const condition = {
      id: "national-condition",
      placeId: "place",
      at: work.date,
      generalPriceFactor: 1.03,
      wagePriceFactor: 1.02,
      macroDemandFactor: 0.98,
      source,
    };
    api.moduleState("conditions").table("inputs").put(condition);
    api.moduleCalendar("conditions").schedule({
      ...work,
      sourceRecordIds: [condition.id],
      kind: "publish-condition",
    });
    advanceCore(core, work.date);
    expect(core.finance.conditionsByPlace.get("place")).toEqual([condition]);
  });
  it("preserves exact earliest-stop, held release, and resume for the player clock", () => {
    const core = createLifeCore(piecesInput(), { scheduledWork: false }),
      api = coreAPI(core);
    const seen: string[] = [];
    registerModule(core, {
      id: "court",
      onCalendarWork(_, row) {
        seen.push(row.key);
      },
    });
    const calendar = api.moduleCalendar("court");
    calendar.schedule({ ...work, key: "court-day" });
    const token = calendar.registerStop({
      recordId: "court-appearance",
      controlledPersonId: "actor",
      at: { date: work.date, minuteOfDay: 30 },
      kind: "offer-deadline",
      hold: true,
      reasonKey: "court-date",
      source,
    });
    const through = { date: "2026-01-03", minuteOfDay: 0 },
      query = { controlledPersonId: "actor", through };
    const first = earliestPlayerStopV1(core, query);
    expect(first?.at).toEqual({ date: work.date, minuteOfDay: 30 });
    let packet = advancePlayerV1(core, query);
    while (packet.kind === "choice") {
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[0]!.offerId,
      });
    }
    expect(packet.kind).toBe("stop");
    expect(packet.at).toEqual({ date: work.date, minuteOfDay: 30 });
    if (packet.kind !== "stop") throw new Error("Expected actual stop packet.");
    const held = resumePlayerV1(core, {
      kind: "stop",
      pauseId: packet.pauseId,
    });
    expect(held.kind).toBe("stop");
    calendar.releaseStop(token);
    packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
    while (packet.kind === "choice") {
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[0]!.offerId,
      });
    }
    expect(packet.kind).toBe("complete");
    expect(packet.version).toBe("core2-part1b-v1");
    expect(seen).toEqual(["court-day"]);
  });
  it("rejects malformed dates, missing handlers, foreign stop tokens, and stale owners", () => {
    const core = createCore(piecesInput()),
      api = coreAPI(core);
    expect(() => api.moduleCalendar("absent")).toThrow();
    registerModule(core, { id: "no-handler" });
    expect(() => api.moduleCalendar("no-handler").schedule(work)).toThrow(
      /handler/,
    );
    registerModule(core, { id: "owner", onCalendarWork() {} });
    registerModule(core, { id: "other", onCalendarWork() {} });
    const calendar = api.moduleCalendar("owner");
    for (const date of ["2025-12-31", "2026-01-01", "2026-02-30"])
      expect(() => calendar.schedule({ ...work, date })).toThrow();
    expect(() => calendar.schedule({ ...work, sourceRecordIds: [] })).toThrow();
    const token = calendar.registerStop({
      recordId: "stop",
      controlledPersonId: "actor",
      at: { date: work.date, minuteOfDay: 1 },
      kind: "interrupt",
      hold: false,
      reasonKey: "test",
      source,
    });
    expect(() => api.moduleCalendar("other").releaseStop(token)).toThrow(
      /owner/,
    );
    calendar.releaseStop(token);
    expect(() => calendar.releaseStop(token)).toThrow();
    core.modules.set("owner", { id: "owner" });
    expect(() => calendar.get(work.key)).toThrow(/stale/);
  });
  it("faults even when a handler throws a falsy value", () => {
    const core = createCore(piecesInput()),
      api = coreAPI(core);
    registerModule(core, {
      id: "falsy",
      onCalendarWork() {
        throw undefined;
      },
    });
    const calendar = api.moduleCalendar("falsy");
    calendar.schedule(work);
    core.date = work.date;
    expect(() => runModuleCalendar(core, api)).toThrow();
    expect(calendar.get(work.key)?.status).toBe("failed");
    expect(() => runModuleCalendar(core, api)).toThrow(/faulted/);
  });

  it("detaches payloads and faults after a failing handler without replay", () => {
    const core = createCore(piecesInput()),
      api = coreAPI(core);
    let calls = 0;
    registerModule(core, {
      id: "failure",
      onCalendarWork() {
        calls++;
        throw new Error("producer failed");
      },
    });
    const calendar = api.moduleCalendar("failure"),
      payload = { value: 1 };
    const row = calendar.schedule({ ...work, payload });
    payload.value = 2;
    expect(row.payload).toEqual({ value: 1 });
    expect(Object.isFrozen(row.payload)).toBe(true);
    core.date = work.date;
    expect(() => runModuleCalendar(core, api)).toThrow(/producer failed/);
    expect(() => runModuleCalendar(core, api)).toThrow(/faulted/);
    expect(calls).toBe(1);
    expect(calendar.get(work.key)?.status).toBe("failed");
  });
});
