/**
 * The jobs engine reads the outcome web's retirement-age link: a law that
 * raises the full retirement age keeps more people from 62 to 66 at work.
 * Played one year in twin bench worlds, in a place drawn from all 56 on a
 * seed nobody chose. The twin is the same world with the link's researched
 * effect set on the web's month rows, as the web writes it while such a law
 * is in force; the base has no such law. The weight on the web's term
 * (jobsOlderWorkWebWeight) is fitted so the year moves the group's share at
 * work by the link's researched size, within its range.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { worldWith } from "./tooling/world-with";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OLDER_WORK } from "./jobs-web";
import { JOBS_MODULE_ID, laborGroupShares } from "./modules/jobs";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import links from "../../data/research/outcome-web/links.json" with { type: "json" };
import coverage from "./data/outcome-web/coverage.json" with { type: "json" };
import type { CoreState } from "./types";

const LINK = "retirement-age-to-older-work";
const research = links.links.find((row) => row.key === LINK)!;
const [low, high] = research.range as [number, number];

const seed = process.env.WEB_OLDER_SEED || randomBytes(8).toString("hex");
const DAYS = 365;
/**
 * People 62 to 66 in the town at the opening, so that a year's retirements
 * count in people rather than ones and twos; a smaller town is drawn again.
 */
const LEAST = 200;
const DRAWS = 16;

interface Change {
  readonly kind: string;
  readonly reasonKey: string;
  readonly jobId: string;
  readonly personId: string;
  readonly values: Readonly<Record<string, number>>;
}

const webRows = (core: CoreState) =>
  coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as WebMonth[];

/** Set the link's effect on the latest web month row of every place. */
function shift(core: CoreState): void {
  const table = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  const rows = webRows(core);
  const latest = rows
    .map((r) => r.month)
    .sort()
    .at(-1);
  for (const row of rows)
    if (row.month === latest)
      table.put({
        ...row,
        effects: { ...row.effects, [LINK]: research.size },
      } as never);
}

/** The place the web keeps a row for that the counted population lives in, else the player's town. */
function townOf(core: CoreState): string {
  const kept = new Set(webRows(core).map((row) => row.placeId));
  for (const h of residentsRuntime(core)!.store.liveHouseholds())
    if (kept.has(h.placeId)) return h.placeId;
  return core.people.get(core.playerId!)!.placeId;
}

/** One played year; the twin's rows carry the link from the web's first row on. */
function year(core: CoreState, shifted: boolean) {
  let day = makeIsoDate(core.date);
  for (let i = 0; i < DAYS; i += 1) {
    day = addDays(day, 1);
    advanceCore(core, day);
    if (shifted && webRows(core).length) shift(core);
  }
  const api = coreAPI(core);
  const town = townOf(core);
  const retired = (
    api
      .moduleState(JOBS_MODULE_ID)
      .table("changes")
      .rows() as unknown as Change[]
  ).filter(
    (row) =>
      row.kind === "left-work" &&
      row.reasonKey === "retired" &&
      (row.values.age ?? 0) < 67,
  );
  return { town, share: laborGroupShares(api, town)[OLDER_WORK], retired };
}

describe(`the retirement-age link in who works (seed ${seed})`, () => {
  it("runs on the web: no engine claims to carry it", () => {
    expect(coverage.wired).toContain(LINK);
    expect(LINK in coverage.waiting).toBe(false);
  });

  it("raising the retirement age moves the share of people 62 to 66 at work by the researched size", () => {
    const { world, place } = worldWith(
      seed,
      "web-older-work",
      (w) =>
        laborGroupShares(
          coreAPI(w.core),
          w.core.people.get(w.core.playerId!)!.placeId,
        )[OLDER_WORK].of >= LEAST,
      DRAWS,
    );
    const base = year(world.core, false);
    const twin = year(
      buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core,
      true,
    );
    const where = `${place.name} (${place.key}) seed ${seed}`;
    expect(twin.town, where).toBe(base.town);
    const rate = (x: { of: number; at: number }) => x.at / x.of;
    const moved = rate(twin.share) / rate(base.share) - 1;
    // Retirements the base world made that the twin did not: the people the law kept at work, by job.
    const twinJobs = new Set(twin.retired.map((row) => row.jobId));
    const kept = base.retired.filter((row) => !twinJobs.has(row.jobId));
    console.log(
      `older work: ${where}, town ${base.town}: at work 62 to 66 ${base.share.at.toFixed(1)} of ${base.share.of.toFixed(1)} -> ${twin.share.at.toFixed(1)} of ${twin.share.of.toFixed(1)}, ${(100 * moved).toFixed(1)}% (researched ${100 * research.size}%, ${100 * low} to ${100 * high}); retired under 67 ${base.retired.length} -> ${twin.retired.length}; kept at work, e.g. ${kept
        .slice(0, 3)
        .map((row) => `${row.jobId} (${row.personId})`)
        .join(", ")}`,
    );
    expect(kept.length, where).toBeGreaterThan(0);
    expect(moved, where).toBeGreaterThanOrEqual(low);
    expect(moved, where).toBeLessThanOrEqual(high);
  }, 2_400_000); // two played years in one town, plus the draws, queued behind other sessions
});
