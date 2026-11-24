/* global Request */
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isPlayApiPath, serveAppRequest } from "../app-protocol.mjs";

const root = mkdtempSync(path.join(tmpdir(), "ocd-play-api-"));
writeFileSync(path.join(root, "index.html"), "<html></html>");

const calls = [];
const playApi = async (method, url) => {
  calls.push([method, url.pathname + url.search]);
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: '{"ok":true}',
  };
};

test("/api and /art go to the play server, including POST", async () => {
  const response = await serveAppRequest(
    root,
    new Request("app://game/api/newlife?seed=x", { method: "POST" }),
    playApi,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(calls.at(-1), ["POST", "/api/newlife?seed=x"]);
  await serveAppRequest(
    root,
    new Request("app://game/art/backdrops/a__day.jpg"),
    playApi,
  );
  assert.equal(calls.at(-1)[1], "/art/backdrops/a__day.jpg");
});

test("files still come from the packaged client, and POST to a file is refused", async () => {
  const page = await serveAppRequest(
    root,
    new Request("app://game/index.html"),
    playApi,
  );
  assert.equal(page.status, 200);
  const post = await serveAppRequest(
    root,
    new Request("app://game/index.html", { method: "POST" }),
    playApi,
  );
  assert.equal(post.status, 404);
});

test("a host without a play server still answers /api with 404", async () => {
  const response = await serveAppRequest(
    root,
    new Request("app://game/api/scene"),
  );
  assert.equal(response.status, 404);
  assert.equal(isPlayApiPath("/api/scene"), true);
  assert.equal(isPlayApiPath("/assets/play.js"), false);
});
