import { describe, it } from "vitest";
import {
  allPlaces,
  assertPlayerTownPayroll,
  type PlayerTownPayrollCase,
} from "../fixtures/player-town-payroll-parity";

describe.each(allPlaces().filter((_, index) => index % 4 === 0))(
  "one payroll for a played worker in $state ($seed)",
  (place: PlayerTownPayrollCase) => {
    it(
      "matches the NPC's gross, tax rows, net and employer cash and survives reopening",
      () => assertPlayerTownPayroll(place),
      120_000,
    );
  },
);
