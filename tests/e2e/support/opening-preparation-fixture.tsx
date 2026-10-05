import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { LifeStartTransition } from "../../../src/player/LifeStartTransition";
import {
  createOpeningLifeController,
  type OpeningLifeGenerationProgress,
} from "../../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../../src/presentation/new-game";
import { searchLifePlaces } from "../../../src/simulation/life-places";
import { STATES } from "../../../src/simulation/state-reference";
import "../../../src/styles.css";
import "../../../src/player/kit12.css";
import "../../../src/player/shell.css";

export function mountOpeningPreparationFixture(cancelAtFirstStage = false) {
  const states = Object.keys(STATES);
  const choose = (length: number) => {
    const draw = crypto.getRandomValues(new Uint32Array(1))[0]!;
    return Math.floor((draw / 2 ** 32) * length);
  };
  const state = states[choose(states.length)]!;
  const places = searchLifePlaces("", 100, {
    stateJurisdictionKey: `US-${state}`,
    scope: "locality",
  });
  const place = places[choose(places.length)]!;
  const seed = `browser-opening-stages:${crypto.randomUUID()}`;
  const controller = createOpeningLifeController({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    startAge: 30,
  });
  const evidence = {
    seed,
    place: place.displayName,
    reports: [] as OpeningLifeGenerationProgress[],
    painted: [] as {
      requested: string;
      visible: string;
      value: string | null;
    }[],
    status: "waiting" as
      "waiting" | "preparing" | "complete" | "aborted" | "failed",
    error: null as string | null,
    world: null as { id: string; date: string; people: number } | null,
    animation: "",
  };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let release: (() => void) | undefined;
  root.render(
    createElement(LifeStartTransition, {
      onPrepare: async (report, signal) => {
        evidence.status = "preparing";
        evidence.animation = getComputedStyle(
          host.querySelector(".pg-life-transition")!,
        ).animationName;
        try {
          const opened = await controller.finishTransitionWithProgress({
            signal,
            onProgress: (progress) => {
              evidence.reports.push(progress);
              report(progress);
              requestAnimationFrame(() => {
                evidence.painted.push({
                  requested: progress.label,
                  visible:
                    host.querySelector("[role=status] p")?.textContent ?? "",
                  value:
                    host.querySelector("progress")?.getAttribute("value") ??
                    null,
                });
              });
            },
            ...(cancelAtFirstStage
              ? {
                  yieldControl: () =>
                    new Promise<void>((resolve) => {
                      release = resolve;
                    }),
                }
              : {}),
          });
          const world = opened.game!.world;
          evidence.world = {
            id: world.id,
            date: world.currentDate,
            people: Object.keys(world.people).length,
          };
          evidence.status = "complete";
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError")
            evidence.status = "aborted";
          else {
            evidence.status = "failed";
            evidence.error = String(error);
          }
        }
      },
    }),
  );
  return {
    evidence,
    cancel: () => {
      root.unmount();
      release?.();
    },
    hasPublishedGame: () => controller.read().game !== null,
  };
}
