import { describe, expect, it } from "vitest";
import type { LineRule } from "../../src/english/line-rules";
import { checkedVerdicts, entriesOf, plantedBatches } from "./review";

const rule = {
  id: "reply-second-move-follows-the-first",
  says: "A reply's second move follows from its first.",
  from: [{ date: "2026-11-13", words: "it has to follow." }],
} as unknown as LineRule;

const entries = entriesOf({
  lines: Array.from({ length: 200 }, (_, n) => ({
    line: `Reply ${n}.`,
    after: [{ id: `pair${n}`, line: `Question ${n}?` }],
  })),
});

const idsOf = (text: string) =>
  [...text.matchAll(/^### (\S+)$/gm)].map((m) => m[1]!);

describe("words:review", () => {
  it("plants two that pass and one that fails in every batch, the key kept apart", () => {
    const { files, key } = plantedBatches(rule, entries);
    expect(files.size).toBe(1);
    const ids = idsOf([...files.values()][0]!);
    expect(ids).toHaveLength(203);
    const plants = ids.filter((id) => id in key);
    expect(plants.map((id) => key[id]).sort()).toEqual([false, true, true]);
    expect([...files.values()][0]).not.toMatch(/"passes"|^### plant/im);
  });

  it("places the plants the same way every run", () => {
    expect(plantedBatches(rule, entries)).toEqual(
      plantedBatches(rule, entries),
    );
  });

  it("drops the plants from a batch that caught them, and refuses one that missed", () => {
    const { files, key } = plantedBatches(rule, entries);
    const ids = idsOf([...files.values()][0]!);
    const right = ids.map((id) => ({
      id,
      passes: id in key ? key[id]! : true,
      why: "",
    }));
    const kept = checkedVerdicts(
      new Map([["01.md", { ids, file: { rule: rule.id, verdicts: right } }]]),
      key,
    );
    expect(kept.refused).toEqual([]);
    expect(kept.verdicts).toHaveLength(200);
    expect(kept.verdicts.some((row) => row.id in key)).toBe(false);

    const yesToAll = ids.map((id) => ({ id, passes: true, why: "" }));
    const refused = checkedVerdicts(
      new Map([
        ["01.md", { ids, file: { rule: rule.id, verdicts: yesToAll } }],
      ]),
      key,
    );
    expect(refused.verdicts).toEqual([]);
    expect(refused.refused[0]).toMatch(/^01\.md: missed plant/);

    const short = checkedVerdicts(
      new Map([
        ["01.md", { ids, file: { rule: rule.id, verdicts: right.slice(1) } }],
      ]),
      key,
    );
    expect(short.refused[0]).toMatch(/1 entries with no verdict/);
  });
});
