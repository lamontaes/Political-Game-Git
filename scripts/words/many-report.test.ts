import { describe, expect, it } from "vitest";
import { verdictId } from "../../src/english/judged";
import type { RulePiece } from "../../src/english/line-rules";
import { sceneRows, slotRows } from "./many-report";

const piece = (
  key: string,
  text: string,
  use: Record<string, unknown>,
): RulePiece =>
  ({
    bank: "scene-talk",
    key,
    text,
    kind: "",
    move: "",
    uses: [{ subject: "scene", role: "asker", ...use }],
  }) as unknown as RulePiece;

const greet = { purpose: "bribe-offer", step: "open", move: "greet" };
const press = { purpose: "bribe-offer", step: "follow", move: "press" };
const rare = { purpose: "bribe-offer", step: "follow", move: "warn" };

const pieces = [
  piece("a", "Evening.", greet),
  piece("b", "Good evening.", greet),
  piece("c", "Got a minute?", { ...greet, after: "x" }),
  piece("d", "Think it over.", press),
  piece("e", "You know who sent me.", { ...rare, requiresFacts: ["sent"] }),
];
const rewordings = verdictId(["a", "b"], ["Evening.", "Good evening."]);

describe("words: the counted many report", () => {
  it("gathers a spot's variants whatever line they answer, and counts rewordings once", () => {
    const rows = slotRows(pieces, {
      yes: new Set(),
      no: new Map([[rewordings, {}]]),
    });
    const open = rows.find(
      (row) => row.slot === "bribe-offer/open/greet/asker",
    )!;
    expect(open.variants).toBe(3);
    expect(open.counted).toBe(2);
    expect(open.judged).toBe("no");
    expect(open.cls).toBe("common");
    expect(open.floor).toBe(8);
  });

  it("counts every variant of a group judged to differ, and names its floor by how often it is met", () => {
    const rows = slotRows(pieces, {
      yes: new Set([rewordings]),
      no: new Map(),
    });
    expect(
      rows.find((row) => row.slot.endsWith("open/greet/asker"))!.counted,
    ).toBe(3);
    const once = rows.find((row) => row.slot.endsWith("follow/press/asker"))!;
    expect([once.cls, once.floor, once.counted]).toEqual(["once", 4, 1]);
    const tied = rows.find((row) => row.slot.endsWith("follow/warn/asker"))!;
    expect([tied.cls, tied.floor]).toEqual(["rare", 2]);
  });

  it("counts a scene type's arcs as its versions, and one when it has none", () => {
    const rows = sceneRows(["bribe-offer", "first-date"], {
      "bribe-offer": { variants: { plain: {}, small: {} } },
    });
    expect(
      rows.map((row) => [row.purpose, row.group, row.versions, row.floor]),
    ).toEqual([
      ["bribe-offer", "corruption", 2, 30],
      ["first-date", "other", 1, 3],
    ]);
  });
});
