import { expect, test, type Page } from "@playwright/test";
import { enterLife, fillCreator, goTo } from "./support/creator";

/**
 * Director playtest request 2: a coherent first session without entering
 * politics. Exploration, not assertion — it plays an ordinary life the way a
 * player would in two contrasting places and PRINTS what each surface offers,
 * so the console is the finding. No developer shortcut stands in for a route.
 */

async function text(
  page: Page,
  testid: string,
  len = 220,
): Promise<string | null> {
  const el = page.getByTestId(testid);
  if (!(await el.count())) return null;
  return (await el.first().innerText())
    .slice(0, len)
    .replace(/\s+/g, " ")
    .trim();
}

async function reveal(page: Page, testid: string) {
  // Personal, finances and jobs live behind the corner cluster's flyout.
  await goTo(page, testid).catch(() => undefined);
}

async function probe(page: Page, tag: string) {
  const out = (k: string, v: string | null) =>
    console.log(`[${tag}] ${k}: ${v === null ? "— (not present)" : `"${v}"`}`);

  out("opening room", await text(page, "day-now-scene", 200));
  out("day: work control", await text(page, "day-open-work", 60));
  out("day: places control", await text(page, "day-open-places", 60));
  out("day: next moment", await text(page, "day-next", 80));
  out("day: no next moment", await text(page, "day-next-none", 80));
  out("day: pending", await text(page, "day-pending", 120));

  await reveal(page, "nav-personal");
  out("personal: goals", await text(page, "personal-goals"));
  out("personal: no goals", await text(page, "personal-goals-none"));
  out("personal: education", await text(page, "personal-education"));
  out("personal: work", await text(page, "personal-work"));
  out("personal: life choices", await text(page, "personal-life-choices"));
  out("personal: routine", await text(page, "personal-routine"));
  out("personal: finances", await text(page, "personal-finances"));

  await reveal(page, "nav-personal");
  out("people: contacts", await text(page, "contacts"));
  out("people: no contacts", await text(page, "contacts-empty"));
  out("people: meeting window", await text(page, "contacts-meeting-window"));
}

async function play(page: Page, tag: string, state: string, town: string) {
  console.log(`\n==== ${tag}: ${town}, ${state} — build 6146df35 ====`);
  await fillCreator(page, { age: 26, state, place: town, route: "normal" });
  await page.getByTestId("begin").click();
  await enterLife(page);

  await probe(page, `${tag} day0`);

  // Let time pass the ordinary way and watch whether the day keeps offering
  // something distinct, or becomes the same click.
  const seen = new Set<string>();
  let noControl = -1;
  for (let step = 0; step < 10; step += 1) {
    const next = page.getByTestId("day-next");
    if (!(await next.count())) {
      noControl = step;
      break;
    }
    const label = (await next.innerText())
      .slice(0, 70)
      .replace(/\s+/g, " ")
      .trim();
    console.log(
      `[${tag}] step ${step}: next = "${label}"${seen.has(label) ? "  <-- repeat" : ""}`,
    );
    seen.add(label);
    await next.click();
    await page.waitForTimeout(150);
  }
  console.log(
    `[${tag}] distinct "next" labels: ${seen.size}${noControl >= 0 ? `; day-next disappeared at step ${noControl}` : ""}`,
  );

  // A way to back out of one consequential choice.
  let backedOut = "none found";
  for (const testid of [
    "life-favor",
    "favor-decline",
    "calendar-decline-event",
    "leave-ordinary-meeting",
  ]) {
    if (await page.getByTestId(testid).count()) {
      backedOut = testid;
      break;
    }
  }
  console.log(`[${tag}] a way to back out of a choice: ${backedOut}`);

  // Save, then confirm a continue path exists.
  const saveCount = await page.evaluate(async () => {
    const { BrowserSaveStore } = await import(
      /* @vite-ignore */ "/src/presentation/browser-world-repository.ts"
    );
    const store = new BrowserSaveStore();
    return (await store.list()).length;
  });
  console.log(`[${tag}] saves present: ${saveCount}`);
}

test("an ordinary first session, two contrasting places", async ({ page }) => {
  // An exploration run by hand against a chosen build, not a pipeline gate:
  // it prints what each surface offers rather than asserting an outcome, so
  // CI skips it and it never reds a PR it is only riding along on.
  test.skip(
    Boolean(process.env.CI),
    "manual playtest exploration; run locally against a chosen build",
  );
  test.setTimeout(240_000);
  await play(page, "A", "Ohio", "Columbus");
  await play(page, "B", "Montana", "Bozeman");
  expect(true).toBe(true);
});
