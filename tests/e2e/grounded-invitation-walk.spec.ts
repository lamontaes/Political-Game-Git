import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import {
  enterLife,
  fillCreator,
  goTo,
  openMoment,
  saveLife,
  waitForClockIdle,
} from "./support/creator";

/**
 * An invitation that comes from the host's own life, played in a browser.
 *
 * Walk evidence for the "Grounding scenes in real events" thread, not a gate:
 * it plays an ordinary adult life by letting time pass until somebody the
 * player knows has a reason of their own to have people over, answers it,
 * saves, continues from the title screen, and goes. The transcript is written
 * outside tracked evidence (OCD_WALK_OUT), and the case is skipped unless that
 * is set.
 */

const OUT = process.env.OCD_WALK_OUT ?? "";
const LIVES = [
  { state: "Oregon", place: "Bend", seed: "walk-bend" },
  { state: "Vermont", place: "Burlington", seed: "walk-burlington" },
] as const;
const MAX_STRETCHES = 90;

for (const life of LIVES) {
  test(`an invitation with a reason, in ${life.place}, ${life.state}`, async ({
    page,
  }) => {
    test.skip(!OUT, "walk evidence only; set OCD_WALK_OUT");
    test.setTimeout(1_800_000);
    const log: string[] = [];
    const note = (line: string) => log.push(line);
    const clock = page
      .getByRole("navigation", { name: "Time, place and navigation" })
      .getByRole("button")
      .first();
    const shot = async (name: string) =>
      page.screenshot({
        path: path.join(OUT, `${life.seed}-${name}.png`),
        fullPage: false,
      });

    await page.goto(`/?seed=${life.seed}`);
    await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 60_000 });
    await fillCreator(page, {
      age: 35,
      state: life.state,
      place: life.place,
      route: "custom",
      household: "shares-a-home",
    });
    await page.getByTestId("begin").click();
    await enterLife(page);
    note(`# ${life.place}, ${life.state}`);
    note(`Start: ${await clock.innerText()}`);

    let invitation: string | null = null;
    for (let stretch = 0; stretch < MAX_STRETCHES; stretch += 1) {
      await openMoment(page);
      const section = page.getByTestId("story-section");
      const text = (await section.count()) ? await section.innerText() : "";
      const first = text.split("\n").slice(0, 3).join(" / ");
      note(`- ${await clock.innerText()}: ${first}`);
      if (/I turn \d+|moved on|I started at/.test(text)) {
        invitation = text;
        break;
      }
      const pass = page.getByTestId("story-let-time-pass");
      if (await pass.count()) {
        await pass.click();
      } else {
        // A scene with no quiet option: take the first answer, as a player
        // pressing on would, and note it.
        const option = page
          .getByTestId("story-options")
          .getByRole("button")
          .first();
        note(`  (answered: ${(await option.innerText()).split("\n")[0]})`);
        await option.click();
      }
      await waitForClockIdle(page);
    }
    expect(invitation, "no invitation with a reason arrived").not.toBeNull();
    note("");
    note("## The invitation, as shown");
    note(invitation!);
    await shot("01-invitation");

    const yes = page
      .getByTestId("story-options")
      .getByRole("button", { name: /Say you will come/ });
    await yes.click();
    await waitForClockIdle(page);
    note(`Answered "Say you will come" at ${await clock.innerText()}`);

    await goTo(page, "nav-journal-entry");
    const journal = await page.locator("main").innerText();
    note("## Journal after answering (first lines)");
    note(journal.split("\n").slice(0, 12).join("\n"));
    await shot("02-journal");

    await saveLife(page);
    await page.goto(`/?seed=${life.seed}`);
    await expect(page.getByTestId("continue")).toBeEnabled({ timeout: 60_000 });
    note(`Continue shows: ${await page.getByTestId("continue").innerText()}`);
    await page.getByTestId("continue").click();
    await enterLife(page);
    note(`After Continue: ${await clock.innerText()}`);

    await goTo(page, "elsewhere-day");
    note("## Calendar after Continue");
    note((await page.locator("main").innerText()).split("\n").slice(0, 20).join("\n"));
    await shot("03-calendar-after-continue");

    // Let the days run to the afternoon itself and past it.
    for (let stretch = 0; stretch < 12; stretch += 1) {
      await openMoment(page);
      const section = page.getByTestId("story-section");
      const text = (await section.count()) ? await section.innerText() : "";
      note(`- ${await clock.innerText()}: ${text.split("\n").slice(0, 3).join(" / ")}`);
      if (/afternoon at .+'s|spent the afternoon/.test(text)) break;
      const pass = page.getByTestId("story-let-time-pass");
      if (!(await pass.count())) break;
      await pass.click();
      await waitForClockIdle(page);
    }
    await goTo(page, "nav-journal-entry");
    note("## Journal at the end (first lines)");
    note((await page.locator("main").innerText()).split("\n").slice(0, 16).join("\n"));
    await shot("04-journal-end");

    fs.writeFileSync(path.join(OUT, `${life.seed}.md`), log.join("\n") + "\n");
  });
}
