import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertVersionMetadataAgreement,
  bumpLockfileVersion,
  parseLockfileVersionMetadata,
} from "../../scripts/release/package-metadata";
import { check } from "../../scripts/release/cli";
import { makeFixture } from "./fixtures";

describe(
  "canonical package and lockfile version agreement",
  { timeout: 30_000 },
  () => {
    it("reads and agrees on all three required locations", () => {
      const fixture = makeFixture();
      try {
        const text = readFileSync(
          join(fixture.root, "package-lock.json"),
          "utf8",
        );
        const metadata = parseLockfileVersionMetadata(text);
        expect(metadata).toEqual({
          topLevelVersion: "0.2.0",
          rootPackageVersion: "0.2.0",
        });
        expect(() =>
          assertVersionMetadataAgreement("0.2.0", metadata),
        ).not.toThrow();
      } finally {
        fixture.dispose();
      }
    });

    it.each([
      ["top-level drift", "0.2.1", "0.2.0"],
      ["root package drift", "0.2.0", "0.2.1"],
      ["both lock locations drift", "0.2.1", "0.2.1"],
    ])("rejects %s", (_name, topLevel, rootPackage) => {
      expect(() =>
        assertVersionMetadataAgreement("0.2.0", {
          topLevelVersion: topLevel,
          rootPackageVersion: rootPackage,
        }),
      ).toThrow(/All three locations must agree/);
    });

    it.each([
      [
        "missing top-level version",
        { lockfileVersion: 3, packages: { "": { version: "0.2.0" } } },
      ],
      [
        "wrong-shaped top-level version",
        { version: 2, packages: { "": { version: "0.2.0" } } },
      ],
      ["missing packages", { version: "0.2.0" }],
      ["wrong-shaped packages", { version: "0.2.0", packages: [] }],
      ["missing root package", { version: "0.2.0", packages: {} }],
      [
        "missing root package version",
        { version: "0.2.0", packages: { "": {} } },
      ],
      [
        "wrong-shaped root package version",
        { version: "0.2.0", packages: { "": { version: 2 } } },
      ],
    ])("rejects %s", (_name, value) => {
      expect(() =>
        parseLockfileVersionMetadata(JSON.stringify(value)),
      ).toThrow();
    });

    it("updates only the two root version locations", () => {
      const input = JSON.stringify(
        {
          name: "example",
          version: "0.2.0",
          lockfileVersion: 3,
          packages: {
            "": { name: "example", version: "0.2.0" },
            "node_modules/same-number": { version: "0.2.0" },
          },
        },
        null,
        2,
      );
      const output = JSON.parse(bumpLockfileVersion(input, "0.2.0", "0.2.1"));
      expect(output.version).toBe("0.2.1");
      expect(output.packages[""].version).toBe("0.2.1");
      expect(output.packages["node_modules/same-number"].version).toBe("0.2.0");
    });

    it("makes release:check reject every malformed or missing root location", () => {
      const fixture = makeFixture();
      try {
        const path = join(fixture.root, "package-lock.json");
        writeFileSync(path, '{"version":"0.2.0","packages":{"":{}}}\n');
        expect(check(fixture.root).join("\n")).toContain(
          'packages[""].version must be a string',
        );
        writeFileSync(
          path,
          '{"version":"0.2.1","packages":{"":{"version":"0.2.0"}}}\n',
        );
        expect(check(fixture.root).join("\n")).toContain(
          "All three locations must agree",
        );
      } finally {
        fixture.dispose();
      }
    });
  },
);
