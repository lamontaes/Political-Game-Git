/** When money runs out, the record says what happened (sim stories, Oct 12, item 20). */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { CREDIT_MODULE } from "./modules/credit";
import { MACRO_MODULE, withCentralBank } from "./modules/macro";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import type { CoreInput, CoreState, PersonInput, Source } from "./types";

const start = "2026-10-01",
  place = "place:household-money";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Household money fixture only.",
};
const person = (
  id: string,
  householdId: string,
  liquidMinor: number,
  familyIds: string[],
): PersonInput => ({
  id,
  givenName: id,
  familyName: "Fixture",
  birthDate: id === "grandmother" ? "1950-01-01" : "1980-01-01",
  placeId: place,
  householdId,
  tier: "monthly",
  traits: {},
  liquidMinor,
  livingCostDailyMinor: 1_000,
  source: src,
  familyIds,
  knownIds: [],
});

function input(): CoreInput {
  // A father with nothing left and a son with $500 share one household's $800 grocery bill;
  // the grandmother lives on her own with savings.
  const people = [
    person("father", "household:home", 0, ["son", "grandmother"]),
    person("son", "household:home", 50_000, ["father", "grandmother"]),
    person("grandmother", "household:gran", 10_000_000, ["father", "son"]),
  ];
  return withCentralBank({
    seed: "household-money",
    startedAt: start,
    people,
    households: [
      {
        id: "household:home",
        placeId: place,
        memberIds: ["father", "son"],
        source: src,
      },
      {
        id: "household:gran",
        placeId: place,
        memberIds: ["grandmother"],
        source: src,
      },
    ],
    jobs: [],
    organizations: [
      {
        id: "organization:grocer",
        placeId: place,
        name: "Grocer",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
    ],
    finance: {
      contracts: [
        {
          id: "groceries:household:home",
          householdId: "household:home",
          payerIds: ["father", "son"],
          payeeId: "organization:grocer",
          kind: "household.food",
          amountMinor: 80_000,
          dueAt: "2026-10-15",
          periodMonths: 1,
          accruesArrears: false,
          source: src,
        },
      ],
      facilities: [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  });
}
const money = (core: CoreState) =>
  [...core.people.values()].reduce((n, row) => n + row.liquidMinor, 0) +
  [...core.organizations.values()].reduce((n, row) => n + row.liquidMinor, 0);

describe("a household that runs short", () => {
  it("records who paid its bills, what went unpaid, and the help its relatives gave", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [MACRO_MODULE, CREDIT_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core),
      total = money(core);
    // The grandmother and her son are close: they talk most weeks.
    const tie = core.relationships.get("father:grandmother")!;
    core.relationships.set(tie.id, {
      ...tie,
      level: 0.6,
      lastContactDate: "2026-10-28",
    });
    advanceCore(core, "2026-11-01");
    const month = api
      .moduleState("credit")
      .table("households")
      .get("household-month:household:home:2026-11-01")!;
    // The household pools its cash: the son's $500 paid the bill as far as it went.
    expect(month).toMatchObject({
      billsMinor: 80_000,
      paidMinor: 50_000,
      unpaidMinor: 30_000,
      paidByMemberMinor: { son: 50_000 },
      memberCashMinor: { father: 0, son: 0 },
    });
    // The grandmother covered the shortfall from her savings.
    expect(month.helpFromIds).toEqual(["grandmother"]);
    expect(Number(month.helpMinor)).toBeGreaterThan(0);
    expect(core.people.get("father")!.liquidMinor).toBe(month.helpMinor);
    expect(core.people.get("grandmother")!.liquidMinor).toBe(
      10_000_000 - Number(month.helpMinor),
    );
    expect(money(core)).toBe(total);
  });
});
