import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_SHELL_STATE } from "../presentation/shell-navigation";
import { OptionsWorkspace } from "./ShellWorkspaces";

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
          onOpenPatchNotes={() => {}}
        />,
      );
      expect(markup).not.toContain("Daily notes");
      expect(markup).not.toContain("Show morning note");
      expect(markup).not.toContain("A morning note reads");
      expect(markup).not.toContain("option-morning-thoughts");
      expect(markup).toContain("Date format");
      expect(markup).toContain("People default view");
      expect(markup).toContain("Default pin size");
      expect(markup).toContain("reduced-motion");
      expect(markup).toContain('data-testid="nav-patch-notes"');
      expect(JSON.stringify(state)).toBe(before);
      expect(dispatch).not.toHaveBeenCalled();
    },
  );
});
