import { expect, test } from "./fixtures";
import { fillCreator, saveLife } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import type { BrowserSaveStore as SaveStore } from "../../src/presentation/browser-world-repository";

// Golden steps 2/3: six fresh games. Missing placement metadata is reported,
// never filled from a guess. Capture success is not slot-engine acceptance.
for (let draw = 0; draw < 6; draw += 1) {
  const seed = `session4-session11-intro-tags:${draw}`;
  const place = drawRandomPlace(seed, (row) => row.scope === "locality");
  const state = lifePlaceStateIdentities().find(
    (row) => row.jurisdictionKey === place.stateJurisdictionKey,
  )!;
  test(`intro placement capture ${draw} ${place.displayName}`, async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/?seed=${encodeURIComponent(seed)}`);
    const pageErrors: { at: number; message: string }[] = [];
    page.on("pageerror", (error) =>
      pageErrors.push({ at: Date.now(), message: error.message }),
    );
    await fillCreator(page, {
      age: 18,
      state: state.name,
      place: place.displayName,
      route: "normal",
      givenName: "Avery",
      familyName: "Morgan",
    });
    // Observe the existing phase boundaries before changing capture readiness.
    // This reader changes neither production timing nor canonical World state.
    await page.evaluate(() => {
      let previous = "";
      const observations: unknown[] = [];
      const observe = () => {
        const intro = document.querySelector(
          '[data-testid="world-orientation"]',
        );
        const chapter = intro?.querySelector(
          '.pg-scene-chapter[data-stage="current"]',
        );
        const observation = {
          playing: !!document.querySelector('[data-testid="play-screen"]'),
          loading:
            document.querySelector('[data-testid="life-start-transition"]')
              ?.textContent ?? null,
          step: intro?.getAttribute("data-step") ?? null,
          ready:
            intro
              ?.querySelector('[data-testid="scene-chapters"]')
              ?.getAttribute("data-ready") ?? null,
          chapter: chapter?.getAttribute("data-chapter") ?? null,
          inert: chapter?.hasAttribute("inert") ?? null,
          pendingMaterials:
            chapter?.querySelectorAll(
              '[data-material-group-state="pending"], [data-material-group-state="loading"], [data-material-state="loading"]',
            ).length ?? null,
          images: chapter
            ? Array.from(chapter.querySelectorAll("img")).map((image) => ({
                currentSrc: image.currentSrc,
                complete: image.complete,
                naturalWidth: image.naturalWidth,
              }))
            : [],
          problems: Array.from(
            document.querySelectorAll('[role="alert"], .game-problem'),
          ).map((node) => node.textContent),
        };
        const signature = JSON.stringify(observation);
        if (signature !== previous) {
          observations.push({ at: performance.now(), ...observation });
          previous = signature;
        }
      };
      Object.defineProperty(window, "session4IntroTiming", {
        value: observations,
      });
      new MutationObserver(observe).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      document.addEventListener("load", observe, true);
      document.addEventListener("error", observe, true);
      observe();
    });
    const beginAt = await page.evaluate(() => performance.now());
    await page.getByTestId("begin").click();
    const intro = page.getByTestId("world-orientation");
    try {
      // Wait for the existing loading terminal boundary, including refusal.
      // The original visibility assertion still follows that actual outcome.
      await page.waitForFunction(() => {
        if (document.querySelector('[data-testid="life-start-transition"]'))
          return false;
        return !!document.querySelector(
          '[data-testid="play-screen"], [role="alert"], .game-problem',
        );
      });
      await expect(page.getByTestId("play-screen")).toBeVisible();
      await expect(intro).toBeVisible();
      const cards = [];
      while (await intro.isVisible()) {
        const key = (await intro.getAttribute("data-step"))!;
        await expect(intro.getByTestId("scene-chapters")).toHaveAttribute(
          "data-ready",
          "true",
        );
        const chapter = intro.locator(
          `.pg-scene-chapter[data-chapter="${key}"][data-stage="current"]:not([inert])`,
        );
        await expect(chapter).toBeVisible();
        const heading = chapter.getByTestId(`orientation-step-${key}`);
        await expect(heading).toBeVisible();
        await expect(
          chapter.locator(
            '[data-material-group-state="pending"], [data-material-group-state="loading"], [data-material-state="loading"]',
          ),
        ).toHaveCount(0);
        const imageReadiness = await chapter.evaluate(async (node) => {
          const images = Array.from(node.querySelectorAll("img"));
          await Promise.allSettled(images.map((image) => image.decode()));
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          return images.map((image) => ({
            currentSrc: image.currentSrc,
            complete: image.complete,
            naturalWidth: image.naturalWidth,
          }));
        });
        const copy = chapter.locator(".pg-orientation-copy");
        await copy.evaluate(async (node) => {
          const animations = [...node.getAnimations({ subtree: true })];
          for (
            let ancestor = node.parentElement;
            ancestor;
            ancestor = ancestor.parentElement
          )
            animations.push(...ancestor.getAnimations());
          await Promise.allSettled(
            animations
              .filter(
                (animation) =>
                  animation.effect?.getTiming().iterations !== Infinity,
              )
              .map((animation) => animation.finished),
          );
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
        });
        await expect
          .poll(() =>
            copy.evaluate((node) => {
              const nodes = [node, ...node.querySelectorAll("*")];
              for (
                let ancestor = node.parentElement;
                ancestor;
                ancestor = ancestor.parentElement
              )
                nodes.push(ancestor);
              return nodes.every(
                (element) => Number(getComputedStyle(element).opacity) === 1,
              );
            }),
          )
          .toBe(true);
        const panelPaint = await copy.evaluate((node) => ({
          at: performance.now(),
          elements: [node, ...node.querySelectorAll("*")].map((element) => {
            const style = getComputedStyle(element);
            return {
              tag: element.tagName,
              className: element.getAttribute("class"),
              opacity: style.opacity,
              color: style.color,
              backgroundColor: style.backgroundColor,
              animationName: style.animationName,
            };
          }),
        }));
        const people = await chapter
          .locator("[data-person-id]")
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              personId: node.getAttribute("data-person-id"),
              slotId: node.getAttribute("data-slot-id"),
              slotRole: node.getAttribute("data-slot-role"),
              pose: node.getAttribute("data-pose-id"),
              facing: node.getAttribute("data-facing"),
              depth: node.getAttribute("data-depth"),
              selectionRecordIds: node.getAttribute(
                "data-selection-record-ids",
              ),
              figureRectangle: (() => {
                const rect = node.getBoundingClientRect();
                return {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                };
              })(),
              rendererTag: node.tagName,
              rendererClass: node.getAttribute("class"),
            })),
          );
        const screenshot: string = `${draw}-${cards.length}-${key}-full-size.png`;
        await page.screenshot({
          path: info.outputPath(screenshot),
          fullPage: true,
        });
        const rawPlacementTrace = await intro.getAttribute(
          "data-placement-trace",
        );
        cards.push({
          key,
          title: await heading.innerText(),
          screenshot,
          people,
          placementTrace: rawPlacementTrace
            ? JSON.parse(rawPlacementTrace)
            : null,
          imageReadiness,
          panelPaint,
          actualDpr: await page.evaluate(() => window.devicePixelRatio),
        });
        const next = intro.getByTestId("orientation-next");
        await next.focus();
        await page.keyboard.press("Enter");
        // A leaving chapter must not be captured as the next card.
        await page.waitForFunction((previous) => {
          const dialog = document.querySelector(
            '[data-testid="world-orientation"]',
          );
          return !dialog || dialog.getAttribute("data-step") !== previous;
        }, key);
      }
      await saveLife(page);
      const recorded = await page.evaluate(async () => {
        const storePath = "/src/presentation/browser-world-repository.ts";
        const sourcePath = "/src/presentation/living-scene-facts.ts";
        const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
        const { projectLivingSceneOpening } = await import(
          /* @vite-ignore */ sourcePath
        );
        const store: SaveStore = new BrowserSaveStore();
        const summary = (await store.list()).saves[0]!;
        const world = await store.inspectSnapshot(summary.saveId);
        if (!world) throw new Error("Actual captured life was not saved.");
        return {
          worldId: world.id,
          seed: world.seed,
          moment: world.currentMoment,
          playerPersonId: summary.playerPersonId,
          selectionProjection: projectLivingSceneOpening(
            world,
            summary.playerPersonId,
          ),
        };
      });
      await info.attach("six-place-intro-card-receipt", {
        body: JSON.stringify(
          {
            seed,
            place,
            state,
            cards,
            recorded,
            method:
              "DOM placement attributes observed on each card; selection projection read from the actual saved World afterward. Null fields remain missing proof, not inferred defaults.",
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
      expect(cards.length).toBeGreaterThan(0);
    } finally {
      const observations = await page.evaluate(() =>
        Reflect.get(window, "session4IntroTiming"),
      );
      await info.attach("observed-intro-phase-timing", {
        body: JSON.stringify({ beginAt, observations, pageErrors }, null, 2),
        contentType: "application/json",
      });
    }
  });
}
