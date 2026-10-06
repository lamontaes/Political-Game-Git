import { createRoot } from "react-dom/client";
import { useState } from "react";
import { GuideHighlighter } from "../../src/player/GuideHighlighter";
import { GuideHelpProvider, GuideTerm } from "../../src/player/GuideTerm";
import { GuideWorkspace } from "../../src/player/GuideWorkspace";
import {
  INITIAL_SHELL_STATE,
  shellReducer,
} from "../../src/presentation/shell-navigation";
import {
  encodeStoredShellState,
  readStoredShellState,
} from "../../src/presentation/browser-shell-state";
import type { EntityId } from "../../src/simulation";
import "../../src/player/guide.css";

const slot = "guide-interaction-fixture";
function Fixture() {
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem(slot);
    const saved = stored ? readStoredShellState(JSON.parse(stored)) : null;
    return saved
      ? { ...INITIAL_SHELL_STATE, preferences: saved.preferences }
      : INITIAL_SHELL_STATE;
  });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const setLearned = (semanticKey: string, learned: boolean) => {
    setState((current) => {
      const next = shellReducer(current, {
        type: "set-guide-term-learned",
        semanticKey,
        learned,
      });
      localStorage.setItem(
        slot,
        JSON.stringify(encodeStoredShellState(slot as EntityId, next)),
      );
      return next;
    });
  };
  return (
    <GuideHelpProvider
      help={{
        learnedKeys: state.preferences.learnedGuideTermKeys,
        setLearned,
        openGuide: setOpenKey,
      }}
    >
      <main>
        <p data-testid="prose">The quorum is required.</p>
        <p>A filing deadline applies.</p>
        <button data-testid="unrelated">quorum</button>
        <p>
          <GuideTerm semanticKey="veto">veto</GuideTerm>
        </p>
      </main>
      <GuideHighlighter root={() => document.querySelector("main")} />
      {openKey ? (
        <GuideWorkspace
          learnedKeys={state.preferences.learnedGuideTermKeys}
          onSetLearned={setLearned}
          openKey={openKey}
        />
      ) : null}
    </GuideHelpProvider>
  );
}
createRoot(document.getElementById("fixture")!).render(<Fixture />);
