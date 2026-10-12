import { describe, expect, it } from "vitest";
import { createCore } from "./state";
import {
  registerModuleStopV1,
  releaseModuleStopV1,
  earliestModuleStopsV1,
  acknowledgeModuleStopsV1,
  bindModuleStopClockV1,
} from "./player-stops-v1";
import type { CoreInput } from "./types";
const source = {
  tag: "SOURCED" as const,
  asOf: "2020-12-01",
  citation: "Controlled module stop producer fixture",
};
function fixture() {
  const input: CoreInput = {
    seed: "controlled-stop-ownership",
    startedAt: "2021-01-01",
    people: [
      {
        id: "actual-person",
        givenName: "Controlled",
        familyName: "Person",
        birthDate: "1980-01-01",
        placeId: "actual-place",
        householdId: "actual-home",
        tier: "weekly",
        traits: {},
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        source,
        familyIds: [],
        knownIds: [],
      },
    ],
    households: [
      {
        id: "actual-home",
        placeId: "actual-place",
        memberIds: ["actual-person"],
        source,
      },
    ],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  return createCore(input, {
    modules: [{ id: "actual-director" }, { id: "actual-offers" }],
  });
}
const input = (recordId = "actual-interrupt", minute = 540.25) => ({
  moduleId: "actual-director",
  recordId,
  controlledPersonId: "actual-person",
  at: { date: "2021-01-02", minuteOfDay: minute },
  kind: "interrupt" as const,
  reasonKey: "actual-recorded-reason",
  source,
  hold: false,
});
function query(core: ReturnType<typeof fixture>, from = 0, through = 1439) {
  return earliestModuleStopsV1(core, {
    controlledPersonId: "actual-person",
    from: { date: "2021-01-02", minuteOfDay: from },
    through: { date: "2021-01-02", minuteOfDay: through },
  });
}
function snapshot(core: ReturnType<typeof fixture>) {
  return structuredClone({
    date: core.date,
    sequence: core.sequence,
    people: core.people,
    knowledge: core.knowledgeByPerson,
    log: core.durableLog,
    focus: core.focusPersonIds,
    time: core.work.timeByPerson,
    finance: core.finance,
    journal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
    stopgaps: core.stopgapHits,
  });
}
describe("module-owned exact player stops", () => {
  it("rejects unowned core wrappers at every registry boundary without reflection", () => {
    const target = fixture(),
      token = registerModuleStopV1(target, input()),
      rows = query(target);
    let reflected = 0;
    const trap = (): never => {
      reflected++;
      throw new Error("Unowned core reflection executed.");
    };
    const core = new Proxy(target, {
      get: trap,
      getOwnPropertyDescriptor: trap,
      getPrototypeOf: trap,
      ownKeys: trap,
    });
    for (const call of [
      () => registerModuleStopV1(core, input("wrapped")),
      () => releaseModuleStopV1(core, token),
      () => acknowledgeModuleStopsV1(core, rows),
      () => query(core),
      () =>
        bindModuleStopClockV1(core, {
          controlledPersonId: "actual-person",
          at: input().at,
        }),
    ])
      expect(call).toThrow("Part1b requires its actual factory-owned core.");
    expect(reflected).toBe(0);
    expect(query(target)).toEqual(rows);
  });

  it("rejects a late descriptor replay that replaces the actual module map owner", () => {
    const core = fixture();
    let armed = false,
      reads = 0;
    const owner = new Proxy(
      { id: "actual-director" },
      {
        getOwnPropertyDescriptor(target, key) {
          if (armed && key === "id" && ++reads === 2)
            core.modules.set("actual-director", { id: "actual-director" });
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    core.modules.set("actual-director", owner);
    registerModuleStopV1(core, input());
    armed = true;
    expect(() => query(core)).toThrow(
      /actual module owner changed after final reflection/,
    );
    expect(reads).toBe(2);
    expect(core.modules.get("actual-director")).not.toBe(owner);
  });

  it("rejects unowned acknowledgment getters without running them or releasing the genuine interrupt", () => {
    const core = fixture();
    registerModuleStopV1(core, input());
    const rows = query(core);
    let calls = 0;
    const fake = { ...rows[0]! };
    Object.defineProperty(fake, "moduleId", {
      get() {
        calls++;
        throw new Error("Unowned getter executed.");
      },
    });
    expect(() => acknowledgeModuleStopsV1(core, [fake])).toThrow(
      /direct own data/,
    );
    expect(calls).toBe(0);
    expect(query(core)).toEqual(rows);
  });
  it.each(["removed", "replaced"])(
    "rejects a stop whose original actual module was %s",
    (kind) => {
      const core = fixture();
      registerModuleStopV1(core, input());
      if (kind === "removed") core.modules.delete("actual-director");
      else core.modules.set("actual-director", { id: "actual-director" });
      expect(() => query(core)).toThrow(/actual registered module owner/);
    },
  );
  it("rejects absent required fields without inherited prototype getters", () => {
    const core = fixture();
    let calls = 0;
    for (const key of ["citation", "minuteOfDay"]) {
      const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
      Object.defineProperty(Object.prototype, key, {
        configurable: true,
        get() {
          calls++;
          throw new Error("Inherited getter executed.");
        },
      });
      try {
        const raw = input();
        if (key === "citation")
          Reflect.deleteProperty((raw.source = { ...source }), key);
        else Reflect.deleteProperty(raw.at, key);
        expect(() => registerModuleStopV1(core, raw)).toThrow();
      } finally {
        if (previous) Object.defineProperty(Object.prototype, key, previous);
        else Reflect.deleteProperty(Object.prototype, key);
      }
    }
    expect(calls).toBe(0);
    expect(query(core)).toEqual([]);
  });

  it("orders exact fractional stops, preserves all ties and leaves ordinary game state untouched", () => {
    const core = fixture(),
      before = snapshot(core);
    registerModuleStopV1(core, input("later", 600));
    registerModuleStopV1(core, input("z-tie"));
    registerModuleStopV1(core, {
      ...input("a-tie"),
      moduleId: "actual-offers",
      kind: "offer-deadline",
      hold: true,
    });
    expect(
      query(core).map((x) => [x.moduleId, x.recordId, x.at.minuteOfDay]),
    ).toEqual([
      ["actual-director", "z-tie", 540.25],
      ["actual-offers", "a-tie", 540.25],
    ]);
    expect(query(core, 541).map((x) => x.recordId)).toEqual(["later"]);
    expect(snapshot(core)).toEqual(before);
  });
  it("detaches full saved Source children and consumes only an actual one-shot interrupt", () => {
    const core = fixture(),
      raw = {
        ...input(),
        source: { ...source, saved: { ids: ["actual-cause"] } },
      };
    registerModuleStopV1(core, raw);
    raw.source.saved.ids[0] = "changed-later";
    const rows = query(core);
    expect(rows[0]!.source).toEqual({
      ...source,
      saved: { ids: ["actual-cause"] },
    });
    expect(Object.isFrozen(rows[0]!.source)).toBe(true);
    expect(() => acknowledgeModuleStopsV1(core, [rows[0]!, rows[0]!])).toThrow(
      /duplicated/,
    );
    expect(query(core)).toEqual(rows);
    expect(acknowledgeModuleStopsV1(core, rows)).toBe(false);
    expect(query(core)).toEqual([]);
    expect(() => acknowledgeModuleStopsV1(core, rows)).toThrow(/stale/);
  });
  it("holds an actual deadline until its owning token releases it and rejects foreign/lookalike tokens", () => {
    const core = fixture(),
      token = registerModuleStopV1(core, {
        ...input(),
        kind: "offer-deadline",
        hold: true,
      }),
      rows = query(core);
    expect(acknowledgeModuleStopsV1(core, rows)).toBe(true);
    expect(query(core)).toEqual(rows);
    expect(() => releaseModuleStopV1(fixture(), token)).toThrow(/another core/);
    expect(() =>
      releaseModuleStopV1(core, { version: "core2-part1b-v1" }),
    ).toThrow(/stale/);
    expect(query(core)).toEqual(rows);
    releaseModuleStopV1(core, token);
    expect(query(core)).toEqual([]);
  });
  it.each([
    "module",
    "person",
    "past",
    "minute",
    "future-source",
    "duplicate",
    "waived-deadline",
  ])(
    "rejects invalid producer ownership before adding a record (%s)",
    (kind) => {
      const core = fixture(),
        raw = input();
      registerModuleStopV1(core, input("original"));
      if (kind === "module") raw.moduleId = "missing-module";
      if (kind === "person") raw.controlledPersonId = "missing-person";
      if (kind === "past") raw.at.date = "2020-12-31";
      if (kind === "minute") raw.at.minuteOfDay = 1440;
      if (kind === "future-source")
        raw.source = { ...source, asOf: "2021-01-02" };
      if (kind === "duplicate") raw.recordId = "original";
      if (kind === "waived-deadline")
        Object.assign(raw, { kind: "offer-deadline", hold: false });
      const before = snapshot(core),
        rows = query(core);
      expect(() => registerModuleStopV1(core, raw)).toThrow();
      expect(query(core)).toEqual(rows);
      expect(snapshot(core)).toEqual(before);
    },
  );
  it("rejects getters without invoking them and leaves existing stops unchanged", () => {
    const core = fixture(),
      raw = input();
    let calls = 0;
    Object.defineProperty(raw, "reasonKey", {
      enumerable: true,
      get() {
        calls++;
        throw new Error("getter executed");
      },
    });
    expect(() => registerModuleStopV1(core, raw)).toThrow(/direct own data/);
    expect(calls).toBe(0);
    expect(query(core)).toEqual([]);
  });
  it("detects reentrant private registry changes on final query verification", () => {
    const core = fixture();
    registerModuleStopV1(core, input("original"));
    let keys = 0;
    const request = {
      controlledPersonId: "actual-person",
      from: { date: "2021-01-02", minuteOfDay: 0 },
      through: { date: "2021-01-02", minuteOfDay: 1439 },
    };
    const proxy = new Proxy(request, {
      ownKeys(target) {
        keys++;
        if (keys === 2) registerModuleStopV1(core, input("caller-added", 600));
        return Reflect.ownKeys(target);
      },
    });
    expect(() => earliestModuleStopsV1(core, proxy)).toThrow(
      /registry changed during query/,
    );
    expect(query(core, 541).map((x) => x.recordId)).toEqual(["caller-added"]); // Caller mutation is preserved; no rollback claim.
  });
  it("detects reentrant duplicate admission without overwriting the nested actual record", () => {
    const core = fixture();
    let keys = 0;
    const raw = input("same");
    const proxy = new Proxy(raw, {
      ownKeys(target) {
        keys++;
        if (keys === 2)
          registerModuleStopV1(core, {
            ...input("same"),
            reasonKey: "nested-real-producer",
          });
        return Reflect.ownKeys(target);
      },
    });
    expect(() => registerModuleStopV1(core, proxy)).toThrow(
      /registry changed during admission/,
    );
    expect(query(core)[0]!.reasonKey).toBe("nested-real-producer");
  });
});

const moment = (minuteOfDay: number) => ({ date: "2021-01-02", minuteOfDay });
describe("private owned module stop clock", () => {
  it("admits one actual-person binding, detaches its minute and changes no ordinary state", () => {
    const core = fixture(),
      before = snapshot(core),
      raw = { controlledPersonId: "actual-person", at: moment(500.125) },
      clock = bindModuleStopClockV1(core, raw);
    expect(Object.isFrozen(clock)).toBe(true);
    raw.at.minuteOfDay = 0;
    expect(() =>
      bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(500.125),
      }),
    ).toThrow(/active binding/);
    expect(() =>
      bindModuleStopClockV1(core, {
        controlledPersonId: "missing-person",
        at: moment(500.125),
      }),
    ).toThrow(/actual living owner/);
    expect(() => registerModuleStopV1(core, input("past", 499))).toThrow(
      /owned clock frontier/,
    );
    expect(snapshot(core)).toEqual(before);
  });
  it("rejects same-day earlier registration and admits an exact fractional frontier stop", () => {
    const core = fixture();
    bindModuleStopClockV1(core, {
      controlledPersonId: "actual-person",
      at: moment(600.5),
    });
    expect(() => registerModuleStopV1(core, input("past", 600.25))).toThrow(
      /owned clock frontier/,
    );
    expect(query(core)).toEqual([]);
    registerModuleStopV1(core, input("exact", 600.5));
    expect(query(core, 600.5, 600.5).map((row) => row.recordId)).toEqual([
      "exact",
    ]);
  });
  it("permits exact landing but blocks crossing a held deadline until its genuine owner releases it", () => {
    const core = fixture(),
      clock = bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(500),
      }),
      token = registerModuleStopV1(core, {
        ...input("deadline", 600.5),
        moduleId: "actual-offers",
        kind: "offer-deadline",
        hold: true,
      }),
      before = snapshot(core);
    clock.setFrontier(moment(600.5));
    expect(() => clock.setFrontier(moment(601))).toThrow(/unresolved stop/);
    expect(acknowledgeModuleStopsV1(core, query(core, 600.5, 600.5))).toBe(
      true,
    );
    expect(() => clock.setFrontier(moment(601))).toThrow(/unresolved stop/);
    releaseModuleStopV1(core, token);
    clock.setFrontier(moment(601));
    expect(() => clock.setFrontier(moment(600.5))).toThrow(/monotonic/);
    expect(snapshot(core)).toEqual(before);
  });
  it("keeps a one-shot stop blocking until canonical acknowledgment consumes it", () => {
    const core = fixture(),
      clock = bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(500),
      });
    registerModuleStopV1(core, input("once", 600.25));
    clock.setFrontier(moment(600.25));
    expect(() => clock.setFrontier(moment(600.5))).toThrow(/unresolved stop/);
    expect(acknowledgeModuleStopsV1(core, query(core, 600.25, 600.25))).toBe(
      false,
    );
    clock.setFrontier(moment(600.5));
    expect(query(core)).toEqual([]);
  });
  it("refuses initial binding beyond an already unresolved stop", () => {
    const core = fixture();
    registerModuleStopV1(core, input("already-saved", 530));
    expect(() =>
      bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(540),
      }),
    ).toThrow(/unresolved stop/);
    const clock = bindModuleStopClockV1(core, {
      controlledPersonId: "actual-person",
      at: moment(500),
    });
    clock.setFrontier(moment(530));
    expect(query(core, 530, 530)[0]!.recordId).toBe("already-saved");
  });
  it("retires capabilities without deleting their floor or allowing an old capability to retire a new session", () => {
    const core = fixture(),
      clock = bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(500),
      });
    clock.setFrontier(moment(550));
    clock.retire();
    clock.retire();
    expect(() => clock.setFrontier(moment(551))).toThrow(/stale/);
    expect(() =>
      bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(549),
      }),
    ).toThrow(/prior frontier/);
    const next = bindModuleStopClockV1(core, {
      controlledPersonId: "actual-person",
      at: moment(550),
    });
    expect(() => clock.retire()).toThrow(/stale/);
    next.setFrontier(moment(560));
    expect(() =>
      registerModuleStopV1(core, input("past-new-session", 559)),
    ).toThrow(/owned clock frontier/);
  });
  it("rejects clock minute accessors without invoking them or moving the frontier", () => {
    const core = fixture(),
      clock = bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(500),
      });
    let calls = 0;
    const raw = moment(550);
    Object.defineProperty(raw, "minuteOfDay", {
      enumerable: true,
      get() {
        calls++;
        throw new Error("Clock getter executed.");
      },
    });
    expect(() => clock.setFrontier(raw)).toThrow(/direct own data/);
    expect(calls).toBe(0);
    registerModuleStopV1(core, input("unchanged-floor", 500));
    expect(query(core, 500, 500)[0]!.recordId).toBe("unchanged-floor");
  });
  it("detects reentrant final clock advance while preserving the caller's genuine newer frontier", () => {
    const core = fixture(),
      clock = bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(500),
      });
    let keys = 0;
    const raw = new Proxy(moment(550), {
      ownKeys(target) {
        if (++keys === 2) clock.setFrontier(moment(560));
        return Reflect.ownKeys(target);
      },
    });
    expect(() => clock.setFrontier(raw)).toThrow(
      /clock changed during advance/,
    );
    expect(() =>
      registerModuleStopV1(core, input("behind-caller-frontier", 550)),
    ).toThrow(/owned clock frontier/);
    registerModuleStopV1(core, input("actual-caller-frontier", 560));
    expect(query(core, 560, 560)[0]!.recordId).toBe("actual-caller-frontier");
  });
  it("detects a module descriptor retiring the owned clock during final stop admission", () => {
    const core = fixture(),
      clock = bindModuleStopClockV1(core, {
        controlledPersonId: "actual-person",
        at: moment(500),
      });
    let reads = 0;
    const owner = new Proxy(
      { id: "actual-director" },
      {
        getOwnPropertyDescriptor(target, key) {
          if (key === "id" && ++reads === 2) clock.retire();
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    core.modules.set("actual-director", owner);
    expect(() => registerModuleStopV1(core, input("outer", 540))).toThrow(
      /clock changed during admission/,
    );
    expect(query(core)).toEqual([]);
    expect(() => clock.setFrontier(moment(550))).toThrow(/stale/);
  });
});
