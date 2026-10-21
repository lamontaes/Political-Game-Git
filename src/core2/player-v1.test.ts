import { describe, expect, it } from "vitest";
import { parameter as p } from "./parameters";
import { createLifeCore, advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  advancePlayerV1,
  resumePlayerV1,
  earliestPlayerStopV1,
  retirePlayerV1,
} from "./player-v1";
import type { PlayerPacketV1 } from "./player-v1";
import { registerModuleStopV1, releaseModuleStopV1 } from "./player-stops-v1";
import { resolveSavedTraceV1 } from "./saved-trace-v1";
import type { CoreInput, Source, DecisionResult } from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
const source: Source = {
  tag: "SOURCED",
  asOf: "2020-12-01",
  citation:
    "Controlled player clock contract fixture, not generated-world evidence.",
};
function fixture(minutes = p("minutesPerHour")): CoreInput {
  const calendar: WorkPayrollCalendarInput = {
    id: "recorded-pay-calendar",
    organizationId: "employer",
    workCommitmentIds: ["work"],
    basisRecordIds: ["employer", "job", "work"],
    rule: "fixed-days-after-inclusive-period-end",
    firstPeriodStartsAt: "2021-01-01",
    periodDays: p("daysPerWeek"),
    firstPaydayAt: "2021-01-08",
    effectiveFrom: "2021-01-01",
    nonbusinessDayRule: "no-adjustment",
    arrearsRule: "carry-to-next-recorded-payday",
    source,
  };
  return {
    seed: "controlled-attendance-accrual",
    startedAt: "2021-01-01",
    people: [
      {
        id: "worker",
        givenName: "Controlled",
        familyName: "Worker",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        source,
        familyIds: [],
        knownIds: [],
        jobId: "job",
      },
    ],
    households: [
      { id: "home", placeId: "place", memberIds: ["worker"], source },
    ],
    organizations: [
      {
        id: "employer",
        placeId: "place",
        name: "Controlled employer",
        kind: "employer",
        liquidMinor: p("zero"),
        source,
      },
    ],
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Actual saved fixture job",
        hoursDaily: p("one"),
        hourlyMinor: 1001,
        wageDailyMinor: 1001,
        source,
      },
    ],
    workCommitments: [
      {
        id: "work",
        jobId: "job",
        personId: "worker",
        organizationId: "employer",
        payrollCalendarId: calendar.id,
        startsAt: "2021-01-01",
        anchorDate: "2021-01-01",
        periodDays: p("one"),
        expectedWeeklyMinutes: minutes * p("daysPerWeek"),
        hourlyMinor: 1001,
        slots: [{ offsetDays: p("zero"), startMinute: p("zero"), minutes }],
        paySource: source,
        scheduleSource: source,
      },
    ],
    workPayrollCalendars: [calendar],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
