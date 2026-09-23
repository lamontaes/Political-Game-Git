import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ChatGPT's answers are kept byte for byte as downloaded, so a record citing
 * one by SHA-256 can be checked against the file. A repository-wide rewrite
 * (a spelling sweep, a formatter) once changed eighteen of them silently.
 */
const ROOT = "docs/research/chatgpt-answers";

const checksumLines = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((folder) =>
    readdirSync(join(ROOT, folder.name))
      .filter((name) => name.startsWith("SHA256SUMS"))
      .flatMap((sums) =>
        readFileSync(join(ROOT, folder.name, sums), "utf8")
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            const [hash, ...rest] = line.trim().split(/\s+/);
            const name = rest.join(" ").replace(/^\*/, "").replace(/^\.\//, "");
            return { folder: folder.name, hash, name };
          }),
      ),
  );

describe("ChatGPT's verbatim answers", () => {
  it("has checksum lines to verify", () => {
    expect(checksumLines.length).toBeGreaterThan(0);
  });

  it("still matches every recorded SHA-256", () => {
    const changed = checksumLines.filter(
      ({ folder, hash, name }) =>
        createHash("sha256")
          .update(readFileSync(join(ROOT, folder, name)))
          .digest("hex") !== hash,
    );
    expect(changed.map(({ folder, name }) => `${folder}/${name}`)).toEqual([]);
  });
});
