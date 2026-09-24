import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./fixtures";
import {
  advanceQuietStory,
  enterLife,
  fillCreator,
  goTo,
  openMoment,
  passShellTime,
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
const MAX_STRETCHES = Number(process.env.OCD_WALK_STRETCHES ?? 400);

for (const life of LIVES) {
  test(`an invitation with a reason, in ${life.place}, ${life.state}`, async ({
    page,
  }) => {
    test.skip(!OUT, "walk evidence only; set OCD_WALK_OUT");
    test.setTimeout(5_400_000);
    const log: string[] = [];
    const logFile = path.join(OUT || ".", `${life.seed}.md`);
    if (OUT) fs.writeFileSync(logFile, "");
    const note = (line: string) => {
      log.push(line);
      if (OUT) fs.appendFileSync(logFile, line + "\n");
    };
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
      const prose = page.getByTestId("story-prose");
      const first = (await prose.count())
        ? (await prose.first().innerText()).slice(0, 160)
        : "(no scene prose)";
      note(`- ${await clock.innerText()}: ${first}`);
      const whole = await page.locator("body").innerText();
      if (
        /I turn \d+|moved on|I started at|on my own anymore|getting the new place/.test(
          whole,
        ) &&
        !text
      ) {
        note(`  (an invitation is on the page outside the moment)`);
      }
      if (
        /I turn \d+|moved on|I started at|on my own anymore|getting the new place/.test(
          text,
        )
      ) {
        invitation = text;
        break;
      }
      // Played the way a person plays it: answer what is in front of you
      // (the first answer), and let time pass only when nothing is. Letting
      // time pass over a scene shows the same scene again next time, so a walk
      // that only ever passed time would never meet anybody's request.
      const option = page
        .getByTestId("story-options")
        .getByRole("button")
        .first();
      if ((await option.count()) === 0) {
        note("  (let ordinary weeks run from the shell clock)");
        await advanceQuietStory(page);
        continue;
      }
      note(`  (answered: ${(await option.innerText()).split("\n")[0]})`);
      await option.click();
      await waitForClockIdle(page);
    }
    expect(invitation, "no invitation with a reason arrived").not.toBeNull();
    note("");
    note("## The invitation, as shown");
    note(invitation!);
    const host =
      /\n([^\n:]+?)(?:, your [^:]+)?: “/.exec(invitation!)?.[1] ?? "";
    note(`Host: ${host}`);
    const hostLines = (whole: string) =>
      whole
        .split("\n")
        .filter((line) => host && line.includes(host.split(" ")[0]!))
        .slice(0, 12)
        .join("\n");
    await shot("01-invitation");

    const yes = page
      .getByTestId("story-options")
      .getByRole("button", { name: /Say you will come/ });
    await yes.click();
    await waitForClockIdle(page);
    note(`Answered "Say you will come" at ${await clock.innerText()}`);

    await goTo(page, "nav-journal-entry");
    const journal = await page.locator("main").innerText();
    note("## Journal after answering (lines naming the host)");
    note(hostLines(journal));
    await shot("02-journal");

    await saveLife(page);
    await page.goto(`/?seed=${life.seed}`);
    await expect(page.getByTestId("continue")).toBeEnabled({ timeout: 60_000 });
    note(`Continue shows: ${await page.getByTestId("continue").innerText()}`);
    await page.getByTestId("continue").click();
    await enterLife(page);
    note(`After Continue: ${await clock.innerText()}`);

    await goTo(page, "elsewhere-day");
    note("## Calendar after Continue (lines naming the host)");
    note(hostLines(await page.locator("main").innerText()));
    await shot("03-calendar-after-continue");

    // Play on through the Saturday, answering what comes, and note each scene.
    const saturday = /afternoon of ([A-Z][a-z]+ \d+, \d{4})/.exec(
      await page.locator("body").innerText(),
    )?.[1];
    for (let stretch = 0; stretch < 30; stretch += 1) {
      await openMoment(page);
      const prose = page.getByTestId("story-prose");
      const line = (await prose.count())
        ? (await prose.first().innerText()).slice(0, 200)
        : "(no scene prose)";
      const date = await clock.innerText();
      note(`- ${date.replace(/\n/g, " ")}: ${line}`);
      if (
        saturday &&
        Date.parse(date.split("\n").find((l) => /\d{4}/.test(l)) ?? "") >
          Date.parse(saturday) + 86_400_000
      )
        break;
      const option = page
        .getByTestId("story-options")
        .getByRole("button")
        .first();
      if ((await option.count()) === 0) {
        note("  (let the day run from the shell clock)");
        await passShellTime(page);
        continue;
      }
      note(`  (answered: ${(await option.innerText()).split("\n")[0]})`);
      await option.click();
      await waitForClockIdle(page);
    }
    await goTo(page, "nav-journal-entry");
    note("## Journal at the end (lines naming the host)");
    note(hostLines(await page.locator("main").innerText()));
    await shot("04-journal-end");
  });
}
