import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { replayStateVotingContextArtifacts } from "../../scripts/source/replay";

it("replays every delivered state voting shard", () => {
  expect(replayStateVotingContextArtifacts()).toEqual([]);
});

it("rejects a changed figure, missing state, and stray delivery shard", () => {
  const root = mkdtempSync(resolve(tmpdir(), "state-voting-corrupt-"));
  try {
    cpSync(
      resolve(import.meta.dirname, "../../public/data/state-voting/v1"),
      root,
      { recursive: true },
    );
    const ky = resolve(root, "KY.json");
    const before = readFileSync(ky, "utf8");
    const after = before.replace('"value": 3405000', '"value": 3406000');
    expect(after).not.toBe(before);
    writeFileSync(ky, after);
    rmSync(resolve(root, "DC.json"));
    writeFileSync(resolve(root, "EXTRA.json"), "{}");
    expect(replayStateVotingContextArtifacts(root)).toEqual([
      {
        path: "public/data/state-voting/v1/DC.json",
        reason: "is not tracked but was generated",
      },
      {
        path: "public/data/state-voting/v1/EXTRA.json",
        reason: "is tracked but was not generated",
      },
      {
        path: "public/data/state-voting/v1/KY.json",
        reason: expect.stringContaining("differs at line"),
      },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
