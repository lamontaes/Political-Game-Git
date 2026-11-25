// The campaign trail in a real browser (owner, Oct 20: campaign acts are
// scenes you go to; the Campaigns tab shows standing only). Shared by the
// browser checks that run a campaign act: open Travel and the trail's card,
// where the doors, the event, the interview, the calls and the debate wait.
import { finishTalk } from "./start-life.mjs";

/**
 * Live through whatever an act left on screen so the menus can open: a scene's
 * talk is played to its end as a player would (`finishTalk`: its lines, the
 * first reply, Leave; never Skip scene), and a stop is continued past. A scene
 * that waited on a reply used to stay open here and hide the rings.
 */
async function settle(page) {
  for (let i = 0; i < 16; i += 1) {
    await page.waitForTimeout(400);
    if (await page.locator("#talk").isVisible()) await finishTalk(page);
    else if (await page.locator("#continue:visible").count())
      await page.locator("#continue").click();
    else return;
  }
}

/** Open Travel, then the campaign trail's card. */
export async function openCampaignTrail(page) {
  await settle(page);
  // Either the trail's own card is already up (an act that stays on the screen returns to it, and a
  // press of another ring may not have taken it down yet) or Travel's list, which holds its tile. The
  // sheet redraws between the two, so the check waits for whichever shows rather than counting at once.
  // Only what is on screen counts: a closed sheet keeps its last page, hidden.
  const own = page.locator(
    "#sheet-body.place-view .travel-screen .travel-tile:visible",
    { hasText: "Knock on doors" },
  );
  const entry = page
    .locator("#sheet-body .travel-tile:visible", {
      hasText: "The campaign trail",
    })
    .first();
  const shown = own.or(entry).first();
  await shown.waitFor({ timeout: 3000 }).catch(() => {});
  if (!(await shown.count())) {
    // Travel is closed: open it (from the calendar's ring where Travel's own is not on show).
    if (!(await page.locator('.ring[data-tab="travel"]:visible').count()))
      await page.locator('#rings [data-tab="calendar"]').click();
    await page.locator('.ring[data-tab="travel"]').click();
    await shown.waitFor();
  }
  if (await own.count()) return;
  // Its card in Travel shows a place, as every other card there does.
  if (!(await entry.locator(".travel-art").count()))
    throw new Error("The campaign trail's card in Travel has no picture.");
  await entry.click();
  await own.first().waitFor();
}
/** The trail's acts (tiles), by their words. */
export function trailButtons(page) {
  return page.locator("#sheet-body.place-view .travel-tile");
}
