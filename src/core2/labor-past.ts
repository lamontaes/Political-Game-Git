/**
 * The town's labor market a year before the start (owner, Nov 13, 2026: "it's
 * simulated... things need to be simulated in order to make your modern day
 * make sense"), so Metrics reads last year beside people at work, people
 * looking for work, jobs open and the town's unemployment on day one, the way
 * it does from month 13 on.
 *
 * One rule for both tiers (a counted group is read with the rule a full
 * person is, times its count): the town's unemployment moves with the
 * economy pass's month, so the people looking a year before day one are the
 * people looking on day one moved by how the pass's unemployment stood then
 * against now, out of the same labor force. Jobs open follow the hires the
 * working-life run's own finding rule (`findPerQuarter`, the pass's months)
 * lets seekers make: openings are what is filled, so they move as the seekers
 * times how fast work is found. The figures are written into the closed year
 * row before the start, as the economy stood a year before its latest
 * published month (the way the state's figures read), and cite the economy
 * pass's history record in force then.
 */
import { historyMonths } from "./macro-model";
import { putPastYear } from "./output-numbers";
import { findPerQuarter, preStartHistory } from "./past-module";
import type { CoreAPI, CoreState } from "./types";

/** One place's day-one labor figures, as the monthly row holds them. */
export interface DayOneLabor {
  readonly placeId: string;
  readonly residentsAtWork: number;
  readonly residentsLooking: number;
  readonly openPositions: number;
  readonly unemploymentRate: number;
}

export function laborYearBefore(
  api: CoreAPI,
  places: readonly DayOneLabor[],
): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const months = historyMonths(core.startedAt, core.seed, p);
  const here = core.date.slice(0, "YYYY-MM".length);
  const now = months.filter((row) => row.month <= here).at(-1);
  if (!now) return;
  // Last year reads the way the state's figures do: the month a year before
  // the latest one the economy pass published, so day one shows a year of
  // movement and not a month's. The closed year row before the start holds it.
  const startYear = Number(core.date.slice(0, "YYYY".length));
  const back = `${Number(now.month.slice(0, 4)) - 1}${now.month.slice(4)}`;
  const then = months.find((row) => row.month === back);
  if (!then || !(now.unemploymentPct > 0) || !(then.unemploymentPct > 0))
    return;
  const mean =
    months.reduce((sum, row) => sum + row.unemploymentPct, 0) / months.length;
  const moved = then.unemploymentPct / now.unemploymentPct;
  const finds = (month: typeof now) =>
    findPerQuarter(api, month.unemploymentPct / mean, 0);
  const year = startYear - 1;
  // The economy pass's own history record in force that month (the pass
  // writes one at each coarse step), for dev mode's Trace.
  const recordId =
    preStartHistory(core, { kind: "economy.conditions" })
      .filter((row) => row.date <= `${then.month}-31`)
      .at(-1)?.id ?? then.id;
  for (const town of places) {
    const force = town.residentsAtWork + town.residentsLooking;
    if (!(force > 0)) continue;
    const looking = Math.min(force, Math.round(town.residentsLooking * moved));
    const hires =
      town.residentsLooking > 0
        ? (looking * finds(then)) / (town.residentsLooking * finds(now))
        : undefined;
    putPastYear(api, {
      placeId: town.placeId,
      year,
      date: `${then.month}-28`,
      closed: true,
      recordId,
      values: {
        "labor.residents-at-work": force - looking,
        "labor.residents-looking": looking,
        ...(hires === undefined
          ? {}
          : { "labor.open-positions": Math.round(town.openPositions * hires) }),
        "labor.unemployment-pct": town.unemploymentRate * moved,
      },
    });
  }
}
