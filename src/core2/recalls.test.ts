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
import { setBookkeeping } from "./bookkeeping";
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
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { countedResidents } from "./electorate";
import { lawChain } from "./modules/laws";
import { resolveRequiredSignatures } from "./gov-rules/municipal-election-rules";
import { VOTING_MODULE_ID, type ResultRow } from "./modules/voting";
import { resolveMunicipalRecallRule } from "./gov-rules/municipal-ballot-rules";

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

  // `countScale` opens the town at a multiple of its sample, so the households'
  // fitted weights are fractions and the electorate they stand for is not whole.
  const countedSigners = (countScale?: number) => {
    // A place drawn from all 56, in a state whose places have a recall.
    const tried: string[] = [];
    let checked = false;
    for (let attempt = 0; attempt < 6 && !checked; attempt += 1) {
      let drawn = drawPlace(seed, `recall-base:${attempt}:0`);
      for (
        let redraw = 1;
        redraw < 60 &&
        !resolveMunicipalRecallRule(drawn.state.replace(/^US-/, ""))
          .circulationDays;
        redraw += 1
      )
        drawn = drawPlace(seed, `recall-base:${attempt}:${redraw}`);
      const key = drawn.key;
      tried.push(`${drawn.state} ${key} seed ${seed}:${attempt}`);
      if (!resolveMunicipalRecallRule(drawn.state.slice(3)).circulationDays)
        continue;
      const { core } = buildBenchWorld(`${seed}:${attempt}`, gameStartDate(), {
        twoLevel: true,
        placeKey: key,
        ...(countScale ? { countScale } : {}),
      });
      const api = coreAPI(core);
      const council = townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      );
      if (!council) continue;
      const divisive = [...PLATFORM_QUESTIONS].sort(
        (a, b) =>
          Math.abs(personStance(1, b)) - Math.abs(personStance(1, a)) ||
          a.localeCompare(b),
      );
      for (const question of divisive) {
        const bill = draftBill(api, {
          bodyOfficeId: council.office.id,
          sponsorId: council.holder!.personId!,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
        if (bill.status === "blocked") continue;
        const voted = holdVote(api, bill.id);
        if (["enacted", "signed", "overridden"].includes(voted.status)) break;
      }
      advanceCore(core, after(api.state.date, 31));
      const recall = recallsOf(api)[0];
      const rule = recallRule(api);
      if (!recall || !rule) continue;
      const town = lawChain(api).townPlaceId;
      const counted = countedResidents(core).filter((c) => c.placeId === town);
      expect(counted.length, `${key}: counted residents`).toBeGreaterThan(0);
      // The requirement is the rule's percentage of the base its own rule
      // names, a whole count of voters read from the world's records or
      // sized from the real averages, and the petition names which.
      const base = recall.base;
      expect(base.kind, `${key}: base kind`).toBe(rule.threshold.base);
      expect(Number.isInteger(base.count), `${key}: base count`).toBe(true);
      if (base.basis === "recorded") {
        const result = coreAPI(core)
          .moduleState(VOTING_MODULE_ID)
          .table("results")
          .get(base.recordId ?? "") as unknown as ResultRow | undefined;
        expect(result, `${key}: base record ${base.recordId}`).toBeDefined();
        expect(base.count, `${key}: base read from ${base.recordId}`).toBe(
          Math.round(Object.values(result!.totals).reduce((n, v) => n + v, 0)),
        );
      }
      expect(recall.required, `${key}: required of ${base.count}`).toBe(
        resolveRequiredSignatures(rule.threshold, base.count),
      );
      // The counted residents signed too, by the same rule.
      expect(recall.signatures, key).toBeGreaterThan(
        recall.namedSigners.length,
      );
      expect(Number.isInteger(recall.signatures), `${key}: signatures`).toBe(
        true,
      );
      // Another engine reads the requirement: the due day puts the recall on
      // the ballot or refuses it by it.
      advanceCore(core, after(recall.due, 2));
      const settled = recallsOf(api).find((r) => r.id === recall.id)!;
      expect(settled.status, `${key}: ${recall.id}`).toBe(
        recall.signatures >= recall.required ? "on-ballot" : "failed",
      );
      govReport(
        "recall-signature-base",
        JSON.stringify({
          place: key,
          state: drawn.state,
          seed: `${seed}:${attempt}`,
          recall: recall.id,
          base,
          required: recall.required,
          signatures: recall.signatures,
          status: settled.status,
        }),
      );
      checked = true;
    }
    expect(checked, `no recall started in ${tried.join(", ")}`).toBe(true);
  };
  // Each case builds and plays whole bench worlds; the why of every decision
  // in them is play's bookkeeping, which they do not read, so it is off and
  // the worker holds the worlds, not every reason they kept.
  const inPlay = (check: () => void) => {
    const before = setBookkeeping(false);
    try {
      check();
    } finally {
      setBookkeeping(before);
    }
  };
  it("counts the town's counted residents as signers and voters by the same rule", () => {
    inPlay(() => countedSigners());
  }, 900_000);
  it("counts them the same when their weights are fractions", () => {
    inPlay(() => countedSigners(2.5));
  }, 900_000);
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

describe("each state's recall rule as its statute reads", () => {
  it("South Dakota needs grounds, Wyoming's reaches commission-form towns only, Mississippi's no town", () => {
    const sd = resolveMunicipalRecallRule("SD");
    expect(sd.doctrine).toBe("simultaneous-incumbent-replacement");
    expect(sd.groundsRequired).toBe(true);
    expect(sd.threshold).toEqual({ percent: 15, base: "registered-voters" });
    expect(sd.circulationDays).toBe(60);
    expect(sd.citation).toContain("9-13-29");
    expect(sd.grounds).toContain("malfeasance");
    expect(sd.scope).toContain("every municipality");
    // A town not under the commission form has no recall in Wyoming.
    const wy = resolveMunicipalRecallRule("WY");
    expect(wy.doctrine).toBe("prohibited");
    expect(wy.circulationDays).toBeNull();
    expect(wy.citation).toContain("15-4-110");
    expect(wy.scope).toContain("commission-form");
    const ms = resolveMunicipalRecallRule("MS");
    expect(ms.doctrine).toBe("prohibited");
    expect(ms.scope).toContain("county officials only");
  });

  it("a South Dakota or Wyoming town plays a year under its recall rule, and no recall starts that its law forbids", () => {
    let place = drawPlace(seed, "recall-statute:0");
    for (let i = 1; i < 5000 && !/^US-(SD|WY)$/.test(place.state); i += 1)
      place = drawPlace(seed, `recall-statute:${i}`);
    expect(place.state, `seed ${seed}`).toMatch(/^US-(SD|WY)$/);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    // A whole bench world played a year; its bookkeeping is not read here.
    const before = setBookkeeping(false);
    let core: ReturnType<typeof buildBenchWorld>["core"];
    try {
      core = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core;
      advanceCore(core, after(core.date, 365));
    } finally {
      setBookkeeping(before);
    }
    const api = coreAPI(core);
    const rule = resolveMunicipalRecallRule(place.state.slice(3));
    // Grounds of cause bar a recall over an ordinance's vote, though not one
    // for cause (misconduct on the record: recall-for-cause.test.ts); no
    // recall at all bars every one.
    expect(
      rule.groundsRequired === true || rule.doctrine === "prohibited",
    ).toBe(true);
    const forbidden = recallsOf(api).filter(
      (r) => rule.doctrine === "prohibited" || r.cause !== "misconduct",
    );
    expect(forbidden, where).toHaveLength(0);
    process.stdout.write(
      `recall-statute: ${where}: ${rule.doctrine}, scope ${rule.scope}; grounds ${rule.grounds}; ${rule.citation}; ${recallsOf(api).length} recalls in a year, all for cause\n`,
    );
  }, 900_000);
});
