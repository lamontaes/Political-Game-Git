import { afterEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { RESEARCH_FILE_INPUTS, stageResearchFileInputs } from "./manifest";

const temporaryRoots: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(resolve(tmpdir(), "source-manifest-test-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("source manifest research inputs", () => {
  it("stages every declared research file at the manifest-relative path", () => {
    const sourceRoot = temporaryRoot();
    const compiledRoot = temporaryRoot();
    const input = RESEARCH_FILE_INPUTS[0]!;
    const source = resolve(sourceRoot, input.path);
    const contents = '{"asOf":"2025-06-30","places":{}}\n';
    mkdirSync(resolve(source, ".."), { recursive: true });
    writeFileSync(source, contents);

    stageResearchFileInputs(sourceRoot, compiledRoot);

    expect(
      readFileSync(resolve(compiledRoot, input.rootRelativePath), "utf-8"),
    ).toBe(contents);
  });

  it("errors when a declared research input is missing", () => {
    expect(() =>
      stageResearchFileInputs(temporaryRoot(), temporaryRoot()),
    ).toThrow(
      "Declared research input is missing: data/research/places/local-institutions.json",
    );
  });
});
