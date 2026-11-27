import { describe, expect, it } from "vitest";
import { carriersOf, fieldsOf } from "./module-fields";
import { createCore, registerModule } from "./state";
import type { CoreInput, CoreModule, CoreState } from "./types";

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
  "returnedMembersLeave",
  "assistanceReader",
  "onStoryHeard",
  "doorChoice",
  "petitionRoll",
  "closedContestWeighed",
  "wardResidency",
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
});
