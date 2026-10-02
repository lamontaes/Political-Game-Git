import { afterEach, describe, expect, it, vi } from "vitest";
import { createScenarioWorld } from "./demo";
import { advanceWorld, createWorld } from "./world";
import { createProductionPolicyCatalog } from "./production-catalog";
import { requireLifePlace } from "./life-places";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  recordExecutiveAction,
} from "./legislation";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalMeasureKey,
  municipalSeats,
} from "./municipal-public-work";
import {
  recordCouncilReadingVote,
  overrideDeadline,
  addWeekdays,
  actOnCouncilMeasure,
  municipalExecutiveHolder,
  councilActOverrideDeadlineHandler,
} from "./municipal-ordinance-procedure";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "./nationwide-world/district-of-columbia-council-opening";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { World } from "./types";

function returnedAct(returnIt = true) {
  // Explicit supplied bill, unanimous readings and executive return. The
  // replacement must obtain the reenactment ballots from the existing members.
  const place = requireLifePlace("1150000");
  const base = createScenarioWorld("a82-supplied-returned-act", place.context, {
    peopleCount: 16,
  });
  let world = ensureDistrictOfColumbiaCouncilOpening(
    createWorld({
      seed: base.seed,
      currentDate: base.currentDate,
      currentMoment: base.currentMoment,
      jurisdictions: base.jurisdictionOrder.map(
        (id) => base.jurisdictions[id]!,
      ),
      people: base.personOrder.map((id) => base.people[id]!),
      policyCatalog: createProductionPolicyCatalog(),
    }),
  );
  world = ensureStateExecutiveIncumbent(world, world.personOrder[0]!, "DC");
  const seats = municipalSeats(world, DC_GOVERNMENT_KEY);
  const outsider = world.personOrder.find(
    (id) => !seats.some((seat) => seat.personId === id),
  )!;
  expect(outsider).toBeDefined();
  world = { ...world, control: { kind: "person", personId: outsider } };
  const rules = municipalRulePackFor(
    municipalGovernmentByKey(DC_GOVERNMENT_KEY)!,
  );
  if (!rules.ok) throw new Error("Missing sourced municipal pack.");
  world = introduceMeasure(world, {
    stableKey: municipalMeasureKey(DC_GOVERNMENT_KEY, "B26-0901"),
    jurisdictionId: municipalGovernmentJurisdictionId(
      world,
      DC_GOVERNMENT_KEY,
    )!,
    rulePackId: rules.pack.packId,
    designation: "B26-0901",
    shortTitle: "Supplied returned act",
    summary: "Explicit returned-act fixture; no authored reenactment ballots.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: seats[0]!.personId,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  world = placeMeasureOnCalendar(world, {
    stableKey: `${measure.stableKey}:agenda`,
    measureId: measure.id,
    rationale: "Supplied reading agenda.",
  });
  const read = (at: World) =>
    recordCouncilReadingVote(at, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions: seats.map((seat, index) => ({
        memberKey: `council:${index + 1}`,
        personId: seat.personId,
        disposition: "yea" as const,
      })),
      provenance: {
        method: "authored-fixture",
        note: "Supplied passage only, not an NPC choice.",
        sourceEntityIds: [measure.id],
      },
    });
  const first = read(world);
  if (!first.ok) throw new Error(first.reason);
  world = advanceWorld(first.world, 14);
  const final = read(world);
  if (!final.ok) throw new Error(final.reason);
  expect(measurePosition(final.world, measure.id).phase).toBe(
    "awaiting-executive",
  );
  world = returnIt
    ? recordExecutiveAction(final.world, {
        stableKey: `${measure.stableKey}:return`,
        measureId: measure.id,
        action: "vetoed",
        rationale: "Explicit supplied executive return.",
      })
    : final.world;
  return { world, measure, outsider, seats };
}

import * as packResolver from "./legislative-procedure-world";
import { addDays, makeIsoDate } from "./dates";
import { ensureStateExecutiveIncumbent } from "./nationwide-world/state-executives";
import { knownRule, unknownRule } from "./legislature-rules";
import type { ExecutiveRule } from "./legislature-rules";

afterEach(() => vi.restoreAllMocks());

function replaceWindow(window: ExecutiveRule["vetoOverrideWindow"]) {
  const original = packResolver.legislativeRulePackForWorld;
  vi.spyOn(packResolver, "legislativeRulePackForWorld").mockImplementation(
    (world, id) => {
      const pack = original(world, id);
      return {
        ...pack,
        executive: { ...pack.executive, vetoOverrideWindow: window },
      };
    },
  );
}

