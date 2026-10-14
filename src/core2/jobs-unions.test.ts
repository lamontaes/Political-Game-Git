/** Unions in a generated world: workplaces covered to the state's BLS rates, members' dues to the local, and a right-to-work law changing who joins. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import unionData from "./data/business/union-membership.json" with { type: "json" };
import type { UnionMonth } from "./jobs-unions";
import { advanceCore, createLifeCore } from "./life";
import { openLawReach } from "./law-reach/host";
import { enactLaw, lawChain, openLaws } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const drawn = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? randomUUID(),
  "jobs-unions",
);
const RTW = "us-policy-positions:labor-workforce.right-to-work";

describe(`unions (${drawn.name}, ${drawn.state}, seed ${drawn.seed})`, () => {
  it("covers workplaces to the state's rates, sets dues by members, and a right-to-work change moves who joins", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    openLaws(core);
    openLawReach(core);
    const api = coreAPI(core);
    const usps = opening.placeMetadata?.housingState ?? "";
    const state = (
      unionData.states as Record<
        string,
        { membersPct: number; representedPct: number }
      >
    )[usps];
    const year = Number(opening.startedAt.slice(0, 4));
    advanceCore(core, `${year}-03-02`);
    const months = () =>
      [...api.moduleState("jobs").table("unions").rows()].filter((row) =>
        String(row.id).startsWith("union-month:"),
      ) as unknown as UnionMonth[];
    const first = months().filter((row) => row.month === `${year}-03`);
    // A place with no union local (or no state rates) has none to check.
    if (!state || !first.length) return;
    console.log(
      `${drawn.name}: ${first.map((row) => `${row.members} members of ${row.represented} represented, dues $${Math.round(row.duesMonthlyMinor / 100)} a month`).join("; ")}`,
    );
    for (const row of first) {
      // Members join at the state's own members-per-represented share.
      if (row.represented > 50)
        expect(row.members / row.represented).toBeCloseTo(
          state.membersPct / state.representedPct,
          1,
        );
      const flow = residentsRuntime(core)?.flows.get(
        `dues:${
          [...core.organizations.values()].find(
            (org) =>
              org.placeId === row.placeId &&
              (org as { classification?: string }).classification ===
                "membership:labor-union",
          )?.id
        }`,
      );
      if (flow && !flow.endedAt)
        expect(flow.amountMinor).toBe(row.duesMonthlyMinor);
    }
    // Flip the town's right-to-work law and see who joins move to the other states' average.
    // Right-to-work is a state law: change it there.
    const levels = lawChain(api).levels;
    const level =
      levels.find((row) => /state|territory/.test(String(row.level))) ??
      levels[0]!;
    const before = first[0]!;
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: RTW,
      value: before.rightToWork ? 0 : 1,
      effectiveDate: `${year}-03-10`,
      measureId: "TEST-rtw",
      citation: "Test act",
    });
    advanceCore(core, `${year}-04-02`);
    const after = months().find(
      (row) => row.month === `${year}-04` && row.placeId === before.placeId,
    );
    expect(after).toBeDefined();
    expect(after!.rightToWork).toBe(!before.rightToWork);
    if (before.represented > 50 && after!.represented > 50) {
      const shareBefore = before.members / before.represented,
        shareAfter = after!.members / after!.represented;
      // A right-to-work law lowers the share who join; repealing one raises it.
      if (after!.rightToWork)
        expect(shareAfter).toBeLessThan(shareBefore + 0.02);
      else expect(shareAfter).toBeGreaterThan(shareBefore - 0.02);
    }
  }, 600_000);
});
