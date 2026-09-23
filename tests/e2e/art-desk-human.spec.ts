import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { expect, test, type Page } from "./fixtures";

/**
 * CRUNCH46 H5/H6: the human Art Desk, on the isolated data root the web
 * server is started with (PG_ARTBENCH_DATA_ROOT). A two-step delivery (an
 * original and its repair) becomes one named card with a lineage; the tabs
 * count real cards; filters stay small; Copy brief and Download brief produce
 * the named result. Nothing here touches production approvals.
 */

const require = createRequire(import.meta.url);
const BENCH = "/__dev/artbench";
const ACTOR = { kind: "owner", id: "e2e-fixture-owner" };
const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
] as const;

test("art-team conversation and next step stay above the artwork", async ({
  page,
  request,
  baseURL,
}, testInfo) => {
  await page.goto("/art-desk.html");
  const state = await (await request.get(`${BENCH}/state`)).json();
  const entry = (
    Object.values(state.projection.requests) as {
      qa?: boolean;
      request: { requestId: string };
    }[]
  ).find((item) => !item.qa && item.request.requestId !== "inbox");
  expect(entry).toBeTruthy();
  const requestId = entry!.request.requestId;
  const candidate = await intake(page, png(96, 64, 241), {
    requestId,
    originalName: "conversation-layout.png",
  });
  for (const text of ["First fit note.", "I am checking its fit."]) {
    const response = await request.post(`${BENCH}/events`, {
      headers: { Origin: baseURL! },
      data: {
        type: "message.posted",
        actor: { kind: "agent", id: "art-team" },
        payload: { requestId, candidateId: candidate, kind: "note", text },
      },
    });
    expect(response.status()).toBe(201);
  }
  await page.reload();
  await page.getByTestId("art-desk-tab-in-progress").click();
  await page.getByTestId(`art-desk-row-${requestId}`).click();
  const discussion = page.getByTestId("art-desk-discussion");
  await expect(discussion).toBeVisible();
  await expect(
    discussion.getByTestId("art-desk-message").first(),
  ).toContainText("I am checking its fit.");
  await expect(page.getByTestId("art-desk-next-step")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const discussion = document.querySelector(
        '[data-testid="art-desk-discussion"]',
      );
      const preview = document.querySelector(
        '[data-testid="art-desk-preview"]',
      );
      return Boolean(
        discussion &&
        preview &&
        discussion.compareDocumentPosition(preview) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(discussion).toBeVisible();
    const previewBox = await page.getByTestId("art-desk-preview").boundingBox();
    const discussionBox = await discussion.boundingBox();
    expect(previewBox).not.toBeNull();
    expect(discussionBox).not.toBeNull();
    expect(previewBox!.y).toBeLessThan(viewport.height);
    const imageBox = await page
      .getByTestId("art-desk-preview")
      .locator("img")
      .first()
      .boundingBox();
    expect(imageBox).not.toBeNull();
    expect(imageBox!.y + imageBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(discussionBox!.y).toBeLessThan(viewport.height);
    expect(discussionBox!.y + discussionBox!.height).toBeLessThanOrEqual(
      viewport.height,
    );
    expect(discussionBox!.x).toBeGreaterThan(previewBox!.x);
    await page.screenshot({
      path: testInfo.outputPath(`conversation-${viewport.width}.png`),
    });
  }
});

function png(width: number, height: number, seed: number): Buffer {
  const { PNG } = require("pngjs") as {
    PNG: new (o: { width: number; height: number }) => { data: Buffer };
  };
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = (i * 5 + seed) % 256;
    image.data[i + 1] = (i * 11 + seed * 3) % 256;
    image.data[i + 2] = 120;
    image.data[i + 3] = 255;
  }
  return Buffer.from(
    (PNG as unknown as { sync: { write(p: unknown): Buffer } }).sync.write(
      image,
    ),
  );
}

async function intake(
  page: Page,
  bytes: Buffer,
  meta: Record<string, unknown>,
): Promise<string> {
  const result = await page.evaluate(
    async ({ bench, data, meta }) => {
      const params = new URLSearchParams({ meta: JSON.stringify(meta) });
      const response = await fetch(`${bench}/intake?${params}`, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array(data),
      });
      const body = await response.json();
      return { ok: response.ok, id: body.candidate?.candidateId as string };
    },
    { bench: BENCH, data: [...bytes], meta },
  );
  expect(result.ok).toBe(true);
  return result.id;
}