describe("A82 sourced municipal override deadline", () => {
  it("retains the cited DC window in the production pack and uses the saved return date on reload", () => {
    const { world, measure } = returnedAct();
    const rule = packResolver.legislativeRulePackForWorld(
      world,
      measure.rulePackId,
    ).executive.vetoOverrideWindow;
    expect(rule?.kind).toBe("known");
    if (rule?.kind !== "known") throw new Error("Missing sourced window");
    expect(rule.value).toEqual({
      days: 30,
      dayBasis: "CALENDAR",
      anchor: "executive-return",
    });
    expect(rule.source.citation).toContain("1-204.04(e)");
    const expected = addDays(world.currentDate, rule.value.days);
    expect(overrideDeadline(world, DC_GOVERNMENT_KEY, measure.id)).toBe(
      expected,
    );
    const loaded = deserializeWorld(serializeWorld(world));
    expect(overrideDeadline(loaded, DC_GOVERNMENT_KEY, measure.id)).toBe(
      expected,
    );
  });

  it.each([undefined, unknownRule("Controlled unsourced window")])(
    "does not replace a missing window with the old scalar",
    (window) => {
      const { world, measure } = returnedAct();
      replaceWindow(window);
      expect(overrideDeadline(world, DC_GOVERNMENT_KEY, measure.id)).toBeNull();
    },
  );

  it("does not treat a Mayor's return as a clerk receipt", () => {
    const { world, measure } = returnedAct();
    const pack = packResolver.legislativeRulePackForWorld(
      world,
      measure.rulePackId,
    );
    replaceWindow(
      knownRule(
        { days: 14, dayBasis: "CALENDAR", anchor: "clerk-receipt" },
        pack.executive.source,
      ),
    );
    expect(overrideDeadline(world, DC_GOVERNMENT_KEY, measure.id)).toBeNull();
  });

  it("uses the admitted business-day basis, excluding weekends, without inventing holidays", () => {
    const { world, measure } = returnedAct();
    const pack = packResolver.legislativeRulePackForWorld(
      world,
      measure.rulePackId,
    );
    replaceWindow(
      knownRule(
        { days: 7, dayBasis: "BUSINESS", anchor: "executive-return" },
        pack.executive.source,
      ),
    );
    expect(overrideDeadline(world, DC_GOVERNMENT_KEY, measure.id)).toBe(
      addWeekdays(world.currentDate, 7),
    );
    expect(addWeekdays(makeIsoDate("2026-10-02"), 1)).toBe("2026-10-05");
  });

  it("admits a zero-day window on the recorded return date and hides a future return", () => {
    const { world, measure } = returnedAct();
    const pack = packResolver.legislativeRulePackForWorld(
      world,
      measure.rulePackId,
    );
    replaceWindow(
      knownRule(
        { days: 0, dayBasis: "CALENDAR", anchor: "executive-return" },
        pack.executive.source,
      ),
    );
    expect(overrideDeadline(world, DC_GOVERNMENT_KEY, measure.id)).toBe(
      world.currentDate,
    );
    expect(
      overrideDeadline(
        { ...world, currentDate: addDays(world.currentDate, -1) },
        DC_GOVERNMENT_KEY,
        measure.id,
      ),
    ).toBeNull();
  });

  it("schedules expiration after the inclusive last day from the real executive caller", () => {
    const { world, measure } = returnedAct(false);
    const holder = municipalExecutiveHolder(world, DC_GOVERNMENT_KEY);
    expect(holder).not.toBeNull();
    const returned = actOnCouncilMeasure(
      { ...world, control: { kind: "person", personId: holder! } },
      {
        governmentKey: DC_GOVERNMENT_KEY,
        measureId: measure.id,
        decision: "return",
        reasons: "Controlled executive's own recorded reasons.",
      },
    );
    expect(returned.ok).toBe(true);
    if (!returned.ok) throw new Error(returned.reason);
    const deadline = overrideDeadline(
      returned.world,
      DC_GOVERNMENT_KEY,
      measure.id,
    )!;
    const due = returned.world.history.futureDueItems.find(
      (row) => row.stableKey === `${measure.stableKey}:override-deadline`,
    )!;
    expect(due).toBeDefined();
    expect(due.dueAt).toBe(addDays(deadline, 1));
    const atLastDay = advanceWorld(returned.world, 30);
    expect(measurePosition(atLastDay, measure.id).phase).toBe(
      "awaiting-override",
    );
    const early = councilActOverrideDeadlineHandler(atLastDay, due).world;
    expect(early).toBe(atLastDay);
    const expired = councilActOverrideDeadlineHandler(
      advanceWorld(atLastDay, 1),
      due,
    ).world;
    expect(measurePosition(expired, measure.id).phase).not.toBe(
      "awaiting-override",
    );
    expect(councilActOverrideDeadlineHandler(expired, due).world).toBe(expired);
    expect(serializeWorld(deserializeWorld(serializeWorld(expired)))).toBe(
      serializeWorld(expired),
    );
  });
});