const minute = (date: string, minuteOfDay: number) => ({ date, minuteOfDay });
function fresh(minutes = p("minutesPerHour")) {
  const input = fixture(minutes);
  const npc = {
    ...input.people[0]!,
    id: "continuing-npc",
    givenName: "Other",
    jobId: undefined,
    tier: "daily" as const,
  };
  input.people = [...input.people, npc];
  input.households = [
    { ...input.households[0]!, memberIds: ["worker", npc.id] },
  ];
  return createLifeCore(input, {
    modules: [{ id: "fixture-director" }],
  });
}
function answer(
  core: ReturnType<typeof fresh>,
  packet: PlayerPacketV1,
): PlayerPacketV1 {
  if (packet.kind === "stop")
    return resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
  if (packet.kind !== "choice") throw new Error("No outstanding answer.");
  const offered =
    packet.offers.find(
      (o) => o.actionId === "attend-scheduled-work-date-segment",
    ) ?? packet.offers[0]!;
  return resumePlayerV1(core, {
    kind: "choice",
    pauseId: packet.pauseId,
    offerId: offered.offerId,
  });
}
function boundary(core: ReturnType<typeof fresh>) {
  return structuredClone({
    date: core.date,
    people: core.people,
    work: core.work,
    log: core.durableLog,
    cash: core.cashJournal.totals,
    sequence: core.sequence,
  });
}
describe("controlled player clock contracts", () => {
  it("returns the original unanswered packet and rejects foreign offers without advancing", () => {
    const core = fresh();
    let packet = advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 120),
    });
    expect(packet.kind).toBe("stop");
    packet = answer(core, packet);
    expect(packet.kind).toBe("choice");
    if (packet.kind !== "choice") throw new Error("Expected choice");
    const before = boundary(core);
    expect(
      advancePlayerV1(core, {
        controlledPersonId: "worker",
        through: minute("2021-01-03", 0),
      }),
    ).toBe(packet);
    expect(() =>
      resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: "fabricated",
      }),
    ).toThrow(/unavailable/);
    expect(boundary(core)).toEqual(before);
    expect(() => advanceCore(core, "2021-01-03")).toThrow(/resumable/);
  });
  it("suspends accepted work at a fractional interrupt with no premature earned pay", () => {
    const core = fresh(60.5),
      stop = registerModuleStopV1(core, {
        moduleId: "fixture-director",
        recordId: "interrupt",
        controlledPersonId: "worker",
        at: minute("2021-01-02", 30.25),
        kind: "interrupt",
        reasonKey: "actual-interrupt",
        source,
        hold: false,
      });
    const initial = earliestPlayerStopV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 120),
    });
    expect(initial?.at).toEqual(minute("2021-01-02", 0));
    expect(core.date).toBe("2021-01-01");
    let packet = advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 120),
    });
    packet = answer(core, packet);
    packet = answer(core, packet);
    expect(packet.kind).toBe("stop");
    expect(packet.at).toEqual(minute("2021-01-02", 30.25));
    expect(core.work.totalsByJob.get("job")?.earnedMinor ?? 0).toBe(0);
    expect(core.work.lastAttendanceByJob.size).toBe(0);
    packet = answer(core, packet);
    expect(packet.kind).toBe("stop");
    expect(packet.at).toEqual(minute("2021-01-02", 60.5));
    expect(core.work.lastAttendanceByJob.get("job")?.attendedMinutes).toBe(
      60.5,
    );
    expect(() => releaseModuleStopV1(core, stop)).toThrow(/stale/);
    expect(core.people.get("worker")!.tier).toBe("weekly");
    expect(core.focusPersonIds.size).toBe(0);
  });
  it("holds owned offer deadlines until their owner releases them, never the client", () => {
    const core = fresh(),
      token = registerModuleStopV1(core, {
        moduleId: "fixture-director",
        recordId: "offer",
        controlledPersonId: "worker",
        at: minute("2021-01-02", 30),
        kind: "offer-deadline",
        reasonKey: "actual-deadline",
        source,
        hold: true,
      });
    let packet = advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 120),
    });
    packet = answer(core, packet);
    packet = answer(core, packet);
    const before = boundary(core);
    expect(answer(core, packet)).toBe(packet);
    expect(boundary(core)).toEqual(before);
    releaseModuleStopV1(core, token);
    packet = answer(core, packet);
    expect(packet.at).toEqual(minute("2021-01-02", 60));
    expect(() =>
      registerModuleStopV1(core, {
        moduleId: "fixture-director",
        recordId: "late",
        controlledPersonId: "worker",
        at: minute("2021-01-02", 20),
        kind: "interrupt",
        reasonKey: "late",
        source,
        hold: false,
      }),
    ).toThrow();
  });
  it("rejects stale answers and runs seven full days with no attendance or payday replay", () => {
    const core = fresh(),
      target = minute("2021-01-09", 0);
    let packet = advancePlayerV1(core, {
        controlledPersonId: "worker",
        through: target,
      }),
      oldChoice: Extract<PlayerPacketV1, { kind: "choice" }> | undefined,
      steps = 0;
    while (packet.kind !== "complete") {
      if (packet.kind === "choice") oldChoice = packet;
      packet = answer(core, packet);
      if (++steps > 200) throw new Error("Clock did not complete");
    }
    expect(packet.simulatedDays).toBe(7);
    expect(core.people.get("continuing-npc")!.actCount).toBeGreaterThan(0);
    expect(core.work.lastAttendanceByJob.get("job")?.date).toBe("2021-01-08");
    const before = boundary(core);
    expect(
      advancePlayerV1(core, { controlledPersonId: "worker", through: target })
        .kind,
    ).toBe("complete");
    expect(boundary(core)).toEqual(before);
    expect(() =>
      resumePlayerV1(core, {
        kind: "choice",
        pauseId: oldChoice!.pauseId,
        offerId: oldChoice!.offers[0]!.offerId,
      }),
    ).toThrow(/stale|outstanding|unavailable/);
    for (const record of core.durableLog.values()) {
      expect(() => resolveSavedTraceV1(core, record.id)).not.toThrow();
      if (record.personIds.includes("worker") && record.kind === "person.acted")
        expect(
          (record.decision as DecisionResult).controlledChoice,
        ).toBeDefined();
    }
    retirePlayerV1(core);
    expect(() => advanceCore(core, "2021-01-09")).not.toThrow();
  });
  it("releases the clock of a controlled character who died, and a connected person takes it", () => {
    const core = fresh();
    advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 0),
    });
    // The controlled character dies partway through the player's day.
    coreAPI(core).updatePerson("worker", { alive: false });
    // Their clock cannot go on, but it can be released as it stands.
    expect(() =>
      advancePlayerV1(core, {
        controlledPersonId: "worker",
        through: minute("2021-01-03", 0),
      }),
    ).toThrow(/no longer alive/);
    expect(() => retirePlayerV1(core)).not.toThrow();
    // A connected person takes control on a fresh clock.
    const next = advancePlayerV1(core, {
      controlledPersonId: "continuing-npc",
      through: minute("2021-01-03", 0),
    });
    expect(next.controlledPersonId).toBe("continuing-npc");
  });
  it("saves the character's own choice as theirs when the player skips", () => {
    const core = fresh();
    let packet = advancePlayerV1(core, {
        controlledPersonId: "worker",
        through: minute("2021-01-04", 0),
      }),
      steps = 0,
      own = 0;
    while (packet.kind !== "complete") {
      if (packet.kind === "choice") {
        own++;
        packet = resumePlayerV1(core, {
          kind: "own-choice",
          pauseId: packet.pauseId,
        });
      } else packet = answer(core, packet);
      if (++steps > 200) throw new Error("Clock did not complete");
    }
    expect(own).toBeGreaterThan(0);
    const acts = [...core.durableLog.values()].filter(
      (record) =>
        record.personIds.includes("worker") && record.kind === "person.acted",
    );
    expect(acts.length).toBeGreaterThan(0);
    for (const record of acts) {
      const decision = record.decision as DecisionResult;
      expect(decision.controlledChoice).toBeUndefined();
      expect(decision.reasonKey?.startsWith("controlled:")).toBe(false);
    }
  });
  it("preserves the zero-duration absence choice while leaving its scheduled consequence unposted until its window ends", () => {
    const core = fresh();
    let packet = advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 30),
    });
    packet = answer(core, packet);
    if (packet.kind !== "choice") throw new Error("Expected work choice");
    const absence = packet.offers.find(
      (o) => o.actionId === "decline-scheduled-work-date-segment",
    )!;
    expect(absence.durationMinutes).toBe(0);
    packet = resumePlayerV1(core, {
      kind: "choice",
      pauseId: packet.pauseId,
      offerId: absence.offerId,
    });
    expect(packet.at).toEqual(minute("2021-01-02", 30));
    expect(core.work.lastAttendanceByJob.size).toBe(0);
    packet = advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 60),
    });
    expect(packet.kind).toBe("stop");
    expect(core.work.lastAttendanceByJob.get("job")?.absentMinutes).toBe(60);
  });
  it("cites and guards the actual discretionary duration override instead of the longer action default", () => {
    const core = fresh();
    let packet = advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-02", 120),
    });
    packet = answer(core, packet);
    packet = answer(core, packet);
    packet = answer(core, packet);
    expect(packet.kind).toBe("choice");
    if (packet.kind !== "choice")
      throw new Error("Expected discretionary choice");
    const rest = packet.offers.find((o) => o.actionId === "rest")!;
    expect(rest.durationMinutes).toBe(p("restDayHours") * p("minutesPerHour"));
    expect(rest.durationEvidence.effortParameter).toBe("restDayHours");
    const before = boundary(core),
      actual = core.data.parameters.restDayHours!;
    const previous = actual.value;
    try {
      actual.value += p("one");
      expect(() =>
        resumePlayerV1(core, {
          kind: "choice",
          pauseId: packet.pauseId,
          offerId: rest.offerId,
        }),
      ).toThrow(/changed|Stale|stale/);
      expect(boundary(core)).toEqual(before);
    } finally {
      actual.value = previous;
    }
  });
  it("rejects request reflection that tries to reenter the public clock without changing records", () => {
    const core = fresh(),
      before = boundary(core);
    let traps = 0;
    const request = new Proxy(
      { controlledPersonId: "worker", through: minute("2021-01-02", 120) },
      {
        getOwnPropertyDescriptor(target, key) {
          traps++;
          advancePlayerV1(core, {
            controlledPersonId: "worker",
            through: minute("2021-01-02", 120),
          });
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    expect(() => advancePlayerV1(core, request)).toThrow(/reenter/);
    expect(traps).toBe(1);
    expect(boundary(core)).toEqual(before);
  });
  it("rejects wrapped cores before any caller reflection", () => {
    const core = fresh();
    let reads = 0;
    const wrapped = new Proxy(core, {
      getOwnPropertyDescriptor() {
        reads++;
        throw new Error("reflection");
      },
    });
    expect(() =>
      advancePlayerV1(wrapped, {
        controlledPersonId: "worker",
        through: minute("2021-01-02", 120),
      }),
    ).toThrow(/factory/);
    expect(reads).toBe(0);
  });
});

describe("modules reading the controlled person during a skip", () => {
  it("gets a read-only view instead of refreshing the player's needs", () => {
    let calls = 0;
    const core = createLifeCore(fixture(), {
      modules: [
        {
          id: "fixture-reader",
          onDay(api, _decide, refresh) {
            const actor = api.state.people.get("worker")!;
            const before = JSON.stringify(actor.needs);
            refresh(actor);
            refresh(actor, Object.keys(actor.needs).slice(0, 1));
            expect(JSON.stringify(actor.needs)).toBe(before);
            calls++;
            return undefined;
          },
        },
      ],
    });
    let packet = advancePlayerV1(core, {
      controlledPersonId: "worker",
      through: minute("2021-01-04", p("zero")),
    });
    for (let guard = 0; packet.kind !== "complete" && guard < 50; guard++)
      packet =
        packet.kind === "stop"
          ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
          : resumePlayerV1(core, {
              kind: "own-choice",
              pauseId: packet.pauseId,
            });
    expect(packet.kind).toBe("complete");
    expect(calls).toBeGreaterThan(0);
  });
});
