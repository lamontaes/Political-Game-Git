/* global document, fetch, URLSearchParams */
const element = (id) => document.getElementById(id);
const status = element("status");
let residents = [];
let visibleCount = 100; // Engineering page size, not simulation calibration.
let inspectionRequest = 0;
let selectedId;
let playingId;
let packet;
let busy = false;
const missingScores = new Set();

async function request(path, options) {
  const response = await fetch(path, options);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

function recordDetails(label, record, traceId) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = label;
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(record, null, 2);
  details.append(summary, pre);
  if (traceId) {
    const select = document.createElement("button");
    select.type = "button";
    select.textContent = "Select trace record";
    select.addEventListener("click", () => {
      element("trace-record-id").value = traceId;
      resolveTrace(traceId).catch((error) => {
        element("trace-status").textContent = error.message;
      });
    });
    details.append(select);
  }
  return details;
}

function renderProgress(progress) {
  element("golden-path").dataset.placeId = progress.placeId;
  element("golden-path").replaceChildren();
  element("world-pieces").replaceChildren();
  for (const row of progress.steps) {
    const tr = document.createElement("tr");
    tr.dataset.step = row.step;
    for (const text of [`${row.step}. ${row.label}`, row.status]) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    const evidence = document.createElement("td");
    if (row.evidence) {
      const inspectRoute = document.createElement("button");
      inspectRoute.type = "button";
      inspectRoute.textContent = `Inspect resident ${row.evidence.personId}`;
      inspectRoute.addEventListener("click", () =>
        inspect(row.evidence.personId),
      );
      evidence.append(
        inspectRoute,
        recordDetails("Reachability records", row.evidence),
      );
    } else evidence.textContent = row.missingModule;
    tr.append(evidence);
    element("golden-path").append(tr);
  }
  for (const row of progress.world) {
    const tr = document.createElement("tr");
    for (const text of [row.label, row.status, row.missingModule]) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    element("world-pieces").append(tr);
  }
  element("path-basis").textContent =
    `Core date: ${progress.date}; place: ${progress.placeId}. ${progress.basis}`;
  element("world-status").textContent =
    `World running: ${progress.worldRunning}. Installed modules: ${progress.installedModules.join(", ")}.`;
  element("furthest-step").textContent =
    `Furthest reached step: ${progress.furthestReachedStep ?? "none demonstrated"}.`;
}

function renderPacket(value) {
  packet = value;
  element("choice-options").replaceChildren();
  element("choices").disabled = !value || value.kind !== "choice";
  element("resume-stop").disabled = !value || value.kind !== "stop";
  if (!value) {
    element("clock-detail").textContent = "";
    element("stop-status").textContent =
      "No outstanding player pause. The first frontier is midnight after the opening date.";
    return;
  }
  element("stop-status").textContent =
    `Clock: ${value.at.date}, minute ${value.at.minuteOfDay}. ${value.kind === "choice" ? `Awaiting ${value.choiceKind} choice` : value.kind === "stop" ? `Stopped: ${value.stop.work ? "fixed commitment" : ""}${value.stop.modules.map((row) => (row.kind === "interrupt" ? "director moment at or over 0.50" : "deadline offer (owner must release)")).join(", ")}` : "Destination reached"}.`;
  if (value.kind === "choice") {
    for (const offer of value.offers) {
      const line = document.createElement("div");
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "offered-choice";
      input.value = offer.offerId;
      label.append(
        input,
        document.createTextNode(
          `${offer.actionId}:${offer.targetId}; duration: ${offer.durationMinutes} minutes`,
        ),
      );
      line.append(
        label,
        recordDetails("Issued score and duration evidence", offer),
      );
      element("choice-options").append(line);
    }
  }
  element("clock-detail").textContent = JSON.stringify(value, null, 2);
  setTimeControls();
}

async function resolveTrace(id) {
  const value = await request(`/api/trace?id=${encodeURIComponent(id)}`);
  const saved = ["saved", "no-saved-reason", "saved-director-record"].includes(
    value.status,
  );
  if (saved && value.scoresStatus === "none-saved") missingScores.add(id);
  element("trace-status").textContent =
    `Record ${id}: ${value.status}. ${!saved ? "No unambiguous saved record." : value.scoresStatus === "none-saved" ? "No scores saved yet." : "Saved scores available."}`;
  element("trace-detail").replaceChildren(
    recordDetails(`Saved explanation: ${id}`, value),
  );
  element("missing-scores").textContent = [...missingScores].join("\n");
}

