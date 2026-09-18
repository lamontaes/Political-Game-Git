import { expect, type Page } from "@playwright/test";
import { workOfferedOutreach } from "./campaign";
import { goTo } from "./creator";
import { resolveActiveMemberSeat } from "../../../src/presentation/legislative-member-seat";
import type { World } from "../../../src/simulation";

/** Replay the banked ordinary entry; never inject a World, seat or result. */
export async function reachMemberOffice(page: Page) {
  // Running for office lives in Politics → Campaigns, beside the time control.
  await goTo(page, "elsewhere-campaign");
  // E's office browser requires a deliberate choice; preserve the original
  // House scenario rather than relying on the former implicit default.
  const house = page
    .getByTestId("campaign-office-browser")
    .locator('input[value="us-ky-general-assembly-v1:house"]');
  await house.press("Space");
  await expect(house).toBeChecked();
  await expect(page.getByTestId("file-candidacy")).toBeEnabled();
  await page.getByTestId("file-candidacy").press("Enter");
  await page.getByTestId("campaign-fundraising").click();
  // Work every day the control is offered, rather than for a fixed number of
  // days. Three was true when this was written and is not now: the rival
  // campaigns weekly since d60b2975, and measured headlessly on this route
  // three outreach days LOSE, six also LOSE — only five actions were even
  // available — and working every offered day WINS with 26 actions. Any day
  // count is a guess about a model that has already changed once; "do the
  // work the game offers" cannot go stale the same way, and if the player
  // does everything available and still loses, that is a finding worth a
  // failure rather than a premise to re-tune.
  for (let day = 0; day < 48; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) break;
    await page.getByTestId("pass-day").click();
    await workOfferedOutreach(page);
  }
  await expect(page.getByTestId("campaign-result")).toBeVisible();
  await expect(page.getByTestId("campaign-afterword")).toContainText("won.");
  await goTo(page, "elsewhere-work");
  // The election result is not office authority: the recorded winner enters
  // the supported term on its start date, so the ordinary shell clock moves
  // week by week until the legislative office exists, as pr79f does. A winner
  // who never enters within a year is a finding, not a longer wait.
  for (let week = 0; week < 52; week += 1) {
    if (await page.getByTestId("office-section").isVisible()) break;
    await page.getByTestId("shell-pass-week").click();
    await expect(page.getByTestId("shell-pass-week")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
  }
  await expect(page.getByTestId("office-section")).toBeVisible();
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
