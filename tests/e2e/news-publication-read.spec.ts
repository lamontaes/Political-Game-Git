import { expect, test } from "./fixtures";
import { goTo, openNewsContext, saveLife } from "./support/creator";
import { readSavedLegislativeWorld } from "./support/legislative-entry";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { pickDistinct, SeededRng } from "../../src/simulation/rng";

const SEED = "news-player-read-20261001";
const places = lifePlaceStateIdentities();
const [place] = pickDistinct(new SeededRng(SEED), places, 1);

// Supplied published edition, not ordinary life creation, filing or reporting.
// The retained player's UI performs every read/save/reopen below.
test("News click retains actual knowledge and heard exposure through save/reopen", async ({
  page,
}, info) => {
  expect(places).toHaveLength(56);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Prepare the supplied save on the verified origin before mounting the game.
  await page.goto("/__dev/identity");
  const ids = await page.evaluate(
    async ({ placeKey, seed }) => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { newsPublicationReadWorld } = await load(
        "/tests/fixtures/news-publication-read.ts",
      );
      const { BrowserSaveStore } = await load(
        "/src/presentation/browser-world-repository.ts",
      );
      const { world, ...ids } = newsPublicationReadWorld(placeKey, seed);
      const store = new BrowserSaveStore();
      const outcome = await store.save(world, store.newSaveId(world));
      if (outcome.status !== "saved")
        throw new Error("Publication save failed.");
      return ids;
    },
    { placeKey: place!.jurisdictionKey, seed: SEED },
  );
  await page.goto("/");
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await goTo(page, "nav-news");
  await openNewsContext(page, "around");
  const article = page
    .getByTestId("world39-news")
    .locator(`[data-publication-id="${ids.publicationId}"]`);
  await expect(article).toBeVisible();
  const before = await readSavedLegislativeWorld(page);
  expect(
    before.history.knowledge.filter(
      (row) => row.personId === ids.personId && row.eventId === ids.eventId,
    ),
  ).toHaveLength(0);
  const beforeExposures = before.history.lawExposures!.length;
  await article.getByTestId("world39-read-publication").click();
  await saveLife(page);
  const read = await readSavedLegislativeWorld(page);
  const knowledge = read.history.knowledge.filter(
    (row) => row.personId === ids.personId && row.eventId === ids.eventId,
  );
  expect(knowledge).toHaveLength(1);
  expect(knowledge[0]!.source).toMatchObject({
    kind: "media",
    reference: ids.publicationId,
  });
  const news = read.history.lawExposures!.filter(
    (row) =>
      row.relation === "news" &&
      row.news?.publicationId === ids.publicationId &&
      row.personId === ids.personId,
  );
  expect(news).toHaveLength(1);
  expect(news[0]).toMatchObject({
    measureId: ids.measureId,
    sourceRecordId: knowledge[0]!.id,
    amount: null,
    monthlyPay: null,
    direction: "none",
    viaPersonId: null,
    news: {
      knowledgeId: knowledge[0]!.id,
      publicationId: ids.publicationId,
      storyLeadId: ids.leadId,
      basisEventId: ids.basisEventId,
    },
  });
  expect(read.history.lawExposures).toHaveLength(beforeExposures + 1);
  expect(read.currentMoment).toEqual(before.currentMoment);
  await page.goto("/");
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await goTo(page, "nav-news");
  await openNewsContext(page, "around");
  await expect(article).toBeVisible();
  await article.getByTestId("world39-read-publication").click();
  await saveLife(page);
  const repeated = await readSavedLegislativeWorld(page);
  expect(repeated.history.knowledge).toEqual(read.history.knowledge);
  expect(repeated.history.lawExposures).toEqual(read.history.lawExposures);
  expect(repeated.currentMoment).toEqual(read.currentMoment);
  expect(errors).toEqual([]);
  await info.attach("actual-news-read", {
    body: JSON.stringify({
      placeKey: place!.jurisdictionKey,
      seed: SEED,
      ...ids,
      knowledgeId: knowledge[0]!.id,
      exposureId: news[0]!.id,
    }),
    contentType: "application/json",
  });
});