function setTimeControls() {
  const open = packet && packet.kind !== "complete";
  for (const control of ["day", "week", "calendar", "calendar-go"])
    element(control).disabled = !playingId || open;
  // Skip may start from an open choice: the character answers it itself.
  element("skip").disabled = !playingId || (open && packet.kind !== "choice");
}

function renderSelfChosen(rows) {
  if (!rows?.length) return;
  element("self-chosen").textContent = rows
    .map(
      (row) =>
        `${row.at.date} minute ${row.at.minuteOfDay}: ${row.actionId}:${row.targetId} (${row.why})`,
    )
    .join("\n");
}

async function renderScene(id) {
  const scene = await request(`/api/scene?id=${encodeURIComponent(id)}`);
  const box = element("scene");
  const backdrop = document.createElement("img");
  backdrop.className = "backdrop";
  backdrop.src = scene.backdrop.url;
  backdrop.alt = scene.place;
  const figures = scene.people.map((person) => {
    const f = person.figure;
    const bottom = f.clipBelowPercent ?? f.topPercent + f.heightPercent;
    const visible = Math.max(bottom - f.topPercent, 0.1);
    const div = document.createElement("div");
    div.className = "figure";
    div.title = person.name;
    Object.assign(div.style, {
      left: `${f.leftPercent}%`,
      top: `${f.topPercent}%`,
      width: `${f.widthPercent}%`,
      height: `${visible}%`,
    });
    const img = document.createElement("img");
    img.src = person.figureUrl;
    img.alt = person.name;
    img.style.height = `${(f.heightPercent / visible) * 100}%`;
    img.style.width = "100%";
    div.append(img);
    return div;
  });
  box.replaceChildren(backdrop, ...figures);
  element("scene-caption").textContent =
    `${scene.place} (${scene.backdrop.variant}): ${scene.why}. ${scene.people.map((p) => p.name).join(", ")}${scene.unplaced.length ? `; ${scene.unplaced.length} more not drawn (${[...new Set(scene.unplaced.map((u) => u.reason))].join(", ")})` : ""}.`;
}

function renderChoices(value) {
  element("chosen-resident").textContent =
    `${value.playing ? "Playing" : "Viewing"}: ${value.person.givenName} ${value.person.familyName} (${value.person.id}).`;
  element("play").disabled = value.playing || !value.person.alive;
  if (value.playing) renderPacket(value.packet);
}

async function inspect(id) {
  const requestId = ++inspectionRequest;
  try {
    const value = await request(`/api/resident?id=${encodeURIComponent(id)}`);
    if (requestId !== inspectionRequest) return;
    selectedId = id;
    renderChoices(value);
    renderScene(id).catch((error) => {
      element("scene-caption").textContent = error.message;
    });
    setTimeControls();
    element("trace-detail").replaceChildren();
    element("trace-record-id").value = "";
    element("trace-status").textContent =
      "Select a saved record to read its explanation.";
    element("detail").replaceChildren(
      recordDetails(
        `Person: ${value.person.id}`,
        value.person,
        value.person.id,
      ),
      recordDetails(
        `Household: ${value.person.householdId}`,
        value.household,
        value.person.householdId,
      ),
    );
    if (value.job)
      element("detail").append(
        recordDetails(`Job: ${value.job.id}`, value.job, value.job.id),
      );
    for (const offer of value.offers)
      element("detail").append(
        recordDetails(`Offer: ${offer.definition.id}:${offer.targetId}`, offer),
      );
    for (const record of value.records)
      element("detail").append(
        recordDetails(`Saved core record: ${record.id}`, record, record.id),
      );
    for (const record of value.relationships)
      element("detail").append(
        recordDetails(`Relationship snapshot: ${record.id}`, record, record.id),
      );
    for (const record of value.payments)
      element("detail").append(
        recordDetails(`Saved payment: ${record.id}`, record, record.id),
      );
    if (value.director) {
      for (const moment of value.director.moments)
        element("detail").append(
          recordDetails(
            `Saved director moment: ${moment.id}`,
            moment,
            moment.id,
          ),
        );
      element("detail").append(
        recordDetails("Director ledger", value.director),
      );
    }
    status.textContent = `Core date: ${value.date}. Read-only inspection.`;
  } catch (error) {
    if (requestId !== inspectionRequest) return;
    status.textContent = error.message;
  }
}

function renderResidents() {
  const query = element("search").value.toLocaleLowerCase("en-US");
  const matches = residents.filter((row) =>
    `${row.name} ${row.id}`.toLocaleLowerCase("en-US").includes(query),
  );
  element("residents").replaceChildren();
  for (const row of matches.slice(0, visibleCount)) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = row.name;
    button.addEventListener("click", () => inspect(row.id));
    name.append(button);
    tr.append(name);
    for (const value of [row.age, row.householdId, row.jobId]) {
      const td = document.createElement("td");
      td.textContent = value === undefined ? "—" : String(value);
      tr.append(td);
    }
    element("residents").append(tr);
  }
  element("more").hidden = matches.length <= visibleCount;
}

