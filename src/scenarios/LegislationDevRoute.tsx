import { useReviewEnvironment, useReviewStorage } from "../ui/review-context";
import { useEffect, useMemo, useState } from "react";
import {
  createLegislativeScenario,
  type LegislativeScenario,
} from "./legislation";
import {
  legislativeScenarioKeys,
  legislativeBlueprint,
} from "../simulation/legislative-content";
import { projectMeasureBriefing } from "../presentation/legislation-projection";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { MeasureStepKey } from "../simulation/legislation";
import type { World } from "../simulation/types";
import { MeasureView } from "../player/LegislationWorkspace";
const STORAGE_PREFIX = "political-game:legislation:";

function scenarioFromUrl(): string {
  const value = new URLSearchParams(window.location.search).get("place");
  return legislativeScenarioKeys().includes(value ?? "")
    ? (value as string)
    : "kentucky";
}

interface SessionState {
  readonly scenario: LegislativeScenario;
  readonly world: World;
  readonly source: "fresh" | "restored";
}

function startSession(scenarioKey: string, storage: Storage): SessionState {
  const scenario = createLegislativeScenario(scenarioKey);
  const saved = storage.getItem(`${STORAGE_PREFIX}${scenarioKey}`);
  if (saved) {
    try {
      return { scenario, world: deserializeWorld(saved), source: "restored" };
    } catch {
      // A save that no longer loads is simply ignored.
    }
  }
  return {
    scenario,
    world: deserializeWorld(serializeWorld(scenario.world)),
    source: "fresh",
  };
}

export function LegislationDevRoute() {
  const review = useReviewEnvironment();
  const storage = useReviewStorage();
  const [scenarioKey, setScenarioKey] = useState(scenarioFromUrl);
  const [session, setSession] = useState<SessionState>(() =>
    startSession(scenarioFromUrl(), storage),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    review?.reportWorld(session.world);
  }, [session.world, review]);

  const briefing = useMemo(
    () => projectMeasureBriefing(session.world, session.scenario.measureId),
    [session],
  );

  function takeStep(step: MeasureStepKey) {
    try {
      const result = applyLegislativeStep(
        session.scenario,
        session.world,
        step,
      );
      setSession({ ...session, world: result.world });
      setMessage(result.message);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  function switchPlace(key: string) {
    setScenarioKey(key);
    setSession(startSession(key, storage));
    setMessage(null);
    setError(null);
    const url = new URL(window.location.href);
    if (!review) url.searchParams.set("view", "legislation");
    url.searchParams.set("place", key);
    window.history.replaceState({}, "", url);
  }

  return (
    <MeasureView
      briefing={briefing}
      notice={session.scenario.measureNotice}
      placeKey={scenarioKey}
      worldSource={session.source}
      message={message}
      error={error}
      onStep={takeStep}
      developer={{
        scenarioKey,
        places: legislativeScenarioKeys().map((key) => ({
          key,
          label: legislativeBlueprint(key).label,
        })),
        onSwitchPlace: switchPlace,
        onSave: () => {
          storage.setItem(
            `${STORAGE_PREFIX}${scenarioKey}`,
            serializeWorld(session.world),
          );
          setMessage("Saved. Reloading will pick the bill up where it is.");
        },
        onRestart: () => {
          storage.removeItem(`${STORAGE_PREFIX}${scenarioKey}`);
          setSession(startSession(scenarioKey, storage));
          setMessage("Started again from the day the bill was filed.");
          setError(null);
        },
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
