import { writeFileSync } from "node:fs";
import { test, expect, type Page } from "./fixtures";
import { startLife, enterLife, saveLife } from "./support/creator";
test.use({ video: "on" });
async function wardrobe(page: Page) {
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("nav-personal-group").click();
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  await page
    .getByTestId("saved-appearance-controls")
    .locator("summary")
    .click();
  await expect(page.getByTestId("prepared-appearance-controls")).toBeVisible();
}
async function drawn(page: Page) {
  const figure = page.locator(
    '[data-testid="saved-appearance-controls"] > [data-testid="wardrobe-figure"] [data-testid="wardrobe-full-body"]',
  );
  await expect(figure.locator('[data-material-state="loading"]')).toHaveCount(
    0,
  );
  await expect(
    figure.locator('[data-material-state="unavailable"]'),
  ).toHaveCount(0);
  return figure.locator("img").evaluateAll(async (imgs) =>
    Promise.all(
      imgs
        .filter(
          (img): img is HTMLImageElement => img instanceof HTMLImageElement,
        )
        .map(async (img) => {
          await img.decode();
          const svg = await (await fetch(img.src)).text();
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(svg),
          );
          return {
            id: img.dataset.assetId,
            kind: img.dataset.kind,
            parameters: JSON.parse(img.dataset.materialParameters ?? "null"),
            sha256: Array.from(new Uint8Array(digest))
              .map((n) => n.toString(16).padStart(2, "0"))
              .join(""),
          };
        }),
    ),
  );
}
test("normal prepared person changes materials/features and real clothes, then reopens", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/?seed=p29-material-life&art-preview=candidate");
  await startLife(page, {
    age: 34,
    route: "normal",
    givenName: "Material",
    familyName: "Review",
  });
  await enterLife(page);
  await wardrobe(page);
  const first = await drawn(page);
  expect(
    first.every((p) => p.parameters.version === "engine-people29-v1"),
  ).toBe(true);
  await page
    .getByRole("combobox", { name: "Skin palette", exact: true })
    .selectOption("brown");
  const eyes = page.getByRole("combobox", { name: "eyes shape", exact: true });
  await eyes.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const nose = page.getByRole("slider", { name: "nose width", exact: true });
  await nose.focus();
  await page.keyboard.press("ArrowRight");
  const faceChanged = await drawn(page);
  expect(faceChanged.find((p) => p.kind === "head")!.sha256).not.toBe(
    first.find((p) => p.kind === "head")!.sha256,
  );
  for (const name of ["top", "bottom"]) {
    const select = page.getByRole("combobox", { name, exact: true });
    const old = await select.inputValue();
    const choices = await select.locator("option").evaluateAll((es) =>
      es
        .filter((e): e is HTMLOptionElement => e instanceof HTMLOptionElement)
        .filter((e) => e.value && !e.disabled)
        .map((e) => e.value),
    );
    const next = choices.find((v) => v !== old);
    expect(next).toBeTruthy();
    await select.selectOption(next!);
  }
  const after = await drawn(page);
  for (const kind of ["head", "hair-front"]) {
    expect(after.find((p) => p.kind === kind)).toEqual(
      faceChanged.find((p) => p.kind === kind),
    );
  }
  await page
    .getByTestId("wardrobe-full-body")
    .screenshot({ path: info.outputPath("prepared-person.png") });
  await saveLife(page);
  await page.goto("/?art-preview=candidate");
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .filter({ hasText: "Material Review" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await enterLife(page);
  await wardrobe(page);
  expect(await drawn(page)).toEqual(after);
  writeFileSync(
    info.outputPath("drawn-parameters-hashes.json"),
    JSON.stringify({ first, faceChanged, after }, null, 2),
  );
  const contract = await page.evaluate(async () => {
    const modulePath = "/src/player/engine-people29-svg.ts";
    const m = await import(/* @vite-ignore */ modulePath);
    return m.preparedVariantCacheSize();
  });
  expect(contract).toBeLessThanOrEqual(64);
});

test("all six bodies swap real clothing; cancellation retains the saved person", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/?seed=p29-six&art-preview=candidate");
  await startLife(page, {
    age: 34,
    route: "normal",
    givenName: "Six",
    familyName: "Bodies",
  });
  await enterLife(page);
  await wardrobe(page);
  const body = page.getByRole("combobox", { name: "Body", exact: true });
  const choices = await body.locator("option").evaluateAll((es) =>
    es
      .filter((e): e is HTMLOptionElement => e instanceof HTMLOptionElement)
      .filter((e) => e.value.startsWith("ep29-") && !e.disabled)
      .map((e) => e.value),
  );
  expect(choices).toHaveLength(6);
  const observations = [];
  for (const value of choices) {
    if ((await body.inputValue()) !== value) {
      const before = await drawn(page);
      await body.selectOption(value);
      await expect(
        page.getByRole("button", { name: "Apply this outfit", exact: true }),
      ).toBeVisible();
      expect(await drawn(page)).toEqual(before);
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      expect(await drawn(page)).toEqual(before);
      await body.selectOption(value);
      await page
        .getByRole("button", { name: "Apply this outfit", exact: true })
        .click();
    }
    await expect(body).toHaveValue(value);
    const first = await drawn(page);
    for (const name of ["top", "bottom"]) {
      const select = page.getByRole("combobox", { name, exact: true });
      const old = await select.inputValue();
      const options = await select.locator("option").evaluateAll((es) =>
        es
          .filter((e): e is HTMLOptionElement => e instanceof HTMLOptionElement)
          .filter((e) => e.value && !e.disabled)
          .map((e) => e.value),
      );
      expect(options.length).toBeGreaterThanOrEqual(2);
      await select.scrollIntoViewIfNeeded();
      await select.focus();
      await expect(select).toBeFocused();
      const next = options.find((value) => value !== old)!;
      const initial = await select
        .locator(`option[value="${next}"]`)
        .textContent();
      // Native macOS headless select supports typeahead; arrow navigation is inert.
      await page.keyboard.press(initial!.trim()[0]!.toLowerCase());
      await page.keyboard.press("Tab");
      await expect(select).toHaveValue(next);
    }
    const after = await drawn(page);
    for (const kind of ["head", "hair-front"])
      expect(after.find((p) => p.kind === kind)).toEqual(
        first.find((p) => p.kind === kind),
      );
    expect(after.find((p) => p.kind === "top")?.id).not.toBe(
      first.find((p) => p.kind === "top")?.id,
    );
    expect(after.find((p) => p.kind === "bottom")?.id).not.toBe(
      first.find((p) => p.kind === "bottom")?.id,
    );
    await page
      .getByTestId("wardrobe-full-body")
      .screenshot({ path: info.outputPath(value + ".png") });
    observations.push({ body: value, first, after });
  }
  writeFileSync(
    info.outputPath("six-bodies.json"),
    JSON.stringify(observations, null, 2),
  );
});

