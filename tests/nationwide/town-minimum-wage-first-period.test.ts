import { describe, it } from "vitest";
import { assertFirstEligibleTownFloorPeriod } from "../fixtures/town-minimum-wage-parity";

describe(
  "a state minimum-wage law raises town paychecks on its effective date",
  { timeout: 600_000 },
  () => {
    it(
      "Nebraska raises the floor to $18.00 and every job paid below it is raised from its first pay period after",
      assertFirstEligibleTownFloorPeriod,
    );
  },
);
