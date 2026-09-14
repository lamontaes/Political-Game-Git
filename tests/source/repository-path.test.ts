import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const loader = import.meta.resolve("tsx");
let temporary: string;
let repository: string;

function copy(relative: string): void {
  const target = join(repository, relative);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(resolve(sourceRoot, relative), target, { recursive: true });
}

function probe(name: string, source: string): void {
  const driver = join(repository, `${name}.mjs`);
  writeFileSync(driver, source);
  assertChild(driver);
}

function assertChild(entry: string, args: string[] = []): void {
  const child = spawnSync(
    process.execPath,
    ["--import", loader, entry, ...args],
    {
      cwd: repository,
      encoding: "utf8",
      timeout: 4_000,
    },
  );
  expect(child.error, child.stderr).toBeUndefined();
  expect(child.status, child.stderr).toBe(0);
}

describe("source tooling in a repository with URL-escaped path characters", () => {
  beforeAll(() => {
    temporary = mkdtempSync(join(tmpdir(), "ocd-source-path-"));
    repository = join(temporary, "Political Game % café");
    mkdirSync(repository);
    writeFileSync(join(repository, "package.json"), '{"type":"module"}');
    // Only the affected modules and their local dependencies, not a clone.
    copy("src/source/core");
    copy("src/source/domains/state-office-qualifications");
    copy("scripts/source/fiscal-authority-inventory.ts");
    copy("data/source/acs-pums/artifact-lock.json");
    copy("data/source/acs-pums/raw/psam_h56.qa-slice.csv");
    copy(
      "data/source/state-local-fiscal-authority/research-input/92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json",
    );
    copy(
      "data/source/state-local-fiscal-authority/research-input/92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.mirror.json",
    );
    copy("data/source/state-local-fiscal-authority/research-disposition.json");
  });

  afterAll(() => rmSync(temporary, { recursive: true, force: true }));

  it("opens committed locked bytes and still refuses changed or missing bytes", () => {
    probe(
      "locked-bytes",
      String.raw`
      import assert from "node:assert/strict";
      import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
      import { openProductionArtifacts } from "./src/source/core/capability.ts";
      const lock = JSON.parse(readFileSync("data/source/acs-pums/artifact-lock.json", "utf8"));
      const path = "data/source/acs-pums/raw/psam_h56.qa-slice.csv";
      const artifact = lock.artifacts.find(item => item.localPath === path);
      assert.ok(artifact);
      const open = () => openProductionArtifacts(lock.domain, lock, { housing: artifact.artifactId });
      const bytes = readFileSync(path);
      assert.deepEqual(open().artifacts.housing.bytes, bytes);
      writeFileSync(path, Buffer.concat([bytes, Buffer.from("changed")]));
      assert.throws(open, /hash|digest|SHA-256/i);
      unlinkSync(path);
      assert.throws(open, /those bytes are not present/);
    `,
    );
  });

  it("checks the real fiscal inventory without rewriting committed inputs", () => {
    assertChild(
      join(repository, "scripts/source/fiscal-authority-inventory.ts"),
      ["--check"],
    );
  });

  it("reads both qualification matrix paths without creating any claim rows", () => {
    probe(
      "qualification-paths",
      String.raw`
      import assert from "node:assert/strict";
      import { mkdirSync, writeFileSync } from "node:fs";
      import { dirname } from "node:path";
      import { openProductionArtifacts } from "./src/source/core/capability.ts";
      import { compileQualifications, RESEARCH_MATRICES } from "./src/source/domains/state-office-qualifications/compile.ts";
      import { QUALIFICATION_COLUMNS, RECOVERED_31D_QUALIFICATION_COLUMNS } from "./src/source/domains/state-office-qualifications/parse.ts";
      for (const matrix of RESEARCH_MATRICES) {
        mkdirSync(dirname(matrix.path), { recursive: true });
        const columns = matrix.batch === "31D" ? RECOVERED_31D_QUALIFICATION_COLUMNS : QUALIFICATION_COLUMNS;
        writeFileSync(matrix.path, columns.join("\t") + "\n");
      }
      const input = openProductionArtifacts("state-office-qualifications", { domain: "state-office-qualifications", artifacts: [] }, {});
      const result = compileQualifications(input, "2026-09-13");
      assert.equal(result.rowsConsidered, 0);
      assert.deepEqual(result.corpus.records, []);
      assert.deepEqual(result.refusals, []);
    `,
    );
  });
});
