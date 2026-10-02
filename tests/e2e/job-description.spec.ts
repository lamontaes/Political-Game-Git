import { expect, test } from "./fixtures";
import { enterLife, goTo } from "./support/creator";

test("Jobs describes its recorded occupation beside the employer's actual offer", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  const control = await page.evaluate(async () => {
    const geographyPath = "/src/presentation/new-game-geography.ts";
    const placePath = "/tests/support/random-place.ts";
    const lifePath = "/src/presentation/ordinary-life.ts";
    const projectionPath = "/src/presentation/job-listings-view.ts";
    const sourcePath = "/src/presentation/career-path7-provider.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { createExplicitGeographyLife } = await import(
      /* @vite-ignore */ geographyPath
    );
    const { drawRandomPlace } = await import(/* @vite-ignore */ placePath);
    const { openOrdinaryLife } = await import(/* @vite-ignore */ lifePath);
    const { projectJobMarket } = await import(
      /* @vite-ignore */ projectionPath
    );
    const { CAREER_SOURCE_CONTEXT } = await import(
      /* @vite-ignore */ sourcePath
    );
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const seed = "overflow1-job-description-recorded-occupation";
    const place = drawRandomPlace(
      seed,
      (row: { scope: string }) => row.scope === "locality",
    );
    const created = createExplicitGeographyLife({
      seed,
      placeKey: place.key,
      startAge: 30,
    });
    const world = openOrdinaryLife(
      created.game.world,
      created.game.playerPersonId,
    );
    const opening = world.history.jobOpenings.find(
      (row: { occupationClassification: string }) =>
        row.occupationClassification === "occupation:office-clerk",
    );
    if (!opening) throw new Error("No canonical office-clerk opening.");
    const listing = projectJobMarket(
      world,
      created.game.playerPersonId,
    ).listings.find(
      (row: { openingId: string }) => row.openingId === opening.id,
    );
    const source = CAREER_SOURCE_CONTEXT.find(
      (row: { id: string }) => row.id === "43-9061.00",
    );
    if (!listing || !source?.description)
      throw new Error("The actual listing or its existing source is absent.");
    const store = new BrowserSaveStore();
    const saveId = store.newSaveId(world);
    const saved = await store.save(world, saveId);
    if (saved.status !== "saved")
      throw new Error(`Description fixture refused: ${saved.status}`);
    const person = world.people[created.game.playerPersonId];
    return {
      seed,
      place: place.displayName,
      person: `${person.givenName} ${person.familyName}`,
      saveId,
      openingId: opening.id,
      title: listing.title,
      employerLine: listing.employerLine,
      termsLine: listing.termsLine,
      description: source.description,
      sourceOccupation: source.id,
      recordedPayOutcomes: world.history.resourceTransferOutcomes.length,
    };
  });
  await info.attach("recorded-job-description-control", {
    body: JSON.stringify(control, null, 2),
    contentType: "application/json",
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-jobs");
  const jobs = page.getByTestId("job-listings");
  const listing = jobs.getByTestId("job-listing").filter({
    has: page.getByRole("heading", { name: control.title, exact: true }),
  });
  await expect(listing).toHaveCount(1);
  await expect(
    listing.getByText(control.employerLine, { exact: true }),
  ).toBeVisible();
  await expect(
    listing.getByText(control.termsLine, { exact: true }),
  ).toBeVisible();
  await expect(
    listing.getByText(control.description, { exact: true }),
  ).toBeVisible();
  await expect(jobs).not.toContainText("Nationally, this work pays");
  await expect(jobs).not.toContainText("The lowest legal pay here");
  await expect(jobs).not.toContainText("About this kind of work");
  await page.screenshot({
    path: info.outputPath("jobs-description-after.png"),
  });
  const savedPayOutcomes = await page.evaluate(async (saveId) => {
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const kept = await new BrowserSaveStore().inspectSnapshot(saveId);
    if (!kept) throw new Error("The actual saved life was lost.");
    return kept.history.resourceTransferOutcomes.length;
  }, control.saveId);
  expect(savedPayOutcomes).toBe(control.recordedPayOutcomes);
});
