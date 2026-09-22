import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "./fixtures";

/** The per-request lane view, diagnostics and queue live under Advanced. */
async function openAdvanced(page: Page) {
  const advanced = page.getByTestId("art-desk-advanced");
  if ((await advanced.getAttribute("open")) === null)
    await advanced.locator("summary").click();
  await expect(page.getByTestId("art-desk-lane-needs-review")).toBeVisible();
}

test("private Art Desk reviews the durable queue without writing saves", async ({
  page,
}) => {
  await page.goto("/art-desk.html");
  await openAdvanced(page);
  await expect(page.getByTestId("art-desk")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Art Desk" })).toBeVisible();
  await expect(page.getByTestId("art-desk-lane-needs-review")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("art-desk-pack")).toContainText("access/input");
  await expect(
    page.getByTestId("art-desk-row-env-neighborhood-doorstep-generic"),
  ).toBeVisible();
  await page
    .getByTestId("art-desk-row-env-neighborhood-doorstep-generic")
    .click();
  await expect(page.getByTestId("art-desk-detail")).toContainText("stoop");
  await expect(page.getByTestId("art-desk-preview")).toBeVisible();
  await expect(
    page
      .getByTestId("art-desk-candidate-preview")
      .or(page.getByTestId("art-desk-candidate-preview-missing")),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.getByTestId("art-desk-lane-history").click();
  await expect(
    page.getByTestId("art-desk-row-env-campaign-storefront"),
  ).toBeVisible();
  await expect(
    page.getByTestId("art-desk-row-env-campaign-storefront"),
  ).toContainText("History");
  await expect(page.getByTestId("art-desk-detail")).not.toContainText(
    "Winter variant of the existing park community pavilion",
  );
  const before = await page.evaluate(() => indexedDB.databases());
  await page.setViewportSize({ width: 1200, height: 720 });
  await expect(page.getByTestId("art-desk")).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByTestId("art-desk")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  const after = await page.evaluate(() => indexedDB.databases());
  expect(after).toEqual(before);
});

test("new requests stay independent of a selected row; related variants copy deliberately", async ({
  page,
}) => {
  await page.goto("/art-desk.html");
  await openAdvanced(page);
  await page
    .getByTestId("art-desk-row-env-neighborhood-doorstep-generic")
    .click();
  await page.getByTestId("art-desk-related-request-open").click();
  const form = page.getByTestId("art-desk-new-request");
  await expect(form).toHaveAttribute("data-mode", "related");
  await expect(page.getByTestId("art-desk-new-request-heading")).toContainText(
    "copies its size",
  );
  await expect(page.getByTestId("art-desk-new-consumer")).not.toHaveValue("");

  await page.getByTestId("art-desk-new-request-open").click();
  await expect(form).toHaveAttribute("data-mode", "new");
  await expect(page.getByTestId("art-desk-new-request-heading")).toContainText(
    "nothing is copied",
  );
  await expect(page.getByTestId("art-desk-new-consumer")).toHaveValue("");
  await expect(page.getByTestId("art-desk-new-recipe")).toHaveValue("");
  await expect(page.getByTestId("art-desk-new-references")).toContainText(
    "optional",
  );
  const newButton = page.getByTestId("art-desk-new-request-open");
  await newButton.focus();
  await page.keyboard.press("Enter");
  await expect(form).toHaveCount(0);
});

test("Art Desk bridge refuses traversal and production-style hosts", async ({
  request,
  baseURL,
}) => {
  const traversal = await request.get(
    "/__dev/art-desk/file?path=art/requests/../../package.json",
  );
  expect(traversal.status()).toBe(403);
  const forged = await request.put(
    "/__dev/art-desk/file?path=art/requests/asset-reviews.json",
    {
      headers: {
        Origin: "https://example.invalid",
        "Content-Type": "application/json",
      },
      data: "{}",
    },
  );
  expect(forged.status()).toBe(403);
  const candidate = await request.get(
    "/__dev/art-desk/file?path=art/generated/candidates/art-desk/env-neighborhood-doorstep-generic/b0ced60cf0ea130db316f6d63ae61e34009795a6a04a4abebe79c55926e47266.jpg",
  );
  expect([200, 404]).toContain(candidate.status());
  expect(candidate.status()).not.toBe(403);
  expect(baseURL).toMatch(/127\.0\.0\.1|localhost|\[::1\]/);
});

/** Disposable QA request kept in the private sidecar, never in the registry. */
const QA_REQUEST = {
  requestId: "qa-art-desk-round-trip",
  requestVersion: 1,
  priority: "P2",
  status: "draft",
  title: "QA round trip: existing raster through the bench",
  consumer: {
    consumerId: "qa-bench",
    runtimeComponent: "none",
    playerVisibleUse: "Bench proof only; never shown to a player.",
  },
  whyNeeded: "Proves import, selection, full-size preview and reload.",
  inventoryCheck: {
    repositoryPathsSearched: ["art/families/"],
    driveLocationsSearched: ["none"],
    found: "An existing tracked raster is reused as the candidate.",
    shortfall: "None; this is a disposable QA request.",
  },
  target: {
    targetClass: "environment-plate",
    minimumWidth: 1,
    aspectRatio: "any",
    alphaRequired: false,
    container: "either",
    styleAuthority: "not applicable — QA fixture",
  },
  generationRecipe: ["Do not generate."],
  acceptanceCriteria: ["Preview decodes after reload."],
  dependsOn: [],
};
/**
 * Where a disposable test request actually is, by its own visible controls:
 * Library (a request with no candidate to judge is not review work, so it is
 * not on the Needs review tab the desk opens on), then More filters, then
 * "Show test requests". None of this is a shortcut — it is the route.
 */
async function showTestRequests(page: Page): Promise<void> {
  await page.getByTestId("art-desk-tab-library").click();
  const showQa = page.getByTestId("art-desk-show-qa");
  if ((await showQa.count()) === 0)
    await page.getByTestId("art-desk-more-filters").click();
  await showQa.check();
}

const QA_SIDECAR = "art/generated/candidates/art-desk/qa-requests.json";
const CANDIDATE_SIDECAR = "art/generated/candidates/art-desk/candidates.json";
const EXISTING_RASTER =
  "art/families/apartment-ordinary/env_residence_apartment_living_ordinary_02_v1.png";

function fileUrl(path: string): string {
  return `/__dev/art-desk/file?path=${encodeURIComponent(path)}`;
}

test("an existing raster round-trips upload → reload → same candidate → full-size preview", async ({
  page,
  request,
  baseURL,
}) => {
  const origin = baseURL ?? "http://127.0.0.1";
  // Bridge writes require the loopback authoring origin, as the browser sends.
  const headers = { "Content-Type": "application/json", Origin: origin };
  const priorQa = await request.get(fileUrl(QA_SIDECAR));
  const priorQaBody = priorQa.ok() ? await priorQa.text() : null;
  const priorQaRev = priorQa.headers()["x-art-desk-revision"];
  const priorCandidates = await request.get(fileUrl(CANDIDATE_SIDECAR));
  const priorCandidatesBody = priorCandidates.ok()
    ? await priorCandidates.text()
    : null;
  const put = (path: string, body: string, ifMatch?: string) =>
    request.put(fileUrl(path), {
      headers: ifMatch ? { ...headers, "If-Match": ifMatch } : headers,
      data: body,
    });
  const wrote = await put(
    QA_SIDECAR,
    JSON.stringify({ documentVersion: 1, requests: [QA_REQUEST] }),
    priorQaRev,
  );
  expect(wrote.ok()).toBeTruthy();
  const reviewsBefore = await (
    await request.get(fileUrl("art/requests/asset-reviews.json"))
  ).json();

  try {
    await page.goto("/art-desk.html");
    await openAdvanced(page);
    await expect(page.getByTestId("art-desk-inputs")).toBeVisible();
    await expect(page.getByTestId("art-desk-pack")).toHaveAttribute(
      "data-pack-status",
      /not-configured|verified|incomplete|missing|invalid/,
    );
    // A row without bytes keeps a readable two-column layout.
    const doorstepRow = page.getByTestId(
      "art-desk-row-env-neighborhood-doorstep-generic",
    );
    await expect(
      page.getByTestId("art-desk-thumb-env-neighborhood-doorstep-generic-none"),
    ).toBeVisible();
    const copyBox = await doorstepRow
      .locator(".art-desk-row-copy")
      .boundingBox();
    expect(copyBox?.width ?? 0).toBeGreaterThan(160);

    const qaRow = page.getByTestId(`art-desk-row-${QA_REQUEST.requestId}`);
    /*
     * A disposable QA request is hidden from the desk twice over, and the desk
     * is right both times. It is not review work — with no candidate to judge
     * it belongs to Library, not the Needs review tab the desk opens on — and
     * test rows stay out of the real list until "Show test requests" asks for
     * them. So this proof goes where the request actually is and presses the
     * control that asks, rather than expecting the desk to volunteer a row it
     * is right to keep back.
     */
    await showTestRequests(page);
    await expect(qaRow).toBeVisible();
    // The word this list uses, and the same word as the control that reveals
    // it: "Show test requests". "QA, disposable" is the delivery list's
    // phrasing, not the request list's. The detail panel below still has to
    // say it in full.
    await expect(qaRow).toContainText("· test");
    await qaRow.click();
    await expect(page.getByTestId("art-desk-detail")).toContainText(
      "Disposable QA request",
    );
    await page.getByTestId("art-desk-upload").setInputFiles(EXISTING_RASTER);
    await expect(page.getByTestId("art-desk-status")).toContainText(
      "stored as",
    );
    const state = page.getByTestId("art-desk-candidate-state");
    await expect(state).toHaveAttribute("data-candidate-bytes", "verified");
    const stateText = await state.textContent();
    const hash = /Recorded hash ([a-f0-9]{12})/.exec(stateText ?? "")?.[1];
    expect(hash).toBeTruthy();
    const preview = page.getByTestId("art-desk-candidate-preview");
    await expect(preview).toBeVisible();
    await expect
      .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(
      page
        .getByTestId("art-desk-detail")
        .getByRole("button", { name: "Approve", exact: true }),
    ).toBeEnabled();

    // Reload: the association must come back from the sidecar, not React state.
    await page.reload();
    await openAdvanced(page);
    await expect(page.getByTestId("art-desk-inputs")).toBeVisible();
    // The desk remembers the tab across a reload but not the request to show
    // test rows, so this asks again, the way the player of this desk would.
    await showTestRequests(page);
    await page.getByTestId(`art-desk-row-${QA_REQUEST.requestId}`).click();
    const uploadedId = await page.evaluate(async (prefix) => {
      const state = (await (
        await fetch("/__dev/artbench/state", { cache: "no-store" })
      ).json()) as {
        projection: { candidates: Record<string, { sha256: string }> };
      };
      return Object.entries(state.projection.candidates).find(([, c]) =>
        c.sha256.startsWith(prefix),
      )?.[0];
    }, hash ?? "");
    expect(uploadedId).toBeTruthy();
    await page.getByTestId(`art-desk-candidate-${uploadedId ?? ""}`).click();
    await expect(page.getByTestId("art-desk-candidate-state")).toContainText(
      `Recorded hash ${hash}`,
    );
    await expect(page.getByTestId("art-desk-candidate-state")).toContainText(
      "bench",
    );
    const reloaded = page.getByTestId("art-desk-candidate-preview");
    await expect(reloaded).toBeVisible();
    await expect
      .poll(() =>
        reloaded.evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(
      page.getByTestId(`art-desk-thumb-${QA_REQUEST.requestId}`),
    ).toBeVisible();

    // Typing in Search must not fire approval keys.
    await page.getByLabel("Search requests").fill("");
    await page.getByLabel("Search requests").type("a x r");
    await expect(page.getByLabel("Search requests")).toHaveValue("a x r");
    await expect(page.getByTestId("art-desk-status")).not.toContainText(
      "recorded for",
    );
    const reviewsAfter = await (
      await request.get(fileUrl("art/requests/asset-reviews.json"))
    ).json();
    expect(reviewsAfter.reviews.length).toBe(reviewsBefore.reviews.length);

    // The write boundary refuses a decision on bytes that are not verified.
    const currentReviews = await request.get(
      fileUrl("art/requests/asset-reviews.json"),
    );
    const forged = await put(
      "art/requests/asset-reviews.json",
      JSON.stringify({
        ...reviewsBefore,
        reviews: [
          ...reviewsBefore.reviews,
          {
            reviewId: "e2e-fixture-unverified",
            requestId: QA_REQUEST.requestId,
            requestVersion: 1,
            outputSha256: "0".repeat(64),
            contractVersion: "alive43-art-desk-v1",
            fitContractHash: "f".repeat(64),
            sceneContractHash: "s".repeat(64),
            decision: "approve",
            authorId: "e2e-fixture",
            decidedAt: "2026-09-16T00:00:00.000Z",
            rightsStatus: "unknown",
            sourceDeclaration: "fixture",
          },
        ],
      }),
      currentReviews.headers()["x-art-desk-revision"],
    );
    expect(forged.status()).toBe(422);
    expect(origin).toMatch(/127\.0\.0\.1|localhost/);
  } finally {
    // Leave no QA metadata or bytes behind; other authors' records are restored.
    const qaNow = await request.get(fileUrl(QA_SIDECAR));
    await put(
      QA_SIDECAR,
      priorQaBody ?? JSON.stringify({ documentVersion: 1, requests: [] }),
      qaNow.headers()["x-art-desk-revision"],
    );
    const candidatesNow = await request.get(fileUrl(CANDIDATE_SIDECAR));
    await put(
      CANDIDATE_SIDECAR,
      priorCandidatesBody ??
        JSON.stringify({ documentVersion: 1, candidates: [] }),
      candidatesNow.headers()["x-art-desk-revision"],
    );
    const qaDir = resolve(
      process.cwd(),
      "art/generated/candidates/art-desk",
      QA_REQUEST.requestId,
    );
    if (existsSync(qaDir)) rmSync(qaDir, { recursive: true, force: true });
  }
});
