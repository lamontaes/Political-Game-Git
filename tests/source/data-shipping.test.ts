import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  inspectShippingBytes,
  scanShippingDirectory,
  shippingPolicy,
} from "../../scripts/world/check-data-shipping.mjs";

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
    expect(
      inspectShippingBytes(Buffer.from('"Ronnie Abrams"'), policy, "app.js"),
    ).toContain("real-name:Ronnie Abrams");
    expect(
      inspectShippingBytes(
        Buffer.from('"Barack Obama Charter"'),
        policy,
        "education/catalog-abc.json",
      ),
    ).toEqual([]);
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
