import { describe, expect, it } from "vitest";

import {
  describePolicyLoad,
  loadPolicyPacks,
  qualifiedPolicyKey,
  type PolicyPack,
} from "./policy-packs";
import { POLICY_PACKS, loadedPolicyRegistry } from "./policy-pack-registry";
import { createProductionPolicyCatalog } from "./production-catalog";

const AUTHORED = {
  kind: "authored-fiction",
  note: "Invented for a test; claims nothing about anywhere real.",
} as const;

function pack(overrides: Partial<PolicyPack> & { pack: string }): PolicyPack {
  return { provenance: AUTHORED, ...overrides };
}

describe("what a build ships with", () => {
  const registry = loadedPolicyRegistry();
  const catalog = createProductionPolicyCatalog();

  it("loads the American state and local vocabulary, so a world has something to legislate about", () => {
    expect(POLICY_PACKS.map((entry) => entry.pack)).toEqual([
      "us-state-and-local",
    ]);
    expect(catalog.domainOrder.length).toBe(13);
    expect(catalog.issueOrder.length).toBeGreaterThan(100);
    expect(registry.report.rejections).toEqual([]);
  });

  it("ships no propositions, subjects or principles, because nothing decides those yet", () => {
    expect(catalog.propositionOrder).toEqual([]);
    expect(catalog.subjectOrder).toEqual([]);
    expect(catalog.principleOrder).toEqual([]);
  });

  it("leaves no domain without a question in it", () => {
    const domainsWithIssues = new Set(
      registry.issues.map((issue) => issue.domainId),
    );
    for (const domain of registry.domains) {
      expect(domainsWithIssues.has(domain.id)).toBe(true);
    }
    // Every issue is reported unused, because this pack ships no
    // propositions. No domain is, which is the part that would be a defect.
    const unused = new Set(registry.report.packs[0]?.registeredButUnused ?? []);
    for (const domain of registry.domains) {
      expect(unused.has(domain.stableKey)).toBe(false);
    }
  });

  it("says which level decides a question, and says nothing where no source did", () => {
    const jails = registry.issues.find(
      (issue) =>
        issue.stableKey === "us-state-and-local:justice-public-safety.jails",
    );
    expect(jails?.levels).toEqual(["county"]);
    const prisons = registry.issues.find(
      (issue) =>
        issue.stableKey ===
        "us-state-and-local:justice-public-safety.corrections-and-prisons",
    );
    expect(prisons?.levels).toEqual(["state"]);
    const zoning = registry.issues.find(
      (issue) =>
        issue.stableKey === "us-state-and-local:housing-land-use.zoning",
    );
    expect(zoning?.levels).toEqual(["county", "municipality"]);
  });

  it("claims no frequency, because no source measures attention across the three levels", () => {
    const text =
      JSON.stringify(registry.issues) + JSON.stringify(registry.domains);
    expect(text).not.toMatch(/\d+%/);
  });

  it("omits the level entirely where a pack routed nothing, so older bytes stay true", () => {
    const unrouted = loadPolicyPacks([
      pack({
        pack: "unrouted",
        domains: [{ key: "d", name: "D", description: "A domain." }],
        issues: [
          { key: "i", domain: "d", name: "I", description: "A question." },
        ],
      }),
    ]);
    const issue = unrouted.issues[0];
    expect(issue).toBeDefined();
    expect("levels" in (issue as object)).toBe(false);
    expect(JSON.stringify(issue)).not.toContain("levels");
  });

  it("says what it loaded rather than saying nothing", () => {
    expect(describePolicyLoad(registry.report)).toContain("us-state-and-local");
  });
});

describe("a pack that loads", () => {
  const registry = loadPolicyPacks([
    pack({
      pack: "civics",
      domains: [
        {
          key: "transport",
          name: "Transport",
          description: "How people move.",
        },
      ],
      issues: [
        {
          key: "rural-transit",
          domain: "transport",
          name: "Rural transit",
          description: "Service where density does not pay for it.",
        },
      ],
      propositions: [
        {
          key: "fund-rural-transit",
          issue: "rural-transit",
          name: "Fund rural transit",
          question: "Should the state pay for bus service where fares cannot?",
        },
      ],
      principles: [
        { key: "thrift", name: "Thrift", description: "Spend little." },
      ],
      subjects: [
        {
          key: "transit-funding",
          name: "How transit is paid for",
          description: "Where the money comes from.",
          scope: "issue",
          about: "rural-transit",
        },
        {
          key: "procedure",
          name: "Parliamentary procedure",
          description: "How a chamber does business.",
          scope: "technical",
        },
      ],
    }),
  ]);

  it("registers every row under the pack's own namespace", () => {
    expect(registry.domains.map((d) => d.stableKey)).toEqual([
      qualifiedPolicyKey("civics", "transport"),
    ]);
    expect(registry.propositions.map((p) => p.stableKey)).toEqual([
      qualifiedPolicyKey("civics", "fund-rural-transit"),
    ]);
    expect(registry.report.rejections).toEqual([]);
  });

  it("resolves a reference to a real id rather than leaving a key behind", () => {
    const domain = registry.domains[0]!;
    expect(registry.issues[0]!.domainId).toBe(domain.id);
    expect(registry.propositions[0]!.issueId).toBe(registry.issues[0]!.id);
  });

  it("points a scoped subject at what it is about, and a technical one at nothing", () => {
    const scoped = registry.subjects.find((s) => s.scope === "issue");
    const technical = registry.subjects.find((s) => s.scope === "technical");
    expect(scoped?.referenceId).toBe(registry.issues[0]!.id);
    expect(technical?.referenceId).toBeNull();
  });
});

