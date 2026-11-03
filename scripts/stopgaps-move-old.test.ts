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
