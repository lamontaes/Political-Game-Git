/**
 * State school aid, proved in a played world: a place and seed nobody chose
 * (printed), twin worlds from one seed, one with the equalize-school-funding
 * law enacted at the state. The state pays the aid through its treasury into
 * the town's schools lines; the schools line the school engine reads rises by
 * what the town received; the state's local aid line rises by exactly what is
 * paid; a repeal takes it back.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../../tests/golden-path/place";
import { buildBenchWorld } from "../../bench/world";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { amendBudget, budgetsOf, governments } from "../modules/budgets";
import { setJournalTrace } from "../journal-state";
import { treasuryMonthsOf } from "../budgets-treasury";
import { enactLaw, lawChain } from "../modules/laws";
import { schoolsLineAboveBase } from "../school-budget-line";
import { coreAPI } from "../state";
import type { CoreAPI, CoreState } from "../types";
import { appliedOn } from "./applied";
import { rowsOf } from "./group-b-store";
import {
  schoolAidNeed,
  schoolAidPool,
  schoolAidShares,
} from "./group-b-school-aid";

const KEY = "us-policy-positions:education.equalize-school-funding";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

const run = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

function setLaw(api: CoreAPI, value: 0 | 1): void {
  const at = lawChain(api).levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: at.jurisdiction,
    level: at.level,
    series: KEY,
    value,
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: `test:${KEY}:${value}`,
    citation: "Test enactment",
  });
}

/** A place with a state, a town government and a schools line to move, redrawn until it has them. */
function draw(index: number) {
  const drawn = drawPlace(seed, `school-aid:${index}`);
  const make = (law: boolean) => {
    const core = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    }).core;
    run(core, 1);
    if (law) setLaw(coreAPI(core), 1);
    return core;
  };
  return { drawn, make };
}

