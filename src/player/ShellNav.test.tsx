import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { advanceWorldMinutes } from "../simulation/time-work";
import { proseWeekdayDate } from "../presentation/prose-dates";
import type { World } from "../simulation";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  describeTimeCommandPreview,
  previewTimeCommand,
} from "../presentation/time-command";
import {
  describeTimeTarget,
  skipToLabel,
} from "../presentation/time-target-label";

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
    expect(layout[0]).toEqual({ x: 0, y: -150, ring: 0 });
    expect(layout.filter((at) => at.ring === 0)).toHaveLength(3);
    expect(layout.filter((at) => at.ring === 1)).toHaveLength(4);
    expect(layout.filter((at) => at.ring === 2)).toHaveLength(3);
    // Everything opens up and to the right of the portrait.
    for (const at of layout) {
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeLessThan(0);
    }
  });

  it("keeps neighbors on a ring far enough apart that entries never touch", () => {
    // The actual 4.4rem menu disc plus a visible 8px gap.
    const entry = 4.4 * 16 + 8;
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

  it("keeps the full fan inside the smallest viewport that enables it", () => {
    const layout = fanLayout(10);
    const left = Math.min(...layout.map((at) => at.x));
    const right = Math.max(...layout.map((at) => at.x));
    const top = Math.min(...layout.map((at) => at.y));
    const bottom = Math.max(...layout.map((at) => at.y));
    // CSS enables the radial fan at 761 by 700. Its center remains within
    // 50px of the left edge and 54px of the bottom edge; the discs are 4.4rem.
    const radius = (4.4 * 16) / 2;
    expect(50 + right + radius).toBeLessThan(761);
    expect(54 - top + radius).toBeLessThan(700);
    expect(50 + left - radius).toBeGreaterThanOrEqual(0);
    expect(54 - bottom - radius).toBeGreaterThanOrEqual(0);
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

  it("keeps Day, Week and Until needed available in a child's life", () => {
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
    const untilNeeded = previewTimeCommand(child.world, child.playerPersonId, {
      kind: "quiet-stretch",
    });
    expect(day).not.toBeNull();
    expect(week).not.toBeNull();
    expect(untilNeeded).not.toBeNull();
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
        onPassUntilNeeded={() => {}}
        passTargets={{
          day: skipToLabel(day!.target),
          week: skipToLabel(week!.target),
          untilNeeded: describeTimeCommandPreview(untilNeeded!),
        }}
      />,
    );
    expect(html).toContain('data-testid="shell-pass-day"');
    expect(html).toContain('data-testid="shell-pass-week"');
    expect(html).toContain('data-testid="shell-pass-until-needed"');
    expect(html).toContain(skipToLabel(day!.target));
    expect(html).toContain(skipToLabel(week!.target));
    expect(html).toContain(describeTimeCommandPreview(untilNeeded!));
  });

  it("leaves an already due Work decision in the player's hands", () => {
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
        onPassUntilNeeded={() => {}}
        passTargets={{
          day: "Tomorrow",
          week: "Next week",
          untilNeeded: null,
          untilNeededReason:
            "Resolve the decision under Work before another quiet stretch.",
        }}
      />,
    );
    expect(html).toMatch(
      /data-testid="shell-pass-until-needed"[^>]*aria-disabled="true"/,
    );
    expect(html).toContain("Resolve the decision under Work");
  });
});

// Append independently of the original cases and render helper.
function renderReceivedClockWorld(
  world: World,
  targets: { day: string; week: string; untilNeeded: string | null },
) {
  return renderToStaticMarkup(
    <ShellNav
      state={INITIAL_SHELL_STATE}
      dispatch={() => {}}
      playerName={
        world.people[
          world.control.kind === "person"
            ? world.control.personId
            : world.personOrder[0]!
        ]!.givenName
      }
      dateLabel={proseWeekdayDate(world.currentDate)}
      currentMoment={world.currentMoment}
      placeName={null}
      destinations={DESTINATIONS}
      canSave
      unsaved={false}
      onSave={() => {}}
      onLeave={() => {}}
      onPassDays={() => {}}
      onPassUntilNeeded={() => {}}
      passTargets={targets}
    />,
  );
}

