/* global document */
// The campaign trail in a real browser (owner, Oct 20: campaign acts are
// scenes you go to; the Campaigns tab shows standing only). Shared by the
// browser checks that run a campaign act: open Travel and the trail's card,
// where the doors, the event, the interview, the calls and the debate wait.
/** Open Travel, then the campaign trail's card. */
export async function openCampaignTrail(page) {
  if (!(await page.locator('.ring[data-tab="travel"]:visible').count()))
    await page.locator('#rings [data-tab="calendar"]').click();
  await page.locator('.ring[data-tab="travel"]').click();
  await page.getByText("The campaign trail", { exact: true }).first().click();
  await page.locator("#sheet-body.place-view").waitFor();
}
/** The trail's controls (buttons), by their words. */
export function trailButtons(page) {
  return page.locator("#sheet-body.place-view button");
}
