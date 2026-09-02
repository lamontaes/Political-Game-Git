import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  QUARANTINED_PATH_SEGMENTS,
  assertNotSyntheticPayload,
  assertProductionInputPath,
  isQuarantinedPath,
} from "./production-input-guard.js";

const REPO_ROOT = process.cwd();
const DATA_ROOT = path.join(REPO_ROOT, "data", "source");
const SRC_ROOT = path.join(REPO_ROOT, "src", "source");
const SCRIPTS_ROOT = path.join(REPO_ROOT, "scripts", "source");

function walk(dir: string, filter: (p: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

const relative = (p: string) => path.relative(REPO_ROOT, p);

/**
 * The scans the Packet 13 validation section requires. Each one is written
 * against a contamination that actually reached a committed corpus.
 */
describe("source substrate integrity", () => {
  describe("synthetic-contamination scan across committed normalized data", () => {
    const normalizedFiles = walk(
      DATA_ROOT,
      (p) => p.endsWith(".json") && !isQuarantinedPath(p),
    );

    it("finds committed normalized data to scan", () => {
      expect(normalizedFiles.length).toBeGreaterThan(0);
    });

    it("contains no synthetic placeholder identities", () => {
      // PR #57 compiled "HB 999", sponsored by "John Doe", into its committed
      // corpus, where it was indistinguishable from Kentucky HB 497.
      const forbidden = [
        "HB 999",
        "John Doe",
        "Jane Smith",
        "Synthetic Testing Framework Authority",
        "example.gov",
      ];
      const offenders: string[] = [];

      for (const file of normalizedFiles) {
        const content = fs.readFileSync(file, "utf8");
        for (const needle of forbidden) {
          if (content.includes(needle)) {
            offenders.push(`${relative(file)} contains "${needle}"`);
          }
        }
      }

      expect(offenders).toEqual([]);
    });

    it("declares no document synthetic outside a quarantined path", () => {
      const offenders = normalizedFiles.filter((file) => {
        const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
        try {
          assertNotSyntheticPayload(parsed, file);
          return false;
        } catch {
          return true;
        }
      });

      expect(offenders.map(relative)).toEqual([]);
    });

    it("carries no hand-typed placeholder hashes", () => {
      // PR #56 shipped Census provenance whose sourceHash values were rotated
      // hex walks such as "9c0d1e2f3a4b...0123456789abcdef", several of them
      // not even 64 characters long.
      const offenders: string[] = [];
      const walkingHex = /0123456789abcdef0123456789abcdef/;

      for (const file of normalizedFiles) {
        const content = fs.readFileSync(file, "utf8");
        if (walkingHex.test(content)) {
          offenders.push(relative(file));
        }
      }

      expect(offenders).toEqual([]);
    });
  });

  describe("runtime-import scan: fixtures cannot leak through production exports", () => {
    const runtimeModules = walk(
      SRC_ROOT,
      (p) =>
        p.endsWith(".ts") && !p.endsWith(".test.ts") && !isQuarantinedPath(p),
    );

    it("finds runtime modules to scan", () => {
      expect(runtimeModules.length).toBeGreaterThan(0);
    });

    it("has no runtime module importing from a quarantined directory", () => {
      // PR #41 exported four invented jurisdictions from src/simulation/index.ts,
      // putting them one import away from every consumer of the barrel.
      const offenders: string[] = [];

      for (const file of runtimeModules) {
        const content = fs.readFileSync(file, "utf8");
        for (const segment of QUARANTINED_PATH_SEGMENTS) {
          const importPattern = new RegExp(
            `(?:import|export)[^;]*from\\s+["'][^"']*${segment}[^"']*["']`,
          );
          if (importPattern.test(content)) {
            offenders.push(`${relative(file)} imports from ${segment}`);
          }
        }
      }

      expect(offenders).toEqual([]);
    });

    it("exposes no synthetic fixture through a domain barrel", async () => {
      const barrels = runtimeModules.filter(
        (p) => path.basename(p) === "index.ts",
      );
      expect(barrels.length).toBeGreaterThan(0);

      for (const barrel of barrels) {
        const module: Record<string, unknown> = await import(barrel);

        // Only exported DATA can be mistaken for a source record. Guard
        // functions and error classes name synthetic input because refusing it
        // is their job, so match on the value's shape, not just its name.
        const leaked = Object.entries(module)
          .filter(([name]) => /SYNTHETIC|FIXTURE/i.test(name))
          .filter(([, value]) => {
            if (typeof value === "function") return false;
            return typeof value === "object" && value !== null;
          })
          .map(([name]) => name);

        expect(`${relative(barrel)}: ${leaked.join(", ")}`).toBe(
          `${relative(barrel)}: `,
        );
      }
    });
  });

  describe("provider status is not gameplay truth", () => {
    const runtimeModules = walk(
      SRC_ROOT,
      (p) => p.endsWith(".ts") && !p.endsWith(".test.ts"),
    );

    /**
     * The one sanctioned seam: education exposes an adapter that converts an
     * institution record into a `CreateOrganizationInput`. It is type-only and
     * builds an input for the caller rather than mutating a World.
     */
    const ALLOWED_SIMULATION_IMPORTERS = new Set([
      "src/source/education/corpus.ts",
    ]);

    it("keeps the source layer free of simulation imports outside the declared adapter", () => {
      const offenders: string[] = [];

      for (const file of runtimeModules) {
        const content = fs.readFileSync(file, "utf8");
        const importsSimulation =
          /(?:import|export)[^;]*from\s+["'][^"']*\/simulation\/[^"']*["']/.test(
            content,
          );
        if (!importsSimulation) continue;

        const rel = relative(file).split(path.sep).join("/");
        if (!ALLOWED_SIMULATION_IMPORTERS.has(rel)) {
          offenders.push(rel);
        }
      }

      expect(offenders).toEqual([]);
    });

    it("imports simulation types only as types, never as runtime values", () => {
      for (const rel of ALLOWED_SIMULATION_IMPORTERS) {
        const content = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
        const simulationImports =
          content.match(
            /(?:import|export)[^;]*from\s+["'][^"']*\/simulation\/[^"']*["']/g,
          ) ?? [];

        expect(simulationImports.length).toBeGreaterThan(0);
        for (const statement of simulationImports) {
          // A value import would let source code call into gameplay and mutate
          // a World; a type import cannot.
          expect(statement).toMatch(/^import type|^export type/);
        }
      }
    });

    it("does not duplicate the merged gameplay legislation state machine", () => {
      // The legislative SOURCE layers record what a provider says happened to a
      // bill. Advancing a bill through a chamber is gameplay, and already lives
      // in src/simulation/legislation.ts. Two state machines would drift.
      const gameplayOnlyExports = [
        "advanceLegislation",
        "recordLegislativeVote",
        "enactBill",
        "applyLegislativeAction",
      ];
      const offenders: string[] = [];

      for (const file of runtimeModules) {
        const content = fs.readFileSync(file, "utf8");
        for (const name of gameplayOnlyExports) {
          if (
            new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(
              content,
            )
          ) {
            offenders.push(`${relative(file)} exports ${name}`);
          }
        }
      }

      expect(offenders).toEqual([]);
    });
  });

  describe("production compilers keep their guards", () => {
    const compilerScripts = walk(
      SCRIPTS_ROOT,
      (p) => p.endsWith(".ts") && path.basename(p).includes("compile"),
    );

    it("finds compiler entry points to scan", () => {
      expect(compilerScripts.length).toBeGreaterThan(0);
    });

    it("every compiler that reads a directory calls the input guard", () => {
      const offenders: string[] = [];

      for (const file of compilerScripts) {
        const content = fs.readFileSync(file, "utf8");
        if (!content.includes("readdirSync")) continue;
        if (!content.includes("assertProductionInputPath")) {
          offenders.push(
            `${relative(file)} reads a directory without assertProductionInputPath`,
          );
        }
        if (!content.includes("assertNotSyntheticPayload")) {
          offenders.push(
            `${relative(file)} parses documents without assertNotSyntheticPayload`,
          );
        }
      }

      expect(offenders).toEqual([]);
    });

    it("refuses every quarantined directory that actually exists", () => {
      const quarantined = walk(DATA_ROOT, (p) => p.endsWith(".json")).filter(
        isQuarantinedPath,
      );
      expect(quarantined.length).toBeGreaterThan(0);

      for (const file of quarantined) {
        expect(() => assertProductionInputPath(file)).toThrow(
          /quarantined path segment/,
        );
      }
    });
  });
});
