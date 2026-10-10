/* global document, fetch, URLSearchParams */
const element = (id) => document.getElementById(id);
const status = element("status");
let residents = [];
let visibleCount = 100; // Engineering page size, not simulation calibration.

async function request(path, options) {
  const response = await fetch(path, options);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

function recordDetails(label, record) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = label;
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(record, null, 2);
  details.append(summary, pre);
  return details;
}

async function inspect(id) {
  try {
    const value = await request(`/api/resident?id=${encodeURIComponent(id)}`);
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
        recordDetails(`Saved core record: ${record.id}`, record),
      );
    if (value.director) {
      for (const moment of value.director.moments)
        element("detail").append(
          recordDetails(`Saved director moment: ${moment.id}`, moment),
        );
      element("detail").append(
        recordDetails("Director ledger", value.director),
      );
    }
    status.textContent = `Core date: ${value.date}. Read-only inspection.`;
  } catch (error) {
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
    visibleCount = 100;
    element("detail").replaceChildren();
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
