#!/usr/bin/env node
/**
 * Claude Code hook (`.claude/settings.json`): every report a session writes for
 * the owner is measured when it is written, not when someone remembers.
 *
 * - PostToolUse on Write/Edit/MultiEdit: an owner-facing markdown file (see
 *   `isOwnerReportPath`) that fails is reported back to the writing session
 *   with exit 2, so it has to repair the file before it moves on.
 * - PreToolUse on the Drive upload: a markdown or plain-text document that
 *   fails is refused before it reaches Drive.
 *
 * A passing file gets a reminder that the mechanical check is only the floor:
 * the civic-report-reviewer read is the rest of the standard.
 */
import process from "node:process";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { checkReport, isOwnerReportPath } from "./report-check.mjs";

const REMINDER =
  "Report check passed (mechanical floor only). Before sending it to the owner, " +
  "follow .agents/skills/civic-reports/SKILL.md and have the civic-report-reviewer agent read it.";

function read(stream) {
  try {
    return readFileSync(stream, "utf8");
  } catch {
    return "";
  }
}

function fail(label, errors) {
  process.stderr.write(
    `${label} does not meet the report standard (.agents/skills/civic-reports/SKILL.md). ` +
      `Fix these and write it again:\n${errors.join("\n")}\n`,
  );
  process.exit(2);
}

function pass(event) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: event, additionalContext: REMINDER },
    }),
  );
  process.exit(0);
}

let input;
try {
  input = JSON.parse(read(0) || "{}");
} catch {
  process.exit(0);
}
const tool = input.tool_name ?? "";
const toolInput = input.tool_input ?? {};
const event = input.hook_event_name ?? "PostToolUse";

if (/Google_Drive__create_file$/.test(tool)) {
  const mime = String(toolInput.contentMimeType ?? "");
  if (!/^text\/(markdown|plain|x-markdown)/.test(mime)) process.exit(0);
  const text =
    toolInput.textContent ??
    (toolInput.base64Content
      ? Buffer.from(toolInput.base64Content, "base64").toString("utf8")
      : "");
  // Only documents written as reports: a titled markdown body.
  if (!/^\s*# \S/m.test(text.split("\n").slice(0, 5).join("\n")))
    process.exit(0);
  const label = `Drive document "${toolInput.title ?? "untitled"}"`;
  const { errors } = checkReport(text, {
    path: String(toolInput.title ?? "drive"),
    story: /\b(playtest|walk|life|lives)\b/i.test(String(toolInput.title ?? ""))
      ? true
      : undefined,
  });
  if (errors.length) fail(label, errors);
  pass(event);
}

const filePath = String(toolInput.file_path ?? "");
if (!filePath || !isOwnerReportPath(filePath)) process.exit(0);
const text = read(filePath);
if (!text) process.exit(0);
const { errors } = checkReport(text, { path: filePath });
if (errors.length) fail(filePath, errors);
pass(event);