test("the human Art Desk: named cards, lineage, small filters, brief copy and download", async ({
  page,
  request,
  baseURL,
  context,
}, info) => {
  test.setTimeout(150_000);
  const origin = baseURL ?? "http://127.0.0.1";
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/art-desk.html");
  await expect(page.getByTestId("art-desk")).toBeVisible();

  const stamp = String(info.workerIndex * 1000 + (Date.now() % 1000));
  const requestId = `e2e-corridor-${stamp}`;
  const session = await (
    await request.get(`${BENCH}/session`, {
      headers: { "Sec-Fetch-Site": "same-origin" },
    })
  ).json();
  const created = await request.post(`${BENCH}/events`, {
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-OCD-Owner-Capability": session.capability,
    },
    data: {
      type: "request.created",
      actor: ACTOR,
      payload: {
        request: {
          requestId,
          requestVersion: 1,
          priority: "P2",
          status: "queued",
          title: "School corridor",
          consumer: {
            consumerId: "isolated-corridor-test",
            runtimeComponent: "none",
            playerVisibleUse: "Isolated UI fixture only.",
          },
          whyNeeded:
            "Verify review transitions without touching owner records.",
          inventoryCheck: {
            repositoryPathsSearched: ["art/families/"],
            driveLocationsSearched: ["none"],
            found: "Disposable generated test pixels.",
            shortfall: "None.",
          },
          target: {
            targetClass: "environment-plate",
            minimumWidth: 1,
            aspectRatio: "any",
            alphaRequired: false,
            container: "either",
            styleAuthority: "Test fixture",
          },
          generationRecipe: ["Do not generate."],
          acceptanceCriteria: ["Preserve exact revision and review history."],
          dependsOn: [],
        },
      },
    },
  });
  expect(created.status()).toBe(201);
  const original = await intake(page, png(64, 36, Number(stamp)), {
    requestId,
    originalName: `corridor_native_${stamp}.png`,
    note: "Owner-generated native plate.",
  });
  const tagged = await request.post(`${BENCH}/events`, {
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-OCD-Owner-Capability": session.capability,
    },
    data: JSON.stringify({
      type: "tags.set",
      actor: ACTOR,
      payload: {
        entity: "candidate",
        entityId: original,
        tags: {
          family: ["school-corridor-generic"],
          assetType: ["environment-plate"],
        },
        baseVersion: 0,
      },
    }),
  });
  expect(tagged.status()).toBe(201);
  const repair = await intake(page, png(64, 36, Number(stamp) + 1), {
    requestId,
    originalName: `corridor_fix_${stamp}.png`,
    parentCandidateId: original,
    editKind: "repaint",
    note: "TITLE: School corridor B - fountain fix (E2E). STAGE: ready for owner review (not approved). CHANGES: added a wall-mounted drinking fountain. Nothing else moved.",
  });

  await page.reload();
  const needs = page.getByTestId("art-desk-tab-needs-review");
  await expect(needs).toHaveAttribute("aria-current", "page");
  const card = page
    .getByTestId("art-desk-list")
    .getByRole("button", { name: /School corridor — fountain fix/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("added a wall-mounted drinking fountain.");
  await expect(card).toContainText("Awaiting review");
  await expect(card).toContainText("2 versions");
  await expect(card).not.toContainText(/\brev\s*\d/i);
  await card.click();
  const lineage = page.getByTestId("art-desk-asset-lineage");
  await lineage.locator("summary").click();
  await expect(lineage).toContainText("Original");
  await expect(lineage).toContainText("Repair");
  await expect(page.getByTestId(`art-desk-candidate-${repair}`)).toBeVisible();

  // Filters: three visible, the rest in one drawer; QA hidden by default.
  await expect(page.getByTestId("art-desk-asset-type")).toBeVisible();
  await expect(page.getByTestId("art-desk-more-drawer")).toHaveCount(0);
  await page.getByTestId("art-desk-more-filters").click();
  await expect(page.getByTestId("art-desk-more-drawer")).toBeVisible();
  await expect(page.getByTestId("art-desk-show-qa")).not.toBeChecked();
  await page
    .getByTestId("art-desk-filter-family")
    .selectOption("school-corridor-generic");
  await expect(page.getByTestId("art-desk-more-filters")).toContainText("(1)");
  await expect(card).toBeVisible();
  await page.getByTestId("art-desk-clear-filters").click();
  await expect(page.getByTestId("art-desk-more-filters")).not.toContainText(
    "(",
  );

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await expect(card).toBeVisible();
    await expect(page.getByTestId("art-desk-copy-brief")).toBeAttached();
    await page.screenshot({
      path: info.outputPath(`art-desk-human-${size.name}.png`),
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // Copy brief puts the actual brief on the clipboard and says so.
  await page.getByTestId("art-desk-copy-brief").click();
  await expect(page.getByTestId("art-desk-brief-status")).toContainText(
    "Copied the brief",
  );
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const served = await page.evaluate(
    async ({ candidateId, requestId }) => {
      const response = await fetch(
        `/__dev/artbench/brief?requestId=${encodeURIComponent(requestId)}&candidateId=${encodeURIComponent(candidateId)}`,
      );
      if (!response.ok)
        throw new Error(`Brief fetch failed (${response.status})`);
      return response.text();
    },
    { candidateId: repair, requestId },
  );
  expect(copied).toBe(served);

  // Download brief writes the same text under a readable name.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("art-desk-download-brief").click(),
  ]);
  expect(download.suggestedFilename()).toBe("school-corridor-brief.md");
  const saved = await download.path();
  expect(readFileSync(saved, "utf8")).toBe(served);

  // Download original: a readable name that keeps the hash, and a real signal.
  const [image] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("art-desk-download-original").click(),
  ]);
  expect(image.suggestedFilename()).toMatch(
    /^school-corridor-fountain-fix-[0-9a-f]{12}\.png$/,
  );
  await expect(page.getByTestId("art-desk-original-status")).toContainText(
    "hash verified",
  );

  await page.getByText("Ask or reply", { exact: true }).click();
  await page
    .getByTestId("art-desk-question")
    .fill("Is this an image to review or a request?");
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(page.getByTestId("art-desk-message")).toContainText(
    "Is this an image to review or a request?",
  );
  await expect(page.getByTestId("art-desk-next-step")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const discussion = document.querySelector(
        '[data-testid="art-desk-discussion"]',
      );
      const preview = document.querySelector(
        '[data-testid="art-desk-preview"]',
      );
      return Boolean(
        discussion &&
        preview &&
        discussion.compareDocumentPosition(preview) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
  await page.reload();
  await expect(page.getByTestId("art-desk-message")).toContainText(
    "Is this an image to review or a request?",
  );

  // Style references, rejected and removed art are off the desk: no tab
  // lists or loads them (their history stays in the store).
  for (const offDesk of ["references", "archived", "rejected", "library"])
    await expect(page.getByTestId(`art-desk-tab-${offDesk}`)).toHaveCount(0);

  // A failed write keeps this exact review visible. A successful canonical
  // decision removes it immediately, without a browser reload or history loss.
  const eventsRoute = "**/__dev/artbench/events";
  await page.route(eventsRoute, async (route) => {
    if (route.request().postDataJSON()?.type === "review.decided") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "fixture-conflict",
          message: "Disposable rejected-write proof",
        }),
      });
    } else await route.continue();
  });
  const approve = page
    .getByTestId("art-desk-detail")
    .getByRole("button", { name: "Approve", exact: true });
  await approve.click();
  await expect(page.getByTestId("art-desk-status")).toContainText(
    "Could not save your decision",
  );
  await expect(card).toBeVisible();
  await page.unroute(eventsRoute);
  await approve.click();
  await expect(page.getByTestId("art-desk-status")).toContainText(
    "Approved. Moved",
  );
  await expect(card).toHaveCount(0);
  await page.getByTestId("art-desk-tab-approved").click();
  await expect(card).toBeVisible();
  await expect(card).not.toContainText("Awaiting review");
  await card.click();
  await expect(page.getByTestId("art-desk-viewed")).toHaveAttribute(
    "data-candidate-id",
    repair,
  );
  const state = await page.evaluate(async () => {
    const response = await fetch("/__dev/artbench/state");
    if (!response.ok)
      throw new Error(`State fetch failed (${response.status})`);
    return response.json();
  });
  expect(state.projection.candidates[original].status).toBe("awaiting-review");
  expect(state.projection.candidates[repair].status).not.toBe(
    "awaiting-review",
  );
  await page.screenshot({
    path: info.outputPath("approved-kept-in-library.png"),
  });
  await page
    .getByTestId("art-desk-detail")
    .getByRole("button", { name: "Reject", exact: true })
    .click();
  await expect(page.getByTestId("art-desk-status")).toContainText(
    "Rejected. Moved",
  );
  // Rejected art leaves the desk; the store keeps its decision history.
  await expect(card).toHaveCount(0);
  const afterReject = await page.evaluate(async () => {
    const response = await fetch("/__dev/artbench/state");
    if (!response.ok)
      throw new Error(`State fetch failed (${response.status})`);
    return response.json();
  });
  expect(afterReject.projection.candidates[repair].status).toBe("rejected");
  await page.screenshot({ path: info.outputPath("rejected-off-desk.png") });
});

