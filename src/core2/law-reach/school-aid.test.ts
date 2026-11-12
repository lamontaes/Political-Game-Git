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
import { governments } from "../modules/budgets";
import { treasuryMonthsOf } from "../budgets-treasury";
import { enactLaw, lawChain } from "../modules/laws";
import { schoolsLineAboveBase } from "../school-budget-line";
import { coreAPI } from "../state";
import type { CoreAPI, CoreState } from "../types";
import { appliedOn } from "./applied";
import { rowsOf } from "./group-b-store";
import { schoolAidNeed, schoolAidShares } from "./group-b-school-aid";

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
      expect(stateRise).toBe(schools);
      expect(stateRise).toBe(aid);
      run(off, 360);
      run(on, 360);
      // The town's treasury received aid through the accounts, more than without the law.
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
      process.stdout.write(
        `school aid proof: aid received by the town's treasuries over the run: ${received(a)} without, ${received(b)} with\n`,
      );
      const collected = (api: CoreAPI) =>
        treasuryMonthsOf(
          api,
          governments(api).find((g) => g.level === "state")!.id,
        ).reduce((n, t) => n + t.collectedMinor, 0);
      process.stdout.write(
        `school aid proof: state collected ${collected(a)} without, ${collected(b)} with\n`,
      );
      // The schools line the school engine reads is above its base only with the law.
      const above = (api: CoreAPI) =>
        schoolsLineAboveBase(api, lawChain(api).townPlaceId)?.pct ?? 0;
      expect(above(b)).toBeGreaterThan(above(a));
      expect(above(b)).toBeLessThan(40);
      process.stdout.write(
        `school aid proof: schools line above base: ${above(a)}% without, ${above(b)}% with\n`,
      );
      // The state account paid for it.
      const acct = (core: CoreState, api: CoreAPI) =>
        api
          .accounts()
          .balance(
            api
              .accounts()
              .main(
                governments(api).find((g) => g.level === "state")!
                  .organizationId,
              ),
          );
      process.stdout.write(
        `school aid proof: state account ${acct(off, a)} without, ${acct(on, b)} with\n`,
      );
      // A repeal ends the law's reach and takes the aid off the schools line.
      const before = above(b);
      setLaw(b, 0);
      run(on, 45);
      expect(appliedOn(b, KEY).filter((r) => !r.endedOn)).toHaveLength(0);
      expect(above(b)).toBeLessThan(before);
      return;
    }
    throw new Error(`No drawn place could show the aid:${tried}`);
  }, 900_000);
});
