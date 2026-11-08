// Browser-check helper: an act on the campaign trail is a tile you choose, then Go. The tiles page
// (the Ask acts sit on a later page), so the helper turns pages until the named tile shows. Chooses
// it and returns its Go button (absent when the act is out of reach today).
export async function chooseTrailAct(page, name) {
  const tile = page.locator(".travel-tile", { hasText: name }).first();
  await page.locator(".travel-tile").first().waitFor();
  const back = page.getByRole("button", { name: "Previous page" });
  while ((await back.count()) && (await back.isEnabled())) await back.click();
  const next = page.getByRole("button", { name: "Next page" });
  for (
    let turns = 0;
    turns < 10 &&
    !(await tile.count()) &&
    (await next.count()) &&
    (await next.isEnabled());
    turns += 1
  )
    await next.click();
  await tile.waitFor();
  await tile.click();
  return page.locator('[data-testid="place-go"]');
}
