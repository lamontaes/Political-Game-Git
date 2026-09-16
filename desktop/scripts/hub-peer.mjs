/* global console, process, URL */
/**
 * Minimal authenticated hub participant client for an existing external
 * session (for example a Claude Code desktop session using its shell). It
 * speaks the broker's MCP tools with the participant's own capability token.
 *
 * Usage: node hub-peer.mjs <command> --data <dir> --as <handle> [options]
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { Client } from "../private-controller/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StreamableHTTPClientTransport } from "../private-controller/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";

const [, , ...argv] = process.argv;
const opt = (name, fallback = undefined) => {
  const index = argv.indexOf(name);
  return index < 0 ? fallback : argv[index + 1];
};
const dataDir = path.resolve(opt("--data"));
const handle = opt("--as");
const command = argv[0];
const broker = JSON.parse(
  readFileSync(path.join(dataDir, "broker.json"), "utf8"),
);
const token = readFileSync(
  path.join(dataDir, "tokens", `${handle}.token`),
  "utf8",
).trim();

const client = new Client({ name: `hub-peer-${handle}`, version: "0.1.0" });
await client.connect(
  new StreamableHTTPClientTransport(
    new URL(
      `http://127.0.0.1:${broker.port}/mcp/${opt("--project", broker.project)}`,
    ),
    { requestInit: { headers: { authorization: `Bearer ${token}` } } },
  ),
);
const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  const parsed = JSON.parse(result.content[0].text);
  return result.isError ? { error: parsed } : parsed;
};
const drop = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
let out;
switch (command) {
  case "whoami":
    out = await call("whoami", {});
    break;
  case "who":
    out = await call("who", {});
    break;
  case "send":
    out = await call(
      "send",
      drop({
        to: opt("--to"),
        text: opt("--text"),
        kind: opt("--kind"),
        reply_to: opt("--reply-to"),
        source_sha: opt("--source-sha"),
        branch: opt("--branch"),
        artifact_ref: opt("--artifact"),
        idempotency_key: opt("--key"),
      }),
    );
    break;
  case "poll":
    out = await call("poll", {
      after_seq: Number(opt("--after", "0")),
      timeout_ms: Number(opt("--timeout", "20000")),
    });
    break;
  case "ack":
    out = await call("ack", { message_id: opt("--id") });
    break;
  case "update":
    out = await call(
      "update",
      drop({
        message_id: opt("--id"),
        state: opt("--state"),
        evidence: opt("--evidence"),
      }),
    );
    break;
  case "thread":
    out = await call("thread", { thread_id: opt("--id") });
    break;
  default:
    out = { error: `unknown command ${command}` };
}
console.log(JSON.stringify(out, null, 2));
await client.close();
