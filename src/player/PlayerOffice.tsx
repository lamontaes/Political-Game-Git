import { useEffect, useMemo, useReducer } from "react";

import {
  createRunAFixture,
  parseRunAFixtureState,
} from "../presentation/run-a-fixture";
import {
  loadLearnedConcepts,
  persistLearnedConcepts,
} from "../presentation/run-a-learning";
import { projectRunAFixtureDossier } from "../presentation/run-a-projection";
import { createRunAUiState, runAUiReducer } from "../presentation/run-a-state";
import { OfficeScene } from "./OfficeScene";
import { PermanentShell } from "./PermanentShell";

function formatRunADate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function PlayerOffice() {
  const fixture = useMemo(createRunAFixture, []);
  const dossier = useMemo(() => projectRunAFixtureDossier(fixture), [fixture]);
  const fixtureState = parseRunAFixtureState(
    new URLSearchParams(window.location.search).get("fixture"),
  );
  const [state, dispatch] = useReducer(runAUiReducer, undefined, () =>
    createRunAUiState({
      simulationDate: fixture.world.currentDate,
      simulationActionSequence: fixture.world.actionSequence,
      scenePersonId: fixture.scenePerson.personId,
      fixtureState,
      learnedConceptIds: loadLearnedConcepts(window.localStorage),
    }),
  );

  useEffect(() => {
    persistLearnedConcepts(window.localStorage, state.learnedConceptIds);
  }, [state.learnedConceptIds]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;

    if (state.overlay !== "none") {
      dispatch({ type: "dismiss-overlay" });
    } else if (state.navigation !== "closed") {
      dispatch({ type: "close-navigation" });
    }
  }

  return (
    <main
      className="player-office"
      data-testid="player-office"
      data-simulation-date={state.simulationDate}
      data-action-sequence={state.simulationActionSequence}
      onKeyDown={handleKeyDown}
    >
      <div className="scene-caption">
        <p>Legislative Office</p>
        <span>{fixture.locationDetail}</span>
      </div>

      <OfficeScene
        fixture={fixture}
        dossier={dossier}
        state={state}
        dispatch={dispatch}
      />
      <PermanentShell
        fixture={fixture}
        formattedDate={formatRunADate(fixture.world.currentDate)}
        state={state}
        dispatch={dispatch}
      />
      <p className="sr-only" role="status" aria-live="polite">
        Simulation date remains {state.simulationDate}.
      </p>
    </main>
  );
}
