import assert from "node:assert/strict";
import test from "node:test";

import {
  CONNECTION_STATES,
  capabilityLine,
  connectionState,
  nextAction,
  providerActions,
} from "../private-controller/agents-view.mjs";

const external = (overrides) => ({
  handle: "claude-1",
  provider: "claude",
  sessionId: "unbound:claude:1234",
  capability: "messaging; manual attention (no verified wake path)",
  managed: false,
  lastSeen: null,
  liveness: "unknown",
  revoked: false,
  ...overrides,
});

test("an enrollment alone is waiting, never connected", () => {
  assert.equal(connectionState(external()), "waiting");
  assert.equal(
    connectionState(external({ sessionId: "abc", lastSeen: null })),
    "waiting",
  );
  // A call without a bound session is still waiting for the binding.
  assert.equal(
    connectionState(
      external({ lastSeen: "2026-09-17T00:00:00Z", liveness: "fresh" }),
    ),
    "waiting",
  );
  assert.equal(nextAction("waiting").label, "Test connection");
});

test("connected needs a bound session and a received call", () => {
  const bound = external({
    sessionId: "session-uuid",
    lastSeen: "2026-09-17T00:00:00Z",
  });
  assert.equal(connectionState({ ...bound, liveness: "fresh" }), "connected");
  assert.equal(connectionState({ ...bound, liveness: "stale" }), "quiet");
  assert.equal(CONNECTION_STATES.connected, "Connected");
});

test("managed workers are running, idle or stopped", () => {
  const managed = external({ managed: true, attached: true, handle: "w" });
  assert.equal(connectionState(managed, { runningHandles: ["w"] }), "running");
  assert.equal(connectionState(managed), "idle");
  assert.equal(connectionState({ ...managed, attached: false }), "stopped");
  assert.equal(
    nextAction("stopped", { ...managed, attached: false }).label,
    "Start managed Claude worker",
  );
  assert.equal(connectionState(null), "not-connected");
  assert.equal(connectionState(external({ revoked: true })), "revoked");
});

test("external sessions are messages only; no fake start buttons", () => {
  assert.equal(
    capabilityLine(external()),
    "Messages only · manual start required",
  );
  assert.deepEqual(providerActions("cursor"), {
    connect: "Connect Cursor (copy hub entry)",
    start: null,
  });
  assert.equal(
    providerActions("claude").connect,
    "Connect existing Claude session",
  );
  assert.equal(
    nextAction("stopped", external({ managed: false })).action,
    "none",
  );
});