describe("a row that does not resolve is named, not swallowed", () => {
  it("rejects an issue whose domain no pack declares, and loads the rest", () => {
    const registry = loadPolicyPacks([
      pack({
        pack: "civics",
        domains: [{ key: "transport", name: "Transport", description: "d" }],
        issues: [
          {
            key: "orphan",
            domain: "housing",
            name: "Orphan",
            description: "d",
          },
          { key: "kept", domain: "transport", name: "Kept", description: "d" },
        ],
      }),
    ]);
    expect(registry.issues.map((i) => i.name)).toEqual(["Kept"]);
    const rejection = registry.report.rejections[0];
    expect(rejection?.where).toBe('issue "orphan"');
    expect(rejection?.reason).toContain("civics:housing");
  });

  it("rejects a proposition that asks nothing", () => {
    const registry = loadPolicyPacks([
      pack({
        pack: "civics",
        domains: [{ key: "d", name: "D", description: "d" }],
        issues: [{ key: "i", domain: "d", name: "I", description: "d" }],
        propositions: [{ key: "p", issue: "i", name: "P", question: "  " }],
      }),
    ]);
    expect(registry.propositions).toEqual([]);
    expect(registry.report.rejections[0]?.reason).toContain("asks no question");
  });

  it("rejects a technical subject that claims to be about something", () => {
    const registry = loadPolicyPacks([
      pack({
        pack: "civics",
        domains: [{ key: "d", name: "D", description: "d" }],
        subjects: [
          {
            key: "s",
            name: "S",
            description: "d",
            scope: "technical",
            about: "d",
          },
        ],
      }),
    ]);
    expect(registry.subjects).toEqual([]);
    expect(registry.report.rejections[0]?.reason).toContain(
      "refers to nothing",
    );
  });

  it("rejects a key carrying a colon, which would forge another pack's namespace", () => {
    const registry = loadPolicyPacks([
      pack({
        pack: "civics",
        domains: [{ key: "other:transport", name: "T", description: "d" }],
      }),
    ]);
    expect(registry.domains).toEqual([]);
    expect(registry.report.rejections[0]?.reason).toContain("contains a colon");
  });
});

describe("provenance", () => {
  it("refuses a pack that claims sources and names none, and loads none of its rows", () => {
    const registry = loadPolicyPacks([
      {
        pack: "unsourced",
        provenance: { kind: "sourced", sources: [], note: "Trust me." },
        domains: [{ key: "d", name: "D", description: "d" }],
      },
    ]);
    expect(registry.domains).toEqual([]);
    expect(registry.report.rejections[0]?.reason).toContain("names no source");
  });

  it("carries the kind into the report, so a save's content can be accounted for", () => {
    const registry = loadPolicyPacks([
      {
        pack: "read",
        provenance: {
          kind: "sourced",
          sources: ["KRS Chapter 174"],
          note: "Read from the statute.",
        },
        domains: [{ key: "d", name: "D", description: "d" }],
      },
    ]);
    expect(registry.report.packs[0]?.provenance).toBe("sourced");
  });
});

describe("what registered and reached nobody", () => {
  it("names a domain with no issue and an issue with no proposition", () => {
    const registry = loadPolicyPacks([
      pack({
        pack: "civics",
        domains: [
          { key: "empty", name: "Empty", description: "d" },
          { key: "used", name: "Used", description: "d" },
        ],
        issues: [
          { key: "quiet", domain: "used", name: "Quiet", description: "d" },
        ],
      }),
    ]);
    expect(registry.report.packs[0]?.registeredButUnused).toEqual([
      qualifiedPolicyKey("civics", "empty"),
      qualifiedPolicyKey("civics", "quiet"),
    ]);
    expect(describePolicyLoad(registry.report)).toContain(
      "nothing sits under it",
    );
  });
});

describe("one pack extending another", () => {
  it("lets a later pack put an issue in an earlier pack's domain", () => {
    const registry = loadPolicyPacks([
      pack({
        pack: "base",
        domains: [{ key: "transport", name: "Transport", description: "d" }],
      }),
      pack({
        pack: "extra",
        issues: [
          {
            key: "ferries",
            domain: "base:transport",
            name: "Ferries",
            description: "d",
          },
        ],
      }),
    ]);
    expect(registry.report.rejections).toEqual([]);
    expect(registry.issues[0]!.domainId).toBe(registry.domains[0]!.id);
  });

  it("rejects a reference that reaches forward rather than loading it anyway", () => {
    const registry = loadPolicyPacks([
      pack({
        pack: "extra",
        issues: [
          {
            key: "ferries",
            domain: "base:transport",
            name: "F",
            description: "d",
          },
        ],
      }),
      pack({
        pack: "base",
        domains: [{ key: "transport", name: "Transport", description: "d" }],
      }),
    ]);
    expect(registry.issues).toEqual([]);
    expect(registry.report.rejections[0]?.reason).toContain(
      "no pack loaded before it declares",
    );
  });

  it("throws only for this build's own mistake: two packs with one name", () => {
    expect(() =>
      loadPolicyPacks([pack({ pack: "same" }), pack({ pack: "same" })]),
    ).toThrow(/Two policy packs claim the name/);
  });
});
