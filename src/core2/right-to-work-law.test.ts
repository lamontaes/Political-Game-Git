/** A right-to-work law brings a town's union dues down with union membership, and a repeal brings them back. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain, yesLevels } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { rightToWorkRow } from "./law-reach/group-a-union";
import { membershipPoints } from "./right-to-work-dues";
import { reachParameter } from "./law-reach/group-a-records";

const question = "us-policy-positions:labor-workforce.right-to-work";

it("lowers union dues as membership falls after the law, and raises them back on repeal", () => {
  const seed = process.env.RTW_SEED ?? randomBytes(32).toString("hex");
  setBookkeeping(false);
  try {
    const skipped: string[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      // RTW_DRAW_SEED and RTW_PLACE_KEY pin the first town (a failure prints both).
      const draw =
        attempt === 0 && process.env.RTW_DRAW_SEED && process.env.RTW_PLACE_KEY
          ? {
              seed: process.env.RTW_DRAW_SEED,
              key: process.env.RTW_PLACE_KEY,
            }
          : drawPlace(seed, `rtw:${attempt}`);
      let core;
      try {
        ({ core } = buildBenchWorld(draw.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: draw.key,
        }));
      } catch (error) {
        // A tiny town the generator cannot open: the next draw.
        if (/holds a resident aged/.test(String(error))) continue;
        throw error;
      }
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const dues = () =>
        [...(residentsRuntime(core)?.flows.values() ?? [])].filter(
          (f) => f.id.startsWith("dues:") && !f.endedAt && f.placeId === town,
        );
      const before = new Map(dues().map((f) => [f.id, f.amountMinor]));
      if (!before.size) continue;
      const where = `seed ${draw.seed}, place ${draw.key}`;
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      const set = (value: number, days: number) => {
        enactLaw(api, {
          jurisdiction: state.jurisdiction,
          level: "state",
          series: question,
          value,
          effectiveDate: core.date,
          measureId: `test:rtw:${value}:${core.date}`,
          citation: "Controlled law case in a generated town.",
        });
        advanceCore(core, addDays(makeIsoDate(core.date), days));
      };
      // Plays `days` a month at a time (the dues are reset monthly), stopping
      // where a bill passed in play changes the law away from `applied`: the
      // row it then holds, or null when the law stood throughout.
      const playWatching = (days: number, applied: number) => {
        const end = addDays(makeIsoDate(core.date), days);
        while (core.date < end) {
          const step = addDays(makeIsoDate(core.date), 30);
          advanceCore(core, step < end ? step : end);
          const now = rightToWorkRow(api);
          if (now && now.applied !== applied) return now;
        }
        return null;
      };
      // A state with the law at the opening has its effect in the dues already.
      set(1, 0);
      const playedRepeal = playWatching(400, 1);
      if (playedRepeal) {
        // The played legislature repealed the law inside the window (Nevada,
        // AB 39): its effect is asserted only while it stood, and the repeal
        // brings the dues back up from where they stood when it took effect.
        // The row names the law that changed it: the played bill's.
        expect(playedRepeal.lawId, where).not.toMatch(/^law:.*test:rtw:/);
        expect(yesLevels(api, question).length > 0, where).toBe(false);
        if (playedRepeal.baseline === 0)
          expect(playedRepeal.startPoints, where).toBeLessThan(0);
        const atPlayedRepeal = new Map(
          dues().map((f) => [f.id, f.amountMinor]),
        );
        const reenacted = playWatching(400, 0);
        // The repeal's effect on the dues can be judged only where the law
        // had an effect to undo (a baseline of 0) and the legislature did not
        // enact it again in the window; otherwise this town cannot show it and
        // the next one is drawn, never reported as checked.
        if (playedRepeal.baseline !== 0 || reenacted) {
          skipped.push(
            `${where}: repealed by ${playedRepeal.lawId}, ${reenacted ? "enacted again" : `baseline ${playedRepeal.baseline}`}`,
          );
          continue;
        }
        const judged = dues().filter((f) => atPlayedRepeal.has(f.id));
        expect(
          judged.length,
          `${where}: locals' dues that stood at the repeal`,
        ).toBeGreaterThan(0);
        for (const flow of judged)
          expect(flow.amountMinor, `${where}: ${flow.id}`).toBeGreaterThan(
            atPlayedRepeal.get(flow.id)!,
          );
        console.log(
          `right-to-work: ${where}: repealed in play by ${playedRepeal.lawId} on ${playedRepeal.changedOn}; ${judged.length} locals' dues charged more than at the repeal`,
        );
        return;
      }
      const row = rightToWorkRow(api);
      expect(row, `${where}: no row`).not.toBeNull();
      const points = membershipPoints(row!, core.date);
      if (row!.baseline === 0) {
        expect(points, where).toBeLessThan(0);
        expect(points, where).toBeGreaterThan(
          -reachParameter("rightToWorkMembershipPoints"),
        );
        for (const flow of dues())
          expect(flow.amountMinor, `${where}: ${flow.id}`).toBeLessThan(
            before.get(flow.id)!,
          );
      } else {
        expect(points, where).toBe(0);
        for (const flow of dues())
          expect(flow.amountMinor, `${where}: ${flow.id}`).toBe(
            before.get(flow.id),
          );
      }
      const atRepeal = new Map(dues().map((f) => [f.id, f.amountMinor]));
      set(0, 400);
      const repealed = rightToWorkRow(api)!;
      // The played world's legislature can enact the policy again in the 400
      // days (Louisiana, seed a2cb700c4fb0: a bill effective 2026-08-01), and a
      // policy is law for the town while any level of its chain says yes, so
      // the row stands as the laws in force say.
      const stands = yesLevels(api, question).length > 0 ? 1 : 0;
      expect(repealed.applied, where).toBe(stands);
      // A repeal that stands brings membership, and with it the dues, back up from where they stood.
      if (stands === 0 && repealed.baseline === 0)
        for (const flow of dues()) {
          expect(flow.amountMinor, `${where}: ${flow.id}`).toBeGreaterThan(
            atRepeal.get(flow.id)!,
          );
          expect(flow.amountMinor, `${where}: ${flow.id}`).toBeLessThanOrEqual(
            before.get(flow.id)!,
          );
        }
      return;
    }
    throw new Error(
      `no town with a union local in 10 draws (seed ${seed})${skipped.length ? `; played repeals that could not be judged: ${skipped.join("; ")}` : ""}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);
