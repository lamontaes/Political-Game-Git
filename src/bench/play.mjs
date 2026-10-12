/* global document, fetch, URLSearchParams, setTimeout */
// The game screen on the new core: one scene, the player card, the menus.
// Words on screen are record data, engine text and control names only.
const $ = (id) => document.getElementById(id);
let me;
let packet;
let talk;
let openTab;
let busy = false;
let seenResults = 0;

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

function drawPeople(people) {
  $("people").replaceChildren(
    ...people.map((person) => {
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
      });
      return box;
    }),
  );
}

// The opening: each level of government over the player's town, then home.
const SHOT_MS = 4500;
let skipOpening;
async function playOpening() {
  const shots = await api(`/api/opening?id=${encodeURIComponent(me.id)}`);
  show("caption", true);
  for (const shot of shots) {
    $("backdrop").src = shot.backdrop.url;
    drawPeople(shot.people);
    $("stage").classList.remove("cut");
    void $("stage").offsetWidth;
    $("stage").classList.add("cut");
    const titles = [...new Set(shot.cast.map((c) => c.title).filter(Boolean))];
    $("caption-title").textContent = titles.join(" · ");
    $("caption-names").textContent = shot.cast.map((c) => c.name).join(" · ");
    const skipped = await new Promise((resolve) => {
      skipOpening = () => resolve(true);
      setTimeout(() => resolve(false), SHOT_MS);
    });
    if (skipped) break;
  }
  skipOpening = undefined;
  show("caption", false);
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && skipOpening) skipOpening();
});

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
  me.names = { ...me.names, [me.id]: card.name };
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
  // Election night: new results open their sheet.
  const races = await api(`/api/results?id=${encodeURIComponent(me.id)}`);
  if (races.length > seenResults) {
    seenResults = races.length;
    await openSheet("results");
    return;
  }
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
    const moment = storyStop(result.packet);
    if (moment) await showStory(moment.recordId);
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
      // Election day needs you: a skip ends when new results are in.
      const races = await api(`/api/results?id=${encodeURIComponent(me.id)}`);
      if (races.length > seenResults) break;
      await renderScene();
    }
  } catch (error) {
    $("card-place").textContent = error.message;
  } finally {
    skipping = false;
    $("skip").classList.remove("active");
    renderPacket();
    await refresh();
    const moment = storyStop(packet);
    if (moment) await showStory(moment.recordId);
  }
});
$("continue").addEventListener("click", () => {
  show("talk", false);
  return act(
    `/api/resume?${new URLSearchParams({ kind: "stop", pauseId: packet.pauseId })}`,
  );
});

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
  if (filing) {
    await post("/api/filing/leave");
    filing = undefined;
    show("talk", false);
    await refresh();
    renderPacket();
    return;
  }
  await post("/api/talk/leave");
  renderTalk(undefined);
});

// ---- The filing office (step 3), a visit in the clerk's words ----
let filing;
function renderFiling(value) {
  filing = value;
  if (!value) return;
  $("backdrop").src = value.backdrop.url;
  drawPeople(value.people);
  show("choices", false);
  show("talk", true);
  const clerkName = value.visit.clerkId
    ? value.names[value.visit.clerkId]
    : value.filedWith;
  $("talk-lines").replaceChildren(
    ...value.visit.lines.slice(-6).map((line) =>
      el(
        "li",
        { title: line.sourceRecordIds.join(", ") },
        el("b", {
          textContent:
            line.speaker === "clerk" ? clerkName : (me.card?.name ?? ""),
        }),
        line.text,
      ),
    ),
  );
  $("talk-choices").replaceChildren(
    ...value.visit.choices.slice(0, 6).map((choice) => {
      const b = el("button", { type: "button", textContent: choice.text });
      b.addEventListener("click", async () =>
        renderFiling(
          await post(
            `/api/filing/choose?key=${encodeURIComponent(choice.key)}`,
          ),
        ),
      );
      return b;
    }),
  );
  // The filing's record once it is made: its status and what it was paid.
  if (value.result)
    $("talk-lines").append(
      el(
        "li",
        {},
        el("b", { textContent: value.filedWith }),
        value.result.filing
          ? `${value.result.status} · ${value.result.filing.signatureCount} · ${dollars(value.result.filing.feePaidMinor)}`
          : `${value.result.status} · ${(value.result.unmet ?? []).map((u) => u.rule).join(", ")}`,
      ),
    );
  $("talk-lie").disabled = true;
}
async function openFiling(filedWith) {
  closeSheet();
  renderTalk(undefined);
  renderFiling(
    await post(`/api/filing/open?filedWith=${encodeURIComponent(filedWith)}`),
  );
}

