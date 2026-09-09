import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_AUTHORITY_RULE_PACKS,
  R3H_ACCEPTED_CATEGORY_COUNTS,
  R3H_ACCEPTED_NODE_TOTAL,
  R3H_NODE_RECONCILIATION,
  R3H_PROMOTED_JURISDICTIONS,
  packFieldIsKnown,
  packForEntry,
  summarizeR3hReconciliation,
  type R3hNodeDisposition,
} from "./executive-authority-r3h-reconciliation";
import {
  assertExecutiveAuthorityPackIntegrity,
  resolvePresentmentAuthority,
} from "./executive-authority-rules";
import { rulePackById } from "./legislature-rule-packs";

const RESOLVING_DISPOSITIONS = new Set([
  "newly-compiled",
  "already-represented",
]);

function key(entry: R3hNodeDisposition): string {
  return `${entry.jurisdictionKey}:${entry.category}.${entry.node}`;
}

// ---------------------------------------------------------------------------
// (1) Every accepted node is accounted for, exactly once.
// ---------------------------------------------------------------------------

describe("R3I reconciliation: all 142 accepted nodes are accounted for", () => {
  it("lists exactly the accepted node total", () => {
    expect(R3H_NODE_RECONCILIATION).toHaveLength(R3H_ACCEPTED_NODE_TOTAL);
    expect(
      Object.values(summarizeR3hReconciliation()).reduce((a, b) => a + b, 0),
    ).toBe(R3H_ACCEPTED_NODE_TOTAL);
  });

  it("names each accepted node exactly once", () => {
    const keys = R3H_NODE_RECONCILIATION.map(key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("reproduces the accepted category counts exactly", () => {
    const counts: Record<string, number> = {};
    for (const entry of R3H_NODE_RECONCILIATION) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    expect(counts).toEqual(R3H_ACCEPTED_CATEGORY_COUNTS);
  });

  it("stays inside the six promoted jurisdictions", () => {
    const promoted = new Set(R3H_PROMOTED_JURISDICTIONS);
    for (const entry of R3H_NODE_RECONCILIATION) {
      expect(promoted.has(entry.jurisdictionKey)).toBe(true);
      expect(packForEntry(entry)).not.toBeNull();
    }
    // And each promoted jurisdiction has a registered pack, no more, no fewer.
    expect(EXECUTIVE_AUTHORITY_RULE_PACKS).toHaveLength(
      R3H_PROMOTED_JURISDICTIONS.length,
    );
  });

  it("gives every node a disposition and a stated reason", () => {
    for (const entry of R3H_NODE_RECONCILIATION) {
      expect(entry.disposition).toBeTruthy();
      expect(entry.reason.trim().length).toBeGreaterThan(0);
      expect(entry.citation.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// (2) The accounting cannot lie about the runtime.
// ---------------------------------------------------------------------------

describe("R3I reconciliation: claims are checked against the live packs", () => {
  it("resolves every field a compiled or represented node claims", () => {
    const broken: string[] = [];
    for (const entry of R3H_NODE_RECONCILIATION) {
      if (!RESOLVING_DISPOSITIONS.has(entry.disposition)) {
        continue;
      }
      expect(entry.targetFields.length).toBeGreaterThan(0);
      const pack = packForEntry(entry);
      if (pack === null) {
        broken.push(`${key(entry)}: no pack`);
        continue;
      }
      for (const field of entry.targetFields) {
        if (!packFieldIsKnown(pack, field)) {
          broken.push(
            `${key(entry)} -> ${field} is not known in ${pack.packId}`,
          );
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("claims no runtime field for a node it did not compile", () => {
    // A deferred, unconsumed or blocked node must not quietly take credit for a
    // field. This is the half of the accounting that stops the report drifting
    // ahead of the packs.
    for (const entry of R3H_NODE_RECONCILIATION) {
      if (RESOLVING_DISPOSITIONS.has(entry.disposition)) {
        continue;
      }
      expect(`${key(entry)}:${entry.targetFields.join(",")}`).toBe(
        `${key(entry)}:`,
      );
    }
  });

  it("detects a fabricated field claim rather than passing it", () => {
    // Negative control: the checker must actually fail on a bad claim.
    const pack = packForEntry(R3H_NODE_RECONCILIATION[0]!)!;
    expect(packFieldIsKnown(pack, "removal.mode")).toBe(
      pack.removal.mode.kind === "known",
    );
    expect(packFieldIsKnown(pack, "clemency.notAField")).toBe(false);
    expect(packFieldIsKnown(pack, "administrative.supervisoryAuthority")).toBe(
      false,
    );
  });

  it("holds the disposition totals R3I reports", () => {
    expect(summarizeR3hReconciliation()).toEqual({
      "newly-compiled": 51,
      "already-represented": 29,
      "deferred-to-r3j": 30,
      "no-exact-consumer": 31,
      "blocked-by-contract-mismatch": 1,
    });
  });
});

// ---------------------------------------------------------------------------
// (3) The exclusions R3H imposed actually hold.
// ---------------------------------------------------------------------------

describe("R3I reconciliation: the excluded rows cannot enter", () => {
  it("compiles no identity_selection node into any runtime field", () => {
    // R3H routes all 28 of these out unless an exact field already exists, and
    // none does. R3I adds no election, term, term-limit, lieutenant-governor or
    // succession schema, so all 28 stay unconsumed.
    const identity = R3H_NODE_RECONCILIATION.filter(
      (entry) => entry.category === "identity_selection",
    );
    expect(identity).toHaveLength(28);
    for (const entry of identity) {
      expect(entry.disposition).toBe("no-exact-consumer");
      expect(entry.targetFields).toEqual([]);
    }
    // And no such field appeared on the contract itself.
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      const keys = Object.keys(pack);
      for (const forbidden of [
        "election",
        "term",
        "termLimits",
        "succession",
        "lieutenantGovernor",
        "recessAppointment",
      ]) {
        expect(keys).not.toContain(forbidden);
      }
    }
  });

  it("compiles no legislative_powers node beyond the presentment seam", () => {
    const legislative = R3H_NODE_RECONCILIATION.filter(
      (entry) => entry.category === "legislative_powers",
    );
    expect(legislative).toHaveLength(36);
    const resolving = legislative.filter((entry) =>
      RESOLVING_DISPOSITIONS.has(entry.disposition),
    );
    // The five compiled cross-references, plus the federal convening power that
    // Art. II, Sec. 3 already established before R3I. Nothing else.
    expect(resolving.map(key).sort()).toEqual([
      "US-AK:legislative_powers.legislative_rule_pack_cross_reference",
      "US-IL:legislative_powers.legislative_rule_pack_cross_reference",
      "US-KY:legislative_powers.legislative_rule_pack_cross_reference",
      "US-MN:legislative_powers.legislative_rule_pack_cross_reference",
      "US-NE:legislative_powers.legislative_rule_pack_cross_reference",
      "US:legislative_powers.special_session_call",
    ]);
    for (const entry of resolving) {
      expect(entry.disposition).toBe("already-represented");
    }
    // Veto, item veto and override are never restated on an executive pack.
    const serialized = JSON.stringify(EXECUTIVE_AUTHORITY_RULE_PACKS);
    expect(serialized).not.toMatch(/days_to_act_session/);
    expect(serialized).not.toMatch(/override_threshold/);
    expect(serialized).not.toMatch(/item_partial_veto/);
  });

  it("brings no queued row or quarantined jurisdiction into the runtime", () => {
    // The 356 queued rows and the 45 quarantined jurisdictions are outside the
    // accepted universe. Nothing here names one, and no pack exists for one.
    const promoted = new Set(R3H_PROMOTED_JURISDICTIONS);
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(promoted.has(pack.jurisdictionKey)).toBe(true);
    }
    const serialized = JSON.stringify(EXECUTIVE_AUTHORITY_RULE_PACKS);
    expect(serialized).not.toMatch(/\bQUEUED\b/);
    expect(serialized).not.toMatch(/\bquarantin/i);
    expect(serialized).not.toMatch(/\b92K\b/);
  });

  it("promotes nothing on the strength of an UNKNOWN or queued status", () => {
    // Only KNOWN and NOT_APPLICABLE nodes were accepted at all. The four
    // NOT_APPLICABLE nodes are all federal, and none of them enters as a
    // not-applicable runtime value — this contract refuses that state outright.
    // The clemency one reaches runtime only inside the composite executive-sole
    // model; the other three are routed out with the categories they sit in.
    for (const entry of R3H_NODE_RECONCILIATION) {
      expect(["KNOWN", "NOT_APPLICABLE"]).toContain(entry.acceptedStatus);
    }
    const notApplicable = R3H_NODE_RECONCILIATION.filter(
      (entry) => entry.acceptedStatus === "NOT_APPLICABLE",
    );
    expect(notApplicable.map(key).sort()).toEqual([
      "US:clemency.board_recommendation_constraints",
      "US:identity_selection.lt_governor_relationship",
      "US:legislative_powers.item_partial_veto",
      "US:legislative_powers.other_presentment_powers",
    ]);
    expect(JSON.stringify(EXECUTIVE_AUTHORITY_RULE_PACKS)).not.toMatch(
      /"not-applicable"/,
    );
  });
});

// ---------------------------------------------------------------------------
// (4) The six packs are still fail-closed and registry-resolvable.
// ---------------------------------------------------------------------------

describe("R3I reconciliation: the six packs stay whole", () => {
  it("keeps every pack internally coherent and fully sourced", () => {
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      expect(() => assertExecutiveAuthorityPackIntegrity(pack)).not.toThrow();
    }
  });

  it("resolves every known presentment reference against the live registry", () => {
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      const ref = pack.presentment.legislativeRulePackId;
      if (ref.kind !== "known") {
        expect(pack.packId).toBe("us-federal-executive-v1");
        continue;
      }
      const legislative = rulePackById(ref.value);
      expect(() =>
        resolvePresentmentAuthority(pack, legislative),
      ).not.toThrow();
    }
  });

  it("carries a certified excerpt hash on every value compiled from R3H", () => {
    // A compiled value must be traceable to the certified excerpt it came from,
    // not to this repository's summary of the research.
    let compiled = 0;
    for (const pack of EXECUTIVE_AUTHORITY_RULE_PACKS) {
      for (const src of pack.sources) {
        if (!(src.note ?? "").startsWith("Accepted R3H node value ")) {
          continue;
        }
        compiled += 1;
        expect(src.note ?? "").toMatch(/excerpt hash [0-9a-f]{16}/);
        expect(src.retrievedAt).toBe("2026-09-06");
        expect(src.verification).toBe("verified");
        expect(src.citation).not.toMatch(/R3H|R3G|report/i);
      }
    }
    expect(compiled).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// (5) The checked-in evidence file cannot drift from the module.
// ---------------------------------------------------------------------------

describe("R3I reconciliation: the exported evidence matches the module", () => {
  it("carries the same 142 nodes and the same summary", () => {
    // `npm run reconcile:r3h` regenerates this file. If it is edited by hand,
    // or the module moves without a regeneration, this fails rather than
    // letting a completion report cite a stale accounting.
    const exported = JSON.parse(
      readFileSync(
        resolve(
          import.meta.dirname,
          "../../docs/agent/evidence/r3i-r3h-node-reconciliation.json",
        ),
        "utf8",
      ),
    ) as {
      runtimeCheck: boolean;
      summary: Record<string, number>;
      nodes: unknown[];
    };
    expect(exported.runtimeCheck).toBe(true);
    expect(exported.summary).toEqual(summarizeR3hReconciliation());
    expect(exported.nodes).toEqual(
      JSON.parse(JSON.stringify(R3H_NODE_RECONCILIATION)),
    );
  });
});
