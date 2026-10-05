import { expect, test, type Page } from "@playwright/test";
import type { World } from "../../src/simulation/types";
import { goTo } from "./support/creator";

async function proof(page: Page) {
  return JSON.parse(
    (await page.getByTestId("press-reading-proof").textContent())!,
  ) as {
    publication: { id: string; sourceEventId: string; outletName: string };
    mediaKnowledge: {
      eventId: string;
      source: { kind: string; reference: string };
    }[];
    moment: unknown;
    transferCount: number;
  };
}

test("headline reads exactly its actual generated publication and survives Keep/reload", async ({
  page,
}) => {
  await page.goto(
    `/tests/e2e/support/press-reading.html?case=headline-${crypto.randomUUID()}`,
  );
  await expect(page.getByTestId("press-reading-proof")).toBeVisible();
  const before = await proof(page);
  expect(before.publication.id).toBeTruthy();
  const article = page.locator(`[data-story-id="${before.publication.id}"]`);
  await article.getByRole("button").first().click();
  await expect(page.getByTestId("news-article")).toBeVisible();
  const read = await proof(page);
  const exact = read.mediaKnowledge.filter(
    (row) => row.source.reference === before.publication.id,
  );
  expect(exact).toHaveLength(1);
  expect(exact[0]!.eventId).toBe(before.publication.sourceEventId);
  expect(read.mediaKnowledge.length - before.mediaKnowledge.length).toBe(1);
  expect(read.moment).toEqual(before.moment);
  expect(read.transferCount).toBe(before.transferCount);
  await page.getByRole("button", { name: "← Front page" }).click();
  await article.getByRole("button").first().click();
  expect((await proof(page)).mediaKnowledge).toEqual(read.mediaKnowledge);
  await page.getByRole("button", { name: "Keep generated test world" }).click();
  await expect(page.getByTestId("press-reading-saved")).toHaveText("saved");
  await page.reload();
  await expect(page.getByTestId("press-reading-proof")).toBeVisible();
  expect((await proof(page)).mediaKnowledge).toEqual(read.mediaKnowledge);
  await page
    .locator(`[data-story-id="${before.publication.id}"]`)
    .getByRole("button")
    .first()
    .click();
  expect((await proof(page)).mediaKnowledge).toEqual(read.mediaKnowledge);
});

test("informational preview and browse never acquire the displayed story", async ({
  page,
}) => {
  await page.goto(
    `/tests/e2e/support/press-reading.html?informational=true&case=preview-${crypto.randomUUID()}`,
  );
  await expect(page.getByTestId("press-reading-proof")).toBeVisible();
  const before = await proof(page);
  await page.getByTestId("news-section-directory").click();
  await page.getByTestId("news-section-read").click();
  await page
    .locator(`[data-story-id="${before.publication.id}"]`)
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByTestId("news-article")).toBeVisible();
  expect(await proof(page)).toEqual(before);
});

async function openGeneratedShell(page: Page) {
  await page.goto("/");
  const facts = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { createPressReadingWorld } = await load(
      "/tests/e2e/support/press-reading-world.ts",
    );
    const { BrowserSaveStore } = await load(
      "/src/presentation/browser-world-repository.ts",
    );
    const { projectRoomMedia } = await load("/src/presentation/room-media.ts");
    const f = createPressReadingWorld("press-story-learning:generated-opening");
    const room = projectRoomMedia(f.world, f.personId);
    const publication = room.broadcast?.story;
    if (!publication) throw new Error("Actual generated broadcast required.");
    const store = new BrowserSaveStore();
    const slot = store.newSaveId(f.world);
    if ((await store.save(f.world, slot)).status !== "saved")
      throw new Error("Generated shell save was not admitted.");
    return {
      personId: f.personId,
      publication,
      paperStory: room.frontPage?.story,
      slot,
    };
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  const intro = page.getByTestId("world-orientation");
  while (await intro.isVisible())
    await intro.getByRole("button", { name: /^(Next|Begin)$/ }).click();
  return facts;
}

