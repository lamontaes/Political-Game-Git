import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { LifeStartTransition } from "../../../src/player/LifeStartTransition";
import {
  createOpeningLifeController,
  type OpeningLifeGenerationProgress,
} from "../../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../../src/presentation/new-game";
import { drawRandomPlace } from "../../support/random-place";
import "../../../src/styles.css";
import "../../../src/player/kit12.css";
import "../../../src/player/shell.css";

export function mountOpeningPreparationFixture(cancelAtFirstStage = false) {
  const seed = `browser-opening-stages:${crypto.randomUUID()}`;
  const place = drawRandomPlace(seed);
  const startAge =
    18 + (crypto.getRandomValues(new Uint32Array(1))[0]! % (70 - 18 + 1));
  const controller = createOpeningLifeController({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    startAge,
  });
  const evidence = {
    seed,
    place: place.displayName,
    startAge,
    reports: [] as Omit<OpeningLifeGenerationProgress, "world">[],
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
            deadlineAt: performance.now() + 2 * 60 * 1000,
            onProgress: (progress) => {
              const { world: checkpoint, ...receipt } = progress;
              void checkpoint;
              evidence.reports.push(receipt);
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
