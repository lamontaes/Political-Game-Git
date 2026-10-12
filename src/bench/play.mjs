/* global document, fetch, URLSearchParams */
// The game screen on the new core: one scene, the player card, the menus.
// Words on screen are record data, engine text and control names only.
const $ = (id) => document.getElementById(id);
let me;
let packet;
let talk;
let openTab;
let busy = false;

async function api(path, method = "GET") {
  const response = await fetch(path, { method });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}
const post = (path) => api(path, "POST");
const dollars = (minor) =>
  (minor / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const clock = (at) =>
  `${new Date(`${at.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, ${String(Math.floor(at.minuteOfDay / 60)).padStart(2, "0")}:${String(at.minuteOfDay % 60).padStart(2, "0")}`;
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}
function row(label, value) {
  return el(
    "div",
    { className: "row" },
    el("b", { textContent: label }),
    String(value ?? ""),
  );
}
function show(id, on) {
  $(id).hidden = !on;
}

async function renderScene() {
  const scene = await api(`/api/scene?id=${encodeURIComponent(me.id)}`);
  $("backdrop").src = scene.backdrop.url;
  $("people").replaceChildren(
    ...scene.people.map((person) => {
      const f = person.figure;
      const bottom = f.clipBelowPercent ?? f.topPercent + f.heightPercent;
      const visible = Math.max(bottom - f.topPercent, 0.1);
      const img = el("img", { src: person.figureUrl, alt: person.name });
      img.style.height = `${(f.heightPercent / visible) * 100}%`;
      const box = el("div", { className: "figure", title: person.name }, img);
      Object.assign(box.style, {
        left: `${f.leftPercent}%`,
        top: `${f.topPercent}%`,
        width: `${f.widthPercent}%`,
        height: `${visible}%`,
        cursor: person.personId === me.id ? "default" : "pointer",
      });
      if (person.personId !== me.id)
        box.addEventListener("click", () => talkTo(person.personId));
      return box;
    }),
  );
  me.scene = scene;
}

async function renderCard() {
  const card = await api(`/api/card?id=${encodeURIComponent(me.id)}`);
  me.card = card;
  $("card-name").textContent = card.name;
  $("card-place").textContent = `${me.placeName} · ${card.age}`;
  $("card-clock").textContent = clock(
    packet?.at ?? { date: me.date, minuteOfDay: 0 },
  );
}

function renderPacket(value) {
  packet = value ?? packet;
  const open = packet && packet.kind !== "complete";
  for (const id of ["day", "week"]) $(id).disabled = busy || open;
  $("skip").disabled =
    !skipping && (busy || (open && packet.kind !== "choice"));
  show("continue", packet?.kind === "stop");
  show("choices", packet?.kind === "choice" && !talk);
  if (packet?.kind === "choice")
    $("choice-list").replaceChildren(
      ...packet.offers.map((offer) => {
        const target = me.names?.[offer.targetId] ?? "";
        const b = el("button", {
          type: "button",
          textContent: `${offer.actionId}${target ? ` · ${target}` : ""}`,
          title: `${offer.durationMinutes} min`,
        });
        b.addEventListener("click", () =>
          act(
            `/api/resume?${new URLSearchParams({ kind: "choice", pauseId: packet.pauseId, offerId: offer.offerId })}`,
          ),
        );
        return b;
      }),
    );
  if (packet) $("card-clock").textContent = clock(packet.at);
}

async function refresh() {
  await Promise.all([renderScene(), renderCard()]);
  if (openTab) await openSheet(openTab);
}

async function act(path) {
  if (busy) return;
  busy = true;
  renderPacket();
  try {
    const result = await post(path);
    me.names = { ...me.names, ...result.names };
    busy = false;
    renderPacket(result.packet);
    await refresh();
  } catch (error) {
    $("card-place").textContent = error.message;
  } finally {
    busy = false;
    renderPacket();
  }
}
for (const mode of ["day", "week"])
  $(mode).addEventListener("click", () => act(`/api/advance?mode=${mode}`));
// Until needed runs in week-long legs so the clock is seen moving; pressing
// it again stops after the current leg. A stop, choice or day's end that
// needs you ends it at once.
let skipping = false;
const SKIP_LEG_DAYS = 7;
const SKIP_MAX_LEGS = 52;
$("skip").addEventListener("click", async () => {
  if (skipping) {
    skipping = false;
    return;
  }
  skipping = true;
  $("skip").classList.add("active");
  try {
    for (let leg = 0; skipping && leg < SKIP_MAX_LEGS; leg++) {
      const result = await post(`/api/advance?mode=skip&days=${SKIP_LEG_DAYS}`);
      me.names = { ...me.names, ...result.names };
      renderPacket(result.packet);
      $("card-clock").textContent = clock(result.packet.at);
      if (result.packet.kind !== "complete") break;
      await renderScene();
    }
  } catch (error) {
    $("card-place").textContent = error.message;
  } finally {
    skipping = false;
    $("skip").classList.remove("active");
    renderPacket();
    await refresh();
  }
});
$("continue").addEventListener("click", () =>
  act(
    `/api/resume?${new URLSearchParams({ kind: "stop", pauseId: packet.pauseId })}`,
  ),
);

// ---- Conversation (lower third, scales in its upper right) ----
function renderTalk(value) {
  talk = value;
  show("talk", Boolean(value));
  show("choices", !value && packet?.kind === "choice");
  if (!value) return;
  $("talk-lines").replaceChildren(
    ...value.lines
      .slice(-6)
      .map((line) =>
        el(
          "li",
          { title: line.sourceRecordIds.join(", ") },
          el("b", { textContent: line.speaker }),
          line.text,
        ),
      ),
  );
  // A lower third: the first six choices the engine offers.
  $("talk-choices").replaceChildren(
    ...value.choices.slice(0, 6).map((choice) => {
      const b = el("button", { type: "button", textContent: choice.text });
      b.addEventListener("click", () => sayLine(choice.key));
      return b;
    }),
  );
  $("talk-lie").disabled = !value.lie;
  $("talk-lie").title = value.lie?.text ?? "Lie";
  $("talk-lie").firstElementChild.src = value.lie
    ? "/ui/kit12/scales-tipped.svg"
    : "/ui/kit12/scales-level.svg";
}
async function sayLine(key) {
  renderTalk(await post(`/api/talk/say?key=${encodeURIComponent(key)}`));
}
async function talkTo(otherId) {
  renderTalk(
    await post(`/api/talk/open?otherId=${encodeURIComponent(otherId)}`),
  );
}
$("talk-lie").addEventListener(
  "click",
  () => talk?.lie && sayLine(talk.lie.key),
);
$("talk-leave").addEventListener("click", async () => {
  await post("/api/talk/leave");
  renderTalk(undefined);
});

// ---- Menus ----
const sheets = {
  async people() {
    return [
      ...(me.scene?.people ?? [])
        .filter((p) => p.personId !== me.id)
        .map((p) => {
          const b = el("button", { type: "button", textContent: p.name });
          b.addEventListener("click", () => talkTo(p.personId));
          return b;
        }),
      ...me.card.ties.map((t) =>
        row(t.name, `${t.relation ?? t.kind} · ${t.lastContactDate}`),
      ),
    ];
  },
  async who() {
    const c = me.card;
    return [
      row("Born", c.birthDate),
      row(
        "Home",
        c.home?.members
          .map((m) => `${m.name}${m.relation ? ` (${m.relation})` : ""}`)
          .join(", "),
      ),
      row("Mood", c.affect?.mood?.toFixed(2)),
      row("Stress", c.affect?.stress?.toFixed(2)),
      ...c.drives.map((d) => row(d.kind, `${d.topic} · ${d.desiredChange}`)),
    ];
  },
  async money() {
    return [row("Cash", dollars(me.card.liquidMinor))];
  },
  async jobs() {
    const j = me.card.job;
    return j
      ? [
          row(j.title, j.employer),
          row("Pay", `${dollars(j.wageDailyMinor)} / day`),
          row("Hours", `${j.hoursDaily.toFixed(1)} / day`),
        ]
      : [];
  },
  async journal() {
    const chapters = await api(`/api/journal?id=${encodeURIComponent(me.id)}`);
    return chapters.map((c) =>
      el(
        "div",
        { className: "row narrative" },
        el("b", { textContent: c.title }),
        c.lines.map((l) => l.text).join(" "),
      ),
    );
  },
  async politics() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    const contests = v.contests
      .slice(0, 6)
      .map(({ contest, filingOffice, checks }) => {
        const unmet = checks.filter((c) => !c.met).map((c) => c.rule);
        const b = el("button", { type: "button", textContent: "File" });
        b.disabled = unmet.length > 0;
        b.addEventListener("click", async () => {
          await post(
            `/api/file?${new URLSearchParams({ contestId: contest.id, payFee: "true" })}`,
          );
          openSheet("politics");
        });
        return el(
          "div",
          { className: "row" },
          el("b", { textContent: contest.title }),
          `${filingOffice.filedWith} · ${contest.filingDeadline}${unmet.length ? ` · ${unmet.join(", ")}` : ""} `,
          b,
        );
      });
    const filings = v.filings.map((f) => {
      const b = el("button", {
        type: "button",
        textContent: "Request signatures",
      });
      b.addEventListener("click", async () => {
        await post(`/api/sign?${new URLSearchParams({ filingId: f.id })}`);
        openSheet("politics");
      });
      return el(
        "div",
        { className: "row" },
        el("b", { textContent: f.status }),
        `${f.filedWith} · ${f.signatureCount} `,
        b,
      );
    });
    return [
      ...v.seats
        .slice(0, 12)
        .map((s) =>
          row(
            s.title,
            s.holder
              ? `${s.holder.givenName} ${s.holder.familyName}${s.holder.party ? ` (${s.holder.party})` : ""}`
              : "",
          ),
        ),
      ...contests,
      ...filings,
    ];
  },
};
const titles = {
  people: "People",
  who: "Who you are",
  money: "Money and property",
  jobs: "Jobs and study",
  journal: "Journal",
  politics: "Politics",
};
async function openSheet(tab) {
  openTab = tab;
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === tab);
  $("sheet-title").textContent = titles[tab];
  $("sheet-body").replaceChildren(...(await sheets[tab]()));
  show("sheet", true);
}
for (const b of document.querySelectorAll("[data-tab]"))
  b.addEventListener("click", () =>
    openTab === b.dataset.tab ? closeSheet() : openSheet(b.dataset.tab),
  );
function closeSheet() {
  openTab = undefined;
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.remove("active");
  show("sheet", false);
}
$("sheet-close").addEventListener("click", closeSheet);

// ---- New life ----
api("/api/seed").then((value) => {
  $("seed").value = value.seed;
  $("date").value = value.date;
});
$("new-life").addEventListener("click", async () => {
  $("new-life").disabled = true;
  show("front-status", true);
  document.querySelector("#front .progress").hidden = false;
  try {
    const life = await post(
      `/api/newlife?${new URLSearchParams({ seed: $("seed").value, date: $("date").value })}`,
    );
    me = {
      id: life.personId,
      placeName: life.placeName,
      date: life.date,
      names: life.names,
    };
    show("front", false);
    for (const id of ["tabs", "stack", "card"]) show(id, true);
    renderPacket(life.packet);
    await refresh();
  } catch (error) {
    $("front-status").textContent = error.message;
    $("new-life").disabled = false;
  } finally {
    document.querySelector("#front .progress").hidden = true;
  }
});
