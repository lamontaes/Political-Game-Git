import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectShippingBytes,
  scanShippingDirectory,
  shippingPolicy,
} from "../../scripts/world/check-data-shipping.mjs";

/**
 * The same JSON without its provenance: a part's `source` (the document it was
 * mined from) and the `bySource` and `read` counts of documents. A citation
 * names the real archive a sentence came from ("Jimmy Carter Library (NARA)
 * White House Exit Interview Project"); it is not authored text. Every other
 * field is still scanned.
 */
const NOT_SHIPPED = new Set(["data/english/batches", "data/english/grades"]);
const PROVENANCE_KEYS = new Set(["source", "bySource", "read"]);
function withoutProvenance(text: string): Buffer {
  return Buffer.from(
    JSON.stringify(
      JSON.parse(text),
      (key, value) => (PROVENANCE_KEYS.has(key) ? undefined : value),
      2,
    ),
  );
}

describe("shipped data regression check", () => {
  it("detects plain and JavaScript-escaped names in emitted assets", () => {
    const policy = shippingPolicy();
    expect(
      inspectShippingBytes(
        Buffer.from('const data={name:"Gavin Newsom"}'),
        policy,
      ),
    ).toContain("real-name:Gavin Newsom");
    expect(
      inspectShippingBytes(Buffer.from('"Ron \\u0044eSantis"'), policy),
    ).toContain("real-name:Ron DeSantis");
    expect(
      inspectShippingBytes(Buffer.from('"Raphael G. Warnock"'), policy),
    ).toContain("real-name:Raphael G. Warnock");
    expect(
      inspectShippingBytes(Buffer.from('"fictional-person"'), policy),
    ).toEqual([]);
    expect(
      inspectShippingBytes(
        Buffer.from('"https://www.nga.org/governors/powers-and-authority/"'),
        policy,
      ),
    ).toEqual([]);
  });
  it("detects presidents and federal judges outside the school catalogs", () => {
    const policy = shippingPolicy();
    expect(
      inspectShippingBytes(Buffer.from('"Barack Obama"'), policy, "app.js"),
    ).toContain("real-name:Barack Obama");
    expect(policy.judgeNames).toContain("Ronnie Abrams");
    expect(
      inspectShippingBytes(
        Buffer.from('"Barack Obama"'),
        policy,
        "client/assets/save-preparation.worker-abc.js",
      ),
    ).toEqual([]);
    expect(
      inspectShippingBytes(Buffer.from("Met Barack Obama."), policy, "app.js"),
    ).toContain("real-name:Barack Obama");
    expect(
      inspectShippingBytes(
        Buffer.from('"Barack Obama Charter"'),
        policy,
        "client/education/catalog-abc.json",
      ),
    ).toEqual([]);
  });
  it("keeps presidents and federal judges out of authored text", () => {
    const policy = shippingPolicy();
    const strict = {
      ...policy,
      federalNames: [...policy.federalNames, ...policy.judgeNames],
      federalNameAllowedIn: /^$/,
    };
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          // Grading batches and the owner's grades are authoring records that
          // no client file reads; their sample names (a made-up "James
          // McCarthy") may match a real judge's by chance.
          if (!NOT_SHIPPED.has(path)) walk(path);
        } else if (entry.name.endsWith(".json")) {
          const failures = inspectShippingBytes(
            withoutProvenance(readFileSync(path, "utf8")),
            strict,
            "x",
          );
          if (failures.length) found.push(`${path}: ${failures[0]}`);
        }
      }
    };
    for (const dir of ["data/english", "data/content", "data/runtime-text"])
      walk(dir);
    expect(found).toEqual([]);
  });
  it("detects a captured artifact by digest and a salary source URL in a map", () => {
    const bytes = Buffer.from("captured research bytes");
    const policy = {
      ...shippingPolicy(),
      captures: [
        {
          path: "research.pdf",
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      ],
    };
    expect(inspectShippingBytes(bytes, policy)).toContain(
      "research-capture:research.pdf",
    );
    expect(
      inspectShippingBytes(
        Buffer.from("https://bookofthestates.org/tables/2023-3-9/"),
        policy,
      ),
    ).not.toEqual([]);
  });
  it("fails empty output and scans nested emitted files", () => {
    const dir = mkdtempSync(join(tmpdir(), "data-fix-shipping-"));
    try {
      expect(() => scanShippingDirectory(dir, shippingPolicy())).toThrow(
        "Empty shipping directory",
      );
      writeFileSync(join(dir, "bundle.js.map"), '"Jon Ossoff"');
      const result = scanShippingDirectory(dir, shippingPolicy());
      expect(result.filesChecked).toBe(1);
      expect(result.violations).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
