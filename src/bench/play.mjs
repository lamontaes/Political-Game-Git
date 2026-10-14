/* global document, fetch, URLSearchParams, setTimeout, setInterval, clearInterval, Image, window, localStorage, __RELEASE_VERSION__ */
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
/** `v` and the release number: the bundler's define when built, else the server's. */
async function displayVersion() {
  const number =
    typeof __RELEASE_VERSION__ === "string"
      ? __RELEASE_VERSION__
      : (await api("/api/version")).version;
  return `v${number}`;
}
const post = (path) => api(path, "POST");
const dollars = (minor) =>
  (minor / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
/** The player card's date, and the time under it: the only place either appears. */
function setClock(at) {
  const day = new Date(`${at.date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date(
    2000,
    0,
    1,
    Math.floor(at.minuteOfDay / 60),
    at.minuteOfDay % 60,
  ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  $("card-clock").replaceChildren(day, el("br"), time);
}
/** A figure cropped to head and shoulders (Kit 12's bust). */
function setBust(id, url) {
  $(id).style.backgroundImage = url ? `url("${url}")` : "";
}
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}
function row(label, value) {
  return el("div", { className: "row" }, termLabel(label), String(value ?? ""));
}
function show(id, on) {
  $(id).hidden = !on;
}

/** Soft contact shadows on the floor at each person's feet, under everyone. */
function shadowsOf(people) {
  return people
    .filter((person) => person.figure.shadow)
    .map(({ figure: { shadow: s } }) => {
      const node = el("div", { className: "shadow" });
      Object.assign(node.style, {
        left: `${s.leftPercent}%`,
        top: `${s.topPercent}%`,
        width: `${s.widthPercent}%`,
        height: `${s.heightPercent}%`,
      });
      return node;
    });
}

/** The people in a picture; anyone but you can be clicked for their dossier. */
function drawPeople(people, onClick) {
  $("people").replaceChildren(
    ...shadowsOf(people),
    ...people.map((person) => {
      const f = person.figure;
      const bottom = f.clipBelowPercent ?? f.topPercent + f.heightPercent;
      const visible = Math.max(bottom - f.topPercent, 0.1);
      const img = el("img", { src: person.figureUrl, alt: person.name });
      img.style.height = `${(f.heightPercent / visible) * 100}%`;
      // A whole figure turns to face the room.
      if (f.mirrored) img.style.transform = "scaleX(-1)";
      const box = el("div", { className: "figure" }, img);
      Object.assign(box.style, {
        left: `${f.leftPercent}%`,
        top: `${f.topPercent}%`,
        width: `${f.widthPercent}%`,
        height: `${visible}%`,
      });
      if (onClick && person.personId !== me?.id) {
        box.classList.add("talkable");
        box.addEventListener("click", () => onClick(person));
      }
      return box;
    }),
  );
}

// The opening: each level of government over the player's town, then home.
const SHOT_MS = 4500;
let skipOpening;
// The opening's shots, fetched and their pictures loaded during loading.
let openingShotsReady;
async function playOpening() {
  const shots =
    openingShotsReady ??
    (await api(`/api/opening?id=${encodeURIComponent(me.id)}`));
  openingShotsReady = undefined;
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
// Escape opens only options and quit (M6 work order), the opening included.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (openTab === "options") closeSheet();
  else if ($("front").hidden) openSheet("options");
});

async function renderScene() {
  const scene = await api(`/api/scene?id=${encodeURIComponent(me.id)}`);
  $("backdrop").src = scene.backdrop.url;
  drawPeople(scene.people, showPerson);
  me.scene = scene;
  setBust(
    "card-bust",
    scene.people.find((p) => p.personId === me.id)?.figureUrl,
  );
}

async function renderCard() {
  const card = await api(`/api/card?id=${encodeURIComponent(me.id)}`);
  me.card = card;
  me.names = { ...me.names, [me.id]: card.name };
  $("card-name").textContent = card.name;
  $("card-place").textContent = me.placeName;
  setClock(packet?.at ?? { date: me.date, minuteOfDay: 0 });
}

// The Guide's search, kept so an underlined term opens straight to it.
let guideQuery = "";
// Each civic term and its one-line definition.
let guideTerms = new Map();
api("/api/guide?q=").then((rows) => {
  guideTerms = new Map(rows.map((row) => [row.term.toLowerCase(), row]));
});
// Terms the player marked as learned lose their underline (kept in the Guide).
const LEARNED_KEY = "ocd-learned-terms";
const learned = new Set(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(LEARNED_KEY) ?? "[]");
    } catch {
      return [];
    }
  })(),
);
let tipTerm;
function showTip(node, key) {
  const term = guideTerms.get(key);
  tipTerm = { node, key };
  $("tip-term").textContent = term.term;
  $("tip-short").textContent = term.short;
  show("tip", true);
  const box = node.getBoundingClientRect();
  const tip = $("tip");
  tip.style.left = `${Math.min(box.left, window.innerWidth - tip.offsetWidth - 16)}px`;
  tip.style.top =
    box.bottom + tip.offsetHeight + 12 < window.innerHeight
      ? `${box.bottom + 6}px`
      : `${box.top - tip.offsetHeight - 6}px`;
}
function hideTipSoon() {
  setTimeout(() => {
    if (!$("tip").matches(":hover") && !tipTerm?.node.matches(":hover"))
      show("tip", false);
  }, 250);
}
$("tip").addEventListener("mouseleave", hideTipSoon);
$("tip-learned").addEventListener("click", () => {
  if (!tipTerm) return;
  learned.add(tipTerm.key);
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify([...learned]));
  } catch {
    // Without storage the underline returns next session.
  }
  for (const node of document.querySelectorAll(".term"))
    if (node.textContent.trim().toLowerCase() === tipTerm.key)
      node.classList.remove("term");
  show("tip", false);
});
/**
 * A label shown on screen, underlined when the whole label is a Guide term
 * (never a search through prose): hover shows its definition, and clicking
 * it opens the Guide there.
 */
function termLabel(text) {
  const key = String(text).trim().toLowerCase();
  if (!guideTerms.has(key)) return el("b", { textContent: text });
  const b = el("b", {
    className: learned.has(key) ? "" : "term",
    textContent: text,
  });
  b.addEventListener("mouseenter", () => {
    if (b.classList.contains("term")) showTip(b, key);
  });
  b.addEventListener("mouseleave", hideTipSoon);
  b.addEventListener("click", () => {
    show("tip", false);
    guideQuery = text;
    openSheet("guide");
  });
  return b;
}

// Control names for the choice buttons, loaded once.
let controls = {};
// Money amounts are kept in cents; "minor/hour" reads as dollars an hour.
const amount = (value, unit) =>
  unit?.startsWith("minor")
    ? `${dollars(Number(value))}${unit.includes("/") ? `/${unit.split("/")[1]}` : ""}`
    : `${value ?? ""}${unit ? ` ${unit}` : ""}`;
/** A policy question by its name on the bill catalog, else its key's last part. */
const policyLabel = (question) =>
  controls.policyNames?.[question] ?? question.split(":").pop();
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
          className: "reply",
          // The mined name ("Call Sarah Sykes."), else the control name and target.
          textContent:
            me.names?.[offer.offerId] ??
            `${controls.actions?.[offer.actionId] ?? offer.actionId}${target ? ` · ${target}` : ""}`,
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
  if (packet) setClock(packet.at);
  $("card-why").textContent = endedBy(packet);
}

/** What stopped the clock, from the stop's own records. */
function endedBy(value) {
  const words = controls.endedBy ?? {};
  if (value?.kind === "choice") return words.choice ?? "";
  if (value?.kind !== "stop") return "";
  const work = value.stop.work?.reasons?.[0];
  if (work)
    return `${words[work.boundary] ?? ""} · ${me.names?.[work.owner.organizationId] ?? ""}`;
  return value.stop.modules.length ? (words.moment ?? "") : "";
}

/** The newest line of the journal, bottom right. */
async function renderJournalNote() {
  const chapters = await api(
    `/api/journal?id=${encodeURIComponent(me.id)}`,
  ).catch(() => []);
  const line = chapters.at(-1)?.lines.at(-1)?.text ?? "";
  $("journal-line").textContent = line;
}
async function refresh() {
  await Promise.all([renderScene(), renderCard(), renderJournalNote()]);
  // When your character dies, carry on as someone connected to them.
  if (me.card && me.card.alive === false) {
    await openSheet("handoff");
    return;
  }
  // Election night: new results open their sheet.
  const races = await api(`/api/results?id=${encodeURIComponent(me.id)}`);
  if (races.length > seenResults) {
    seenResults = races.length;
    // Seen where you watched the returns: the party if you ran, else the polls.
    const night = await api(
      `/api/results/scene?id=${encodeURIComponent(me.id)}`,
    );
    if (night) {
      $("backdrop").src = night.backdrop.url;
      drawPeople(night.people);
    }
    await openSheet("results");
    return;
  }
  // A law that took effect: what changed in town.
  if (newChanges(await changeCount())) {
    await openSheet("changes");
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
// Laws enacted and laws taken effect so far: a new one of either opens What changed.
let seenChanges = { ahead: 0, took: 0 };
async function changeCount() {
  const { ahead, took } = await api(
    `/api/changes?id=${encodeURIComponent(me.id)}`,
  );
  return { ahead: ahead.length, took: took.length };
}
const newChanges = (now) =>
  now.took > seenChanges.took || now.ahead > seenChanges.ahead;
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
      setClock(result.packet.at);
      if (result.packet.kind !== "complete") break;
      // Election day needs you: a skip ends when new results are in.
      const races = await api(`/api/results?id=${encodeURIComponent(me.id)}`);
      if (races.length > seenResults) {
        $("card-why").textContent = controls.endedBy?.results ?? "";
        break;
      }
      // A law taking effect is shown too: the town changes.
      if (newChanges(await changeCount())) {
        $("card-why").textContent = controls.endedBy?.law ?? "";
        await openSheet("changes");
        break;
      }
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

// ---- Conversation (lower third: portraits top left, scales upper right) ----
// The scales toggled on: the lie takes the place of the true answer it contradicts.
let lying = false;
/** Who you are talking to: their bust, name and what you know of their work. */
async function setWho(personId, name) {
  $("talk-name").textContent = name ?? "";
  $("talk-role").textContent = "";
  const staged = [...(me.scene?.people ?? []), ...(filing?.people ?? [])].find(
    (p) => p.personId === personId,
  );
  setBust("talk-bust", staged?.figureUrl);
  show("talk-who", Boolean(name));
  if (!personId) return;
  const c = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: personId })}`,
  ).catch(() => undefined);
  if (!c || $("talk-name").textContent !== (name ?? "")) return;
  if (!staged?.figureUrl) setBust("talk-bust", c.figureUrl);
  $("talk-role").textContent = [c.work?.title, c.work?.employer, c.relation]
    .filter(Boolean)
    .join(" · ");
}
/** The newest lines: yours, dim, then what was said back to you. */
function spokenLines(lines, speakerOf) {
  const lastMine = lines.findLastIndex((line) => line.speakerId === me.id);
  const theirs = lines.slice(lastMine + 1).slice(-3);
  return [
    ...(lastMine >= 0
      ? [
          el("li", {
            className: `said${lines[lastMine].act === "lie" ? " lying" : ""}`,
            textContent: lines[lastMine].text,
          }),
        ]
      : []),
    ...theirs.map((line) =>
      el("li", { className: "speech", textContent: speakerOf(line) }),
    ),
  ];
}
/** Numbered replies; a key press of the number says it. */
function replies(choices, onPick) {
  return choices.map((choice) => {
    const b = el("button", {
      type: "button",
      className: `reply${choice.lie ? " lying" : ""}`,
      textContent: choice.text,
    });
    b.addEventListener("click", () => onPick(choice));
    return b;
  });
}
document.addEventListener("keydown", (event) => {
  const n = Number(event.key);
  if (
    !Number.isInteger(n) ||
    n < 1 ||
    $("game").classList.contains("sheet-open")
  )
    return;
  const panel = !$("talk").hidden ? "talk-choices" : "choice-list";
  if (!$(panel).offsetParent) return;
  $(panel).children[n - 1]?.click();
});
function setScales({ available, on }) {
  $("talk-lie").disabled = !available;
  $("talk-lie").classList.toggle("on", Boolean(available && on));
}
function renderTalk(value) {
  if (value?.otherId !== talk?.otherId) lying = false;
  talk = value;
  show("talk", Boolean(value));
  show("choices", !value && packet?.kind === "choice");
  if (!value) return;
  const other = value.lines.find((line) => line.speakerId === value.otherId);
  if (
    other?.speaker !== $("talk-name").textContent ||
    !$("talk-name").textContent
  )
    setWho(value.otherId, other?.speaker ?? me.names?.[value.otherId]);
  $("talk-lines").replaceChildren(
    ...spokenLines(value.lines, (line) => line.text),
  );
  // Lying, the false line stands where the true answer it contradicts was.
  const choices = value.choices.slice(0, 6);
  if (lying && value.lie) {
    const at = Math.max(
      choices.findIndex((choice) => choice.answers === value.lie.answers),
      0,
    );
    choices.splice(at, 1, value.lie);
  }
  $("talk-choices").replaceChildren(
    ...replies(choices, (choice) => sayLine(choice.key)),
  );
  // Dim when there is nothing false to say; tipped and red while lying.
  setScales({ available: Boolean(value.lie), on: lying });
}
async function sayLine(key) {
  lying = false;
  renderTalk(await post(`/api/talk/say?key=${encodeURIComponent(key)}`));
}
async function talkTo(otherId) {
  lying = false;
  $("talk-name").textContent = "";
  renderTalk(
    await post(`/api/talk/open?otherId=${encodeURIComponent(otherId)}`),
  );
}
$("talk-lie").addEventListener("click", () => {
  if (!talk?.lie) return;
  lying = !lying;
  renderTalk(talk);
});
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
  if ($("talk-name").textContent !== clerkName)
    setWho(value.visit.clerkId, clerkName);
  const lines = value.visit.lines.map((line) => ({
    ...line,
    speakerId: line.speaker === "clerk" ? "clerk" : me.id,
  }));
  $("talk-lines").replaceChildren(...spokenLines(lines, (line) => line.text));
  renderFilingOverlay(value);
  $("talk-choices").replaceChildren(
    ...replies(value.visit.choices.slice(0, 6), async (choice) => {
      // Filing carries the platform and party chosen on the overlay.
      const params = new URLSearchParams({ key: choice.key });
      if (choice.action.kind === "file") {
        for (const select of $("filing-platform").querySelectorAll("select"))
          if (select.value)
            params.append("stance", `${select.name}=${select.value}`);
        params.set("party", $("filing-party").value);
      }
      renderFiling(await post(`/api/filing/choose?${params}`));
    }),
  );
  // The filing's record once it is made: its status.
  if (value.result)
    $("talk-lines").append(
      el("li", {
        className: "speech",
        textContent: value.result.filing
          ? value.result.status
          : `${value.result.status} · ${(value.result.unmet ?? []).map((u) => u.rule).join(", ")}`,
      }),
    );
  setScales({ available: false });
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
      if (!check.met) line.classList.add("unmet");
      return line;
    }),
  );
  $("filing-platform").replaceChildren(
    ...overlay.questions.map((question) =>
      el(
        "div",
        { className: "row" },
        el("b", { textContent: policyLabel(question) }),
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
      // A speech is seen where it was given, with the people it reached.
      if (result.scene) {
        closeSheet();
        $("backdrop").src = result.scene.backdrop.url;
        drawPeople(result.scene.people);
        $("card-why").textContent = campaignResult;
        return;
      }
      openSheet("politics");
    };
    const question = el(
      "select",
      {},
      ...v.questions.map((q) =>
        el("option", { value: q, textContent: policyLabel(q) }),
      ),
    );
    const side = el(
      "select",
      {},
      el("option", { value: "1", textContent: "For" }),
      el("option", { value: "-1", textContent: "Against" }),
    );
    const venue = el(
      "select",
      {},
      ...(v.venues ?? []).map((place) =>
        el("option", {
          value: place,
          textContent: controls.venues?.[place] ?? place,
        }),
      ),
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
          venue,
          button("Speech", "speech", () => ({
            venue: venue.value,
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
  show("talk-who", false);
  $("talk-name").textContent = "";
  $("talk-lines").replaceChildren(
    ...story.narration.map((line) =>
      el("li", { className: "speech narration", textContent: line.text }),
    ),
  );
  $("talk-choices").replaceChildren(
    ...(story.talkToId
      ? replies([{ text: `Talk · ${story.names[story.talkToId] ?? ""}` }], () =>
          talkTo(story.talkToId),
        )
      : []),
  );
  setScales({ available: false });
}
function storyStop(value) {
  return value?.kind === "stop"
    ? value.stop.modules.find(
        (row) =>
          row.kind === "interrupt" && row.moduleId === "p13-story-director",
      )
    : undefined;
}

// ---- The person card: only what you could know about them ----
async function showPerson(person) {
  const c = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: person.personId })}`,
  );
  $("person-figure").src = c.figureUrl ?? person.figureUrl;
  $("person-name").textContent = c.name;
  $("person-role").textContent = [
    c.work?.title,
    c.work?.employer,
    c.relation,
    c.age ?? null,
  ]
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(" · ");
  $("person-facts").replaceChildren(
    ...[c.tie && row(c.tie.kind, c.tie.lastContactDate ?? "")].filter(Boolean),
  );
  $("person-talk").onclick = () => {
    show("person", false);
    talkTo(person.personId);
  };
  show("person", true);
}
$("person-close").addEventListener("click", () => show("person", false));

// ---- Go to a place in town: its picture now, and whoever works there ----
async function visit(organizationId) {
  closeSheet();
  renderTalk(undefined);
  const v = await post(
    `/api/goto/visit?org=${encodeURIComponent(organizationId)}`,
  );
  me.names = { ...me.names, ...v.names };
  $("backdrop").src = v.backdrop.url;
  drawPeople(v.people, showPerson);
  $("card-place").textContent = v.name;
}

// ---- The body in its meeting room ----
function chamberButton(officeId) {
  const b = el("button", { type: "button", textContent: "Chamber" });
  b.addEventListener("click", async () => {
    closeSheet();
    renderTalk(undefined);
    const v = await api(
      `/api/seat/scene?${new URLSearchParams({ id: me.id, officeId })}`,
    );
    $("backdrop").src = v.backdrop.url;
    drawPeople(v.people);
    $("card-place").textContent = v.title;
  });
  return b;
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
      ...v.amounts.map((a) => {
        const option = el("option", {
          value: `series:${a.series}`,
          textContent: `${policyLabel(a.series)} · ${amount(a.current, a.unit)}`,
        });
        // Money is typed in dollars and kept in cents.
        if (a.unit?.startsWith("minor")) option.dataset.cents = "1";
        return option;
      }),
      // Every law area, one group each: its policies and budget lines.
      ...(v.menus ?? []).map((menu) =>
        el(
          "optgroup",
          { label: menu.name },
          ...menu.items.map((item) => {
            const option = el("option", {
              value: item.question
                ? `question:${item.question}`
                : `line:${item.line}`,
              textContent: item.question
                ? policyLabel(item.question)
                : item.name,
            });
            if (item.line) option.dataset.cents = "1";
            return option;
          }),
        ),
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
      const cents = pick.selectedOptions[0]?.dataset.cents === "1";
      act({
        kind: "draft",
        officeId: body.officeId,
        ...(kind === "series"
          ? { series: key }
          : kind === "line"
            ? { line: key }
            : { question: key }),
        value: cents
          ? String(Math.round(Number(value.value) * 100))
          : value.value,
      });
    });
    rows.push(
      el(
        "div",
        { className: "row campaign" },
        el("b", { textContent: body.title }),
        body.members.map((m) => m.name).join(" · "),
        el("div", {}, pick, value, draft, chamberButton(body.officeId)),
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
              `${p.series ?? (p.question && policyLabel(p.question)) ?? p.line} ${p.value}`,
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

/** A record kind as words: "filing-deadline" reads "Filing deadline". */
const kindName = (kind) =>
  `${kind.charAt(0).toUpperCase()}${kind.slice(1).replace(/-/g, " ")}`;

// ---- Menus ----
const sheets = {
  async people() {
    return [
      ...(me.scene?.people ?? [])
        .filter((p) => p.personId !== me.id)
        .map((p) => {
          const b = el("button", { type: "button", textContent: "Talk" });
          b.addEventListener("click", () => talkTo(p.personId));
          return el("div", { className: "row" }, termLabel(p.name), b);
        }),
      ...me.card.ties.map((t) => {
        const line = row(
          t.name,
          `${t.relation ?? t.kind} · ${t.lastContactDate}`,
        );
        // How the tie last moved, in the engine's numbers: a developer view.
        if (t.latestChange)
          line.append(
            el("span", {
              className: "dev-only",
              textContent: ` · ${t.latestChange.cause} ${t.latestChange.before.toFixed(2)} → ${t.latestChange.after.toFixed(2)}`,
            }),
          );
        return line;
      }),
    ];
  },
  async who() {
    const c = me.card;
    const progress = await api(`/api/progress?id=${encodeURIComponent(me.id)}`);
    const step = progress.steps.find(
      (row) => row.step === progress.furthestReachedStep,
    );
    // The engine's raw measures, for the bench only.
    const dev = (line) => {
      line.classList.add("dev-only");
      return line;
    };
    return [
      dev(row("Golden path", step ? `${step.step}. ${step.label}` : "—")),
      row("Born", c.birthDate),
      row(
        "Home",
        c.home?.members
          .map((m) => `${m.name}${m.relation ? ` (${m.relation})` : ""}`)
          .join(", "),
      ),
      dev(row("Mood", c.affect?.mood?.toFixed(2))),
      dev(row("Stress", c.affect?.stress?.toFixed(2))),
      ...c.drives.map((d) => row(d.kind, `${d.topic} · ${d.desiredChange}`)),
      ...c.lawEffects
        .filter((e) => !e.endedOn)
        .map((e) =>
          row(
            policyLabel(e.question),
            `${e.what} · ${e.enforcer} · ${e.since}`,
          ),
        ),
    ];
  },
  async money() {
    const b = await api(`/api/budget?id=${encodeURIComponent(me.id)}`);
    return [
      row("Cash", dollars(me.card.liquidMinor)),
      ...(me.card.dwelling
        ? [
            row(
              me.card.dwelling.tenure === "own" ? "Own" : "Rent",
              [
                me.card.dwelling.kind,
                me.card.dwelling.valueMinor !== undefined
                  ? dollars(me.card.dwelling.valueMinor)
                  : null,
                me.card.dwelling.rentMinor !== undefined
                  ? `${dollars(me.card.dwelling.rentMinor)} / month`
                  : null,
              ]
                .filter(Boolean)
                .join(" · "),
            ),
          ]
        : []),
      ...Object.entries(b.withholding?.byLine ?? {}).map(([line, minor]) =>
        row(line, `${dollars(minor)} · ${b.withholding.paychecks}`),
      ),
    ];
  },
  async jobs() {
    const j = me.card.job;
    return [
      ...(j
        ? [
            row(j.title, j.employer),
            row("Pay", `${dollars(j.wageDailyMinor)} / day`),
            row("Hours", `${j.hoursDaily.toFixed(1)} / day`),
          ]
        : []),
      // Study: the schools on your record, newest first.
      ...[...(me.card.schools ?? [])]
        .reverse()
        .map((school) => row(school.date.slice(0, 4), school.name)),
    ];
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
        el(
          "div",
          {},
          el("b", { textContent: "Turnout " }),
          `${number(race.namedTurnout)} / ${number(race.namedEligible)}`,
        ),
        el(
          "div",
          {},
          el("b", { textContent: "Exit poll " }),
          Object.entries(race.exitPoll)
            .map(([k, n]) => `${k} ${n}`)
            .join(" · "),
        ),
        race.ballot
          ? el(
              "div",
              { className: "mine" },
              el("b", { textContent: "You " }),
              race.ballot.voted ? (race.ballot.choice ?? "") : "—",
            )
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
        // A later day: live until it, stopping early for anything that needs you.
        if (iso > (packet?.at.date ?? date)) {
          cell.classList.add("jump");
          cell.title = iso;
          cell.addEventListener("click", () => {
            closeSheet();
            act(`/api/advance?mode=calendar&date=${iso}`);
          });
        }
        const kinds = new Map();
        for (const item of byDate.get(iso) ?? [])
          kinds.set(item.kind, [...(kinds.get(item.kind) ?? []), item.title]);
        for (const [kind, names] of kinds)
          cell.append(
            el("span", {
              className: "entry",
              textContent:
                names.length > 2
                  ? `${kindName(kind)} (${names.length})`
                  : `${kindName(kind)}: ${names.join(", ")}`,
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
      ...later
        .slice(0, 8)
        .map((i) =>
          el(
            "div",
            { className: "row" },
            el("b", { textContent: i.date }),
            el("span", {}, termLabel(kindName(i.kind)), ` · ${i.title}`),
          ),
        ),
    ];
  },
  async news() {
    const isRecordId = (v) =>
      typeof v === "string" &&
      !me.names?.[v] &&
      /^[a-z]+_[0-9a-f]{8,}$/.test(v);
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
            // Bare record ids are the bench's, not the reader's.
            .filter(([k, v]) => !/Id$/.test(k) && !isRecordId(v))
            .map(([k, v]) => `${k}: ${me.names?.[v] ?? v}`)
            .join(" · "),
        ),
      ),
    ];
  },
  async law() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    return v.law.map((law) =>
      el(
        "div",
        { className: "row narrative" },
        termLabel(policyLabel(law.series)),
        ` ${law.value === null ? "—" : amount(law.value, law.unit)}`,
        el(
          "div",
          {},
          ...law.levels
            .filter((level) => level.row)
            .map((level) =>
              el("div", {
                textContent: `${level.level} · ${level.jurisdiction} · ${amount(level.row.value, level.row.unit)} · ${level.row.effectiveDate}${level.setAside ? ` · ${level.setAside}` : ""}`,
              }),
            ),
          ...law.pending.map((row) =>
            el("div", {
              textContent: `${row.effectiveDate} → ${amount(row.value, row.unit)}`,
            }),
          ),
        ),
      ),
    );
  },
  async changes() {
    const { ahead, took } = await api(
      `/api/changes?id=${encodeURIComponent(me.id)}`,
    );
    seenChanges = { ahead: ahead.length, took: took.length };
    // Enacted, waiting for its date: the measure, what it sets, and when.
    const coming = ahead.map((law) =>
      el(
        "div",
        { className: "row narrative" },
        el("b", {
          textContent: `${law.date} · ${policyLabel(law.series)} · ${amount(law.value, law.unit)}`,
        }),
        `${law.measure} · ${law.jurisdiction}`,
      ),
    );
    return [
      ...coming,
      ...took.map((law) =>
        el(
          "div",
          { className: "row narrative" },
          el("b", {
            textContent: `${law.date} · ${policyLabel(law.series)} · ${law.was !== null ? `${amount(law.was, law.unit)} → ` : ""}${amount(law.value, law.unit)}`,
          }),
          [
            `${law.jurisdiction} · ${law.reached}`,
            ...(law.you ? [`${me.card?.name ?? ""}: ${law.you}`] : []),
            ...law.names.map((n) => `${n.name}: ${n.what}`),
          ].join(" · "),
        ),
      ),
    ];
  },
  async guide() {
    const search = el("input", {
      type: "search",
      value: guideQuery,
      placeholder: "Search",
    });
    const list = el("div", { className: "flow" });
    const fill = async () => {
      guideQuery = search.value;
      const rows = await api(
        `/api/guide?q=${encodeURIComponent(search.value)}`,
      );
      list.replaceChildren(
        ...rows.map((t) => {
          const line = el(
            "details",
            { className: "row narrative", open: rows.length === 1 },
            el("summary", {}, el("b", { textContent: t.term }), ` ${t.short}`),
            el("p", { textContent: t.explanation }),
          );
          if (t.contextNote)
            line.append(el("p", { textContent: t.contextNote }));
          return line;
        }),
      );
    };
    search.addEventListener("input", fill);
    await fill();
    return [search, list];
  },
  async options() {
    const rows = [];
    if (skipOpening) {
      const skip = el("button", {
        type: "button",
        textContent: "Skip opening",
      });
      skip.addEventListener("click", () => {
        closeSheet();
        skipOpening?.();
      });
      rows.push(skip);
    }
    rows.push(
      el("p", { className: "version", textContent: await displayVersion() }),
    );
    const quit = el("button", { type: "button", textContent: "Quit to title" });
    quit.dataset.testid = "quit-to-title";
    quit.addEventListener("click", () => window.location.reload());
    rows.push(quit);
    return rows;
  },
  async travel() {
    const places = await api(`/api/goto?id=${encodeURIComponent(me.id)}`);
    return places.map((p) => {
      const go = el("button", { type: "button", textContent: "Go" });
      go.addEventListener("click", () => visit(p.organizationId));
      return el(
        "div",
        { className: "row" },
        el("b", { textContent: p.name }),
        [
          String(p.staff),
          ...p.known.map((k) => k.name),
          ...p.actions.map((a) => controls.actions?.[a] ?? a),
        ].join(" · ") + " ",
        go,
      );
    });
  },
  async politics() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    const filings = v.filings.map((f) =>
      el(
        "div",
        { className: "row" },
        el("b", { textContent: f.status }),
        f.filedWith,
      ),
    );
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
    return [
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
          // Play anyone: a resident officeholder can be taken over (bench only).
          if (s.holder?.personId && s.holder.personId !== me.id) {
            const b = el("button", {
              type: "button",
              className: "dev-only",
              textContent: "Play",
            });
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
  travel: "Travel",
  options: "Options",
  guide: "Guide",
  changes: "What changed",
  law: "Law here",
  handoff: "Carry on as",
  map: "Map",
  news: "News",
};
// Screens shown as tabs across the top of one menu screen.
const groups = {
  politics: ["politics", "results", "law", "changes", "budgets", "map"],
  people: ["people", "family"],
};
const groupOf = (tab) =>
  Object.entries(groups).find(([, tabs]) => tabs.includes(tab))?.[0] ?? tab;
async function openSheet(tab) {
  openTab = tab;
  show("tip", false);
  const group = groupOf(tab);
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === group);
  $("sheet-title").textContent = titles[group];
  // Election night only once there are results to show.
  $("sheet-tabs").replaceChildren(
    ...(groups[group] ?? [])
      .filter((name) => name !== "results" || seenResults > 0)
      .map((name) => {
        const b = el("button", {
          type: "button",
          className: `tab${name === tab ? " on" : ""}`,
          textContent: titles[name],
        });
        b.addEventListener("click", () => openSheet(name));
        return b;
      }),
  );
  const body = await sheets[tab]();
  // A slower, earlier request must not reopen a sheet closed meanwhile.
  if (openTab !== tab) return;
  $("sheet-body").replaceChildren(...body);
  $("sheet-body").classList.toggle(
    "cols",
    tab === "calendar" || body.length > 12,
  );
  $("sheet-body").scrollTop = 0;
  show("sheet", true);
  show("menu", Boolean(me));
  $("game").classList.add("sheet-open");
}
for (const b of document.querySelectorAll("[data-tab]"))
  b.addEventListener("click", () =>
    groupOf(openTab) === b.dataset.tab && b.classList.contains("ring")
      ? closeSheet()
      : openSheet(b.dataset.tab),
  );
function closeSheet() {
  openTab = undefined;
  show("tip", false);
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.remove("active");
  show("sheet", false);
  show("menu", false);
  $("game").classList.remove("sheet-open");
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
/** What the player changed from real data; nothing means a real world. */
function worldSettings() {
  const read = (id) => {
    const text = $(id).value.trim();
    return text === "" ? undefined : Number(text);
  };
  const economy = Object.fromEntries(
    [
      ["wages", read("set-wages")],
      ["householdCash", read("set-cash")],
      ["outsideDemand", read("set-demand")],
    ].filter(([, v]) => v !== undefined),
  );
  const politics = Object.fromEntries(
    [
      ["leanShift", read("set-lean")],
      ["turnout", read("set-turnout")],
    ].filter(([, v]) => v !== undefined),
  );
  const settings = {
    ...(read("set-population") !== undefined
      ? { population: read("set-population") }
      : {}),
    ...(Object.keys(economy).length ? { economy } : {}),
    ...(Object.keys(politics).length ? { politics } : {}),
  };
  return Object.keys(settings).length ? settings : undefined;
}
displayVersion().then((text) => {
  $("version").textContent = text;
});
$("front-options").addEventListener("click", () => openSheet("options"));
// The bench's developer controls sit behind one faint ring, off by default.
$("dev-toggle").addEventListener("click", () =>
  document.body.classList.toggle("dev"),
);
$("new-life").addEventListener("click", async () => {
  $("new-life").disabled = true;
  show("front-status", true);
  document.querySelector("#front .progress").hidden = false;
  try {
    const chosen = placeRows.find((row) => row.name === $("place").value);
    const settings = worldSettings();
    // Real progress through every step, from the server's build.
    const bar = document.querySelector("#front .progress span");
    bar.classList.add("steady");
    const STEPS = [
      "people",
      "past",
      "economy",
      "core",
      "government",
      "opening",
    ];
    const poll = setInterval(async () => {
      const p = await api("/api/newlife/progress").catch(() => undefined);
      if (!p) return;
      const at =
        p.stage === "done" ? STEPS.length : Math.max(STEPS.indexOf(p.stage), 0);
      const within = p.total ? p.done / p.total : 0;
      bar.style.width = `${Math.round(((at + within) / (STEPS.length + 1)) * 100)}%`;
      $("front-status").textContent =
        `${controls.loading?.[p.stage] ?? ""}${p.total ? ` ${p.done} / ${p.total}` : ""}`;
    }, 400);
    let life;
    try {
      life = await post(
        `/api/newlife?${new URLSearchParams({ seed: $("seed").value, date: $("date").value, ...(chosen ? { placeKey: chosen.key } : {}), ...(settings ? { settings: JSON.stringify(settings) } : {}) })}`,
      );
    } finally {
      clearInterval(poll);
    }
    // Every picture the opening shows is loaded before it plays.
    const shots = await api(
      `/api/opening?id=${encodeURIComponent(life.personId)}`,
    );
    const urls = [
      ...new Set(
        shots.flatMap((shot) => [
          shot.backdrop.url,
          ...shot.people.map((person) => person.figureUrl),
        ]),
      ),
    ];
    let loaded = 0;
    await Promise.all(
      urls.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => {
              loaded++;
              bar.style.width = `${Math.round(((STEPS.length + loaded / urls.length) / (STEPS.length + 1)) * 100)}%`;
              $("front-status").textContent =
                `${controls.loading?.pictures ?? ""} ${loaded} / ${urls.length}`;
              resolve();
            };
            img.src = src;
          }),
      ),
    );
    openingShotsReady = shots;
    me = {
      id: life.personId,
      placeName: life.placeName,
      date: life.date,
      names: life.names,
    };
    // What was already law at the start isn't news; only what changes after.
    seenChanges = await changeCount();
    show("front", false);
    await playOpening();
    for (const id of ["rings", "card", "journal-note"]) show(id, true);
    $("game").classList.add("in-play");
    renderPacket(life.packet);
    await refresh();
  } catch (error) {
    $("front-status").textContent = error.message;
    $("new-life").disabled = false;
  } finally {
    document.querySelector("#front .progress").hidden = true;
  }
});
