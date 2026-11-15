/**
 * A campaign leans toward the questions whose area of the term read went the
 * way its candidate runs on (`platformRecordTilt`): a challenger toward the
 * areas the incumbent's term hurt, with the same platform and the same world.
 * Played in three named places at a pinned seed (the same worlds every run):
 * each place is built twice, once with the town's pay and prices flat and once
 * with them sliding, a challenger files against the seat's incumbent in the
 * first open local race that has one, and the challenger's share of the
 * questions that answer pay or prices is read from its campaign row.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceToFilingOpen } from "./gov-test-clock";
import { coreAPI } from "./state";
import { OUTCOME_WEB_MODULE_ID } from "./outcome-web-model";
import { TERM_MEASURES, areasAnswered } from "./term-read";
import { platformShares } from "./campaign-stances";
import { campaignFor } from "./modules/campaigns";
import { fileCandidacy, openContests } from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";

const SEED = "a7c13e";
const DRAWS = [0, 1, 2] as const;
setBookkeeping(false);

/** The town's web, written the way the web writes it, with pay and prices sliding by `slide` over the term. */
function writeTerm(
  built: ReturnType<typeof buildBenchWorld>,
  slide: number,
): void {
  const web = coreAPI(built.core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const worse = key.startsWith("household.prices")
        ? slide
        : key.startsWith("household.income")
          ? -slide
          : key.startsWith("household.poverty")
            ? slide
            : 0;
      values[key] = 100 * (1 + worse * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${built.placeId}:${month}`,
      placeId: built.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
}

/** One place's world, built once, with the town's term written as `slide` says before each challenger files. */
function placeWorld(n: number) {
  const drawn = drawPlace(`${SEED}:${n}`, "campaign-record-tilt");
  const built = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  advanceToFilingOpen(built.core);
  return { drawn, built, api: coreAPI(built.core), used: new Set<string>() };
}

/** A challenger's shares on the questions that answer pay or prices in the first race with an incumbent, or null. */
function challengerShares(
  world: ReturnType<typeof placeWorld>,
  slide: number,
  draw: number,
) {
  const { drawn, built, api, used } = world;
  writeTerm(built, slide);
  const town = [...built.core.people.values()]
    .filter((p) => p.alive && p.placeId === built.placeId && !used.has(p.id))
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  // Premise (#9342, the account lead's yes): this test writes the town's own
  // web, which only a local seat reads; a state's and the country's seats now
  // read their own monthly records (term-read-figures.test.ts), so a flat
  // town term no longer means flat for them.
  const local = (officeId: string) =>
    !/^US(-|$)/.test(
      String(
        (
          api.moduleState(OFFICES_MODULE_ID).table("offices").get(officeId) as
            { jurisdiction?: string } | undefined
        )?.jurisdiction ?? "US",
      ),
    );
  for (const contest of openContests(api).filter(
    (c) => c.incumbentTermId && local(c.officeId),
  )) {
    for (const person of town.slice(0, 40)) {
      const result = fileCandidacy(api, {
        personId: person.id,
        contestId: contest.id,
        platform: [],
      });
      if (result.status === "refused") continue;
      used.add(person.id);
      const campaign = campaignFor(api, result.filing.id);
      const answering = campaign.platform
        .filter((s) =>
          areasAnswered(s.question).some((a) => a === "pay" || a === "prices"),
        )
        .map((s) => s.question);
      if (!answering.length) continue;
      // The same campaign's shares by the platform rule alone, and as the
      // record leaned them.
      const plain = platformShares(api, campaign.platform);
      const leaned = campaign.platformShares ?? {};
      const sum = (shares: Readonly<Record<string, number>>) =>
        answering.reduce((t, q) => t + (shares[q] ?? 0), 0);
      return {
        where: `${drawn.name}, ${drawn.state} (${drawn.key}), seed ${SEED}:${draw}, ${contest.id}, challenger ${person.id}`,
        plain: sum(plain),
        leaned: sum(leaned),
        total: Object.values(leaned).reduce((t, v) => t + v, 0),
      };
    }
  }
  return null;
}

describe("a challenger's talk leans toward the area the incumbent's term hurt", () => {
  it("gives the questions that answer pay or prices a larger share after a term where they slid, and the same share where nothing moved", () => {
    const lines: string[] = [];
    let checked = 0;
    for (const draw of DRAWS) {
      const world = placeWorld(draw);
      const flat = challengerShares(world, 0, draw);
      const slid = challengerShares(world, 0.4, draw);
      if (!flat || !slid) {
        lines.push(`draw ${draw}: no challenger with a pay or prices question`);
        continue;
      }
      lines.push(
        `${slid.where}: nothing moved ${flat.plain.toFixed(3)} to ${flat.leaned.toFixed(3)}; pay and prices slid ${slid.plain.toFixed(3)} to ${slid.leaned.toFixed(3)}`,
      );
      expect(flat.leaned, flat.where).toBeCloseTo(flat.plain, 6);
      expect(slid.total, slid.where).toBeCloseTo(1, 6);
      expect(slid.leaned, slid.where).toBeGreaterThan(slid.plain);
      checked += 1;
    }
    process.stdout.write(`TILT\n${lines.join("\n")}\n`);
    expect(checked, lines.join("; ")).toBeGreaterThan(0);
  }, 900_000);
});