async function keepShellWorld(page: Page, slot: string, personId: string) {
  await goTo(page, "save-world");
  await expect(
    page.locator(".life-hud-note").filter({ hasText: /^Saved\.$/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  return page.evaluate(
    async ({ id, personId }) => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { BrowserSaveStore } = await load(
        "/src/presentation/browser-world-repository.ts",
      );
      const world = (await new BrowserSaveStore().load(
        id as never,
      )) as World | null;
      if (!world) throw new Error("Actual kept shell world required.");
      const fingerprint = async (value: unknown) => {
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        return Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        )
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      };
      return {
        currentMoment: world.currentMoment,
        knowledgeCount: world.history.knowledge.length,
        knowledgeFingerprint: await fingerprint(world.history.knowledge),
        history: {
          knowledge: world.history.knowledge.filter(
            (row: { personId: string }) => row.personId === personId,
          ),
          resourceTransferOutcomes: await fingerprint(
            world.history.resourceTransferOutcomes,
          ),
        },
      };
    },
    { id: slot, personId },
  );
}

// The retained generated Rutland home is a rowhouse with papers and no TV.
// This positive TV assertion remains unproved; no television or story is invented.
test.fixme("actual shell TV hotspot learns its shown report and persists across Keep/reload", async ({
  page,
}) => {
  const f = await openGeneratedShell(page);
  const before = await keepShellWorld(page, f.slot, f.personId);
  const tv = page.getByTestId("read-surface-living-room-television");
  await expect(tv).toBeVisible();
  await tv.click();
  await expect(page.getByTestId("scene-surface-reader")).toBeVisible();
  await expect(page.getByTestId("scene-surface-reader")).toContainText(
    f.publication.headline,
  );
  await page.getByRole("button", { name: "Back to room" }).click();
  const read = await keepShellWorld(page, f.slot, f.personId);
  const added = read.history.knowledge.filter(
    (row) => !before.history.knowledge.some((prior) => prior.id === row.id),
  );
  expect(added).toHaveLength(1);
  expect(read.knowledgeCount - before.knowledgeCount).toBe(1);
  expect(added[0]).toMatchObject({
    personId: f.personId,
    source: { kind: "media", reference: f.publication.publicationId },
  });
  expect(read.currentMoment).toEqual(before.currentMoment);
  expect(read.history.resourceTransferOutcomes).toEqual(
    before.history.resourceTransferOutcomes,
  );
  await tv.click();
  await page.getByRole("button", { name: "Back to room" }).click();
  expect(
    (await keepShellWorld(page, f.slot, f.personId)).knowledgeFingerprint,
  ).toEqual(read.knowledgeFingerprint);
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await tv.click();
  await page.getByRole("button", { name: "Back to room" }).click();
  expect(
    (await keepShellWorld(page, f.slot, f.personId)).knowledgeFingerprint,
  ).toEqual(read.knowledgeFingerprint);
});

test("actual shell headline learns through its parent callback and survives Save/reload", async ({
  page,
}) => {
  const f = await openGeneratedShell(page);
  const before = await keepShellWorld(page, f.slot, f.personId);
  await goTo(page, "nav-news");
  const headline = page
    .locator(`[data-story-id="${f.publication.publicationId}"]`)
    .getByRole("button")
    .first();
  await headline.click();
  await expect(page.getByTestId("news-article")).toBeVisible();
  const read = await keepShellWorld(page, f.slot, f.personId);
  const added = read.history.knowledge.filter(
    (row) => !before.history.knowledge.some((prior) => prior.id === row.id),
  );
  expect(added).toHaveLength(1);
  expect(read.knowledgeCount - before.knowledgeCount).toBe(1);
  expect(added[0]).toMatchObject({
    personId: f.personId,
    source: { kind: "media", reference: f.publication.publicationId },
  });
  expect(read.currentMoment).toEqual(before.currentMoment);
  expect(read.history.resourceTransferOutcomes).toEqual(
    before.history.resourceTransferOutcomes,
  );
  await page.getByRole("button", { name: "← Front page" }).click();
  await headline.click();
  expect(
    (await keepShellWorld(page, f.slot, f.personId)).knowledgeFingerprint,
  ).toEqual(read.knowledgeFingerprint);
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await goTo(page, "nav-news");
  await headline.click();
  expect(
    (await keepShellWorld(page, f.slot, f.personId)).knowledgeFingerprint,
  ).toEqual(read.knowledgeFingerprint);
});

test("actual quiet newspaper hotspot does not learn a generic day-lead article", async ({
  page,
}) => {
  const f = await openGeneratedShell(page);
  expect(f.paperStory).toBeNull();
  const before = await keepShellWorld(page, f.slot, f.personId);
  await expect(
    page.getByTestId("read-surface-living-room-television"),
  ).toHaveCount(0);
  const papers = page.getByTestId("read-surface-coffee-table-papers");
  await expect(papers).toBeVisible();
  await papers.click();
  await expect(page.getByTestId("scene-surface-reader")).toBeVisible();
  await page.getByRole("button", { name: "Back to room" }).click();
  const after = await keepShellWorld(page, f.slot, f.personId);
  expect(after.knowledgeFingerprint).toEqual(before.knowledgeFingerprint);
  expect(after.currentMoment).toEqual(before.currentMoment);
  expect(after.history.resourceTransferOutcomes).toEqual(
    before.history.resourceTransferOutcomes,
  );
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await papers.click();
  await page.getByRole("button", { name: "Back to room" }).click();
  expect(
    (await keepShellWorld(page, f.slot, f.personId)).knowledgeFingerprint,
  ).toEqual(before.knowledgeFingerprint);
});
