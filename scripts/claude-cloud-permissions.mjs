import process from "node:process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Scope the owner's storage-override permission to Claude cloud sessions.
 * Shared settings also load on the Mac, so a blanket Bash allow rule there
 * would grant the same permission locally. This hook leaves local permission
 * handling unchanged and never sets the override or executes the command.
 * Claude documents CLAUDE_CODE_REMOTE in its cloud-environments guide.
 */
export function cloudPermission(
  input,
  env = process.env,
  platform = process.platform,
) {
  if (
    platform !== "linux" ||
    env.CLAUDE_CODE_REMOTE !== "true" ||
    input?.hook_event_name !== "PreToolUse" ||
    input?.tool_name !== "Bash" ||
    typeof input?.tool_input?.command !== "string" ||
    !/^\s*OCD_STORAGE_OVERRIDE=/.test(input.tool_input.command)
  )
    return null;

  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason:
        "Owner-authorized storage override in a Claude Linux cloud session; no local Mac override permission is granted.",
    },
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = cloudPermission(JSON.parse(readFileSync(0, "utf8")));
    if (result) process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch {
    // No approval on malformed input; normal Claude permissions still apply.
    process.exitCode = 1;
  }
}
