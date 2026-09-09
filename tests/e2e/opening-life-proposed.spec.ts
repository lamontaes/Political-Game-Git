import { expect, test } from "@playwright/test";
import { fillCreator } from "./support/creator";

// Run only in scripts/proof-opening-life.mjs's disposable normal-root copy.
// UI owns production root consumption; this is not a replacement fixture route.
test.skip(
  process.env.OPENING_LIFE_PROOF !== "1",
  "Requires the proposed root integration copy.",
);

for (const age of [6, 24]) {
  test(`creator, household, keyboard, saved identity at age ${age}`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?seed=opening-browser-${age}`);
    await fillCreator(page, {
      age,
      household: "shares-a-home",
      place: "Kentucky",
    });
    await page.getByTestId("begin").click();
    const intro = page.getByTestId("opening-life-panel");
    await expect(intro).toHaveAttribute("aria-label", "Your world");
    const context = await intro.innerText();
    await intro.getByRole("button", { name: "Meet your household" }).click();
    await expect(intro).toHaveAttribute("aria-label", "Your household");
    const household = await intro.innerText();
    await intro.getByRole("button", { name: "Back", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(intro).toHaveText(context, { useInnerText: true });
    await intro.getByRole("button", { name: "Meet your household" }).click();
    await expect(intro).toHaveText(household, { useInnerText: true });
    await page.screenshot({
      path: testInfo.outputPath(`household-${age}.png`),
      fullPage: true,
    });
    await intro.getByRole("button", { name: "Skip introduction" }).focus();
    await page.keyboard.press("Enter");
    const scene = page.getByTestId("opening-life-scene");
    await expect(scene).toBeVisible();
    await expect(scene.getByTestId("life-identity")).toContainText(
      `Age ${age}`,
    );
    const identity = await scene.getByTestId("life-identity").innerText();
    const people = scene
      .getByRole("navigation", { name: "People here" })
      .getByRole("button");
    if ((await people.count()) > 0) {
      const name = (await people.first().innerText()).split(" · ")[0]!;
      await people.first().click();
      await expect(scene.getByLabel(`Conversation with ${name}`)).toBeVisible();
      await scene
        .getByLabel(`Conversation with ${name}`)
        .getByRole("button")
        .first()
        .click();
      await expect(
        scene.getByLabel(`Conversation with ${name}`).locator("p").first(),
      ).not.toBeEmpty();
    }
    await page.screenshot({
      path: testInfo.outputPath(`scene-${age}.png`),
      fullPage: true,
    });
    await page.getByTestId("keep-world").click();
    await expect(page.getByTestId("keep-world")).toHaveCount(0);
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("life-identity")).toHaveText(identity);
    await expect(page.getByTestId("opening-life-panel")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
