import { describe, it } from "vitest";
import { assertTownFloorTwoLawCatchup } from "../fixtures/town-minimum-wage-parity";

describe(
  "a state minimum-wage law raises town paychecks on its effective date",
  { timeout: 600_000 },
  () => {
    it(
      "a game that skips past two laws records each raise and pays each period at its own rate",
      assertTownFloorTwoLawCatchup,
    );
  },
);
