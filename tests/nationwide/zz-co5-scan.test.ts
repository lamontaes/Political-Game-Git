import { it } from "vitest";
import { observerPlace } from "../../src/presentation/observer-world";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { generateOpeningLife, prepareOpeningLife } from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import { cancelFutureDueItem, createFutureTransitionHandlerRegistry } from "../../src/simulation/future-transitions";
import { resolveDueThrough } from "../fixtures/due-item-clock";
import { countyBudgetHearings } from "../../src/simulation/county-budget-record";
import { councilReadingDueHandler } from "../../src/simulation/municipal-ordinance-procedure";
import { COUNTY_BUDGET_HEARING_TRANSITION } from "../../src/simulation/living-world/county-budget-hearings";
const CLOCK = /^(county:|civic:)|tax|property/;
const N = Number(process.env.SCAN_N ?? 24);
const START = Number(process.env.SCAN_START ?? 1);
it("scan", { timeout: 3_000_000 }, () => {
  for (let i = START; i < START + N; i += 1) {
    const seed = `co5-scan-${i}`;
    try {
      const place = observerPlace(seed);
      const game = generateOpeningLife(prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed: `co5-${seed}`, placeKey: place.key, startAge: 40, questionnaire: "skipped" })).game!;
      let w = openOrdinaryLife(game.world, game.playerPersonId);
      const county = homeLocalGovernmentUnits(w, game.playerPersonId).counties[0];
      if (!county) { process.stderr.write(`SCAN ${seed} ${place.displayName}: no county\n`); continue; }
      for (const item of w.history.futureDueItems)
        if (!CLOCK.test(item.transitionKey))
          w = cancelFutureDueItem(w, { stableKey: `${item.stableKey}:x`, dueItemId: item.id, effectiveAt: w.currentDate, reasonKey: "test:clock", context: null });
      const due = w.history.futureDueItems.find((it) => it.transitionKey === COUNTY_BUDGET_HEARING_TRANSITION && it.stableKey.includes(county.id));
      if (!due) { process.stderr.write(`SCAN ${seed} ${place.displayName}: no hearing scheduled\n`); continue; }
      const at = resolveDueThrough(w, due.dueAt);
      const h = countyBudgetHearings(at).find((r) => r.unitId === county.id);
      const seen: string[] = [];
      const spy = createFutureTransitionHandlerRegistry([
        [
          "civic:council-reading-due",
          (world, item) => {
            const r = councilReadingDueHandler(world, item);
            if (r.status === "blocked") {
              seen.push(String(r.context));
              return { ...r, reasonKey: "scan:blocked" };
            }
            return r;
          },
        ],
      ]);
      const end = resolveDueThrough(at, h?.startsOn ?? due.dueAt, spy);
      if (seen.length) process.stderr.write(`SCAN ${seed} ${place.displayName} (${county.stateUsps}): reading blocked: ${seen[0]}\n`);
      const d = countyBudgetHearings(end).find((r) => r.unitId === county.id);
      const vote = (end.history.legislativeVotes ?? []).find((v) => v.measureId === d?.measureId);
      process.stderr.write(`SCAN ${seed} ${place.displayName} (${county.stateUsps}): hearing ${due.dueAt} stage ${d?.stage} vote ${vote?.outcome} ${vote?.dispositions.map((x) => x.disposition + "/" + x.reason).join(",")}\n`);
    } catch (error) {
      process.stderr.write(`SCAN ${seed}: error ${(error as Error).message.slice(0, 120)}\n`);
    }
  }
});
