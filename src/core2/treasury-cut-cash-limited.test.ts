/**
 * A treasury pays what it holds: when its dues exceed its cash, every line is
 * paid the same share of its due and the rest is carried as arrears
 * (closeTreasuries: `scale = min(1, have / need)`). So cutting a line in a
 * short treasury moves the cut line's payment by about the cut times that
 * share, the other lines rise to take up the room, the month's total paid
 * barely moves, and the arrears shrink by about the cut (pool item
 * world-treasury-cut-moves-little). A place drawn from all 56 whose state
 * treasury is short at its first closes.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { treasuryMonthsOf } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** The first close of the state treasury; `cutAnnual`, when given, is taken off its largest line the day after the opening (null if the shortfall is needed first). */
function firstClose(placeSeed: string, placeKey: string, cutAnnual?: number) {
  const { core } = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const state = governments(api).find((g) => g.level === "state");
  const budget = state
    ? budgetsOf(api, state.id).find((b) => b.startsOn <= core.date)
    : undefined;
  if (!state || !budget) return null;
  const [line, annual] = Object.entries(budget.spendingMinor).sort(
    (a, b) => b[1] - a[1],
  )[0]!;
  const delta = -Math.round(Math.min(annual, cutAnnual ?? 0));
  if (cutAnnual)
    amendBudget(api, {
      governmentId: state.id,
      line,
      deltaMinor: delta,
      measureId: "TEST-TREASURY-CUT",
    });
  advanceCore(core, addDays(makeIsoDate(core.date), 45));
  const month = treasuryMonthsOf(api, state.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!month) return null;
  const lines = Object.entries(month.lines);
  const paid = (l: (typeof lines)[number][1]) =>
    l.providersMinor + l.outsideMinor + l.inTownMinor;
  return {
    line,
    cutDue: Math.abs(delta) / 12,
    totalPaid: lines.reduce((n, [, l]) => n + paid(l), 0),
    totalShort: lines.reduce((n, [, l]) => n + l.shortMinor, 0),
    linePaid: paid(month.lines[line]!),
    id: month.id,
  };
}

it(`a cut line in a cash-short state treasury shrinks the arrears, not the month's total paid (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const tried: string[] = [];
    // Most states hold what they owe at the first closes; a short one is rare
    // among draws, so the recorded repro (the item's West Virginia world, whose
    // state treasury is short by about 3 percent) comes first, then draws.
    const repro = [...placeLocalities("US-WV")].sort((a, b) =>
      a.key.localeCompare(b.key),
    )[0]!;
    const candidates = [
      {
        name: repro.displayName,
        key: repro.key,
        seed: "f58455b90eaa1e4f",
      },
      ...Array.from({ length: 6 }, (_, draw) =>
        drawPlace(`${seed}:${draw}`, "treasury-cut"),
      ),
    ];
    for (const place of candidates) {
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const control = firstClose(place.seed, place.key);
      if (!control || !(control.totalShort > 0)) {
        tried.push(`${where}: state treasury not short`);
        continue;
      }
      // Half the month's shortfall, a year of it: the treasury stays short.
      const cut = firstClose(place.seed, place.key, control.totalShort * 6)!;
      // The month's total paid is what the treasury held either way.
      expect(
        Math.abs(cut.totalPaid - control.totalPaid) / control.totalPaid,
        `${where}: total paid ${control.totalPaid} against ${cut.totalPaid} (${control.id})`,
      ).toBeLessThan(0.01);
      // The cut line is paid less; the saving shows as arrears carried less.
      expect(cut.linePaid, `${where}: ${cut.line} paid`).toBeLessThan(
        control.linePaid,
      );
      expect(
        control.totalShort - cut.totalShort,
        `${where}: arrears fell by about the monthly cut ${cut.cutDue}`,
      ).toBeGreaterThan(cut.cutDue * 0.5);
      return;
    }
    throw new Error(
      `no drawn place had a short state treasury: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