describe("state school aid", () => {
  it("need shares add to one across a state's people and favor the poorer region", () => {
    expect(schoolAidNeed("US-AK")).toBeGreaterThan(0);
    expect(schoolAidNeed("US-PR", "region:72:rest")).toBe(1);
  });

  it("pays the aid from the state treasury into the town's schools lines, and a repeal takes it back", () => {
    let tried = "";
    for (let i = 0; i < 8; i++) {
      const { drawn, make } = draw(i);
      const where = `${drawn.name} (${drawn.key}), seed ${seed}`;
      const off = make(false);
      const on = make(true);
      const a = coreAPI(off);
      const b = coreAPI(on);
      const shares = schoolAidShares(b);
      const state = governments(b).find((g) => g.level === "state");
      if (!state || !shares.size || ![...shares.values()].some((v) => v > 0)) {
        tried += ` ${where}: no state, town government or schools share;`;
        continue;
      }
      // The first review: before a later year's collections move the state's spending scale.
      run(off, 45);
      run(on, 45);
      // Charged equals paid, from the law's own move rows: the state's local
      // aid line rose by exactly what the town's governments received as aid
      // and put on their schools lines.
      const moves = rowsOf<{
        key: string;
        governmentId: string;
        undone: boolean;
        moves: Record<string, number>;
        revenueMoves?: Record<string, number>;
      }>(b, "taken").filter((r) => r.key === KEY && !r.undone);
      const stateGov = governments(b).find((g) => g.level === "state")!;
      const stateRow = moves.find((r) => r.governmentId === stateGov.id);
      const local = moves.filter((r) => r.governmentId !== stateGov.id);
      const stateRise = stateRow?.moves.localAid ?? 0;
      const schools = local.reduce((n, r) => n + (r.moves.schools ?? 0), 0);
      const aid = local.reduce(
        (n, r) => n + (r.revenueMoves?.intergovernmental ?? 0),
        0,
      );
      const reached = appliedOn(b, KEY);
      process.stdout.write(
        `school aid proof: ${where}: state local aid +${stateRise}; schools lines +${schools}; aid revenue +${aid}; ${local.length} town governments; applied rows ${reached.map((r) => r.id).join(",")}\n`,
      );
      expect(reached.length).toBeGreaterThan(0);
      expect(stateRise).toBeGreaterThan(0);
      // The state books the whole pool; the town's governments are paid their
      // shares out of it, the rest going outside as the rest of the line does.
      expect(schools).toBe(aid);
      expect(stateRise).toBeGreaterThanOrEqual(schools);
      // The cash: every state-to-town aid transfer the journal posted, in both
      // worlds over the same year, as it left the state account and as it
      // reached the town government's account.
      const stateOrg = governments(b).find((g) => g.level === "state")!;
      const aidCash = (core: CoreState, days: number) => {
        let left = 0;
        let arrived = 0;
        let transfers = 0;
        setJournalTrace((input) => {
          const id = input.sourceRef.id;
          if (
            !id.includes(`treasury-aid:${stateOrg.id}:`) ||
            !id.includes(":intergovernmental:")
          )
            return;
          transfers += 1;
          for (const post of input.postings)
            if (post.deltaMinor < 0) left -= post.deltaMinor;
            else arrived += post.deltaMinor;
        });
        try {
          run(core, days);
        } finally {
          setJournalTrace(null);
        }
        return { left, arrived, transfers };
      };
      const balance = (api: CoreAPI) =>
        api.accounts().balance(api.accounts().main(stateOrg.organizationId));
      const stateBefore = { off: balance(a), on: balance(b) };
      const offCash = aidCash(off, 360);
      const onCash = aidCash(on, 360);
      const sentMore = onCash.left - offCash.left;
      const gotMore = onCash.arrived - offCash.arrived;
      process.stdout.write(
        `school aid proof: ${where}: state books ${stateRise} cents of local aid a year, of which the town governments' share is ${schools}; over the next 360 days the state account paid ${sentMore} more cents to the town governments and they received ${gotMore} more (${onCash.transfers} transfers with the law, ${offCash.transfers} without); the state account moved ${balance(b) - stateBefore.on} with the law and ${balance(a) - stateBefore.off} without\n`,
      );
      expect(onCash.transfers).toBeGreaterThan(0);
      expect(sentMore).toBe(gotMore);
      expect(gotMore).toBeGreaterThan(schools * 0.5);
      expect(gotMore).toBeLessThan(schools * 1.6);
      const received = (api: CoreAPI) =>
        governments(api)
          .filter((g) => g.level === "city" || g.level === "county")
          .reduce(
            (n, g) =>
              n +
              treasuryMonthsOf(api, g.id).reduce(
                (m, t) => m + t.aidReceivedMinor,
                0,
              ),
            0,
          );
      expect(received(b)).toBeGreaterThan(received(a));
      // The schools line the school engine reads is above its base only with the law.
      const above = (api: CoreAPI) =>
        schoolsLineAboveBase(api, lawChain(api).townPlaceId)?.pct ?? 0;
      expect(above(b)).toBeGreaterThan(above(a));
      expect(above(b)).toBeLessThan(40);
      process.stdout.write(
        `school aid proof: schools line above base: ${above(a)}% without, ${above(b)}% with\n`,
      );
      // A council that cuts its own schools line after the aid arrived cuts
      // only that line: the aid revenue stays.
      const lineOf = (
        api: CoreAPI,
        id: string,
        side: "revenue" | "spending",
        line: string,
      ) => {
        const budget = [...budgetsOf(api, id)]
          .filter((row) => row.startsOn <= api.state.date)
          .sort((x, y) => y.startsOn.localeCompare(x.startsOn))[0];
        return (
          (side === "revenue" ? budget?.revenueMinor : budget?.spendingMinor)?.[
            line
          ] ?? 0
        );
      };
      const town = local[0]!.governmentId;
      const revenueBefore = lineOf(b, town, "revenue", "intergovernmental");
      const schoolsBefore = lineOf(b, town, "spending", "schools");
      amendBudget(b, {
        governmentId: town,
        line: "schools",
        deltaMinor: -1000,
        measureId: "test:council-cut",
      });
      expect(lineOf(b, town, "revenue", "intergovernmental")).toBe(
        revenueBefore,
      );
      expect(lineOf(b, town, "spending", "schools")).toBe(schoolsBefore - 1000);
      // A repeal ends the law's reach and takes the aid off the lines. Months
      // already paid stay paid; the months after it carry no more aid than the
      // world that never had the law.
      const before = above(b);
      setLaw(b, 0);
      const firstOff = aidCash(off, 45);
      const firstOn = aidCash(on, 45);
      expect(appliedOn(b, KEY).filter((r) => !r.endedOn)).toHaveLength(0);
      expect(above(b)).toBeLessThan(before);
      const laterOff = aidCash(off, 40);
      const laterOn = aidCash(on, 40);
      process.stdout.write(
        `school aid proof: after the repeal, aid sent beyond the world with no law: ${firstOn.left - firstOff.left} cents in the first 45 days, ${laterOn.left - laterOff.left} in the next 40\n`,
      );
      expect(Math.abs(laterOn.left - laterOff.left)).toBeLessThan(200);
      return;
    }
    throw new Error(`No drawn place could show the aid:${tried}`);
  }, 900_000);
});
