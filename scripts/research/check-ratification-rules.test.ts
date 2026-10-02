import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  RATIFICATION_RULES,
  checkRatificationRules,
} from "./check-ratification-rules";

interface Chamber {
  readonly chamber: string;
  readonly threshold: {
    readonly basis: string;
    readonly fraction: string;
    readonly strictlyGreater: boolean;
  };
  readonly ruleKind: string;
}
interface Row {
  readonly stateKey: string;
  readonly chambers: readonly Chamber[];
  readonly conditions?: readonly { readonly kind: string }[];
}

const data = JSON.parse(readFileSync(RATIFICATION_RULES, "utf8")) as {
  readonly rows: readonly Row[];
};
const row = (key: string): Row => {
  const found = data.rows.find((candidate) => candidate.stateKey === key);
  if (!found) throw new Error(`no row for ${key}`);
  return found;
};
const chamber = (key: string, name: string): Chamber => {
  const found = row(key).chambers.find(
    (candidate) => candidate.chamber === name,
  );
  if (!found) throw new Error(`no ${name} for ${key}`);
  return found;
};

describe("federal amendment ratification rules", () => {
  it("passes its own shape check: 50 states, the right chambers, a citation behind every chamber", () => {
    expect(checkRatificationRules(data)).toEqual([]);
  });

  it("records the states whose chambers need more than a majority", () => {
    expect(chamber("US-IL", "house").threshold).toMatchObject({
      basis: "elected",
      fraction: "3/5",
      strictlyGreater: false,
    });
    expect(chamber("US-IL", "senate").threshold.fraction).toBe("3/5");
    expect(chamber("US-AL", "house").threshold.fraction).toBe("3/5");
    expect(chamber("US-AL", "senate").threshold.fraction).toBe("1/2");
    expect(chamber("US-CO", "house").threshold.fraction).toBe("2/3");
    expect(chamber("US-CO", "senate").threshold.fraction).toBe("1/2");
  });

  it("applies a majority in Delaware, which dropped its two-thirds statute", () => {
    expect(chamber("US-DE", "house").threshold).toMatchObject({
      basis: "elected",
      fraction: "1/2",
    });
  });

  it("holds Kansas's stated two-thirds as on the books, not applied", () => {
    expect(chamber("US-KS", "house").ruleKind).toBe(
      "ratification-specific-unenforced",
    );
    expect(chamber("US-KS", "house").threshold.fraction).toBe("1/2");
  });

  it("keeps the intervening-election clauses as conditions", () => {
    for (const key of ["US-FL", "US-IL", "US-TN"])
      expect(row(key).conditions?.map((entry) => entry.kind)).toContain(
        "intervening-election",
      );
  });

  it("catches a file with a state missing", () => {
    expect(
      checkRatificationRules({ rows: data.rows.slice(1), nonRatifying: [] }),
    ).toContain("US-AK: no row");
  });
});