// ---- Campaigning (step 4): each act answered by the people it reaches ----
let campaignResult = "";
async function campaignRows() {
  const v = await api(`/api/campaign?id=${encodeURIComponent(me.id)}`);
  const rows = [];
  for (const { filing, campaign, polls } of v.campaigns) {
    const act = async (kind, extra = {}) => {
      const result = await post(
        `/api/campaign/act?${new URLSearchParams({ filingId: filing.id, kind, ...extra })}`,
      );
      campaignResult =
        result.contacted !== undefined
          ? `${kind}: ${result.contacted} · ${Object.entries(result.answers)
              .map(([k, n]) => `${me.names?.[k] ?? k} ${n}`)
              .join(" · ")}`
          : result.reached !== undefined
            ? `${kind}: ${result.reached} · +${result.warmer} · −${result.cooler}`
            : `${kind}: ${result.answers.filter((a) => a.yes || a.givenMinor > 0).length} / ${result.answers.length}${result.answers.some((a) => a.givenMinor) ? ` · ${dollars(result.answers.reduce((t, a) => t + (a.givenMinor ?? 0), 0))}` : ""}`;
      openSheet("politics");
    };
    const question = el(
      "select",
      {},
      ...v.questions.map((q) =>
        el("option", { value: q, textContent: q.split(":").pop() }),
      ),
    );
    const side = el(
      "select",
      {},
      el("option", { value: "1", textContent: "For" }),
      el("option", { value: "-1", textContent: "Against" }),
    );
    const button = (label, kind, extra) => {
      const b = el("button", { type: "button", textContent: label });
      b.addEventListener("click", () =>
        act(kind, typeof extra === "function" ? extra() : extra),
      );
      return b;
    };
    rows.push(
      el(
        "div",
        { className: "row campaign" },
        el("b", {
          textContent: `${filing.status} · ${filing.contestId.split(":").slice(-3).join(" ")}`,
        }),
        `${dollars(campaign.raisedMinor)} raised · ${dollars(campaign.spentMinor)} spent · ${campaign.volunteers} volunteers · ${campaign.doors} doors`,
        el(
          "div",
          {},
          button("Knock doors", "doors", { hours: "2" }),
          button("Volunteers", "volunteer"),
          button("Donations", "donation"),
          button("Endorsements", "endorsement"),
          button("Ad", "ad", { amountMinor: "5000" }),
          button("Poll", "poll", { sampleSize: "50" }),
        ),
        el(
          "div",
          {},
          question,
          side,
          button("Speech", "speech", () => ({
            venue: me.scene?.place ?? "",
            statements: `${question.value}=${side.value}`,
          })),
        ),
        polls.length
          ? `Poll ${polls.at(-1).date}: ${polls.at(-1).contacted}`
          : "",
        campaignResult ? el("div", { textContent: campaignResult }) : "",
      ),
    );
  }
  return rows;
}

