/**
 * M3-10: a recall happens only where the state's law gives its places one,
 * and only from a cause: an ordinance that took effect, the most aggrieved
 * resident organizing, neighbors signing for their own reasons, and a recall
 * vote that can end a member's term.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { draftBill, holdVote, openLegislature } from "./modules/legislature";
import {
  openRecalls,
  recallBarsFor,
  recallRule,
  recallsOf,
} from "./modules/recalls";
import { personStance, PLATFORM_QUESTIONS } from "./campaign-views";
import { governmentUnitsForPlace } from "./reference/government-units";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`recalls:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const allStates = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

describe("M3-10 recalls", () => {
  it("an ordinance can start a recall where the law allows one, and none where it doesn't", () => {
    const tried: string[] = [];
    let report: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 40 && !report; attempt += 1) {
      const state = pick(allStates, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ]
        .filter((p) =>
          governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
            (u) => u.unitType === "municipality",
          ),
        )
        .sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      // Why this place started no recall, by what the world holds; filled in
      // below and kept in the failure message.
      const none = (why: string) => tried.push(`${state} ${key}: ${why}`);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          // A small town: the year of daily work costs time per person.
          minimumPeople: 40,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openRecalls(core);
      const api = coreAPI(core);
      const outcomes = new Set<string>();
      api.subscribeEvents("recalls-test", ["recall-outcome"], (_api, event) => {
        outcomes.add(event.id);
      });
      const council = townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      );
      if (!council) {
        none("no council seat held by a person");
        continue;
      }
      // The most divisive ordinances the council will pass.
      const divisive = [...PLATFORM_QUESTIONS].sort(
        (a, b) =>
          Math.abs(personStance(1, b)) - Math.abs(personStance(1, a)) ||
          a.localeCompare(b),
      );
      let enacted: string | null = null;
      for (const question of divisive) {
        const bill = draftBill(api, {
          bodyOfficeId: council.office.id,
          sponsorId: council.holder!.personId!,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
        if (bill.status === "blocked") continue;
        const voted = holdVote(api, bill.id);
        if (["enacted", "signed", "overridden"].includes(voted.status)) {
          enacted = bill.id;
          break;
        }
      }
      advanceCore(core, after(api.state.date, 31));
      const recalls = recallsOf(api);
      const rule = recallRule(api);
      if (!rule) {
        // No recall in this state's law: none may start.
        expect(recalls.length, `${state} has no recall`).toBe(0);
        none("the state's law has no petitioned recall");
        continue;
      }
      if (!recalls.length) {
        none(
          enacted
            ? `ordinance ${enacted} enacted and no organizer moved past the effort bar, or every member was inside a bar on the term`
            : "no ordinance the council would pass",
        );
        continue;
      }
      const recall = recalls[0]!;
      expect(recall.namedSigners).not.toContain(recall.memberId);
      advanceCore(core, after(recall.due, 120));
      const done = recallsOf(api).find((r) => r.id === recall.id)!;
      expect(["failed", "kept", "removed"]).toContain(done.status);
      // The result is a public record by the recall's id.
      expect(outcomes.has(`recall-outcome:${done.id}:${done.status}`)).toBe(
        true,
      );
      if (done.status === "removed") {
        const term = api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(done.termId) as unknown as { status: string };
        expect(term.status).not.toBe("serving");
      }
      report = {
        seed,
        state,
        place: key,
        rule: rule.doctrine,
        recall: { ...done, namedSigners: done.namedSigners.length },
      };
    }
    // Every place that started none says why; a place without a reason is a
    // gap in the test, not in the world.
    expect(
      tried.filter((row) => !row.includes(": ")),
      "places with no reason recorded",
    ).toEqual([]);
    expect(report, `no recall started in ${tried.join("; ")}`).not.toBeNull();
    govReport("recalls", JSON.stringify(report));
  }, 300_000);
});

describe("each state's recall timing bars", () => {
  it("come from the state's row, with the national estimate only where none is read", () => {
    expect(recallBarsFor("CA", 4)).toEqual({
      openingDays: 90,
      closingDays: 182,
    });
    expect(recallBarsFor("KS", 4)).toEqual({
      openingDays: 120,
      closingDays: 180,
    });
    // Michigan counts a term of more than two years in whole years.
    expect(recallBarsFor("MI", 2)).toEqual({
      openingDays: 182,
      closingDays: 182,
    });
    expect(recallBarsFor("MI", 4)).toEqual({
      openingDays: 365,
      closingDays: 365,
    });
    expect(recallBarsFor("WI", 4)).toEqual({
      openingDays: 365,
      closingDays: 0,
    });
    expect(recallBarsFor("NJ", 3)).toEqual({
      openingDays: 315,
      closingDays: 0,
    });
    // A state whose statute is unread has no row, so no state bar is invented.
    expect(recallBarsFor("NC", 4)).toBeNull();
  });
});
