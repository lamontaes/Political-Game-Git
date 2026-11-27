import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { householdDailyCostMinor } from "./household-cost";
import { considerBribe } from "./modules/corruption";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { OFFICIAL_PAY_MODULE_ID } from "./modules/official-pay";
import { placeStateKey } from "./place-map";
import { coreAPI } from "./state";
import { townResidentsByCash } from "./resident-adults-test-kit";

// A named official has a household of their own (owner, Oct 16): a living
// cost from the Consumer Expenditure basket and a studio's rent, savings
// from the Survey of Consumer Finances at their pay, and a month of that
// cost leaves their account each payday. The bribe engine reads both.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "official-living");

it(`seated officials keep a household and spend it in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const serving = () =>
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[]
    ).filter((term) => term.status === "serving" && term.personId);
  const officials = serving().map((term) => core.people.get(term.personId!)!);
  expect(officials.length).toBeGreaterThan(0);
  for (const person of officials) {
    expect(person.livingCostDailyMinor, person.id).toBeGreaterThan(0);
    // An office with no salary on record (a territory's attorney general) has no pay to save from.
    if (person.jobId) expect(person.liquidMinor, person.id).toBeGreaterThan(0);
  }
  const sample = officials.find((p) => p.id.startsWith("official:"))!;
  const before = sample.livingCostDailyMinor;
  // What leaves the sample's account for living on the journal.
  let spent = 0;
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    if (entry.sourceRef.id.includes(`living:${sample.id}:`))
      for (const posting of entry.postings)
        if (posting.accountId.includes(sample.id) && posting.deltaMinor < 0)
          spent -= posting.deltaMinor;
    return post(entry);
  };
  const paidFrom =
    (
      api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay").get(sample.id) as
        { paidFrom?: string } | undefined
    )?.paidFrom ?? core.date;
  // Shelter is paid once (housing-shelter): a home the housing engine
  // charges for is paid there, and the rest of the living cost goes
  // outside, never below the everyday basket without a home.
  const home = [`lease:${sample.householdId}`, `mortgage:${sample.householdId}`]
    .map((id) => core.finance.contracts.get(id))
    .find((row) => row && !row.endedAt && row.amountMinor > 0);
  // The everyday basket without a home, for one person where they live.
  const basket = householdDailyCostMinor({
    seed: core.seed,
    stateKey: placeStateKey(sample.placeId),
    size: 1,
    rent: null,
    parameter: (key) => api.parameter(key),
  });
  const daily = home
    ? Math.max(
        basket,
        before -
          (home.amountMinor / home.periodMonths) *
            (api.parameter("monthsPerYear") / api.parameter("daysPerMeanYear")),
      )
    : before;
  // Two paydays: the 1st of February and of March.
  advanceCore(core, makeIsoDate("2025-03-02"));
  const days = (from: string, to: string) =>
    Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
  // Each payday spends the days it pays for: an official seated as the
  // world opens is paid from the 1st of the month (official-pay's paidFrom).
  const paidDays =
    days(paidFrom, "2025-02-01") + days("2025-02-01", "2025-03-01");
  expect(spent).toBe(
    Math.round(daily * days(paidFrom, "2025-02-01")) +
      Math.round(daily * days("2025-02-01", "2025-03-01")),
  );
  // Never below the everyday basket, whatever the home costs.
  expect(spent).toBeGreaterThanOrEqual(basket * paidDays);
  // A bribe offered to a seated official reads their cushion.
  const rich = townResidentsByCash(core, coreAPI(core))
    .filter((p) => p.alive && !p.id.startsWith("official:"))
    .slice(0, 12);
  let read: string | undefined;
  for (const offerer of rich) {
    for (const person of officials.slice(0, 12)) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: person.id,
        stakeMinor: 50_000_000,
        subjectId: `official-living:${offerer.id}:${person.id}`,
      });
      const need = record?.reasons.take?.need;
      if (need === undefined) continue;
      const month = person.livingCostDailyMinor * 30;
      expect(need, record!.id).toBeLessThan(
        record!.amountMinor / (month + 1) + 1,
      );
      read = `${record!.id} need ${need}`;
      break;
    }
    if (read) break;
  }
  console.log(
    `WIRED ${place.name} ${seed}: ${officials.length} officials, ${sample.id} spent ${spent} over ${days} days; bribe read: ${read ?? "no offer made"}`,
  );
}, 900_000);
