import { describe, expect, it } from "vitest";
import {
  accountIndex,
  lineMoney,
  ownPayments,
  type Posting,
  type Reached,
} from "./own-payments";

const reached = (id: string, since = "2025-01-02"): Reached => ({
  targetId: id,
  row: `applied|minimum-wage|${id}`,
  amountMinor: 0,
  since,
});
const accountOf = (id: string) => `cash:${id}:residual`;
const world = (postings: Record<string, Posting[]>) =>
  new Map(Object.entries(postings).map(([id, p]) => [accountOf(id), p]));
const none = () => [] as string[];

describe("a law's own payments", () => {
  it("names the paycheck a raise made larger than the control world's", () => {
    const own = ownPayments(
      none,
      [reached("person_a")],
      world({
        person_a: [
          ["2025-01-10", "work-payroll", 1_100, "journal:2025-01-10:7"],
          ["2025-01-12", "purchase", -400, "journal:2025-01-12:9"],
        ],
      }),
      world({
        person_a: [
          ["2025-01-10", "work-payroll", 1_000, "journal:2025-01-10:7"],
          ["2025-01-12", "purchase", -300, "journal:2025-01-12:9"],
        ],
      }),
      false,
      "2025-01-02",
    );
    expect(own.paid).toBe(1);
    expect(own.sample[0]).toMatchObject({
      target: "person_a",
      kind: "work-payroll",
      way: "in",
      treatment: 1_100,
      control: 1_000,
      journal: "journal:2025-01-10:7",
    });
  });

  it("takes the kind and direction most targets share as the law's payment", () => {
    // Three raised workers; one of them also spends differently. The paycheck
    // all three got is the law's, not the one worker's purchase.
    const paycheck = (amount: number): Posting[] => [
      ["2025-01-10", "work-payroll", amount, "journal:2025-01-10:1"],
    ];
    const own = ownPayments(
      none,
      ["person_a", "person_b", "person_c"].map((id) => reached(id)),
      world({
        person_a: [
          ["2025-01-05", "purchase", -100, "journal:2025-01-05:2"],
          ...paycheck(1_100),
        ],
        person_b: paycheck(1_100),
        person_c: paycheck(1_100),
      }),
      world({
        person_a: [
          ["2025-01-05", "purchase", -300, "journal:2025-01-05:2"],
          ...paycheck(1_000),
        ],
        person_b: paycheck(1_000),
        person_c: paycheck(1_000),
      }),
      false,
      "2025-01-02",
    );
    expect(own.paid).toBe(3);
    expect(own.sample.every((e) => e.kind === "work-payroll")).toBe(true);
    expect(own.pick).toBe("work-payroll|in");
    expect(own.pairs.map((p) => [p.kind, p.way, p.targets])).toEqual([
      ["work-payroll", "in", 3],
      ["purchase", "in", 1],
    ]);
  });

  it("does not count a difference long after the law reached the target", () => {
    // Two worlds of the same seed drift apart over months; that is not the law's money.
    const own = ownPayments(
      none,
      [reached("person_a")],
      world({
        person_a: [["2025-07-01", "interest", 120, "journal:2025-07-01:3"]],
      }),
      world({
        person_a: [["2025-07-01", "interest", 100, "journal:2025-07-01:3"]],
      }),
      false,
      "2025-01-02",
    );
    expect(own.paid).toBe(0);
  });

  it("ignores payments before the law changed", () => {
    const own = ownPayments(
      none,
      [reached("person_a")],
      world({
        person_a: [
          ["2025-01-01", "work-payroll", 1_100, "journal:2025-01-01:3"],
        ],
      }),
      world({
        person_a: [
          ["2025-01-01", "work-payroll", 1_000, "journal:2025-01-01:3"],
        ],
      }),
      false,
      "2025-01-02",
    );
    expect(own.paid).toBe(0);
  });

  it("takes the control world's payment when a repeal stopped it", () => {
    const own = ownPayments(
      none,
      [reached("person_a")],
      world({}),
      world({
        person_a: [
          ["2025-01-10", "leave-premium", -50, "journal:2025-01-10:8"],
        ],
      }),
      true,
      "2025-01-02",
    );
    expect(own.sample[0]).toMatchObject({
      kind: "leave-premium",
      way: "out",
      treatment: 0,
      control: -50,
      journal: "journal:2025-01-10:8",
    });
  });

  it("reads a named household's payments on its members' accounts", () => {
    const own = ownPayments(
      (id) => (id === "household_h" ? ["person_a"] : []),
      [reached("household_h")],
      world({
        person_a: [
          ["2025-01-06", "rent-assistance", 900, "journal:2025-01-06:4"],
        ],
      }),
      world({}),
      false,
      "2025-01-02",
    );
    expect(own.paid).toBe(1);
    expect(own.pick).toBe("rent-assistance|in");
  });

  it("does not credit a payment only one target of many got", () => {
    const targets = Array.from({ length: 40 }, (_, i) =>
      reached(`person_${i}`),
    );
    const own = ownPayments(
      none,
      targets,
      world({
        person_0: [["2025-01-10", "interest", 105, "journal:2025-01-10:5"]],
      }),
      world({
        person_0: [["2025-01-10", "interest", 100, "journal:2025-01-10:5"]],
      }),
      false,
      "2025-01-02",
    );
    expect(own.paid).toBe(0);
  });

  it("takes the paycheck that came first over the spending it allows", () => {
    // Four raised workers spend a little more from the 1st; three of their
    // paychecks came a week before. The paycheck came first: it is the law's.
    const ids = ["person_a", "person_b", "person_c", "person_d"];
    const treated: Record<string, Posting[]> = {};
    const control: Record<string, Posting[]> = {};
    for (const [i, id] of ids.entries()) {
      treated[id] = [["2025-02-01", "cost-of-living", -320, `journal:s${i}`]];
      control[id] = [["2025-02-01", "cost-of-living", -300, `journal:s${i}`]];
      if (i < 3) {
        treated[id].push([
          "2025-01-24",
          "work-payroll",
          1_100,
          `journal:p${i}`,
        ]);
        control[id].push([
          "2025-01-24",
          "work-payroll",
          1_000,
          `journal:p${i}`,
        ]);
      }
    }
    const own = ownPayments(
      none,
      ids.map((id) => reached(id)),
      world(treated),
      world(control),
      false,
      "2025-01-02",
    );
    expect(own.pick).toBe("work-payroll|in");
    expect(own.paid).toBe(3);
  });

  it("leaves out a payment made under another law", () => {
    // A raise lets three workers use more electricity before their raised
    // paycheck comes: the electricity standard's share of the bill is that
    // standard's payment. A payment under the raise itself still counts.
    const ids = ["person_a", "person_b", "person_c"];
    const bill = "accounts.transfer under clean-electricity-standard";
    const treated: Record<string, Posting[]> = {};
    const control: Record<string, Posting[]> = {};
    for (const [i, id] of ids.entries()) {
      treated[id] = [
        ["2025-01-05", bill, -495, `journal:e${i}`],
        [
          "2025-01-15",
          "work-payroll under minimum-wage",
          1_100,
          `journal:p${i}`,
        ],
      ];
      control[id] = [
        ["2025-01-05", bill, -487, `journal:e${i}`],
        [
          "2025-01-15",
          "work-payroll under minimum-wage",
          1_000,
          `journal:p${i}`,
        ],
      ];
    }
    const check = (key?: string) =>
      ownPayments(
        none,
        ids.map((id) => reached(id)),
        world(treated),
        world(control),
        false,
        "2025-01-02",
        key,
      );
    expect(check().pick).toBe(`${bill}|out`);
    const own = check("minimum-wage");
    expect(own.pick).toBe("work-payroll under minimum-wage|in");
    expect(own.paid).toBe(3);
    expect(own.pairs.map((p) => p.kind)).toEqual([
      "work-payroll under minimum-wage",
    ]);
  });

  it("looks for the law's payment among those its records say it paid", () => {
    // A right-to-work law reaches every employed person as a right, with no
    // money, and the union local as the dues it lost. The local's dues are the
    // law's payment, though three workers' spending drifted too.
    const workers = Array.from({ length: 30 }, (_, i) => `person_${i}`);
    const treated: Record<string, Posting[]> = {
      organization_local: [["2025-02-01", "dues", 48_052, "journal:d"]],
    };
    const control: Record<string, Posting[]> = {
      organization_local: [["2025-02-01", "dues", 48_141, "journal:d"]],
    };
    for (const id of workers.slice(0, 3)) {
      treated[id] = [["2025-03-01", "purchase", -310, `journal:${id}`]];
      control[id] = [["2025-03-01", "purchase", -300, `journal:${id}`]];
    }
    const local: Reached = {
      ...reached("organization_local"),
      amountMinor: -89,
    };
    const own = ownPayments(
      none,
      [...workers.map((id) => reached(id)), local],
      world(treated),
      world(control),
      false,
      "2025-01-02",
    );
    expect(own.among).toBe("paid");
    expect(own.targets).toBe(1);
    expect(own.pick).toBe("dues|out");
    expect(own.sample[0]).toMatchObject({
      target: "organization_local",
      treatment: 48_052,
      control: 48_141,
    });
  });

  it("takes the paycheck over the spending it allows when both reach as many", () => {
    // Every raised worker's household spends more the day after payday, and
    // spends more than the raise: the paycheck came first and is the law's.
    const ids = ["person_a", "person_b", "person_c"];
    const treated: Record<string, Posting[]> = {};
    const control: Record<string, Posting[]> = {};
    for (const [i, id] of ids.entries()) {
      treated[id] = [
        ["2025-01-31", "work-payroll", 1_100, `journal:p${i}`],
        ["2025-02-01", "cost-of-living", -1_500, `journal:s${i}`],
      ];
      control[id] = [
        ["2025-01-31", "work-payroll", 1_000, `journal:p${i}`],
        ["2025-02-01", "cost-of-living", -1_300, `journal:s${i}`],
      ];
    }
    const own = ownPayments(
      none,
      ids.map((id) => reached(id)),
      world(treated),
      world(control),
      false,
      "2025-01-02",
    );
    expect(own.pick).toBe("work-payroll|in");
    expect(own.paid).toBe(3);
  });

  it("reads the account of an owner whose id holds colons, as a treasury's", () => {
    // A town's treasury is `organization:treasury:place:2666300` and its cash
    // account `cash:organization:treasury:place:2666300:residual`: the owner
    // id sits between the kind and the account's name, and names the account.
    const treasury = "organization:treasury:place:2666300";
    const accounts = accountIndex(world({ [treasury]: [] }));
    expect(accounts.get(treasury)).toEqual([accountOf(treasury)]);
    const paid = (amount: number): Posting[] => [
      [
        "2025-02-01",
        "accounts.transfer @ src/core2/budgets-treasury.ts:1115",
        amount,
        "journal:2025-02-01:1923",
      ],
    ];
    const own = ownPayments(
      none,
      [{ ...reached(treasury), amountMinor: -10_000_000 }],
      world({ [treasury]: paid(-139_324) }),
      world({ [treasury]: paid(-99) }),
      false,
      "2025-01-02",
    );
    expect(own.paid).toBe(1);
    expect(own.sample[0]).toMatchObject({
      target: treasury,
      way: "out",
      treatment: -139_324,
      control: -99,
      journal: "journal:2025-02-01:1923",
    });
  });
});

