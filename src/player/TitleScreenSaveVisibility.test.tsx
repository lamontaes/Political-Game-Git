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

describe("the title screen distinguishes a set-aside save from none", () => {
  it("does not invite a player to import one when a save was kept", () => {
    const markup = render([], [SET_ASIDE]);
    expect(markup).toContain("1 saved game needs attention");
    expect(markup).not.toContain("None yet");
  });

  it("says why Continue cannot be pressed rather than only disabling it", () => {
    const markup = render([], [SET_ASIDE]);
    expect(markup).toContain("continue-set-aside");
    expect(markup).toContain("Your saved game needs attention");
  });

  it("still invites an import when the store really is empty", () => {
    const markup = render([], []);
    expect(markup).toContain("None yet");
    expect(markup).not.toContain("needs attention");
  });

  it("counts the set-aside ones beside the healthy ones", () => {
    const healthy = {
      saveId: "save-2",
      playerName: "Kian Pearson",
      playerAge: 24,
    } as unknown as BrowserWorldSummary;
    const markup = render([healthy], [SET_ASIDE]);
    expect(markup).toContain("1 saved");
    expect(markup).toContain("1 needs attention");
  });
});

describe("the title screen while the saved lives are being read", () => {
  function renderListing(saveListing: "loading" | "failed"): string {
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

  it("does not say there are none before the list has been read", () => {
    // A 40 MB life takes a while to open; the empty list in the meantime
    // read as "None yet".
    const markup = renderListing("loading");
    expect(markup).not.toContain("None yet");
    expect(markup).toContain("Opening your saved lives");
  });

  it("reports a failed read as a failed read, not blocked storage", () => {
    const markup = renderListing("failed");
    expect(markup).not.toContain("None yet");
    expect(markup).not.toContain("will not let the game store anything");
    expect(markup).toContain("could not be read just now");
    expect(markup).toContain("Nothing was deleted");
    expect(markup).toContain("Try again");
  });
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
    expect(markup).toContain("Watching the world");
    expect(markup).not.toContain("Dana Reyes");
  });
});
