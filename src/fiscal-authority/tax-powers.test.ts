import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packet from "../../docs/codex/effect-batches/team-6/tax-powers-49/batch-01-proposed.json" with { type: "json" };
import projection from "./tax-powers.generated.json" with { type: "json" };
import { normalizeRetrievedText } from "../source/core/parse/html-text";
import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { taxPowerEvidenceFor } from "../simulation/tax-policy";
import { makeIsoDate } from "../simulation/dates";
import { resolveStateFundedServiceCapability } from "../presentation/funded-service-capability";

const sha256 = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

describe("sourced state tax powers", () => {
  it("keeps each admitted power unique and tied to its own state", () => {
    expect(new Set(projection.powers.map((row) => row.key)).size).toBe(
      projection.powers.length,
    );
    for (const row of projection.powers) {
      expect(ARTICLE_V_STATE_KEYS).toContain(row.jurisdictionKey);
      expect(row.key).toBe(`${row.jurisdictionKey}:STATE:selective-excise`);
      expect(row.level).toBe("STATE");
      expect(row.instrument).toBe("selective-excise");
      expect(row.constraints.length).toBeGreaterThan(0);
    }
  });

  it("binds every new row to captured official bytes and literal legal excerpts", () => {
    expect(packet.powers.length).toBe(packet.evidenceScopes.length);
    for (const row of packet.powers) {
      expect(projection.powers.find((power) => power.key === row.key)).toEqual(
        row,
      );
      const scope = packet.evidenceScopes.find(
        (entry) => entry.jurisdictionKey === row.jurisdictionKey,
      );
      expect(scope).toBeDefined();
      if (!scope) throw new Error(`Missing source scope: ${row.key}`);
      expect(projection.evidenceScopes).toContainEqual(scope);
      const bytes = readFileSync(scope.parentLocalPath);
      expect(sha256(bytes)).toBe(row.sourceSha256);
      expect(scope.parentSha256).toBe(row.sourceSha256);
      expect(scope.sourceArtifactId).toBe(row.sourceArtifactId);
      expect(scope.retrieval.url).toBe(row.sourceUrl);
      expect(scope.retrieval.httpStatus).toBe(200);
      expect(scope.retrieval.responseBytes).toBe(bytes.length);
      expect(scope.retrieval.retrievedAt.slice(0, 10)).toBe(row.asOf);
      expect(scope.citations).toEqual(row.citations);
      expect(sha256(scope.legalTextQuotes.join("\n"))).toBe(
        scope.excerptSha256,
      );
      const text = normalizeRetrievedText(
        bytes,
        "mediaType" in scope
          ? String(scope.mediaType)
          : "text/html; charset=utf-8",
      );
      for (const quote of scope.legalTextQuotes) {
        expect(text, `${row.key}: ${quote}`).toContain(quote);
      }
      expect(scope.sourceApproval).toBe("CTO REVIEW REQUIRED");
    }
  });

  it("uses the existing provider and capability reader across all 50 states", () => {
    expect(ARTICLE_V_STATE_KEYS).toHaveLength(50);
    let admitted = 0;
    let missing = 0;
    for (const key of ARTICLE_V_STATE_KEYS) {
      const row = projection.powers.find(
        (entry) => entry.jurisdictionKey === key,
      );
      const evidence = taxPowerEvidenceFor(key);
      const capability = resolveStateFundedServiceCapability(
        key,
        makeIsoDate("2026-10-02"),
      );
      for (const field of ["tax-power", "public-account"] as const) {
        expect(
          capability.readings.find((entry) => entry.field === field)?.admitted,
        ).toBe(Boolean(row));
      }
      if (row) {
        admitted += 1;
        expect(evidence).toEqual(row);
        expect(capability.missing).not.toContain("tax-power");
        const decisionRoute = capability.readings.find(
          (entry) => entry.field === "revenue-decision",
        )?.admitted;
        expect(
          capability.readings.find(
            (entry) => entry.field === "funding-effective-date",
          )?.admitted,
        ).toBe(Boolean(decisionRoute));
      } else {
        missing += 1;
        expect(evidence).toBeNull();
        expect(capability.missing).toContain("tax-power");
        expect(capability.missing).toContain("funding-effective-date");
        expect(capability.missing).toContain("public-account");
      }
    }
    expect(admitted).toBe(projection.powers.length);
    expect(missing).toBe(50 - projection.powers.length);
  });
});
