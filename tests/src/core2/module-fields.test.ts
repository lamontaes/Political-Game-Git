import { describe, expect, it } from "vitest";
import { carriersOf, fieldsOf } from "../../../src/core2/module-fields";
import { restoreWorld, snapshotWorld } from "../../../src/core2/snapshot";
import { createCore, registerModule } from "../../../src/core2/state";
import type {
  CoreInput,
  CoreModule,
  CoreState,
} from "../../../src/core2/types";

/** Every field the sessions posted for the plug on Nov 27 (the CTO's 7:39 a.m. line). */
const FIELDS: (keyof CoreModule)[] = [
  "countedPerson",
  "planReaders",
  "huskPromoter",
  "huskIdentity",
  "huskIncome",
  "unbuiltHolders",
  "sharedHours",
  "sittingCalendar",
  "stanceListener",
  "propertyTax",
  "assistanceReader",
  "onStoryHeard",
  "doorChoice",
  "petitionRoll",
  "closedContestWeighed",
  "wardResidency",
  "standingLineLaws",
  "monthlyProgram",
  "budgetVote",
  "budgetHearing",
  "budgetVoteWaits",
  "linePayments",
  "lineAdditions",
  "budgetPassThrough",
  "treasuryRule",
  "contractAwarder",
  "officeTime",
  "countryFlows",
  "legislatureHooks",
  "committeeWait",
  "budgetMeeting",
  "meetingAgendaReader",
  "hearingWitnesses",
  "committeeRoster",
  "floorCalendarer",
  "sittingReader",
  "floorDateReader",
  "weeklyFloorReader",
  "billIntroduced",
  "meetingHold",
  "leaderRefusalReader",
  "bribeScope",
  "policyHandlers",
  "successorProviders",
  "vacancyOffer",
  "specialElections",
  "stopKinds",
  "boardAppointer",
  "worldOpen",
  "adOutlet",
  "derivedCaches",
  "snapshotParts",
  "worldMapParts",
];

function world(): CoreState {
  const input: CoreInput = {
    seed: "module-fields",
    startedAt: "2021-01-01",
    people: [],
    households: [],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  return createCore(input);
}

describe("the fields engines read off the installed modules", () => {
  it.each(FIELDS)(
    "%s: carriers come back in install order, and one that carries none is skipped",
    (field) => {
      const core = world();
      const first = { id: "first", [field]: () => "first" } as CoreModule;
      const none = { id: "none" } as CoreModule;
      const second = { id: "second", [field]: () => "second" } as CoreModule;
      registerModule(core, first);
      registerModule(core, none);
      registerModule(core, second);
      expect(carriersOf(core, field).map((m) => m.id)).toEqual([
        "first",
        "second",
      ]);
      expect(fieldsOf(core, field)).toHaveLength(2);
    },
  );

  it("sees a module installed after the first read", () => {
    const core = world();
    registerModule(core, { id: "early", huskIncome: () => 1 });
    expect(fieldsOf(core, "huskIncome")).toHaveLength(1);
    registerModule(core, { id: "late", huskIncome: () => 2 });
    expect(fieldsOf(core, "huskIncome").map((f) => f(core, "x"))).toEqual([
      1, 2,
    ]);
  });

  it("keeps one world's modules out of another's", () => {
    const a = world();
    const b = world();
    registerModule(a, { id: "only-a", huskIncome: () => 1 });
    expect(fieldsOf(a, "huskIncome")).toHaveLength(1);
    expect(fieldsOf(b, "huskIncome")).toHaveLength(0);
  });

  it("clears a module's derived caches at the end of a restore, and leaves another world's alone", () => {
    const core = world();
    const other = world();
    const cache = new WeakMap<CoreState, unknown>();
    registerModule(core, { id: "cached", derivedCaches: () => [cache] });
    cache.set(core, "built from records");
    cache.set(other, "another world");
    restoreWorld(core, snapshotWorld(core));
    expect(cache.has(core)).toBe(false);
    expect(cache.get(other)).toBe("another world");
  });

  it("saves and restores a part an installed module carries, and ignores one a world does not install", () => {
    const core = world();
    const other = world();
    const kept = new WeakMap<CoreState, string>();
    const module = {
      id: "with-part",
      snapshotParts: {
        "with-part-runtime": {
          save: (c: CoreState) => kept.get(c) ?? null,
          restore: (c: CoreState, data: unknown) => {
            if (typeof data === "string") kept.set(c, data);
            else kept.delete(c);
          },
        },
      },
    } as CoreModule;
    registerModule(core, module);
    kept.set(core, "built while the world ran");
    kept.set(other, "another world");
    const saved = snapshotWorld(core);
    kept.delete(core);
    restoreWorld(core, saved);
    expect(kept.get(core)).toBe("built while the world ran");
    expect(kept.get(other)).toBe("another world");
    expect(JSON.stringify(snapshotWorld(other))).not.toContain(
      "with-part-runtime",
    );
  });

  it("saves and restores a world map a module carries", () => {
    const core = world();
    const runtimes = new WeakMap<CoreState, { count: number }>();
    const module = {
      id: "with-map",
      worldMapParts: {
        "with-map-runtime": {
          map: runtimes,
        },
      },
    } as CoreModule;
    registerModule(core, module);
    runtimes.set(core, { count: 3 });
    const saved = snapshotWorld(core);
    runtimes.delete(core);
    restoreWorld(core, saved);
    expect(runtimes.get(core)).toEqual({ count: 3 });
  });
});
