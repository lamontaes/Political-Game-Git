/** Seam: a dated rate change reprices a recorded credit line from its effective date. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA, extendData } from "./data";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import type { CoreInput, Source } from "./types";

const date = "2021-01-01",
  placeId = "place:reprice-fixture",
  borrower = "organization:reprice-borrower",
  lender = "organization:reprice-lender",
  facilityId = "facility:reprice-line",
  rate = "fixtureRepriceOpeningRate";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation: "Explicit technical fixture terms; not an observed loan.",
  estimatedFrom: "Repricing seam fixture only.",
};
const data = extendData(DEFAULT_DATA, {
  parameters: {
    [rate]: {
      value: 0.05,
      tag: "SOURCED",
      citation: "The fixture line's own written opening rate.",
    },
  },
});
function opening(): CoreInput {
  return {
    seed: "reprice-fixture",
    startedAt: date,
    people: [],
    households: [],
    jobs: [],
    organizations: [borrower, lender].map((id) => ({
      id,
      name: id,
      placeId,
      kind: "employer",
      liquidMinor: 1_000_000,
      source,
    })),
    finance: {
      contracts: [],
      facilities: [
        {
          id: facilityId,
          borrowerId: borrower,
          lenderId: lender,
          limitMinor: 2_000_000,
          active: true,
          annualInterestParameter: rate,
          source,
        },
      ],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

describe("dated credit repricing", () => {
  it("bills interest at the old rate before the effective date and the new rate after", () => {
    const core = createCore(opening(), { data }),
      api = coreAPI(core),
      row = core.finance.facilities.get(facilityId)!;
    row.principalMinor = 1_000_000;
    core.date = "2021-01-16" as typeof core.date;
    api.repriceCreditFacility(facilityId, 0.1, { ...source, asOf: core.date });
    expect(row.annualInterestRate).toBe(0.1);
    expect(row.ratedAt).toBe("2021-01-16");
    expect(row.unbilledInterestMinor).toBeCloseTo(
      (1_000_000 * 15 * 0.05) / 365,
    );
    core.date = "2021-02-01" as typeof core.date;
    const before =
      core.organizations.get(borrower)!.liquidMinor +
      core.organizations.get(lender)!.liquidMinor;
    const receipt = api.settleFinanceContract(`finance-interest:${facilityId}`);
    const expected = (1_000_000 * (15 * 0.05 + 16 * 0.1)) / 365;
    expect(receipt.requestedMinor).toBe(Math.floor(expected));
    expect(
      core.organizations.get(borrower)!.liquidMinor +
        core.organizations.get(lender)!.liquidMinor,
    ).toBe(before);
  });
  it("rejects an unknown line or a negative rate", () => {
    const core = createCore(opening(), { data }),
      api = coreAPI(core);
    expect(() => api.repriceCreditFacility("missing", 0.1, source)).toThrow();
    expect(() =>
      api.repriceCreditFacility(facilityId, -p("one"), source),
    ).toThrow();
  });
});

describe("attaching a line to a business's books", () => {
  it("rejects a line that is not the firm's own or a firm with no books", () => {
    const core = createCore(opening(), { data }),
      api = coreAPI(core);
    expect(() => api.attachBusinessCredit(borrower, facilityId)).toThrow(
      /own active line/,
    );
    expect(() => api.attachBusinessCredit(lender, facilityId)).toThrow();
  });
});
