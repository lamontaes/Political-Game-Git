import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL } from "node:url";
import { test } from "vitest";
import { cloudPermission } from "./claude-cloud-permissions.mjs";

const input = {
  hook_event_name: "PreToolUse",
  tool_name: "Bash",
  tool_input: {
    command: 'OCD_STORAGE_OVERRIDE="cloud playtest" npx playwright test',
  },
};
const remote = { CLAUDE_CODE_REMOTE: "true" };

test("cloud override receives permission without changing or running the command", () => {
  const before = JSON.stringify(input);
  assert.equal(
    cloudPermission(input, remote, "linux").hookSpecificOutput
      .permissionDecision,
    "allow",
  );
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(remote, { CLAUDE_CODE_REMOTE: "true" });
});

test("Mac, Windows, and unmarked Linux sessions receive no override approval", () => {
  for (const platform of ["darwin", "win32", "freebsd"]) {
    assert.equal(cloudPermission(input, remote, platform), null);
  }
  for (const env of [
    {},
    { CLAUDE_CODE_REMOTE: "false" },
    { CLAUDE_CODE_REMOTE: "1" },
    { CI: "true" },
  ]) {
    assert.equal(cloudPermission(input, env, "linux"), null);
  }
});

test("unrelated tools, events, commands and malformed inputs receive no approval", () => {
  for (const value of [
    null,
    {},
    { ...input, hook_event_name: "PostToolUse" },
    { ...input, tool_name: "Edit" },
  ]) {
    assert.equal(cloudPermission(value, remote, "linux"), null);
  }
  for (const command of [
    undefined,
    5,
    "npm run build",
    "echo OCD_STORAGE_OVERRIDE=x",
    "NOT_OCD_STORAGE_OVERRIDE=x npm test",
  ]) {
    assert.equal(
      cloudPermission({ ...input, tool_input: { command } }, remote, "linux"),
      null,
    );
  }
});

test("shared settings preserve report hooks and do not grant a blanket override", () => {
  const settings = JSON.parse(
    readFileSync(new URL("../.claude/settings.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(settings.permissions.allow, [
    "Bash(git merge origin/main)",
    "Edit(/.github/workflows/release.yml)",
  ]);
  assert.ok(
    settings.hooks.PreToolUse.some(
      (entry) =>
        entry.matcher === "Bash" &&
        entry.hooks.some((hook) =>
          hook.command.includes("claude-cloud-permissions.mjs"),
        ),
    ),
  );
  assert.ok(
    settings.hooks.PreToolUse.some(
      (entry) => entry.matcher === "mcp__Google_Drive__create_file",
    ),
  );
  assert.ok(
    settings.hooks.PostToolUse.some(
      (entry) => entry.matcher === "Write|Edit|MultiEdit",
    ),
  );
});

test("hook executable stays silent on local input and fails closed on invalid JSON", () => {
  const hook = new URL("./claude-cloud-permissions.mjs", import.meta.url);
  const valid = spawnSync(process.execPath, [hook.pathname], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_CODE_REMOTE: "false" },
  });
  assert.equal(valid.status, 0);
  assert.equal(valid.stdout, "");
  const invalid = spawnSync(process.execPath, [hook.pathname], {
    input: "not JSON",
    encoding: "utf8",
  });
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, "");
});
