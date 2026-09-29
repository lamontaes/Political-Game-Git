import { describe, expect, it } from "vitest";

import { knownValueOrNull } from "../legislature-rules";
import {
  KENTUCKY_EXECUTIVE_PACK,
  NEBRASKA_EXECUTIVE_PACK,
  US_FEDERAL_EXECUTIVE_PACK,
} from "../executive-authority-rule-packs";
import {
  clemencyAuthorityFor,
  clemencyGateFor,
  clemencyModelOf,
  clemencyTable,
  clemencyTableProblems,
  EXECUTIVE_BODY,
} from "./clemency-rules";

const STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const noCrime = { committedAt: "2027-03-01", priorFelonyConvictions: 0 };

describe("who must agree before clemency is granted", () => {
  it("has one row for every state, D.C., the five territories and the United States", () => {
    const keys = clemencyTable().rows.map((row) => row.jurisdictionKey);
    for (const state of STATES) expect(keys).toContain(`US-${state}`);
    for (const other of [
      "US-DC",
      "US-PR",
      "US-GU",
      "US-VI",
      "US-AS",
      "US-MP",
      "US",
    ])
      expect(keys).toContain(other);
    expect(keys).toHaveLength(57);
    expect(clemencyTableProblems(clemencyTable())).toEqual([]);
  });

  it("refuses a table that names a body nobody defined", () => {
    const row = clemencyTable().rows[0]!;
    const broken = {
      rows: [{ ...row, gates: [{ ...row.gates[0]!, mustAgree: ["ghost"] }] }],
    };
    expect(clemencyTableProblems(broken).join(" ")).toContain("names ghost");
  });

  it("records the real gate: the board's yes first where the law needs it", () => {
    for (const key of ["US-TX", "US-PA", "US-OK", "US-LA", "US-DE"])
      expect(
        clemencyGateFor(clemencyAuthorityFor(key)!, noCrime)!.mustAgree,
      ).toEqual(["board", EXECUTIVE_BODY]);
    for (const key of ["US-AL", "US-CT", "US-GA", "US-ID", "US-SC", "US-UT"])
      expect(
        clemencyGateFor(clemencyAuthorityFor(key)!, noCrime)!.mustAgree,
      ).toEqual(["board"]);
  });

  it("needs a council, the senate or cabinet members in the four consent-body states", () => {
    for (const [key, body] of [
      ["US-FL", "cabinet"],
      ["US-MA", "council"],
      ["US-NH", "council"],
      ["US-RI", "senate"],
    ] as const) {
      const gate = clemencyGateFor(clemencyAuthorityFor(key)!, noCrime)!;
      expect(gate.mustAgree).toEqual([EXECUTIVE_BODY, body]);
      expect(clemencyModelOf(gate)).toBe("consent-body");
    }
  });

  it("dates Arizona's board veto to felonies committed before 1994", () => {
    const arizona = clemencyAuthorityFor("US-AZ")!;
    expect(
      clemencyGateFor(arizona, {
        committedAt: "1993-06-01",
        priorFelonyConvictions: 0,
      })!.mustAgree,
    ).toEqual(["board", EXECUTIVE_BODY]);
    const later = clemencyGateFor(arizona, noCrime)!;
    expect(later.mustAgree).toEqual([EXECUTIVE_BODY]);
    expect(later.advisory?.body).toBe("board");
    // An offense with no date matches neither gate rather than guessing.
    expect(
      clemencyGateFor(arizona, {
        committedAt: null,
        priorFelonyConvictions: 0,
      }),
    ).toBeNull();
  });

  it("sends a twice-convicted felon's California request to the state supreme court", () => {
    const california = clemencyAuthorityFor("US-CA")!;
    expect(
      clemencyGateFor(california, { ...noCrime, priorFelonyConvictions: 2 })!
        .mustAgree,
    ).toEqual(["court", EXECUTIVE_BODY]);
    expect(clemencyGateFor(california, noCrime)!.mustAgree).toEqual([
      EXECUTIVE_BODY,
    ]);
  });

  it("puts the governor inside the board in Minnesota, where the majority must include them", () => {
    const board = clemencyAuthorityFor("US-MN")!.bodies.find(
      (body) => body.key === "board",
    )!;
    expect(board.includesExecutive).toBe(true);
    expect(board.vote).toBe("majority-including-executive");
  });

  it("agrees with the accepted executive packs where they settle a model", () => {
    for (const [key, pack] of [
      ["US-KY", KENTUCKY_EXECUTIVE_PACK],
      ["US-NE", NEBRASKA_EXECUTIVE_PACK],
      ["US", US_FEDERAL_EXECUTIVE_PACK],
    ] as const) {
      const gate = clemencyGateFor(clemencyAuthorityFor(key)!, noCrime)!;
      expect(clemencyModelOf(gate)).toBe(knownValueOrNull(pack.clemency.model));
    }
  });

  it("starts an unread referral rule from the approved default, and says so", () => {
    const estimated = clemencyTable().rows.filter((row) =>
      row.gates.some(
        (gate) => gate.advisory?.referralBasis === "estimated-from-common-rule",
      ),
    );
    expect(estimated.length).toBeGreaterThan(0);
    for (const row of estimated) {
      // Research 4's default, approved by Claude CTO on September 28, 2026:
      // the governor refers the request and the board's advice does not bind.
      expect(row.gates[0]!.advisory!.referral).toBe("required");
      expect(
        row.notes.some((note) => note.startsWith("ESTIMATED FROM COMMON RULE")),
      ).toBe(true);
    }
    const broken = {
      rows: [
        {
          ...estimated[0]!,
          notes: [],
        },
      ],
    };
    expect(clemencyTableProblems(broken).join(" ")).toContain(
      "estimated without saying from what",
    );
  });

  it("reads Research 4's corrections: North Dakota, Nevada, Kansas and Arizona", () => {
    const northDakota = clemencyGateFor(
      clemencyAuthorityFor("US-ND")!,
      noCrime,
    )!;
    expect(northDakota.mustAgree).toEqual([EXECUTIVE_BODY]);
    expect(northDakota.advisory?.referral).toBe("optional");
    expect(clemencyModelOf(northDakota)).toBe("executive-sole");
    const nevada = clemencyAuthorityFor("US-NV")!.bodies[0]!;
    expect(nevada.vote).toBe("majority");
    const kansas = clemencyGateFor(clemencyAuthorityFor("US-KS")!, noCrime)!;
    expect(kansas.advisory).toMatchObject({
      referral: "required",
      referralBasis: "read",
      reportWithinDays: 120,
    });
    const arizona = clemencyGateFor(clemencyAuthorityFor("US-AZ")!, noCrime)!;
    expect(arizona.unansweredRecommendationTakesEffect).toEqual({
      afterDays: 90,
      kinds: ["commutation"],
      unanimous: true,
    });
  });
});
