/* global console, document, URL */
// The one way a browser check starts a life (play-browser-checks-open-on-the-address).
// A new life opens on the President's address (#6568), one talk with Continue,
// then the talk after it. A check that clicks into the room before the talk is
// over finds the address still speaking and times out or reads the wrong talk.
// This plays the opening the way a player does: Continue on every line, the
// first reply where the talk asks for one, never Skip scene, until the room is
// free. The opening itself is never changed or hidden to make a check pass.

/** The most talk steps an opening may take before the check calls it stuck. Engineering value. */
const MAX_STEPS = 200;

/**
 * Opens the bench's title screen and starts a life: Continue when a saved life
 * is there and `fresh` is false, otherwise New game, Advanced, a new world.
 * Prints the seed and place for a fresh life. Then plays the opening talk to
 * its end and waits for the player's card. Returns { seed, placeName, fresh }.
 */
export async function startLife(page, { url, fresh = false } = {}) {
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.goto(url ?? "http://localhost:3000/play");
  await title;
  let seed = null;
  let placeName = null;
  let scene = null;
  const resume = page.locator("#front-continue");
  const reuse = !fresh && (await resume.isEnabled());
  if (reuse) await resume.click();
  else {
    const life = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    if (await page.locator("#new-advanced").isVisible())
      await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const response = await life;
    if (response.status() !== 200)
      throw new Error(`New life failed: ${await response.text()}`);
    seed = new URL(response.url()).searchParams.get("seed");
    const body = await response.json();
    placeName = body.placeName ?? null;
    scene = body.sceneMomentId ?? null;
    console.log("Seed:", seed, "Place:", placeName);
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name")?.textContent.trim() &&
      document.getElementById("card-clock")?.textContent.trim(),
  );
  await playOpening(page, scene);
  return { seed, placeName, fresh: !reuse };
}

/**
 * Plays the opening a new life staged, for a check that starts the life its
 * own way: pass the new-life reply's `sceneMomentId` (null when none). The
 * talk opens a moment after the card (about 400 ms in Bennett, Colorado), so a
 * staged scene is waited for before it is played to its end.
 */
export async function playOpening(page, sceneMomentId) {
  if (sceneMomentId)
    await page.locator("#talk").waitFor({ state: "visible", timeout: 60000 });
  return finishTalk(page);
}

/** What the talk box shows now, to tell when a press has moved it on. */
function talkState() {
  const talk = document.getElementById("talk");
  if (!talk || talk.hidden) return "closed";
  const lines = document.getElementById("talk-lines")?.textContent ?? "";
  const choices = document.querySelectorAll("#talk-choices .reply").length;
  return `${lines.length}:${lines.slice(-200)}:${choices}`;
}

/**
 * Plays the open talk to its end as a player would: Continue on each line, the
 * first reply when the talk offers replies, Leave when that is all it offers.
 * Never presses Skip scene. Throws if the talk does not end.
 */
export async function finishTalk(page) {
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const before = await page.evaluate(talkState);
    if (before === "closed") return step;
    const next = page.locator("#talk-next");
    const reply = page.locator("#talk-choices .reply").first();
    const leave = page.locator("#talk-leave");
    if (await next.isVisible()) await next.click();
    else if (await reply.isVisible()) await reply.click();
    else if (await leave.isVisible()) await leave.click();
    // Nothing to press yet: the line is still being drawn. Wait for a change.
    await page.waitForFunction(
      (was) => {
        const talk = document.getElementById("talk");
        if (!talk || talk.hidden) return true;
        const lines = document.getElementById("talk-lines")?.textContent ?? "";
        const choices = document.querySelectorAll(
          "#talk-choices .reply",
        ).length;
        const now = `${lines.length}:${lines.slice(-200)}:${choices}`;
        const pressable = ["talk-next", "talk-leave"].some((id) => {
          const el = document.getElementById(id);
          return el && !el.hidden && el.offsetParent !== null;
        });
        return now !== was || pressable;
      },
      before,
      { timeout: 30000 },
    );
  }
  throw new Error(`The opening talk did not end in ${MAX_STEPS} steps.`);
}
