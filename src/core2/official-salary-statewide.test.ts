/**
 * A statewide post the salary table has no figure for is still paid
 * (gov-unpaid-posts-officials-no-income): the territories list no attorney
 * general, secretary of state or treasurer, so those posts, and every other
 * statewide office, take 0.8 of the governor's pay as an estimate with its
 * spread. Checked in all 56 places, then in a played world in a place and seed
 * nobody chose, where every seated official in a post the table can price has
 * a pay row.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { corePlaceStateIdentities } from "./place-lookup";
import { coreAPI } from "./state";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import { OFFICIAL_PAY_MODULE_ID, officialSalary } from "./modules/official-pay";

const statewide = (stateKey: string, officeKind: string): OfficialRow =>
  ({
    id: `probe:${stateKey}:${officeKind}`,
    seatId: `seat:${stateKey}:${officeKind}`,
    body: `${stateKey}:${officeKind}`,
    bodyKind: "executive",
    officeKind,
    stateKey,
  }) as unknown as OfficialRow;

it("prices every statewide post in all 56 places", () => {
  const missing: string[] = [];
  for (const state of corePlaceStateIdentities())
    for (const officeKind of [
      "attorney-general",
      "secretary-of-state",
      "treasurer",
      "board-of-education",
    ]) {
      const salary = officialSalary(
        statewide(state.jurisdictionKey, officeKind),
      );
      if (!salary || salary.annualMinor <= 0)
        missing.push(`${state.jurisdictionKey} ${officeKind}`);
      else {
        expect(salary.citation.length).toBeGreaterThan(0);
        if (salary.tag === "ESTIMATED")
          expect(
            salary.spreadPct,
            `${state.jurisdictionKey} ${officeKind}`,
          ).toBeGreaterThan(0);
      }
    }
  expect(missing, "posts with no salary").toEqual([]);
  const governor = officialSalary(statewide("US-MP", "governor"))!;
  const attorneyGeneral = officialSalary(
    statewide("US-MP", "attorney-general"),
  )!;
  expect(attorneyGeneral.annualMinor).toBe(
    Math.round((governor.annualMinor / 100) * 0.8) * 100,
  );
  expect(attorneyGeneral.tag).toBe("ESTIMATED");
});

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "statewide-pay");

it(`every seated official is priced and has a pay row in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const pay = api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay");
  const seated = (
    api
      .moduleState(OFFICIALS_MODULE_ID)
      .table("officials")
      .rows() as unknown as OfficialRow[]
  ).filter((row) => row.ended === null && core.people.get(row.id)?.alive);
  expect(seated.length, where).toBeGreaterThan(0);
  const unpaid = seated
    .filter((row) => officialSalary(row) === null || !pay.get(row.id))
    .map((row) => `${row.id} (${row.officeKind})`);
  expect(
    unpaid,
    `${where}: seated officials with no salary or no pay row`,
  ).toEqual([]);
}, 300_000);
