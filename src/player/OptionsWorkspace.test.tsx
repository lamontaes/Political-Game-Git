import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_SHELL_STATE } from "../presentation/shell-navigation";
import { OptionsWorkspace } from "./ShellWorkspaces";
import { CHALLENGE_INTENSITY_OPTIONS } from "../simulation/play-settings";

describe("Options after the morning-note presentation is retired", () => {
  it.each([true, false])(
    "preserves a saved morningThoughts=%s preference without offering its control",
    (morningThoughts) => {
      const state = {
        ...INITIAL_SHELL_STATE,
        preferences: { ...INITIAL_SHELL_STATE.preferences, morningThoughts },
      };
      const before = JSON.stringify(state);
      const dispatch = vi.fn();
      const markup = renderToStaticMarkup(
        <OptionsWorkspace
          state={state}
          dispatch={dispatch}
          challengeIntensity="standard"
          onChangeChallengeIntensity={() => {}}
          notesVisibility="full"
          onChangeNotesVisibility={() => {}}
          onOpenPatchNotes={() => {}}
        />,
      );
      expect(markup).not.toContain("Daily notes");
      expect(markup).not.toContain("Show morning note");
      expect(markup).not.toContain("A morning note reads");
      expect(markup).not.toContain("option-morning-thoughts");
      expect(markup).toContain("Date format");
      for (const option of CHALLENGE_INTENSITY_OPTIONS) {
        expect(markup).toContain(option.label);
        expect(markup).toContain(
          `data-testid="option-challenge-${option.value}"`,
        );
      }
      expect(markup).toContain("Notes");
      for (const value of ["full", "light", "none"])
        expect(markup).toContain(`data-testid="option-notes-${value}"`);
      expect(markup).toContain("People default view");
      expect(markup).toContain("Default pin size");
      expect(markup).not.toContain("reduced-motion");
      expect(markup).toContain('data-testid="nav-patch-notes"');
      expect(JSON.stringify(state)).toBe(before);
      expect(dispatch).not.toHaveBeenCalled();
    },
  );
});
