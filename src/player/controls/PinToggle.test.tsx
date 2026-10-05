import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PinToggle } from "./PinToggle";
import {
  INITIAL_SHELL_STATE,
  shellReducer,
  isPinned,
} from "../../presentation/shell-navigation";
import {
  EMPTY_SHELL_STATE,
  encodeStoredShellState,
  readStoredShellState,
} from "../../presentation/browser-shell-state";
import type { EntityId } from "../../simulation";

describe("PinToggle", () => {
  it.each(["place", "government"])(
    "keeps accessible action/state and a %s inspection label",
    (noun) => {
      for (const pinned of [false, true]) {
        const html = renderToStaticMarkup(
          <PinToggle
            pinned={pinned}
            name="Controlled item"
            noun={noun}
            testid="t"
            onToggle={() => {}}
          />,
        );
        expect(html).toContain(`aria-pressed="${pinned}"`);
        expect(html).toContain(
          `aria-label="${pinned ? "Unpin" : "Pin"} Controlled item"`,
        );
        expect(html).toContain(`data-pin-label="${noun}: Controlled item"`);
        expect(html).toContain("pg-pin-icon");
        expect(html).not.toMatch(/>Pin<|>Unpin<|[★☆]/);
        expect(html).not.toContain("<span");
      }
    },
  );

  it("retains the existing writer and validated saved government pin, without introducing a place ref", () => {
    const ref = { kind: "government" as const, id: "controlled-government" };
    const on = shellReducer(INITIAL_SHELL_STATE, { type: "toggle-pin", ref });
    expect(isPinned(on, ref)).toBe(true);
    const encoded = encodeStoredShellState("controlled-save" as EntityId, {
      ...EMPTY_SHELL_STATE,
      pins: on.pins,
      preferences: on.preferences,
    });
    const loaded = readStoredShellState(JSON.parse(JSON.stringify(encoded)))!;
    expect(loaded.pins).toEqual(on.pins);
    const restored = shellReducer(INITIAL_SHELL_STATE, {
      type: "restore",
      pins: loaded.pins,
      preferences: loaded.preferences,
    });
    expect(isPinned(restored, ref)).toBe(true);
    const off = shellReducer(restored, { type: "toggle-pin", ref });
    expect(isPinned(off, ref)).toBe(false);
    expect(on.pins).toHaveLength(1);
  });
});