describe("a budget line's own transfers", () => {
  const payment = (id: string, gross: number, journal: string) =>
    [id, { gross, ids: [journal] }] as const;
  const town = "place:2666300";
  const paid = new Map([
    // The line's workers and contractors, and the raise's own share of each,
    // paid through the town's outside market (the ids the treasury makes).
    payment(
      `treasury-wages:workers:${town}:budget-line:corrections:law-wiring-b12dcfab:2025-02-01`,
      139_225,
      "journal:2025-02-01:1923",
    ),
    payment(
      `treasury-wages:workers:${town}:budget-line:corrections:2025-02-01`,
      99,
      "journal:2025-02-01:1924",
    ),
    payment(
      `treasury-purchases:contractors:${town}:budget-line:corrections:2025-03-01`,
      117,
      "journal:2025-03-01:9382",
    ),
    payment(
      `treasury:${town}:budget-line:corrections:organization_382d8445c99fb630:2025-03-01`,
      1_000,
      "journal:2025-03-01:9380",
    ),
    // Another government's payment on the same line, another line of the
    // town's, and a line whose name only starts with this one's.
    payment(
      "treasury-wages:workers:US-MI:budget-line:corrections:2025-02-01",
      11_884_678_326,
      "journal:2025-02-01:1851",
    ),
    payment(
      `treasury-wages:workers:${town}:budget-line:highways:2025-02-01`,
      10_530,
      "journal:2025-02-01:1917",
    ),
    payment(
      `treasury-wages:workers:${town}:budget-line:correctionsAid:2025-02-01`,
      7,
      "journal:2025-02-01:1930",
    ),
  ]);

  it("sums the payments whose ids name the government and the line", () => {
    const got = lineMoney(paid, town, "corrections", null);
    expect(got.gross).toBe(139_225 + 99 + 117 + 1_000);
    expect(got.ids).toEqual([
      "journal:2025-02-01:1923",
      "journal:2025-02-01:1924",
      "journal:2025-03-01:9382",
    ]);
  });

  it("leaves out payments dated on or after the day a body in play changed the law", () => {
    const got = lineMoney(paid, town, "corrections", "2025-03-01");
    expect(got.gross).toBe(139_225 + 99);
  });

  it("shows nothing for a government that paid nothing on the line", () => {
    expect(lineMoney(paid, "county:26129", "corrections", null)).toEqual({
      gross: 0,
      ids: [],
    });
  });
});
