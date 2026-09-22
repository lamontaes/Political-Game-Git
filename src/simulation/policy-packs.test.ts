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
      "us-policy-positions",
    ]);
    expect(catalog.domainOrder.length).toBe(13);
    expect(catalog.issueOrder.length).toBeGreaterThan(100);
    expect(registry.report.rejections).toEqual([]);
  });

  it("ships positions a person can hold, and still no knowledge subjects", () => {
    // Propositions are what a player can actually see. Every player-facing
    // reader of the catalog reads propositions — the political profile screen
    // and the journal — and none reads domains or issues, so a vocabulary
    // without these reaches nobody.
    expect(catalog.propositionOrder.length).toBeGreaterThan(50);
    for (const id of catalog.propositionOrder) {
      const proposition = catalog.propositions[id]!;
      // A position, put as a question a person can agree or disagree with.
      // Direction lives in the answer, not in the proposition.
      expect(proposition.question.endsWith("?")).toBe(true);
      expect(catalog.issues[proposition.issueId]).toBeDefined();
    }
    // Still nothing here, and the emptiness is the honest answer: no
    // knowledge subject has been established.
    expect(catalog.subjectOrder).toEqual([]);
  });

  it("gives every position the principles it engages", () => {
    // The relation is what lets a recorded conviction reach a question
    // nobody wrote it about. Without it the mapping from what a person
    // believes to what they think of a bill is invented at the point of
    // use, and inside a save that is indistinguishable from a grounded one.
    expect(catalog.principleOrder.length).toBe(14);
    for (const id of catalog.propositionOrder) {
      const proposition = catalog.propositions[id]!;
      const bearings = proposition.principles ?? [];
      expect(bearings.length).toBeGreaterThan(0);
      const named = new Set<string>();
      for (const bearing of bearings) {
        expect(catalog.principles[bearing.principleId]).toBeDefined();
        // The same principle twice on one question would be a contradiction
        // or a duplicate, and neither is authoring anyone meant.
        expect(named.has(bearing.principleId)).toBe(false);
        named.add(bearing.principleId);
      }
    }
  });

  it("engages every principle from more than one domain", () => {
    // A principle only ever raised by one question is that question restated,
    // and tells a reader nothing the question did not. This is the assertion
    // that keeps the vocabulary general as positions are added.
    const domainsPerPrinciple = new Map<string, Set<string>>();
    for (const id of catalog.propositionOrder) {
      const proposition = catalog.propositions[id]!;
      const domainId = catalog.issues[proposition.issueId]!.domainId;
      for (const bearing of proposition.principles ?? []) {
        const seen = domainsPerPrinciple.get(bearing.principleId) ?? new Set();
        seen.add(domainId);
        domainsPerPrinciple.set(bearing.principleId, seen);
      }
    }
    for (const principleId of catalog.principleOrder) {
      expect(domainsPerPrinciple.get(principleId)?.size ?? 0).toBeGreaterThan(
        1,
      );
    }
  });

  it("cuts both ways on every principle", () => {
    // A principle that only ever appears as `consistent-with` is not a
    // principle, it is an agree-with-everything dial: holding it could never
    // move a character to disagree with anything the game ships. Found by
    // counting rather than by reading — environmental-stewardship,
    // equal-opportunity and transparency were all one-sided on the first
    // authoring pass, and nothing in the set's design would have shown it.
    //
    // It also makes `conflicted` reachable. A person holding two principles
    // that a question engages in opposite directions is the case worth
    // representing, and it cannot arise if every principle points one way.
    const sides = new Map<string, Set<string>>();
    for (const id of catalog.propositionOrder) {
      for (const bearing of catalog.propositions[id]!.principles ?? []) {
        const seen = sides.get(bearing.principleId) ?? new Set<string>();
        seen.add(bearing.bearing);
        sides.set(bearing.principleId, seen);
      }
    }
    for (const principleId of catalog.principleOrder) {
      const principle = catalog.principles[principleId]!;
      expect({
        principle: principle.stableKey,
        sides: [...(sides.get(principleId) ?? [])].sort(),
      }).toEqual({
        principle: principle.stableKey,
        sides: ["against", "consistent-with"],
      });
    }
  });

  it("puts principles in tension on at least some questions", () => {
    // Where the two previous assertions meet. A question engaging one
    // principle each way is what a character with ordinary, mixed
    // convictions actually runs into, and if the catalog had none of them
    // every view formed from principles would be unanimous.
    const inTension = catalog.propositionOrder.filter((id) => {
      const bearings = catalog.propositions[id]!.principles ?? [];
      return (
        bearings.some((entry) => entry.bearing === "consistent-with") &&
        bearings.some((entry) => entry.bearing === "against")
      );
    });
    expect(inTension.length).toBeGreaterThan(
      catalog.propositionOrder.length / 2,
    );
  });

  it("rejects a proposition naming a principle nobody declares, by name", () => {
    // Fails soft, and loudly. A relation that quietly became an empty list
    // would leave a position looking authored and engaging nothing.
    const registry = loadPolicyPacks([
      pack({
        pack: "reaching-forward",
        domains: [{ key: "d", name: "D", description: "A domain." }],
        issues: [
          { key: "i", domain: "d", name: "I", description: "An issue." },
        ],
        propositions: [
          {
            key: "p",
            issue: "i",
            name: "P",
            question: "Should it?",
            principles: [{ principle: "nobody-declared", bearing: "against" }],
          },
        ],
      }),
    ]);
    expect(registry.report.rejections).toEqual([
      {
        pack: "reaching-forward",
        where: 'proposition "p"',
        reason:
          'engages the principle "reaching-forward:nobody-declared", which no pack loaded before it declares',
      },
    ]);
    expect(registry.propositions).toEqual([]);
  });

  it("puts a position in every domain, so no domain is a heading with nothing under it", () => {
    const domainsWithPropositions = new Set(
      catalog.propositionOrder.map(
        (id) => catalog.issues[catalog.propositions[id]!.issueId]!.domainId,
      ),
    );
    for (const domain of registry.domains) {
      expect(domainsWithPropositions.has(domain.id)).toBe(true);
    }
  });

  it("leaves no domain without a question in it", () => {
    const domainsWithIssues = new Set(
      registry.issues.map((issue) => issue.domainId),
    );
    for (const domain of registry.domains) {
      expect(domainsWithIssues.has(domain.id)).toBe(true);
    }
    // An issue with no proposition on it is reported unused, which is fair:
    // not every one has a position authored yet. No DOMAIN is, which is the
    // part that would be a defect.
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
