import { afterEach, describe, expect, it, vi } from "vitest";
import itemVetoTable from "../../../data/research/legislative-procedure/item-veto.json" with { type: "json" };
import * as rulePacks from "../legislature-rule-packs";
import { unknownRule, type LegislativeRulePack } from "../legislature-rules";
import { STATES } from "../state-reference";
import { itemVetoPower } from "./item-veto";

const places = itemVetoTable.places;
const grant = rulePacks.KENTUCKY_RULE_PACK.executive.lineItemVeto;

/** A controlled pack admission, with no generated residents or elapsed days. */
function admittedPack(
  code: string,
  title: string,
  lineItemVeto: LegislativeRulePack["executive"]["lineItemVeto"],
): void {
  vi.spyOn(rulePacks, "rulePackById").mockReturnValue({
    ...rulePacks.KENTUCKY_RULE_PACK,
    jurisdictionKey: `US-${code}`,
    executive: {
      ...rulePacks.KENTUCKY_RULE_PACK.executive,
      titleLabel: title,
      lineItemVeto,
    },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("one sourced item-veto rule for every place", () => {
  it("has exactly one source row for all 56 place codes", () => {
    expect(places).toHaveLength(56);
    expect(places.map((row) => row.code).sort()).toEqual(
      Object.keys(STATES).sort(),
    );
    expect(places.every((row) => row.citation.trim().length > 0)).toBe(true);
  });

  it.each(places)("$code keeps its own grant and scope", (row) => {
    admittedPack(row.code, "Governor", grant);
    expect(itemVetoPower("fixture:admitted-item-veto")).toEqual(
      row.itemVeto === "yes"
        ? {
            reaches:
              row.scope === "any-bill" ? "any-bill" : "appropriation-bills",
            citation: row.citation,
          }
        : null,
    );
  });

  it("an unread grant uses only the executive named by its source row", () => {
    const sourced = places.find((row) => "sourcedExecutiveTitle" in row)!;
    expect(sourced).toBeDefined();
    if (typeof sourced.sourcedExecutiveTitle !== "string")
      throw new Error("The source row omitted its executive title.");
    admittedPack(
      sourced.code,
      sourced.sourcedExecutiveTitle,
      unknownRule("Controlled unread executive grant."),
    );
    expect(itemVetoPower("fixture:admitted-item-veto")).toEqual({
      reaches: "appropriation-bills",
      citation: sourced.citation,
    });
    admittedPack(
      sourced.code,
      "Different executive",
      unknownRule("Controlled unread executive grant."),
    );
    expect(itemVetoPower("fixture:admitted-item-veto")).toBeNull();
  });

  it.each(places)("$code preserves an explicit legal refusal", (row) => {
    if (grant.kind !== "known")
      throw new Error("The controlled grant must have a source.");
    admittedPack(
      row.code,
      typeof row.sourcedExecutiveTitle === "string"
        ? row.sourcedExecutiveTitle
        : "Governor",
      { ...grant, value: false },
    );
    expect(itemVetoPower("fixture:admitted-item-veto")).toBeNull();
  });
});
