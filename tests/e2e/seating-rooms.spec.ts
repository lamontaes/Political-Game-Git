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

test("counter staff keep the clipped counter when a customer is listed first", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1672, height: 981 });
  await page.goto("/tests/e2e/support/seating-rooms.html");
  await page.getByLabel("Room", { exact: true }).selectOption("store");
  const cashierId = await page
    .getByTestId("seating-room-proof")
    .getAttribute("data-controlled-cashier-id");
  expect(cashierId).toBeTruthy();
  const cashier = page
    .getByTestId("scene-place-person")
    .and(page.locator(`[data-person-id="${cashierId}"]`))
    .filter({ has: page.getByTestId("scene-place-person-figure") })
    .and(page.getByRole("button", { name: /Cashier$/ }));
  await expect(cashier).toBeVisible();
  const bounds = await cashier.boundingBox();
  const room = page.locator("main > div");
  const roomBounds = await room.boundingBox();
  expect(bounds).not.toBeNull();
  expect(roomBounds).not.toBeNull();
  // The cashier button ends at the counter top, with the source canvas
  // preserved inside it. The unit test binds this to the staging metadata.
  expect(bounds!.y + bounds!.height).toBeLessThan(
    roomBounds!.y + roomBounds!.height / 2,
  );
  await cashier.click();
  await expect(page.getByTestId("selected-person")).toHaveText(
    (await cashier.getAttribute("data-person-id"))!,
  );
  await page.screenshot({ path: info.outputPath("store-cashier-counter.png") });
  await info.attach("cashier-recipe", {
    body: (await cashier
      .getByTestId("scene-place-person-figure")
      .getAttribute("data-engine-recipe"))!,
    contentType: "text/plain",
  });
});