test("native material pass preserves alpha and protected drawing; variants release", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/?art-preview=candidate");
  const proof = await page.evaluate(async () => {
    const runtimePath = "/src/player/engine-people29-svg.ts";
    const dataPath = "/src/presentation/engine-people29-data.ts";
    const runtime = await import(/* @vite-ignore */ runtimePath);
    const data = await import(/* @vite-ignore */ dataPath);
    const pixels = async (svg: string) => {
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml" }),
      );
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 1200;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, 600, 1200).data;
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    const results = [];
    for (const family of data.ENGINE_PEOPLE29_FAMILIES) {
      const material = data.defaultPreparedMaterial(family);
      const changed = structuredClone(material);
      for (const part of family.parts)
        for (const m of part.materials)
          changed.palettes[m.channel] = m.ramps.at(-1).id;
      const ids = Object.keys(data.ENGINE_PEOPLE29_TEMPLATES).filter(
        (id) => data.ENGINE_PEOPLE29_TEMPLATES[id].familyId === family.id,
      );
      for (const id of ids) {
        const a = await runtime.renderPreparedSvg(
          id,
          material,
          family.recipes.default,
        );
        const b = await runtime.renderPreparedSvg(
          id,
          changed,
          family.recipes.default,
        );
        const pa = await pixels(a),
          pb = await pixels(b);
        let alphaDelta = 0,
          rgbChanged = 0;
        for (let i = 0; i < pa.length; i += 4) {
          alphaDelta = Math.max(alphaDelta, Math.abs(pa[i + 3]! - pb[i + 3]!));
          if (pa[i + 3] && [0, 1, 2].some((k) => pa[i + k] !== pb[i + k]))
            rgbChanged++;
        }
        const da = new DOMParser().parseFromString(a, "image/svg+xml"),
          db = new DOMParser().parseFromString(b, "image/svg+xml");
        const protectedGroups = Array.from(
          da.querySelectorAll('[id$="-ink"],[id$="-details"]'),
        );
        const protectedExact = protectedGroups.every(
          (e) => e.outerHTML === db.getElementById(e.id)?.outerHTML,
        );
        results.push({
          id,
          alphaDelta,
          rgbChanged,
          protectedGroups: protectedGroups.length,
          protectedExact,
        });
      }
    }
    const family = data.ENGINE_PEOPLE29_FAMILIES[0],
      material = data.defaultPreparedMaterial(family),
      id = family.parts.find((p: { kind: string }) => p.kind === "body").id;
    const start = runtime.preparedVariantCacheSize();
    const a = runtime.acquirePreparedVariant(
        id,
        material,
        family.recipes.default,
      ),
      b = runtime.acquirePreparedVariant(id, material, family.recipes.default);
    const au = await a.url,
      bu = await b.url;
    const shared = au === bu;
    a.release();
    const retained = await fetch(bu).then((r) => r.ok);
    b.release();
    b.release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const revoked = await fetch(au).then(
      () => false,
      () => true,
    );
    const end = runtime.preparedVariantCacheSize();
    return { results, start, end, shared, retained, revoked };
  });
  expect(proof.results).toHaveLength(72);
  expect(
    proof.results.every((r) => r.alphaDelta <= 1 && r.protectedExact),
  ).toBe(true);
  expect(
    proof.results.filter((r) => r.rgbChanged > 100).length,
  ).toBeGreaterThanOrEqual(60);
  expect(proof.shared && proof.retained && proof.revoked).toBe(true);
  expect(proof.end).toBe(proof.start);
  writeFileSync(
    info.outputPath("native-material-proof.json"),
    JSON.stringify(proof, null, 2),
  );
});
