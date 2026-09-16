/* global document, window, setTimeout */

const hub = window.ocdHub;
const api = hub.agents;
const $ = (id) => document.getElementById(id);
let snapshot = null;
let refreshTimer = null;

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function kv(pairs) {
  const dl = el("dl", null, "kv");
  for (const [k, v] of pairs) {
    if (v === undefined || v === null || v === "") continue;
    dl.append(
      el("dt", k),
      el("dd", typeof v === "string" ? v : JSON.stringify(v)),
    );
  }
  return dl;
}

function renderProviders(detection) {
  if (!detection) {
    $("providers").replaceChildren(
      el(
        "p",
        "Not checked yet. Checking reads versions, sign-in state and allowances only.",
        "muted",
      ),
    );
    return;
  }
  $("detect-note").textContent =
    `Checked ${new Date(detection.checkedAt).toLocaleTimeString()}`;
  $("providers").replaceChildren(
    ...detection.providers.map((p) => {
      const card = el("section", null, "card");
      const head = el("div", null, "row");
      head.append(
        el("h2", p.provider),
        el("strong", p.status, `state-${p.status}`),
      );
      card.append(head);
      const usage =
        p.usage && typeof p.usage === "object"
          ? `${p.usage.usedPercent}% of ${Math.round(p.usage.windowMinutes / 1440)}-day window · resets ${p.usage.resetsAt ?? "unknown"} · credits ${p.usage.credits}`
          : p.usage;
      card.append(
        kv([
          ["Version", p.version],
          ["Auth", p.authRoute],
          ["Usage", usage],
          ["Messaging", p.capabilities?.messaging],
          ["Delivery", p.capabilities?.automaticDelivery],
          ["Wake", p.capabilities?.wake],
          ["Read", p.capabilities?.read],
          ["Write", p.capabilities?.write],
        ]),
      );
      if (p.detail) card.append(el("p", p.detail, "muted"));
      if (
        p.installed &&
        ["claude", "codex", "cursor", "antigravity"].includes(p.provider)
      ) {
        const connect = el(
          "button",
          ["cursor", "antigravity"].includes(p.provider)
            ? "Connect (copy hub entry)"
            : "Create hub enrollment",
        );
        connect.addEventListener("click", () => connectClient(p.provider));
        card.append(connect);
      }
      return card;
    }),
  );
  const codex = detection.providers.find((p) => p.provider === "codex");
  if (codex?.models?.length) {
    const model = $("codex-model");
    const chosen = model.value || "gpt-5.6-sol";
    model.replaceChildren(
      ...codex.models.map((m) =>
        Object.assign(el("option", m.id), { value: m.id }),
      ),
    );
    model.value = codex.models.some((m) => m.id === chosen)
      ? chosen
      : codex.models[0].id;
    renderEfforts();
  }
}

function renderEfforts() {
  const codex = snapshot?.detection?.providers.find(
    (p) => p.provider === "codex",
  );
  const model = codex?.models?.find((m) => m.id === $("codex-model").value);
  const effort = $("codex-effort");
  const chosen = effort.value || "low";
  effort.replaceChildren(
    ...(model?.efforts ?? []).map((e) =>
      Object.assign(el("option", e), { value: e }),
    ),
  );
  if ((model?.efforts ?? []).includes(chosen)) effort.value = chosen;
}

function renderParticipants(list) {
  $("participants").replaceChildren(
    ...list.map((p) => {
      const tr = el("tr");
      tr.append(
        el(
          "td",
          `@${p.handle}${p.managed ? (p.attached ? " (hub-managed)" : " (hub-managed, stopped)") : ""}`,
        ),
        el("td", p.provider),
        el("td", p.sessionId, "mono"),
        el("td", [p.model, p.effort].filter(Boolean).join(" · ") || "unknown"),
        el("td", `${p.authRoute ?? "unknown"} · ${p.capability}`),
        el(
          "td",
          p.liveness,
          `state-${p.liveness === "fresh" ? "ready" : "manual-attention"}`,
        ),
      );
      return tr;
    }),
  );
  const to = $("send-to");
  const current = to.value;
  to.replaceChildren(
    ...list
      .filter((p) => p.handle !== "owner")
      .map((p) =>
        Object.assign(el("option", `@${p.handle}`), { value: p.handle }),
      ),
  );
  if ([...to.options].some((o) => o.value === current)) to.value = current;
}

