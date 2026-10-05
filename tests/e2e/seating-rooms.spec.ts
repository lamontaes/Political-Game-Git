import { test, expect } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { enterLife } from "./support/creator";

test("random-place game opens and six rooms preserve contacts and overflow selection", async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const seed = "session11-seating-oct5";
  const place = drawRandomPlace(seed);
  const replay = {
    v: 3,
    startKind: "custom",
    seed,
    placeKey: place.key,
    startAge: 30,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    givenName: null,
    familyName: null,
  };
  await page.goto(
    `/?replay=${Buffer.from(JSON.stringify(replay)).toString("base64url")}`,
  );
  await enterLife(page);
  await page.screenshot({ path: info.outputPath("random-place-open.png") });
  await page.goto("/tests/e2e/support/seating-rooms.html");
  await expect(page.getByTestId("seating-room-proof")).toBeVisible();
  for (const room of [
    "council-chamber",
    "office",
    "diner",
    "classroom",
    "county-courtroom",
    "small-apartment",
  ]) {
    await page.getByLabel("Room", { exact: true }).selectOption(room);
    const drawn = Number(await page.getByTestId("placed-count").textContent());
    await expect(page.getByTestId("scene-place-person-figure")).toHaveCount(
      drawn,
    );
    await expect(page.getByTestId("scene-place-overflow")).toBeVisible();
    await page.getByTestId("scene-place-overflow").locator("summary").click();
    const listed = page
      .getByTestId("scene-place-overflow")
      .getByRole("button")
      .first();
    await listed.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("selected-person")).not.toBeEmpty();
    await page.getByTestId("scene-place-overflow").locator("summary").click();
    await page.screenshot({ path: info.outputPath(`${room}.png`) });
  }
});
