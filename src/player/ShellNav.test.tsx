import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  INITIAL_SHELL_STATE,
  shellReducer,
  type ShellState,
} from "../presentation/shell-navigation";
import {
  FAN_RINGS,
  fanLayout,
  ShellNav,
  type ShellDestination,
} from "./ShellNav";

const DESTINATIONS: readonly ShellDestination[] = [
  ["calendar", "calendar", "nav-calendar"],
  ["people", "people", "elsewhere-people"],
  ["politics", "politics", "nav-politics"],
  ["news", "news", "nav-news"],
  ["journal", "journal", "nav-journal-entry"],
  ["personal", "personal", "nav-personal"],
  ["finances", "personal", "nav-finances"],
  ["jobs", "personal", "nav-jobs"],
  ["places", "travel", "nav-places"],
  ["options", "options", "nav-options"],
].map(([surface, group, testid]) => ({
  surface: surface as ShellDestination["surface"],
  label: surface!,
  hint: "",
  testid: testid!,
  open: false,
  group: group as ShellDestination["group"],
}));

function render(state: ShellState, portrait?: ReactNode) {
  return renderToStaticMarkup(
    <ShellNav
      state={state}
      dispatch={() => {}}
      playerName="Jordan Avery Price"
      {...(portrait ? { portrait } : {})}
      dateLabel="Tuesday, January 20, 2026"
      placeName={null}
      destinations={DESTINATIONS}
      canSave
      unsaved={false}
      onSave={() => {}}
      onLeave={() => {}}
    />,
  );
}

describe("ShellNav portrait hub", () => {
  it("centers the closed cluster on the player's own portrait", () => {
    const html = render(
      INITIAL_SHELL_STATE,
      <figure data-testid="person-portrait" />,
    );
    expect(html).toContain('data-testid="shell-nav-portrait"');
    expect(html).toMatch(
      /data-testid="shell-nav-portrait"[^>]*aria-hidden="true"[^>]*><figure data-testid="person-portrait">/,
    );
    expect(html).toContain('data-state="rest"');
    // The label still names who, when and where, and says so to a reader.
    expect(html).toContain("Jordan Avery Price");
    expect(html).toContain("Tuesday, January 20, 2026");
    expect(html).toContain(
      'aria-label="Jordan Avery Price. Tuesday, January 20, 2026. Somewhere on record. Open navigation."',
    );
    // A figure never sits inside the button.
    expect(html).not.toMatch(
      /<button[^>]*shell-nav-cluster[\s\S]*?<figure[\s\S]*?<\/button>/,
    );
  });

  it("falls back to initials in the same circle when no portrait is available", () => {
    const html = render(INITIAL_SHELL_STATE);
    expect(html).toContain('data-fallback="initials"');
    expect(html).toContain('<span class="pg-nav-initials">JP</span>');
  });

  it("opens the same menu, each entry carrying its place in the fan", () => {
    const open = shellReducer(INITIAL_SHELL_STATE, {
      type: "toggle-navigation",
    });
    const html = render(open);
    expect(html).toContain('role="menu"');
    const items = html.match(/role="menuitem"/g) ?? [];
    // Seven single groups, one Personal group, Save and Quit.
    expect(items).toHaveLength(10);
    expect(html).toContain('data-testid="nav-group-personal"');
    expect(html).toContain('data-testid="save-world"');
    expect(html).toContain('data-testid="leave-game"');
    expect(html.match(/--fan-x:/g)).toHaveLength(10);
  });

  it("gives a submenu its way back as the first fanned entry", () => {
    const sub = shellReducer(
      shellReducer(INITIAL_SHELL_STATE, { type: "toggle-navigation" }),
      { type: "open-nav-submenu", submenu: "personal" },
    );
    const html = render(sub);
    expect(html).toContain('data-level="submenu"');
    expect(html).toMatch(
      /data-testid="nav-submenu-back" style="--fan-x:0px;--fan-y:-140px/,
    );
    expect(html).toContain('data-testid="nav-finances"');
  });
});

describe("fanLayout", () => {
  it("fills the inner ring first, straight up, then opens a further ring", () => {
    const layout = fanLayout(10);
    expect(layout).toHaveLength(10);
    expect(layout[0]).toEqual({ x: 0, y: -140, ring: 0 });
    expect(layout.filter((at) => at.ring === 0)).toHaveLength(3);
    expect(layout.filter((at) => at.ring === 1)).toHaveLength(5);
    expect(layout.filter((at) => at.ring === 2)).toHaveLength(2);
    // Everything opens up and to the right of the portrait.
    for (const at of layout) {
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeLessThan(0);
    }
  });

  it("keeps neighbors on a ring far enough apart that entries never touch", () => {
    // An entry's width plus a visible margin between neighbors.
    const entry = 3.9 * 16 + 4;
    const layout = fanLayout(18);
    for (const ring of FAN_RINGS.keys()) {
      const points = layout.filter((at) => at.ring === ring);
      for (let i = 1; i < points.length; i += 1) {
        const gap = Math.hypot(
          points[i]!.x - points[i - 1]!.x,
          points[i]!.y - points[i - 1]!.y,
        );
        expect(gap).toBeGreaterThan(entry);
      }
    }
  });

  it("fits the tallest ring used by the full menu inside a 768-pixel window", () => {
    const top = Math.min(...fanLayout(10).map((at) => at.y));
    // Portrait center sits about 54px above the bottom edge; entries are 62px.
    expect(54 - top + 31).toBeLessThan(768);
  });
});
