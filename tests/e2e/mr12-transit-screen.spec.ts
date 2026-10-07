import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { openShellMenu } from "./support/creator";

const place = drawRandomPlace(
  "session-46-mr-12",
  (row) => row.scope === "locality",
);
if (!place.stateJurisdictionKey)
  throw new Error(`No jurisdiction for ${place.key}.`);

test("MR-12 Transit screen from a new game", async ({ page }) => {
  const label = process.env.MR12_SCREEN_LABEL;
  if (label !== "main" && label !== "branch")
    throw new Error("Set MR12_SCREEN_LABEL to main or branch.");
  await page.goto("/");
  await page.evaluate(
    async ({ stateKey }) => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { suppliedLegislativeSeat } = await load(
        "/tests/fixtures/supplied-legislative-seat.ts",
      );
      const { BrowserSaveStore } = await load(
        "/src/presentation/browser-world-repository.ts",
      );
      const life = suppliedLegislativeSeat(stateKey, "house");
      const store = new BrowserSaveStore();
      const outcome = await store.save(life.world, store.newSaveId(life.world));
      if (outcome.status !== "saved") throw new Error("New game save failed.");
    },
    { stateKey: place.stateJurisdictionKey },
  );
  await page.goto("/");
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await page
    .getByRole("group", { name: "Move time" })
    .getByRole("button", { name: "Day", exact: true })
    .click();
  await openShellMenu(page);
  await page.getByTestId("nav-group-politics").click();
  await page.getByTestId("nav-politics-transit").click();
  await expect(page.getByTestId("transit-workspace")).toBeVisible();
  await page.screenshot({
    path: `docs/release/screenshots/mr-12-transit-${label}.png`,
    fullPage: true,
  });
});
