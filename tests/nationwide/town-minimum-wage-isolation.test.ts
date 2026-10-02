import { describe, it } from "vitest";
import { assertTownFloorJurisdictionIsolation } from "../fixtures/town-minimum-wage-parity";

describe(
  "a state minimum-wage law raises town paychecks on its effective date",
  { timeout: 600_000 },
  () => {
    it(
      "reaches Nebraska alone: every other state, D.C. and territory keeps its own rate",
      assertTownFloorJurisdictionIsolation,
    );
  },
);
