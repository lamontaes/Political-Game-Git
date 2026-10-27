/**
 * A link that averages its cause over many months reads every month before
 * the web opened as the cause was first read at the opening. The opening
 * month's row is rewritten when a law or a budget change takes effect that
 * month, so reading that row back for the earlier months would carry the
 * change into all of them: a schools line raised once in January would read
 * as twelve years of higher spending. In a drawn place, the town's schools
 * line is raised the day after the opening and the web refreshes that month
 * twice; the spending link's effect must stay one month's share of its
 * 144-month average both times.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  amendBudget,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import { lawChain } from "./modules/laws";
import {
  OUTCOME_WEB_MODULE,
  OUTCOME_WEB_MODULE_ID,
  type WebMonth,
} from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreEventInput, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(8).toString("hex");
const LINK = "school-spending-to-attainment";
/** Places drawn at most: an island area, or a town whose schools are a separate district's, has no city or county schools line to raise. */
const DRAWS = 10;

it(`an opening-month change reads as one month of a phased link's average, not every month before it (seed ${seed})`, () => {
  const link = WEB_LINKS.find((row) => row.key === LINK)!;
  expect(link.phaseInMonths, LINK).toBeGreaterThan(1);
  const priorBookkeeping = setBookkeeping(false);
  try {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "web-opening-refresh");
      const where = `${place.name}, ${place.state}, seed ${seed}:${draw}`;
      const core = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core as CoreState;
      const api = coreAPI(core);
      // The day after the opening month's row is written.
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const town = lawChain(api).townPlaceId;
      // The first city or county budget in the town with a schools line, as
      // the spending test raises it.
      let gov: ReturnType<typeof governments>[number] | undefined;
      let line = 0;
      for (const row of governments(api)) {
        if (
          (row.level !== "city" && row.level !== "county") ||
          core.organizations.get(row.organizationId)?.placeId !== town
        )
          continue;
        const budget = [...budgetsOf(api, row.id)]
          .filter((b) => b.startsOn <= core.date)
          .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
        const base = budget
          ? (baseBudget(api, row, budget.fiscalYear).spendingMinor["schools"] ??
            0)
          : 0;
        if (base > 0) {
          gov = row;
          line = base;
          break;
        }
      }
      if (!gov || line <= 0) {
        tried.push(`${where}: no city or county schools line`);
        continue;
      }
      const amended = amendBudget(api, {
        governmentId: gov.id,
        line: "schools",
        deltaMinor: Math.round(line * 0.1),
        measureId: "test:schools-line",
      });
      expect(amended, `${where}: the schools line is amended`).toBeTruthy();
      // The web refreshes the month the way a law taking effect makes it.
      const effects: number[] = [];
      let row: WebMonth | undefined;
      for (let refresh = 0; refresh < 2; refresh += 1) {
        OUTCOME_WEB_MODULE.onEvent!(
          api,
          {
            id: `test:web-refresh:${refresh}`,
            kind: "test.web-refresh",
            date: core.date,
            placeId: town,
            personIds: [],
            facts: {},
          } as unknown as CoreEventInput,
          [],
        );
        row = (
          api
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("months")
            .rows() as unknown as WebMonth[]
        ).find(
          (month) =>
            month.placeId === town && month.month === core.date.slice(0, 7),
        );
        expect(row, `${where}: the month's row`).toBeDefined();
        effects.push(row!.effects[LINK] ?? 0);
      }
      const cause = row!.values[link.from]!;
      expect(cause, `${where}: ${link.from} reads the raise`).toBeGreaterThan(
        0,
      );
      // One month of the raise among the average's months, the rest at the
      // opening's first reading (no raise).
      const expected = (link.size! * cause) / link.phaseInMonths!;
      expect(effects[0], `${where} ${row!.id}: first refresh`).toBeCloseTo(
        expected,
        9,
      );
      expect(effects[1], `${where} ${row!.id}: second refresh`).toBeCloseTo(
        expected,
        9,
      );
      console.log(
        `opening refresh: ${where}${tried.length ? ` (drawn again after ${tried.join("; ")})` : ""}: ${row!.id} reads ${link.from} ${cause.toFixed(4)}; ${LINK} ${effects.map((e) => e.toExponential(4)).join(" then ")}, against one month in ${link.phaseInMonths}, ${expected.toExponential(4)}`,
      );
      return;
    }
    throw new Error(
      `no drawn place in ${DRAWS} has a city or county schools line: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(priorBookkeeping);
  }
}, 900_000);
