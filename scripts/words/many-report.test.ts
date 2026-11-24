import { describe, expect, it } from "vitest";
import { verdictId } from "../../src/english/judged";
import type { RulePiece } from "../../src/english/line-rules";
import { placedUse, sceneRows, slotRows } from "./many-report";

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
    uses: [{ subject: "scene", role: "asker", key: "favor-asked", ...use }],
  }) as unknown as RulePiece;

const greet = { purpose: "bribe-offer", step: "open", move: "greet" };
const yes = { purpose: "bribe-offer", step: "reply", move: "accept" };
const rare = { purpose: "bribe-offer", step: "follow", move: "warn" };
const routine = { purpose: "bribe-offer", step: "follow", move: "press" };

const pieces = [
  piece("a", "Evening.", greet),
  piece("b", "Good evening.", greet),
  piece("c", "Got a minute?", { ...greet, after: "x" }),
  piece("d", "Fine. I'll take it.", yes),
  piece("e", "You know who sent me.", { ...rare, requiresFacts: ["sent"] }),
  piece("f", "Think it over.", { ...routine, key: "routine" }),
  piece("g", "Think about your kids.", {
    ...routine,
    key: "routine",
    onlyWhen: ["has-children"],
  }),
];
const rewordings = verdictId(["a", "b"], ["Evening.", "Good evening."]);
const row = (rows: ReturnType<typeof slotRows>, end: string) =>
  rows.find((entry) => entry.slot.endsWith(end))!;

describe("words: the counted many report", () => {
  it("gathers a spot's variants whatever line they answer, and counts rewordings once", () => {
    const rows = slotRows(pieces, {
      yes: new Set(),
      no: new Map([[rewordings, {}]]),
    });
    const open = row(rows, "open/greet/asker");
    expect([open.variants, open.counted, open.judged]).toEqual([3, 2, "no"]);
    expect([open.cls, open.floor]).toEqual(["common", 8]);
  });

  it("gives a scene's own yes the scene's floor, and a spot whose every variant needs a fact the floor of two", () => {
    const rows = slotRows(pieces, {
      yes: new Set([rewordings]),
      no: new Map(),
    });
    expect(row(rows, "open/greet/asker").counted).toBe(3);
    const accept = row(rows, "reply/accept/asker");
    expect([accept.cls, accept.floor, accept.counted]).toEqual(["once", 4, 1]);
    expect([row(rows, "follow/warn/asker").cls]).toEqual(["rare"]);
  });

  it("counts a routine line placed by nothing as zero and lists it apart", () => {
    const rows = slotRows(pieces, { yes: new Set(), no: new Map() });
    const press = rows.find((entry) => entry.slot.includes("/routine/"))!;
    expect([press.variants, press.counted, press.unplaced]).toEqual([2, 1, 1]);
    expect(placedUse({ key: "routine", subject: "scene" })).toBe(false);
    expect(placedUse({ key: "routine", subject: "work" })).toBe(true);
  });

  it("counts a scene type's arcs as its versions, and one when it has none", () => {
    const rows = sceneRows(["bribe-offer", "witness-stake", "press-comment"], {
      "bribe-offer": { variants: { plain: {}, small: {} } },
    });
    expect(
      rows.map((entry) => [entry.purpose, entry.group, entry.versions]),
    ).toEqual([
      ["bribe-offer", "corruption", 2],
      ["witness-stake", "legislating", 1],
      ["press-comment", "other", 1],
    ]);
  });
});
