// The campaign trail in a real browser (owner, Oct 20: campaign acts are
// scenes you go to; the Campaigns tab shows standing only). Shared by the
// browser checks that run a campaign act: open Travel and the trail's card,
// where the doors, the event, the interview, the calls and the debate wait.

/** Live through whatever an act left on screen (a scene's talk, a stop) so the menus can open. */
async function settle(page) {
  for (let i = 0; i < 16; i += 1) {
    const open = page.locator(
      "#talk-leave:visible, #talk-next:visible, #talk-skip:visible, #continue:visible",
    );
    if (!(await open.count())) return;
    await open.first().click();
    await page.waitForTimeout(400);
  }
}

/** Open Travel, then the campaign trail's card. */
export async function openCampaignTrail(page) {
  await settle(page);
  // An act that stays on the screen returns to the trail's own card: already here.
  if (
    await page
      .locator("#sheet-body.place-view .screen-heading", {
        hasText: "The campaign trail",
      })
      .count()
  )
    return;
  if (!(await page.locator('.ring[data-tab="travel"]:visible').count()))
    await page.locator('#rings [data-tab="calendar"]').click();
  // Travel's list may already be open (a ring press would close it).
  const tile = page
    .locator("#sheet-body .entry", { hasText: "The campaign trail" })
    .first();
  if (!(await tile.count()))
    await page.locator('.ring[data-tab="travel"]').click();
  await tile.waitFor();
  await tile.click();
  await page.locator("#sheet-body.place-view").waitFor();
}
/** The trail's controls (buttons), by their words. */
export function trailButtons(page) {
  return page.locator("#sheet-body.place-view button");
}
