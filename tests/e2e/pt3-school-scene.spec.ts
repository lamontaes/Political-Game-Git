import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  expectNoDestination,
  goTo,
  startLife as walkCreator,
} from "./support/creator";

/**
 * The corridor scene, read off the screen a player is looking at.
 *
 * The third playtest met "Something got broken in the corridor at your school
 * and your name is the one that came up", with "Say who did it" underneath and
 * nobody named. The unit proofs next door show the composition; this shows the
 * rendered sequence — the object and the classmate in the prose a player reads,
 * the same classmate in the option that names them, and both of them still
 * there in the record after the choice and after the game is loaded again.
 */

/** The authored alternatives. One of them is what got broken. */
const INCIDENTS = [
  "glass panel in the corridor door",
  "trophy case at the end of the corridor",
  "fire-alarm cover by the stairs",
  "projector cart outside the science room",
];

/** What the playtest read, which no longer reaches a player. */
const BANNED = [
  /Something got broken/i,
  /four feet away/i,
  /The person who did/i,
  /^Say who did it$/,
];

const PROOF_DIR = process.env.RECOVERY25_PROSE_PROOF_DIR;

async function freshBrowser(page: Page, seed: string) {
  await page.goto(`/?seed=${seed}`);
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

async function captureProof(page: Page, name: string) {
  if (!PROOF_DIR) return;
  await page.screenshot({ path: `${PROOF_DIR}/${name}.png`, fullPage: true });
}

async function optionLabels(page: Page): Promise<string[]> {
  const buttons = page.getByTestId("story-options").getByRole("button");
  const count = await buttons.count();
  const labels: string[] = [];
  for (let index = 0; index < count; index += 1) {
    labels.push(await buttons.nth(index).innerText());
  }
  return labels;
}

/**
 * Play forward until the school scene comes up, the way a childhood reaches it.
 *
 * Nothing here forces the beat. The scene is one of the things an enrolled
 * child's years can turn up, so the walk takes the first option each time and
 * stops when the corridor arrives.
 */
async function playToCorridor(
  page: Page,
  limit = 40,
): Promise<{ prose: string; options: string[] }> {
  for (let step = 0; step < limit; step += 1) {
    await expect(page.getByTestId("story-prose")).toBeVisible();
    const prose = await page.getByTestId("story-prose").innerText();
    if (/is broken at school/i.test(prose)) {
      return { prose, options: await optionLabels(page) };
    }
    const buttons = page.getByTestId("story-options").getByRole("button");
    await buttons.first().click();
  }
  throw new Error(`The corridor scene did not come up within ${limit} beats.`);
}

async function playToContinuation(
  page: Page,
  continuation: RegExp,
  limit = 20,
): Promise<{ prose: string; options: string[] }> {
  let previousProse: string | null = null;
  for (let step = 0; step < limit; step += 1) {
    await expect(page.getByTestId("story-prose")).toBeVisible();
    const prose = await page.getByTestId("story-prose").innerText();
    if (continuation.test(prose))
      return { prose, options: await optionLabels(page) };
    const quiet = page.getByTestId("story-let-time-pass");
    if (previousProse !== prose && (await quiet.count()) > 0) {
      // Use the player's normal formative-time control to cross the authored
      // continuation gate. If the unanswered scene remains ranked first on
      // the next draw, answer it then so selection can move on.
      previousProse = prose;
      await quiet.click();
    } else {
      previousProse = null;
      await page
        .getByTestId("story-options")
        .getByRole("button")
        .first()
        .click();
    }
  }
  throw new Error(
    `The school continuation did not appear within ${limit} beats.`,
  );
}

test.describe("PT3 — the corridor scene on the screen", () => {
  for (const route of [
    {
      label: "child",
      age: 10,
      seed: "recovery25-school-child",
      option: /^Say it was /,
      continuation: /has been telling people/i,
      activation: "pointer",
    },
    {
      label: "teen",
      age: 16,
      seed: "recovery25-school-teen",
      option: /^Take the blame/,
      continuation: /^A year on/i,
      activation: "keyboard",
    },
  ] as const) {
    test(`${route.label} route names the incident and peer through reload and continuation`, async ({
      page,
    }) => {
      await freshBrowser(page, route.seed);
      await walkCreator(page, { age: route.age, childhood: true });
      await enterLife(page);

      const beat = await playToCorridor(page);

      await expect(page.getByTestId("play-screen")).toHaveAttribute(
        "data-scene-purpose",
        "school",
      );
      await expect(page.getByTestId("play-screen")).not.toHaveAttribute(
        "data-scene-id",
        /residence-apartment/,
      );

      // What happened.
      const incident = INCIDENTS.find((candidate) =>
        beat.prose.toLowerCase().includes(candidate),
      );
      expect(incident, `no authored incident in: ${beat.prose}`).toBeDefined();

      // Who did it: the option that names somebody says their name, and that
      // name is in the prose the player just read.
      const naming = beat.options.find((label) => /^Say it was /.test(label));
      expect(
        naming,
        `no naming option in: ${beat.options.join(" | ")}`,
      ).toBeDefined();
      const classmate = naming!
        .split("\n")[0]!
        .replace(/^Say it was /, "")
        .trim();
      expect(classmate.length).toBeGreaterThan(2);
      expect(beat.prose).toContain(classmate);

      // What the player was told is separated from what they saw.
      expect(beat.prose).toMatch(/office/i);
      expect(beat.prose).toMatch(/standing next to it when it happened/i);
      for (const banned of BANNED) {
        expect(beat.prose).not.toMatch(banned);
        for (const option of beat.options) expect(option).not.toMatch(banned);
      }

      await captureProof(page, `${route.label}-school-corridor`);

      // Say it was them, and the record keeps the same two facts.
      const decision = page.getByTestId("story-options").getByRole("button", {
        name:
          route.label === "child"
            ? new RegExp(`^Say it was ${classmate}`)
            : route.option,
      });
      if (route.activation === "keyboard") {
        await decision.focus();
        await page.keyboard.press("Enter");
      } else {
        await decision.click();
      }

      await page.getByTestId("open-journal").click();
      await expect(page.getByTestId("journal")).toBeVisible();
      const journal = await page.getByTestId("journal").innerText();
      expect(journal).toContain(classmate);
      expect(journal.toLowerCase()).toContain(incident!);

      /*
       * And after the life is saved and loaded again, it still does.
       *
       * Keep, then wait for the control to leave — the write is asynchronous and
       * the control leaving is how the screen says it finished — then reload to
       * the title and continue, which is the route a player takes back in.
       */
      await page.getByTestId("open-journal").click();
      await goTo(page, "keep-world");
      await expectNoDestination(page, "keep-world");
      await page.goto("/");
      await page.getByTestId("continue").click();
      await expect(page.getByTestId("play-screen")).toBeVisible();
      await enterLife(page);
      await page.getByTestId("open-journal").click();
      await expect(page.getByTestId("journal")).toBeVisible();
      const reloaded = await page.getByTestId("journal").innerText();
      expect(reloaded).toContain(classmate);
      expect(reloaded.toLowerCase()).toContain(incident!);
      await page.getByTestId("open-journal").click();

      const continuation = await playToContinuation(page, route.continuation);
      expect(
        `${continuation.prose} ${continuation.options.join(" ")}`,
      ).toContain(classmate);
      expect(continuation.prose.toLowerCase()).toContain(incident!);
      await captureProof(page, `${route.label}-school-continuation`);
    });
  }
});
