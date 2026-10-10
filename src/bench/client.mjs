/* global document, fetch, URLSearchParams */
const element = (id) => document.getElementById(id);
const status = element("status");
let residents = [];
let visibleCount = 100; // Engineering page size, not simulation calibration.
let inspectionRequest = 0;

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
      element("trace-status").textContent =
        `Record ${traceId}: saved-trace resolver pending. The raw record is shown below.`;
      element("trace-detail").replaceChildren(
        recordDetails(`Raw record: ${traceId}`, record),
      );
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

function renderChoices(value) {
  element("chosen-resident").textContent =
    `Resident: ${value.person.givenName} ${value.person.familyName} (${value.person.id}). Current offers are previews; no unanswered choice is active.`;
  element("choice-options").replaceChildren();
  for (const offer of value.offers) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "offered-choice";
    input.value = `${offer.definition.id}:${offer.targetId}`;
    label.append(
      input,
      document.createTextNode(
        `${input.value}; duration: ${offer.effortHours ?? "not provided"} hours`,
      ),
    );
    const line = document.createElement("div");
    line.append(label);
    element("choice-options").append(line);
  }
}

async function inspect(id) {
  const requestId = ++inspectionRequest;
  try {
    const value = await request(`/api/resident?id=${encodeURIComponent(id)}`);
    if (requestId !== inspectionRequest) return;
    renderChoices(value);
    element("trace-detail").replaceChildren();
    element("trace-record-id").value = "";
    element("trace-status").textContent =
      "Saved-trace resolver pending; raw records remain inspectable.";
    element("detail").replaceChildren(
      recordDetails(`Person: ${value.person.id}`, value.person),
      recordDetails(`Household: ${value.person.householdId}`, value.household),
    );
    if (value.job)
      element("detail").append(
        recordDetails(`Job: ${value.job.id}`, value.job),
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
    });
    const value = await request(`/api/build?${query}`, { method: "POST" });
    residents = value.residents;
    ++inspectionRequest;
    visibleCount = 100;
    element("detail").replaceChildren();
    element("choice-options").replaceChildren();
    element("chosen-resident").textContent =
      "Choose a resident to inspect current offers.";
    element("trace-detail").replaceChildren();
    element("trace-record-id").value = "";
    element("trace-status").textContent =
      "Saved-trace resolver pending; raw records remain inspectable.";
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
      `${value.contract}: ${value.status}. Missing exports: ${missing.join(", ") || "none"}. Source: #3918.`;
  })
  .catch((error) => {
    element("api-status").textContent = error.message;
  });