// ---- A big moment, staged when it stops the clock ----
async function showStory(momentId) {
  const story = await api(
    `/api/story?momentId=${encodeURIComponent(momentId)}`,
  );
  me.names = { ...me.names, ...story.names };
  $("backdrop").src = story.backdrop.url;
  drawPeople(story.people);
  show("choices", false);
  show("talk", true);
  $("talk-lines").replaceChildren(
    ...story.narration.map((line) =>
      el(
        "li",
        { className: "narration", title: line.sourceRecordIds.join(", ") },
        line.text,
      ),
    ),
  );
  $("talk-choices").replaceChildren(
    ...(story.talkToId
      ? [
          (() => {
            const b = el("button", {
              type: "button",
              textContent: `Talk · ${story.names[story.talkToId] ?? ""}`,
            });
            b.addEventListener("click", () => talkTo(story.talkToId));
            return b;
          })(),
        ]
      : []),
  );
  $("talk-lie").disabled = true;
}
function storyStop(value) {
  return value?.kind === "stop"
    ? value.stop.modules.find(
        (row) =>
          row.kind === "interrupt" && row.moduleId === "p13-story-director",
      )
    : undefined;
}

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
  async results() {
    const races = await api(`/api/results?id=${encodeURIComponent(me.id)}`);
    seenResults = races.length;
    const number = (n) => n.toLocaleString("en-US");
    return races.slice(0, 8).map((race) =>
      el(
        "div",
        { className: "row race" },
        el("b", { textContent: `${race.title} · ${race.date}` }),
        ...race.candidates.map((c) =>
          el("div", {
            className: c.name === race.winner ? "winner" : "",
            textContent: `${c.name}${c.party ? ` (${c.party})` : ""} · ${number(c.votes)}`,
          }),
        ),
        el("div", {
          textContent: `${race.namedTurnout} / ${race.namedEligible} · ${Object.entries(
            race.exitPoll,
          )
            .map(([k, n]) => `${k} ${n}`)
            .join(" · ")}`,
        }),
        race.ballot
          ? el("div", {
              className: "mine",
              textContent: race.ballot.voted
                ? `${me.card?.name ?? ""}: ${race.ballot.choice ?? ""}`
                : `${me.card?.name ?? ""}: —`,
            })
          : "",
      ),
    );
  },
  async calendar() {
    const { date, items } = await api(
      `/api/calendar?id=${encodeURIComponent(me.id)}`,
    );
    const byDate = new Map();
    for (const item of items)
      byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
    const months = [];
    const first = new Date(`${date.slice(0, 7)}-01T12:00:00`);
    for (let m = 0; m < 2; m++) {
      const start = new Date(first.getFullYear(), first.getMonth() + m, 1, 12);
      const grid = el(
        "div",
        { className: "month" },
        el("h3", {
          textContent: start.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        }),
      );
      for (const d of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
        grid.append(el("div", { className: "weekday", textContent: d }));
      for (let i = 0; i < start.getDay(); i++) grid.append(el("div"));
      for (let day = 1; ; day++) {
        const at = new Date(start.getFullYear(), start.getMonth(), day, 12);
        if (at.getMonth() !== start.getMonth()) break;
        const iso = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const cell = el(
          "div",
          { className: `day${iso === date ? " today" : ""}` },
          el("b", { textContent: String(day) }),
        );
        const kinds = new Map();
        for (const item of byDate.get(iso) ?? [])
          kinds.set(item.kind, [...(kinds.get(item.kind) ?? []), item.title]);
        for (const [kind, names] of kinds)
          cell.append(
            el("span", {
              className: "item",
              textContent:
                names.length > 2
                  ? `${kind} (${names.length})`
                  : `${kind}: ${names.join(", ")}`,
              title: names.join("\n"),
            }),
          );
        grid.append(cell);
      }
      months.push(grid);
    }
    const later = items.filter(
      (i) =>
        i.date >=
        new Date(first.getFullYear(), first.getMonth() + 2, 1, 12)
          .toISOString()
          .slice(0, 10),
    );
    return [
      ...months,
      ...later.slice(0, 8).map((i) => row(i.date, `${i.kind}: ${i.title}`)),
    ];
  },
  async news() {
    const e = await api(`/api/economy?id=${encodeURIComponent(me.id)}`);
    const pct = (value) => (value === undefined ? "" : `${value.toFixed(1)}%`);
    const economy = e.nation
      ? [
          row(
            `Nation · ${e.nation.month}`,
            `Unemployment ${pct(e.nation.unemploymentPct)} · Inflation ${pct(e.nation.inflationPct)} · Policy rate ${pct(e.nation.policyRatePct)} · Mortgage ${pct(e.nation.mortgage30Pct)}`,
          ),
          ...(e.region
            ? [
                row(
                  `Region · ${e.region.month ?? ""}`,
                  Object.entries(e.region)
                    .filter(([, v]) => typeof v === "number")
                    .slice(0, 4)
                    .map(([k, v]) => `${k} ${Number(v).toFixed(1)}`)
                    .join(" · "),
                ),
              ]
            : []),
          ...(e.jobs
            ? [
                row(
                  "Jobs here",
                  `${e.jobs.employed} employed · ${e.jobs.seekers} looking · ${e.jobs.openPositions} open`,
                ),
              ]
            : []),
        ]
      : [];
    const rows = await api("/api/news");
    return [
      ...economy,
      ...rows.slice(0, 30).map((r) =>
        row(
          `${r.date} · ${r.kind}`,
          Object.entries(r.facts)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · "),
        ),
      ),
    ];
  },
  async politics() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    const contests = v.contests
      // Contests you can enter first.
      .toSorted(
        (a, b) =>
          a.checks.filter((c) => !c.met).length -
          b.checks.filter((c) => !c.met).length,
      )
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
    const campaigns = await campaignRows();
    const offices = [
      ...new Set(v.contests.map((c) => c.filingOffice.filedWith)),
    ].map((filedWith) => {
      const b = el("button", { type: "button", textContent: filedWith });
      b.addEventListener("click", () => openFiling(filedWith));
      return b;
    });
    const results = (() => {
      const b = el("button", { type: "button", textContent: "Election night" });
      b.disabled = seenResults === 0;
      b.addEventListener("click", () => openSheet("results"));
      return b;
    })();
    return [
      results,
      ...campaigns,
      ...offices,
      ...contests,
      ...filings,
      ...v.seats
        .slice(0, 8)
        .map((s) =>
          row(
            s.title,
            s.holder
              ? `${s.holder.givenName} ${s.holder.familyName}${s.holder.party ? ` (${s.holder.party})` : ""}`
              : "",
          ),
        ),
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
  calendar: "Calendar",
  results: "Election night",
  news: "News",
};
async function openSheet(tab) {
  openTab = tab;
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === tab);
  $("sheet-title").textContent = titles[tab];
  $("sheet").classList.toggle("wide", tab === "calendar" || tab === "results");
  const body = await sheets[tab]();
  // A slower, earlier request must not reopen a sheet closed meanwhile.
  if (openTab !== tab) return;
  $("sheet-body").replaceChildren(...body);
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
    await playOpening();
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
