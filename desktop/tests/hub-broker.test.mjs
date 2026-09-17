/* global fetch, URL */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { Client } from "../private-controller/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StreamableHTTPClientTransport } from "../private-controller/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";
import {
  MAX_THREAD_HOPS,
  bearerToken,
  openBrokerStore,
  requestAllowed,
  startBrokerServer,
} from "../private-controller/agents/broker.mjs";

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "ocd-broker-"));
  const store = openBrokerStore(dir);
  const a = store.enroll({
    project: "ocd",
    handle: "claude-a",
    provider: "claude",
    sessionId: "s-claude-1",
  });
  const b = store.enroll({
    project: "ocd",
    handle: "codex-b",
    provider: "codex",
    sessionId: "t-codex-1",
  });
  return {
    dir,
    store,
    a,
    b,
    done: () => {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("same-name collision with another session is refused", () => {
  const f = fixture();
  try {
    assert.throws(
      () =>
        f.store.enroll({
          project: "ocd",
          handle: "codex-b",
          provider: "codex",
          sessionId: "t-codex-OTHER",
        }),
      /bound to another codex session/,
    );
    // Re-enrolling the same exact session rotates its token.
    const again = f.store.enroll({
      project: "ocd",
      handle: "codex-b",
      provider: "codex",
      sessionId: "t-codex-1",
    });
    assert.equal(f.store.authenticate("ocd", f.b.token), null);
    assert.equal(f.store.authenticate("ocd", again.token).handle, "codex-b");
  } finally {
    f.done();
  }
});

test("an unbound client enrollment binds to its first real session only", () => {
  const f = fixture();
  try {
    f.store.enroll({
      project: "ocd",
      handle: "cursor-1",
      provider: "cursor",
      sessionId: "unbound:cursor:x",
    });
    assert.throws(
      () => f.store.bindSession("ocd", "cursor-1", "unbound:fake"),
      /real session id/,
    );
    const bound = f.store.bindSession("ocd", "cursor-1", "chat-123", {
      model: "m",
    });
    assert.equal(bound.sessionId, "chat-123");
    assert.equal(bound.model, "m");
    assert.equal(
      f.store.bindSession("ocd", "cursor-1", "chat-123").sessionId,
      "chat-123",
    );
    assert.throws(
      () => f.store.bindSession("ocd", "cursor-1", "chat-999"),
      /already bound/,
    );
  } finally {
    f.done();
  }
});

test("tokens are project scoped", () => {
  const f = fixture();
  try {
    assert.equal(f.store.authenticate("ocd", f.a.token).handle, "claude-a");
    assert.equal(f.store.authenticate("other", f.a.token), null);
    assert.equal(f.store.authenticate("ocd", "not-a-token"), null);
  } finally {
    f.done();
  }
});

test("enqueue is not receipt; only the recipient acknowledges and completion needs evidence", () => {
  const f = fixture();
  try {
    const sent = f.store.send({
      project: "ocd",
      from: "claude-a",
      to: "codex-b",
      text: "read fixture",
      sourceSha: "f".repeat(40),
    });
    assert.equal(sent.state, "queued");
    assert.equal(sent.toSession, "t-codex-1");
    assert.throws(
      () => f.store.transition(sent.id, "acknowledged", "codex-b"),
      /Cannot move queued/,
    );
    f.store.transition(sent.id, "delivered", "_broker");
    assert.throws(
      () => f.store.transition(sent.id, "acknowledged", "claude-a"),
      /Only the recipient/,
    );
    f.store.transition(sent.id, "acknowledged", "codex-b");
    assert.throws(
      () => f.store.transition(sent.id, "completed", "codex-b", "  "),
      /requires evidence/,
    );
    f.store.transition(sent.id, "completed", "codex-b", "nonce=abc");
    assert.throws(
      () => f.store.transition(sent.id, "cancelled", "claude-a"),
      /already completed/,
    );
    assert.deepEqual(
      f.store.states(sent.id).map((s) => s.state),
      ["queued", "delivered", "acknowledged", "completed"],
    );
  } finally {
    f.done();
  }
});

test("duplicate sends with one idempotency key create one envelope", () => {
  const f = fixture();
  try {
    const one = f.store.send({
      project: "ocd",
      from: "claude-a",
      to: "codex-b",
      text: "x",
      idempotencyKey: "k1",
    });
    const two = f.store.send({
      project: "ocd",
      from: "claude-a",
      to: "codex-b",
      text: "x",
      idempotencyKey: "k1",
    });
    assert.equal(two.id, one.id);
    assert.equal(two.duplicate, true);
    assert.equal(f.store.inbox("ocd", "codex-b").length, 1);
  } finally {
    f.done();
  }
});

test("threads stop at the hop cap so replies cannot loop forever", () => {
  const f = fixture();
  try {
    let last = f.store.send({
      project: "ocd",
      from: "claude-a",
      to: "codex-b",
      text: "start",
    });
    const pair = ["claude-a", "codex-b"];
    for (let hop = 1; hop <= MAX_THREAD_HOPS; hop += 1) {
      last = f.store.send({
        project: "ocd",
        from: pair[hop % 2 === 1 ? 1 : 0],
        to: pair[hop % 2 === 1 ? 0 : 1],
        kind: "reply",
        text: `hop ${hop}`,
        replyTo: last.id,
      });
    }
    assert.throws(
      () =>
        f.store.send({
          project: "ocd",
          from: "claude-a",
          to: "codex-b",
          kind: "reply",
          text: "one too many",
          replyTo: last.id,
        }),
      /hop limit/,
    );
  } finally {
    f.done();
  }
});

test("unknown recipient, oversized text and bad SHA are refused", () => {
  const f = fixture();
  try {
    assert.throws(
      () =>
        f.store.send({ project: "ocd", from: "claude-a", to: "x", text: "a" }),
      /Unknown recipient/,
    );
    assert.throws(
      () =>
        f.store.send({
          project: "ocd",
          from: "claude-a",
          to: "codex-b",
          text: "a".repeat(9000),
        }),
      /too large/,
    );
    assert.throws(
      () =>
        f.store.send({
          project: "ocd",
          from: "claude-a",
          to: "codex-b",
          text: "a",
          sourceSha: "main",
        }),
      /40-character/,
    );
  } finally {
    f.done();
  }
});

test("host, origin and bearer parsing defend the loopback port", () => {
  assert.equal(requestAllowed({ host: "127.0.0.1:9" }, 9).ok, true);
  assert.equal(requestAllowed({ host: "evil.test:9" }, 9).reason, "bad-host");
  assert.equal(
    requestAllowed({ host: "127.0.0.1:9", origin: "http://evil.test" }, 9)
      .reason,
    "browser-origin",
  );
  assert.equal(
    requestAllowed({ host: "localhost:9", origin: "null" }, 9).ok,
    true,
  );
  assert.equal(bearerToken({ authorization: "Bearer short" }), null);
  assert.equal(
    bearerToken({ authorization: `Bearer ${"a".repeat(43)}` }),
    "a".repeat(43),
  );
});

test("MCP over HTTP: unauthorized and wrong-project callers fail; enrolled peers exchange and acknowledge", async () => {
  const f = fixture();
  const server = await startBrokerServer(f.store);
  try {
    const raw = await fetch(server.url("ocd"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(raw.status, 401);
    const wrong = await fetch(server.url("other"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${f.a.token}`,
      },
      body: "{}",
    });
    assert.equal(wrong.status, 401);

    const connect = async (token) => {
      const client = new Client({ name: "t", version: "0" });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(server.url("ocd")), {
          requestInit: { headers: { authorization: `Bearer ${token}` } },
        }),
      );
      return client;
    };
    const call = async (client, name, args) => {
      const result = await client.callTool({ name, arguments: args });
      return JSON.parse(result.content[0].text);
    };
    const claude = await connect(f.a.token);
    const codex = await connect(f.b.token);
    const me = await call(codex, "whoami", {});
    assert.equal(me.handle, "codex-b");
    const sent = await call(claude, "send", {
      to: "codex-b",
      text: "nonce 123",
    });
    assert.equal(sent.from, "claude-a", "sender comes from the token");
    const polled = await call(codex, "poll", { timeout_ms: 1000 });
    assert.equal(polled.messages.length, 1);
    assert.equal(polled.messages[0].state, "delivered");
    const acked = await call(codex, "ack", { message_id: sent.id });
    assert.equal(acked.state, "acknowledged");
    const spoof = await claude.callTool({
      name: "update",
      arguments: { message_id: sent.id, state: "completed", evidence: "x" },
    });
    assert.equal(spoof.isError, true);
    await claude.close();
    await codex.close();
  } finally {
    await server.close();
    f.done();
  }
});
