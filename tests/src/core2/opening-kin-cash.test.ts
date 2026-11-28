/**
 * The relatives the opening places around the town open with cash (pool item
 * world-kin-households-open-with-no-cash). Pinned to Bastrop, Louisiana
 * (place 2204685, the seed home-price-paths draws from "c3"): before this,
 * every relative opened with $0, 21,798 of its 25,986 weighted households
 * outside the town. Each relatives' household with an adult now holds the
 * survey's median balance at one earner's pay of the town and its head's age,
 * times its own savings draw, shared among its adults, by the rule the
 * county's sampled households open by.
 *
 * Re-pinned Nov 16 (pool item counted-opening-savings-at-survey-median, the
 * Account lead's yes). Old premise: each relatives' household holds exactly
 * the survey's median balance. Every household now opens at that median times
 * its own savings draw (household-balance-draw.ts), fixed by the world's seed
 * and its id, so its cash is the median times its draw, to the cent.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { gameStartDate } from "../../../src/core2/game-start";
import { ageOnDate, makeIsoDate } from "../../../src/core2/kernel/dates";
import { OPENING_KIN } from "../../../src/core2/opening-kin";
import { parameter as p } from "../../../src/core2/parameters";
import { buildPopulation } from "../../../src/core2/population";
import { placeEarningsOf } from "../../../src/core2/residents";
import { householdOpeningCash } from "../../../src/core2/starting-cash";
import { householdBalanceDraw } from "../../../src/core2/household-balance-draw";

const PLACE = "2204685";

it("every relatives' household with an adult opens with the survey's balance at one earner's pay times its own draw", () => {
  const drawn = drawPlace("c3", "home-price-paths");
  const startedAt = gameStartDate();
  const opening = buildPopulation({
    seed: drawn.seed,
    startedAt,
    placeKey: PLACE,
  });
  const detail = `Bastrop LA (${PLACE}), world ${drawn.seed}`;
  const earnings = placeEarningsOf(PLACE, drawn.seed)!;
  expect(earnings, `${detail}: the town's earnings`).toBeGreaterThan(0);
  const households = new Map<string, typeof opening.people>();
  for (const person of opening.people) {
    if (person.tier !== OPENING_KIN.kinTier || !person.householdId) continue;
    households.set(person.householdId, [
      ...(households.get(person.householdId) ?? []),
      person,
    ]);
  }
  expect(households.size, `${detail}: relatives' households`).toBeGreaterThan(
    0,
  );
  let checked = 0;
  for (const [id, members] of households) {
    const adults = members.filter(
      (person) =>
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(startedAt)) >=
        p("votingAge"),
    );
    if (!adults.length) continue;
    const held = adults.reduce((n, person) => n + person.liquidMinor, 0);
    const opened = householdOpeningCash(
      earnings,
      0,
      adults.length,
      drawn.seed,
      householdBalanceDraw(drawn.seed, id),
      Math.max(
        ...adults.map((person) =>
          ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(startedAt)),
        ),
      ),
    ).reduce((n, cents) => n + cents, 0);
    expect(opened, `${detail}: ${id}`).toBeGreaterThan(0);
    expect(held, `${detail}: ${id}`).toBe(opened);
    checked += 1;
  }
  expect(checked, `${detail}: households with an adult`).toBeGreaterThan(0);
}, 30_000);
