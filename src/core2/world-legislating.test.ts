/**
 * M3-10 (first slice): the town's state legislature meets on its real session
 * calendar and passes laws on its own. At the session's end the majority
 * leader brings their priorities; each bill goes through committee, both
 * chambers and the governor; what passes becomes law in force on the state's
 * own effective date.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, openLaws, LAWS_MODULE_ID } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { openLegislature } from "./modules/legislature";
import { budgetsOf, openBudgets } from "./modules/budgets";
import { effectsOn, openLawEffects } from "./modules/law-effects";
import {
  openWorldLegislating,
  congressAgendaDate,
  sessionAgendaDates,
  sessionsOf,
  answerIn,
} from "./modules/world-legislating";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`world-legislating:${Date.now()}`).digest("hex");
// Places whose legislature's 2026 session reaches its floor day after the start.
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((k) => sessionAgendaDates(k).some((d) => d > START))
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("M3-10 other governments legislate", () => {
  it("the state legislature passes its own laws at its session's end and they take effect", () => {
    const tried: string[] = [];
    let report: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 6 && !report; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      tried.push(`${state} ${key}`);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openLawEffects(core);
      openWorldLegislating(core);
      const api = coreAPI(core);
      const end = [...sessionAgendaDates(state)]
        .filter((d) => d > START)
        .sort()[0]!;
      advanceCore(core, end);
      const session = sessionsOf(api).find((s) => s.stateKey === state);
      expect(session, `${state} ${key}: no session record`).toBeDefined();
      const passed = session!.bills.filter((b) =>
        ["enacted", "signed", "overridden"].includes(b.status),
      );
      if (!passed.length) continue;
      // Each passed act is on the books with the state's own effective date;
      // on that date it is the state's law in force.
      const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
      const effective = passed
        .flatMap((b) => laws.query("bySeries", [state, b.question]))
        .map((r) => (r as unknown as { effectiveDate: string }).effectiveDate)
        .sort();
      expect(effective.length).toBeGreaterThanOrEqual(passed.length);
      advanceCore(core, effective[effective.length - 1]!);
      for (const bill of passed) {
        const rows = laws.query("bySeries", [state, bill.question]);
        expect(rows.length, `${bill.number} ${bill.question}`).toBeGreaterThan(
          0,
        );
        expect(answerIn(api, state, bill.question)).not.toBeNull();
      }
      const reached = [...core.people.keys()].filter((id) =>
        effectsOn(api, id).some((e) =>
          passed.some((b) => b.question === e.question),
        ),
      );
      report = {
        seed,
        state,
        place: key,
        sessionEnd: end,
        effective,
        leader: session!.leader,
        bills: session!.bills,
        residentsReached: reached.length,
      };
    }
    expect(report, `no act passed in ${tried.join(", ")}`).not.toBeNull();
    govReport("world-legislating", JSON.stringify(report));
    // Each attempt builds a generated town and runs it to the session's end
    // (35 to 60 s), and up to six towns are tried until one passes an act, so
    // this test names its own limit.
  }, 400_000);

  it("Congress passes its majority's agenda at its year-end votes and the acts reach the town", () => {
    // Open the world shortly before Congress's floor day.
    const start = "2026-11-30";
    const state = pick(states, "congress:state");
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "congress:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: start,
        minimumPeople: 200,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openLawEffects(core);
    openWorldLegislating(core);
    const api = coreAPI(core);
    const day = congressAgendaDate(2026);
    advanceCore(core, day);
    const session = sessionsOf(api).find((s) => s.stateKey === "US");
    expect(
      session,
      `${state} ${key}: no Congress session record`,
    ).toBeDefined();
    const passed = session!.bills.filter((b) =>
      ["enacted", "signed", "overridden"].includes(b.status),
    );
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const effective = passed
      .flatMap((b) => laws.query("bySeries", ["US", b.question]))
      .map((r) => (r as unknown as { effectiveDate: string }).effectiveDate)
      .sort();
    expect(effective.length).toBe(passed.length);
    if (effective.length) advanceCore(core, effective[effective.length - 1]!);
    for (const bill of passed)
      expect(answerIn(api, "US", bill.question), bill.question).not.toBeNull();
    const reached = [...core.people.keys()].filter((id) =>
      effectsOn(api, id).some((e) =>
        passed.some((b) => b.question === e.question),
      ),
    );
    govReport(
      "world-legislating-congress",
      JSON.stringify({
        seed,
        state,
        place: key,
        day,
        effective,
        leader: session!.leader,
        bills: session!.bills,
        residentsReached: reached.length,
      }),
    );
  });

  it("the town's council and county board bring their own ordinances on their schedule", () => {
    const state = pick(states, "local:state");
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "local:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 200,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openLawEffects(core);
    openWorldLegislating(core);
    const api = coreAPI(core);
    const bodies = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    ).filter((o) => o.kind === "council" || o.kind === "county-board");
    advanceCore(core, "2026-04-15");
    const meetings = sessionsOf(api).filter((s) =>
      bodies.some(
        (b) => b.id === (s as { bodyOfficeId?: string }).bodyOfficeId,
      ),
    );
    // Every body met once by now, each meeting on the record with its bills.
    expect(meetings.length, `${state} ${key}`).toBe(bodies.length);
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    for (const meeting of meetings)
      for (const bill of meeting.bills.filter((b) =>
        ["enacted", "signed", "overridden"].includes(b.status),
      ))
        expect(
          laws.query("bySeriesOnly", [bill.question]).length,
          bill.question,
        ).toBeGreaterThan(0);
    govReport(
      "world-legislating-local",
      JSON.stringify({
        seed,
        state,
        place: key,
        bodies: bodies.map((b) => b.kind),
        meetings,
      }),
    );
  });

  it("Congress votes the federal budget on the fiscal year's first day, the Senate by cloture", () => {
    const state = pick(states, "budget:state");
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "budget:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: "2026-09-25",
        minimumPeople: 120,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openBudgets(core);
    const api = coreAPI(core);
    advanceCore(core, "2026-10-02");
    const federal = budgetsOf(api, "US").find(
      (b) => b.startsOn === "2026-10-01",
    );
    expect(federal, `${state} ${key}`).toBeDefined();
    // Voted by Congress: adopted, or carried forward as a continuing resolution.
    expect(federal!.adoptedBy).toMatch(/Congress/);
    govReport(
      "world-legislating-budget",
      JSON.stringify({
        seed,
        state,
        place: key,
        adoptedBy: federal!.adoptedBy,
      }),
    );
  });

  it("a federal act with no date of its own takes effect the day it's signed and reaches the town", () => {
    const state = pick(states, "federal-now:state");
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "federal-now:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 120,
      }),
    );
    openLaws(core);
    openLawEffects(core);
    const api = coreAPI(core);
    const question =
      "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work";
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: question,
      value: 1,
      effectiveDate: api.state.date,
      measureId: "test-federal-act",
      citation: "Gozlon-Peretz v. United States, 498 U.S. 395 (1991)",
    });
    const reached = [...core.people.keys()].filter((id) =>
      effectsOn(api, id).some((e) => e.question === question),
    );
    expect(reached.length, `${state} ${key}`).toBeGreaterThan(0);
  });
});
