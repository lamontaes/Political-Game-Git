// @vitest-environment node
/** Controlled law/budget fixtures; production effective-date and treasury engines run. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { closeTreasuries } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { budgetNow } from "./law-reach/group-b-money";
import { getRow } from "./law-reach/group-b-store";
import { advanceCore } from "./life";
import { amendBudget, governments } from "./modules/budgets";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LOCAL_POWER_PREFIX,
} from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "fiscal-law-level-review");
const question = "us-policy-positions:fiscal.balanced-operating-budget";
it(`a treasury review does not revive another government's repeal: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const chain = lawChain(api);
    const state = governments(api).find((g) => g.level === "state")!;
    const peer =
      governments(api).find((g) => g.level === "city") ??
      governments(api).find((g) => g.level === "county") ??
      governments(api).find((g) => g.level === "federal")!;
    expect(state).toBeDefined();
    expect(peer).toBeDefined();
    const pair = [state, peer];
    const records: string[] = [];
    const grant = (value: number, series = question) => {
      const date = addDays(makeIsoDate(api.state.date), 1);
      const row = enactLaw(api, {
        jurisdiction: chain.stateKey,
        level: "state",
        series: `${LOCAL_POWER_PREFIX}${series}`,
        value,
        effectiveDate: date,
        measureId: `local-fiscal-grant-fixture-${date}`,
        citation:
          "Controlled local-authority fixture; not a claim about this state's constitutional powers",
      });
      advanceCore(world.core, date);
      records.push(row.id);
    };
    const set = (gov: typeof state, value: number, series = question) => {
      const level = chain.levels.find((l) => l.level === gov.level)!;
      expect(level).toBeDefined();
      const date = addDays(makeIsoDate(api.state.date), 1);
      const law = enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series,
        value,
        effectiveDate: date,
        measureId: `fiscal-review-fixture-${gov.id}-${date}`,
        citation:
          "Controlled fiscal-rule fixture; not a played vote or constitutional authority claim",
      });
      advanceCore(world.core, date);
      expect(
        lawInForce(api, series).levels.find((l) => l.level === gov.level)?.row
          ?.id,
      ).toBe(law.id);
      records.push(law.id);
    };
    const moved = (gov: typeof state) =>
      getRow<{
        id: string;
        budgetId: string;
        undone: boolean;
        moves: Record<string, number>;
      }>(api, "taken", `move|${question}|${gov.id}`)!;
    // Clear opening movements, then give each government an explicit gap.
    // These budget changes test the law reader, not economic calibration.
    grant(1);
    for (const gov of pair) set(gov, 0);
    for (const gov of pair) {
      const budget = budgetNow(api, gov.id)!;
      const total = (values: Readonly<Record<string, number>>) =>
        Object.values(values).reduce((a, b) => a + b, 0);
      amendBudget(api, {
        governmentId: gov.id,
        line: "otherPrograms",
        deltaMinor:
          Math.max(
            0,
            total(budget.revenueMinor) - total(budget.spendingMinor),
          ) + 1_000_000,
        measureId: `controlled-gap-${gov.id}`,
      });
      set(gov, 1);
      expect(
        lawInForce(api, question).levels.find((l) => l.level === gov.level)
          ?.setAside,
      ).toBeUndefined();
      expect(moved(gov).undone).toBe(false);
      expect(Object.values(moved(gov).moves).some((value) => value < 0)).toBe(
        true,
      );
    }
    for (const [repealed, retained] of [
      [peer, state],
      [state, peer],
    ]) {
      // Re-enable the other government's rule before repealing this one.
      if (moved(retained!).undone) set(retained!, 1);
      set(repealed!, 0);
      expect(moved(repealed!).undone).toBe(true);
      expect(
        appliedOn(api, question).some((r) => r.targetId === repealed!.id),
      ).toBe(false);
      const restored = budgetNow(api, repealed!.id)!.spendingMinor
        .otherPrograms;
      closeTreasuries(api, {
        tag: "SOURCED",
        citation: "Controlled treasury review of generated-world laws",
        asOf: api.state.date,
      });
      expect(
        moved(repealed!).undone,
        `${repealed!.id} must stay repealed`,
      ).toBe(true);
      expect(budgetNow(api, repealed!.id)!.spendingMinor.otherPrograms).toBe(
        restored,
      );
      expect(moved(retained!).undone).toBe(false);
      expect(
        appliedOn(api, question).some((r) => r.targetId === retained!.id),
      ).toBe(true);
      expect(
        lawInForce(api, question).levels.find(
          (l) => l.level === retained!.level,
        )?.row?.value,
      ).toBe(1);
    }
    // Where there is a local treasury, the state bar stops its rule. A
    // territory with no local treasury instead proves the state cannot
    // bar the federal rule. Both cases retain the original peer law row.
    set(state, 1);
    const peerLaw = lawInForce(api, question).levels.find(
      (l) => l.level === peer.level,
    )!.row!.id;
    const subordinate = peer.level !== "federal";
    grant(0);
    expect(
      Boolean(
        lawInForce(api, question).levels.find((l) => l.level === peer.level)
          ?.setAside,
      ),
    ).toBe(subordinate);
    expect(moved(peer).undone).toBe(subordinate);
    expect(moved(state).undone).toBe(false);
    expect(appliedOn(api, question).some((r) => r.targetId === peer.id)).toBe(
      !subordinate,
    );
    grant(1);
    expect(
      lawInForce(api, question).levels.find((l) => l.level === peer.level)?.row
        ?.id,
    ).toBe(peerLaw);
    expect(moved(peer).undone).toBe(false);
    expect(appliedOn(api, question).some((r) => r.targetId === peer.id)).toBe(
      true,
    );
    // The other fiscal writer releases only this government's reserve;
    // the state remains subject to its own reserve requirement.
    const reserve = "us-policy-positions:fiscal.minimum-reserve-balance";
    grant(1, reserve);
    for (const gov of pair) {
      set(gov, 1, reserve);
      expect(appliedOn(api, reserve).some((r) => r.targetId === gov.id)).toBe(
        true,
      );
    }
    set(peer, 0, reserve);
    expect(api.accounts().balance(`reserve:${peer.organizationId}`)).toBe(0);
    expect(appliedOn(api, reserve).some((r) => r.targetId === peer.id)).toBe(
      false,
    );
    closeTreasuries(api, {
      tag: "SOURCED",
      citation: "Controlled reserve-rule review",
      asOf: api.state.date,
    });
    expect(api.accounts().balance(`reserve:${peer.organizationId}`)).toBe(0);
    expect(appliedOn(api, reserve).some((r) => r.targetId === peer.id)).toBe(
      false,
    );
    expect(appliedOn(api, reserve).some((r) => r.targetId === state.id)).toBe(
      true,
    );
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        governments: pair.map((g) => g.id),
        stateBarCanReachPeer: subordinate,
        budgets: pair.map((g) => budgetNow(api, g.id)!.id),
        records,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
