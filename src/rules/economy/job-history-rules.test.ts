import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { daysInLine as legacyDaysInLine } from "../../simulation/job-market";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { makeIsoDate } from "../../simulation/dates";
import { daysInJobLineFromFacts } from "./job-history-rules";

const date = makeIsoDate("2026-02-01");
const opening = { title: "Cashier", occupationClassification: "SOC-41" };

describe("job line experience rule", () => {
  it.each(lifePlaceStateIdentities())(
    "matches empty-history experience in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const { world } = smallWorld({
        place: jurisdictionKey,
        date,
        seed: `job-line-experience:${jurisdictionKey}`,
      });
      expect(daysInJobLineFromFacts([], opening)).toBe(
        legacyDaysInLine(world, "person:none", opening, date),
      );
    },
  );

  it("counts same-title or same-occupation work and skips other work", () => {
    expect(
      daysInJobLineFromFacts(
        [
          {
            isEmployment: true,
            title: "Cashier",
            occupationClassification: null,
            workedDays: 100,
          },
          {
            isEmployment: true,
            title: "Sales associate",
            occupationClassification: "SOC-41",
            workedDays: 50,
          },
          {
            isEmployment: true,
            title: "Cook",
            occupationClassification: "SOC-35",
            workedDays: 200,
          },
          {
            isEmployment: false,
            title: "Cashier",
            occupationClassification: "SOC-41",
            workedDays: 300,
          },
          {
            isEmployment: true,
            title: "Cashier",
            occupationClassification: "SOC-41",
            workedDays: -1,
          },
        ],
        opening,
      ),
    ).toBe(150);
  });
});
