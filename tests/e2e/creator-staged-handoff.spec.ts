import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  openCreator,
  completeCharacterStep,
  chooseCreatorLocation,
} from "./support/creator";
import { writeFile } from "node:fs/promises";

const seed = "session7-creator-staged-handoff";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
)!;

test("real Creator keeps prompts pending while its same recorded life is prepared", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const evidence = {
      stagedWorldIds: [] as string[],
      workerWorldId: null as string | null,
      workerPersonId: null as string | null,
      heldSteps: 0,
    };
    Object.assign(window, { stagedHandoffEvidence: evidence });
    new MutationObserver((records) => {
      for (const record of records) {
        const element =
          record.target instanceof Element
            ? record.target
            : record.target.parentElement;
        const loading = element?.closest(
          '[data-testid="life-start-transition"]',
        );
        const id = loading?.getAttribute("data-world-id");
        if (id && !evidence.stagedWorldIds.includes(id))
          evidence.stagedWorldIds.push(id);
      }
    }).observe(document, { subtree: true, childList: true, attributes: true });
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      private loading = false;
      override postMessage(message: unknown): void {
        const command = message as {
          kind?: string;
          loading?: unknown;
          world?: { id: string; preStartLife?: { personId: string } };
        };
        if (command.kind === "init" && command.loading) {
          this.loading = true;
          evidence.workerWorldId = command.world!.id;
          evidence.workerPersonId = command.world!.preStartLife!.personId;
        }
        // This proof ends at the real handoff; it never starts an annual run.
        if (this.loading && command.kind === "step") {
          evidence.heldSteps++;
          return;
        }
        super.postMessage(message);
      }
    };
  });
  await page.goto(`/?seed=${seed}`);
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await completeCharacterStep(page, 38);
  await page.getByTestId("creator-continue-character").click();
  await chooseCreatorLocation(
    page,
    { age: 38, place: place.displayName, state: state.name },
    false,
  );
  await expect(page.getByTestId("life-start-transition")).toBeVisible();
  await expect(page.getByLabel("My journal")).toContainText("I ");
  await page.waitForFunction(
    () => {
      const evidence = (
        window as unknown as {
          stagedHandoffEvidence: { workerWorldId: string | null };
        }
      ).stagedHandoffEvidence;
      return evidence.workerWorldId !== null;
    },
    undefined,
    { timeout: 90000 },
  );
  const evidence = await page.evaluate(
    () =>
      (
        window as unknown as {
          stagedHandoffEvidence: {
            stagedWorldIds: string[];
            workerWorldId: string;
            workerPersonId: string;
            heldSteps: number;
          };
        }
      ).stagedHandoffEvidence,
  );
  expect(evidence.stagedWorldIds).toEqual([evidence.workerWorldId]);
  expect(evidence.heldSteps).toBe(1);
  expect(
    await page
      .getByTestId("life-start-transition")
      .getAttribute("data-person-id"),
  ).toBe(evidence.workerPersonId);
  await expect(page.getByTestId("play-screen")).toHaveCount(0);
  await expect(page.getByTestId("whoareyou-play")).toBeDisabled();
  await writeFile(
    info.outputPath("staged-handoff.json"),
    JSON.stringify(
      {
        seed,
        place: place.displayName,
        age: 38,
        ...evidence,
        scope:
          "Real Creator preparation before recorded prompts; worker step held before historical advance. No completed-history browser, populated cap, save/reload or clip acceptance.",
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: info.outputPath("begin-same-life.png") });
});
