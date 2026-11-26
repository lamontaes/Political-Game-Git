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
import { OFFICES_MODULE_ID } from "./modules/offices";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import { OFFICIAL_PAY_MODULE_ID, officialSalary } from "./modules/official-pay";
import { placeStateKey } from "./place-map";
import { keepsWhy } from "./why-kept";

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
  // Federal officials and the player's own state are paid from the start;
  // another state's officials stay counted (no pay row) until the player
  // knows them or they are in focus (SG-GOV-outside-officials-counted).
  const own = placeStateKey(core.placeMetadata?.placeKey ?? "");
  const federal = (row: OfficialRow) =>
    row.stateKey === "US" ||
    [
      "president",
      "vice-president",
      "us-senate",
      "us-house",
      "cabinet-secretary",
    ].some((k) => row.officeKind === k || row.bodyKind === k);
  const paidFromStart = seated.filter(
    (row) => federal(row) || row.stateKey === own || keepsWhy(core, row.id),
  );
  expect(paidFromStart.length, where).toBeGreaterThan(0);
  const unpaid = paidFromStart
    .filter((row) => officialSalary(row) === null || !pay.get(row.id))
    .map((row) => `${row.id} (${row.officeKind})`);
  expect(
    unpaid,
    `${where}: seated officials who should be paid with no salary or no pay row`,
  ).toEqual([]);
  // Another state's officials nobody has opened keep no official row: their
  // serving terms name no person (other places keep only their results;
  // CTO, Nov 18), so they are counted, and no pay row is kept for them.
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const stateOf = (officeId: string) => {
    const jurisdiction = (
      offices.get(officeId) as unknown as { jurisdiction?: string } | undefined
    )?.jurisdiction;
    // A state's own offices sit on its key (US-AL); a town's or county's on its place.
    if (!jurisdiction) return null;
    if (/^US(-[A-Z]{2})?$/.test(jurisdiction)) return jurisdiction;
    return placeStateKey(jurisdiction);
  };
  const counted = (
    api.moduleState(OFFICES_MODULE_ID).table("terms").rows() as unknown as {
      id: string;
      officeId: string;
      status: string;
      personId?: string;
    }[]
  ).filter((term) => {
    if (term.status !== "serving" || term.personId) return false;
    const state = stateOf(term.officeId);
    return state !== null && state !== own && state !== "US";
  });
  expect(counted.length, `${where}: other states' officials`).toBeGreaterThan(
    0,
  );
  expect(
    counted
      .filter((term) => pay.get(`official:${term.id}`))
      .map((term) => term.id),
    `${where}: counted officials with a pay row`,
  ).toEqual([]);
  // One built before anyone knows them is counted all the same: no pay row.
  expect(
    seated
      .filter((row) => !paidFromStart.includes(row) && pay.get(row.id))
      .map((row) => row.id),
    `${where}: counted officials with a pay row`,
  ).toEqual([]);
}, 300_000);