test("returned images keep the exact original reference accessible", async ({
  page,
  request,
  baseURL,
}, info) => {
  await page.goto("/art-desk.html");
  await expect(page.getByTestId("art-desk")).toBeVisible();
  const origin = baseURL!;
  const session = await (
    await request.get(`${BENCH}/session`, {
      headers: { "Sec-Fetch-Site": "same-origin" },
    })
  ).json();
  const state = await (await request.get(`${BENCH}/state`)).json();
  const seed = Object.values(state.projection.requests)[0] as {
    request: Record<string, unknown>;
  };
  const reference = await intake(page, png(96, 64, 104), {
    originalName: "reference-proof.png",
  });
  const after = await (await request.get(`${BENCH}/state`)).json();
  const referenceRow = after.projection.candidates[reference];
  const requestId = "e2e-visible-original-reference";
  const created = await request.post(`${BENCH}/events`, {
    headers: { Origin: origin, "X-OCD-Owner-Capability": session.capability },
    data: {
      type: "request.created",
      actor: ACTOR,
      payload: {
        request: {
          ...seed.request,
          requestId,
          requestVersion: 1,
          title: "Visible original reference",
          target: {
            ...(seed.request.target as object),
            styleReferences: [
              {
                role: "subject-content",
                ref: `candidate:${reference}`,
                sha256: referenceRow.sha256,
                width: 96,
                height: 64,
              },
            ],
          },
        },
      },
    },
  });
  expect(created.status()).toBe(201);
  await intake(page, png(96, 64, 201), {
    requestId,
    originalName: "returned-image.png",
  });
  await page.reload();
  await page
    .getByTestId("art-desk-list")
    .getByRole("button", { name: /Visible original reference/ })
    .click();
  const ref = page.getByTestId("art-desk-style-reference");
  await expect(
    ref.getByRole("heading", { name: "Original reference" }),
  ).toBeVisible();
  await expect(ref.locator("img")).toBeVisible();
  await expect(
    page.getByText("Editing instructions", { exact: true }).locator(".."),
  ).not.toHaveAttribute("open", "");
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const download = ref.getByRole("link", { name: "Download reference" });
    await expect(download).toBeVisible();
    const [saved] = await Promise.all([
      page.waitForEvent("download"),
      download.click(),
    ]);
    expect(await saved.failure()).toBeNull();
    const filename = info.outputPath(`reference-${size.name}.png`);
    await saved.saveAs(filename);
    expect(readFileSync(filename)).toEqual(png(96, 64, 104));
    await ref.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(ref.locator("details")).toHaveAttribute("open", "");
    await ref.locator("summary").click();
    await page.screenshot({
      path: info.outputPath(`visible-reference-${size.name}.png`),
    });
  }
});

