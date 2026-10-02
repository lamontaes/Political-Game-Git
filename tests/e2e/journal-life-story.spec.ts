import { expect, test } from "./fixtures";
import { sampledProofLocalityForState } from "../../src/presentation/new-game-geography";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { pickDistinct, SeededRng } from "../../src/simulation/rng";
import { goTo, startLife } from "./support/creator";

const SEED = "journal-story-browser";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const town = sampledProofLocalityForState(state!.jurisdictionKey);

test(`My journal tells my life in chapters (${town.displayName}, ${state!.name}, all56 seed ${SEED})`, async ({
  page,
}, info) => {
  await page.goto(`/?seed=${SEED}`);
  await startLife(page, {
    place: town.displayName,
    state: state!.name,
    age: 51,
    route: "custom",
    household: "shares-a-home",
  });
  await page.getByTestId("play-screen").waitFor();
  const orientation = page.getByTestId("world-orientation");
  await expect(orientation).toBeVisible();
  for (
    let step = 0;
    step < 12 && (await orientation.getAttribute("data-step")) !== "your-life";
    step++
  )
    await page.getByTestId("orientation-next").click();
  await expect(orientation).toHaveAttribute("data-step", "your-life");
  await expect(
    orientation.getByRole("heading", { name: "Your life so far" }),
  ).toBeVisible();
  expect(await orientation.innerText()).not.toMatch(
    /You started work|You attended|You finished/,
  );
  await page.screenshot({ path: info.outputPath("opening-journal-1440.png") });
  await page.getByTestId("orientation-next").click();
  await expect(orientation).toBeHidden();
  await goTo(page, "nav-journal-entry");
  const story = page.getByTestId("world39-biography");
  await expect(story).toBeVisible();
  await expect(story).toContainText("I was born");
  const headings = await story.locator("h4").allTextContents();
  expect(headings.length).toBeGreaterThan(0);
  expect(headings.join(" ")).not.toMatch(/\d{4}|At \d/);
  expect(await story.innerText()).not.toMatch(
    /As I heard it|more like it|work schedule|\bYou\b/,
  );
  await page.screenshot({ path: info.outputPath("journal-story-1440.png") });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: info.outputPath("journal-story-1280.png") });
});
