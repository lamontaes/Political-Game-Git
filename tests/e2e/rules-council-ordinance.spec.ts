/**
 * RULES TO PLAY: a Charlottesville councilor carries a general ordinance from
 * introduction to a recorded effective outcome, by keyboard, in the composed
 * game.
 *
 * The council seats are an explicit, labeled review scenario written into the
 * real creator save before loading (the same pattern as
 * municipal-member.spec.ts). They are not evidence that ordinary election to
 * council works; that producer belongs to NATIONWIDE WORLD/ELECTION. Everything
 * after loading uses the normal controls.
 */
import { test, expect, type Page } from "./fixtures";
import {
  enterLife,
  isPoliticsHubDestination,
  openPoliticsHub,
  saveLife,
  startLife,
} from "./support/creator";
import {
  createBrowserWorldRecord,
  type StoredBrowserWorldRecord,
} from "../../src/presentation/browser-world-repository";
import { deserializeWorld } from "../../src/simulation/serialization";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../../src/simulation/municipal-public-work";
import { municipalGovernmentForLifePlace } from "../../src/simulation/municipal-government";
import { lifePlaceByJurisdictionId } from "../../src/simulation/life-places";
import { measureEnactment } from "../../src/simulation/legislation";

const SEAT_LABEL =
  "Review scenario seat, placed for this governing check, not won in an election";

async function goTo(page: Page, id: string) {
  if (isPoliticsHubDestination(id)) return openPoliticsHub(page, id);
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

async function openLocalGovernment(page: Page) {
  await goTo(page, "nav-municipal");
  const panel = page.getByRole("region", { name: "Municipal government" });
  await expect(panel.getByTestId("municipal-ordinances")).toBeVisible();
  return panel;
}

test("a seated Charlottesville councilor passes an ordinance by keyboard and it survives reload", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=rules-to-play-council-ordinance");
  await startLife(page, {
    age: 40,
    place: "Charlottesville, Virginia",
    placeScope: "locality",
    placeQuery: "Charlottesville",
    route: "normal",
  });
  await enterLife(page);
  await saveLife(page);
  const original = await savedRecord(page);
  const citizen = deserializeWorld(original.payload);
  if (citizen.control.kind !== "person") throw new Error("person control");
  const personId = citizen.control.personId;
  const home = citizen.people[personId]!.homeJurisdictionId;
  const government = municipalGovernmentForLifePlace(
    lifePlaceByJurisdictionId(home)!,
  )!;
  expect(government.key).toBe("us-va-charlottesville");

  let seated = installMunicipalGovernment(citizen, {
    governmentKey: government.key,
    jurisdictionId: home,
    formedAt: citizen.currentDate,
  });
  const members = [
    personId,
    ...citizen.personOrder.filter((id) => id !== personId).slice(0, 4),
  ];
  expect(members.length).toBeGreaterThanOrEqual(3);
  members.forEach((id, index) => {
    seated = seatMunicipalMember(seated, {
      governmentKey: government.key,
      personId: id,
      startedAt: seated.currentDate,
      role: index === 1 ? "presiding-member" : "member",
      seatLabel: SEAT_LABEL,
    });
  });
  const record = createBrowserWorldRecord(
    seated,
    original.metadata.savedAt,
    original.metadata.createdAt,
    original.saveId,
    original.generation + 1,
  );
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

  // Introduce by keyboard: type the title and press Enter in the field.
  let panel = await openLocalGovernment(page);
  const title = panel.getByTestId("municipal-ordinance-title");
  await title.fill("Sidewalk dining permits");
  await title.press("Enter");
  const ordinance = panel.getByTestId("municipal-ordinance");
  await expect(ordinance).toContainText("Ord. 26-1: Sidewalk dining permits");
  await expect(ordinance).toContainText("not yet on the council agenda");

  // Put it on the agenda with Space.
  await ordinance
    .getByRole("button", { name: "Put on the council agenda" })
    .press("Space");
  await expect(ordinance).toContainText("On the council agenda for passage.");
  await expect(ordinance).toContainText("City Code § 2-97");
  const record_ = ordinance.getByRole("button", {
    name: "Record the council vote",
  });
  await expect(record_).toBeDisabled();
  await expect(ordinance).toContainText("Not before");
  await ordinance
    .getByText("Other councilors' ballots (game-authored)")
    .click();
  await expect(ordinance).toContainText("game-authored stand-ins");
  await page.screenshot({
    path: info.outputPath("ordinance-too-early.png"),
    fullPage: false,
  });

  // Four days on the shared clock, by the ordinary day control.
  await page.keyboard.press("Escape");
  for (let day = 0; day < 4; day += 1) {
    const runDay = page.getByTestId("shell-pass-day");
    await expect(runDay).toBeEnabled();
    await runDay.press("Enter");
    await page.waitForTimeout(500);
  }

  panel = await openLocalGovernment(page);
  const onFloor = panel.getByTestId("municipal-ordinance");
  await onFloor.getByLabel("Yea").check();
  const vote = onFloor.getByRole("button", { name: "Record the council vote" });
  await expect(vote).toBeEnabled();
  await vote.press("Enter");
  const outcome = panel.getByTestId("municipal-ordinance-outcome");
  await expect(outcome).toBeVisible();
  const outcomeText = (await outcome.textContent()) ?? "";
  await page.screenshot({
    path: info.outputPath("ordinance-outcome.png"),
    fullPage: false,
  });

  await saveLife(page);
  const after = deserializeWorld((await savedRecord(page)).payload);
  const measure = (after.history.legislativeMeasures ?? []).find(
    (entry) => entry.designation === "Ord. 26-1",
  )!;
  const enactment = measureEnactment(after, measure.id);
  if (outcomeText.includes("did not pass")) {
    expect(enactment).toBeNull();
  } else {
    expect(enactment?.effectiveAt).toBe(enactment?.resolvedAt);
    expect(outcomeText).toContain(`in effect from ${enactment?.effectiveAt}`);
  }

  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  panel = await openLocalGovernment(page);
  await expect(panel.getByTestId("municipal-ordinance-outcome")).toHaveText(
    outcomeText,
  );
  await info.attach("council-ordinance-proof", {
    contentType: "application/json",
    body: JSON.stringify({
      seed: after.seed,
      governmentKey: government.key,
      measureId: measure.id,
      outcome: outcomeText,
      enactment,
      seatsAreReviewScenario: SEAT_LABEL,
    }),
  });
  expect(errors).toEqual([]);
});
