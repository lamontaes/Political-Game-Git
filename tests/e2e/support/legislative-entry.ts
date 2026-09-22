import { expect, type Page } from "@playwright/test";
import { workOfferedOutreach } from "./campaign";
import { enterLife, goTo } from "./creator";
import {
  chooseStateLegislativeOffice,
  type ChamberChoice,
} from "./jurisdictions";
import { resolveActiveMemberSeat } from "../../../src/presentation/legislative-member-seat";
import type { World } from "../../../src/simulation";

/**
 * Replay the banked ordinary entry; never inject a World, seat or result.
 *
 * Works in whatever jurisdiction the caller's life was started in: the seat
 * comes out of the player's own office browser, so a Nebraska life stands for
 * the unicameral Legislature and a Nevada life for the Assembly without this
 * helper knowing either name. Returns the office key it actually stood for.
 */
export async function reachMemberOffice(
  page: Page,
  chamber: ChamberChoice = "lower",
): Promise<string> {
  // Running for office lives in Politics → Campaigns, beside the time control.
  await goTo(page, "elsewhere-campaign");
  // The office browser requires a deliberate choice, and the choice is read
  // out of the browser the player is looking at rather than named here. This
  // used to name `us-ky-general-assembly-v1:house` as a literal, which meant
  // the ordinary route into a seat could only ever be proved in Kentucky:
  // Nevada's lower chamber is an Assembly and Nebraska has one chamber called
  // the Legislature, so the same helper silently could not run there.
  const officeKey = await chooseStateLegislativeOffice(page, chamber);
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
  return officeKey;
}

/**
 * A seated member, constructed rather than campaigned for.
 *
 * `reachMemberOffice` above keeps its contract — it replays the ordinary route
 * and injects nothing — and office-onboarding-ordinary, pr79f and
 * campaign-first-election keep using it, because proving that route IS what
 * those cases are for.
 *
 * This is for the cases DOWNSTREAM of a seat, which are about a docket, a news
 * feed or an adapter and only need somebody sitting in the chamber. Reaching
 * that seat the ordinary way costs a won campaign plus a walk from the
 * February result to the term's January start — an election result is not
 * office authority, and the office does not open until the supported term
 * begins — which is roughly forty-eight weekly clicks. Those cases carry
 * thirty-second budgets and die on the walk, not on a wrong assertion.
 *
 * So the setup is controlled, which is the director's rule for a downstream
 * office test: the same recorded-term seam rest37-n uses, moved to the term's
 * own start date so entry resolves on the clock rather than being asserted
 * into place. The campaign and the entry are still the simulation's own; only
 * the waiting is skipped.
 */
export async function enterRecordedMemberTerm(page: Page) {
  // Callers reach this from wherever they already are — the front door, mid
  // life, or after their own seeded goto — so the helper opens the door
  // itself rather than demanding one. It writes a save and then loads it, so
  // whatever life the caller had set up is deliberately replaced; the cases
  // that use this are about what happens AFTER a seat, not about the life
  // that reached it.
  await page.goto("/");
  // The front door always offers New game; Continue is rendered beside it and
  // is disabled when there is nothing to continue, so matching either one
  // resolves to two elements and trips strict mode.
  await expect(page.getByTestId("new-game")).toBeVisible();
  await page.evaluate(async () => {
    // Paths through variables: these resolve in the browser at runtime, and a
    // literal would send tsc looking for a module that is not on disk here.
    const fixturePath = "/tests/fixtures/recorded-legislative-term.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { recordedTermFixture, moveToTermDate } = await import(
      /* @vite-ignore */ fixturePath
    );
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const fixture = recordedTermFixture();
    // The term's own first day: moveToTermDate walks day by day, so the
    // entry transition resolves the way it would in ordinary play.
    const world = moveToTermDate(fixture.world, "2027-01-02");
    const store = new BrowserSaveStore();
    const saved = await store.save(world, store.newSaveId(world));
    if (saved.status !== "saved")
      throw new Error(`Recorded-term fixture refused: ${saved.status}`);
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
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
