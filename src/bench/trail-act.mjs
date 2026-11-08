// Browser-check helper: an act on the campaign trail is a tile you choose, then Go. Chooses the
// tile whose name matches and returns its Go button (absent when the act is out of reach today).
export async function chooseTrailAct(page, name) {
  const tile = page.locator(".travel-tile", { hasText: name }).first();
  await tile.waitFor();
  await tile.click();
  return page.locator('[data-testid="place-go"]');
}
