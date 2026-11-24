import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { build } from "vite";
import { identifiedBuild } from "./vite-identity";

const originalCwd = process.cwd();
const roots: string[] = [];
afterEach(() => {
  process.chdir(originalCwd);
  delete process.env.PG_LOCAL_REVIEW;
  delete process.env.PG_RUN_ID;
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

it("distributable JS, maps, public assets and JSON retain version/revision without local provenance even with local review requested", async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "private-checkout-")));
  roots.push(root);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ version: "0.2.0", type: "module" }),
  );
  writeFileSync(
    join(root, "index.html"),
    '<script type="module" src="/main.js"></script>',
  );
  writeFileSync(
    join(root, "main.js"),
    'document.body.textContent = JSON.stringify({version:__RELEASE_VERSION__,revision:__BUILD_REVISION__,revisionShort:__BUILD_REVISION_SHORT__,local:typeof __PG_BUILD_IDENTITY__ === "undefined" ? null : __PG_BUILD_IDENTITY__});',
  );
  mkdirSync(join(root, "public"));
  writeFileSync(join(root, "public", "fixture.json"), '{"fixture":true}');
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init", "-b", "private-branch-sentinel");
  git("add", ".");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-m",
    "fixture",
  );
  const revision = git("rev-parse", "HEAD");
  process.chdir(root);
  process.env.PG_LOCAL_REVIEW = "1";
  process.env.PG_RUN_ID = "private-run-sentinel";
  const result = await build({
    configFile: false,
    root,
    plugins: [identifiedBuild()],
    build: { outDir: join(root, "dist"), sourcemap: true, minify: false },
  });
  const bundles = Array.isArray(result) ? result : [result];
  const output = bundles.flatMap((item) =>
    "output" in item ? item.output : [],
  );
  const text = output
    .map((item) => (item.type === "chunk" ? item.code : String(item.source)))
    .join("\n");
  expect(text).toContain(revision);
  expect(text).toContain("0.2.0");
  for (const forbidden of [
    root,
    "private-branch-sentinel",
    "private-run-sentinel",
    '"workspace"',
    '"pid"',
    '"runId"',
    '"sourceDigest"',
    '"branch"',
  ])
    expect(text).not.toContain(forbidden);
  expect(output.some((item) => item.fileName === "build-identity.json")).toBe(
    false,
  );
  expect(output.some((item) => item.fileName.endsWith(".map"))).toBe(true);
  const { scanPublicBuild } = await import("./scan-public-build");
  expect(
    scanPublicBuild(join(root, "dist"), [
      root,
      "private-branch-sentinel",
      "private-run-sentinel",
    ]).files,
  ).toBeGreaterThan(3);
  expect(readFileSync(join(root, "dist", "fixture.json"), "utf8")).toBe(
    '{"fixture":true}',
  );
  expect(readdirSync(join(root, "public"))).toEqual(["fixture.json"]);
  expect(
    readFileSync(join(root, "public", "fixture.json"), "utf8"),
  ).not.toContain(root);
});

it("rejects private provenance in copied public assets and maps", async () => {
  const { scanPublicBuild } = await import("./scan-public-build");
  const root = mkdtempSync(join(tmpdir(), "public-scan-"));
  roots.push(root);
  const asset = join(root, "copied.json");
  writeFileSync(asset, '{"version":"0.2.0","revision":"safe"}');
  expect(scanPublicBuild(root, ["/private/developer"])).toEqual({ files: 1 });
  writeFileSync(asset, '{"origin":"/private/developer/project"}');
  expect(() => scanPublicBuild(root, ["/private/developer"])).toThrow(
    "local provenance",
  );
  writeFileSync(asset, '{"pid":123}');
  expect(() => scanPublicBuild(root, [])).toThrow("development identity");
});

it("ordinary development omits private identity and explicit local review refuses a public host", async () => {
  const { resolveConfig } = await import("vite");
  delete process.env.PG_LOCAL_REVIEW;
  const ordinary = await resolveConfig(
    { configFile: false, plugins: [identifiedBuild()] },
    "serve",
  );
  expect(ordinary.define?.__PG_BUILD_IDENTITY__).toBeUndefined();
  expect(ordinary.define?.__BUILD_REVISION__).toBeTruthy();
  process.env.PG_LOCAL_REVIEW = "1";
  await expect(
    resolveConfig(
      {
        configFile: false,
        plugins: [identifiedBuild()],
        server: { host: "0.0.0.0" },
      },
      "serve",
    ),
  ).rejects.toThrow("loopback host");
  const local = await resolveConfig(
    {
      configFile: false,
      plugins: [identifiedBuild()],
      server: { host: "127.0.0.1" },
    },
    "serve",
  );
  expect(JSON.parse(local.define!.__PG_BUILD_IDENTITY__).workspace).toBe(
    originalCwd,
  );
});

it("preserves the release owner's canonical Vite defines when composed", async () => {
  const { resolveConfig } = await import("vite");
  const define = {
    __RELEASE_VERSION__: '"release-owner"',
    __BUILD_REVISION__: '"canonical"',
    __BUILD_REVISION_SHORT__: '"canonic"',
    __BUILD_DIRTY__: "false",
  };
  const config = await resolveConfig(
    { configFile: false, define, plugins: [identifiedBuild()] },
    "build",
  );
  expect(config.define).toEqual(define);
});
