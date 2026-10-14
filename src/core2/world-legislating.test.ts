/**
 * M3-10 (first slice): the town's state legislature meets on its real session
 * calendar and passes laws on its own. At the session's end the majority
 * leader brings their priorities; each bill goes through committee, both
 * chambers and the governor; what passes becomes law in force on the state's
 * own effective date.
 */
import { wireItem } from "./press-topics";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain, openLaws, LAWS_MODULE_ID } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { campaignParameter } from "./campaign-views";
import { openLegislature } from "./modules/legislature";
import { budgetsOf, openBudgets } from "./modules/budgets";
import { openLawReach, reachOn } from "./law-reach/host";
import { REACH_A_MODULE_ID } from "./law-reach/group-a-records";
import {
  openWorldLegislating,
  legislativeSessionsOf,
  sessionsOf,
  answerIn,
  windowsIn,
  WORLD_LEGISLATING_MODULE_ID,
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
// Places whose legislature sits in 2026 after the start.
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((k) => windowsIn(k, 2026).some((w) => w.adjournAt > START))
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("M3-10 other governments legislate", () => {
  it("the state legislature introduces and votes its bills across its session, and what passes takes effect", () => {
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
      openLawReach(core);
      openWorldLegislating(core);
      const api = coreAPI(core);
      const window = windowsIn(state, 2026).find((w) => w.adjournAt > START)!;
      const end = window.adjournAt;
      advanceCore(core, end);
      const session = legislativeSessionsOf(api).find(
        (s) => s.jurisdiction === state,
      );
      expect(session, `${state} ${key}: no session record`).toBeDefined();
      // Bills come in over the session, in both chambers' names, and the
      // floor takes them up week by week, not on one day.
      const bills = api
        .moduleState("core2-legislature-v1")
        .table("bills")
        .rows() as unknown as { id: string; introduced: string }[];
      const introduced = session!.filings.flatMap((f) =>
        f.billId ? [bills.find((b) => b.id === f.billId)!.introduced] : [],
      );
      if (introduced.length > 1)
        expect(new Set(introduced).size).toBeGreaterThan(1);
      const voted = session!.bills.filter((b) => b.fate === "voted");
      if (voted.length > session!.perWeek)
        expect(new Set(voted.map((b) => b.decidedOn)).size).toBeGreaterThan(1);
      // The governor's signature, veto or the override is a public record the
      // press takes on its wire, like the floor's roll call.
      const acts = [...core.durableLog.values()].filter(
        (e) => e.kind === "executive-action",
      );
      for (const bill of session!.bills.filter((b) =>
        ["signed", "vetoed", "overridden"].includes(b.status),
      )) {
        const act = acts.find(
          (e) =>
            e.facts?.number === bill.number &&
            String(e.facts?.billId).includes(state),
        );
        expect(act?.facts?.action, `${bill.number}: no executive record`).toBe(
          bill.status,
        );
        expect(
          wireItem(api, act!, {
            placeId: lawChain(api).townPlaceId,
            stateKey: state,
          }),
          `${bill.number}: not on the press wire`,
        ).not.toBeNull();
      }
      // A section traded for a vote is in the bill, on the record, and the
      // member who took it voted for the bill; a poison pill's mover against.
      const amendments = [...core.durableLog.values()].filter(
        (e) => e.kind === "bill-amendment",
      );
      const votes = api.moduleState("core2-legislature-v1").table("votes");
      for (const bill of api
        .moduleState("core2-legislature-v1")
        .table("bills")
        .rows() as unknown as {
        id: string;
        provisions: { question?: string }[];
        deals: { memberId: string; kind: string; terms: string }[];
      }[])
        for (const deal of bill.deals.filter((d) =>
          ["trade-amendment", "poison-pill"].includes(d.kind),
        )) {
          const question = deal.terms.split(" ")[1];
          expect(
            bill.provisions.some((p) => p.question === question),
            `${bill.id}: ${deal.terms} not in the bill`,
          ).toBe(true);
          expect(
            amendments.some(
              (e) =>
                e.facts?.billId === bill.id &&
                e.facts?.movedBy === deal.memberId,
            ),
            `${bill.id}: no amendment record`,
          ).toBe(true);
          const vote = (
            votes.get(`vote:${bill.id}:${deal.memberId}`) as unknown as
              { vote: string } | undefined
          )?.vote;
          // A pill adopted after a trade may break it.
          const pilled = bill.deals.some((d) => d.kind === "poison-pill");
          expect(
            deal.kind === "trade-amendment"
              ? ["yes", "absent", ...(pilled ? ["no"] : [])]
              : ["no", "absent"],
            `${bill.id}: ${deal.kind} by ${deal.memberId} voted ${vote}`,
          ).toContain(vote);
        }
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
      const last = effective[effective.length - 1]!;
      if (last > core.date) advanceCore(core, last);
      for (const bill of passed) {
        const rows = laws.query("bySeries", [state, bill.question]);
        expect(rows.length, `${bill.number} ${bill.question}`).toBeGreaterThan(
          0,
        );
        expect(answerIn(api, state, bill.question)).not.toBeNull();
      }
      const reached = [...core.people.keys()].filter((id) =>
        reachOn(api, id).some((e) => passed.some((b) => b.question === e.key)),
      );
      report = {
        seed,
        state,
        place: key,
        sessionEnd: end,
        introducedOnDays: new Set(introduced).size,
        votedOnDays: new Set(voted.map((b) => b.decidedOn)).size,
        effective,
        leader: session!.leader,
        bills: session!.bills,
        residentsReached: reached.length,
      };
    }
    expect(report, `no act passed in ${tried.join(", ")}`).not.toBeNull();
    govReport("world-legislating", JSON.stringify(report));
  }, 120_000);

  it("Congress sits from January 3, introducing and voting its bills across the session", () => {
    // Open the world the day before Congress convenes.
    const start = "2026-01-02";
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
    openLawReach(core);
    openWorldLegislating(core);
    const api = coreAPI(core);
    advanceCore(core, "2026-05-01");
    const session = legislativeSessionsOf(api).find(
      (s) => s.jurisdiction === "US",
    );
    expect(session, `${state} ${key}: no Congress session`).toBeDefined();
    expect(session!.conveneAt).toBe("2026-01-03");
    const voted = session!.bills.filter((b) => b.fate === "voted");
    // No vote before committee has had the bill.
    for (const b of voted)
      expect(b.decidedOn >= "2026-01-24", b.number).toBe(true);
    if (voted.length > session!.perWeek)
      expect(new Set(voted.map((b) => b.decidedOn)).size).toBeGreaterThan(1);
    const passed = session!.bills.filter((b) =>
      ["enacted", "signed", "overridden"].includes(b.status),
    );
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    for (const bill of passed)
      expect(
        laws.query("bySeries", ["US", bill.question]).length,
        bill.question,
      ).toBeGreaterThan(0);
    govReport(
      "world-legislating-congress",
      JSON.stringify({
        seed,
        state,
        place: key,
        filed: session!.filings.length,
        voted: voted.length,
        votedOnDays: new Set(voted.map((b) => b.decidedOn)).size,
        leader: session!.leader,
        bills: session!.bills,
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
    openLawReach(core);
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
    // Every body met at each of its regular meetings by now, each on the
    // record with its bills; each meeting took up what its agenda time
    // allowed, and no change it voted down came back within the wait.
    const interval = Math.round(
      365 / campaignParameter("localRegularMeetingsPerYear"),
    );
    const elapsed =
      (Date.parse("2026-04-15T00:00:00Z") - Date.parse(`${START}T00:00:00Z`)) /
      86_400_000;
    expect(meetings.length, `${state} ${key}`).toBe(
      bodies.length * Math.floor(elapsed / interval),
    );
    const defeated = new Map<string, string>();
    for (const meeting of [...meetings].sort((a, b) =>
      a.date.localeCompare(b.date),
    )) {
      const voted = meeting.bills.filter((b) => b.fate === "voted");
      expect(voted.length).toBeLessThanOrEqual(meeting.floorTime);
      for (const bill of voted) {
        const id = `${meeting.bodyOfficeId}|${bill.question}|${bill.change}`;
        expect(defeated.has(id), `${id} came back`).toBe(false);
        if (
          !["enacted", "overridden", "awaiting-signature"].includes(bill.status)
        )
          defeated.set(id, meeting.date);
      }
    }
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
    openLawReach(core);
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
    // It binds the town's employers and landlords (law-reach's records).
    const reached = api
      .moduleState(REACH_A_MODULE_ID)
      .table("reach")
      .query("byKey", [question, null]);
    expect(reached.length, `${state} ${key}`).toBeGreaterThan(0);
  });
});

describe("a session already over when the world opens", () => {
  // Regression (wire-all-modules, Oct 12): a game opening in the fall found
  // its state's 2026 session over and never scheduled another, so the state
  // legislature passed nothing all year.
  it("opens its next session on the calendar's convening day", () => {
    const opened = "2026-10-12";
    const over = [...lifePlaceStateIdentities()]
      .map((s) => s.jurisdictionKey)
      .filter(
        (k) =>
          windowsIn(k, 2026).length > 0 &&
          windowsIn(k, 2026).every((w) => w.adjournAt <= opened),
      )
      .sort();
    const state = pick(over, "over:state");
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "over:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: opened,
        minimumPeople: 40,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openLawReach(core);
    openWorldLegislating(core);
    const calendar = coreAPI(core).moduleCalendar(WORLD_LEGISLATING_MODULE_ID);
    const next = [2027, 2028]
      .flatMap((y) => windowsIn(state, y))
      .sort((a, b) => a.conveneAt.localeCompare(b.conveneAt))[0]!;
    expect(
      calendar.get(`session-open:${state}:${next.conveneAt}`)?.date,
      `seed ${seed}, ${state} place ${key}`,
    ).toBe(next.conveneAt);
  });
});
