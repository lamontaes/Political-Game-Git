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
  $("game").classList.add("letterbox");
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
  $("game").classList.remove("letterbox");
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

// Control names for the choice buttons, loaded once.
let controls = {};
api("/api/controls").then((value) => (controls = value));

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
          textContent: `${controls.actions?.[offer.actionId] ?? offer.actionId}${target ? ` · ${target}` : ""}`,
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
  // When your character dies, carry on as someone connected to them.
  if (me.card && me.card.alive === false) {
    await openSheet("handoff");
    return;
  }
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
    show("filing-overlay", false);
    delete $("filing-title").dataset.contest;
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
  renderFilingOverlay(value);
  $("talk-choices").replaceChildren(
    ...value.visit.choices.slice(0, 6).map((choice) => {
      const b = el("button", { type: "button", textContent: choice.text });
      b.addEventListener("click", async () => {
        // Filing carries the platform and party chosen on the overlay.
        const params = new URLSearchParams({ key: choice.key });
        if (choice.action.kind === "file") {
          for (const select of $("filing-platform").querySelectorAll("select"))
            if (select.value)
              params.append("stance", `${select.name}=${select.value}`);
          params.set("party", $("filing-party").value);
        }
        renderFiling(await post(`/api/filing/choose?${params}`));
      });
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
/** The named office's rules from its records, with the platform and party to file under. */
function renderFilingOverlay(value) {
  const overlay = value?.overlay;
  show("filing-overlay", Boolean(overlay && !value.result));
  if (!overlay || $("filing-title").dataset.contest === overlay.contestId)
    return;
  $("filing-title").dataset.contest = overlay.contestId;
  $("filing-title").textContent = overlay.title;
  $("filing-checks").replaceChildren(
    row("Deadline", overlay.filingDeadline),
    ...overlay.checks.map((check) => {
      const line = row(
        check.rule,
        `${check.actual ?? ""}${check.required ? ` / ${check.required}` : ""}`,
      );
      line.title = check.source ?? "";
      if (!check.met) line.classList.add("unmet");
      return line;
    }),
  );
  $("filing-platform").replaceChildren(
    ...overlay.questions.map((question) =>
      el(
        "div",
        { className: "row" },
        el("b", { textContent: question.split(":").pop() }),
        el(
          "select",
          { name: question },
          el("option", { value: "", textContent: "—" }),
          el("option", { value: "1", textContent: "For" }),
          el("option", { value: "-1", textContent: "Against" }),
        ),
      ),
    ),
  );
  $("filing-party").replaceChildren(
    el("option", { value: "", textContent: "—" }),
    ...overlay.parties.map((name) =>
      el("option", {
        value: name,
        textContent: name,
        selected: name === overlay.party,
      }),
    ),
  );
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

// ---- Play someone else: the one you leave finishes their day ----
async function playAs(personId) {
  const value = await post(`/api/play?id=${encodeURIComponent(personId)}`);
  me.id = value.personId;
  closeSheet();
  renderTalk(undefined);
  renderPacket(value.packet);
  await refresh();
}

// ---- From your seat (steps 6 to 9): draft, negotiate, vote ----
let seatResult = "";
async function seatRows() {
  const v = await api(`/api/seat?id=${encodeURIComponent(me.id)}`);
  const rows = [];
  const act = async (params) => {
    const r = await post(`/api/seat/act?${new URLSearchParams(params)}`);
    seatResult =
      r.total !== undefined
        ? `${me.names?.[params.memberId] ?? params.memberId}: ${r.total.toFixed(2)} (views ${r.views.toFixed(2)} · constituents ${r.constituents.toFixed(2)} · deal ${r.deal.toFixed(2)})`
        : r.accepted !== undefined
          ? `${params.deal}: ${r.accepted ? "accepted" : "declined"} · ${r.before.total.toFixed(2)} → ${r.after.total.toFixed(2)}`
          : r.date
            ? `vote ${r.date}`
            : r.number
              ? `${r.number} · ${r.status}${r.authority?.some((a) => !a.allowed) ? ` · ${r.authority.map((a) => a.reason).join("; ")}` : ""}`
              : "";
    openSheet("politics");
  };
  for (const body of v.bodies) {
    for (const m of body.members) me.names = { ...me.names, [m.key]: m.name };
    const pick = el(
      "select",
      {},
      ...v.amounts.map((a) =>
        el("option", {
          value: `series:${a.series}`,
          textContent: `${a.series} · ${a.current ?? ""} ${a.unit ?? ""}`,
        }),
      ),
      ...v.questions.map((q) =>
        el("option", {
          value: `question:${q}`,
          textContent: q.split(":").pop(),
        }),
      ),
    );
    const value = el("input", {
      type: "number",
      value: "0",
      style: "width: 90px",
    });
    const draft = el("button", { type: "button", textContent: "Draft" });
    draft.addEventListener("click", () => {
      const [kind, key] = [
        pick.value.slice(0, pick.value.indexOf(":")),
        pick.value.slice(pick.value.indexOf(":") + 1),
      ];
      act({
        kind: "draft",
        officeId: body.officeId,
        ...(kind === "series" ? { series: key } : { question: key }),
        value: value.value,
      });
    });
    rows.push(
      el(
        "div",
        { className: "row campaign" },
        el("b", { textContent: body.title }),
        body.members.map((m) => m.name).join(" · "),
        el("div", {}, pick, value, draft),
      ),
    );
  }
  for (const { bill, votes } of v.bills) {
    const members = (
      v.bodies.find((b) => b.officeId === bill.bodyOfficeId)?.members ?? []
    ).filter((m) => !m.you);
    rows.push(
      el(
        "div",
        { className: "row campaign" },
        el("b", { textContent: `${bill.number} · ${bill.status}` }),
        bill.provisions
          .map(
            (p) =>
              `${p.series ?? p.question?.split(":").pop() ?? p.line} ${p.value}`,
          )
          .join("; "),
        bill.costEstimate
          ? ` · ${bill.costEstimate.workersRaised} · ${dollars(bill.costEstimate.annualPayMinor)}`
          : "",
        el(
          "div",
          {},
          ...members.flatMap((m) => {
            const ask = el("button", {
              type: "button",
              textContent: `Ask · ${m.name}`,
            });
            ask.addEventListener("click", () =>
              act({ kind: "stake", billId: bill.id, memberId: m.key }),
            );
            const deal = el("button", { type: "button", textContent: "Favor" });
            deal.addEventListener("click", () =>
              act({
                kind: "deal",
                billId: bill.id,
                memberId: m.key,
                deal: "favor",
              }),
            );
            return [ask, deal];
          }),
        ),
        bill.status === "drafted"
          ? (() => {
              const b = el("button", {
                type: "button",
                textContent: "Schedule vote",
              });
              b.addEventListener("click", () =>
                act({ kind: "schedule", billId: bill.id }),
              );
              return b;
            })()
          : "",
        votes.length
          ? el("div", {
              textContent: votes.map((x) => `${x.name} ${x.vote}`).join(" · "),
            })
          : "",
      ),
    );
  }
  if (seatResult)
    rows.push(
      el("div", { className: "row campaign", textContent: seatResult }),
    );
  return rows;
}

// ---- Menus ----
const sheets = {
  async people() {
    const family = el("button", { type: "button", textContent: "Family" });
    family.addEventListener("click", () => openSheet("family"));
    return [
      family,
      ...(me.scene?.people ?? [])
        .filter((p) => p.personId !== me.id)
        .map((p) => {
          const b = el("button", { type: "button", textContent: p.name });
          b.addEventListener("click", () => talkTo(p.personId));
          return b;
        }),
      ...me.card.ties.map((t) =>
        row(
          t.name,
          `${t.relation ?? t.kind} · ${t.lastContactDate}${t.latestChange ? ` · ${t.latestChange.cause} ${t.latestChange.before.toFixed(2)} → ${t.latestChange.after.toFixed(2)}` : ""}`,
        ),
      ),
    ];
  },
  async who() {
    const c = me.card;
    const progress = await api(`/api/progress?id=${encodeURIComponent(me.id)}`);
    const step = progress.steps.find(
      (row) => row.step === progress.furthestReachedStep,
    );
    return [
      row("Golden path", step ? `${step.step}. ${step.label}` : "—"),
      row("Born", c.birthDate),
      row(
        "Home",
        c.home?.members
          .map((m) => `${m.name}${m.relation ? ` (${m.relation})` : ""}`)
          .join(", "),
      ),
      ...(c.schools ?? []).map((school) =>
        row(school.date.slice(0, 4), school.name),
      ),
      row("Mood", c.affect?.mood?.toFixed(2)),
      row("Stress", c.affect?.stress?.toFixed(2)),
      ...c.drives.map((d) => row(d.kind, `${d.topic} · ${d.desiredChange}`)),
      ...c.lawEffects
        .filter((e) => !e.endedOn)
        .map((e) =>
          row(
            e.question.split(":").pop(),
            `${e.what} · ${e.enforcer} · ${e.since}`,
          ),
        ),
    ];
  },
  async money() {
    const b = await api(`/api/budget?id=${encodeURIComponent(me.id)}`);
    return [
      row("Cash", dollars(me.card.liquidMinor)),
      ...Object.entries(b.withholding?.byLine ?? {}).map(([line, minor]) =>
        row(line, `${dollars(minor)} · ${b.withholding.paychecks}`),
      ),
    ];
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
  async map() {
    const m = await api("/api/map");
    if (!m) return [];
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const [x0, y0, x1, y1] = m.bbox;
    svg.setAttribute("viewBox", `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
    svg.setAttribute("class", "gov-map");
    const shape = (d, cls, title) => {
      const el2 = document.createElementNS(ns, "path");
      el2.setAttribute("d", d);
      el2.setAttribute("class", cls);
      if (title) {
        const t = document.createElementNS(ns, "title");
        t.textContent = title;
        el2.append(t);
      }
      svg.append(el2);
    };
    if (m.state) shape(m.state.d, "state");
    for (const c of m.counties) shape(c.d, "county", c.name);
    const legend = [];
    for (const [layer, district] of Object.entries(m.yours)) {
      if (!district?.d) continue;
      shape(
        district.d,
        `yours ${layer}`,
        `${district.name}: ${district.holders.join(", ")}`,
      );
      legend.push(row(district.name, district.holders.join(" · ")));
    }
    return [el("div", { className: "row map" }, svg), ...legend];
  },
  async handoff() {
    const people = [
      ...(me.card.home?.members ?? []).map((m) => ({
        id: m.personId,
        name: m.name,
        why: m.relation ?? "home",
      })),
      ...me.card.ties.map((t) => ({
        id: t.personId,
        name: t.name,
        why: t.relation ?? t.kind,
      })),
    ].filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
    return [
      row(me.card.name, "†"),
      ...people.map((p) => {
        const line = row(p.name, `${p.why} `);
        const b = el("button", { type: "button", textContent: "Play" });
        b.addEventListener("click", () => playAs(p.id));
        line.append(b);
        return line;
      }),
    ];
  },
  async family() {
    const members = await api(`/api/family?id=${encodeURIComponent(me.id)}`);
    return members
      .filter((m) => m.name)
      .map((m) => {
        const card = el("div", { className: "family-card" });
        if (m.backdrop) {
          const pic = el(
            "div",
            { className: "family-pic" },
            el("img", { src: m.backdrop, alt: "" }),
          );
          if (m.figureUrl)
            pic.append(
              el("img", {
                className: "family-figure",
                src: m.figureUrl,
                alt: m.name,
              }),
            );
          card.append(pic);
        }
        card.append(
          el("b", { textContent: m.name }),
          el("div", {
            textContent: `${m.relation ? `${m.relation} · ` : ""}${m.age}${m.alive === false ? " · †" : ""}`,
          }),
          el("div", { textContent: m.place ? `${m.place} · ${m.doing}` : "" }),
        );
        return card;
      });
  },
  async budgets() {
    const v = await api(`/api/budget?id=${encodeURIComponent(me.id)}`);
    // An executive's priority moves a line by this much (engineering step).
    const STEP_MINOR = 10_000_000;
    return v.governments.map((gov) => {
      const box = el(
        "div",
        { className: "row race" },
        el("b", {
          textContent: `${gov.name} · ${gov.level}${gov.latest ? ` · ${gov.latest.fiscalYear}` : ""}`,
        }),
      );
      if (!gov.latest) return box;
      box.append(
        el("div", {
          textContent: `${gov.latest.adoptedBy} · ${gov.latest.adoptedOn}`,
        }),
      );
      for (const r of gov.latest.revenue.slice(0, 3))
        box.append(
          el("div", { textContent: `+ ${r.line} · ${dollars(r.minor)}` }),
        );
      for (const r of gov.latest.spending.slice(0, 6)) {
        const line = el("div", {
          textContent: `− ${r.line} · ${dollars(r.minor)} `,
        });
        if (gov.youAreExecutive)
          for (const [label, sign] of [
            ["+", 1],
            ["−", -1],
          ]) {
            const b = el("button", { type: "button", textContent: label });
            b.addEventListener("click", async () => {
              const now = gov.priorities?.changes?.[r.line] ?? 0;
              await post(
                `/api/budget/priority?${new URLSearchParams({ governmentId: gov.id, line: r.line, change: String(now + sign * STEP_MINOR) })}`,
              );
              openSheet("budgets");
            });
            line.append(b);
          }
        const change = gov.priorities?.changes?.[r.line];
        if (change) line.append(` ${change > 0 ? "+" : ""}${dollars(change)}`);
        box.append(line);
      }
      return box;
    });
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
    const rows = await api(`/api/news?id=${encodeURIComponent(me.id)}`);
    return [
      ...economy,
      ...rows.slice(0, 30).map((r) =>
        row(
          `${r.date} · ${r.kind}`,
          Object.entries(r.facts)
            .filter(([k]) => !/Id$/.test(k))
            .map(([k, v]) => `${k}: ${me.names?.[v] ?? v}`)
            .join(" · "),
        ),
      ),
    ];
  },
  async politics() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
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
    // Filing happens only at the office's counter, one race at a time.
    const offices = (
      v.filings.length
        ? []
        : [...new Set(v.contests.map((c) => c.filingOffice.filedWith))]
    ).map((filedWith) => {
      const b = el("button", { type: "button", textContent: filedWith });
      b.addEventListener("click", () => openFiling(filedWith));
      return b;
    });
    const seat = await seatRows();
    const results = (() => {
      const b = el("button", { type: "button", textContent: "Election night" });
      b.disabled = seenResults === 0;
      b.addEventListener("click", () => openSheet("results"));
      return b;
    })();
    const map = el("button", { type: "button", textContent: "Map" });
    map.addEventListener("click", () => openSheet("map"));
    const budgets = el("button", { type: "button", textContent: "Budgets" });
    budgets.addEventListener("click", () => openSheet("budgets"));
    return [
      results,
      budgets,
      map,
      ...campaigns,
      ...offices,
      ...filings,
      ...seat,
      ...v.seats
        .toSorted(
          (a, b) => Number(!!b.holder?.personId) - Number(!!a.holder?.personId),
        )
        .slice(0, 10)
        .map((s) => {
          const line = row(
            s.title,
            s.holder
              ? `${s.holder.givenName} ${s.holder.familyName}${s.holder.party ? ` (${s.holder.party})` : ""} `
              : "",
          );
          // Play anyone: a resident officeholder can be taken over.
          if (s.holder?.personId && s.holder.personId !== me.id) {
            const b = el("button", { type: "button", textContent: "Play" });
            b.addEventListener("click", () => playAs(s.holder.personId));
            line.append(b);
          }
          return line;
        }),
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
  budgets: "Budgets",
  family: "Family",
  handoff: "Carry on as",
  map: "Map",
  news: "News",
};
async function openSheet(tab) {
  openTab = tab;
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === tab);
  $("sheet-title").textContent = titles[tab];
  $("sheet").classList.toggle(
    "wide",
    tab === "calendar" ||
      tab === "results" ||
      tab === "budgets" ||
      tab === "family" ||
      tab === "map",
  );
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
// The title screen: the Capitol at night (M6: a national landmark at night).
$("backdrop").src = "/art/backdrops/us-capitol-exterior__night.jpg";
api("/api/seed").then((value) => {
  $("seed").value = value.seed;
  $("date").value = value.date;
});
let placeRows = [];
$("place").addEventListener("input", async () => {
  placeRows = await api(
    `/api/places?q=${encodeURIComponent($("place").value)}`,
  );
  $("places").replaceChildren(
    ...placeRows.map((row) => el("option", { value: row.name })),
  );
});
$("new-life").addEventListener("click", async () => {
  $("new-life").disabled = true;
  show("front-status", true);
  document.querySelector("#front .progress").hidden = false;
  try {
    const chosen = placeRows.find((row) => row.name === $("place").value);
    const life = await post(
      `/api/newlife?${new URLSearchParams({ seed: $("seed").value, date: $("date").value, ...(chosen ? { placeKey: chosen.key } : {}) })}`,
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
