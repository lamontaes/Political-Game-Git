import { describe, expect, it } from "vitest";
import { mergeRows } from "./stopgaps-move-old";

describe("moving a branch's rows from the old register file", () => {
  it("replaces changed rows by id, appends new ones and keeps the rest", () => {
    const current = [
      { id: "SG-GOV-a", status: "open" },
      { id: "SG-PLAY-b", status: "open" },
    ];
    const branch = [
      { id: "SG-GOV-a", status: "resolved" },
      { id: "SG-PLAY-b", status: "open" },
      { id: "SG-GOV-c", status: "open" },
    ];
    expect(mergeRows(current, branch)).toEqual([
      { id: "SG-GOV-a", status: "resolved" },
      { id: "SG-PLAY-b", status: "open" },
      { id: "SG-GOV-c", status: "open" },
    ]);
  });
});

describe("a branch's rows merge field by field onto main's", () => {
  it("takes only the fields the branch changed and keeps main's later changes", async () => {
    const { branchRows } = await import("./stopgaps-move-old");
    const base = [{ id: "SG-GOV-a", line: 1, status: "open", text: "old" }];
    const branch = [
      { id: "SG-GOV-a", line: 5, status: "open", text: "old" },
      { id: "SG-GOV-new", line: 9, status: "open", text: "new" },
    ];
    const main = [
      { id: "SG-GOV-a", line: 1, status: "resolved", text: "newer" },
    ];
    const { rows, conflicts } = branchRows(base, branch, main);
    expect(rows).toEqual([
      { id: "SG-GOV-a", line: 5, status: "resolved", text: "newer" },
      { id: "SG-GOV-new", line: 9, status: "open", text: "new" },
    ]);
    expect(conflicts).toEqual([]);
    const clash = branchRows(base, [{ ...branch[0]!, text: "mine" }], main);
    expect(clash.rows[0]!.text).toBe("newer");
    expect(clash.conflicts).toEqual(["SG-GOV-a.text: kept main's"]);
  });
});
