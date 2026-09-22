import { expect, test } from "./fixtures";
import { enterLife, openShellMenu } from "./support/creator";

/**
 * A Kentucky House winner between the result and the January term, on the
 * ordinary Work route. Before this, Work said "You hold no office in this life
 * yet" for the eleven months until the seat began.
 */
test("a member-elect sees the transition and attends an open service", async ({
  page,
}) => {
  await page.goto("/");
  // A cold dev server compiles the whole client on the first load.
  await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 90_000 });
  await page.evaluate(async () => {
    const fixturePath = "/tests/fixtures/recorded-legislative-term.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const transitionPath = "/src/presentation/office-transition.ts";
    const { recordedTermFixture, moveToTermDate } = await import(
      /* @vite-ignore */ fixturePath
    );
    const { projectOfficeTransition } = await import(
      /* @vite-ignore */ transitionPath
    );
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const fixture = recordedTermFixture();
    const caucus = projectOfficeTransition(
      fixture.world,
      fixture.personId,
    ).services.find(
      (s: { key: string }) => s.key === "legislature-caucus-organizing",
    );
    const world = moveToTermDate(fixture.world, caucus.opensOn);
    const store = new BrowserSaveStore();
    const saved = await store.save(world, store.newSaveId(world));
    if (saved.status !== "saved")
      throw new Error(`Member-elect fixture refused: ${saved.status}`);
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openShellMenu(page);
  await page.getByRole("menuitem", { name: /^Politics/ }).click();
  await page.getByTestId("nav-politics").click();
  await page.getByTestId("politics-tab-office").click();

  const panel = page.getByTestId("office-transition");
  await expect(panel).toBeVisible();
  await expect(page.getByTestId("no-office")).toHaveCount(0);
  await expect(panel).toContainText(
    "Member-elect of the House of Representatives",
  );
  await expect(panel).toContainText("The term begins January 1, 2027");
  await expect(panel).toContainText("the office and its powers are not yours");

  const caucus = page.getByTestId(
    "office-transition-service-legislature-caucus-organizing",
  );
  await expect(caucus).toContainText("Open until");
  await caucus.getByRole("button", { name: "Attend" }).click();
  await expect(caucus).toContainText("You went.");
  await expect(caucus.getByRole("button", { name: "Attend" })).toHaveCount(0);

  // Not yet open: shown with its dates, and nothing to press.
  const committees = page.getByTestId(
    "office-transition-service-legislature-committee-requests",
  );
  await expect(committees).toContainText("Opens");
  await expect(committees.getByRole("button")).toHaveCount(0);

  await panel.screenshot({
    path: test.info().outputPath("member-elect-transition.png"),
  });
});