function receivedClockLabel(html: string) {
  const date = html.match(/data-testid="story-when"[^>]*>([^<]*)</);
  const time = html.match(/data-testid="story-time"[^>]*>([^<]*)</);
  expect(date).not.toBeNull();
  expect(time).not.toBeNull();
  expect(html).not.toContain('data-testid="shell-current-clock"');
  expect(html).not.toContain('data-testid="shell-pass-targets"');
  expect(html.match(/data-testid="story-when"/g)).toHaveLength(1);
  expect(html.match(/data-testid="story-time"/g)).toHaveLength(1);
  return date![1]! + ", " + time![1]!;
}

describe("the shell bar displays the received world's actual clock", () => {
  const places = lifePlaceStateIdentities();
  it("uses all 56 canonical state and territory identities", () => {
    expect(places).toHaveLength(56);
    expect(new Set(places.map((place) => place.jurisdictionKey)).size).toBe(56);
  });
  it.each(places)(
    "updates the current clock independently of skip targets in $name",
    (place: (typeof places)[number]) => {
      const initial = smallWorld({
        place: place.jurisdictionKey,
        people: 4,
        seed: `team7-current-clock:${place.jurisdictionKey}`,
      }).world;
      const personId =
        initial.control.kind === "person"
          ? initial.control.personId
          : initial.personOrder[0]!;
      const day = previewTimeCommand(initial, personId, {
        kind: "days",
        days: 1,
      });
      const week = previewTimeCommand(initial, personId, {
        kind: "days",
        days: 7,
      });
      expect(day).not.toBeNull();
      expect(week).not.toBeNull();
      const targets = {
        day: skipToLabel(day!.target),
        week: skipToLabel(week!.target),
        untilNeeded: null,
      };
      const beforeHistory = initial.history;
      const first = renderReceivedClockWorld(initial, targets);
      expect(receivedClockLabel(first)).toContain(
        describeTimeTarget(initial.currentMoment),
      );
      expect(initial.history).toBe(beforeHistory);
      const later = advanceWorldMinutes(initial, 37);
      expect(later.currentMoment).not.toEqual(initial.currentMoment);
      const second = renderReceivedClockWorld(later, targets);
      expect(receivedClockLabel(second)).toContain(
        describeTimeTarget(later.currentMoment),
      );
      expect(receivedClockLabel(second)).not.toContain(
        describeTimeTarget(initial.currentMoment),
      );
      for (const html of [first, second]) {
        expect(html).toContain(targets.day);
        expect(html).toContain(targets.week);
        expect(receivedClockLabel(html)).not.toContain(targets.day);
        expect(receivedClockLabel(html)).not.toContain(targets.week);
      }
      // Re-rendering the received world keeps the clock and creates no time.
      const laterMoment = later.currentMoment;
      const laterHistory = later.history;
      expect(receivedClockLabel(renderReceivedClockWorld(later, targets))).toBe(
        receivedClockLabel(second),
      );
      expect(later.currentMoment).toBe(laterMoment);
      expect(later.history).toBe(laterHistory);
    },
  );
});
it("names a civic calendar choice without routing it to Work", () => {
  const html = renderToStaticMarkup(
    <ShellNav
      state={INITIAL_SHELL_STATE}
      dispatch={() => {}}
      playerName="Jordan"
      dateLabel="Tuesday"
      placeName={null}
      destinations={DESTINATIONS}
      canSave
      unsaved={false}
      onSave={() => {}}
      onLeave={() => {}}
      onPassDays={() => {}}
      onPassUntilNeeded={() => {}}
      passTargets={{
        day: "Tomorrow",
        week: "Next week",
        untilNeeded: null,
        untilNeededReason:
          "Resident meeting is waiting on your calendar. Decide whether to attend or decline before another quiet stretch.",
      }}
    />,
  );
  expect(html).toContain("Resident meeting is waiting on your calendar");
  expect(html).not.toContain("under Work");
  expect(html).not.toContain("Work needs you now");
});
