import { expect, test, type Page } from "./fixtures";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { replayDescriptorUrl } from "../../src/presentation/new-game-identity";
import { enterLife, goTo } from "./support/creator";

interface SaveRaceOpenControl {
  holdNextOpen: boolean;
  readonly heldCount: number;
  readonly successfulOpens: number;
  releaseHeldOpen(): void;
}

declare global {
  interface Window {
    __saveRaceOpenControl?: SaveRaceOpenControl;
  }
}

function isoDateFromNavigationLabel(label: string | null): string {
  if (!label) throw new Error("The game navigation has no date label.");
  const iso = label.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (iso) return iso;
  const prose = label.match(/\b[A-Z][a-z]+ \d{1,2}, \d{4}\b/)?.[0];
  if (!prose) throw new Error(`Could not read the date from: ${label}`);
  const parsed = new Date(`${prose} 12:00:00 UTC`);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Could not parse the date from: ${label}`);
  }
  return parsed.toISOString().slice(0, 10);
}

async function savedWorldDate(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<string | null>((resolve, reject) => {
        const request = database
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        request.onsuccess = () => {
          const record = request.result.find(
            (candidate: { payload?: string }) =>
              typeof candidate.payload === "string" &&
              candidate.payload.startsWith("{"),
          ) as { payload: string } | undefined;
          if (!record) return resolve(null);
          const payload = JSON.parse(record.payload) as {
            world?: { currentDate?: unknown };
          };
          resolve(
            typeof payload.world?.currentDate === "string"
              ? payload.world.currentDate
              : null,
          );
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

test("a Day press during Save remains live and reaches the next autosave", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const held: (() => void)[] = [];
    let holdNextOpen = false;
    let successfulOpens = 0;
    const control: SaveRaceOpenControl = {
      get holdNextOpen() {
        return holdNextOpen;
      },
      set holdNextOpen(value: boolean) {
        holdNextOpen = value;
      },
      get heldCount() {
        return held.length;
      },
      get successfulOpens() {
        return successfulOpens;
      },
      releaseHeldOpen() {
        for (const resume of held.splice(0)) resume();
      },
    };
    window.__saveRaceOpenControl = control;

    const originalOpen = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (
      name: string,
      version?: number,
    ): IDBOpenDBRequest {
      const request =
        version === undefined
          ? originalOpen.call(this, name)
          : originalOpen.call(this, name, version);
      request.addEventListener(
        "success",
        () => {
          successfulOpens += 1;
        },
        { once: true },
      );
      if (name !== "political-life-worlds" || !holdNextOpen) return request;
      holdNextOpen = false;
      return new Proxy(request, {
        get(target, property) {
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
        set(target, property, value) {
          if (property === "onsuccess" && typeof value === "function") {
            target.onsuccess = (event) => {
              held.push(() => value.call(target, event));
            };
            return true;
          }
          return Reflect.set(target, property, value, target);
        },
      });
    };
  });

  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life" as const,
    household: "lives-alone" as const,
    seed: "save-day-race",
  };
  await page.goto(replayDescriptorUrl("", "/", setup));
  await enterLife(page);
  const day = page.getByTestId("shell-pass-day");
  await expect(day).toBeVisible();
  const navigation = page.getByTestId("shell-nav-cluster");
  const beforeLabel = await navigation.getAttribute("aria-label");
  const beforeDate = isoDateFromNavigationLabel(beforeLabel);

  await expect
    .poll(
      () =>
        page.evaluate(() => window.__saveRaceOpenControl?.successfulOpens ?? 0),
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(1);
  await page.evaluate(() => {
    if (!window.__saveRaceOpenControl) {
      throw new Error("The held-save test control was not installed.");
    }
    window.__saveRaceOpenControl.holdNextOpen = true;
  });
  await goTo(page, "keep-world");

  try {
    await expect
      .poll(
        () => page.evaluate(() => window.__saveRaceOpenControl?.heldCount ?? 0),
        { timeout: 10_000 },
      )
      .toBe(1);
    await day.click();
    await expect
      .poll(() => navigation.getAttribute("aria-label"), {
        timeout: 30_000,
      })
      .not.toBe(beforeLabel);
    const afterLabel = await navigation.getAttribute("aria-label");
    const afterDate = isoDateFromNavigationLabel(afterLabel);
    expect(Date.parse(afterDate)).toBeGreaterThan(Date.parse(beforeDate));
    expect(
      await page.evaluate(() => window.__saveRaceOpenControl?.heldCount ?? 0),
    ).toBe(1);

    await page.evaluate(() => window.__saveRaceOpenControl?.releaseHeldOpen());
    await expect
      .poll(() => savedWorldDate(page), { timeout: 30_000 })
      .toBe(afterDate);
    if (!afterLabel)
      throw new Error("The game navigation lost its date label.");
    await expect(navigation).toHaveAttribute("aria-label", afterLabel);
  } finally {
    await page.evaluate(() => window.__saveRaceOpenControl?.releaseHeldOpen());
  }
});
