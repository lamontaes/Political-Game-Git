import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packet from "../../docs/codex/effect-batches/team-6/tax-powers-49/batch-01-proposed.json" with { type: "json" };
import secondPacket from "../../docs/codex/effect-batches/team-6/tax-powers-49/batch-02/proposed.json" with { type: "json" };
import thirdPacket from "../../docs/codex/effect-batches/team-6/tax-powers-49/batch-03/proposed.json" with { type: "json" };
import fourthPacket from "../../docs/codex/effect-batches/team-6/tax-powers-49/batch-04/proposed.json" with { type: "json" };
import fifthPacket from "../../docs/codex/effect-batches/team-6/tax-powers-49/batch-05/proposed.json" with { type: "json" };
import projection from "./tax-powers.generated.json" with { type: "json" };
import { normalizeRetrievedText } from "../source/core/parse/html-text";
import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { taxPowerEvidenceFor } from "../simulation/tax-policy";
import { makeIsoDate } from "../simulation/dates";
import { resolveStateFundedServiceCapability } from "../presentation/funded-service-capability";

const sha256 = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

async function sourceText(
  bytes: Uint8Array,
  mediaType: string,
): Promise<string> {
  if (!mediaType.startsWith("application/pdf")) {
    return normalizeRetrievedText(bytes, mediaType);
  }
  // Reuse the existing PDF.js dependency and the source bank's decoded-item
  // convention. This verifies evidence only; it is not a production parser.
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  });
  const document = await loading.promise;
  try {
    const pages: string[] = [];
    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .flatMap((item) => ("str" in item ? [item.str] : []))
          .join(" "),
      );
      page.cleanup();
    }
    return pages
      .join(" ")
      .replace(/[\s\u00a0\u2007\u202f]+/g, " ")
      .trim();
  } finally {
    await loading.destroy();
  }
}

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

  it("binds every new row to captured official bytes and literal legal excerpts", async () => {
    const batches = [
      packet,
      secondPacket,
      thirdPacket,
      fourthPacket,
      fifthPacket,
    ];
    expect(
      projection.powers.filter(
        (row) =>
          row.sourceArtifactId !== projection.evidenceScope.parentArtifactId,
      ),
    ).toEqual(batches.flatMap((batch) => batch.powers));
    for (const batch of batches) {
      for (const row of batch.powers) {
        expect(
          projection.powers.find((power) => power.key === row.key),
        ).toEqual(row);
        const scope = batch.evidenceScopes.find(
          (entry) =>
            entry.jurisdictionKey === row.jurisdictionKey &&
            entry.sourceArtifactId === row.sourceArtifactId,
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
        expect(
          batch.evidenceScopes
            .filter((entry) => entry.jurisdictionKey === row.jurisdictionKey)
            .flatMap((entry) => entry.citations),
        ).toEqual(row.citations);
        expect(sha256(scope.legalTextQuotes.join("\n"))).toBe(
          scope.excerptSha256,
        );
        const text = await sourceText(bytes, scope.mediaType);
        for (const quote of scope.legalTextQuotes) {
          expect(text, `${row.key}: ${quote}`).toContain(quote);
        }
        expect(scope.sourceApproval).toBe("CTO REVIEW REQUIRED");
      }
      for (const scope of batch.evidenceScopes) {
        expect(scope.legalTextQuotes.length).toBeGreaterThan(0);
        expect(scope.citations.length).toBeGreaterThan(0);
        expect(projection.evidenceScopes).toContainEqual(scope);
        const row = batch.powers.find(
          (power) => power.jurisdictionKey === scope.jurisdictionKey,
        );
        expect(row).toBeDefined();
        for (const citation of scope.citations)
          expect(row?.citations).toContain(citation);
        const bytes = readFileSync(scope.parentLocalPath);
        expect(sha256(bytes)).toBe(scope.parentSha256);
        expect(bytes.length).toBe(scope.retrieval.responseBytes);
        expect(sha256(scope.legalTextQuotes.join("\n"))).toBe(
          scope.excerptSha256,
        );
        const text = await sourceText(bytes, scope.mediaType);
        for (const quote of scope.legalTextQuotes)
          expect(text, `${scope.sourceArtifactId}: ${quote}`).toContain(quote);
      }
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
