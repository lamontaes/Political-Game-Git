import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { previewTimeCommand } from "../presentation/time-command";
import { skipToLabel } from "../presentation/time-target-label";

import {
  INITIAL_SHELL_STATE,
  shellReducer,
  type ShellState,
} from "../presentation/shell-navigation";
import { ShellNav, type ShellDestination } from "./ShellNav";

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
      'aria-label="Jordan Avery Price. Tuesday, January 20, 2026. Somewhere on record. Open game menu."',
    );
    // A figure never sits inside the button.
    const cluster = html.match(
      /<button[^>]*data-testid="shell-nav-cluster"[\s\S]*?<\/button>/,
    )?.[0];
    expect(cluster).toBeDefined();
    expect(cluster).not.toContain("<figure");
  });

  it("falls back to initials in the same circle when no portrait is available", () => {
    const html = render(INITIAL_SHELL_STATE);
    expect(html).toContain('data-fallback="initials"');
    expect(html).toContain('<span class="pg-nav-initials">JP</span>');
  });

  it("keeps seven labeled sections visible with the corner menu closed", () => {
    const html = render(INITIAL_SHELL_STATE);
    expect(html).toContain('data-testid="shell-menu-bar"');
    for (const testid of [
      "nav-calendar",
      "elsewhere-people",
      "nav-politics",
      "nav-news",
      "nav-journal-entry",
      "nav-group-personal",
      "nav-places",
    ]) {
      expect(html).toContain(`data-testid="${testid}"`);
    }
    expect(html).not.toContain('data-testid="shell-nav-flyout"');
    expect(html).not.toContain("--fan-x");
  });

  it("opens Save, Options, and Return in one corner menu", () => {
    const open = shellReducer(INITIAL_SHELL_STATE, {
      type: "toggle-navigation",
    });
    const html = render(open);
    expect(html).toContain('role="menu"');
    const items = html.match(/role="menuitem"/g) ?? [];
    expect(items).toHaveLength(3);
    expect(html).toContain('data-testid="nav-group-personal"');
    expect(html).toContain('data-testid="save-world"');
    expect(html).toContain('data-testid="nav-options"');
    expect(html).toContain('data-testid="leave-game"');
  });

  it("gives a section submenu a way back to the bar", () => {
    const sub = shellReducer(
      shellReducer(INITIAL_SHELL_STATE, { type: "toggle-navigation" }),
      { type: "open-nav-submenu", submenu: "personal" },
    );
    const html = render(sub);
    expect(html).toContain('data-level="submenu"');
    expect(html).toContain('data-testid="nav-submenu-back"');
    expect(html).toContain('data-testid="nav-finances"');
  });

  it("shows the leave confirmation as the only open menu layer", () => {
    const open = shellReducer(INITIAL_SHELL_STATE, {
      type: "toggle-navigation",
    });
    const confirming = shellReducer(open, { type: "ask-leave" });
    const html = render(confirming);
    expect(html).toContain('data-testid="leave-confirm"');
    expect(html).not.toContain('data-testid="shell-nav-flyout"');
  });
});

describe("ShellNav section shortcuts", () => {
  it("names the seven keyboard shortcuts on the corresponding bar buttons", () => {
    const html = render(INITIAL_SHELL_STATE);
    for (let shortcut = 1; shortcut <= 7; shortcut += 1) {
      expect(html).toContain(`aria-keyshortcuts="Alt+Shift+${shortcut}"`);
    }
    expect(html.match(/aria-keyshortcuts=/g)).toHaveLength(7);
  });
});

describe("ShellNav interrupt checklist", () => {
  it("offers what passing time stops for beside Day and Week, closed until asked", () => {
    const html = renderToStaticMarkup(
      <ShellNav
        state={INITIAL_SHELL_STATE}
        dispatch={() => {}}
        playerName="Jordan Avery Price"
        dateLabel="Tuesday, January 20, 2026"
        placeName={null}
        destinations={DESTINATIONS}
        canSave
        unsaved={false}
        onSave={() => {}}
        onLeave={() => {}}
        onPassDays={() => {}}
      />,
    );
    expect(html).toMatch(
      /data-testid="shell-day-controls"[\s\S]*data-testid="shell-stops-toggle"/,
    );
    expect(html).toMatch(
      /data-testid="shell-stops-toggle"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*data-testid="shell-stops-toggle"/,
    );
    expect(html).not.toContain('data-testid="shell-stops"');
  });

  it("keeps both shell clock controls available in a child's life", () => {
    const child = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "child-shell-day-week",
      startKind: "custom",
      startAge: 8,
    });
    const day = previewTimeCommand(child.world, child.playerPersonId, {
      kind: "days",
      days: 1,
    });
    const week = previewTimeCommand(child.world, child.playerPersonId, {
      kind: "days",
      days: 7,
    });
    expect(day).not.toBeNull();
    expect(week).not.toBeNull();
    const html = renderToStaticMarkup(
      <ShellNav
        state={INITIAL_SHELL_STATE}
        dispatch={() => {}}
        playerName={child.world.people[child.playerPersonId]!.givenName}
        dateLabel={child.world.currentDate}
        placeName={null}
        destinations={DESTINATIONS}
        canSave
        unsaved={false}
        onSave={() => {}}
        onLeave={() => {}}
        onPassDays={() => {}}
        passTargets={{
          day: skipToLabel(day!.target),
          week: skipToLabel(week!.target),
        }}
      />,
    );
    expect(html).toContain('data-testid="shell-pass-day"');
    expect(html).toContain('data-testid="shell-pass-week"');
    expect(html).toContain(skipToLabel(day!.target));
    expect(html).toContain(skipToLabel(week!.target));
  });
});
