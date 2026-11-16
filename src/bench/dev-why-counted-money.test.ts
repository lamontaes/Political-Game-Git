/**
 * Dev mode's money panel for a counted household (owner, Nov 16: what a trace
 * finds, dev mode shows): its cash and bank savings, the months they cover,
 * what it opened with against the survey's median and its own savings draw,
 * and why each of its people out of work is looking. Pinned at Staples,
 * Connecticut (`drawPlace("probe-a", "exit-a")`, the opening jobless stock
 * test's town) in a town of 1,500, on its second day, where counted people
 * start looking for want of money.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "../core2/life";
import { residentsRuntime } from "../core2/modules/residents";
import { OUTCOME_WEB_MODULE } from "../core2/modules/outcome-web";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../core2/modules/world";
import { coreAPI } from "../core2/state";
import { generatedOpening } from "../core2/tooling/generated-world";
import { findRecord } from "./dev-trace";
import { whyPanels } from "./dev-why";

it("dev mode shows a counted household's money and why its people look for work (Staples, Connecticut)", () => {
  const place = drawPlace("probe-a", "exit-a");
  const where = `${place.name} ${place.state}, seed probe-a, label exit-a`;
  const core = createLifeCore(
    withWorldEconomy(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    ),
    { data: worldCoreData(), modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE] },
  );
  const town = core.people.get(core.playerId!)!.placeId;
  advanceCore(core, `${core.date.slice(0, 4)}-01-22`);
  const rt = residentsRuntime(core)!;
  const looking = (
    coreAPI(core)
      .moduleState("jobs" as never)
      .table("countedSeekers" as never)
      .rows() as unknown as {
      personId: string;
      placeId: string;
      employed?: boolean;
      reasonKey: string;
    }[]
  ).filter(
    (r) =>
      r.placeId === town && !r.employed && r.reasonKey === "started-looking",
  );
  expect(
    looking.length,
    `${where}: counted people started looking`,
  ).toBeGreaterThan(0);
  const seeker = looking[0]!;
  const home =
    rt.store.households[
      rt.store.household[rt.store.memberOf.get(seeker.personId as never)!]!
    ]!;
  const found = findRecord(core, home.id);
  expect(found?.kind, where).toBe("counted-household");
  const [money, work] = whyPanels(core, home.id, found);
  expect(money!.title).toBe("Money");
  const row = (label: string) =>
    money!.rows.find((r) => r.label.startsWith(label))?.value;
  // Its cash and savings, and the months they cover its costs, as the jobs
  // engine read them when it chose to look: under a month.
  expect(String(row("cash, its share"))).toMatch(/^\$/);
  expect(String(row("bank savings"))).toMatch(/^\$/);
  expect(Number(row("months its cash covers"))).toBeLessThan(1);
  // What it opened with is the survey's median times its own draw.
  const draw = Number(row("its own savings draw"));
  expect(draw).toBeGreaterThan(0);
  const dollars = (v: unknown) => Number(String(v).replace(/[$,]/g, ""));
  expect(
    Math.abs(
      dollars(row("opened with")) - dollars(row("the survey's median")) * draw,
    ),
  ).toBeLessThan(dollars(row("opened with")) * 0.01 + 0.02);
  // Why its person is looking, by person id, with the chooser's terms.
  expect(work!.title).toBe("Looking for work");
  const theirs = work!.rows.find((r) => r.id === seeker.personId);
  expect(theirs?.label, where).toMatch(/^started-looking since /);
  expect(String(theirs?.value)).toMatch(/score /);
  // The same panels open from the person.
  const person = findRecord(core, seeker.personId);
  expect(person?.kind).toBe("counted-person");
  expect(whyPanels(core, seeker.personId, person).map((p) => p.title)).toEqual([
    "Money",
    "Looking for work",
  ]);
  // A full household's own draw shows on its people's trace, and reads the
  // same each time (fixed by the world's seed and the household's id).
  const player = core.playerId!;
  const opening = () =>
    whyPanels(core, player, findRecord(core, player)).find(
      (p) => p.title === "Opening savings",
    );
  const drawRow = opening()?.rows.find((r) => r.label.startsWith("its own"));
  expect(Number(drawRow?.value), where).toBeGreaterThan(0);
  expect(opening()?.rows[0]?.id).toBe(core.people.get(player)!.householdId);
  advanceCore(core, `${core.date.slice(0, 4)}-02-01`);
  expect(
    opening()?.rows.find((r) => r.label.startsWith("its own"))?.value,
  ).toBe(drawRow?.value);
}, 40_000);