test("notifications show team replies, retain unread on failure and reopen the exact conversation", async ({
  page,
  request,
  baseURL,
}, info) => {
  await page.goto("/art-desk.html");
  await expect(page.getByTestId("art-desk")).toBeVisible();
  const session = await (
    await request.get(`${BENCH}/session`, {
      headers: { "Sec-Fetch-Site": "same-origin" },
    })
  ).json();
  const headers = {
    Origin: baseURL!,
    "X-OCD-Owner-Capability": session.capability,
  };
  const state = await (await request.get(`${BENCH}/state`)).json();
  const entry = (
    Object.values(state.projection.requests) as {
      qa?: boolean;
      request: { requestId: string };
    }[]
  ).find((r) => !r.qa && r.request.requestId !== "inbox") as {
    request: { requestId: string };
  };
  const requestId = entry.request.requestId;
  const candidate = await intake(page, png(96, 64, 222), {
    requestId,
    originalName: "notification-version.png",
  });
  const post = async (
    actor: Record<string, string>,
    payload: Record<string, unknown>,
  ) => {
    const response = await request.post(`${BENCH}/events`, {
      headers,
      data: { type: "message.posted", actor, payload },
    });
    expect(response.status()).toBe(201);
    return (await response.json()).events[0];
  };
  const question = await post(
    { kind: "owner", id: session.ownerId },
    {
      requestId,
      candidateId: candidate,
      kind: "question",
      text: "Can I use this version?",
    },
  );
  const reply = await post(
    { kind: "agent", id: "art-team" },
    {
      requestId,
      candidateId: candidate,
      kind: "reply",
      replyTo: question.eventId,
      text: "Your reference is ready to download.",
    },
  );
  // A later revision must not steal the reply link's exact image.
  await intake(page, png(96, 64, 223), {
    requestId,
    parentCandidateId: candidate,
    editKind: "repaint",
    originalName: "later-version.png",
  });
  await page.reload();
  const tab = page.getByTestId("art-desk-tab-notifications");
  await page.getByTestId("art-desk-tab-discussion").click();
  await page.getByTestId("art-desk-list").getByRole("button").first().click();
  await page.getByText("Ask or reply", { exact: true }).click();
  const draft = page.getByTestId("art-desk-question");
  await draft.fill("Please keep this unfinished question.");
  await tab.click();
  const draftReply = page.getByTestId(`art-desk-notification-${reply.eventId}`);
  await draftReply
    .getByRole("button", { name: "Open artwork and message" })
    .click();
  await expect(page.getByRole("alert")).toContainText("unfinished note");
  await expect(draftReply).toHaveAttribute("data-unread", "true");
  await page.getByRole("button", { name: "Back to artwork" }).click();
  await expect(draft).toHaveValue("Please keep this unfinished question.");
  await draft.fill("");
  await tab.click();
  const item = page.getByTestId(`art-desk-notification-${reply.eventId}`);
  await expect(item).toHaveAttribute("data-unread", "true");
  await expect(item).toContainText("Your reference is ready to download.");
  await page.route("**/__dev/artbench/notifications/read", (route) =>
    route.fulfill({ status: 503, body: "temporarily unavailable" }),
  );
  await item.getByRole("button", { name: "Mark read", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Could not save read status",
  );
  await expect(item).toHaveAttribute("data-unread", "true");
  await page.unroute("**/__dev/artbench/notifications/read");
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await expect(
      item.getByRole("button", { name: "Open artwork and message" }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`notifications-${size.name}.png`),
    });
  }
  await item.getByRole("button", { name: "Open artwork and message" }).focus();
  await page.keyboard.press("Enter");
  const message = page.locator(`[id="art-desk-message-${reply.eventId}"]`);
  await expect(message).toBeFocused();
  await expect(
    page.getByTestId(`art-desk-candidate-${candidate}`),
  ).toHaveAttribute("aria-pressed", "true");
  await tab.click();
  await expect(item).toHaveAttribute("data-unread", "false");
  await page.reload();
  await page.getByTestId("art-desk-tab-notifications").click();
  await expect(
    page.getByTestId(`art-desk-notification-${reply.eventId}`),
  ).toHaveAttribute("data-unread", "false");
  const unreadBefore = Number(
    (await tab.textContent())?.match(/\d+/)?.[0] ?? 0,
  );
  const incoming = await post(
    { kind: "agent", id: "art-team" },
    {
      requestId,
      candidateId: candidate,
      kind: "note",
      text: "A team update arrived without a prior question.",
    },
  );
  const incomingItem = page.getByTestId(
    `art-desk-notification-${incoming.eventId}`,
  );
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(incomingItem).toHaveAttribute("data-unread", "true", {
    timeout: 22_000,
  });
  await expect
    .poll(async () => Number((await tab.textContent())?.match(/\d+/)?.[0] ?? 0))
    .toBe(unreadBefore + 1);
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(incomingItem).toHaveAttribute("data-unread", "false");
  await page.screenshot({ path: info.outputPath("notifications-read.png") });
});
