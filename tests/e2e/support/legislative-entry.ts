import { expect, type Locator, type Page } from "@playwright/test";
import { enterLife, goTo, passShellTime, waitForClockIdle } from "./creator";
import {
  chooseStateLegislativeOffice,
  type ChamberChoice,
} from "./jurisdictions";
import { resolveActiveMemberSeat } from "../../../src/presentation/legislative-member-seat";
import type { World } from "../../../src/simulation";

/**
 * Campaign work as the Campaign page offers it since PR #805.
 *
 * c73ce6024 replaced the "Do this now" row (campaign-fundraising,
 * campaign-outreach) with dated, hosted choices, and 12f389322 routes a
 * campaign with no staff to a chapter's support first: until a chapter
 * organizer has agreed to host its work, "Campaign choices this week" offers
 * nothing. So a candidate joins a local chapter, asks for its support, and
 * then puts the offered work on the calendar and goes to it. Every step is a
 * control the player presses; nothing here writes the World.
 *
 * The chapter's answer is a decision with close-choice randomness, and a
 * newcomer who shares no recorded party with it is turned down. Each request
 * the candidate turns up for is itself time spent with the organizer, which
 * the next decision counts, so asking again is the ordinary way through.
 */
export async function secureCampaignHost(page: Page, maxAsks = 6) {
  await goTo(page, "nav-parties");
  const join = page.locator('[data-testid^="chapter-join-"]').first();
  const organizationId = (await join.getAttribute("data-testid"))!.replace(
    "chapter-join-",
    "",
  );
  await join.click();
  await expect(
    page.getByTestId(`chapter-leave-${organizationId}`),
  ).toBeVisible();
  await goTo(page, "elsewhere-campaign");
  const choices = page.getByTestId("campaign-action-choices");
  await expect(choices).toBeVisible();
  for (let ask = 0; ask < maxAsks; ask += 1) {
    if (!(await hostIsMissing(page))) return organizationId;
    await workPartyRow(
      page,
      page.getByTestId(`party-work-request-support-request-${organizationId}`),
    );
  }
  expect(await hostIsMissing(page), "no chapter agreed to host").toBe(false);
  return organizationId;
}

async function hostIsMissing(page: Page) {
  return (
    (await page
      .getByTestId("campaign-action-choices-empty")
      .filter({ hasText: "No one has agreed to host" })
      .count()) > 0
  );
}

/**
 * Presses `create` (a request or a booking), then goes to the calendar entry
 * it made, the way the party-work row offers it. An earlier commitment on the
 * calendar comes first, so the day is lived until the entry can be reached.
 * Returns whether the entry's outcome was recorded.
 */
async function workPartyRow(page: Page, create: Locator) {
  const rows = page.locator('li[data-testid^="party-work-"][data-state]');
  const before = new Set(
    await rows.evaluateAll((items) =>
      items.map((item) => item.getAttribute("data-testid")),
    ),
  );
  await waitForClockIdle(page);
  await create.click();
  await expect(rows).toHaveCount(before.size + 1);
  const rowId = (
    await rows.evaluateAll((items) =>
      items.map((item) => item.getAttribute("data-testid")),
    )
  ).find((id) => !before.has(id))!;
  const activityId = rowId.replace("party-work-", "");
  const outcome = page.getByTestId(`party-work-outcome-${activityId}`);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const go = page
      .getByTestId(rowId)
      .locator(
        [
          `[data-testid="party-work-attend-condensed-${activityId}"]`,
          `[data-testid="party-work-take-shift-${activityId}"]`,
          `[data-testid="party-work-attend-${activityId}"]`,
        ].join(", "),
      )
      .first();
    if ((await go.count()) === 0) break;
    await waitForClockIdle(page);
    await go.click();
    await waitForClockIdle(page);
    if ((await outcome.count()) > 0) return true;
    await passShellTime(page);
  }
  return (await outcome.count()) > 0;
}

/**
 * Books each offered piece of field work this week and goes to it. Returns
 * how many were done. Field work (a door canvass or a phone shift) is what
 * moves the campaign's support since c73ce6024.
 */
export async function workOfferedCampaignChoices(
  page: Page,
  forms: readonly string[] = ["door-canvass", "phone-shift"],
) {
  let done = 0;
  for (const form of forms) {
    const book = page.getByTestId(`campaign-book-${form}`);
    if ((await book.count()) === 0) continue;
    if (await workPartyRow(page, book)) done += 1;
  }
  return done;
}

/**
 * Campaigns with hosted work until the contest is decided: every week the
 * offered field work is booked and attended, then the week is lived.
 */
export async function campaignHostedUntilDecided(page: Page, maxWeeks = 110) {
  for (let week = 0; week < maxWeeks; week += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await workOfferedCampaignChoices(page);
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await passShellTime(page, "week");
  }
  return page.getByTestId("campaign-result").isVisible();
}

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
  // Do the work the game offers rather than a fixed number of days: since
  // c73ce6024 (PR #805) that is the hosted, dated choices on the Campaign
  // page, which open once a chapter agrees to host the campaign's work. The
  // "Do this now" fundraising and outreach row this route used is retired.
  // If the player does everything offered and still loses, that is a
  // finding worth a failure rather than a premise to re-tune.
  await secureCampaignHost(page);
  await campaignHostedUntilDecided(page);
  await expect(page.getByTestId("campaign-result")).toBeVisible();
  await expect(page.getByTestId("campaign-afterword")).toContainText(
    /\bwon[,.]/,
  );
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
