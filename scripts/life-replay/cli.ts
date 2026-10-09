import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import type { ReplayCore, RunReceipt } from "./contract";
import { readLife } from "./life-file";
import { evaluateLife } from "./evaluator";
import { runLife } from "./runner";
import { ONE, ZERO, parameter } from "./parameters";
import { checkReplay } from "./guards";
import { renderGapReport } from "./report";

const args = process.argv.slice(ONE + ONE);
const command = args[ZERO];
const flag = (key: string): string | undefined => {
  const index = args.indexOf(`--${key}`);
  return index < ZERO ? undefined : args[index + ONE];
};
const required = (key: string): string => {
  const value = flag(key);
  if (!value || value.startsWith("--")) throw new Error(`Missing --${key}`);
  return value;
};
const write = (path: string, value: unknown): void => {
  if (
    ["public", "dist", "src"].some((part) =>
      path.startsWith(resolve(part) + "/"),
    )
  )
    throw new Error(
      "Replay facts cannot be written into player assets or source",
    );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(value, null, parameter("jsonIndent"))}\n`,
  );
};
const digest = (path: string): string =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

async function run(): Promise<void> {
  const problems = checkReplay(process.cwd(), false);
  if (problems.length !== ZERO) throw new Error(problems.join("\n"));
  if (command === "run") {
    const lifePath = resolve(required("life"));
    const life = readLife(lifePath);
    const mode = required("mode");
    if (mode !== "god" && mode !== "free")
      throw new Error("Mode must be god or free");
    const output = resolve(required("out"));
    const corePath = resolve(flag("core") ?? "scripts/life-replay/old-core.ts");
    const adapter: unknown = await import(pathToFileURL(corePath).href);
    if (
      !adapter ||
      typeof adapter !== "object" ||
      !("createReplayCore" in adapter) ||
      typeof adapter.createReplayCore !== "function"
    )
      throw new Error("Adapter must export createReplayCore()");
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const core: ReplayCore = adapter.createReplayCore(revision);
    const receipt = runLife(life, core, {
      mode,
      seed: flag("seed") ?? "p9-public-life-v1",
      checkpoint: flag("checkpoint"),
      maxSimulatedDays:
        flag("max-days") === undefined ? undefined : Number(flag("max-days")),
    });
    write(output, receipt);
    write(
      output.replace(/\.json$/, "") + ".evaluation.json",
      evaluateLife(life, receipt),
    );
    write(output.replace(/\.json$/, "") + ".manifest.json", {
      revision,
      node: process.version,
      lifePath,
      lifeSha256: digest(lifePath),
      corePath,
      coreSha256: digest(corePath),
      parametersSha256: digest("data/life-replay/parameters.json"),
      sourceDirty:
        execFileSync(
          "git",
          [
            "status",
            "--porcelain",
            "--",
            "scripts/life-replay",
            "data/life-replay",
          ],
          { encoding: "utf8" },
        ).trim().length > ZERO,
      sourceOnly: core.metadata.id === "old-core/source-only-v1",
    });
    process.stdout.write(
      `${life.id} ${mode}: ${receipt.simulatedDays} days; ${receipt.complete ? "complete horizon" : "incomplete horizon"}\n`,
    );
    return;
  }
  if (command === "evaluate") {
    const life = readLife(resolve(required("life")));
    const receipt = JSON.parse(
      readFileSync(resolve(required("receipt")), "utf8"),
    ) as RunReceipt;
    write(resolve(required("out")), evaluateLife(life, receipt));
    return;
  }
  if (command === "report") {
    const life = readLife(resolve(required("life")));
    const output = resolve(required("out"));
    const paths = args.flatMap((value, index) =>
      value === "--receipt" ? [args[index + ONE]] : [],
    );
    if (paths.length === ZERO) throw new Error("Report needs --receipt FILE");
    if (
      ["public", "dist", "src"].some((part) =>
        output.startsWith(resolve(part) + "/"),
      )
    )
      throw new Error(
        "Replay reports cannot be written into player assets or source",
      );
    const { relative } = await import("node:path");
    const runs = paths.map((path) => ({
      receipt: JSON.parse(readFileSync(resolve(path), "utf8")) as RunReceipt,
      path: relative(dirname(output), resolve(path)),
    }));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, renderGapReport(life, runs));
    return;
  }
  if (command === "batch") {
    const output = resolve(required("out-dir"));
    const lives = flag("life")
      ? [resolve(required("life"))]
      : readdirSync("data/life-replay/lives")
          .filter((name) => name.endsWith(".json"))
          .sort()
          .map((name) => resolve("data/life-replay/lives", name));
    const timeout = parameter("maxRunMilliseconds");
    for (const life of lives)
      for (const mode of ["god", "free"]) {
        const name = `${basename(life, ".json")}.${flag("checkpoint") ?? "birth"}.${mode}.json`;
        const forwarded = [
          "--life",
          life,
          "--mode",
          mode,
          "--out",
          resolve(output, name),
        ];
        for (const key of ["core", "checkpoint", "seed", "max-days"]) {
          const value = flag(key);
          if (value !== undefined) forwarded.push(`--${key}`, value);
        }
        const child = spawnSync(
          process.execPath,
          [
            "--import",
            "tsx",
            fileURLToPath(import.meta.url),
            "run",
            ...forwarded,
          ],
          { timeout, encoding: "utf8", cwd: process.cwd() },
        );
        process.stdout.write(child.stdout ?? "");
        process.stderr.write(child.stderr ?? "");
        if (child.error || child.status !== ZERO)
          throw new Error(
            `Replay failed for ${name}: ${child.error?.message ?? child.status}; no success receipt was substituted`,
          );
      }
    return;
  }
  throw new Error(
    "Use run --life FILE --mode god|free --out FILE, batch --out-dir DIR, evaluate --life FILE --receipt FILE --out FILE, or report --life FILE --receipt FILE [--receipt FILE] --out FILE",
  );
}

await run().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = ONE;
});
