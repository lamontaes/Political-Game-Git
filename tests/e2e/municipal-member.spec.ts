import { saveLife } from "./support/creator";
/** Run on UI-core's identified composed candidate, not the isolated fixture HTML.
 * A real creator save is the control. Only the explicit test office is authored;
 * production controls never grant it and all subsequent actions use normal UI.
 */
import { test, expect, type Page } from "./fixtures";
import { enterLife, startLife } from "./support/creator";
import {
  createBrowserWorldRecord,
  type StoredBrowserWorldRecord,
} from "../../src/presentation/browser-world-repository";
import { deserializeWorld } from "../../src/simulation/serialization";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../../src/simulation/municipal-public-work";
import { municipalWorkspaceFor } from "../../src/presentation/municipal-workspace";
import { simulationMinutesBetween } from "../../src/simulation/dates";
import { workItemState } from "../../src/simulation/time-work";

async function goTo(page: Page, id: string) {
  const flyout = page.getByTestId("shell-nav-flyout");
  if (!(await flyout.isVisible()))
    await page.getByTestId("shell-nav-cluster").click();
  await expect(flyout).toBeVisible();
  await page.getByTestId(id).click();
}

async function savedRecord(page: Page): Promise<StoredBrowserWorldRecord> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<StoredBrowserWorldRecord[]>(
      (resolve, reject) => {
        const request = db
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();
    return records[0]!;
  });
}

async function save(page: Page) {
  await saveLife(page);
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  return deserializeWorld((await savedRecord(page)).payload);
}

test("normal saved municipal member completes work once and reloads without acquiring further authority", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  const missingOptionalAssets: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (
      new URL(message.location().url || "http://unknown.invalid").pathname ===
        "/favicon.ico" &&
      message.text().includes("404")
    )
      missingOptionalAssets.push("favicon.ico returned 404");
    else errors.push(message.text());
  });
  await page.goto("/?seed=muni-finish4-member");
  await startLife(page, {
    age: 35,
    place: "Carson City, Nevada",
    placeScope: "locality",
    placeQuery: "Carson City",
    route: "normal",
  });
  await enterLife(page);
  const citizen = await save(page);
  const original = await savedRecord(page);
  const view = municipalWorkspaceFor(citizen)!;
  expect(view.government.key).toBe("us-nv-carson-city");
  expect(view.standing.roles).not.toContain("member");
  const personId = view.standing.personId;
  let member = installMunicipalGovernment(citizen, {
    governmentKey: view.government.key,
    jurisdictionId: citizen.people[personId]!.homeJurisdictionId,
    formedAt: citizen.currentDate,
  });
  member = seatMunicipalMember(member, {
    governmentKey: view.government.key,
    personId,
    startedAt: member.currentDate,
    role: "member",
    seatLabel: "Explicit saved-member acceptance fixture",
  });
  expect(member.people).toEqual(citizen.people);
  expect(member.currentMoment).toEqual(citizen.currentMoment);
  const record = createBrowserWorldRecord(
    member,
    original.metadata.savedAt,
    original.metadata.createdAt,
    original.saveId,
    original.generation + 1,
  );
  // End the live World before replacing this isolated test's saved-role fixture.
  await page.reload();
  await expect(page.getByTestId("continue")).toBeVisible();
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("worlds", "readwrite");
      transaction.objectStore("worlds").put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, record);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-municipal");
  const panel = page.getByRole("region", { name: "Municipal government" });
  await panel
    .getByRole("button", { name: "Add public session to this world" })
    .click();
  await panel
    .getByRole("button", { name: "Prepare meeting notes", exact: true })
    .press("Enter");
  const ready = await save(page);
  await goTo(page, "nav-municipal");
  await panel
    .getByRole("button", { name: /^Work on meeting notes/ })
    .press("Space");
  await expect(
    panel.getByText("Meeting notes: Completed.", { exact: false }),
  ).toBeVisible();
  const completed = await save(page);
  const item = completed.history.workItems.find((entry) =>
    entry.stableKey.startsWith(
      `municipal-work:${view.government.key}:meeting-notes:`,
    ),
  )!;
  expect(workItemState(completed, item.id).status).toBe("completed");
  expect(
    simulationMinutesBetween(ready.currentMoment, completed.currentMoment),
  ).toBe(20);
  expect(completed.history.organizationParticipations).toEqual(
    member.history.organizationParticipations,
  );
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-municipal");
  await expect(
    panel.getByText("Meeting notes: Completed.", { exact: false }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Prepare meeting notes", exact: true })
    .click();
  expect(await save(page)).toEqual(completed);
  await goTo(page, "nav-municipal");
  await page.screenshot({
    path: info.outputPath("normal-municipal-member.png"),
    fullPage: true,
  });
  await info.attach("municipal-member-proof", {
    contentType: "application/json",
    body: JSON.stringify({
      seed: completed.seed,
      missingOptionalAssets,
      governmentKey: view.government.key,
      personId,
      worldId: completed.id,
      roleFixture:
        "Explicit canonical participation added to the real creator save before loading",
      workItemId: item.id,
      completedMinutes: workItemState(completed, item.id)
        .completedEffortMinutes,
    }),
  });
  expect(errors).toEqual([]);
});
