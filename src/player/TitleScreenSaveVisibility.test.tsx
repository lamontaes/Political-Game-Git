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

describe("the title screen shows record values and approved controls", () => {
  it("keeps the game name and Continue without menu copy", () => {
    const markup = render([], [SET_ASIDE]);
    expect(markup).toContain("Our Civic Duty");
    expect(markup).toContain(">Continue</button>");
    expect(markup).toContain(">Back</button>");
    expect(markup).not.toMatch(
      /New game|Watch the world|Saved games|Options|Quit/,
    );
    expect(markup).not.toMatch(/needs attention|Try again|Reload/);
  });

  it("shows no record list when the store is empty", () => {
    const markup = render([], []);
    expect(markup).not.toContain("title-save-records");
  });

  it("shows saved names, places and dates as record values", () => {
    const healthy = {
      saveId: "save-2",
      playerName: "Kian Pearson",
      playerAge: 24,
      residence: { jurisdictionId: "j", name: "Albany" },
      currentMoment: { date: "2026-10-06" },
    } as unknown as BrowserWorldSummary;
    const markup = render([healthy], [SET_ASIDE]);
    expect(markup).toContain("Kian Pearson");
    expect(markup).toContain("Albany");
    expect(markup).toContain("2026");
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

  it("does not expose a save-loading message", () => {
    const markup = renderListing("loading");
    expect(markup).not.toMatch(/Opening|Loading|Saved games/);
    expect(markup).not.toContain('<p class="game-');
  });

  it("does not expose a save-read error message", () => {
    const markup = renderListing("failed");
    expect(markup).not.toMatch(/Could not be read|Try again/);
    expect(markup).not.toContain('<p class="game-');
  });

  it("does not expose an outdated-save message", () => {
    const markup = renderListing("outdated");
    expect(markup).not.toMatch(/older copy|Reload|Try again/);
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
      currentMoment: { date: "2026-10-06" },
    } as unknown as BrowserWorldSummary;
    const markup = render([senator], []);
    expect(markup).toContain("Ada Moss · 52 · State Senator · Frankfort");
  });
});
