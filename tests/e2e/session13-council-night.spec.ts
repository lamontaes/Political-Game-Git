import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { placeReferencePopulation } from "../../src/simulation/nationwide-world/place-population";
import { localGoverningBodiesForJurisdiction } from "../../src/simulation/candidacy";
import {
  startLife,
  enterLife,
  openElsewhere,
  passShellTime,
  waitForClockIdle,
  goTo,
} from "./support/creator";
import { walkHome } from "./support/campaign";

for (const size of ["town", "city"] as const) {
  const seed = `session13-b03-player-${size}-2026-10-06`;
  const place = drawRandomPlace(seed, (row) => {
    const population = placeReferencePopulation(row.sourceGeoid ?? "")?.value;
    return (
      population !== undefined &&
      (size === "city"
        ? population >= 100_000
        : population >= 1_000 && population < 30_000) &&
      localGoverningBodiesForJurisdiction(row.context.jurisdiction.id).some(
        (office) =>
          office.unit.unitType === "municipality" &&
          office.seat === "governing-body",
      )
    );
  });
  test(`saved council returns are played and continued in a random ${size}`, async ({
    page,
  }, info) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?seed=${seed}`);
    await startLife(page, {
      age: 18,
      place: place.displayName,
      placeQuery: place.displayName.split(",")[0],
    });
    await enterLife(page);
    await openElsewhere(page, "campaign");
    const offices = localGoverningBodiesForJurisdiction(
      place.context.jurisdiction.id,
    ).filter(
      (row) =>
        row.unit.unitType === "municipality" && row.seat === "governing-body",
    );
    expect(offices.length).toBeGreaterThan(0);
    const option = page
      .getByTestId("campaign-office-browser")
      .locator(`input[value="${offices[0]!.officeKey}"]`);
    await option.check();
    const seats = page
      .getByTestId("municipal-seat-choices")
      .locator("input:enabled");
    if (await seats.count()) await seats.first().check();
    await expect(page.getByTestId("file-candidacy")).toBeEnabled();
    await page.getByTestId("file-candidacy").click();
    // Functional race proof, never a benchmark or an authored date/result.
    // Daily steps stop on the actual result day so a week cannot skip the night.
    for (let days = 0; days < 366; days++) {
      if (await page.getByTestId("campaign-result").isVisible()) break;
      await passShellTime(page, "day");
      await waitForClockIdle(page);
    }
    await expect(page.getByTestId("campaign-result")).toBeVisible();
    await walkHome(page);
    await openElsewhere(page, "campaign");
    const scene = page.getByTestId("council-election-night");
    await expect(scene).toBeVisible();
    const resultId = await scene.getAttribute("data-result-id");
    const sources = await scene.getAttribute("data-source-record-ids");
    expect(resultId).toBeTruthy();
    expect(sources).toBeTruthy();
    await page.screenshot({
      path: info.outputPath(`${size}-election-returns.png`),
    });
    await page.getByTestId("election-night-next").click();
    const returns = await scene.locator("table").textContent();
    await goTo(page, "keep-world");
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await openElsewhere(page, "campaign");
    await expect(scene).toHaveAttribute("data-result-id", resultId!);
    await expect(scene.locator("table")).toHaveText(returns!);
    const skip = page.getByTestId("election-night-skip");
    if (await skip.isVisible()) await skip.click();
    await expect(scene).toContainText("Final unofficial returns");
    await page.screenshot({
      path: info.outputPath(`${size}-final-returns.png`),
    });
    const speech = page.getByTestId("election-night-speech");
    if (await speech.isVisible()) await speech.click();
    await page.getByTestId("election-night-return").click();
    await expect(scene).toHaveCount(0);
    expect(errors).toEqual([]);
    await info.attach("actual-election-route", {
      body: JSON.stringify({
        seed,
        place: place.displayName,
        resultId,
        sources,
        returns,
      }),
      contentType: "application/json",
    });
  });
}
