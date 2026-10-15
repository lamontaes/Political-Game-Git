/** Native ESM import-order regression; no generated world is built or advanced. */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

it("loads the production parallel entry points without cycling through work defaults", () => {
  const base = pathToFileURL(process.cwd() + "/").href;
  const program = `
    const base = ${JSON.stringify(base)};
    await Promise.all([
      "src/core2/population.ts", "src/core2/deep-past.ts",
      "src/core2/civic-inputs.ts", "src/core2/life.ts",
      "src/core2/kernel/dates.ts", "src/core2/state.ts",
    ].map(path => import(base + path)));
    const [leaf, work, data] = await Promise.all([
      import(base + "src/core2/work-data.ts"),
      import(base + "src/core2/modules/work.ts"),
      import(base + "src/core2/data.ts"),
    ]);
    if (!Object.is(leaf.DEFAULT_WORK_DATA, work.DEFAULT_WORK_DATA) ||
        !Object.is(leaf.DEFAULT_WORK_DATA, data.DEFAULT_DATA.work))
      throw new Error("Work default identity changed.");
    console.log("shared-work-defaults");
  `;
  expect(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", program],
      { cwd: process.cwd(), encoding: "utf8", timeout: 30000 },
    ).trim(),
  ).toBe("shared-work-defaults");
});
