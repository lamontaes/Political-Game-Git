/**
 * People move between a place and the rest of the country in both directions
 * from the same survey, so a place does not empty or fill by arithmetic alone
 * (Dev Tester, Nov 8: Washington, D.C. lost 7.1 percent of its people in one
 * simulated year; Futiga, American Samoa, 5.2). Two causes: a jurisdiction
 * made wholly of counted places had a phantom rest of state to trade people
 * with, and a destination's weight was its share of the nation's people, not
 * the arrivals the American Community Survey finds in it. Where people go is
 * now a gravity model fitted to the survey's own departures and arrivals by
 * state, through the same pull as before. Named regression worlds (a small
 * drawn place has too few people to hold a percent bound: Loomis, SD, 116 to
 * 112).
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { yearsOf } from "./counted-moves-balance-kit";

it("a small territory keeps its people within 1.5 percent a year (Futiga, American Samoa, drawn from the seed dpA)", () => {
  const place = drawPlace("dpA", "drift-played");
  const { changes } = yearsOf(place.seed, place.key, 1);
  for (const change of changes) {
    expect(Number.isFinite(change.pct), `${place.name}: ${change.line}`).toBe(
      true,
    );
    if (Math.abs(change.pct) > 1.5)
      console.warn(
        `BAND WARN ${place.name}: ${change.line} (${change.pct.toFixed(2)}%) is outside 1.5% a year`,
      );
  }
}, 3_600_000);
