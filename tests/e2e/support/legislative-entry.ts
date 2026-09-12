import { expect, type Page } from "@playwright/test";
import { goTo } from "./creator";
import { resolveActiveMemberSeat } from "../../../src/presentation/legislative-member-seat";
import type { World } from "../../../src/simulation";

/** Replay the banked ordinary entry; never inject a World, seat or result. */
export async function reachMemberOffice(page: Page) {
  // PT3: running for office lives in Work, beside the day's time control.
  await goTo(page, "elsewhere-work");
  await expect(page.getByTestId("file-candidacy")).toBeEnabled();
  await page.getByTestId("file-candidacy").press("Enter");
  await page.getByTestId("campaign-fundraising").click();
  for (let day = 0; day < 3; day += 1) {
    await page.getByTestId("pass-day").click();
    await page.getByTestId("campaign-outreach").click();
  }
  for (let day = 0; day < 45; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) break;
    await page.getByTestId("pass-day").click();
  }
  await expect(page.getByTestId("campaign-result")).toBeVisible();
  await expect(page.getByTestId("campaign-afterword")).toContainText("won.");
  await goTo(page, "elsewhere-work");
  await expect(page.getByTestId("docket")).toBeVisible();
}

/** Read actual saved records; nothing in this helper writes browser storage. */
export async function readSavedLegislativeWorld(page: Page): Promise<World> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<Array<{ payload: string }>>(
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
    if (records.length !== 1) throw new Error("Expected one retained World");
    return JSON.parse(records[0]!.payload).world;
  });
}

export function expectRecordedMember(world: World) {
  expect(world.control.kind).toBe("person");
  if (world.control.kind !== "person")
    throw new Error("Expected controlled person");
  const membership = resolveActiveMemberSeat(world, world.control.personId);
  expect(membership.kind).toBe("seated");
  if (membership.kind !== "seated") throw new Error(membership.reason);
  const result = world.history.electionContestResults!.find(
    (r) => r.id === membership.seat.electionResultId,
  );
  expect(result?.winnerPersonId).toBe(world.control.personId);
  expect(result?.outcomeEventId).toBe(membership.seat.outcomeEventId);
  const measure = world.history.legislativeMeasures!.at(-1)!;
  expect(measure.sponsorPersonId).toBe(world.control.personId);
  expect(measure.originChamberKey).toBe(membership.seat.chamberKey);
  return { seat: membership.seat, measure };
}
