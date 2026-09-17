/**
 * What the Agents tab says about each connection (CRUNCH46 H7). Pure.
 *
 * A participant is only "Connected" when an exact session is bound and a call
 * from it has actually arrived. Creating an enrollment is not a connection,
 * and a provider without a supported wake path never gets a Start button.
 */

const UNBOUND = /^unbound:/;

export const CONNECTION_STATES = {
  "not-connected": "Not connected",
  waiting: "Waiting for session",
  connected: "Connected",
  quiet: "Connected earlier — not responding now",
  running: "Running",
  idle: "Idle",
  stopped: "Stopped",
  revoked: "Removed",
};

export function connectionState(participant, { runningHandles = [] } = {}) {
  if (!participant) return "not-connected";
  if (participant.revoked) return "revoked";
  if (participant.managed) {
    if (!participant.attached) return "stopped";
    return runningHandles.includes(participant.handle) ? "running" : "idle";
  }
  const bound =
    typeof participant.sessionId === "string" &&
    participant.sessionId.length > 0 &&
    !UNBOUND.test(participant.sessionId);
  if (!bound || !participant.lastSeen) return "waiting";
  return participant.liveness === "fresh" ? "connected" : "quiet";
}

/** The one thing to do next for a connection in this state. */
export function nextAction(state, participant) {
  switch (state) {
    case "waiting":
      return {
        action: "test",
        label: "Test connection",
        hint: "Paste the entry into that app, ask its chat the first prompt, then test.",
      };
    case "quiet":
      return {
        action: "test",
        label: "Test connection",
        hint: "Open that session and ask it to poll the hub once.",
      };
    case "connected":
    case "idle":
    case "running":
      return { action: "send", label: "Send a message", hint: null };
    case "stopped":
      return participant?.managed
        ? {
            action: "start",
            label: `Start managed ${providerName(participant.provider)} worker`,
            hint: null,
          }
        : { action: "none", label: null, hint: null };
    default:
      return {
        action: "connect",
        label: "Connect",
        hint: null,
      };
  }
}

export function providerName(provider) {
  return (
    {
      claude: "Claude",
      codex: "Codex",
      cursor: "Cursor",
      antigravity: "Antigravity",
    }[provider] ?? String(provider ?? "agent")
  );
}

/** Honest capability line: messages only unless a wake path is verified. */
export function capabilityLine(participant) {
  if (participant?.managed)
    return "Hub-managed worker · can be started and stopped here";
  const text = String(participant?.capability ?? "");
  if (/manual attention|no verified wake/i.test(text))
    return "Messages only · manual start required";
  return text || "Messages only";
}

/** Button text for a provider card on this Mac. */
export function providerActions(provider) {
  const name = providerName(provider);
  if (provider === "cursor" || provider === "antigravity")
    return { connect: `Connect ${name} (copy hub entry)`, start: null };
  return {
    connect: `Connect existing ${name} session`,
    start: `Start managed ${name} worker`,
  };
}
