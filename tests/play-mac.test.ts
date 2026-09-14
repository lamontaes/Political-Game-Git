import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const fixtures: string[] = [];
afterEach(() => {
  for (const fixture of fixtures.splice(0))
    rmSync(fixture, { recursive: true, force: true });
});

// Exercise the actual shell launcher with bounded stand-ins at its external
// command boundaries. Never create, serve or modify an owner's real play copy.
function launch(
  mode: "candidate" | "production",
  cached = true,
  occupied = false,
) {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "p31-play-cli-")),
  );
  fixtures.push(root);
  const repo = path.join(root, "repo");
  const playRoot = path.join(root, "play");
  const sha = "a".repeat(40);
  const playDir = path.join(playRoot, `play-${sha.slice(0, 12)}`);
  const bin = path.join(root, "bin");
  for (const dir of [
    repo,
    playDir,
    bin,
    path.join(playDir, "node_modules/.bin"),
  ])
    mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(repo, "package.json"),
    '{"name":"political-life-rpg"}',
  );
  const lock = '{"lockfileVersion":3}';
  writeFileSync(path.join(playDir, "package-lock.json"), lock);
  writeFileSync(path.join(playDir, "node_modules/.bin/vite"), "#!/bin/sh\n", {
    mode: 0o755,
  });
  const npmVersion = "10.9.8";
  if (cached) {
    const hash = createHash("sha256").update(lock).digest("hex");
    writeFileSync(
      path.join(playRoot, `.npm-ci-success-${sha.slice(0, 12)}`),
      `${hash}|${process.version}|${process.platform}|${process.arch}|npm-${npmVersion}\n`,
    );
  }
  const trace = path.join(root, "trace");
  writeFileSync(trace, "");
  const stub = (name: string, body: string) =>
    writeFileSync(path.join(bin, name), `#!/bin/sh\n${body}\n`, {
      mode: 0o755,
    });
  stub(
    "git",
    `
case "$*" in
  *fetch*) echo fetch >> "$P31_TRACE" ;;
  *'rev-parse --show-toplevel'*)
    if [ "$2" = "$PG_REPO" ]; then echo "$PG_REPO"; else echo "$P31_PLAY_DIR"; fi ;;
  *'rev-parse --is-inside-work-tree'*) echo true ;;
  *'status --porcelain'*) ;;
  *rev-parse*) echo "$P31_SHA" ;;
  *) echo "unexpected git: $*" >> "$P31_TRACE"; exit 99 ;;
esac`,
  );
  stub("lsof", 'exit "$P31_PORT_OCCUPIED"');
  stub(
    "npm",
    `
if [ "$1" = "--version" ]; then echo ${npmVersion}; exit 0; fi
echo "npm $*" >> "$P31_TRACE"
if [ "$1" = "ci" ]; then exit 0; fi
if [ "$1" = "run" ] && [ "$2" = "dev:identified" ]; then
  for attempt in $(seq 1 40); do
    if [ -f "$P31_OPENED" ]; then exit 0; fi
    sleep 0.05
  done
  exit 98
fi
exit 99`,
  );
  stub(
    "curl",
    `
case "$*" in
  *__dev/identity*) printf '{"workspace":"%s","head":"%s"}' "$P31_PLAY_DIR" "$P31_SHA" ;;
esac`,
  );
  stub("open", 'echo "open $1" >> "$P31_TRACE"; touch "$P31_OPENED"');
  const result = spawnSync("bash", [path.resolve("scripts/play-mac.command")], {
    encoding: "utf8",
    timeout: 4000,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      PG_REPO: repo,
      PG_PLAY_ROOT: playRoot,
      PG_PORT: "5311",
      PG_MODE: mode,
      PG_SOURCE: "origin/main",
      PG_OFFLINE_CACHED: "0",
      P31_SHA: sha,
      P31_PLAY_DIR: playDir,
      P31_TRACE: trace,
      P31_OPENED: path.join(root, "opened"),
      // lsof exits zero when it finds a listener.
      P31_PORT_OCCUPIED: occupied ? "0" : "1",
    },
  });
  return { result, trace: readFileSync(trace, "utf8"), sha };
}

describe("double-click Play guidance and preserved launch boundaries", () => {
  it.each(["candidate", "production"] as const)(
    "opens selected %s art Play with exact cached dependencies and labels review separately",
    (mode) => {
      const { result, trace, sha } = launch(mode);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const url = `http://127.0.0.1:5311/${mode === "candidate" ? "?art-preview=candidate" : ""}`;
      const play = `Play (${mode} art): ${url}`;
      expect(result.stdout).toContain(play);
      expect(result.stdout).toContain("art Play (separate saves):");
      expect(result.stdout.indexOf(play)).toBeLessThan(
        result.stdout.indexOf("Review tools (developer fixtures):"),
      );
      expect(result.stdout).toContain(`Verified source: ${sha}`);
      expect(trace).toContain(`open ${url}\n`);
      expect(trace).toContain("npm run dev:identified -- --port 5311");
      expect(trace).not.toContain("npm ci");
      expect(trace).not.toContain("validate");
      expect(trace).not.toContain("unexpected git");
    },
  );

  it("installs a missing compatible dependency fingerprint before opening Play", () => {
    const { result, trace } = launch("production", false);
    expect(result.status).toBe(0);
    expect(trace).toContain("npm ci --no-audit --no-fund");
    expect(trace.indexOf("npm ci")).toBeLessThan(
      trace.indexOf("npm run dev:identified"),
    );
    expect(trace).toContain("open http://127.0.0.1:5311/\n");
    expect(trace).not.toContain("validate");
  });

  it("refuses an occupied port before fetching, installing or opening anything", () => {
    const { result, trace } = launch("production", false, true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Something is already listening on port 5311",
    );
    expect(trace).toBe("");
  });
});
