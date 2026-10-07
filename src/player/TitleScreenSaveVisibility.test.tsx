import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The desktop bridge reads `window`, which this renderer has no need of.
vi.mock("./native-session-bridge", () => ({
  nativeQuitAvailable: () => false,
  requestNativeQuit: () => {},
}));

import type {
  BrowserWorldSummary,
  QuarantinedSave,
} from "../presentation/browser-world-repository";
import { TitleScreen } from "./TitleScreen";

/**
 * The title screen has to tell a kept-but-unopenable save from no save at all.
 *
 * A player whose only life was written by a newer build read "None yet · import
 * one" and found Continue dead, on the screen meant to be the last word — while
 * the store had deliberately kept that save and says so on the saves screen.
 * The two surfaces disagreed because only one of them was ever told.
 */
const SET_ASIDE: QuarantinedSave = {
  saveId: "save-1" as never,
  defect: "unsupported-version",
  reason: "One saved game was written by a newer version of the game.",
  mightBeReadableLater: true,
  savedAt: "2026-09-21T12:00:00.000Z",
};

function render(
  saves: readonly BrowserWorldSummary[],
  damaged: readonly QuarantinedSave[],
): string {
  return renderToStaticMarkup(
    <TitleScreen
      saves={saves}
      damaged={damaged}
      savesUnavailable={false}
      problem={null}
      onNewGame={() => {}}
      onContinue={() => {}}
      onOpenSaves={() => {}}
      onOpenOptions={() => {}}
    />,
  );
}

describe("the title screen shows saved-game counts as data only", () => {
  it("shows the set-aside count on Continue and on Saved games", () => {
    const markup = render([], [SET_ASIDE]);
    expect(markup).toMatch(/data-testid="continue-set-aside">1</);
    expect(markup).toMatch(/Saved games<small>0 · 1</);
  });

  it("shows nothing under Saved games when the store is empty", () => {
    const markup = render([], []);
    expect(markup).not.toContain("continue-set-aside");
    expect(markup).not.toContain("<small>");
  });

  it("counts the set-aside ones beside the healthy ones", () => {
    const healthy = {
      saveId: "save-2",
      playerName: "Kian Pearson",
      playerAge: 24,
    } as unknown as BrowserWorldSummary;
    const markup = render([healthy], [SET_ASIDE]);
    expect(markup).toMatch(/Saved games<small>1 · 1</);
  });
});

describe("the title screen while the saved lives are being read", () => {
  function renderListing(
    saveListing: "loading" | "failed" | "outdated",
  ): string {
    return renderToStaticMarkup(
      <TitleScreen
        saves={[]}
        savesUnavailable={false}
        saveListing={saveListing}
        onRetrySaves={() => {}}
        problem={null}
        onNewGame={() => {}}
        onContinue={() => {}}
        onOpenSaves={() => {}}
        onOpenOptions={() => {}}
      />,
    );
  }

  it("shows no line while the list is being read", () => {
    const markup = renderListing("loading");
    expect(markup).toContain('data-listing="loading"');
    expect(markup).not.toContain("<small>");
    expect(markup).not.toContain('<p class="game-');
  });

  it("offers only Try again for a failed read", () => {
    const markup = renderListing("failed");
    expect(markup).toContain('data-testid="saves-unread"');
    expect(markup).toContain("Try again");
    expect(markup).not.toContain('<p class="game-');
  });

  it("offers only Reload when the saves were kept by a newer version", () => {
    const markup = renderListing("outdated");
    expect(markup).toContain('data-testid="saves-outdated"');
    expect(markup).toContain("Reload");
    expect(markup).not.toContain("Try again");
    expect(markup).not.toContain('<p class="game-');
  });
});

describe("the title and saves screens carry no authored sentence", () => {
  it.each(["TitleScreen.tsx", "SavesScreen.tsx", "TitleTableau.tsx"])(
    "%s has no sentence literal",
    (file) => {
      const text = readFileSync(join(__dirname, file), "utf8")
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join("\n");
      expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
      expect(text.match(/>[A-Z][a-z ,]{25,}/g) ?? []).toEqual([]);
    },
  );
});

describe("Observer Mode on the title screen", () => {
  it("offers watching the world in one press", () => {
    const markup = renderToStaticMarkup(
      <TitleScreen
        saves={[]}
        savesUnavailable={false}
        problem={null}
        onNewGame={() => {}}
        onWatch={() => {}}
        onContinue={() => {}}
        onOpenSaves={() => {}}
        onOpenOptions={() => {}}
      />,
    );
    expect(markup).toContain('data-testid="watch-world"');
    expect(markup).toContain("Watch the world");
    expect(markup).not.toMatch(/runs on its own|Nobody play/i);
  });

  it("does not present a watched world's resident as a played life", () => {
    const watched = {
      saveId: "save-3",
      playerName: "Dana Reyes",
      playerAge: 41,
      observing: true,
      residence: { jurisdictionId: "j", name: "Webster Groves" },
    } as unknown as BrowserWorldSummary;
    const markup = render([watched], []);
    expect(markup).not.toContain("Dana Reyes");
    expect(markup).toContain("Webster Groves");
  });

  it("names the saved character's role beside their name", () => {
    const senator = {
      saveId: "save-4",
      playerName: "Ada Moss",
      playerAge: 52,
      residence: { jurisdictionId: "j", name: "Frankfort" },
      playerRole: {
        kind: "state-legislator",
        title: "State Senator",
        stateUsps: "KY",
        chamber: "senate",
      },
    } as unknown as BrowserWorldSummary;
    const markup = render([senator], []);
    expect(markup).toContain(
      "Ada Moss, 52 \u00b7 State Senator \u00b7 Frankfort",
    );
  });
});
