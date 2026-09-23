import { expect, test } from "./fixtures";
import { enterLife, goTo } from "./support/creator";

/**
 * A House winner in Presque Isle, Maine, and in Dahlonega, Georgia, on the
 * ordinary Work route. Both legislatures are generated rather than compiled,
 * and before this the win was never scheduled: no transition, no seat on January 1, and Work read "You
 * hold no office in this life yet" beside a House role.
 *
 * The life is generated, filed and run to its supplied election in the page;
 * the months between saves are passed with the simulation's own day runner,
 * not by clicking through them.
 */
for (const { town, placeKey } of [
  { town: "Presque Isle, Maine", placeKey: "2360825" },
  { town: "Dahlonega, Georgia", placeKey: "1321240" },
])
  test(`a House winner in ${town} waits, is seated on the term's first day and takes the oath`, async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await page.goto("/");
    await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 90_000 });

    const save = (stage: "elect" | "seated") =>
      page.evaluate(
        async ({ stage, placeKey }) => {
          const fixturePath = "/tests/fixtures/state-executive-entry.ts";
          const campaignPath = "/tests/fixtures/campaign-fixture.ts";
          const storePath = "/src/presentation/browser-world-repository.ts";
          const transitionPath = "/src/presentation/office-transition.ts";
          const { adultLifeAt, runToElection, passUntil, suppliedWin } =
            await import(/* @vite-ignore */ fixturePath);
          const { fileForOffice } = await import(
            /* @vite-ignore */ campaignPath
          );
          const { projectOfficeTransition } = await import(
            /* @vite-ignore */ transitionPath
          );
          const { BrowserSaveStore } = await import(
            /* @vite-ignore */ storePath
          );
          const { world, personId } = adultLifeAt(
            placeKey,
            `member-elect-${placeKey}`,
          );
          let decided = runToElection(
            fileForOffice(world, personId),
            personId,
            suppliedWin(personId),
          );
          if (stage === "seated") {
            const startsAt = projectOfficeTransition(
              decided,
              personId,
            ).startsAt;
            decided = passUntil(decided, startsAt);
          }
          const store = new BrowserSaveStore();
          const saved = await store.save(decided, store.newSaveId(decided));
          if (saved.status !== "saved")
            throw new Error(`Maine fixture refused: ${saved.status}`);
        },
        { stage, placeKey },
      );

    await save("elect");
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await goTo(page, "elsewhere-work");
    const transition = page.getByTestId("office-transition");
    await expect(transition).toBeVisible();
    await expect(transition).toContainText("The term begins January 1, 2027");
    await expect(page.getByTestId("no-office")).toHaveCount(0);
    await transition.screenshot({
      path: test.info().outputPath(`member-elect-${placeKey}.png`),
    });

    await save("seated");
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await goTo(page, "elsewhere-work");
    await expect(page.getByTestId("office-transition")).toHaveCount(0);
    await expect(page.getByTestId("no-office")).toHaveCount(0);
    const swearingIn = page.getByTestId("swearing-in");
    await expect(swearingIn).toContainText(
      "Your term as Member of the House of Representatives began January 1, 2027",
    );
    await page.getByTestId("swearing-in-take-oath").click();
    await expect(page.getByTestId("swearing-in-done")).toContainText(
      "You raised your right hand and took the oath of office as Member of the House of Representatives.",
    );
    await page.screenshot({
      path: test.info().outputPath(`sworn-in-${placeKey}.png`),
      fullPage: true,
    });
  });
