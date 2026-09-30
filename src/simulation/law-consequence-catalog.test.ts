import { expect, it } from "vitest";
import { loadPolicyPacks } from "./policy-packs";
import { clonePolicyCatalog, createPolicyCatalog } from "./policy";
import type { LawConsequenceRow } from "./law-consequence-types";

it("retains mod consequence data through loader, factory, catalog and deep clone", () => {
  const row: LawConsequenceRow = {
    id: "mod-pay",
    kind: "pay",
    when: "payroll",
    who: { selector: "active-work-payflows", predicates: [] },
    what: "raise-hourly-floor",
    amount: { op: "term", key: "hourlyMinor", unit: "minor/hour" },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence: {
      sourceIds: ["fixture-law"],
      population: "workers",
      scope: "fixture",
      why: "test legal term",
      uncertainty: "exact",
    },
  };
  const registry = loadPolicyPacks([
    {
      pack: "fixture",
      provenance: { kind: "authored-fiction", note: "Test only" },
      domains: [{ key: "labor", name: "Labor" }],
      issues: [{ key: "wage", domain: "labor", name: "Wages" }],
      propositions: [
        {
          key: "floor",
          issue: "wage",
          name: "Floor",
          question: "Raise the floor?",
          consequences: [row],
        },
      ],
    },
  ]);
  expect(registry.report.rejections).toEqual([]);
  const catalog = createPolicyCatalog({ catalogVersion: "test", ...registry });
  const clone = clonePolicyCatalog(catalog);
  const original =
    catalog.propositions[catalog.propositionOrder[0]!]!.consequences![0]!;
  const copied =
    clone.propositions[clone.propositionOrder[0]!]!.consequences![0]!;
  expect(copied).toEqual(row);
  expect(copied).not.toBe(original);
  expect(copied.evidence.sourceIds).not.toBe(original.evidence.sourceIds);
  row.evidence.sourceIds.push("changed-input");
  expect(copied.evidence.sourceIds).toEqual(["fixture-law"]);
});
