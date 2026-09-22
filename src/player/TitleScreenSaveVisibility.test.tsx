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