function renderEnvelopes(list) {
  $("envelopes").replaceChildren(
    ...list.map((e) => {
      const tr = el("tr");
      const history = el("td");
      for (const step of e.ledger) {
        const line = el(
          "div",
          `${step.state} · ${step.actor}${step.evidence ? ` · ${step.evidence}` : ""}`,
          `state-${step.state}`,
        );
        line.title = step.at;
        history.append(line);
      }
      const actions = el("td");
      if (!["completed", "blocked", "cancelled"].includes(e.state)) {
        const cancel = el("button", "Cancel");
        cancel.addEventListener("click", () => api.cancel(e.id));
        actions.append(cancel);
      }
      const message = el("td", e.text);
      if (e.sourceSha)
        message.append(
          el(
            "div",
            `source ${e.sourceSha.slice(0, 12)}${e.branch ? ` · ${e.branch}` : ""}`,
            "muted mono",
          ),
        );
      tr.append(
        el("td", new Date(e.createdAt).toLocaleTimeString()),
        el("td", `@${e.from} → @${e.to}`),
        el("td", `${e.kind} · hop ${e.hop}`),
        message,
        history,
        actions,
      );
      return tr;
    }),
  );
}

async function refresh() {
  snapshot = await api.snapshot();
  if (!snapshot?.ready) {
    $("broker").textContent = "Agent broker is not running.";
    return;
  }
  $("broker").textContent =
    `Broker ${snapshot.url} · ${snapshot.supervisor?.running.length ?? 0} running · ${snapshot.supervisor?.queued.length ?? 0} queued`;
  renderProviders(snapshot.detection);
  renderParticipants(snapshot.participants);
  renderEnvelopes(snapshot.envelopes);
}

function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refresh();
  }, 150);
}

const say = (text) => ($("people-note").textContent = text ?? "");

const CONFIG_FILES = {
  cursor: "~/.cursor/mcp.json",
  antigravity: "~/.gemini/config/mcp_config.json",
};

async function connectClient(provider) {
  const result = await api.connect(provider);
  if (!result?.handle) return say(result?.message);
  $("enroll-out").hidden = false;
  $("enroll-out").textContent = result.clipboard
    ? [
        `@${result.handle} is enrolled. Its hub entry is on your clipboard.`,
        `1. Paste it inside "mcpServers" in ${CONFIG_FILES[provider]} (create the file with {"mcpServers": {}} if it is missing), then reload ${provider}.`,
        "2. In a new chat there, ask once:",
        `   ${result.firstPrompt}`,
        "The connection test passes when that chat's first call arrives (liveness turns fresh).",
      ].join("\n")
    : [
        `@${result.handle} is enrolled. Token file (private): ${result.tokenFile}`,
        `Room URL: ${result.url}`,
        `Add it: ${result.snippets?.[provider] ?? ""}`,
        "Then, in that session, ask once:",
        `   ${result.firstPrompt}`,
      ].join("\n");
}

$("detect").addEventListener("click", async () => {
  $("detect-note").textContent = "Checking…";
  await api.detect();
  await refresh();
});
$("codex-model").addEventListener("change", renderEfforts);
$("start-codex").addEventListener("click", async () => {
  say("Starting a hub-managed Codex thread…");
  const result = await api.startCodex({
    handle: $("codex-handle").value.trim(),
    model: $("codex-model").value,
    effort: $("codex-effort").value,
  });
  say(
    result?.threadId
      ? `Started @${result.handle} on thread ${result.threadId}.`
      : result?.message,
  );
});
$("start-claude").addEventListener("click", async () => {
  say("Starting a hub-managed Claude session…");
  const result = await api.startClaude({
    handle: $("claude-handle").value.trim(),
    model: $("claude-model").value,
    effort: $("claude-effort").value,
  });
  say(
    result?.sessionId
      ? `Started @${result.handle} with session ${result.sessionId}.`
      : result?.message,
  );
});
$("enroll").addEventListener("click", async () => {
  const result = await api.enroll({
    handle: $("ext-handle").value.trim(),
    provider: $("ext-provider").value,
    sessionId: $("ext-session").value.trim(),
  });
  if (!result?.tokenFile) return say(result?.message);
  $("enroll-out").hidden = false;
  $("enroll-out").textContent = [
    `Enrolled @${result.handle}. Token file (private): ${result.tokenFile}`,
    `Room URL: ${result.url}`,
    "",
    ...Object.entries(result.snippets).map(([k, v]) => `# ${k}\n${v}\n`),
  ].join("\n");
  say(
    "The connection test passes when that session makes its first authenticated call (liveness turns fresh).",
  );
});
$("send").addEventListener("click", async () => {
  const text = $("send-text").value.trim();
  if (!text) return;
  const result = await api.send({ to: $("send-to").value, text });
  if (result?.id) $("send-text").value = "";
  else say(result?.message);
});
$("stop-all").addEventListener("click", async () =>
  say((await api.stopAll())?.message),
);

hub.onState(scheduleRefresh);
// One read-only connection check when the page first loads: versions,
// sign-in state and allowances only; no model turn is started.
void refresh().then(async () => {
  if (snapshot?.ready && !snapshot.detection) {
    $("detect-note").textContent = "Checking…";
    await api.detect();
    await refresh();
  }
});