element("search").addEventListener("input", () => {
  visibleCount = 100;
  renderResidents();
});
element("more").addEventListener("click", () => {
  visibleCount += 100;
  renderResidents();
});

async function newSeed() {
  const value = await request("/api/seed");
  element("seed").value = value.seed;
  element("date").value = value.date;
}

element("random").addEventListener("click", () =>
  newSeed().catch((error) => {
    status.textContent = error.message;
  }),
);
element("opening").addEventListener("submit", async (event) => {
  event.preventDefault();
  element("build").disabled = true;
  status.textContent = "Generating opening records…";
  try {
    const query = new URLSearchParams({
      seed: element("seed").value,
      date: element("date").value,
      size: element("size").value,
    });
    const value = await request(`/api/build?${query}`, { method: "POST" });
    residents = value.residents;
    ++inspectionRequest;
    selectedId = undefined;
    playingId = undefined;
    packet = undefined;
    element("play").disabled = true;
    element("self-chosen").textContent = "";
    missingScores.clear();
    element("missing-scores").textContent = "";
    for (const control of ["day", "week", "calendar", "calendar-go", "skip"])
      element(control).disabled = true;
    element("choices").disabled = true;
    element("resume-stop").disabled = true;
    visibleCount = 100;
    element("detail").replaceChildren();
    element("choice-options").replaceChildren();
    element("chosen-resident").textContent =
      "Choose a living resident to play.";
    element("trace-detail").replaceChildren();
    element("trace-record-id").value = "";
    element("trace-status").textContent =
      "Select a saved record to read its explanation.";
    renderProgress(value.progress);
    element("calendar").value = value.date;
    element("stop-status").textContent =
      `Core date: ${value.date}. No time has advanced.`;
    const provenance = { ...value };
    delete provenance.residents;
    element("provenance").textContent = JSON.stringify(provenance, null, 2);
    renderResidents();
    status.textContent = `${residents.length} residents. Core date: ${value.date}.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    element("build").disabled = false;
  }
});
newSeed().catch((error) => {
  status.textContent = error.message;
});
request("/api/capabilities")
  .then((value) => {
    const missing = Object.entries(value.implementation)
      .filter(([, present]) => !present)
      .map(([name]) => name);
    element("api-status").textContent =
      `${value.contract}: ${value.status}. Missing exports: ${missing.join(", ") || "none"}. Source: src/core2/player-v1.md.`;
  })
  .catch((error) => {
    element("api-status").textContent = error.message;
  });

async function clockRequest(path, query) {
  if (busy) return;
  busy = true;
  try {
    const result = await request(`${path}?${new URLSearchParams(query)}`, {
      method: "POST",
    });
    renderPacket(result.packet);
    renderSelfChosen(result.selfChosen);
    renderProgress(result.progress);
    if (selectedId) await inspect(selectedId);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
  }
}
element("play").addEventListener("click", async () => {
  if (!selectedId || busy) return;
  busy = true;
  try {
    const value = await request(
      `/api/play?id=${encodeURIComponent(selectedId)}`,
      { method: "POST" },
    );
    playingId = value.personId;
    renderPacket(value.packet);
    renderSelfChosen(value.selfChosen);
    await inspect(selectedId);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
  }
});
for (const mode of ["day", "week", "skip"])
  element(mode).addEventListener("click", () =>
    clockRequest("/api/advance", { mode }),
  );
element("calendar-go").addEventListener("click", () =>
  clockRequest("/api/advance", {
    mode: "calendar",
    date: element("calendar").value,
  }),
);
element("submit-choice").addEventListener("click", () => {
  const choice = document.querySelector('input[name="offered-choice"]:checked');
  if (!choice || packet?.kind !== "choice") {
    status.textContent = "Select an issued offer first.";
    return;
  }
  clockRequest("/api/resume", {
    kind: "choice",
    pauseId: packet.pauseId,
    offerId: choice.value,
  });
});
element("resume-stop").addEventListener("click", () => {
  if (packet?.kind === "stop")
    clockRequest("/api/resume", { kind: "stop", pauseId: packet.pauseId });
});
element("resolve-trace").addEventListener("click", () =>
  resolveTrace(element("trace-record-id").value).catch((error) => {
    element("trace-status").textContent = error.message;
  }),
);
