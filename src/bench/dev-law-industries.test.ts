/**
 * Dev mode's Industries check (dev-law-industries.ts), in a played world at a
 * pinned place and seed: an untouched world equals its twin; a bill passed
 * here is a do-nothing bill passed the same way in the twin, so before a
 * passed raise starts the only businesses that differ are the ones paying
 * dues to fight it; a minimum wage raise in force shows
 * as more pay and higher prices at the town's restaurants than in the twin;
 * and the state's groundwater limit, law at the opening, shows as lower farm
 * sales than in the twin with it set aside.
 */
import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { lawInForce } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { DevMode } from "./dev-mode";
import {
  industriesAgainstNullBill,
  industriesWithoutOpeningLaw,
  type TwinWorld,
} from "./dev-law-industries";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// Choteau, Montana: a small farm town with restaurants and a state minimum wage above the federal one.
const placeKey = "3014650";
const seed = "law-links-choteau";
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  settings: { history: "today" },
  placeKey,
});
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const where = `${world.place.displayName} (place ${placeKey}, seed ${seed})`;
const twinDev = (twin: CoreState, built: TwinWorld) =>
  new DevMode(twin, built.director, undefined, built.placeId);
const check = () => industriesAgainstNullBill(core, dev.marks(), twinDev);
const GROUNDWATER =
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal";
const days = (n: number) => addDays(makeIsoDate(core.date), n);
// Four checks of about 20 seconds each plus the runs between them; the limit is about twice the slower of alone and beside other tests.
const LIMIT_MS = 240_000;

describe(`dev mode's Industries check: ${where}`, () => {
  it(
    "an untouched world equals its twin; before a passed raise starts only dues to fight it move; a raise in force moves restaurant pay and prices; an opening law shows against its absence (just like today: needs the state's real minimum wage law)",
    () => {
      dev.advance(days(20));
      const same = check();
      expect(same.changes, where).toEqual([]);
      expect(same.businessesMoved, `${where}: untouched`).toBe(0);
      expect(
        same.industries.every(
          (row) => JSON.stringify(row.here) === JSON.stringify(row.twin),
        ),
        where,
      ).toBe(true);

      // The state's groundwater limit, law at the opening: farms sell less with it than in the twin without it.
      const opening = industriesWithoutOpeningLaw(core, dev.marks(), twinDev, {
        series: GROUNDWATER,
        level: "state",
      });
      expect(opening.baseline, where).toMatchObject({
        kind: "opening-law",
        series: GROUNDWATER,
      });
      const farms = opening.industries.find((row) => row.kindId === "farm")!;
      expect(
        farms.here.salesMinor,
        `${where}: farm sales with the opening groundwater limit against the twin without it`,
      ).toBeLessThan(farms.twin.salesMinor);

      // A state bill raising the minimum wage, heard, passed and signed; its law starts on a later date.
      const body = dev
        .lawmakingBodies()
        .find((b) => b.level === "state" && /lower/.test(b.id))!;
      const wage = lawInForce(coreAPI(core), "minimum-wage").value!;
      const introduced = dev.introduce({
        bodyOfficeId: body.id,
        sponsorId: body.members[0]!.key,
        series: "minimum-wage",
        value: wage + 300,
      });
      const decided = dev.decideAt(
        introduced.bill.id,
        Math.max(3, Math.round(body.members.length * 0.9)),
        { sign: true, chairHears: true },
      );
      expect(decided.ending, where).toMatchObject({
        how: "law",
        by: "enacted",
      });
      const starts = dev.billOutcome(introduced.bill.id).laws[0]!.effectiveDate;
      dev.advance(days(10));
      expect(starts > core.date, `${where}: the law starts ${starts}`).toBe(
        true,
      );
      const billOnly = check();
      // The twin passed its own do-nothing bill at the same body the same day.
      expect(
        billOnly.baseline.restated.map((row) => row.lawId),
        where,
      ).toEqual([introduced.bill.id]);
      // Before the law starts, the bill itself is all that differs: the businesses it would cost
      // join a group to fight it and pay its dues (interest-groups.ts), so only their cash moves.
      expect(
        billOnly.businesses.every(
          (row) =>
            row.here !== null &&
            row.twin !== null &&
            row.here.staff === row.twin.staff &&
            row.here.salesMinor === row.twin.salesMinor &&
            row.here.wagesPaidMinor === row.twin.wagesPaidMinor &&
            row.here.cashMinor < row.twin.cashMinor,
        ),
        `${where}: before the law starts, only the cash of businesses fighting the bill moves`,
      ).toBe(true);

      // Dev mode sets a $3 raise in force today, with no bill: the twin restates the wage in force.
      dev.setLaw({ level: "state", series: "minimum-wage", value: wage + 300 });
      dev.advance(days(30));
      const raised = check();
      expect(raised.baseline.restated.length, where).toBe(2);
      const restaurants = raised.industries.find(
        (row) => row.kindId === "restaurant",
      )!;
      expect(restaurants.name, where).toBe("Food services and drinking places");
      expect(
        restaurants.here.wagesPaidMinor,
        `${where}: restaurant pay against the twin`,
      ).toBeGreaterThan(restaurants.twin.wagesPaidMinor);
      expect(
        restaurants.here.priceIndex,
        `${where}: restaurant prices against the twin`,
      ).toBeGreaterThan(restaurants.twin.priceIndex);
      expect(raised.businessesMoved, where).toBeGreaterThan(0);
      expect(
        raised.businesses.every((row) => row.name !== ""),
        `${where}: every business is named`,
      ).toBe(true);
      process.stderr.write(
        `${where}: checks took ${same.twinMs}, ${billOnly.twinMs}, ${raised.twinMs} and ${opening.twinMs} ms; ${raised.businessesMoved} businesses moved; farm sales ${farms.here.salesMinor} against ${farms.twin.salesMinor}\n`,
      );
    },
    LIMIT_MS,
  );
});
